import { apiFetch } from './api';

export type ActorScope = {
  rol: string;
  tenantSuperAdminId: string | null;
  tenantGlobalId: string | null;
  tenantCorporativoId: string | null;
};

export type TenantGlobalOption = {
  id: string;
  label: string;
  tenantSuperAdminId?: string;
};

export type TenantCorporativoOption = {
  id: string;
  label: string;
  tenantGlobalId: string;
};

export type RolCorporativoOption = {
  id: string;
  label: string;
  tenantCorporativoId: string;
};

export type EmpleadoGlobal = {
  _id: string;
  cargo?: string | null;
  tipoEmpleado?: string | null;
  estadoLaboral?: string | null;
  createdAt?: string;
  usuarioId?: {
    _id?: string;
    correo?: string;
    estado?: boolean;
    verificado?: boolean;
    tenantCorporativoId?: string;
    rolCorporativoId?: string;
    createdAt?: string;
  } | null;
  tenantCorporativoId?: {
    _id?: string;
    coporativo?: string;
  } | string | null;
  rolCorporativoId?: {
    _id?: string;
    rol?: string;
  } | string | null;
  jefeDirectoId?: {
    _id?: string;
    correo?: string;
  } | string | null;
};

export type CrearEmpleadoGlobalPayload = {
  correo: string;
  password: string;
  nombre: string;
  apellido: string;
  cc: string;
  telefono: string;
  direccion: string;
  rh: string;
  fecha_nacimiento: string;
  tenantGlobalId?: string;
  tenantCorporativoId: string;
  rolCorporativoId: string;
  cargo?: string;
  tipoEmpleado?: string;
  estadoLaboral?: string;
  jefeDirectoId?: string;
};

const toActorScope = (raw: any): ActorScope => ({
  rol: String(raw?.rol || ''),
  tenantSuperAdminId: raw?.tenantSuperAdminId ? String(raw.tenantSuperAdminId) : null,
  tenantGlobalId: raw?.tenantGlobalId ? String(raw.tenantGlobalId) : null,
  tenantCorporativoId: raw?.tenantCorporativoId ? String(raw.tenantCorporativoId) : null,
});

export async function getEmpleadoGlobalContext(): Promise<{
  actor: ActorScope;
  tenantGlobales: TenantGlobalOption[];
}> {
  const [selectsRes, tenantGlobalesRes] = await Promise.all([
    apiFetch('/api/config/global/creacion/usu/tenant/global/selects', { method: 'GET' }),
    apiFetch('/api/config/tenant/tipo/listar/globales/contexto/roles', { method: 'GET' }),
  ]);

  const actor = toActorScope(selectsRes?.data?.actor || {});
  const rows: any[] = Array.isArray(tenantGlobalesRes?.tenants)
    ? tenantGlobalesRes.tenants
    : Array.isArray(tenantGlobalesRes?.data)
      ? tenantGlobalesRes.data
      : Array.isArray(tenantGlobalesRes?.tenantGlobales)
        ? tenantGlobalesRes.tenantGlobales
        : [];

  const tenantGlobales = rows
    .map((item) => {
      const id = String(item?.id || item?._id || '').trim();
      if (!id) return null;
      return {
        id,
        label: String(item?.label || item?.rol || item?.nombre || id),
        tenantSuperAdminId: item?.tenantSuperAdminId ? String(item.tenantSuperAdminId) : undefined,
      };
    })
    .filter((item): item is TenantGlobalOption => item !== null);

  return { actor, tenantGlobales };
}

export async function getTenantCorporativos(): Promise<TenantCorporativoOption[]> {
  const response = await apiFetch('/api/config/permisos/creacion/admin/tenant/corporativos', {
    method: 'GET',
  });

  const rows: any[] = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response?.items)
      ? response.items
      : [];

  return rows
    .map((item) => {
      const id = String(item?.id || item?._id || '').trim();
      const tenantGlobalId = String(
        item?.tenantGlobal?._id || item?.tenantGlobal || item?.tenantGlobalId || ''
      ).trim();
      if (!id) return null;
      return {
        id,
        label: String(item?.label || item?.name || item?.nombre || item?.coporativo || id),
        tenantGlobalId,
      };
    })
    .filter((item): item is TenantCorporativoOption => item !== null);
}

export async function getRolesCorporativos(): Promise<RolCorporativoOption[]> {
  const response = await apiFetch('/api/config/permisos/corporativo/listar/roles/tenant/corporativo', {
    method: 'GET',
  });

  const rows: any[] = Array.isArray(response?.data) ? response.data : [];
  return rows
    .map((item) => {
      const id = String(item?._id || item?.id || '').trim();
      const tenantCorporativoId = String(item?.tenantCorporativo || '').trim();
      if (!id) return null;
      return {
        id,
        label: String(item?.rol || 'Rol corporativo'),
        tenantCorporativoId,
      };
    })
    .filter((item): item is RolCorporativoOption => item !== null);
}

export async function listEmpleadosGlobal(params: {
  tenantGlobalId?: string;
  tenantCorporativoId?: string;
}): Promise<EmpleadoGlobal[]> {
  const search = new URLSearchParams();
  if (params.tenantGlobalId) search.set('tenantGlobalId', params.tenantGlobalId);
  if (params.tenantCorporativoId) search.set('tenantCorporativoId', params.tenantCorporativoId);
  const query = search.toString();

  const response = await apiFetch(`/api/governance/empleados-global${query ? `?${query}` : ''}`, {
    method: 'GET',
  });

  return Array.isArray(response?.data) ? response.data : [];
}

export async function createEmpleadoGlobal(payload: CrearEmpleadoGlobalPayload): Promise<any> {
  return apiFetch('/api/governance/empleados-global', {
    method: 'POST',
    body: payload,
  });
}
