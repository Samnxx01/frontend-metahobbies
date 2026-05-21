const API_ROOT = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const AFILIADO_PERMISOS_PATHS = {
  configBase: `${API_ROOT}/config`,
  marcoActivo: (bootstrap = true) =>
    `${API_ROOT}/config/marco-permisos-afiliado/activo?bootstrap=${bootstrap}`,
  marcoGuardar: `${API_ROOT}/config/marco-permisos-afiliado`,
  sync: `${API_ROOT}/config/jerarquia-counters-cliente/sincronizar`,
  contextoMe: `${API_ROOT}/config/jerarquia-counters-cliente/me`,
} as const;
