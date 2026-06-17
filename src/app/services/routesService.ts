import { apiFetch, apiFetchPublic, getHybridSpaFrontendPath, resolveSeguridadRutasFetchOptions } from './api';
import { fetchAllSecurityRoutes } from './routeService';
import { normalizeMongoId, normalizeMongoIdList, normalizeMongoIdOrNull } from '../utils/normalizeMongoId';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const fetchSeguridadRutas = (
    endpoint: string,
    options: Parameters<typeof apiFetch>[1] = {}
) => apiFetch(endpoint, {
    method: 'GET',
    ...resolveSeguridadRutasFetchOptions(),
    ...options,
});

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
  puedeEditar?: boolean;
  puedeCambiarEstado?: boolean;
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
  counterTagId?: string | null;
  secuenciaTag?: number;
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
  tenantSuperAdminIds?: string[];
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
    tenantSuperAdminIds?: string[];
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
  component?: string;
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
  permitirSinTenant?: boolean;
  tenantSuperAdminId?: string | null;
  tenantSuperAdminIds?: string[];
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
  permitirSinTenant?: boolean;
  tenantSuperAdminId?: string | null;
  tenantSuperAdminIds?: string[];
  tenantGlobalIds?: string[];
  tenantCorporativoId?: string | null;
}

export interface RoutesResponse {
  success: boolean;
  message: string;
  total: number;
  actorTipo?: string;
  sourceCollection?: string | null;
  toolbarPolicy?: {
    mode?: 'all' | 'consulta' | 'parametrizacion' | 'crear' | 'sin-acceso' | string;
    actionIds?: string[];
    rowActionIds?: string[];
    canList?: boolean;
    canCreate?: boolean;
    canManage?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
  } | null;
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
  /** Presente en catalogos que filtran por jerarquia SA + corporativo (p. ej. inventario). */
  tenantSuperAdmin?: string;
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
  _id?: string;
  iud?: string;
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
  path?: string;
  estadoAccion?: boolean;
}

export interface AccionesResponse {
  success: boolean;
  message?: string;
  total?: number;
  data: AccionOption[];
}

const normalizeAccionesRows = (payload: any): AccionOption[] => {
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.acciones)
        ? payload.acciones
        : [];

  return source
    .map((row: any) => {
      const id = String(row?._id || row?.iud || row?.id || '').trim();
      return {
        _id: id,
        iud: id || undefined,
        method: String(row?.method || '').trim().toUpperCase(),
        etiquetas: String(row?.etiquetas || row?.label || '').trim(),
        path: String(row?.path || '').trim() || undefined,
        estadoAccion: row?.estadoAccion !== false && row?.estado !== false,
      };
    })
    .filter((row: AccionOption) => Boolean(row._id));
};

/**
 * Get all routes from the system
 */
export const getAllRoutes = async (): Promise<RoutesResponse> => {
  const hasToken = Boolean(typeof localStorage !== 'undefined' && localStorage.getItem('token'));
  const hybridSpa = Boolean(getHybridSpaFrontendPath());
  const response = await fetchAllSecurityRoutes(hasToken || hybridSpa);
  if (response) return response as RoutesResponse;
  return {
    success: false,
    message: 'No se pudo cargar el listado de rutas',
    total: 0,
    data: [],
  };
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
  const url = `${API_BASE_URL}/seguridad/rutas/menu-tags/resolver/actual${query ? `?${query}` : ''}`;
  const response = await apiFetch(url, { method: 'GET' });
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
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/preview/${encodeURIComponent(String(id || '').trim())}`, {
    method: 'GET',
  });
  return response;
};

/** Detalle completo de una ruta (tipos de nodo, accessType y acciones poblados). */
export const getRouteById = async (id: string): Promise<RouteResponse> => {
  const routeId = encodeURIComponent(String(id || '').trim());
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/listar/especifico/${routeId}`, {
    method: 'GET',
  });
  return response;
};

 
// Crear una nueva ruta
export const createRoute = async (routeData: CreateRouteDto): Promise<RouteResponse> => {
  const normalizedAccessType = normalizeMongoIdList(routeData.accessType);
  const normalizedAcciones = normalizeMongoIdList(routeData.acciones);
  const hasAccessType = normalizedAccessType.length > 0;

  const payload = {
    ...routeData,
    tipoNodoId: normalizeMongoIdOrNull(routeData.tipoNodoId) ?? routeData.tipoNodoId,
    padreId: routeData.padreId != null ? normalizeMongoIdOrNull(routeData.padreId) : routeData.padreId,
    heredaDeRuta: routeData.heredaDeRuta != null ? normalizeMongoIdOrNull(routeData.heredaDeRuta) : routeData.heredaDeRuta,
    allowedRoles: normalizeMongoIdList(routeData.allowedRoles),
    icon: routeData.icon || 'fa-solid fa-route',
    isActive: routeData.isActive !== undefined ? routeData.isActive : true,
    ...(hasAccessType ? { accessType: normalizedAccessType.length === 1 ? normalizedAccessType[0] : normalizedAccessType } : {}),
    ...(normalizedAcciones.length > 0 ? { acciones: normalizedAcciones } : {}),
  };
  
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/permisos`, {
    method: 'POST',
    body: payload,
  });
  return response;
};

// Actualizar una ruta
export const updateRoute = async (id: string, routeData: UpdateRouteDto): Promise<RouteResponse> => {
  const normalizedAccessType = normalizeMongoIdList(routeData.accessType);
  const normalizedAcciones = normalizeMongoIdList(routeData.acciones);

  const payload: UpdateRouteDto = {
    ...routeData,
    ...(routeData.tipoNodoId != null
      ? { tipoNodoId: normalizeMongoIdOrNull(routeData.tipoNodoId) ?? routeData.tipoNodoId }
      : {}),
    ...(routeData.padreId !== undefined
      ? { padreId: routeData.padreId != null ? normalizeMongoIdOrNull(routeData.padreId) : routeData.padreId }
      : {}),
    ...(routeData.heredaDeRuta !== undefined
      ? { heredaDeRuta: routeData.heredaDeRuta != null ? normalizeMongoIdOrNull(routeData.heredaDeRuta) : routeData.heredaDeRuta }
      : {}),
    ...(routeData.allowedRoles !== undefined
      ? { allowedRoles: normalizeMongoIdList(routeData.allowedRoles) }
      : {}),
    ...(routeData.accessType !== undefined
      ? {
          accessType: normalizedAccessType.length === 0
            ? []
            : normalizedAccessType.length === 1
              ? normalizedAccessType[0]
              : normalizedAccessType,
        }
      : {}),
    ...(routeData.acciones !== undefined ? { acciones: normalizedAcciones } : {}),
  };

  const response = await apiFetch(
    `${API_BASE_URL}/seguridad/rutas/modificar/${encodeURIComponent(String(id || '').trim())}`,
    {
    method: 'PUT',
    body: payload,
    }
  );
  return response;
};

export const getFormulariosOpciones = async (): Promise<FormulariosOpcionesResponse> => {
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/formularios/opciones`, {
    method: 'GET',
  });
  return response;
};

export const getTiposNodoRuta = async (): Promise<TiposNodoResponse> => {
  const response = await fetchSeguridadRutas(`${API_BASE_URL}/seguridad/rutas/tipos-nodo`);
  return response;
};

export const getTiposNodoRutaOpciones = async (order: number): Promise<TiposNodoOpcionesResponse> => {
  const response = await fetchSeguridadRutas(
    `${API_BASE_URL}/seguridad/rutas/tipos-nodo/opciones?order=${order}`
  );
  return response;
};

export interface JerarquiaOpcionesCounterResponse {
  success: boolean;
  message?: string;
  total: number;
  nivelOrder: number;
  padreRutaSeguridadId?: string | null;
  sourceCollection?: string;
  data: Route[];
}

/** Opciones jerárquicas desde countertiponodorutas (Suite/Modulo/Formulario/SubFormulario). */
export const getJerarquiaOpcionesFromCounter = async (params: {
  nivelOrder: number;
  padreRutaSeguridadId?: string | null;
  suiteRutaSeguridadId?: string | null;
  moduloRutaSeguridadId?: string | null;
}): Promise<JerarquiaOpcionesCounterResponse> => {
  const search = new URLSearchParams();
  search.set('nivelOrder', String(params.nivelOrder));
  if (params.padreRutaSeguridadId) {
    search.set('padreRutaSeguridadId', params.padreRutaSeguridadId);
  }
  if (params.suiteRutaSeguridadId) {
    search.set('suiteRutaSeguridadId', params.suiteRutaSeguridadId);
  }
  if (params.moduloRutaSeguridadId) {
    search.set('moduloRutaSeguridadId', params.moduloRutaSeguridadId);
  }
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/jerarquia/opciones?${search.toString()}`, {
    method: 'GET',
  });
  return response;
};

export interface SincronizarJerarquiaCounterResult {
  scopeConfiguracion?: string;
  totalRutas?: number;
  procesadas?: number;
  creadas?: number;
  actualizadas?: number;
  sinCambios?: number;
  omitidas?: number;
  sinTipo?: number;
  relacionesActivas?: number;
  errores?: number;
  detalleErrores?: Array<{ rutaId: string; name: string; path: string; message: string }>;
  mensaje?: string;
}

/** Sincroniza countertiponodorutas con rutaseguridads existentes (no borra ni recrea rutas). */
export const sincronizarJerarquiaCounter = async (): Promise<{
  success: boolean;
  message?: string;
  data?: SincronizarJerarquiaCounterResult;
}> => {
  const response = await apiFetch(`${API_BASE_URL}/seguridad/rutas/jerarquia/counter/sincronizar`, {
    method: 'POST',
  });
  return response;
};

/** Alias retrocompatible de sincronizarJerarquiaCounter. */
export const migrarJerarquiaCounter = async (): Promise<{
  success: boolean;
  message?: string;
  data?: SincronizarJerarquiaCounterResult;
}> => sincronizarJerarquiaCounter();

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

export interface CatalogoCodigoItem {
  iud: string;
  codigo: string;
  tipoNodoRutaId: string | null;
  scopeConfiguracion: string;
  estado: boolean;
}

export const getCatalogoCodigos = async (tipoNodoRutaId?: string): Promise<{ success: boolean; total: number; data: CatalogoCodigoItem[] }> => {
  const query = tipoNodoRutaId ? `?tipoNodoRutaId=${tipoNodoRutaId}` : '';
  return await apiFetch(`${API_BASE_URL}/seguridad/rutas/catalogo-codigo${query}`, {
    method: 'GET',
  });
};

export const createCatalogoCodigo = async (payload: { codigo: string; tipoNodoRutaId?: string | null }): Promise<{ success: boolean; created: boolean; reused: boolean; data: CatalogoCodigoItem }> => {
  return await apiFetch(`${API_BASE_URL}/seguridad/rutas/catalogo-codigo`, {
    method: 'POST',
    body: payload,
  });
};

export const deleteCatalogoCodigo = async (id: string): Promise<{ success: boolean; accion: string }> => {
  return await apiFetch(`${API_BASE_URL}/seguridad/rutas/catalogo-codigo/${id}`, {
    method: 'DELETE',
  });
};

export interface MigracionTipoNodoResult {
  success: boolean;
  message: string;
  sinTipoNodo: number;
  yaCorrectas: number;
  actualizadas: number;
  sinCandidato: Array<{ path: string; tipoNodo: string }>;
  detalle: Array<{ path: string; tipoNodo: string; anteriorId: string | null; nuevoId: string; order: number }>;
}

export const migrarTipoNodoRutas = async (): Promise<MigracionTipoNodoResult> => {
  return await apiFetch(`${API_BASE_URL}/seguridad/rutas/tipos-nodo/migrar`, {
    method: 'POST',
  });
};

export const getAccessTypes = async (): Promise<AccessTypesResponse> => {
  const response = await fetchSeguridadRutas(`${API_BASE_URL}/seguridad/rutas/listarTiposRutas/admin`);
  return response;
};

export const getAccionesCatalogo = async (): Promise<AccionesResponse> => {
  const sources: AccionOption[][] = [];

  try {
    const marcoCat = await apiFetch(`${API_BASE_URL}/config/marco-permisos-afiliado/catalogo`, {
      method: 'GET',
      useAuth: true,
    });
    const fromMarco = normalizeAccionesRows(marcoCat);
    if (fromMarco.length) sources.push(fromMarco);
  } catch {
    // Siguiente fuente
  }

  try {
    const response = await fetchSeguridadRutas(`${API_BASE_URL}/seguridad/rutas/acciones`);
    const rows = normalizeAccionesRows(response);
    if (rows.length) sources.push(rows);
  } catch {
    // Fallback público
  }

  if (!sources.length) {
    try {
      const fallback = await apiFetchPublic(
        `${API_BASE_URL}/config/parametrizacion/widget/branding/acciones/publico`,
        { method: 'GET' }
      );
      const rowsFallback = normalizeAccionesRows(fallback);
      if (rowsFallback.length) sources.push(rowsFallback);
    } catch {
      // sin catálogo
    }
  }

  const merged = new Map<string, AccionOption>();
  for (const list of sources) {
    for (const row of list) {
      if (row._id) merged.set(row._id, row);
    }
  }
  const data = [...merged.values()];

  return {
    success: data.length > 0,
    message:
      data.length > 0
        ? 'Acciones cargadas'
        : 'No hay acciones HTTP activas. Revise la colección acciones o Gestión de rutas.',
    total: data.length,
    data,
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
export const deleteRoute = async (
  id: string,
  payload?: { accion?: 'ELIMINAR' | 'DESACTIVAR' }
): Promise<{ success: boolean; message: string }> => {
  const response = await apiFetch(
    `${API_BASE_URL}/seguridad/rutas/inactivo/sistema/${encodeURIComponent(String(id || '').trim())}`,
    {
    method: 'DELETE',
    body: payload,
    }
  );
  return response;
};

// Cambiar estado de una ruta
export const toggleRouteStatus = async (id: string, estado: boolean): Promise<RouteResponse> => {
  const response = await apiFetch(
    `${API_BASE_URL}/seguridad/rutas/modificar/estados/${encodeURIComponent(String(id || '').trim())}`,
    {
    method: 'PUT',
    body: { isActive: estado },
    }
  );
  return response;
};
