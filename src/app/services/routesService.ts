import { apiFetch, apiFetchPublic } from './api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export interface Route {
  iud: string;
  _id?: string;
  name: string;
  path: string;
  component: string;
  layout: string;
  icon: string | null;
  allowedRoles: Array<{ _id: string }>;
  estadoRuta: boolean;
  mostrarEnNavbarPublico?: boolean;
  mostrarEnSidebar?: boolean;
  mostrarEnMenuUsuario?: boolean;
  tiquetaNavb?: string | null;
  menuUsuarioLabel?: string | null;
  menuUsuarioOrder?: number;
  tipoNodo?: string | null;
  tipoNodoId?: string | null;
  padreId?: string | null | { _id?: string; iud?: string; name?: string };
  heredaDeRuta?: string | null | { _id?: string; iud?: string; name?: string };
  formulariosConfig?: {
    habilitado: boolean;
    modoAsignacion: 'TENANT' | 'USUARIO' | 'NINGUNO';
    tenantIds: string[];
    usuarioIds: string[];
    tenantAcciones?: Array<{ tenantId: string; acciones: string[] }>;
    soloDios: boolean;
  };
  order: number;
  fechaCreacionUsu: string;
  createdAt: string;
  updatedAt: string;
  permitidoPorHerencia?: boolean;
  cumpleJerarquiaHerencia?: boolean;
  puedeGestionarBaja?: boolean;
  accionBajaPermitida?: 'ELIMINAR' | 'DESACTIVAR' | 'NINGUNA' | string;
  accessType?:
    | string
    | { _id?: string; iud?: string; accessType?: string; layout?: string }
    | Array<string | { _id?: string; iud?: string; accessType?: string; layout?: string }>;
  acciones?:
    | string
    | { _id?: string; iud?: string; method?: string; etiquetas?: string }
    | Array<string | { _id?: string; iud?: string; method?: string; etiquetas?: string }>;
  accionesPublicas?: string[];
  accionesPrivadas?: string[];
}

export interface RouteMenuTag {
  iud: string;
  nombreTag: string;
  codigo: string;
  descripcion?: string | null;
  menuTipo: 'USER_DROPDOWN' | string;
  rutaId?: string;
  routePath: string;
  routeName: string;
  label: string;
  iconKey: string;
  order: number;
  estado: boolean;
  canView?: boolean;
  canInherit?: boolean;
  permitirSinTenant?: boolean;
  tenantSuperAdminId?: string | null;
  tenantGlobalId?: string | null;
  tenantGlobalIds?: string[];
  tenantCorporativoId?: string | null;
  ruta?: {
    iud: string;
    name: string;
    path: string;
    estadoRuta?: boolean;
    component?: string;
    layout?: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
  scope?: {
    tenantSuperAdminId?: string | null;
    tenantGlobalId?: string | null;
    tenantGlobalIds?: string[];
    tenantCorporativoId?: string | null;
  };
}

export interface RouteMenuTagsResponse {
  success: boolean;
  message?: string;
  total?: number;
  data: RouteMenuTag[];
}

export interface RouteMenuTagResponse {
  success: boolean;
  message?: string;
  data: RouteMenuTag;
}

export interface CreateRouteDto {
  name: string;
  path: string;
  component: string;
  layout: string;
  icon?: string;
  allowedRoles?: string[];
  isActive?: boolean;
  mostrarEnNavbarPublico?: boolean;
  mostrarEnSidebar?: boolean;
  mostrarEnMenuUsuario?: boolean;
  tiquetaNavb?: string | null;
  menuUsuarioLabel?: string | null;
  menuUsuarioOrder?: number;
  tipoNodo?: string;
  tipoNodoId?: string;
  padreId?: string | null;
  heredaDeRuta?: string | null;
  formulariosConfig?: {
    habilitado: boolean;
    modoAsignacion: 'TENANT' | 'USUARIO' | 'NINGUNO';
    tenantIds?: string[];
    usuarioIds?: string[];
    tenantAcciones?: Array<{ tenantId: string; acciones: string[] }>;
    soloDios?: boolean;
  };
  accessType?: string | string[];
  acciones?: string | string[];
}

export interface UpdateRouteDto {
  name?: string;
  path?: string;
  component?: string;
  layout?: string;
  icon?: string | null;
  allowedRoles?: string[];
  isActive?: boolean;
  mostrarEnNavbarPublico?: boolean;
  mostrarEnSidebar?: boolean;
  mostrarEnMenuUsuario?: boolean;
  tiquetaNavb?: string | null;
  menuUsuarioLabel?: string | null;
  menuUsuarioOrder?: number;
  tipoNodo?: string;
  tipoNodoId?: string;
  padreId?: string | null;
  heredaDeRuta?: string | null;
  formulariosConfig?: {
    habilitado: boolean;
    modoAsignacion: 'TENANT' | 'USUARIO' | 'NINGUNO';
    tenantIds?: string[];
    usuarioIds?: string[];
    tenantAcciones?: Array<{ tenantId: string; acciones: string[] }>;
    soloDios?: boolean;
  };
  accessType?: string | string[];
  acciones?: string | string[];
  estadoRuta?: boolean;
  order?: number;
}

export interface CreateRouteMenuTagDto {
  nombreTag: string;
  codigo?: string;
  descripcion?: string | null;
  menuTipo?: 'USER_DROPDOWN' | string;
  rutaId: string;
  label: string;
  iconKey?: string;
  order?: number;
  estado?: boolean;
  tenantSuperAdminId?: string | null;
  tenantGlobalIds?: string[];
  tenantCorporativoId?: string | null;
}

export interface UpdateRouteMenuTagDto {
  nombreTag?: string;
  codigo?: string;
  descripcion?: string | null;
  menuTipo?: 'USER_DROPDOWN' | string;
  rutaId?: string;
  label?: string;
  iconKey?: string;
  order?: number;
  estado?: boolean;
  tenantSuperAdminId?: string | null;
  tenantGlobalIds?: string[];
  tenantCorporativoId?: string | null;
}

export interface RoutesResponse {
  success: boolean;
  message: string;
  total: number;
  data: Route[];
}

export interface RouteResponse {
  success: boolean;
  message: string;
  data: Route;
}

export interface PreviewRouteResponse {
  success: boolean;
  message?: string;
  data: {
    path: string;
    component: string;
    layout: string;
  };
}

export interface TenantCorporativoOption {
  iud: string;
  label: string;
  tenantGlobal: string;
  permitidoPorHerencia: boolean;
  accesoRestringido: boolean;
  accionesUso: string[];
  puedeEditarAcciones?: boolean;
}

export interface TenantGlobalOption {
  iud: string;
  label: string;
  permitidoPorHerencia: boolean;
  accesoRestringido: boolean;
  accionesUso: string[];
  tenantCorporativos: TenantCorporativoOption[];
  puedeEditarAcciones?: boolean;
}

export interface UsuarioOption {
  iud: string;
  nombre: string;
  correo: string;
  rol: string;
  tenantGlobal: string;
  tenantCorporativo: string;
}

export interface FormulariosOpcionesResponse {
  success: boolean;
  message: string;
  data: {
    tenantGlobales: TenantGlobalOption[];
    policy?: {
      esDios: boolean;
      esTenantSuperAdmin: boolean;
      puedeEditarAccionesTenant: boolean;
    };
    usuarios: UsuarioOption[];
  };
}

export interface TipoNodoRuta {
  iud: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  estado: boolean;
  order: number;
  codigoCatalogoId?: string;
}

export interface TiposNodoResponse {
  success: boolean;
  message: string;
  total?: number;
  data: TipoNodoRuta[];
}

export interface TiposNodoOpcionesResponse {
  success: boolean;
  message: string;
  total?: number;
  order: number;
  scopeConfiguracion?: string;
  usarSelect: boolean;
  usarDefault: boolean;
  data: TipoNodoRuta[];
}

export interface AplicarCodigoTipoNodoResponse {
  success: boolean;
  message: string;
  created: boolean;
  reused: boolean;
  data: {
    iud: string;
    codigo: string;
    scopeConfiguracion?: string;
    tenantCorporativoId?: string | null;
  };
}

export interface TipoNodoResponse {
  success: boolean;
  message: string;
  data: TipoNodoRuta;
}

export interface AccessTypeOption {
  _id: string;
  accessType: 'PUBLIC' | 'PRIVATE' | string;
  layout?: string;
  estadoAcces?: boolean;
}

export interface AccessTypesResponse {
  success: boolean;
  message: string;
  total?: number;
  data: AccessTypeOption[];
}

export interface AccessTypeResponse {
  success?: boolean;
  message?: string;
  msg?: string;
  data: AccessTypeOption;
}

export interface AccionOption {
  _id: string;
  iud?: string;
  method: string;
  etiquetas?: string;
  estadoAccion?: boolean;
}

export interface AccionesResponse {
  success: boolean;
  message?: string;
  total?: number;
  data: AccionOption[];
}

const normalizeAccionesRows = (payload: any): AccionOption[] => {
  const source = Array.isArray(payload?.data)
    ? payload.data
    : (Array.isArray(payload?.acciones) ? payload.acciones : []);

  return source
    .map((row: any) => ({
      _id: String(row?._id || row?.iud || '').trim(),
      iud: String(row?.iud || row?._id || '').trim() || undefined,
      method: String(row?.method || '').trim().toUpperCase(),
      etiquetas: String(row?.etiquetas || '').trim(),
      estadoAccion: row?.estadoAccion !== false,
    }))
    .filter((row: AccionOption) => Boolean(row._id));
};

/**
 * Get all routes from the system
 */
export const getAllRoutes = async (): Promise<RoutesResponse> => {
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/listarRutas/admin`, {
    method: 'GET',
  });
  return response;
};

export const getRouteMenuTags = async (params?: {
  menuTipo?: string;
  soloActivos?: boolean;
}): Promise<RouteMenuTagsResponse> => {
  const search = new URLSearchParams();
  if (params?.menuTipo) search.set('menuTipo', params.menuTipo);
  if (params?.soloActivos === true) search.set('soloActivos', 'true');
  const query = search.toString();

  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/menu-tags${query ? `?${query}` : ''}`, {
    method: 'GET',
  });
  return response;
};

export const resolveCurrentRouteMenuTags = async (params?: {
  menuTipo?: string;
}): Promise<RouteMenuTagsResponse> => {
  const search = new URLSearchParams();
  if (params?.menuTipo) search.set('menuTipo', params.menuTipo);
  const query = search.toString();
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/menu-tags/resolver/actual${query ? `?${query}` : ''}`, {
    method: 'GET',
  });
  return response;
};

export const createRouteMenuTag = async (payload: CreateRouteMenuTagDto): Promise<RouteMenuTagResponse> => {
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/menu-tags`, {
    method: 'POST',
    body: payload,
  });
  return response;
};

export const updateRouteMenuTag = async (id: string, payload: UpdateRouteMenuTagDto): Promise<RouteMenuTagResponse> => {
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/menu-tags/${id}`, {
    method: 'PUT',
    body: payload,
  });
  return response;
};

export const deleteRouteMenuTag = async (id: string): Promise<{ success: boolean; message?: string }> => {
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/menu-tags/${id}`, {
    method: 'DELETE',
  });
  return response;
};

export const previewRoute = async (id: string): Promise<PreviewRouteResponse> => {
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/preview/${id}`, {
    method: 'GET',
  });
  return response;
};

 
// Crear una nueva ruta
export const createRoute = async (routeData: CreateRouteDto): Promise<RouteResponse> => {
  const hasAccessType = Array.isArray(routeData.accessType)
    ? routeData.accessType.length > 0
    : Boolean(routeData.accessType);

  const payload = {
    ...routeData,
    icon: routeData.icon || 'fa-solid fa-route',
    allowedRoles: routeData.allowedRoles || [],
    isActive: routeData.isActive !== undefined ? routeData.isActive : true,
    ...(hasAccessType ? { accessType: routeData.accessType } : {}),
  };
  
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/permisos`, {
    method: 'POST',
    body: payload,
  });
  return response;
};

// Actualizar una ruta
export const updateRoute = async (id: string, routeData: UpdateRouteDto): Promise<RouteResponse> => {
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/modificar/${id}`, {
    method: 'PUT',
    body: routeData,
  });
  return response;
};

export const getFormulariosOpciones = async (): Promise<FormulariosOpcionesResponse> => {
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/formularios/opciones`, {
    method: 'GET',
  });
  return response;
};

export const getTiposNodoRuta = async (): Promise<TiposNodoResponse> => {
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/tipos-nodo`, {
    method: 'GET',
  });
  return response;
};

export const getTiposNodoRutaOpciones = async (order: number): Promise<TiposNodoOpcionesResponse> => {
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/tipos-nodo/opciones?order=${order}`, {
    method: 'GET',
  });
  return response;
};

export const applyTipoNodoCodigo = async (payload: { codigo: string; tenantCorporativoId?: string | null; perfilCorporativoId?: string | null }): Promise<AplicarCodigoTipoNodoResponse> => {
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/tipos-nodo/codigos/aplicar`, {
    method: 'POST',
    body: payload,
  });
  return response;
};

export interface PerfilCorporativoItem {
  _id: string;
  iud?: string;
  razon_social?: string;
  titulo?: string;
  nit_ruc_rtn?: string;
  estado?: boolean;
}

export const getPerfilesCorporativosParaCodigo = async (): Promise<{ success: boolean; data: PerfilCorporativoItem[] }> => {
  return await apiFetch(`${API_BASE_URL}/seguridad/rutas/tipos-nodo/codigos/perfiles-corporativos`, {
    method: 'GET',
  });
};

export interface CodigoNodoItem {
  iud: string;
  codigo: string;
  scopeConfiguracion?: string;
  tenantCorporativoId?: string | null;
  perfilCorporativoId?: string | null;
}

export const getTiposNodoCodigos = async (): Promise<{ success: boolean; total: number; data: CodigoNodoItem[] }> => {
  return await apiFetch(`${API_BASE_URL}/seguridad/rutas/tipos-nodo/codigos`, {
    method: 'GET',
  });
};

export const getAccessTypes = async (): Promise<AccessTypesResponse> => {
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/listarTiposRutas/admin`, {
    method: 'GET',
  });
  return response;
};

export const getAccionesCatalogo = async (): Promise<AccionesResponse> => {
  try {
    const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/acciones`, {
      method: 'GET',
    });
    const rows = normalizeAccionesRows(response);
    if (rows.length > 0) {
      return {
        success: true,
        message: response?.message || 'Acciones cargadas',
        total: rows.length,
        data: rows,
      };
    }
  } catch (_error) {
    // Fallback en caso de ruta no disponible o sin permisos.
  }

  const fallback = await apiFetchPublic(`${API_BASE_URL}/config/parametrizacion/widget/branding/acciones/publico`, {
    method: 'GET',
  });
  const rowsFallback = normalizeAccionesRows(fallback);
  return {
    success: rowsFallback.length > 0 || Boolean((fallback as any)?.ok),
    message: (fallback as any)?.msg || 'Acciones cargadas (fallback)',
    total: rowsFallback.length,
    data: rowsFallback,
  };
};

export const createAccessType = async (payload: { accessType: string; layout: string }): Promise<AccessTypeResponse> => {
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/parametrizacion/permisos`, {
    method: 'POST',
    body: payload,
  });
  return response;
};

export const updateAccessType = async (id: string, payload: { accessType: string; layout: string }): Promise<AccessTypeResponse> => {
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/parametrizacion/permisos/${id}`, {
    method: 'PUT',
    body: payload,
  });
  return response;
};

export const deactivateAccessType = async (id: string): Promise<{ success?: boolean; message?: string; msg?: string }> => {
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/parametrizacion/permisos/${id}`, {
    method: 'DELETE',
  });
  return response;
};

export const createTipoNodoRuta = async (payload: {
  codigo: string;
  codigoCatalogoId?: string;
  nombre: string;
  descripcion?: string;
  order?: number;
  estado?: boolean;
}): Promise<TipoNodoResponse> => {
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/tipos-nodo`, {
    method: 'POST',
    body: payload,
  });
  return response;
};

export const updateTipoNodoRuta = async (id: string, payload: {
  codigo?: string;
  codigoCatalogoId?: string | null;
  nombre?: string;
  descripcion?: string;
  order?: number;
  estado?: boolean;
}): Promise<TipoNodoResponse> => {
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/tipos-nodo/${id}`, {
    method: 'PUT',
    body: payload,
  });
  return response;
};

export const deleteTipoNodoRuta = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/tipos-nodo/${id}`, {
    method: 'DELETE',
  });
  return response;
};

// Eliminar una ruta
export const deleteRoute = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/inactivo/sistema/${id}`, {
    method: 'DELETE',
  });
  return response;
};

// Cambiar estado de una ruta
export const toggleRouteStatus = async (id: string, estado: boolean): Promise<RouteResponse> => {
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/modificar/estados/${id}`, {
    method: 'PUT',
    body: { isActive: estado },
  });
  return response;
};
