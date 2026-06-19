import { apiFetch } from '@/app/services/api';
import { AFILIADO_PERMISOS_PATHS } from './paths';
import type {
  ContextoClienteResponse,
  GuardarMarcoPayload,
  GuardarMarcoResponse,
  HerenciaClienteRelacion,
  MarcoActivoResponse,
  RolesMarcoResponse,
  RolMarcoParametrizable,
  SincronizarMarcoResponse,
} from '../types/marco.types';
import { mapRolCorporativoAMarco, normalizeRolMarcoParametrizable } from '../utils/marcoRolKeys';
import { normalizeMarcoPermisosAfiliado } from '../utils/normalizeMarcoEntities';
import { encodePublicIdForPath, normalizePublicIdForApi } from '@/app/utils/entityPublicId';

const CORPORATIVO_ROLES_PATH = `${AFILIADO_PERMISOS_PATHS.configBase}/permisos/corporativo/listar/roles/tenant/corporativo`;

async function listarRolesDesdeCorporativo(): Promise<RolMarcoParametrizable[]> {
  const res = await apiFetch<{ ok?: boolean; data?: Array<Record<string, unknown>> }>(
    CORPORATIVO_ROLES_PATH,
    { method: 'GET', useAuth: true }
  );
  return (res?.data ?? [])
    .map((r) => mapRolCorporativoAMarco(r))
    .filter((r) => r._id);
}

function normalizeRolesMarco(
  roles: RolMarcoParametrizable[] | undefined
): RolMarcoParametrizable[] {
  return (roles ?? [])
    .map((r) => normalizeRolMarcoParametrizable(r))
    .filter((r) => r._id);
}

export const getRolesMarcoParametrizables = async (): Promise<RolesMarcoResponse> => {
  try {
    const res = await apiFetch<RolesMarcoResponse>(AFILIADO_PERMISOS_PATHS.marcoRoles, {
      method: 'GET',
      useAuth: true,
    });
    const roles = normalizeRolesMarco(res?.roles);
    return { ...res, roles, total: roles.length };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('[404]')) throw err;

    try {
      const activo = await apiFetch<MarcoActivoResponse & { roles?: RolMarcoParametrizable[] }>(
        AFILIADO_PERMISOS_PATHS.marcoActivo(false, null, true),
        { method: 'GET', useAuth: true }
      );
      if (activo?.roles?.length) {
        const roles = normalizeRolesMarco(activo.roles);
        return {
          roles,
          total: roles.length,
          msg: 'Roles desde marco activo (incluirRoles)',
        };
      }
    } catch {
      /* siguiente fallback */
    }

    const roles = await listarRolesDesdeCorporativo();
    return {
      roles,
      total: roles.length,
      msg: roles.length
        ? 'Roles desde catálogo corporativo'
        : 'No hay roles corporativos activos',
    };
  }
};

export const getMarcoAfiliadoActivo = async (
  rolCorporativoId?: string | null,
  bootstrap = true
): Promise<MarcoActivoResponse> => {
  const res = await apiFetch<MarcoActivoResponse>(
    AFILIADO_PERMISOS_PATHS.marcoActivo(bootstrap, normalizePublicIdForApi(rolCorporativoId) || null),
    {
      method: 'GET',
      useAuth: true,
    }
  );
  return {
    ...res,
    marco: normalizeMarcoPermisosAfiliado(res?.marco ?? null),
    rolCorporativoId: res?.rolCorporativoId
      ? normalizePublicIdForApi(res.rolCorporativoId)
      : res?.rolCorporativoId,
  };
};

export interface CatalogoMarcoAfiliadoResponse {
  success?: boolean;
  total?: number;
  acciones?: Array<{
    _id: string;
    iud?: string;
    method: string;
    etiquetas: string;
    estadoAccion?: boolean;
  }>;
  msg?: string;
}

export const getCatalogoMarcoAfiliado = async (): Promise<CatalogoMarcoAfiliadoResponse> =>
  apiFetch(AFILIADO_PERMISOS_PATHS.marcoCatalogo, {
    method: 'GET',
    useAuth: true,
  });

export const guardarMarcoAfiliado = async (
  payload: GuardarMarcoPayload
): Promise<GuardarMarcoResponse> => {
  const body: GuardarMarcoPayload = {
    ...payload,
    vistas: (payload.vistas ?? []).map((id) => normalizePublicIdForApi(id)),
    acciones: (payload.acciones ?? []).map((id) => normalizePublicIdForApi(id)),
  };
  if (payload.rolCorporativoId) {
    body.rolCorporativoId = normalizePublicIdForApi(payload.rolCorporativoId);
  }
  return apiFetch(AFILIADO_PERMISOS_PATHS.marcoGuardar, {
    method: 'POST',
    body,
    useAuth: true,
  });
};

export const sincronizarPermisosAfiliado = async (): Promise<SincronizarMarcoResponse> =>
  apiFetch(AFILIADO_PERMISOS_PATHS.sync, {
    method: 'POST',
    useAuth: true,
  });

export const sincronizarLoteAfiliadosAdmin = async (
  limit = 100,
  rolCorporativoId?: string | null
): Promise<SincronizarMarcoResponse> => {
  const rolId = normalizePublicIdForApi(rolCorporativoId);
  return apiFetch(AFILIADO_PERMISOS_PATHS.syncLote, {
    method: 'POST',
    body: {
      limit,
      ...(rolId ? { rolCorporativoId: rolId } : {}),
    },
    useAuth: true,
  });
};

export const sincronizarUsuarioAfiliadoAdmin = async (
  usuarioId: string
): Promise<SincronizarMarcoResponse & { ok?: boolean; motivo?: string; herenciaCliente?: HerenciaClienteRelacion }> =>
  apiFetch(AFILIADO_PERMISOS_PATHS.syncUsuario(encodePublicIdForPath(usuarioId)), {
    method: 'POST',
    useAuth: true,
  });

export const getHerenciaCliente = async (
  usuarioId: string
): Promise<{ herenciaCliente: HerenciaClienteRelacion }> =>
  apiFetch(AFILIADO_PERMISOS_PATHS.herenciaCliente(encodePublicIdForPath(usuarioId)), {
    method: 'GET',
    useAuth: true,
  });

export const getContextoClienteMe = async (): Promise<ContextoClienteResponse> =>
  apiFetch(AFILIADO_PERMISOS_PATHS.contextoMe, {
    method: 'GET',
    useAuth: true,
  });
