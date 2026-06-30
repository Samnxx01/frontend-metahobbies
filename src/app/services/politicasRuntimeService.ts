import { apiFetch } from './api';
import { encodePublicIdForPath } from '@/app/utils/entityPublicId';

export type PoliticaRuntime = {
  iud?: string;
  _id?: string;
  codigo: string;
  dominio: string;
  tipo: 'BYPASS' | 'ROL_CORPORATIVO' | 'ACCION' | 'MENU' | 'TECHO_GUARD' | string;
  efecto: 'ALLOW' | 'DENY' | 'BYPASS_RUNTIME' | 'REQUIRE_TECHO' | string;
  prioridad?: number;
  activo?: boolean;
  scope?: Record<string, unknown>;
  condiciones?: {
    roles?: string[];
    modosAutorizacion?: string[];
    referencia?: string[];
    bypassDominios?: string[];
    metadata?: Record<string, unknown>;
  };
};

export type ActualizarPoliticaRuntimePayload = Partial<PoliticaRuntime> & {
  scope?: {
    tipo?: string;
    tenantSuperAdmin?: string;
    tenantGlobal?: string;
    tenantCorporativo?: string;
    usuarioId?: string;
    rolCorporativo?: string;
    apisDominios?: string;
    apisDominiosIds?: string[];
  };
};

export type PoliticaRuntimeApisDominio = {
  id: string;
  etiquetas: string;
  dominio: string;
  proovedor?: string;
  bypassDominios: string[];
};

export type PoliticaRuntimeUsuarioOpcion = {
  id: string;
  correo: string;
  label: string;
  rol?: string;
  tenantSuperAdminId?: string | null;
  tenantGlobalId?: string | null;
  tenantCorporativoId?: string | null;
};

export type PoliticaRuntimeComportamiento =
  | 'PERMITE'
  | 'BLOQUEA'
  | 'BYPASS'
  | 'NEUTRO'
  | 'REQUIERE_TECHO';

export type PoliticaRuntimeComportamientoCatalogoItem = {
  id?: string;
  nombre: string;
  etiqueta: string;
  valor: string;
  label: string;
  motorSemantica?: string | null;
  activo: boolean;
  protegido: boolean;
};

export type PoliticaRuntimeCatalogoItem = {
  id?: string;
  valor: string;
  label: string;
  descripcion: string;
  comportamiento: PoliticaRuntimeComportamiento | null;
  motorSemantica: PoliticaRuntimeComportamiento | null;
  orden: number;
  activo: boolean;
  protegido: boolean;
};

export type PoliticaRuntimeCatalogoCategoria = 'TIPO' | 'EFECTO' | 'REFERENCIA' | 'COMPORTAMIENTO';

export type PoliticaRuntimeAccionOpcion = {
  id: string;
  etiquetas: string;
  method: string;
  label: string;
};

export type PoliticaRuntimeRutaOpcion = {
  id: string;
  name: string;
  path: string;
  component: string;
  accionIds: string[];
  label: string;
};

export type PoliticaRuntimeBypassAlcanceOpcion = {
  id?: string;
  nombre: string;
  etiqueta: string;
  pipeline: 'PIPELINE_A' | 'PIPELINE_B';
  pipelineLabel?: string;
  alcance: string;
  dominio: string;
  label: string;
  descripcion: string;
  reglasDinamicas?: string[];
  orden: number;
};

export type PoliticaRuntimeTenantScopeOpcion = {
  id: string;
  label: string;
  codigoJerarquia?: string | null;
  tenantSuperAdminId?: string | null;
  tenantGlobalId?: string | null;
  corporativoId?: string | null;
};

export type PoliticaRuntimeTenantsScopeOpciones = {
  tenantSuperAdmins: PoliticaRuntimeTenantScopeOpcion[];
  tenantGlobales: PoliticaRuntimeTenantScopeOpcion[];
  tenantCorporativos: PoliticaRuntimeTenantScopeOpcion[];
};

export type PoliticaRuntimeOpciones = {
  tipos: string[];
  efectos: string[];
  catalogoTipos: PoliticaRuntimeCatalogoItem[];
  catalogoEfectos: PoliticaRuntimeCatalogoItem[];
  catalogoReferencias: PoliticaRuntimeCatalogoItem[];
  catalogoComportamientos: PoliticaRuntimeComportamientoCatalogoItem[];
  /** Semánticas que el motor interpreta (PERMITE, BLOQUEA, BYPASS, …). */
  motorSemanticas?: string[];
  dominiosPolitica: string[];
  apisDominios: PoliticaRuntimeApisDominio[];
  acciones: PoliticaRuntimeAccionOpcion[];
  rutas: PoliticaRuntimeRutaOpcion[];
  usuarios: PoliticaRuntimeUsuarioOpcion[];
  bypassAlcances: PoliticaRuntimeBypassAlcanceOpcion[];
  tenantsScope?: PoliticaRuntimeTenantsScopeOpciones;
  contexto?: {
    tenantSuperAdminId?: string | null;
    tenantGlobalId?: string | null;
    tenantCorporativoId?: string | null;
    apisDominiosId?: string | null;
  };
};

export type GuardarCatalogoItemPayload = {
  categoria: PoliticaRuntimeCatalogoCategoria;
  valor?: string;
  nombre?: string;
  label?: string;
  etiqueta?: string;
  descripcion?: string;
  comportamiento?: string;
  motorSemantica?: string;
  orden?: number;
  activo?: boolean;
};

export type PoliticaRuntimeDecision = {
  decision?: 'DENY' | 'ALLOW' | 'SIN_POLITICA';
  permitido: boolean;
  efecto: string | null;
  politica: PoliticaRuntime | null;
  contexto: Record<string, unknown>;
  mensaje?: string;
};

export type SimularPoliticaRuntimePayload = {
  codigo?: string;
  dominio?: string;
  tipo?: string;
  referencia?: string;
  alcance?: string;
  tenantSuperAdminId?: string;
  tenantGlobalId?: string;
  tenantCorporativoId?: string;
  usuarioId?: string;
  rolCorporativoId?: string;
  apisDominiosId?: string;
};

const BASE = '/api/seguridad/politicas-runtime';

export async function fetchPoliticasRuntimeCatalogo(params: { dominio?: string; tipo?: string } = {}) {
  const q = new URLSearchParams();
  if (params.dominio) q.set('dominio', params.dominio);
  if (params.tipo) q.set('tipo', params.tipo);
  const suffix = q.toString() ? `?${q.toString()}` : '';
  const res = await apiFetch(`${BASE}/catalogo${suffix}`, { method: 'GET' });
  return ((res as { politicas?: PoliticaRuntime[] })?.politicas ?? []);
}

export async function fetchPoliticasRuntimeOpciones(): Promise<PoliticaRuntimeOpciones> {
  const res = await apiFetch(`${BASE}/opciones`, { method: 'GET' });
  const opciones = (res as { opciones?: PoliticaRuntimeOpciones })?.opciones;
  if (!opciones) throw new Error('Opciones de políticas runtime no disponibles');
  return opciones;
}

export async function simularPoliticaRuntime(
  payload: SimularPoliticaRuntimePayload
): Promise<PoliticaRuntimeDecision> {
  const res = await apiFetch(`${BASE}/simular`, {
    method: 'POST',
    body: payload,
  });
  const decision = (res as { decision?: PoliticaRuntimeDecision })?.decision;
  if (!decision) throw new Error('No se pudo simular la política runtime');
  return decision;
}

export async function actualizarPoliticaRuntime(
  codigo: string,
  payload: ActualizarPoliticaRuntimePayload
): Promise<PoliticaRuntime> {
  const res = await apiFetch(`${BASE}/politica/${encodeURIComponent(codigo)}`, {
    method: 'PUT',
    body: payload,
  });
  const politica = (res as { politica?: PoliticaRuntime })?.politica;
  if (!politica) throw new Error('No se pudo actualizar la política runtime');
  return politica;
}

export async function actualizarPoliticaRuntimePorId(
  id: string,
  payload: ActualizarPoliticaRuntimePayload
): Promise<PoliticaRuntime> {
  const res = await apiFetch(`${BASE}/politica-id/${encodePublicIdForPath(id)}`, {
    method: 'PUT',
    body: payload,
  });
  const politica = (res as { politica?: PoliticaRuntime })?.politica;
  if (!politica) throw new Error('No se pudo actualizar la política runtime');
  return politica;
}

export async function eliminarPoliticaRuntime(id: string): Promise<PoliticaRuntime> {
  const res = await apiFetch(`${BASE}/politica-id/${encodePublicIdForPath(id)}`, { method: 'DELETE' });
  const politica = (res as { politica?: PoliticaRuntime })?.politica;
  if (!politica) throw new Error('No se pudo eliminar la política runtime');
  return politica;
}

export async function fetchPoliticasRuntimeCatalogoItems(
  categoria?: PoliticaRuntimeCatalogoCategoria
): Promise<PoliticaRuntimeCatalogoItem[]> {
  const suffix = categoria ? `?categoria=${encodeURIComponent(categoria)}` : '';
  const res = await apiFetch(`${BASE}/catalogo-items${suffix}`, { method: 'GET' });
  return ((res as { items?: PoliticaRuntimeCatalogoItem[] })?.items ?? []);
}

export async function guardarPoliticaRuntimeCatalogoItem(
  payload: GuardarCatalogoItemPayload
): Promise<PoliticaRuntimeCatalogoItem> {
  const res = await apiFetch(`${BASE}/catalogo-item`, { method: 'POST', body: payload });
  const item = (res as { item?: PoliticaRuntimeCatalogoItem })?.item;
  if (!item) throw new Error('No se pudo guardar el ítem del catálogo');
  return item;
}

export async function eliminarPoliticaRuntimeCatalogoItem(
  categoria: PoliticaRuntimeCatalogoCategoria,
  valor: string
): Promise<void> {
  await apiFetch(
    `${BASE}/catalogo-item/${encodeURIComponent(categoria)}/${encodeURIComponent(valor)}`,
    { method: 'DELETE' }
  );
}
