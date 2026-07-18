import {
  encodePublicIdForPath,
  normalizePublicIdForApi,
  resolveEntityPublicId,
  type EntityRef,
} from '@/app/utils/entityPublicId';

export const MEMBRESIA_PRECIO_LIST_URL = '/api/membresia/seguridad/crear/parametrizacion/membresia';
export const MEMBRESIA_PRECIO_CREATE_URL = '/api/membresia/seguridad/crear/parametrizacion/membresia/moneda';
export const MEMBRESIA_OPCIONES_PAGO_URL = '/api/membresia/seguridad/parametrizacion/membresia/opciones-pago';
export const MONEDAS_LIST_URL = '/api/monedas/seguridad/listar/monedas';

export function membresiaPrecioUpdatePath(id: unknown): string {
  return `/api/membresia/seguridad/crear/parametrizacion/membresia/${encodePublicIdForPath(id)}`;
}

export function membresiaPrecioDesactivarPath(id: unknown): string {
  return `/api/membresia/seguridad/desactivar/parametrizacion/membresia/${encodePublicIdForPath(id)}`;
}

export function membresiaPrecioEliminarPath(id: unknown): string {
  return `/api/membresia/seguridad/eliminar/parametrizacion/membresia/${encodePublicIdForPath(id)}`;
}

export function monedaActualizarPath(id: unknown): string {
  return `/api/monedas/seguridad/actualizar/${encodePublicIdForPath(id)}`;
}

export function monedaEliminarPath(id: unknown): string {
  return `/api/monedas/seguridad/delete/${encodePublicIdForPath(id)}`;
}

export type MonedaApiRow = EntityRef & {
  monedas?: string;
  estadoMoneda?: boolean;
  activosInventory?: boolean;
  activoWompi?: boolean;
  usuarioId?: { nombre_cliente?: string; correo?: string } | null;
};

export type MonedaRow = {
  id: string;
  monedas: string;
  estadoMoneda: boolean;
  activosInventory?: boolean;
  activoWompi?: boolean;
  usuarioId?: MonedaApiRow['usuarioId'];
};

export type MembresiaPrecioApiRow = EntityRef & {
  nombreMembresia?: string;
  descripcion?: string;
  precioMembresia?: number;
  tipoPagos?: string;
  metodoPagoCodigo?: string | null;
  estadoPrecio?: boolean;
  esPrecioDefault?: boolean;
  creacionDate?: string;
  monedasId?: (EntityRef & { monedas?: string; estadoMoneda?: boolean }) | string | null;
};

export type MembresiaPrecioRow = {
  id: string;
  nombreMembresia: string;
  descripcion: string;
  precioMembresia: number;
  tipoPagos: string;
  metodoPagoCodigo: string;
  estadoPrecio: boolean;
  esPrecioDefault: boolean;
  creacionDate: string;
  monedaId: string | null;
  monedaLabel: string;
};

export function normalizeMonedaFromApi(raw: MonedaApiRow): MonedaRow | null {
  const id = resolveEntityPublicId(raw);
  const monedas = String(raw?.monedas ?? '').trim();
  if (!id || !monedas) return null;
  return {
    id,
    monedas,
    estadoMoneda: raw.estadoMoneda === true,
    activosInventory: raw.activosInventory,
    activoWompi: raw.activoWompi,
    usuarioId: raw.usuarioId,
  };
}

export function normalizeMembresiaPrecioFromApi(raw: MembresiaPrecioApiRow): MembresiaPrecioRow | null {
  const id = resolveEntityPublicId(raw);
  if (!id) return null;

  const monedaRef = typeof raw.monedasId === 'object' && raw.monedasId ? raw.monedasId : null;
  const monedaId = monedaRef
    ? resolveEntityPublicId(monedaRef)
    : normalizePublicIdForApi(raw.monedasId);

  return {
    id,
    nombreMembresia: String(raw.nombreMembresia ?? '').trim(),
    descripcion: String(raw.descripcion ?? '').trim(),
    precioMembresia: Number(raw.precioMembresia ?? 0),
    tipoPagos: String(raw.tipoPagos ?? '').trim(),
    metodoPagoCodigo: String(raw.metodoPagoCodigo ?? '').trim(),
    estadoPrecio: raw.estadoPrecio !== false,
    esPrecioDefault: raw.esPrecioDefault === true,
    creacionDate: String(raw.creacionDate ?? ''),
    monedaId: monedaId || null,
    monedaLabel: monedaRef?.monedas ? String(monedaRef.monedas).trim() : '',
  };
}

/** ID público (iud) u ObjectId para body/path de APIs de membresía y monedas. */
export function resolveMonedaIdForApiBody(monedasId: string): string | undefined {
  const id = normalizePublicIdForApi(monedasId);
  return id || undefined;
}

export function findEntityByPublicId<T extends { id: string }>(rows: T[], id: string): T | undefined {
  const needle = normalizePublicIdForApi(id);
  if (!needle) return undefined;
  return rows.find((row) => row.id === needle);
}
