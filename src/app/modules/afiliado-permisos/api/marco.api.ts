import { apiFetch } from '@/app/services/api';
import { AFILIADO_PERMISOS_PATHS } from './paths';
import type {
  ContextoClienteResponse,
  GuardarMarcoPayload,
  GuardarMarcoResponse,
  HerenciaClienteRelacion,
  MarcoActivoResponse,
  SincronizarMarcoResponse,
} from '../types/marco.types';

export const getMarcoAfiliadoActivo = async (bootstrap = true): Promise<MarcoActivoResponse> =>
  apiFetch(AFILIADO_PERMISOS_PATHS.marcoActivo(bootstrap), {
    method: 'GET',
    useAuth: true,
  });

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
): Promise<GuardarMarcoResponse> =>
  apiFetch(AFILIADO_PERMISOS_PATHS.marcoGuardar, {
    method: 'POST',
    body: payload,
    useAuth: true,
  });

export const sincronizarPermisosAfiliado = async (): Promise<SincronizarMarcoResponse> =>
  apiFetch(AFILIADO_PERMISOS_PATHS.sync, {
    method: 'POST',
    useAuth: true,
  });

export const sincronizarLoteAfiliadosAdmin = async (
  limit = 100
): Promise<SincronizarMarcoResponse> =>
  apiFetch(AFILIADO_PERMISOS_PATHS.syncLote, {
    method: 'POST',
    body: { limit },
    useAuth: true,
  });

export const sincronizarUsuarioAfiliadoAdmin = async (
  usuarioId: string
): Promise<SincronizarMarcoResponse & { ok?: boolean; motivo?: string; herenciaCliente?: HerenciaClienteRelacion }> =>
  apiFetch(AFILIADO_PERMISOS_PATHS.syncUsuario(usuarioId), {
    method: 'POST',
    useAuth: true,
  });

export const getHerenciaCliente = async (
  usuarioId: string
): Promise<{ herenciaCliente: HerenciaClienteRelacion }> =>
  apiFetch(AFILIADO_PERMISOS_PATHS.herenciaCliente(usuarioId), {
    method: 'GET',
    useAuth: true,
  });

export const getContextoClienteMe = async (): Promise<ContextoClienteResponse> =>
  apiFetch(AFILIADO_PERMISOS_PATHS.contextoMe, {
    method: 'GET',
    useAuth: true,
  });
