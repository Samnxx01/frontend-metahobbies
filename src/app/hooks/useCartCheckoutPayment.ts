import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import carritoService from '@/app/services/carritoService';
import type { DatosFacturacionInvitado } from '@/app/presentation/components/carrito/DatosFacturacionInvitadoModal';
import type { ResultadoPago } from '@/app/presentation/pages/membresia/MembershipPayment';
import {
  extraerEstadoWompiDeRespuestaCarrito,
  extraerMontoCopDeRespuestaCarrito,
  extraerReferenciaWompiDeRespuestaCarrito,
  normalizarExpiryTarjeta,
  wompiStatusToEstadoPago,
} from '@/app/utils/wompiPaymentStatus';

export interface CartPaymentInfo {
  paymentMethod: 'nequi' | 'card' | 'pse' | '';
  cardType?: 'credit' | 'debit';
  nequiPhone?: string;
  cardNumber?: string;
  cardName?: string;
  expiryDate?: string;
  cvv?: string;
  installments?: number;
  phoneNumber?: string;
  fullName?: string;
  pseUserType?: '0' | '1' | '';
  pseLegalIdType?: 'CC' | 'CE' | 'NIT' | '';
  pseLegalId?: string;
  pseFinancialInstitution?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const POLL_MAX_INTENTOS = 80;
const POLL_INTERVALO_MS = 4000;

const buildInitialPaymentFromFacturacion = (
  datos: DatosFacturacionInvitado | null,
): CartPaymentInfo => {
  if (!datos) {
    return { paymentMethod: '' };
  }
  const nombre =
    datos.tipoPersona === 'NATURAL'
      ? datos.nombreCompleto
      : datos.razonSocial;
  return {
    paymentMethod: '',
    nequiPhone: datos.telefono?.replace(/\D/g, '').slice(0, 10) || '',
    phoneNumber: datos.telefono?.replace(/\D/g, '').slice(0, 10) || '',
    fullName: nombre || '',
    cardName: nombre?.toUpperCase() || '',
    pseLegalId: datos.numeroDocumento || '',
    pseLegalIdType:
      datos.tipoDocumento?.toUpperCase().includes('NIT') ? 'NIT' : 'CC',
    pseUserType: datos.tipoPersona === 'JURIDICA' ? '1' : '0',
  };
};

function mapConsultaAResultado(
  consulta: {
    status?: string;
    reference?: string;
    ventaReferencia?: string | null;
    facturaId?: string | null;
    transactionId?: string | null;
    amount_in_cents?: number | null;
  },
  email: string,
  metodoPago: string,
): ResultadoPago {
  const wompiStatus = String(consulta?.status || 'PENDING');
  const estado = wompiStatusToEstadoPago(wompiStatus);
  const referenciaPago = String(consulta?.reference || '');
  const ventaReferencia = String(consulta?.ventaReferencia || '');
  const facturaId = String(consulta?.facturaId || '');
  const monto =
    consulta?.amount_in_cents != null
      ? Number(consulta.amount_in_cents) / 100
      : undefined;

  return {
    estado,
    referencia: ventaReferencia || referenciaPago,
    monto,
    moneda: 'COP',
    email,
    transactionId: String(consulta?.transactionId || ''),
    referenciaPago,
    ventaReferencia,
    facturaId,
    metodoPago,
  };
}

async function resolverEstadoFinalPago(
  carritoId: string,
  data: Record<string, unknown>,
): Promise<{
  wompiStatus: string;
  referencia: string;
  referenciaPago: string;
  ventaReferencia: string;
  facturaId: string;
  transactionId: string;
  monto?: number;
}> {
  let wompiStatus = extraerEstadoWompiDeRespuestaCarrito(data);
  let referenciaPago = String(data.reference || '');
  let ventaReferencia = String(data.ventaReferencia || '');
  let facturaId = String(data.facturaId || '');
  let transactionId = String(data.transactionId || data.transaccion?.id || '');
  let monto = extraerMontoCopDeRespuestaCarrito(data);
  let referencia = extraerReferenciaWompiDeRespuestaCarrito(data);

  if (wompiStatusToEstadoPago(wompiStatus) !== 'pendiente') {
    return { wompiStatus, referencia, referenciaPago, ventaReferencia, facturaId, transactionId, monto };
  }

  const maxIntentos = 8;
  for (let i = 0; i < maxIntentos; i += 1) {
    await sleep(2000);
    try {
      const consulta = await carritoService.consultarEstadoPagoWompi(carritoId);
      wompiStatus = String(consulta?.status || wompiStatus);
      referenciaPago = String(consulta?.reference || referenciaPago);
      ventaReferencia = String(consulta?.ventaReferencia || ventaReferencia);
      facturaId = String(consulta?.facturaId || facturaId);
      transactionId = String(consulta?.transactionId || transactionId);
      referencia = ventaReferencia || referenciaPago || referencia;
      if (consulta?.amount_in_cents) {
        monto = Number(consulta.amount_in_cents) / 100;
      }
      if (wompiStatusToEstadoPago(wompiStatus) !== 'pendiente') {
        break;
      }
    } catch {
      break;
    }
  }

  return { wompiStatus, referencia, referenciaPago, ventaReferencia, facturaId, transactionId, monto };
}

export function useCartCheckoutPayment(
  carritoId: string | null,
  email: string,
  datosFacturacion: DatosFacturacionInvitado | null,
  onPagoResultado?: (resultado: ResultadoPago) => void,
  options?: { monitoreoActivo?: boolean },
) {
  const [paymentInfo, setPaymentInfo] = useState<CartPaymentInfo>(() =>
    buildInitialPaymentFromFacturacion(datosFacturacion),
  );
  const [loading, setLoading] = useState(false);
  const [monitoreandoPago, setMonitoreandoPago] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  const onPagoResultadoRef = useRef(onPagoResultado);
  onPagoResultadoRef.current = onPagoResultado;

  const metodoPagoRef = useRef(paymentInfo.paymentMethod);
  metodoPagoRef.current = paymentInfo.paymentMethod;

  const consultarYNotificar = useCallback(
    async (id: string): Promise<ResultadoPago | null> => {
      const consulta = await carritoService.consultarEstadoPagoWompi(id);
      const resultado = mapConsultaAResultado(
        consulta,
        email,
        String(metodoPagoRef.current || ''),
      );
      if (resultado.estado !== 'pendiente') {
        onPagoResultadoRef.current?.(resultado);
      }
      return resultado;
    },
    [email],
  );

  const verificarEstadoPagoAhora = useCallback(async (): Promise<void> => {
    if (!carritoId) {
      toast.error('No se encontró el carrito del pago.');
      return;
    }
    setLoading(true);
    try {
      const resultado = await consultarYNotificar(carritoId);
      if (!resultado) return;
      if (resultado.estado === 'aprobada') {
        setMonitoreandoPago(false);
        toast.success('¡Pago confirmado!');
      } else if (resultado.estado === 'rechazada') {
        setMonitoreandoPago(false);
        toast.error('El pago fue rechazado.');
      } else {
        toast.info('El pago sigue pendiente. Aprueba en Nequi y vuelve a verificar.');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo consultar el pago');
    } finally {
      setLoading(false);
    }
  }, [carritoId, consultarYNotificar]);

  // Polling prolongado (Nequi / aprobación tardía o vía API directa)
  useEffect(() => {
    const debeMonitorear =
      Boolean(carritoId) &&
      (monitoreandoPago || options?.monitoreoActivo === true);

    if (!debeMonitorear) return undefined;

    if (pollCount >= POLL_MAX_INTENTOS) {
      setMonitoreandoPago(false);
      toast.info(
        'La verificación tardó demasiado. Usa «Ya aprobé en Nequi» o revisa tu correo.',
      );
      return undefined;
    }

    const timer = setTimeout(async () => {
      if (!carritoId) return;
      try {
        const resultado = await consultarYNotificar(carritoId);
        if (resultado?.estado === 'aprobada') {
          setMonitoreandoPago(false);
          toast.success('¡Pago confirmado!');
        } else if (resultado?.estado === 'rechazada') {
          setMonitoreandoPago(false);
          toast.error('El pago fue rechazado.');
        } else {
          setPollCount((c) => c + 1);
        }
      } catch {
        setPollCount((c) => c + 1);
      }
    }, pollCount === 0 ? 1500 : POLL_INTERVALO_MS);

    return () => clearTimeout(timer);
  }, [
    carritoId,
    monitoreandoPago,
    options?.monitoreoActivo,
    pollCount,
    consultarYNotificar,
  ]);

  // Al entrar al paso de pago, sincronizar por si ya está APPROVED en Wompi/auditoría
  useEffect(() => {
    if (!carritoId || options?.monitoreoActivo !== true) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const resultado = await consultarYNotificar(carritoId);
        if (cancelled || !resultado) return;
        if (resultado.estado === 'pendiente') {
          setMonitoreandoPago(true);
          setPollCount(0);
        }
      } catch {
        /* sin referencia de pago aún */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [carritoId, options?.monitoreoActivo, consultarYNotificar]);

  const handleFormChange = useCallback(
    (_section: 'personalInfo' | 'paymentInfo', field: string, value: unknown) => {
      setPaymentInfo((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const validatePayment = (): string | null => {
    if (!paymentInfo.paymentMethod) {
      return 'Por favor selecciona un método de pago';
    }
    if (paymentInfo.paymentMethod === 'nequi') {
      if (!paymentInfo.nequiPhone) return 'Ingresa tu número Nequi';
      if (!/^3\d{9}$/.test(paymentInfo.nequiPhone)) {
        return 'Número colombiano válido (10 dígitos, empieza con 3)';
      }
    }
    if (paymentInfo.paymentMethod === 'card') {
      if (!paymentInfo.cardType) return 'Selecciona tipo de tarjeta';
      if (!paymentInfo.cardNumber || !paymentInfo.cardName || !paymentInfo.expiryDate || !paymentInfo.cvv) {
        return 'Completa los datos de la tarjeta';
      }
    }
    if (paymentInfo.paymentMethod === 'pse') {
      return null;
    }
    return null;
  };

  const handlePayment = async (): Promise<void> => {
    const validationError = validatePayment();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (!carritoId) {
      toast.error('No se encontró el carrito activo.');
      return;
    }

    setLoading(true);
    try {
      let payload: Parameters<typeof carritoService.ejecutarPagoWompi>[1] = {
        paymentMethod: paymentInfo.paymentMethod as 'nequi' | 'card' | 'pse',
        customer_email: email,
      };

      if (paymentInfo.paymentMethod === 'nequi') {
        payload = {
          ...payload,
          payment_method: {
            type: 'NEQUI',
            phone_number: String(paymentInfo.nequiPhone || '').replace(/\D/g, ''),
          },
        };
      } else if (paymentInfo.paymentMethod === 'pse') {
        payload = {
          ...payload,
          paymentMethod: 'pse',
        };
      } else if (paymentInfo.paymentMethod === 'card') {
        const wompiPublicKey = import.meta.env.VITE_WOMPI_PUBLIC_KEY;
        if (!wompiPublicKey) throw new Error('Clave pública de Wompi no configurada');

        const expiry = normalizarExpiryTarjeta(paymentInfo.expiryDate);
        if (!expiry) throw new Error('Fecha de expiración inválida (usa MM/AA)');

        const tokenizeResponse = await fetch('https://production.wompi.co/v1/tokens/cards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${wompiPublicKey}`,
          },
          body: JSON.stringify({
            number: paymentInfo.cardNumber?.replace(/\s/g, ''),
            cvc: paymentInfo.cvv,
            exp_month: expiry.expMonth,
            exp_year: expiry.expYear,
            card_holder: paymentInfo.cardName,
          }),
        });

        if (!tokenizeResponse.ok) {
          const errData = await tokenizeResponse.json().catch(() => ({}));
          throw new Error(
            (errData as { error?: { reason?: string } })?.error?.reason ||
              'Error al procesar la tarjeta',
          );
        }

        const tokenData = await tokenizeResponse.json();
        if (!tokenData.data?.id) throw new Error('No se pudo tokenizar la tarjeta');

        const installments =
          paymentInfo.cardType === 'debit' ? 1 : paymentInfo.installments || 1;

        payload = {
          ...payload,
          payment_method: {
            type: 'CARD',
            installments,
            token: tokenData.data.id,
          },
        };
      }

      if (payload.payment_method?.type) {
        (payload as { payment_method_type?: string }).payment_method_type =
          String(payload.payment_method.type);
      }

      const data = (await carritoService.ejecutarPagoWompi(carritoId, payload)) as Record<
        string,
        unknown
      > & {
        transactionId?: string;
        reference?: string;
        ventaReferencia?: string;
        facturaId?: string;
        transaccion?: { id?: string; status?: string };
      };

      if (paymentInfo.paymentMethod === 'pse' && data?.wompiCheckoutUrl) {
        toast.success('Redirigiendo a la pasarela de pago…');
        window.location.href = String(data.wompiCheckoutUrl);
        return;
      }

      const resolved = await resolverEstadoFinalPago(carritoId, data);
      const estado = wompiStatusToEstadoPago(resolved.wompiStatus);

      onPagoResultado?.({
        estado,
        referencia: resolved.referencia,
        monto: resolved.monto,
        moneda: 'COP',
        email,
        transactionId: resolved.transactionId,
        referenciaPago: resolved.referenciaPago,
        ventaReferencia: resolved.ventaReferencia,
        facturaId: resolved.facturaId,
        metodoPago: paymentInfo.paymentMethod,
      });

      if (estado === 'aprobada') {
        setMonitoreandoPago(false);
        return;
      }
      if (estado === 'pendiente') {
        setMonitoreandoPago(true);
        setPollCount(0);
        toast.info('Aprueba el pago en Nequi. Te llevaremos a confirmación al detectarlo.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al procesar el pago';
      toast.error(message.replace(/^\[\d+\]\s*/, ''));
    } finally {
      setLoading(false);
    }
  };

  const formDataForMembershipUi = {
    personalInfo: { email },
    paymentInfo,
  };

  return {
    loading,
    paymentInfo,
    monitoreandoPago,
    formDataForMembershipUi,
    handleFormChange,
    handlePayment,
    verificarEstadoPagoAhora,
  };
}
