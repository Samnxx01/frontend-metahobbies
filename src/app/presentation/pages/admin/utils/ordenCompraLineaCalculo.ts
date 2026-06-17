import type { OrdenCompraItemLinea } from '@/app/services/inventarioService';

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Descuento en COP redondeado a entero; no supera la base bruta. */
export function descuentoMontoFijo(base: number, descuentoCop: number): number {
  const d = Math.max(0, Math.round(Number(descuentoCop) || 0));
  const b = Math.max(0, base);
  return round2(Math.min(d, b));
}

type ItemDesc = Pick<OrdenCompraItemLinea, 'descuentoPorcentaje' | 'descuento'>;

/**
 * Monto de descuento en COP: prioriza `descuento`; si no hay, conserva
 * compatibilidad con ordenes antiguas que usaban `descuentoPorcentaje`.
 */
export function descuentoMontoLinea(base: number, item: ItemDesc): number {
  const b = Math.max(0, base);
  const descStored = Number(item.descuento ?? 0);
  if (descStored > 0) return descuentoMontoFijo(b, descStored);

  const raw = Number(item.descuentoPorcentaje ?? 0);
  if (raw > 100) return descuentoMontoFijo(b, raw);
  if (raw > 0) return round2((b * raw) / 100);
  return 0;
}

type ItemTot = Pick<
  OrdenCompraItemLinea,
  'subtotal' | 'cantidadOrdenada' | 'costoUnitario' | 'descuentoPorcentaje' | 'descuento' | 'impuestoPorcentaje' | 'impuestos'
>;

/** Total linea = (cantidad x precio) + impuesto sobre bruto - descuento sobre total. */
export function totalLineaOrdenCompra(item: ItemTot): number {
  const s = Number(item.subtotal);
  if (!Number.isNaN(s) && s > 0) return round2(s);

  const q = Number(item.cantidadOrdenada) || 0;
  const p = Number(item.costoUnitario) || 0;
  const base = round2(q * p);
  const d = descuentoMontoLinea(base, item);
  const taxPct = Number(item.impuestoPorcentaje || 0);
  const taxAbs = Number(item.impuestos || 0);
  const impuesto = taxPct > 0 ? round2(base * (taxPct / 100)) : taxAbs;
  return Math.max(0, round2(base + impuesto - d));
}

/** Subtotal del comprobante de entrada alineado con la línea OC (proporcional si es recepción parcial). */
export function subtotalLineaRecepcion(item: ItemTot, cantidadRecibida: number): number {
  const qOrden = Number(item.cantidadOrdenada) || 0;
  const qRec = Number(cantidadRecibida) || 0;
  if (!qOrden || !qRec) return 0;

  const totalLinea = totalLineaOrdenCompra(item);
  if (qRec >= qOrden) return totalLinea;
  return round2(totalLinea * (qRec / qOrden));
}

/** Subtotal de línea en comprobante cuando solo hay cantidad y costo unitario persistidos. */
export function subtotalLineaComprobanteEntrada(
  cantidadRecibida: number,
  costoUnitario: number,
  subtotal?: number,
): number {
  const stored = Number(subtotal);
  if (!Number.isNaN(stored) && stored > 0) return round2(stored);
  const qty = Number(cantidadRecibida) || 0;
  const unit = Number(costoUnitario) || 0;
  return Math.max(0, round2(qty * unit));
}
