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
};

export type GobernanzaModuloConfigApi = {
  slug: string;
  section: EndpointSection;
  label: string;
  description: string;
  frontPath: string;
  defaultActionId: string | null;
  actionQueryParam: string;
  submenuTitle?: string;
  submenuHint?: string;
  endpointIds: string[];
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

export type GobernanzaRutaOpcionApi = {
  id: string;
  path: string;
  name: string;
  component?: string | null;
  order?: number;
  sugerida?: boolean;
  vinculadoSlug?: string | null;
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
