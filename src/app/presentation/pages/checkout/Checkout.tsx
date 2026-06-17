import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { swalFire as Swal } from '@/lib/sweetalert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Check,
  Truck,
  Loader2,
  CreditCard,
  ArrowLeft,
} from 'lucide-react';
import { useCart } from '../../../providers/CartProvider';
import { useAuth } from '../../../providers/AuthProvider';
import carritoService, { getCarritoPublicId } from '../../../services/carritoService';
import { getGovernedLoginPath } from '@/app/services/governedNavigation';
import {
  CHECKOUT_PAYMENT_PATH,
  type CheckoutNavigationState,
} from '@/app/services/checkoutNavigation';
import MembershipStepContent from '@/components/membership/MembershipStepContent';
import { useCartCheckoutPayment } from '@/app/hooks/useCartCheckoutPayment';
import type { ResultadoPago } from '@/app/presentation/pages/membresia/MembershipPayment';
import DatosFacturacionInvitadoModal from '@/app/presentation/components/carrito/DatosFacturacionInvitadoModal';
import type { DatosFacturacionInvitado } from '@/app/presentation/components/carrito/DatosFacturacionInvitadoModal';
import {
  clearCachesTrasCompraAprobada,
  clearCheckoutSessionCompleta,
  clearCarritoIdPagoPersistido,
  clearDatosFacturacionInvitado,
  clearWompiRetornoContext,
  isCheckoutDeclinadoActivo,
  limpiarSesionCarritoObsoleto,
  persistWompiRetornoContext,
  persistCarritoIdPago,
  readCarritoIdPagoPersistido,
  readWompiRetornoContext,
} from '@/app/utils/checkoutSessionCache';
import { syncCartSessionWithAttribution } from '@/app/utils/cartSessionAttribution';
import { hydrateGeneradorEnlaceVentasAttribution } from '@/app/services/generadorEnlaceVentasFlow';
import { capturePublicAttributionFromSearch } from '@/app/services/publicAttributionParams';
import CheckoutConfirmacionDetalle from '@/app/presentation/components/checkout/CheckoutConfirmacionDetalle';
import {
  clearCheckoutConfirmacion,
  persistCheckoutConfirmacion,
  readCheckoutConfirmacion,
  type CheckoutConfirmacionPedido,
} from '@/app/types/checkoutConfirmacion';
import {
  buildConfirmacionSnapshot,
  enriquecerConfirmacionDesdeBackend,
} from '@/app/utils/checkoutConfirmacionFromBackend';
import { wompiStatusToEstadoPago } from '@/app/utils/wompiPaymentStatus';
import {
  abandonarPedidoTrasPagoDeclinado,
  cancelarPedidoCheckout,
  ejecutarSalidaPedidoCheckout,
} from '@/app/utils/checkoutPedidoSalida';

function extraerParamsRetornoWompi(search: string): {
  transactionId: string;
  reference: string;
} {
  const params = new URLSearchParams(search);
  const hashParams = new URLSearchParams(
    typeof window !== 'undefined' && window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : '',
  );
  const pick = (key: string): string =>
    String(params.get(key) || hashParams.get(key) || '').trim();

  return {
    transactionId: pick('id') || pick('transaction_id') || pick('transactionId'),
    /** Solo `reference` de Wompi; `ref` es JWT de atribución referidos/Pipeline B. */
    reference: pick('reference'),
  };
}

const STEPS = ['Revisión del Pedido', 'Pago', 'Confirmación'];

interface StepperProps { activeStep: number }

const CustomStepper = ({ activeStep }: StepperProps): React.ReactElement => (
  <div className="flex justify-between items-center mb-10 relative after:absolute after:inset-x-0 after:top-[18px] after:h-0.5 after:-translate-y-1/2 after:bg-border after:z-0">
    {STEPS.map((label, index) => {
      const isCompleted = index < activeStep;
      const isActive = index === activeStep;
      return (
        <div key={label} className="flex flex-col items-center w-full z-10">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ring-4 ring-background transition-colors
            ${isCompleted || isActive ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground border border-input'}`}
          >
            {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
          </div>
          <span
            className={`mt-2 text-xs sm:text-sm font-medium text-center px-1 ${
              isActive ? 'text-primary font-semibold' : 'text-foreground'
            }`}
          >
            {label}
          </span>
        </div>
      );
    })}
  </div>
);

type CheckoutLocationState = CheckoutNavigationState;

export default function Checkout(): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const {
    cartItems,
    cartSummary,
    totalBackend,
    clearCart,
    ensureBackendCart,
    backendCartId,
  } = useCart();

  const [activeStep, setActiveStep] = useState(() => {
    const confirmacion = readCheckoutConfirmacion();
    return confirmacion ? 2 : 0;
  });
  const [preparing, setPreparing] = useState(false);
  const [billingGuestOpen, setBillingGuestOpen] = useState(false);
  const [datosFacturacionSesion, setDatosFacturacionSesion] = useState<DatosFacturacionInvitado | null>(
    null,
  );
  const [pagoPreparado, setPagoPreparado] = useState(false);
  const [cancelandoPedido, setCancelandoPedido] = useState(false);
  const [carritoIdPago, setCarritoIdPago] = useState<string | null>(null);
  const [carritoPagoHidratado, setCarritoPagoHidratado] = useState(false);
  const [pedidoConfirmado, setPedidoConfirmado] = useState<CheckoutConfirmacionPedido | null>(
    () => readCheckoutConfirmacion(),
  );

  const datosFacturacion = datosFacturacionSesion;
  const emailComprador =
    datosFacturacion?.email ||
    user?.correo ||
    user?.email ||
    '';

  const totalFinal = totalBackend > 0 ? totalBackend : cartSummary.total;
  const subtotalFinal = cartSummary.subtotal > 0 ? cartSummary.subtotal : totalFinal;

  const finalizarCompraAprobada = useCallback(
    async (carritoIdConfirmacion: string, resultado: ResultadoPago): Promise<void> => {
      const fallbackConfirmacion = {
        items: cartItems,
        subtotal: subtotalFinal,
        total: totalFinal,
        datosFacturacion,
        email: emailComprador,
      };

      let snapshot = null;
      if (carritoIdConfirmacion) {
        try {
          snapshot = await enriquecerConfirmacionDesdeBackend(
            carritoIdConfirmacion,
            resultado,
            fallbackConfirmacion,
            12,
          );
        } catch {
          snapshot = buildConfirmacionSnapshot(
            resultado,
            cartItems,
            totalFinal,
            subtotalFinal,
            datosFacturacion,
            emailComprador,
            carritoIdConfirmacion,
          );
        }
      }

      if (!snapshot) {
        throw new Error('No se pudo cargar la confirmación del pedido.');
      }

      persistCheckoutConfirmacion(snapshot);
      setPedidoConfirmado(snapshot);
      setDatosFacturacionSesion(null);
      setCarritoIdPago(null);
      setPagoPreparado(false);
      clearCachesTrasCompraAprobada();
      await clearCart();
      setActiveStep(2);
      toast.success('¡Pago aprobado! Tu pedido fue confirmado.');
    },
    [
      cartItems,
      clearCart,
      datosFacturacion,
      emailComprador,
      subtotalFinal,
      totalFinal,
    ],
  );

  const onPagoResultado = async (resultado: ResultadoPago): Promise<void> => {
    if (resultado.estado === 'aprobada') {
      const cid = resultado.carritoId || carritoIdPago || backendCartId || '';
      await finalizarCompraAprobada(cid, resultado);
      return;
    }
    if (resultado.estado === 'pendiente') {
      toast.info('Pago pendiente. Completa la aprobación en Nequi o revisa tu correo.');
      return;
    }
    if (resultado.estado === 'rechazada') {
      return;
    }
    toast.error('El pago no fue aprobado. Intenta con otro método.');
  };

  const {
    loading: paying,
    monitoreandoPago,
    pagoEnviadoAWompi,
    pagoRechazado,
    mensajePagoRechazado,
    formDataForMembershipUi,
    handleFormChange,
    handlePayment,
    verificarEstadoPagoAhora,
    reintentarPago,
    resetTrasCancelarPedido,
    mostrarPagoRechazado,
  } = useCartCheckoutPayment(
    carritoPagoHidratado ? (carritoIdPago || backendCartId) : null,
    emailComprador,
    datosFacturacion,
    onPagoResultado,
    { monitoreoActivo: activeStep === 1 && pagoPreparado && carritoPagoHidratado },
  );

  const pagoRechazadoRef = useRef(pagoRechazado);
  const carritoIdPagoRef = useRef(carritoIdPago);
  const backendCartIdRef = useRef(backendCartId);
  pagoRechazadoRef.current = pagoRechazado;
  carritoIdPagoRef.current = carritoIdPago;
  backendCartIdRef.current = backendCartId;

  const resolverCarritoIdPedido = useCallback(
    (): string | null => carritoIdPago || backendCartId || null,
    [backendCartId, carritoIdPago],
  );

  const resetUiOtroPedidoTrasDeclined = useCallback(() => {
    reintentarPago();
    setPagoPreparado(false);
    setCarritoIdPago(null);
    setActiveStep(0);
  }, [reintentarPago]);

  const resetUiPedidoCancelado = useCallback(() => {
    resetTrasCancelarPedido();
    setPagoPreparado(false);
    setCarritoIdPago(null);
    setDatosFacturacionSesion(null);
    setActiveStep(0);
  }, [resetTrasCancelarPedido]);

  /** Escenario 1 DECLINED: sale sin cancelar — limpia caché declined y deja carrito listo para nuevo checkout. */
  const salirTrasPagoDeclinado = useCallback(async (): Promise<void> => {
    const cid = carritoIdPagoRef.current || backendCartIdRef.current;
    await abandonarPedidoTrasPagoDeclinado(cid);
    resetUiOtroPedidoTrasDeclined();
  }, [resetUiOtroPedidoTrasDeclined]);

  /** Escenario 2: cancelar pedido (válido con pago pendiente o rechazado). */
  const cancelarPedidoActivo = useCallback(async (): Promise<void> => {
    const cid = resolverCarritoIdPedido();
    if (!cid) {
      toast.error('No se encontró el carrito del pedido.');
      return;
    }

    const confirmacion = await Swal({
      title: '¿Cancelar pedido?',
      text: pagoRechazado
        ? 'Se anulará el pedido rechazado, el carrito y la referencia de pago. Se limpiará el caché del intento fallido.'
        : 'Se anulará el carrito, el pedido pendiente y la referencia de pago. Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, cancelar pedido',
      cancelButtonText: 'Volver al pago',
    });
    if (!confirmacion.isConfirmed) return;

    setCancelandoPedido(true);
    try {
      await cancelarPedidoCheckout(cid);
      resetUiPedidoCancelado();
      await clearCart();
      toast.success('Pedido cancelado. Se limpió la sesión de pago.');
      navigate('/carrito', { replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cancelar el pedido');
    } finally {
      setCancelandoPedido(false);
    }
  }, [clearCart, navigate, pagoRechazado, resetUiPedidoCancelado, resolverCarritoIdPedido]);

  const reintentarPagoDeclinado = useCallback(async (): Promise<void> => {
    const cid = resolverCarritoIdPedido();
    await ejecutarSalidaPedidoCheckout(cid, 'reintentar_pago');
    reintentarPago();
  }, [reintentarPago, resolverCarritoIdPedido]);

  useEffect(() => {
    syncCartSessionWithAttribution();
  }, []);

  /**
   * Hidrata carritoId de pago desde caché solo si el backend lo reconoce.
   * Evita GET 404 por ids obsoletos tras cancelar pedido o cambiar de sesión.
   */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('wompi') === 'retorno' || params.get('id') || params.get('transactionId')) {
      setCarritoPagoHidratado(true);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      const persistido = readCarritoIdPagoPersistido();
      const candidato = persistido || backendCartIdRef.current;
      if (!candidato) {
        if (!cancelled) setCarritoPagoHidratado(true);
        return;
      }

      const cart = await carritoService.obtenerPorIdSeguro(candidato);
      if (cancelled) return;

      if (!cart) {
        limpiarSesionCarritoObsoleto();
        setCarritoIdPago(null);
        setCarritoPagoHidratado(true);
        return;
      }

      const id = getCarritoPublicId(cart) || candidato;
      const estado = String(cart.estado || '').toUpperCase();
      const ventaEstado = String(cart.estadoVentaReferencia || '').toUpperCase();

      if (estado === 'COMPLETADO') {
        limpiarSesionCarritoObsoleto();
        setCarritoIdPago(null);
        if (!cancelled) setCarritoPagoHidratado(true);
        return;
      }

      const enFlujoPago =
        estado === 'PENDIENTE_PAGO'
        || (estado === 'ACTIVO' && ventaEstado === 'PENDIENTE');

      if (persistido && enFlujoPago) {
        setCarritoIdPago(id);
      } else if (persistido) {
        limpiarSesionCarritoObsoleto();
        setCarritoIdPago(null);
      }

      if (isCheckoutDeclinadoActivo() && enFlujoPago) {
        if (cart.datosFacturacion) {
          setDatosFacturacionSesion(cart.datosFacturacion as DatosFacturacionInvitado);
        }
        setCarritoIdPago(id);
        setPagoPreparado(true);
        setActiveStep(1);
      }

      if (!cancelled) setCarritoPagoHidratado(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [location.search, mostrarPagoRechazado]);

  const resolverCarritoIdParaCheckout = async (): Promise<string | null> => {
    const persistido = readCarritoIdPagoPersistido();
    if (persistido) {
      const cart = await carritoService.obtenerPorIdSeguro(persistido);
      if (!cart) {
        limpiarSesionCarritoObsoleto();
      } else {
        const id = getCarritoPublicId(cart);
        const estado = String(cart.estado || '').toUpperCase();
        const tieneItems = (cart.items?.length ?? 0) > 0;
        if (id && tieneItems && (estado === 'ACTIVO' || estado === 'PENDIENTE_PAGO')) {
          const ventaEstado = String(cart.estadoVentaReferencia || '').toUpperCase();
          if (estado === 'ACTIVO' && ventaEstado === 'PENDIENTE') return id;
          if (estado === 'ACTIVO' && !ventaEstado) return id;
          if (estado === 'PENDIENTE_PAGO') return id;
        }
        if (id && estado === 'CANCELADO' && tieneItems) {
          const reabierto = await carritoService.reabrirTrasPagoFallido(id);
          return getCarritoPublicId(reabierto) || id;
        }
        limpiarSesionCarritoObsoleto();
      }
    }

    const idActivo = await ensureBackendCart();
    if (!idActivo) return null;

    const cartActivo = await carritoService.obtenerPorIdSeguro(idActivo);
    if (cartActivo && (cartActivo.items?.length ?? 0) > 0) return idActivo;

    return idActivo;
  };

  const prepararPago = async (datos: DatosFacturacionInvitado): Promise<boolean> => {
    // No borrar cart_images/cart_colors: la confirmación aún los necesita tras el pago.
    clearCheckoutConfirmacion();
    clearWompiRetornoContext();
    let id = await resolverCarritoIdParaCheckout();
    if (!id) {
      toast.error('No se encontró el carrito.');
      return false;
    }
    const cartPrevio = await carritoService.obtenerPorIdSeguro(id);
    if (!cartPrevio) {
      limpiarSesionCarritoObsoleto();
      toast.error('El carrito del pedido ya no existe. Vuelve al carrito e intenta de nuevo.');
      return false;
    }
    if (String(cartPrevio.estado || '').toUpperCase() === 'CANCELADO') {
      const reabierto = await carritoService.reabrirTrasPagoFallido(id);
      id = getCarritoPublicId(reabierto) || id;
    }
    await carritoService.guardarDatosFacturacion(id, datos);
    const checkout = await carritoService.checkout(id, datos);
    const idPago = getCarritoPublicId(checkout.carrito) || id;
    setCarritoIdPago(idPago);
    persistCarritoIdPago(idPago);
    setCarritoPagoHidratado(true);
    setPagoPreparado(true);
    return true;
  };

  const continuarConDatosFacturacion = async (datos: DatosFacturacionInvitado): Promise<void> => {
    setDatosFacturacionSesion(datos);
    clearDatosFacturacionInvitado();
    setPreparing(true);
    try {
      const ok = await prepararPago(datos);
      if (ok) setActiveStep(1);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo preparar el pago');
    } finally {
      setPreparing(false);
    }
  };

  const solicitarTerceroParaPago = async (): Promise<void> => {
    if (!user) {
      const esGenerador = await hydrateGeneradorEnlaceVentasAttribution(location.search);
      if (esGenerador) {
        setBillingGuestOpen(true);
        return;
      }

      const result = await Swal({
        title: 'Datos para facturación',
        text: 'Indica el tercero que figurará en la factura o inicia sesión.',
        icon: 'info',
        showCloseButton: true,
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Ir a Login',
        cancelButtonText: 'Completar datos',
      });
      if (result.isConfirmed) {
        navigate(getGovernedLoginPath(), { state: { returnUrl: CHECKOUT_PAYMENT_PATH } });
        return;
      }
      if (!(result.isDismissed && result.dismiss === 'cancel')) return;
    }
    setBillingGuestOpen(true);
  };

  useEffect(() => {
    capturePublicAttributionFromSearch(location.search);
    clearDatosFacturacionInvitado();
    const state = location.state as CheckoutLocationState | null;
    if (!state?.datosFacturacion && !state?.openPayment) return;

    if (state.datosFacturacion) {
      setDatosFacturacionSesion(state.datosFacturacion);
    }
    if (state.openPayment && state.datosFacturacion) {
      void continuarConDatosFacturacion(state.datosFacturacion);
    } else if (state.openPayment) {
      void solicitarTerceroParaPago();
    }
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeStep === 2 && !pedidoConfirmado) {
      const stored = readCheckoutConfirmacion();
      if (stored) setPedidoConfirmado(stored);
    }
  }, [activeStep, pedidoConfirmado]);

  /** Retorno desde pasarela Wompi (PSE / checkout widget) → confirmación si APPROVED */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlCtx = extraerParamsRetornoWompi(location.search);
    const storedCtx = readWompiRetornoContext();
    const transactionId =
      urlCtx.transactionId
      || params.get('id')
      || params.get('transactionId')
      || params.get('transaction_id')
      || storedCtx.transactionId;
    const reference = urlCtx.reference || params.get('reference') || storedCtx.reference;
    /** Solo retorno real desde pasarela (URL), no el contexto persistido del polling Nequi/tarjeta. */
    const esRetornoWompi =
      params.get('wompi') === 'retorno'
      || Boolean(
        urlCtx.transactionId
        || params.get('id')
        || params.get('transactionId')
        || params.get('transaction_id')
        || params.get('reference'),
      );

    if (!esRetornoWompi) return;
    const txConfirmado = String(pedidoConfirmado?.transactionId || '').trim();
    const txRetorno = String(transactionId || '').trim();
    if (pedidoConfirmado && (!txRetorno || txConfirmado === txRetorno)) {
      navigate(location.pathname, { replace: true });
      return;
    }

    if (transactionId || reference) {
      persistWompiRetornoContext({
        transactionId: String(transactionId || ''),
        reference: String(reference || ''),
      });
    }

    /** Siempre '0': el backend resuelve por transactionId, referencia o x-session-id. */
    const carritoIdRetorno = '0';

    let cancelled = false;

    (async () => {
      try {
        setPreparing(true);
        setCarritoPagoHidratado(true);
        const consulta = await carritoService.consultarEstadoPagoWompi(
          carritoIdRetorno || '0',
          { transactionId: transactionId || undefined, reference: reference || undefined },
        );
        if (cancelled) return;

        persistWompiRetornoContext({
          transactionId: String(consulta.transactionId || transactionId || ''),
          reference: String(consulta.reference || reference || ''),
        });

        const idResuelto = String(consulta.carritoId || carritoIdRetorno || '').trim();
        if (idResuelto) persistCarritoIdPago(idResuelto);

        const estado = wompiStatusToEstadoPago(String(consulta.status || 'PENDING'));
        const monto =
          consulta.amount_in_cents != null
            ? Number(consulta.amount_in_cents) / 100
            : totalFinal;

        if (estado === 'aprobada') {
          if (cancelled) return;
          await finalizarCompraAprobada(idResuelto, {
            estado: 'aprobada',
            carritoId: idResuelto,
            transactionId: String(consulta.transactionId || params.get('id') || ''),
            referenciaPago: String(consulta.reference || ''),
            ventaReferencia: String(consulta.ventaReferencia || ''),
            facturaId: String(consulta.facturaId || ''),
            monto,
            moneda: 'COP',
            email: emailComprador,
            metodoPago: 'pse',
          });
        } else {
          if (idResuelto) setCarritoIdPago(idResuelto);
          setPagoPreparado(true);
          setActiveStep(1);
          if (estado === 'pendiente') {
            toast.info('Pago en verificación. Completa la aprobación en tu banco o Nequi.');
          } else {
            mostrarPagoRechazado(
              typeof consulta.mensajePago === 'string' ? consulta.mensajePago : undefined,
            );
            toast.error('El pago no fue aprobado. Puedes reintentar, iniciar otro pedido o cancelar el actual.');
          }
        }

        navigate(location.pathname, { replace: true });
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'No se pudo verificar el pago';
          toast.error(msg);
          if (transactionId) {
            try {
              const reintento = await carritoService.consultarEstadoPagoWompi('0', {
                transactionId: String(transactionId),
                reference: reference || undefined,
              });
              if (wompiStatusToEstadoPago(String(reintento?.status || '')) === 'aprobada') {
                const idOk = String(reintento.carritoId || '').trim();
                await finalizarCompraAprobada(idOk, {
                  estado: 'aprobada',
                  carritoId: idOk,
                  transactionId: String(reintento.transactionId || transactionId),
                  referenciaPago: String(reintento.reference || ''),
                  ventaReferencia: String(reintento.ventaReferencia || ''),
                  facturaId: String(reintento.facturaId || ''),
                  monto:
                    reintento.amount_in_cents != null
                      ? Number(reintento.amount_in_cents) / 100
                      : totalFinal,
                  moneda: 'COP',
                  email: emailComprador,
                  metodoPago: 'pse',
                });
              }
            } catch {
              /* ya se mostró el error principal */
            }
          }
        }
        navigate(location.pathname, { replace: true });
      } finally {
        if (!cancelled) setPreparing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <DatosFacturacionInvitadoModal
        open={billingGuestOpen}
        onOpenChange={setBillingGuestOpen}
        persistDraft={false}
        onContinue={async (datos) => {
          setBillingGuestOpen(false);
          await continuarConDatosFacturacion(datos);
        }}
      />

      <h1 className="text-3xl font-bold mb-8 text-center">Finalizar Compra</h1>
      <CustomStepper activeStep={activeStep} />

      <div className="flex justify-center">
        {activeStep === 0 && (
          <Card className="w-full max-w-2xl shadow-xl border">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" /> Revisión del Pedido
              </h2>

              <div className="space-y-3 mb-6">
                {cartItems.map((item: CartItem) => (
                  <div
                    key={String(item.id) + (item.color?.pantone || '')}
                    className="flex items-center gap-3 text-sm"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded-md flex-shrink-0"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold">
                        ${(item.price * item.quantity).toLocaleString('es-CO')}
                      </p>
                      <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="mb-4" />

              <div className="space-y-2 text-sm mb-6">
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>Total</span>
                  <span className="text-primary">${totalFinal.toLocaleString('es-CO')}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={() => {
                    void (async () => {
                      if (pagoRechazadoRef.current) {
                        await salirTrasPagoDeclinado();
                      }
                      navigate('/carrito');
                    })();
                  }}
                >
                  Volver al carrito
                </Button>
                <Button
                  className="flex-1 h-12 font-semibold"
                  onClick={() => { void solicitarTerceroParaPago(); }}
                  disabled={preparing || cartItems.length === 0}
                >
                  {preparing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Preparando…
                    </>
                  ) : (
                    'Continuar al pago'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeStep === 1 && pagoPreparado && (
          <Card className="w-full max-w-2xl shadow-xl border">
            <CardContent className="p-6 sm:p-8">
              <p className="text-xs uppercase tracking-wide text-primary font-semibold mb-1">
                Paso 2 de 3
              </p>
              <MembershipStepContent
                step={2}
                formData={formDataForMembershipUi}
                handleFormChange={handleFormChange}
                MEMBERSHIP_PRICE={totalFinal}
                token=""
              />

              {pagoRechazado && !paying && (
                <div
                  role="alert"
                  className="mt-4 text-sm rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-4"
                >
                  <p className="font-semibold">Pago rechazado</p>
                  <p className="mt-1 text-destructive/90">
                    {mensajePagoRechazado}
                  </p>
                  <div className="mt-3 flex flex-col sm:flex-row flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-destructive/50 text-destructive hover:bg-destructive/10"
                      disabled={cancelandoPedido}
                      onClick={() => void reintentarPagoDeclinado()}
                    >
                      Reintentar pago
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      disabled={cancelandoPedido}
                      onClick={() => void salirTrasPagoDeclinado()}
                    >
                      Otro pedido
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      disabled={cancelandoPedido}
                      onClick={() => void cancelarPedidoActivo()}
                    >
                      Cancelar pedido
                    </Button>
                  </div>
                </div>
              )}

              {((monitoreandoPago && pagoEnviadoAWompi) || paying) && !pagoRechazado && (
                <p className="mt-4 text-sm text-muted-foreground rounded-md border border-primary/20 bg-primary/5 p-3">
                  {paying
                    ? formDataForMembershipUi.paymentInfo.paymentMethod === 'pse'
                      ? 'Redirigiendo a la pasarela PSE…'
                      : 'Enviando el pago a Wompi…'
                    : formDataForMembershipUi.paymentInfo.paymentMethod === 'pse'
                      ? 'Completa el pago en tu banco. Al volver, verificaremos el estado.'
                      : formDataForMembershipUi.paymentInfo.paymentMethod === 'card'
                        ? 'Procesando el pago con tarjeta. Al aprobarse, pasarás automáticamente a confirmación.'
                        : 'Esperando confirmación en Nequi. Al aprobar, pasarás automáticamente a confirmación.'}
                </p>
              )}

              {!pagoRechazado
                && monitoreandoPago
                && pagoEnviadoAWompi
                && (formDataForMembershipUi.paymentInfo.paymentMethod === 'nequi'
                  || formDataForMembershipUi.paymentInfo.paymentMethod === 'card') && (
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    disabled={paying}
                    onClick={() => void verificarEstadoPagoAhora()}
                  >
                    {formDataForMembershipUi.paymentInfo.paymentMethod === 'card'
                      ? 'Verificar pago con tarjeta'
                      : 'Ya aprobé en Nequi'}
                  </Button>
                </div>
              )}

              {!pagoRechazado
                && formDataForMembershipUi.paymentInfo.paymentMethod === 'pse'
                && !monitoreandoPago
                && !paying && (
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    disabled={paying}
                    onClick={() => void verificarEstadoPagoAhora()}
                  >
                    Verificar pago PSE
                  </Button>
                </div>
              )}

              <div className="flex justify-between mt-8 pt-4 border-t">
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (pagoRechazado) {
                      void salirTrasPagoDeclinado();
                      return;
                    }
                    setActiveStep(0);
                  }}
                  disabled={paying || cancelandoPedido}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Anterior
                </Button>
                <Button
                  className="font-semibold min-w-[160px]"
                  onClick={handlePayment}
                  disabled={paying || cancelandoPedido || (monitoreandoPago && pagoEnviadoAWompi && !pagoRechazado)}
                >
                  {paying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando…
                    </>
                  ) : pagoRechazado ? (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" /> Reintentar pago
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" /> Pagar pedido
                    </>
                  )}
                </Button>
              </div>

              {!pagoRechazado && (
                <div className="mt-4 flex justify-center">
                  <Button
                    type="button"
                    variant="link"
                    className="text-destructive hover:text-destructive/90 text-sm"
                    disabled={paying || cancelandoPedido}
                    onClick={() => void cancelarPedidoActivo()}
                  >
                    {cancelandoPedido ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" /> Cancelando pedido…
                      </>
                    ) : (
                      'Cancelar pedido'
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeStep === 2 && pedidoConfirmado && (
          <Card className="w-full max-w-2xl shadow-xl border">
            <CardContent className="p-6 sm:p-10 flex justify-center">
              <CheckoutConfirmacionDetalle
                pedido={pedidoConfirmado}
                onSeguirComprando={() => {
                  clearCheckoutSessionCompleta();
                  navigate('/productos');
                }}
              />
            </CardContent>
          </Card>
        )}

        {activeStep === 2 && !pedidoConfirmado && (
          <Card className="w-full max-w-2xl shadow-xl border p-8 text-center text-muted-foreground">
            No hay datos del pedido. Si completaste un pago, revisa tu correo o contacta soporte.
            <Button className="mt-4" variant="outline" onClick={() => navigate('/productos')}>
              Ir a productos
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
