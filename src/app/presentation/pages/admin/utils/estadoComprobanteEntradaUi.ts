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
      return 'border-warning/60 bg-warning/15 text-foreground dark:border-warning/50 dark:bg-warning/20 dark:text-foreground';
    case 'APROBADA':
      return 'border-success/50 bg-success/10 text-success dark:border-success/40 dark:bg-success/15 dark:text-success';
    case 'ANULADA':
    case 'RECHAZADA':
      return 'border-destructive/50 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/15 dark:text-destructive';
    default:
      return 'border-border bg-background text-foreground';
  }
};

export const labelEstadoKardexLinea = (estadoKardex?: string): string =>
  String(estadoKardex || '').toUpperCase() === 'CONFIRMADO' ? 'Confirmado' : 'Pendiente';

/** Badge kardex por línea (tabla detalle comprobante). */
export const estadoKardexLineaBadgeClass = (estadoKardex?: string): string => {
  if (String(estadoKardex || '').toUpperCase() === 'CONFIRMADO') {
    return 'border-success/50 bg-success/10 text-success dark:border-success/40 dark:bg-success/15 dark:text-success';
  }
  return 'border-warning/60 bg-warning/15 text-foreground dark:border-warning/50 dark:bg-warning/20 dark:text-foreground';
};

export const salidaKardexComprobanteBadgeClass = (disponible: boolean): string =>
  disponible
    ? 'border-success/50 bg-success/10 text-success dark:border-success/40 dark:bg-success/15 dark:text-success'
    : 'border-warning/60 bg-warning/15 text-foreground dark:border-warning/50 dark:bg-warning/20 dark:text-foreground';
