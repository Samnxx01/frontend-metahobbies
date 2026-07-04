import { apiFetch } from './api';

export type PoliticaBypassPipeline = string;

export type PoliticaBypassMotorEventoItem = {
  nombre: string;
  etiqueta: string;
  pipeline: PoliticaBypassPipeline;
  pipelineLabel?: string;
  alcance?: string;
  label?: string;
  dominio?: string;
  descripcion?: string;
  activo?: boolean;
  orden?: number;
};

export type PoliticaBypassPipelineItem = {
  id?: string;
  nombre: string;
  label: string;
  referencia?: string;
  descripcion?: string;
  orden?: number;
  activo?: boolean;
};

export type GuardarPoliticaBypassMotorEventoPayload = {
  nombre: string;
  etiqueta: string;
  pipeline: PoliticaBypassPipeline;
};

export type GuardarPoliticaBypassPipelinePayload = {
  nombre: string;
  label: string;
  referencia?: string;
  descripcion?: string;
  orden?: number;
};

export type PoliticaBypassAlcanceItem = {
  alcance: string;
  dominio: string;
  label: string;
  descripcion: string;
  rolesActivos: string[];
  rolesSemilla: string[];
  reglasDinamicas: string[];
  orden: number;
  activo: boolean;
  editableRoles: boolean;
  updatedAt?: string | null;
  origenRoles?: 'GLOBAL' | 'ASIGNACION_TENANT' | 'ASIGNACION_USUARIO';
  asignacionId?: string;
};

export type PoliticaBypassDominioGroup = {
  dominio: string;
  label: string;
  descripcion: string;
  alcances: PoliticaBypassAlcanceItem[];
};

export type PoliticaBypassApisDominio = {
  id: string;
  etiquetas: string;
  dominio: string;
  proovedor?: string;
  bypassDominios: string[];
};

export type PoliticaBypassContexto = {
  tenantSuperAdminId: string | null;
  tenantGlobalId: string | null;
  usuarioId: string | null;
  apisDominiosId: string | null;
  bypassDominios: string[];
  apisDominios: PoliticaBypassApisDominio | null;
};

export type PoliticaBypassCatalogo = {
  version: string;
  fuentesLabels: Record<string, string>;
  alcances: PoliticaBypassAlcanceItem[];
  dominios: PoliticaBypassDominioGroup[];
  contexto?: PoliticaBypassContexto | null;
};

export type PoliticaBypassSesion = {
  versionGlobal: string;
  rol: string | null;
  tenantScope: {
    tenantSuperAdminId: string | null;
    tenantGlobalId: string | null;
    tenantCorporativoId: string | null;
  };
  jwtPolicyStale: boolean;
  bypassPolicy: {
    version?: string;
    sincronizado?: boolean;
    alcances?: Record<string, boolean>;
    meta?: {
      tenantSuperAdminId?: string | null;
      tenantGlobalId?: string | null;
      usuarioId?: string | null;
      apisDominiosId?: string | null;
      bypassDominios?: string[];
      saJerarquiaConCorporativo?: boolean;
    };
    fuentes?: Record<string, string>;
  };
  fuentesLabels: Record<string, string>;
};

export type PoliticaBypassFiltrosOpciones = {
  tenantSuperAdmins: Array<{ id: string; label: string }>;
  tenantGlobales: Array<{ id: string; label: string; tenantSuperAdminId?: string | null }>;
  usuarios: Array<{ id: string; label: string; correo?: string; rol?: string }>;
  apisDominios: PoliticaBypassApisDominio[];
  contexto: PoliticaBypassContexto;
};

export type PoliticaBypassFiltrosQuery = {
  tenantSuperAdminId?: string;
  tenantGlobalId?: string;
  usuarioId?: string;
  apisDominiosId?: string;
};

const BASE = '/api/seguridad/politica-bypass';

function buildQuery(params: PoliticaBypassFiltrosQuery = {}): string {
  const q = new URLSearchParams();
  if (params.tenantSuperAdminId) q.set('tenantSuperAdminId', params.tenantSuperAdminId);
  if (params.tenantGlobalId) q.set('tenantGlobalId', params.tenantGlobalId);
  if (params.usuarioId) q.set('usuarioId', params.usuarioId);
  if (params.apisDominiosId) q.set('apisDominiosId', params.apisDominiosId);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function fetchPoliticaBypassFiltrosOpciones(
  filtros: PoliticaBypassFiltrosQuery = {}
): Promise<PoliticaBypassFiltrosOpciones> {
  const res = await apiFetch(`${BASE}/filtros-opciones${buildQuery(filtros)}`, { method: 'GET' });
  const filtrosRes = (res as { filtros?: PoliticaBypassFiltrosOpciones })?.filtros;
  if (!filtrosRes) throw new Error('Opciones de filtro no disponibles');
  return filtrosRes;
}

export async function fetchPoliticaBypassCatalogo(
  filtros: PoliticaBypassFiltrosQuery = {}
): Promise<PoliticaBypassCatalogo> {
  const res = await apiFetch(`${BASE}/catalogo${buildQuery(filtros)}`, { method: 'GET' });
  const catalogo = (res as { catalogo?: PoliticaBypassCatalogo })?.catalogo;
  if (!catalogo) throw new Error('Catálogo de bypass no disponible');
  return catalogo;
}

export async function fetchPoliticaBypassSesion(): Promise<PoliticaBypassSesion> {
  const res = await apiFetch(`${BASE}/mi-sesion`, { method: 'GET' });
  const sesion = (res as { sesion?: PoliticaBypassSesion })?.sesion;
  if (!sesion) throw new Error('Política de sesión no disponible');
  return sesion;
}

export async function actualizarPoliticaBypassRoles(
  alcance: string,
  rolesActivos: string[],
  scope: PoliticaBypassFiltrosQuery = {}
): Promise<PoliticaBypassAlcanceItem> {
  const res = await apiFetch(`${BASE}/alcance/${encodeURIComponent(alcance)}/roles`, {
    method: 'PUT',
    body: {
      rolesActivos,
      tenantSuperAdminId: scope.tenantSuperAdminId || undefined,
      tenantGlobalId: scope.tenantGlobalId || undefined,
      usuarioId: scope.usuarioId || undefined,
      apisDominiosId: scope.apisDominiosId || undefined,
    },
  });
  const item = (res as { alcance?: PoliticaBypassAlcanceItem })?.alcance;
  if (!item) throw new Error('No se pudo actualizar roles del alcance');
  return item;
}

export async function guardarPoliticaBypassMotorEvento(
  payload: GuardarPoliticaBypassMotorEventoPayload,
): Promise<PoliticaBypassMotorEventoItem> {
  const res = await apiFetch(`${BASE}/motor-evento`, {
    method: 'POST',
    body: payload,
  });
  const item = (res as { item?: PoliticaBypassMotorEventoItem })?.item;
  if (!item) throw new Error('No se pudo guardar el motor evento');
  return item;
}

export async function guardarPoliticaBypassPipeline(
  payload: GuardarPoliticaBypassPipelinePayload,
): Promise<PoliticaBypassPipelineItem> {
  const res = await apiFetch('/api/seguridad/catalogo-pipeline', {
    method: 'POST',
    body: payload,
  });
  const item = (res as { item?: PoliticaBypassPipelineItem })?.item;
  if (!item) throw new Error('No se pudo guardar el pipeline');
  return item;
}

export async function fetchCatalogoPipeline(): Promise<PoliticaBypassPipelineItem[]> {
  const res = await apiFetch('/api/seguridad/catalogo-pipeline', { method: 'GET' });
  const items = (res as { items?: PoliticaBypassPipelineItem[] })?.items;
  return Array.isArray(items) ? items : [];
}

export async function actualizarPoliticaBypassPipeline(
  nombre: string,
  payload: GuardarPoliticaBypassPipelinePayload,
): Promise<PoliticaBypassPipelineItem> {
  const res = await apiFetch(`/api/seguridad/catalogo-pipeline/${encodeURIComponent(nombre)}`, {
    method: 'PUT',
    body: payload,
  });
  const item = (res as { item?: PoliticaBypassPipelineItem })?.item;
  if (!item) throw new Error('No se pudo actualizar el pipeline');
  return item;
}

export async function eliminarPoliticaBypassPipeline(nombre: string): Promise<void> {
  await apiFetch(`/api/seguridad/catalogo-pipeline/${encodeURIComponent(nombre)}`, { method: 'DELETE' });
}

export async function eliminarPoliticaBypassMotorEvento(nombre: string): Promise<void> {
  await apiFetch(`${BASE}/motor-evento/${encodeURIComponent(nombre)}`, { method: 'DELETE' });
}

// ── Bypass Membresía (política dinámica vía DB) ───────────────────────────────

const BYPASS_MEMBRESIA_BASE = '/api/seguridad/politicas-runtime';

export interface BypassAtribucionTipo {
    valor: string;
    etiqueta: string;
}

export interface BypassMembresiaConfig {
    bypass: boolean;
    originType: string;
    originId: string | null;
    activo: boolean;
    referidorEmail: string | null;
    tiposAtribucion: BypassAtribucionTipo[];
}

export interface BypassMembresiaPayload {
    activo: boolean;
    originType?: string;
    originId?: string | null;
    referidorEmail?: string | null;
    tiposAtribucion?: BypassAtribucionTipo[];
}

/** Sin auth — endpoint público para AffiliateBanner */
export async function getBypassMembresiaPublico(): Promise<BypassMembresiaConfig> {
    const { apiFetchPublic } = await import('@/app/services/api');
    const data = await apiFetchPublic(`${BYPASS_MEMBRESIA_BASE}/publica/bypass/membresia`, { method: 'GET' });
    return {
        bypass: Boolean(data?.bypass),
        originType: String(data?.originType ?? 'organico'),
        originId: data?.originId ?? null,
        activo: Boolean(data?.activo),
        referidorEmail: data?.referidorEmail ?? null,
        tiposAtribucion: Array.isArray(data?.tiposAtribucion) ? data.tiposAtribucion : [],
    };
}

/** Admin — lee la configuración actual */
export async function getBypassMembresiaAdmin(): Promise<BypassMembresiaConfig | null> {
    const data = await apiFetch(`${BYPASS_MEMBRESIA_BASE}/bypass/membresia`, { method: 'GET' });
    const p = data?.politica;
    if (!p) return null;
    const meta = p.condiciones?.metadata ?? {};
    return {
        bypass: Boolean(p.activo),
        originType: meta.originType ?? 'organico',
        originId: meta.originId ?? null,
        activo: Boolean(p.activo),
        referidorEmail: meta.referidorEmail ?? null,
        tiposAtribucion: Array.isArray(meta.tiposAtribucion) ? meta.tiposAtribucion : [],
    };
}

/** Admin — crea o actualiza la política */
export async function upsertBypassMembresia(payload: BypassMembresiaPayload): Promise<void> {
    await apiFetch(`${BYPASS_MEMBRESIA_BASE}/bypass/membresia`, {
        method: 'POST',
        body: payload,
    });
}

/** Admin — toggle activo/inactivo */
export async function toggleBypassMembresia(activo: boolean): Promise<void> {
    await apiFetch(`${BYPASS_MEMBRESIA_BASE}/bypass/membresia/toggle`, {
        method: 'PUT',
        body: { activo },
    });
}

/** Admin — agrega un tipo de atribución (persiste inmediato en DB) */
export async function agregarTipoAtribucion(tipo: BypassAtribucionTipo): Promise<BypassAtribucionTipo[]> {
    const data = await apiFetch(`${BYPASS_MEMBRESIA_BASE}/bypass/membresia/tipos-atribucion`, {
        method: 'POST',
        body: tipo,
    });
    return Array.isArray(data?.tiposAtribucion) ? data.tiposAtribucion : [];
}

/** Admin — elimina un tipo de atribución por valor (persiste inmediato en DB) */
export async function eliminarTipoAtribucion(valor: string): Promise<BypassAtribucionTipo[]> {
    const data = await apiFetch(
        `${BYPASS_MEMBRESIA_BASE}/bypass/membresia/tipos-atribucion/${encodeURIComponent(valor)}`,
        { method: 'DELETE' }
    );
    return Array.isArray(data?.tiposAtribucion) ? data.tiposAtribucion : [];
}
