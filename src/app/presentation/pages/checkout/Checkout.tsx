import React, { useEffect, useState } from 'react';
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
import carritoService from '../../../services/carritoService';
import { getGovernedLoginPath } from '@/app/services/governedNavigation';
import MembershipStepContent from '@/components/membership/MembershipStepContent';
import { useCartCheckoutPayment } from '@/app/hooks/useCartCheckoutPayment';
import type { ResultadoPago } from '@/app/presentation/pages/membresia/MembershipPayment';
import DatosFacturacionInvitadoModal from '@/app/presentation/components/carrito/DatosFacturacionInvitadoModal';
import {
  readDatosFacturacionInvitado,
  type DatosFacturacionInvitado,
} from '@/app/presentation/components/carrito/DatosFacturacionInvitadoModal';
import CheckoutConfirmacionDetalle from '@/app/presentation/components/checkout/CheckoutConfirmacionDetalle';
import {
  persistCheckoutConfirmacion,
  readCheckoutConfirmacion,
  type CheckoutConfirmacionPedido,
} from '@/app/types/checkoutConfirmacion';
import { enriquecerConfirmacionDesdeBackend } from '@/app/utils/checkoutConfirmacionFromBackend';
import { wompiStatusToEstadoPago } from '@/app/utils/wompiPaymentStatus';

const CHECKOUT_CARRITO_PAGO_KEY = 'mabs_checkout_carrito_pago_id';

function readCarritoIdPagoPersistido(): string | null {
  try {
    return sessionStorage.getItem(CHECKOUT_CARRITO_PAGO_KEY);
  } catch {
    return null;
  }
}

function persistCarritoIdPago(carritoId: string): void {
  try {
    sessionStorage.setItem(CHECKOUT_CARRITO_PAGO_KEY, carritoId);
  } catch {
    /* ignore */
  }
}

function clearCarritoIdPagoPersistido(): void {
  sessionStorage.removeItem(CHECKOUT_CARRITO_PAGO_KEY);
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

const promptLoginOrGuestBilling = async (
  navigate: ReturnType<typeof useNavigate>,
  onGuestBilling: () => void,
): Promise<boolean> => {
  const result = await Swal({
    title: 'Iniciar Sesión Requerido',
    text: 'Necesitas iniciar sesión para continuar con la compra.',
    icon: 'info',
    showCloseButton: true,
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Ir a Login',
    cancelButtonText: 'Seguir sin registrarse',
  });

  if (result.isConfirmed) {
    navigate(getGovernedLoginPath(), { state: { returnUrl: '/checkout' } });
    return false;
  }
  if (result.isDismissed && result.dismiss === 'cancel') {
    onGuestBilling();
    return false;
  }
  return false;
};

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

  const [activeStep, setActiveStep] = useState(0);
  const [preparing, setPreparing] = useState(false);
  const [billingGuestOpen, setBillingGuestOpen] = useState(false);
  const [pagoPreparado, setPagoPreparado] = useState(false);
  const [carritoIdPago, setCarritoIdPago] = useState<string | null>(() =>
    readCarritoIdPagoPersistido(),
  );
  const [pedidoConfirmado, setPedidoConfirmado] = useState<CheckoutConfirmacionPedido | null>(
    () => readCheckoutConfirmacion(),
  );

  const datosFacturacion = readDatosFacturacionInvitado();
  const emailComprador =
    datosFacturacion?.email ||
    user?.correo ||
    user?.email ||
    '';

  const totalFinal = totalBackend > 0 ? totalBackend : cartSummary.total;
  const subtotalFinal = cartSummary.subtotal > 0 ? cartSummary.subtotal : totalFinal;

  const onPagoResultado = async (resultado: ResultadoPago): Promise<void> => {
    if (resultado.estado === 'aprobada') {
      const cid = carritoIdPago || backendCartId || '';
      const snapshot = cid
        ? await enriquecerConfirmacionDesdeBackend(cid, resultado, {
            items: cartItems,
            subtotal: subtotalFinal,
            total: totalFinal,
            datosFacturacion,
            email: emailComprador,
          })
        : null;
      if (!snapshot) {
        toast.error('No se pudo cargar la confirmación del pedido.');
        return;
      }
      persistCheckoutConfirmacion(snapshot);
      setPedidoConfirmado(snapshot);
      clearCarritoIdPagoPersistido();
      await clearCart();
      setActiveStep(2);
      toast.success('¡Pago aprobado! Tu pedido fue confirmado.');
      return;
    }
    if (resultado.estado === 'pendiente') {
      toast.info('Pago pendiente. Completa la aprobación en Nequi o revisa tu correo.');
      return;
    }
    toast.error('El pago no fue aprobado. Intenta con otro método.');
  };

  const {
    loading: paying,
    monitoreandoPago,
    formDataForMembershipUi,
    handleFormChange,
    handlePayment,
    verificarEstadoPagoAhora,
  } = useCartCheckoutPayment(
    carritoIdPago || backendCartId,
    emailComprador,
    datosFacturacion,
    onPagoResultado,
    { monitoreoActivo: activeStep === 1 && pagoPreparado },
  );

  const prepararPago = async (datos?: DatosFacturacionInvitado | null): Promise<boolean> => {
    const id = await ensureBackendCart();
    if (!id) {
      toast.error('No se encontró el carrito.');
      return false;
    }
    await carritoService.checkout(id, datos ?? readDatosFacturacionInvitado());
    setCarritoIdPago(id);
    persistCarritoIdPago(id);
    setPagoPreparado(true);
    return true;
  };

  const irAPasoPago = async (): Promise<void> => {
    if (!user && !readDatosFacturacionInvitado()) {
      await promptLoginOrGuestBilling(navigate, () => setBillingGuestOpen(true));
      return;
    }
    setPreparing(true);
    try {
      const ok = await prepararPago(readDatosFacturacionInvitado());
      if (ok) setActiveStep(1);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo preparar el pago');
    } finally {
      setPreparing(false);
    }
  };

  useEffect(() => {
    const state = location.state as { openPayment?: boolean } | null;
    if (state?.openPayment && (user || datosFacturacion)) {
      void irAPasoPago();
      navigate(location.pathname, { replace: true, state: {} });
    }
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
    const esRetornoWompi =
      params.get('wompi') === 'retorno' ||
      Boolean(params.get('id') || params.get('transaction_id'));

    if (!esRetornoWompi) return;

    const carritoIdRetorno = readCarritoIdPagoPersistido() || backendCartId;
    if (!carritoIdRetorno) return;

    let cancelled = false;

    (async () => {
      try {
        setPreparing(true);
        const consulta = await carritoService.consultarEstadoPagoWompi(carritoIdRetorno);
        if (cancelled) return;

        const estado = wompiStatusToEstadoPago(String(consulta.status || 'PENDING'));
        const monto =
          consulta.amount_in_cents != null
            ? Number(consulta.amount_in_cents) / 100
            : totalFinal;

        if (estado === 'aprobada') {
          const snapshot = await enriquecerConfirmacionDesdeBackend(
            carritoIdRetorno,
            {
              estado: 'aprobada',
              transactionId: String(consulta.transactionId || params.get('id') || ''),
              referenciaPago: String(consulta.reference || ''),
              ventaReferencia: String(consulta.ventaReferencia || ''),
              facturaId: String(consulta.facturaId || ''),
              monto,
              moneda: 'COP',
              email: emailComprador,
              metodoPago: 'pse',
            },
            {
              items: cartItems,
              subtotal: subtotalFinal,
              total: totalFinal,
              datosFacturacion,
              email: emailComprador,
            },
          );
          if (cancelled) return;
          persistCheckoutConfirmacion(snapshot);
          setPedidoConfirmado(snapshot);
          clearCarritoIdPagoPersistido();
          await clearCart();
          setActiveStep(2);
          toast.success('¡Pago aprobado! Tu pedido fue confirmado.');
        } else {
          setCarritoIdPago(carritoIdRetorno);
          setPagoPreparado(true);
          setActiveStep(1);
          if (estado === 'pendiente') {
            toast.info('Pago en verificación. Completa la aprobación en tu banco o Nequi.');
          } else {
            toast.error('El pago no fue aprobado. Intenta nuevamente.');
          }
        }

        navigate(location.pathname, { replace: true });
      } catch (err: unknown) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'No se pudo verificar el pago');
        }
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
        onContinue={async (datos) => {
          try {
            if (!backendCartId) throw new Error('No se encontró el carrito activo');
            await carritoService.guardarDatosFacturacion(backendCartId, datos);
            setBillingGuestOpen(false);
            setPreparing(true);
            const ok = await prepararPago(datos);
            if (ok) setActiveStep(1);
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : 'No se pudieron guardar los datos',
            );
          } finally {
            setPreparing(false);
          }
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
                  onClick={() => navigate('/carrito')}
                >
                  Volver al carrito
                </Button>
                <Button
                  className="flex-1 h-12 font-semibold"
                  onClick={irAPasoPago}
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

              {(monitoreandoPago || paying) && (
                <p className="mt-4 text-sm text-muted-foreground rounded-md border border-primary/20 bg-primary/5 p-3">
                  {paying
                    ? 'Enviando el pago a Wompi…'
                    : 'Esperando confirmación en Nequi. Al aprobar, pasarás automáticamente a confirmación.'}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  disabled={paying}
                  onClick={() => void verificarEstadoPagoAhora()}
                >
                  Ya aprobé en Nequi
                </Button>
              </div>

              <div className="flex justify-between mt-8 pt-4 border-t">
                <Button
                  variant="ghost"
                  onClick={() => setActiveStep(0)}
                  disabled={paying}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Anterior
                </Button>
                <Button
                  className="font-semibold min-w-[160px]"
                  onClick={handlePayment}
                  disabled={paying}
                >
                  {paying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando…
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" /> Pagar pedido
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeStep === 2 && pedidoConfirmado && (
          <Card className="w-full max-w-2xl shadow-xl border">
            <CardContent className="p-6 sm:p-10 flex justify-center">
              <CheckoutConfirmacionDetalle
                pedido={pedidoConfirmado}
                onSeguirComprando={() => navigate('/productos')}
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
