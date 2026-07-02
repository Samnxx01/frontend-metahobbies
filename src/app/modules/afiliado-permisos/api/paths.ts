const API_ROOT = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const AFILIADO_PERMISOS_PATHS = {
  configBase: `${API_ROOT}/config`,
  marcoRoles: `${API_ROOT}/config/marco-permisos-afiliado/roles`,
  marcoActivo: (bootstrap = true, rolCorporativoId?: string | null, incluirRoles = false) => {
    const params = new URLSearchParams({ bootstrap: String(bootstrap) });
    if (rolCorporativoId) params.set('rolCorporativoId', rolCorporativoId);
    if (incluirRoles) params.set('incluirRoles', 'true');
    return `${API_ROOT}/config/marco-permisos-afiliado/activo?${params.toString()}`;
  },
  marcoCatalogo: `${API_ROOT}/config/marco-permisos-afiliado/catalogo`,
  marcoGuardar: `${API_ROOT}/config/marco-permisos-afiliado/guardar`,
  sync: `${API_ROOT}/config/jerarquia-counters-cliente/sincronizar`,
  syncLote: `${API_ROOT}/config/jerarquia-counters-cliente/sincronizar-lote`,
  syncUsuario: (usuarioId: string) =>
    `${API_ROOT}/config/jerarquia-counters-cliente/sincronizar-usuario/${encodeURIComponent(usuarioId)}`,
  herenciaCliente: (usuarioId: string) =>
    `${API_ROOT}/config/jerarquia-counters-cliente/herencia/${encodeURIComponent(usuarioId)}`,
  contextoMe: `${API_ROOT}/config/jerarquia-counters-cliente/me`,
  marcoPoliticas: `${API_ROOT}/config/marco-permisos-afiliado/politicas`,
  politicasCatalogo: `${API_ROOT}/seguridad/politicas-runtime/catalogo`,
} as const;
