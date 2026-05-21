import { apiFetch } from '@/app/services/api';
import { AFILIADO_PERMISOS_PATHS } from './paths';
import type {
  ContextoClienteResponse,
  GuardarMarcoPayload,
  GuardarMarcoResponse,
  MarcoActivoResponse,
  SincronizarMarcoResponse,
} from '../types/marco.types';

export const getMarcoAfiliadoActivo = async (bootstrap = true): Promise<MarcoActivoResponse> =>
  apiFetch(AFILIADO_PERMISOS_PATHS.marcoActivo(bootstrap), {
    method: 'GET',
    useAuth: true,
  });

export const guardarMarcoAfiliado = async (
  payload: GuardarMarcoPayload
): Promise<GuardarMarcoResponse> =>
  apiFetch(AFILIADO_PERMISOS_PATHS.marcoGuardar, {
    method: 'PUT',
    body: payload,
    useAuth: true,
  });

export const sincronizarPermisosAfiliado = async (): Promise<SincronizarMarcoResponse> =>
  apiFetch(AFILIADO_PERMISOS_PATHS.sync, {
    method: 'POST',
    useAuth: true,
  });

export const getContextoClienteMe = async (): Promise<ContextoClienteResponse> =>
  apiFetch(AFILIADO_PERMISOS_PATHS.contextoMe, {
    method: 'GET',
    useAuth: true,
  });
