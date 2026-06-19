import { resolveEntityPublicId, type EntityRef } from '@/app/utils/entityPublicId';

export type MembresiaPlanApi = EntityRef & {
  nombreMembresia?: string;
  precioMembresia?: number | string | null;
  tipoPagos?: string;
  esPrecioDefault?: boolean | string | number;
  monedasId?: { monedas?: string; iud?: string; _id?: string; id?: string } | string | null;
};

export type MembresiaPlanUi = {
  id: string;
  nombreMembresia: string;
  precioMembresia: number;
  tipoPagos: string;
  esPrecioDefault: boolean;
  moneda: string;
};

export function normalizeMembershipPriceFromApi(value: number | string | null | undefined): number | null {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return null;
  return numericValue / 100;
}

export function isTruthyDefault(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

export function normalizeMembresiaPlanFromApi(raw: MembresiaPlanApi): MembresiaPlanUi | null {
  const id = resolveEntityPublicId(raw);
  const precio = normalizeMembershipPriceFromApi(raw.precioMembresia);
  if (!id || precio == null) return null;

  const monedaRaw = raw.monedasId;
  const moneda = typeof monedaRaw === 'object' && monedaRaw?.monedas
    ? String(monedaRaw.monedas).trim()
    : 'COP';

  return {
    id,
    nombreMembresia: String(raw.nombreMembresia || 'Membresía Premium').trim(),
    precioMembresia: precio,
    tipoPagos: String(raw.tipoPagos || 'Único').trim(),
    esPrecioDefault: isTruthyDefault(raw.esPrecioDefault),
    moneda,
  };
}

/** Planes visibles en checkout: default primero; si no hay default, todos los activos. */
export function pickPlanesCheckout(planes: MembresiaPlanUi[]): MembresiaPlanUi[] {
  const defaults = planes.filter((plan) => plan.esPrecioDefault);
  return defaults.length ? defaults : planes;
}

export function resolveMembershipGuestSessionId(): string {
  if (typeof window === 'undefined') return '';
  return (
    sessionStorage.getItem('mabs_guest_session_id')?.trim()
    || ''
  );
}
