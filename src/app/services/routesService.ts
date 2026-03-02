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
}

export interface TiposNodoResponse {
  success: boolean;
  message: string;
  total?: number;
  data: TipoNodoRuta[];
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
