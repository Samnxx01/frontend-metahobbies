const normalizarEstado = (estado: string): string => String(estado || '').trim().toUpperCase();

export const labelEstadoComprobanteEntrada = (estado: string): string => {
  switch (normalizarEstado(estado)) {
    case 'PENDIENTE_APROBACION':
      return 'Pendiente aprobación';
    case 'APROBADA':
      return 'Aprobada';
    case 'ANULADA':
      return 'Anulada';
    case 'RECHAZADA':
      return 'Rechazada';
    default:
      return String(estado || '—').replace(/_/g, ' ');
  }
};

/** Clases legibles sobre fondos claros (p. ej. bg-muted/40 del modal). */
export const estadoComprobanteEntradaBadgeClass = (estado: string): string => {
  switch (normalizarEstado(estado)) {
    case 'PENDIENTE_APROBACION':
      return 'border-amber-500/60 bg-amber-50 text-amber-950 dark:border-amber-400/50 dark:bg-amber-500/15 dark:text-amber-100';
    case 'APROBADA':
      return 'border-emerald-500/50 bg-emerald-50 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-100';
    case 'ANULADA':
    case 'RECHAZADA':
      return 'border-red-500/50 bg-red-50 text-red-900 dark:border-red-400/40 dark:bg-red-500/15 dark:text-red-100';
    default:
      return 'border-border bg-background text-foreground';
  }
};

export const labelEstadoKardexLinea = (estadoKardex?: string): string =>
  String(estadoKardex || '').toUpperCase() === 'CONFIRMADO' ? 'Confirmado' : 'Pendiente';

/** Badge kardex por línea (tabla detalle comprobante). */
export const estadoKardexLineaBadgeClass = (estadoKardex?: string): string => {
  if (String(estadoKardex || '').toUpperCase() === 'CONFIRMADO') {
    return 'border-emerald-500/50 bg-emerald-50 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-100';
  }
  return 'border-amber-500/60 bg-amber-50 text-amber-950 dark:border-amber-400/50 dark:bg-amber-500/15 dark:text-amber-100';
};

export const salidaKardexComprobanteBadgeClass = (disponible: boolean): string =>
  disponible
    ? 'border-emerald-500/50 bg-emerald-50 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-100'
    : 'border-amber-500/60 bg-amber-50 text-amber-950 dark:border-amber-400/50 dark:bg-amber-500/15 dark:text-amber-100';
