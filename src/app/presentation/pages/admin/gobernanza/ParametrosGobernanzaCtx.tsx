import React, { createContext, useContext } from 'react';
import type { PoliticaRuntime } from '@/app/services/politicasRuntimeService';
import type {
  EndpointSpec,
} from './parametrosGobernanzaTypes';
import type {
  Vista,
  Accion,
  TenantGlobal,
  ReglaOption,
  ContextOption,
  HeredaGlobalOption,
  NodoRuta,
  TenantCorporativoOption,
  GenericSelectOption,
  VistaItem,
} from './parametrosGobernanzaPureHelpers';
import type { DiosRecursoRow, DiosRecursoSuiteJerarquia } from './diosReglaRecursosJerarquia';

export interface ParametrosGobernanzaCtxType {
  // State vars
  acciones: Accion[];
  catalogItems: any[];
  catalogItemsLoaded: boolean;
  catalogSeedRunning: boolean;
  contextos: ContextOption[];
  deltaByEndpoint: Record<string, any>;
  diosRecursosByFormId: Record<string, DiosRecursoRow>;
  diosRecursosJerarquiaFlat: DiosRecursoRow[];
  diosRecursosJerarquiaLoading: boolean;
  diosRecursosJerarquiaTree: DiosRecursoSuiteJerarquia[];
  diosReglaAccionesSeleccion: Record<string, string[]>;
  diosReglaRecursosSeleccion: Record<string, string[]>;
  herenciaAsociadaDataByEndpoint: Record<string, any>;
  herenciaAsociadaOptionsByEndpoint: Record<string, any[]>;
  herenciasExistentesPorTG: Record<string, any[]>;
  herenciasPorUsuario: Record<string, any[]>;
  herenciasUsuario: any[];
  jerarquiaSaCounters: any[];
  loadingData: boolean;
  loadingHerenciasPorUsuario: Record<string, boolean>;
  loadingUsuarios: Record<string, boolean>;
  politicasRuntimeCatalog: PoliticaRuntime[];
  reglas: any[];
  ruleCatalog: Record<string, any>;
  rutasJerarquia: NodoRuta[];
  saFilterByEndpoint: Record<string, string>;
  suiteSelByEndpoint: Record<string, string>;
  syncInfoByEndpoint: Record<string, any>;
  syncRunningByEndpoint: Record<string, boolean>;
  tenantActualizarPrefillLoading: boolean;
  tenantCorpErrorByEndpoint: Record<string, string>;
  tenantCorpLoadingByEndpoint: Record<string, boolean>;
  tenantFilterByEndpoint: Record<string, string>;
  tenantGlobalActor: any;
  tenantGlobalSelects: Record<string, GenericSelectOption[]>;
  tenantGlobales: TenantGlobal[];
  tenantSuperAdminsJerarquiaCounters: any[];
  tenantUpdateTargets: Array<{ id: string; label: string }>;
  usuariosDestinoSel: Record<string, string[]>;
  usuariosDisponibles: Record<string, any[]>;
  vistas: VistaItem[];
  // Additional computed vars
  DIOS_REGLAS_ENDPOINT_IDS: Set<string>;
  PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS: Set<string>;
  ENDPOINT_IDS_SELECT_MULTI_SA_JERARQUIA: Set<string>;
  saJerarquiaConCorporativo: boolean;
  esJwtSoloTenantSuperAdmin: boolean;
  scopeJwtSaAlcanceJerarquiaValidado: boolean | undefined;
  saJerarquiaTieneCorporativoEnCountersEfectivo: boolean | undefined;
  tenantActualizarLoadedIdRef: React.MutableRefObject<string>;
  tenantActualizarLabelsRef: React.MutableRefObject<Record<string, string>>;
  dominioPorSaMap: any;
  running: Record<string, boolean>;
  TENANT_SUPERADMIN_SCOPE_PREFIX: string;
  // Setters
  setDeltaByEndpoint: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setDiosReglaAccionesSeleccion: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setDiosReglaRecursosSeleccion: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setHerenciaAsociadaDataByEndpoint: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setHerenciaAsociadaOptionsByEndpoint: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  setReglasPoliticasRuntimeSel: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setSaFilterByEndpoint: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setSuiteSelByEndpoint: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setSyncInfoByEndpoint: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setTenantFilterByEndpoint: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setUsuariosDestinoSel: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setVistasDesactivarSeleccion: (...args: any[]) => any;
  // Functions
  actorEsTenantSuperAdmin: () => boolean;
  actorEsTenantGlobalScope: () => boolean;
  actorEsTenantCorporativoScope: () => boolean;
  applyHerenciaAsociadaSelection: (...args: any[]) => any;
  applyPermAdminTenantGlobalSelection: (endpointId: string, fieldName: string, nextValue: string) => any;
  applyRuleToForm: (...args: any[]) => any;
  applySuiteCatalogSelection: (endpointId: string, suiteId: string) => any;
  aplicarUsuariosDesdeJerarquiaRef: (endpointId: string, tgId: string) => any;
  actualizarReglasGlobalesSoloLectura: () => boolean;
  buildDiosReglaSaMetasMap: () => Map<string, any>;
  cargarHerenciasPorUsuario: (usuarioId: string) => any;
  cargarUsuariosParaEndpoint: (endpointId: string, tenantGlobalId: string) => Promise<any>;
  consultaReglasGlobalesRamaCorporativo: (endpointId: string) => boolean;
  diosReglaAlcanceFormularioEditable: (endpoint: EndpointSpec) => boolean;
  endpointDisponibleParaScope: (endpoint: EndpointSpec) => boolean;
  fetchHerenciasAsociadasByTenantGlobal: (...args: any[]) => any;
  fetchHerenciasConReglasParaTenant: (...args: any[]) => any;
  fetchTenantCorporativosByGlobal: (endpointId: string, tgId: string) => any;
  findReglaJerarquiaPorSa: (...args: any[]) => any;
  getDiosReglaTenantsSel: (endpointId: string) => string[];
  getDiosReglaUsuariosPorTenantSel: (endpointId: string) => any;
  getFieldValue: (endpointId: string, fieldName: string) => string;
  getHeredaOptionsPermitidasPorTenantGlobal: (tgId: string) => HeredaGlobalOption[];
  getHerenciaGlobalOpcionesParaTG: () => HeredaGlobalOption[];
  getHerenciasUsuariosSeleccionadosParaPermUsuario: (tgId: string) => HeredaGlobalOption[];
  getPermisosCatalog: (endpointId: string) => any;
  getReglasPoliticasRuntimeSel: (endpointId: string) => string[];
  getReglasFiltradasPorTenant: (endpointId: string) => ReglaOption[];
  getTenantCorporativoOptions: (endpointId: string) => TenantCorporativoOption[];
  getTenantGlobalOptions: (endpointId: string) => any[];
  getTenantGlobalOptionsForPermUsuario: () => HeredaGlobalOption[];
  getTenantGlobalesOpcionesPorSaActualizar: (saId: string, ...rest: any[]) => any[];
  getCorporativoByHerencia: (heredaId: string) => string | null;
  getCorporativosDelTG: () => TenantCorporativoOption[];
  handleCatalogSeedDefaults: () => Promise<void>;
  limpiarActualizarReglasAlCambiarSa: (endpointId: string) => void;
  modoSoloLecturaReglasDios: (endpoint: EndpointSpec) => boolean;
  permiteReglaDiosEnActualizarReglasGlobales: () => boolean;
  politicaRuntimeId: (politica: any) => string;
  politicaRuntimeLabel: (politica: any) => string;
  refreshReglasCatalogoPorSaActualizar: (...args: any[]) => Promise<any>;
  reglaSinTenantGlobalMaterializado: (rule: any) => boolean;
  resolveDominioTenatPorSa: (...args: any[]) => string;
  resolveSaIdCanonicoParaReglas: (saId: string) => string;
  resolveSaJerarquiaMetasVisibles: (endpointId: string) => any[];
  runHerenciaSyncCheck: (endpointId: string, sync: boolean) => any;
  seleccionarReglaJerarquiaPorSaActualizar: (...args: any[]) => any;
  seleccionarReglaParametrizadaPorTenantActualizar: (...args: any[]) => any;
  setCatalogSelectionFor: (endpointId: string, selection: any) => void;
  setDiosReglaTenantsSelFor: (...args: any[]) => any;
  setDiosReglaUsuariosPorTenantFor: (...args: any[]) => any;
  setFieldValue: (endpointId: string, fieldName: string, value: string) => void;
  setPermisos: (endpointId: string, permisos: any[]) => void;
  sincronizarContextoTenantGlobalPermUsuario: (endpointId: string, tgId: string) => Promise<any>;
  toggleReglaPoliticaRuntime: (endpointId: string, politicaId: string, checked: boolean) => void;
  // Render functions
  renderHerenciaAsociadaDetalle: (endpointId: string) => React.ReactElement | null;
  renderHerenciaSelectionBuilder: (endpoint: EndpointSpec) => React.ReactElement;
  renderPermisosBuilder: (endpoint: EndpointSpec) => React.ReactElement;
}

const ParametrosGobernanzaCtx = createContext<ParametrosGobernanzaCtxType | null>(null);

export function useParametrosGobernanzaCtx(): ParametrosGobernanzaCtxType {
  const ctx = useContext(ParametrosGobernanzaCtx);
  if (!ctx) throw new Error('useParametrosGobernanzaCtx debe usarse dentro de ParametrosGobernanzaCtx.Provider');
  return ctx;
}

export { ParametrosGobernanzaCtx };
