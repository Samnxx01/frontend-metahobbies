import type { ResultadoPago } from '@/app/presentation/pages/membresia/MembershipPayment';

export type EstadoPagoUi = ResultadoPago['estado'];

export function wompiStatusToEstadoPago(status: string | null | undefined): EstadoPagoUi {
  const s = String(status || '').trim().toUpperCase();
  if (s === 'APPROVED') return 'aprobada';
  if (s === 'PENDING' || s === 'CREATED') return 'pendiente';
  return 'rechazada';
}

/** Normaliza MM/YY o MM/YYYY para tokenización Wompi. */
export function normalizarExpiryTarjeta(expiryDate: string | undefined): {
  expMonth: string;
  expYear: string;
} | null {
  const parts = String(expiryDate || '').split('/').map((p) => p.trim());
  if (parts.length !== 2) return null;
  let [expMonth, expYear] = parts;
  if (!expMonth || !expYear) return null;
  expMonth = expMonth.padStart(2, '0');
  if (expYear.length === 4) expYear = expYear.slice(-2);
  if (expYear.length !== 2) return null;
  return { expMonth, expYear };
}

export function extraerEstadoWompiDeRespuestaCarrito(data: Record<string, unknown> | null | undefined): string {
  if (!data) return 'PENDING';
  const transaccion = data.transaccion as Record<string, unknown> | undefined;
  const anidado = data.data as Record<string, unknown> | undefined;
  const candidatos = [
    transaccion?.status,
    data.status,
    data.estado,
    anidado?.status,
    (anidado?.transaccion as Record<string, unknown> | undefined)?.status,
  ];
  for (const c of candidatos) {
    if (c != null && String(c).trim()) return String(c).trim();
  }
  return 'PENDING';
}

export function extraerReferenciaWompiDeRespuestaCarrito(
  data: Record<string, unknown> | null | undefined,
): string {
  if (!data) return '';
  const transaccion = data.transaccion as Record<string, unknown> | undefined;
  const candidatos = [
    data.ventaReferencia,
    data.reference,
    data.referencia,
    transaccion?.reference,
  ];
  for (const c of candidatos) {
    if (c != null && String(c).trim()) return String(c).trim();
  }
  return '';
}

export function extraerMontoCopDeRespuestaCarrito(
  data: Record<string, unknown> | null | undefined,
): number | undefined {
  if (!data) return undefined;
  const cents =
    Number(data.amount_in_cents) ||
    Number((data.transaccion as Record<string, unknown> | undefined)?.amount_in_cents) ||
    0;
  return cents > 0 ? cents / 100 : undefined;
}
