import type { HttpMethod, EndpointActor, EndpointSection } from './parametrosGobernanzaTypes';

export type GobernanzaModuloMenuAccion = {
  id: string;
  method: HttpMethod;
  path: string;
  title: string;
  description: string;
  shortLabel: string;
  actor: EndpointActor | string;
  section?: EndpointSection;
  orden: number;
  disponible: boolean;
  /** Formulario publicado en gobernanzaModuloConfigs (path + component). */
  tipo?: 'formulario' | 'endpoint';
  menuPath?: string;
  formularioComponent?: string;
  /** Endpoint API (catálogo) que alimenta los campos del formulario. */
  endpointId?: string | null;
  /** Slug de la tarjeta en gobernanzaModuloConfigs (puede diferir del slug de sección). */
  configSlug?: string | null;
  /** rutaseguridads._id vinculado en gobernanzaModuloConfigs. */
  rutaId?: string | null;
  /** Validación GET operativo (config ↔ ruta). */
  validacion?: {
    ok: boolean;
    mensajes: string[];
  };
};

export type GobernanzaModuloConfigApi = {
  id?: string | null;
  slug: string;
  section: EndpointSection;
  /** Alias legacy en respuestas API. */
  label: string;
  nombre?: string;
  description: string;
  frontPath: string;
  menuPath?: string | null;
  rutaId?: string | null;
  rutaPath?: string | null;
  formularioId?: string | null;
  formularioNombre?: string | null;
  formularioComponent?: string | null;
  orden?: number;
  defaultActionId: string | null;
  actionQueryParam: string;
  submenuTitle?: string;
  submenuHint?: string;
  endpointIds: string[];
  /** Acciones HTTP publicadas en gobernanzaModuloConfigs (mapeo formulario → API). */
  accionesCatalog?: Array<{
    id: string;
    accionRef?: string | null;
    accionId?: string | null;
    method: string;
    title?: string;
    path?: string;
    shortLabel?: string;
  }>;
  /** Referencia a gobernanzaModuloTipos. */
  tipoId?: string | null;
  tipoCodigo?: string | null;
  tipoNombre?: string | null;
  tipoSection?: string | null;
  tipoFormularioComponent?: string | null;
  tipoFormularios?: GobernanzaModuloTipoFormularioApi[];
  validacion?: {
    ok: boolean;
    mensajes: string[];
  };
};

export type GobernanzaModuloTipoFormularioApi = {
  formularioComponent: string;
  endpointId?: string | null;
  titulo?: string;
  descripcion?: string;
  orden?: number;
};

export type GobernanzaModuloTipoApi = {
  id: string;
  codigo: string;
  section: string;
  nombre: string;
  descripcion: string;
  formularioComponent: string;
  formularios: GobernanzaModuloTipoFormularioApi[];
  orden: number;
  estado: boolean;
};

export type GobernanzaModuloTiposResponse = {
  ok: boolean;
  msg?: string;
  section: string;
  tipos: GobernanzaModuloTipoApi[];
};

export type GobernanzaModuloMenuResponse = {
  ok: boolean;
  msg?: string;
  modulo: GobernanzaModuloConfigApi;
  scope?: string;
  defaultActionId: string | null;
  saJerarquiaConCorporativo?: boolean;
  acciones: GobernanzaModuloMenuAccion[];
};

/** GET /gobernanza/modulos/operativo — gobernanzaModuloConfigs + acciones para render. */
export type GobernanzaModuloOperativoResponse = GobernanzaModuloMenuResponse & {
  section: string;
  configs: GobernanzaModuloConfigApi[];
  /** Lista sin filtrar hub; solo cuando hubOperaciones=1. */
  configsCompletos?: GobernanzaModuloConfigApi[];
  parametrizacionUi?: import('./gobernanzaParametrizacionUi').GobernanzaParametrizacionUi;
  meta?: {
    section?: string;
    configCount?: number;
    accionesCount?: number;
    hubOperaciones?: boolean;
    tipoSection?: string | null;
  };
};
export type GobernanzaRutaOpcionApi = {
  id: string;
  path: string;
  name: string;
  component?: string | null;
  tipoNodoCodigo?: string | null;
  tipoNodoNombre?: string | null;
  order?: number;
  sugerida?: boolean;
  vinculadoSlug?: string | null;
};

export type GobernanzaFormularioAccionApi = {
  accionId: string;
  method: string;
  title: string;
  path?: string;
  orden?: number;
};

export type GobernanzaFormularioTipoNodoApi = {
  id?: string | null;
  codigo?: string | null;
  nombre?: string | null;
};

export type GobernanzaFormularioDetalleApi = {
  id: string;
  name: string;
  path: string;
  component: string;
  layout?: string | null;
  order?: number;
  tipoNodo?: GobernanzaFormularioTipoNodoApi | null;
  acciones?: GobernanzaFormularioAccionApi[];
};

export type GobernanzaFormularioDetalleResponse = {
  ok: boolean;
  msg?: string;
  data?: GobernanzaFormularioDetalleApi;
};

export type GobernanzaModuloRutasOpcionesResponse = {
  ok: boolean;
  msg?: string;
  data?: {
    rutas: GobernanzaRutaOpcionApi[];
    sugerida?: GobernanzaRutaOpcionApi | null;
    meta?: { slug?: string | null; total?: number; ayuda?: string | null };
  };
};

export type GobernanzaModuloSembrarResponse = {
  ok: boolean;
  msg?: string;
  data?: {
    sembrados: unknown[];
    omitidos: Array<{ slug: string; motivo: string }>;
    totalSembrados: number;
  };
};

export type GobernanzaApiConsumoSyncData = {
  totalConfigs: number;
  sincronizadas: number;
  creadas: number;
  actualizadas: number;
  omitidasSinPath: number;
  configsSinRuta: number;
  conflictos: Array<{ path: string; method: string; slug: string; mensaje: string }>;
};

export type GobernanzaApiConsumoSyncResponse = {
  ok: boolean;
  msg?: string;
  data?: GobernanzaApiConsumoSyncData;
};

export type GobernanzaModuloFiltrosVistaApi = {
  tenantSuperAdminIds: string[];
  tenantGlobalIds: string[];
  usuarioIds: string[];
};

export type GobernanzaFiltroTenantSuperAdminOpcion = {
  iud: string;
  label: string;
  codigoJerarquia?: string | null;
};

export type GobernanzaFiltroTenantGlobalOpcion = {
  iud: string;
  label: string;
  codigoJerarquia?: string | null;
};

export type GobernanzaFiltroUsuarioOpcion = {
  iud: string;
  nombre: string;
  correo: string;
  rol?: string;
  tenantGlobal?: string | null;
  tenantSuperAdmin?: string | null;
};

export type GobernanzaModuloFiltrosOpcionesResponse = {
  ok: boolean;
  msg?: string;
  data?: {
    tenantSuperAdmins: GobernanzaFiltroTenantSuperAdminOpcion[];
    tenantGlobales: GobernanzaFiltroTenantGlobalOpcion[];
    usuarios: GobernanzaFiltroUsuarioOpcion[];
    policy?: { esDios?: boolean };
    meta?: {
      tenantSuperAdminAnclaId?: string | null;
      requiereParametrizacionTenantSuperAdmin?: boolean;
      tenantGlobalJerarquiaOk?: boolean;
      totalTenantGlobalEnRama?: number;
      totalUsuariosRama?: number;
      diagnosticoRamaUsuarios?: {
        documentosRegisCandidatos?: number;
        rechazadosPorFiltro?: number;
      } | null;
    };
  };
};

export type GobernanzaModuloCatalogoItemApi = {
  id?: string | null;
  slug: string;
  section: EndpointSection;
  label: string;
  description: string;
  frontPathSegment: string;
  frontPath: string;
  menuPath?: string;
  rutaId?: string | null;
  rutaPath?: string | null;
  formularioId?: string | null;
  formularioNombre?: string | null;
  formularioComponent?: string | null;
  filtrosVista?: GobernanzaModuloFiltrosVistaApi;
  orden: number;
  disponible: boolean;
  accionesTotal: number;
  accionesDisponibles: number;
  defaultActionId: string | null;
  registradoEnBd?: boolean;
};

export type GobernanzaModulosCatalogoResponse = {
  ok: boolean;
  msg?: string;
  scope?: string;
  modulos: GobernanzaModuloCatalogoItemApi[];
};
