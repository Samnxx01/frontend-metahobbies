import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { axiosClient } from '@/app/services/api';
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
import {
  clearCachesTrasPagoRechazado,
  clearCheckoutCachesParaReintentoPago,
  clearCheckoutSessionCompleta,
  clearWompiRetornoContext,
  isReferenciaWompiDuplicadaError,
  marcarCheckoutDeclinadoActivo,
  persistWompiRetornoContext,
  readCarritoIdPagoPersistido,
  readWompiRetornoContext,
} from '@/app/utils/checkoutSessionCache';

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

/** Solo hay pago Nequi/tarjeta en curso si Wompi ya registró una transacción (no basta la referencia del checkout). */
function tieneTransaccionWompiEnCurso(
  consulta: { transactionId?: string | null } | null | undefined,
): boolean {
  return Boolean(String(consulta?.transactionId || '').trim());
}

const POLL_MAX_INTENTOS = 80;
const POLL_INTERVALO_MS = 4000;

/** transactionId/reference de la URL de retorno Wompi o de la caché de sesión. */
function resolveWompiQueryContext(): { transactionId?: string; reference?: string } {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const transactionId =
    String(
      params.get('id') || params.get('transactionId') || params.get('transaction_id') || '',
    ).trim();
  const reference = String(params.get('reference') || '').trim();
  const stored = readWompiRetornoContext();
  return {
    transactionId: transactionId || String(stored.transactionId || '').trim() || undefined,
    reference: reference || String(stored.reference || '').trim() || undefined,
  };
}

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
    carritoEstado?: string | null;
    carritoId?: string | null;
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
    carritoId: String(consulta?.carritoId || '').trim() || undefined,
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

  const wompiCtx = readWompiRetornoContext();
  const maxIntentos = 8;
  for (let i = 0; i < maxIntentos; i += 1) {
    await sleep(2000);
    try {
      const txHint = transactionId || wompiCtx.transactionId || undefined;
      const refHint = referenciaPago || wompiCtx.reference || undefined;
      const consulta = await carritoService.consultarEstadoPagoWompi(
        (txHint || refHint) ? '0' : (carritoId || '0'),
        { transactionId: txHint, reference: refHint },
      );
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
  /** true solo tras ejecutarPagoWompi (Nequi/tarjeta API); evita bloquear el botón al llegar al paso de pago. */
  const [pagoEnviadoAWompi, setPagoEnviadoAWompi] = useState(false);
  const [pagoRechazado, setPagoRechazado] = useState(false);
  const [mensajePagoRechazado, setMensajePagoRechazado] = useState('');
  const [pollCount, setPollCount] = useState(0);

  const onPagoResultadoRef = useRef(onPagoResultado);
  onPagoResultadoRef.current = onPagoResultado;

  const metodoPagoRef = useRef(paymentInfo.paymentMethod);
  metodoPagoRef.current = paymentInfo.paymentMethod;

  const resultadoNotificadoRef = useRef<string | null>(null);
  const pagoContextoRef = useRef<{ reference: string; transactionId: string }>({
    reference: '',
    transactionId: '',
  });

  const marcarPagoRechazado = useCallback((mensaje?: string) => {
    clearCachesTrasPagoRechazado();
    marcarCheckoutDeclinadoActivo();
    pagoContextoRef.current = { reference: '', transactionId: '' };
    resultadoNotificadoRef.current = null;
    setPagoRechazado(true);
    setMensajePagoRechazado(
      mensaje?.trim()
        || 'Tu banco o Nequi no aprobó el pago. Revisa tu saldo o intenta con otro método.',
    );
    setMonitoreandoPago(false);
    setPagoEnviadoAWompi(false);
    setPollCount(0);
  }, []);

  const reintentarPago = useCallback(() => {
    clearWompiRetornoContext();
    pagoContextoRef.current = { reference: '', transactionId: '' };
    resultadoNotificadoRef.current = null;
    setPagoRechazado(false);
    setMensajePagoRechazado('');
    setMonitoreandoPago(false);
    setPagoEnviadoAWompi(false);
    setPollCount(0);
    setLoading(false);
  }, []);

  /** Tras cancelar pedido: limpia caché de checkout y reinicia el formulario de pago. */
  const resetTrasCancelarPedido = useCallback(() => {
    clearCheckoutSessionCompleta();
    reintentarPago();
    setPaymentInfo(buildInitialPaymentFromFacturacion(datosFacturacion));
  }, [datosFacturacion, reintentarPago]);

  const consultarYNotificar = useCallback(
    async (id: string): Promise<ResultadoPago | null> => {
      const urlCtx = resolveWompiQueryContext();
      const reference =
        pagoContextoRef.current.reference || urlCtx.reference || undefined;
      const transactionId =
        pagoContextoRef.current.transactionId || urlCtx.transactionId || undefined;
      const usarResolucionPorTransaccion = Boolean(transactionId || reference);

      const consulta = await carritoService.consultarEstadoPagoWompi(
        usarResolucionPorTransaccion ? '0' : (id || '0'),
        { transactionId, reference },
      );

      const resultado = mapConsultaAResultado(
        consulta,
        email,
        String(metodoPagoRef.current || ''),
      );

      if (resultado.estado === 'rechazada') {
        const mensajeBackend =
          typeof consulta?.mensajePago === 'string' ? consulta.mensajePago : undefined;
        marcarPagoRechazado(mensajeBackend);
      } else if (tieneTransaccionWompiEnCurso(consulta)) {
        pagoContextoRef.current = {
          reference: String(consulta.reference || reference || ''),
          transactionId: String(consulta.transactionId || transactionId || ''),
        };
        persistWompiRetornoContext(pagoContextoRef.current);
      }

      if (resultado.estado !== 'pendiente') {
        const clave = `${resultado.estado}:${resultado.transactionId || resultado.referenciaPago || id}`;
        if (resultadoNotificadoRef.current !== clave) {
          try {
            await onPagoResultadoRef.current?.(resultado);
            resultadoNotificadoRef.current = clave;
          } catch {
            resultadoNotificadoRef.current = null;
            throw new Error('No se pudo completar la confirmación del pedido.');
          }
        }
      }
      return resultado;
    },
    [email, marcarPagoRechazado],
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
      } else if (resultado.estado === 'rechazada') {
        marcarPagoRechazado();
      } else if (!tieneTransaccionWompiEnCurso(resultado)) {
        const metodo = metodoPagoRef.current;
        toast.info(
          metodo === 'pse'
            ? 'Pulsa «Pagar pedido» para ir a la pasarela PSE.'
            : 'Pulsa «Pagar pedido» para enviar la solicitud de pago.',
        );
      } else {
        const metodo = metodoPagoRef.current;
        toast.info(
          metodo === 'card'
            ? 'El pago sigue pendiente. Vuelve a verificar en unos segundos.'
            : metodo === 'pse'
              ? 'El pago sigue pendiente. Completa la aprobación en tu banco y vuelve a verificar.'
              : 'El pago sigue pendiente. Aprueba en Nequi y vuelve a verificar.',
        );
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo consultar el pago');
    } finally {
      setLoading(false);
    }
  }, [carritoId, consultarYNotificar, marcarPagoRechazado]);

  const metodoSoportaPollingEnPagina =
    paymentInfo.paymentMethod === 'nequi' || paymentInfo.paymentMethod === 'card';

  // Polling prolongado (Nequi / tarjeta API). PSE se valida solo al volver de Wompi.
  useEffect(() => {
    const debeMonitorear =
      Boolean(carritoId) &&
      metodoSoportaPollingEnPagina &&
      !pagoRechazado &&
      pagoEnviadoAWompi &&
      monitoreandoPago;

    if (!debeMonitorear) return undefined;

    if (pollCount >= POLL_MAX_INTENTOS) {
      setMonitoreandoPago(false);
      toast.info(
        paymentInfo.paymentMethod === 'card'
          ? 'La verificación tardó demasiado. Usa «Verificar pago con tarjeta» o revisa tu correo.'
          : 'La verificación tardó demasiado. Usa «Ya aprobé en Nequi» o revisa tu correo.',
      );
      return undefined;
    }

    const timer = setTimeout(async () => {
      if (!carritoId) return;
      try {
        const resultado = await consultarYNotificar(carritoId);
        if (resultado?.estado === 'aprobada') {
          setMonitoreandoPago(false);
        } else if (resultado?.estado === 'rechazada') {
          marcarPagoRechazado();
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
    pagoEnviadoAWompi,
    monitoreandoPago,
    pagoRechazado,
    metodoSoportaPollingEnPagina,
    pollCount,
    consultarYNotificar,
    marcarPagoRechazado,
  ]);

  // Al salir del paso de pago, detener monitoreo y polling.
  useEffect(() => {
    if (options?.monitoreoActivo === true) return undefined;
    setMonitoreandoPago(false);
    setPagoEnviadoAWompi(false);
    setPollCount(0);
    return undefined;
  }, [options?.monitoreoActivo]);

  /**
   * Reanudar solo si ya existía un pago Wompi enviado (refresh con transactionId en caché).
   * No consulta al elegir Nequi ni al llegar por primera vez al paso de pago.
   */
  useEffect(() => {
    if (!carritoId || options?.monitoreoActivo !== true) return undefined;

    const metodoActual = paymentInfo.paymentMethod;
    if (metodoActual === 'pse') {
      setMonitoreandoPago(false);
      setPagoEnviadoAWompi(false);
      setPollCount(0);
      return undefined;
    }
    if (metodoActual && metodoActual !== 'nequi' && metodoActual !== 'card') {
      return undefined;
    }

    const wompiCtx = readWompiRetornoContext();
    const carritoPagoPersistido = readCarritoIdPagoPersistido();
    const mismoCarrito =
      Boolean(carritoPagoPersistido)
      && String(carritoPagoPersistido) === String(carritoId).trim();
    const transactionIdPersistido = String(wompiCtx.transactionId || '').trim();

    if (!mismoCarrito || !transactionIdPersistido) {
      setMonitoreandoPago(false);
      setPagoEnviadoAWompi(false);
      setPollCount(0);
      return undefined;
    }

    pagoContextoRef.current = {
      reference: String(wompiCtx.reference || ''),
      transactionId: transactionIdPersistido,
    };
    setPagoEnviadoAWompi(true);
    setMonitoreandoPago(true);
    setPollCount(0);

    let cancelled = false;
    (async () => {
      try {
        const resultado = await consultarYNotificar(carritoId);
        if (cancelled || !resultado) return;
        if (resultado.estado === 'rechazada') {
          marcarPagoRechazado();
        } else if (resultado.estado === 'aprobada') {
          setMonitoreandoPago(false);
        } else if (!tieneTransaccionWompiEnCurso(resultado)) {
          setMonitoreandoPago(false);
          setPagoEnviadoAWompi(false);
          clearWompiRetornoContext();
          pagoContextoRef.current = { reference: '', transactionId: '' };
        }
      } catch {
        /* sin cambios: el polling reintentará */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    carritoId,
    options?.monitoreoActivo,
    paymentInfo.paymentMethod,
    consultarYNotificar,
    marcarPagoRechazado,
  ]);

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

    setPagoRechazado(false);
    setMensajePagoRechazado('');
    setLoading(true);
    try {
      // El intento de pago nace al pulsar "Pagar pedido", antes de contactar Wompi.
      // checkout es idempotente: si el carrito ya estaba preparado, reutiliza su auditoría.
      await carritoService.checkout(carritoId, datosFacturacion);

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

        const tokenizeResponse = await axiosClient.post(
          'https://production.wompi.co/v1/tokens/cards',
          {
            number: paymentInfo.cardNumber?.replace(/\s/g, ''),
            cvc: paymentInfo.cvv,
            exp_month: expiry.expMonth,
            exp_year: expiry.expYear,
            card_holder: paymentInfo.cardName,
          },
          {
            headers: { Authorization: `Bearer ${wompiPublicKey}` },
            validateStatus: () => true,
          },
        );

        if (tokenizeResponse.status < 200 || tokenizeResponse.status >= 300) {
          const errData = tokenizeResponse.data ?? {};
          throw new Error(
            (errData as { error?: { reason?: string } })?.error?.reason ||
              'Error al procesar la tarjeta',
          );
        }

        const tokenData = tokenizeResponse.data;
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
        const referenciaPagoPse = String(data.reference || '');
        const transactionIdPse = String(data.transactionId || data.transaccion?.id || '');
        if (referenciaPagoPse || transactionIdPse) {
          pagoContextoRef.current = {
            reference: referenciaPagoPse,
            transactionId: transactionIdPse,
          };
          persistWompiRetornoContext(pagoContextoRef.current);
        }
        setMonitoreandoPago(false);
        setPagoEnviadoAWompi(false);
        toast.success('Redirigiendo a la pasarela de pago…');
        window.location.href = String(data.wompiCheckoutUrl);
        return;
      }

      const referenciaPago = String(data.reference || '');
      const transactionId = String(data.transactionId || data.transaccion?.id || '');
      if (referenciaPago || transactionId) {
        pagoContextoRef.current = { reference: referenciaPago, transactionId };
        persistWompiRetornoContext(pagoContextoRef.current);
      }
      if (paymentInfo.paymentMethod === 'nequi' || paymentInfo.paymentMethod === 'card') {
        setPagoEnviadoAWompi(true);
      }

      const resolved = await resolverEstadoFinalPago(carritoId, data);
      const estado = wompiStatusToEstadoPago(resolved.wompiStatus);

      if (resolved.referenciaPago || resolved.transactionId) {
        pagoContextoRef.current = {
          reference: resolved.referenciaPago || referenciaPago,
          transactionId: resolved.transactionId || transactionId,
        };
        persistWompiRetornoContext(pagoContextoRef.current);
      }

      await onPagoResultado?.({
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
        if (
          paymentInfo.paymentMethod === 'nequi'
          || paymentInfo.paymentMethod === 'card'
        ) {
          setMonitoreandoPago(true);
          setPollCount(0);
          toast.info(
            paymentInfo.paymentMethod === 'card'
              ? 'Procesando el pago con tarjeta. Te llevaremos a confirmación al detectarlo.'
              : 'Aprueba el pago en Nequi. Te llevaremos a confirmación al detectarlo.',
          );
        }
        return;
      }
      if (estado === 'rechazada') {
        marcarPagoRechazado();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al procesar el pago';
      const clean = message.replace(/^\[\d+\]\s*/, '');
      if (isReferenciaWompiDuplicadaError(clean)) {
        clearCheckoutCachesParaReintentoPago();
        toast.error(
          'La referencia de pago ya fue usada en Wompi. Cierra la pestaña de Wompi, vuelve al carrito y confirma el pedido de nuevo para generar una referencia nueva.',
          { autoClose: 12000 },
        );
      } else if (/\[404\]/i.test(message) && /carrito no encontrado/i.test(clean)) {
        clearCheckoutCachesParaReintentoPago();
        toast.error(
          'No se encontró el carrito del pago. Vuelve al paso anterior y pulsa «Continuar al pago» de nuevo.',
          { autoClose: 10000 },
        );
      } else {
        toast.error(clean);
      }
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
    pagoEnviadoAWompi,
    pagoRechazado,
    mensajePagoRechazado,
    formDataForMembershipUi,
    handleFormChange,
    handlePayment,
    verificarEstadoPagoAhora,
    reintentarPago,
    resetTrasCancelarPedido,
    mostrarPagoRechazado: marcarPagoRechazado,
  };
}

