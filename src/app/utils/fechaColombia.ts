const ZONA_COLOMBIA = 'America/Bogota';

/** Fecha/hora legible en zona horaria de Colombia (evita corrimiento UTC en servidor). */
export function formatearFechaHoraColombia(value?: string | Date | null): string {
  if (value == null || value === '') return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-CO', {
    timeZone: ZONA_COLOMBIA,
    dateStyle: 'short',
    timeStyle: 'short',
  });
}
