import { toast } from 'react-toastify';

export type TransaccionResumen = {
  solicitada?: boolean;
  confirmada?: boolean;
  revertida?: boolean;
  operaciones?: number;
  mensaje?: string;
};

const mensajeErrorApi = (error: unknown): string =>
  String((error as Error)?.message || '').replace(/^\[\d+\]\s*/, '');

export const esErrorTransaccionApi = (error: unknown): boolean => {
  const tipo = String((error as { tipoError?: string })?.tipoError || '').toUpperCase();
  if (tipo === 'TRANSACCION') return true;
  const msg = mensajeErrorApi(error).toLowerCase();
  return (
    msg.includes('transacción') ||
    msg.includes('transaccion') ||
    msg.includes('no se guardaron') ||
    msg.includes('tx_abort') ||
    msg.includes('error de transacción') ||
    msg.includes('error de transaccion')
  );
};

export const toastTransaccionDesdePayload = (
  resumen: TransaccionResumen | null | undefined,
  fallbackExito?: string
): void => {
  if (!resumen) {
    if (fallbackExito) toast.success(fallbackExito);
    return;
  }
  if (resumen.revertida || resumen.confirmada === false) {
    toast.error(
      resumen.mensaje || 'Transacción revertida: los cambios no se guardaron en base de datos.'
    );
    return;
  }
  if (resumen.mensaje) {
    toast.success(resumen.mensaje);
    return;
  }
  if (fallbackExito) toast.success(fallbackExito);
};

export const toastErrorConTransaccion = (error: unknown, fallback?: string): boolean => {
  if (esErrorTransaccionApi(error)) {
    const detalle = mensajeErrorApi(error);
    toast.error(
      /transacc/i.test(detalle) ? detalle : `Transacción revertida: ${detalle}`
    );
    return true;
  }
  if (fallback) toast.error(fallback);
  return false;
};
