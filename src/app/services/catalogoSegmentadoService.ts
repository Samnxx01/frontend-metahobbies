import { apiFetch } from './api';

const BASE = '/api/seguridad/politicas-runtime/catalogo';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type CatalogoMotorEventoSgItem = {
  _id?: string;
  codigo: string;
  label: string;
  descripcion: string;
  pipeline?: string;
  semantica?: 'PERMITE' | 'BLOQUEA' | 'BYPASS' | 'NEUTRO' | 'REQUIERE_TECHO' | string;
  activo: boolean;
  protegido: boolean;
  orden?: number;
};

export type GuardarMotorEventoSgPayload = {
  codigo: string;
  label?: string;
  descripcion?: string;
  pipeline?: string;
  semantica?: string;
  activo?: boolean;
  orden?: number;
};

// ─── Motor Eventos (colección propia: catalogomotoreventos) ───────────────────

export async function fetchCatalogoMotorEventosSg(
  filtro: { activo?: boolean; pipeline?: string } = {},
): Promise<CatalogoMotorEventoSgItem[]> {
  const q = new URLSearchParams();
  if (filtro.activo !== undefined) q.set('activo', String(filtro.activo));
  if (filtro.pipeline) q.set('pipeline', filtro.pipeline);
  const qs = q.toString();
  const res = await apiFetch(`${BASE}/motor-eventos${qs ? `?${qs}` : ''}`, { method: 'GET' });
  return (res as { items?: CatalogoMotorEventoSgItem[] })?.items ?? [];
}

export async function guardarCatalogoMotorEventoSg(
  payload: GuardarMotorEventoSgPayload,
): Promise<CatalogoMotorEventoSgItem> {
  const res = await apiFetch(`${BASE}/motor-eventos`, { method: 'POST', body: payload });
  const item = (res as { item?: CatalogoMotorEventoSgItem })?.item;
  if (!item) throw new Error('No se pudo guardar el motor evento');
  return item;
}

export async function actualizarCatalogoMotorEventoSg(
  codigo: string,
  payload: Omit<GuardarMotorEventoSgPayload, 'codigo'>,
): Promise<CatalogoMotorEventoSgItem> {
  const res = await apiFetch(`${BASE}/motor-eventos/${encodeURIComponent(codigo)}`, {
    method: 'PUT',
    body: payload,
  });
  const item = (res as { item?: CatalogoMotorEventoSgItem })?.item;
  if (!item) throw new Error('No se pudo actualizar el motor evento');
  return item;
}

export async function eliminarCatalogoMotorEventoSg(codigo: string): Promise<void> {
  await apiFetch(`${BASE}/motor-eventos/${encodeURIComponent(codigo)}`, { method: 'DELETE' });
}
