/**
 * Módulo Afiliado Permisos (frontend) — techo CLIENTE_PLATAFORMA
 */
export { default as MarcoPermisosAfiliadoPage } from './pages/MarcoPermisosAfiliadoPage';
export { useMarcoPermisosParametrizacion } from './hooks/useMarcoPermisosParametrizacion';
export {
  getMarcoAfiliadoActivo,
  getCatalogoMarcoAfiliado,
  guardarMarcoAfiliado,
  sincronizarPermisosAfiliado,
  sincronizarLoteAfiliadosAdmin,
  sincronizarUsuarioAfiliadoAdmin,
  getContextoClienteMe,
} from './api/marco.api';
export { AFILIADO_PERMISOS_PATHS } from './api/paths';
export { MARCO_AFILIADO_CODIGO } from './constants/catalog-filters';
export type {
  MarcoPermisosAfiliado,
  MarcoActivoResponse,
  GuardarMarcoPayload,
  GuardarMarcoResponse,
  SincronizarMarcoResponse,
  ContextoClienteResponse,
  HerenciaClienteRelacion,
} from './types/marco.types';
