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
  const response = await apiFetch(`${API_BASE_URL}/rutas/${id}`, {
    method: 'PUT',
    body: (routeData),
  });
  return response;
};

// Eliminar una ruta
export const deleteRoute = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiFetch(`${API_BASE_URL}/rutas/${id}`, {
    method: 'DELETE',
  });
  return response;
};

// Cambiar estado de una ruta
export const toggleRouteStatus = async (id: string, estado: boolean): Promise<RouteResponse> => {
  const response = await apiFetch(`${API_BASE_URL}/rutas/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estadoRuta: estado }),
  });
  return response;
};
