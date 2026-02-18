import { apiFetch } from './api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export interface Route {
  iud: string;
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
}

export interface CreateRouteDto {
  name: string;
  path: string;
  component: string;
  layout: 'PublicLayout' | 'AuthLayout' | 'AdminLayout';
  icon?: string;
  allowedRoles?: string[];
  isActive?: boolean;
  mostrarEnNavbarPublico?: boolean;
  mostrarEnSidebar?: boolean;
  tipoNodo?: string;
  tipoNodoId?: string;
  padreId?: string | null;
  formulariosConfig?: {
    habilitado: boolean;
    modoAsignacion: 'TENANT' | 'USUARIO' | 'NINGUNO';
    tenantIds?: string[];
    usuarioIds?: string[];
    tenantAcciones?: Array<{ tenantId: string; acciones: string[] }>;
    soloDios?: boolean;
  };
  accessType?: string;
}

export interface UpdateRouteDto {
  name?: string;
  path?: string;
  component?: string;
  layout?: 'PublicLayout' | 'AuthLayout' | 'AdminLayout';
  icon?: string | null;
  allowedRoles?: string[];
  isActive?: boolean;
  mostrarEnNavbarPublico?: boolean;
  mostrarEnSidebar?: boolean;
  tipoNodo?: string;
  tipoNodoId?: string;
  padreId?: string | null;
  formulariosConfig?: {
    habilitado: boolean;
    modoAsignacion: 'TENANT' | 'USUARIO' | 'NINGUNO';
    tenantIds?: string[];
    usuarioIds?: string[];
    tenantAcciones?: Array<{ tenantId: string; acciones: string[] }>;
    soloDios?: boolean;
  };
  accessType?: string;
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

/**
 * Get all routes from the system
 */
export const getAllRoutes = async (): Promise<RoutesResponse> => {
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/listarRutas/admin`, {
    method: 'GET',
  });
  return response;
};

 
// Crear una nueva ruta
export const createRoute = async (routeData: CreateRouteDto): Promise<RouteResponse> => {
  const payload = {
    ...routeData,
    icon: routeData.icon || 'fa-solid fa-route',
    allowedRoles: routeData.allowedRoles || [],
    isActive: routeData.isActive !== undefined ? routeData.isActive : true,
    accessType: routeData.accessType || '6918802d5fc8260c8fcf870b',
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
