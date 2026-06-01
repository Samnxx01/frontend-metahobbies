const API_ROOT = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const AFILIADO_PERMISOS_PATHS = {
  configBase: `${API_ROOT}/config`,
  marcoActivo: (bootstrap = true) =>
    `${API_ROOT}/config/marco-permisos-afiliado/activo?bootstrap=${bootstrap}`,
  marcoCatalogo: `${API_ROOT}/config/marco-permisos-afiliado/catalogo`,
  marcoGuardar: `${API_ROOT}/config/marco-permisos-afiliado/guardar`,
  sync: `${API_ROOT}/config/jerarquia-counters-cliente/sincronizar`,
  syncLote: `${API_ROOT}/config/jerarquia-counters-cliente/sincronizar-lote`,
  syncUsuario: (usuarioId: string) =>
    `${API_ROOT}/config/jerarquia-counters-cliente/sincronizar-usuario/${encodeURIComponent(usuarioId)}`,
  herenciaCliente: (usuarioId: string) =>
    `${API_ROOT}/config/jerarquia-counters-cliente/herencia/${encodeURIComponent(usuarioId)}`,
  contextoMe: `${API_ROOT}/config/jerarquia-counters-cliente/me`,
} as const;
