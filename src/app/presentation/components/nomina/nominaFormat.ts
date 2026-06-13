export const formatCOP = (valor: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(valor) || 0);

export const TIPO_HORA_EXTRA_LABELS: Record<string, string> = {
  HORA_EXTRA_DIURNA: 'Hora extra diurna',
  HORA_EXTRA_NOCTURNA: 'Hora extra nocturna',
  HORA_EXTRA_DOM_FEST_DIURNA: 'Hora extra dominical/festiva diurna',
  HORA_EXTRA_DOM_FEST_NOCTURNA: 'Hora extra dominical/festiva nocturna',
};

export const TIPO_RECARGO_LABELS: Record<string, string> = {
  RECARGO_NOCTURNO_ORDINARIO: 'Recargo nocturno ordinario',
  RECARGO_DOM_FEST_DIURNO: 'Recargo dominical/festivo diurno',
  RECARGO_DOM_FEST_NOCTURNO: 'Recargo dominical/festivo nocturno',
};

export const TIPO_DESCUENTO_LABELS: Record<string, string> = {
  SALUD: 'Salud',
  PENSION: 'Pensión',
  FONDO_SOLIDARIDAD_PENSIONAL: 'Fondo de solidaridad pensional',
};
