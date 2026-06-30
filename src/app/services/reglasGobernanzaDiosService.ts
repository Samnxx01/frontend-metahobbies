import { apiFetch } from './api';

export interface SaAlcanceDiosItem {
  id: string;
  codigoJerarquia: string | null;
  codigoPadre: string | null;
  puedeManipularDios: boolean;
}

export interface SaAlcanceDiosResponse {
  total: number;
  tenants: SaAlcanceDiosItem[];
}

export interface RecursoVista {
  _id?: string;
  iud?: string;
  name?: string;
  path?: string;
  component?: string;
}

export interface AccionUsu {
  _id?: string;
  iud?: string;
  method?: string;
}

export interface ContextoDefi {
  _id?: string;
  iud?: string;
  contexto?: string;
}

export interface ReglaDios {
  _id: string;
  iud?: string;
  recurso?: RecursoVista[];
  accionesUsu?: AccionUsu[];
  contextoDefi?: ContextoDefi[];
  dominioTenatGlobales?: string;
  generacionTenatGlobales?: unknown[];
  securityPlatform?: boolean;
  estado?: boolean;
  createdAt?: string;
  [key: string]: unknown;
}

export interface ListarReglasDiosResponse {
  tenantSuperAdmin: string;
  total: number;
  reglas: ReglaDios[];
}

export interface EliminarReglaDiosResponse {
  id: string;
  tenantSuperAdmin: string;
  eliminada: boolean;
}

export async function listarSaAlcanceDios(): Promise<SaAlcanceDiosResponse> {
  const res = await apiFetch('/api/config/tenant/tipo/dios/sa/scope/jerarquia', { method: 'GET' });
  return res?.data ?? res;
}

export async function listarReglasDiosPorTenant(tenantSaId: string): Promise<ListarReglasDiosResponse> {
  const res = await apiFetch(
    `/api/config/tenant/tipo/listar/dios/reglas/jerarquia/roles/${encodeURIComponent(tenantSaId)}`,
    { method: 'GET' }
  );
  return res?.data ?? res;
}

export interface DesactivarReglaDiosResponse {
  id: string;
  tenantSuperAdmin: string;
  desactivada: boolean;
}

export async function listarReglasDesactivadasDiosPorTenant(
  tenantSaId: string
): Promise<ListarReglasDiosResponse> {
  const res = await apiFetch(
    `/api/config/tenant/tipo/listar/desactivadas/dios/reglas/jerarquia/roles/${encodeURIComponent(tenantSaId)}`,
    { method: 'GET' }
  );
  return res?.data ?? res;
}

export interface ActivarReglaDiosResponse {
  id: string;
  tenantSuperAdmin: string;
  activada: boolean;
}

export async function activarReglaDiosPorId(
  tenantSaId: string,
  reglaId: string
): Promise<ActivarReglaDiosResponse> {
  const res = await apiFetch(
    `/api/config/tenant/tipo/activar/dios/reglas/jerarquia/roles/${encodeURIComponent(tenantSaId)}/${encodeURIComponent(reglaId)}`,
    { method: 'PATCH' }
  );
  return res?.data ?? res;
}

export async function desactivarReglaDiosPorId(
  tenantSaId: string,
  reglaId: string
): Promise<DesactivarReglaDiosResponse> {
  const res = await apiFetch(
    `/api/config/tenant/tipo/desactivar/dios/reglas/jerarquia/roles/${encodeURIComponent(tenantSaId)}/${encodeURIComponent(reglaId)}`,
    { method: 'PATCH' }
  );
  return res?.data ?? res;
}

export async function eliminarReglaDiosPorId(
  tenantSaId: string,
  reglaId: string
): Promise<EliminarReglaDiosResponse> {
  const res = await apiFetch(
    `/api/config/tenant/tipo/eliminar/dios/reglas/jerarquia/roles/${encodeURIComponent(tenantSaId)}/${encodeURIComponent(reglaId)}`,
    { method: 'DELETE' }
  );
  return res?.data ?? res;
}
