import type { CartItem } from '@/types/common';
import type { CheckoutConfirmacionPedido } from '@/app/types/checkoutConfirmacion';
import type { DatosFacturacionInvitado } from '@/app/presentation/components/carrito/DatosFacturacionInvitadoModal';
import type { ResultadoPago } from '@/app/presentation/pages/membresia/MembershipPayment';
import carritoService, {
  type BackendCart,
  type BackendCartItem,
} from '@/app/services/carritoService';

const IMAGES_KEY = 'cart_images';

function getImageCache(): Record<string, string> {
  try {
    const raw = localStorage.getItem(IMAGES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function mapBackendCartItemToCartItem(item: BackendCartItem): CartItem {
  const images = getImageCache();
  return {
    id: item.productoId,
    name: item.nombre,
    description: '',
    price: item.precioUnitario,
    image: images[item.productoId] ?? '',
    category: '',
    stock: item.stockDisponible,
    available: item.stockSuficiente,
    createdAt: '',
    updatedAt: '',
    quantity: item.cantidad,
    addedAt: new Date().toISOString(),
    backendItemId: item._id,
  };
}

export function mapBackendCartToCartItems(cart: BackendCart): CartItem[] {
  return (cart.items || []).map(mapBackendCartItemToCartItem);
}

export function datosFacturacionFromCarrito(
  cart: BackendCart & { datosFacturacion?: DatosFacturacionInvitado | null },
): DatosFacturacionInvitado | null {
  const d = cart.datosFacturacion;
  return d && typeof d === 'object' ? d : null;
}

export function buildConfirmacionSnapshot(
  resultado: ResultadoPago,
  items: CartItem[],
  total: number,
  subtotal: number,
  datosFacturacion: DatosFacturacionInvitado | null,
  email: string,
  carritoId: string | null,
): CheckoutConfirmacionPedido {
  const ventaRef = resultado.ventaReferencia || '';
  const facturaId = resultado.facturaId || '';
  return {
    estado: resultado.estado,
    facturaId,
    carritoId: carritoId || '',
    transactionId: resultado.transactionId || '',
    referenciaPago: resultado.referenciaPago || '',
    ventaReferencia: ventaRef,
    monto: resultado.monto ?? total,
    moneda: resultado.moneda || 'COP',
    email: resultado.email || email,
    metodoPago: resultado.metodoPago || '',
    items: items.map((i) => ({ ...i })),
    subtotal,
    total,
    datosFacturacion,
    fecha: new Date().toISOString(),
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type ConsultaConfirmacion = Awaited<
  ReturnType<typeof carritoService.consultarEstadoPagoWompi>
>;

function itemsDesdeConsulta(consulta: ConsultaConfirmacion): CartItem[] {
  if (!consulta?.items?.length) return [];
  return consulta.items.map((item) =>
    mapBackendCartItemToCartItem({
      _id: item._id,
      productoId: item.productoId,
      sku: item.sku || '',
      nombre: item.nombre,
      tipo: '',
      precioUnitario: item.precioUnitario,
      precioActual: item.precioUnitario,
      cantidad: item.cantidad,
      descuentoItem: { tipo: 'NINGUNO', valor: 0 },
      subtotalBruto: item.subtotalNeto,
      subtotalNeto: item.subtotalNeto,
      stockDisponible: item.stockDisponible ?? 0,
      stockSuficiente: item.stockSuficiente !== false,
    }),
  );
}

function consultaTieneDetalle(consulta: ConsultaConfirmacion | null): boolean {
  if (!consulta) return false;
  const tieneItems = Boolean(consulta.items?.length);
  const confirmado =
    consulta.carritoEstado === 'COMPLETADO' ||
    Boolean(consulta.facturaId);
  return tieneItems && confirmado;
}

/**
 * Tras APPROVED, consulta el backend hasta obtener factura + ítems del carrito.
 */
export async function enriquecerConfirmacionDesdeBackend(
  carritoId: string,
  resultado: ResultadoPago,
  fallback: {
    items: CartItem[];
    subtotal: number;
    total: number;
    datosFacturacion: DatosFacturacionInvitado | null;
    email: string;
  },
  maxIntentos = 8,
): Promise<CheckoutConfirmacionPedido> {
  let consulta: ConsultaConfirmacion | null = null;

  for (let i = 0; i < maxIntentos; i += 1) {
    try {
      consulta = await carritoService.consultarEstadoPagoWompi(carritoId);
      if (consultaTieneDetalle(consulta)) break;
    } catch {
      /* reintentar */
    }
    if (i < maxIntentos - 1) await sleep(1500);
  }

  let items = fallback.items;
  let subtotal = fallback.subtotal;
  let total = fallback.total;
  let datosFacturacion = fallback.datosFacturacion;
  let facturaId = resultado.facturaId || '';
  let ventaReferencia = resultado.ventaReferencia || '';
  let referenciaPago = resultado.referenciaPago || '';
  let monto = resultado.monto ?? total;
  let transactionId = resultado.transactionId || '';

  if (consulta) {
    if (consulta.facturaId) facturaId = String(consulta.facturaId);
    if (consulta.ventaReferencia) ventaReferencia = String(consulta.ventaReferencia);
    if (consulta.reference) referenciaPago = String(consulta.reference);
    if (consulta.transactionId) transactionId = String(consulta.transactionId);
    if (consulta.amount_in_cents != null) {
      monto = Number(consulta.amount_in_cents) / 100;
    }
    const itemsConsulta = itemsDesdeConsulta(consulta);
    if (itemsConsulta.length) items = itemsConsulta;
    if (consulta.subtotal != null) subtotal = Number(consulta.subtotal);
    if (consulta.total != null) total = Number(consulta.total);
    if (consulta.datosFacturacion) {
      datosFacturacion = consulta.datosFacturacion as DatosFacturacionInvitado;
    }
  }

  if (!items.length) {
    try {
      const cart = await carritoService.obtenerPorId(carritoId);
      const mapped = mapBackendCartToCartItems(cart);
      if (mapped.length) items = mapped;
      if (cart.subtotal != null) subtotal = cart.subtotal;
      if (cart.total != null) total = cart.total;
      const df = datosFacturacionFromCarrito(cart);
      if (df) datosFacturacion = df;
    } catch {
      /* mantener fallback local */
    }
  }

  return buildConfirmacionSnapshot(
    {
      ...resultado,
      facturaId,
      ventaReferencia,
      referenciaPago,
      transactionId,
      monto,
    },
    items,
    total,
    subtotal,
    datosFacturacion,
    fallback.email,
    carritoId,
  );
}
