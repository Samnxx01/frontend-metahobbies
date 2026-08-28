import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/app/services/api';
import { fetchPoliticasRuntimeCatalogo, type PoliticaRuntime } from '@/app/services/politicasRuntimeService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  Play,
  RefreshCw,
  Search,
  Settings2,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import {
  cardPathClassForDesign,
  cardShellClassForDesign,
  DEFAULT_GOBERNANZA_CARD_DESIGN,
  loadAllCardDesigns,
  persistAllCardDesigns,
  type GobernanzaCardDesign,
} from './gobernanza/gobernanzaCardDesignTypes';
import { GobernanzaCardDesignForm } from './gobernanza/GobernanzaCardDesignForm';
import { GobernanzaModuloDinamico } from './gobernanza/GobernanzaModuloDinamico';
import { GobernanzaModuloOperativoShell } from './gobernanza/GobernanzaModuloOperativoShell';
import {
  envolverFormularioInline,
  validarGobernanzaModuloInline,
} from './gobernanza/gobernanzaModuloFormularioGuard';
import { useParametrosGobernanzaModuloMenu } from './gobernanza/useParametrosGobernanzaModuloMenu';
import {
  ALL_HYDRATE_BUNDLES,
  fetchHydrateBundles,
  resolveHydrateBundles,
  endpointNeedsSelectsLite,
  endpointNeedsSelectsFull,
  fetchReglasTenantCached,
  invalidarReglasCache,
  type HydrateBundle,
  type HydrateBundleResults,
} from './gobernanza/parametrosGobernanzaHydrate';
import { useGobernanzaParametrizacionUi } from './gobernanza/useGobernanzaParametrizacionUi';
import {
  JERARQUIA_USUARIOS_FETCH_MS,
  POLL_HERENCIA_ADMIN_MS,
  REGLA_SA_SYNTH_PREFIX,
  TENANT_SUPERADMIN_SCOPE_PREFIX,
} from './gobernanza/parametrosGobernanzaConstants';
import {
  GOBERNANZA_MODULO_PERMISOS,
  GOBERNANZA_MODULO_POLITICA_BYPASS,
  GOBERNANZA_MODULO_POLITICAS_RUNTIME,
  GOBERNANZA_MODULO_REGLAS,
  GOBERNANZA_MODULO_TENANT,
  gobernanzaModuloOperativoStub,
  type GobernanzaModuloConfig,
} from './gobernanza/gobernanzaModuloConfig';
import {
  esRutaHubGobernanzaPermisos,
  esRutaHubGobernanzaReglas,
  esRutaHubGobernanzaTenant,
  esRutaHubGobernanzaTenantGlobal,
  GOBERNANZA_TIPO_SECTION_TENANT_SUPER_ADMIN,
  GOBERNANZA_TIPO_SECTION_TENANT_GLOBAL,
  GOBERNANZA_TIPO_SECTION_REGLAS_SA,
  GOBERNANZA_TIPO_SECTION_PERMISOS_SA,
  normalizarGobernanzaMenuPath,
  resolverGobernanzaEndpointId,
} from './gobernanza/gobernanzaActionIds';
import { ENDPOINTS_BY_ID } from './gobernanza/gobernanzaEndpointCatalog';
import { endpointSpecOperativoDesdeCatalogo, tieneFormularioComponentResuelto } from './gobernanza/gobernanzaModuloMenuMappers';
import { gobernanzaEntityId } from './gobernanza/gobernanzaEntityId';
import {
  buildDominioPorSaMapFromSaMetas,
  normalizarTenantsSaMismoDominio,
  resolveDominioTenatPorSa,
} from './gobernanza/parametrosGobernanzaRuleCatalog';
import {
  toastErrorConTransaccion,
  toastTransaccionDesdePayload,
} from './gobernanza/gobernanzaTransaccionToast';
import { resolveReglaLegacyId, resolveReglaPublicId } from './gobernanza/gobernanzaReglaEntityId';
import { GobernanzaTenantFormByEndpoint } from './gobernanza/tenant-forms';
import { GobernanzaPermisosFormByEndpoint } from './gobernanza/permisos-forms';
import { GobernanzaReglasFormByEndpoint } from './gobernanza/reglas-forms';
import { getGobernanzaModuloCatalogoLocal } from './gobernanza/gobernanzaModulosCatalog';
import {
  computeGobernanzaEndpointCapabilities,
  type GobernanzaCapabilityContext,
} from './gobernanza/gobernanzaEndpointCapabilities';
import {
  ActualizarTenantGlobalActionCard,
  DesactivarTenantGlobalActionCard,
  EliminarTenantGlobalActionCard,
  ListarTenantGlobalActionCard,
} from './gobernanza/GobernanzaTenantActionCards';
import { ParametrosGobernanzaEndpointDesignMenu } from './gobernanza/ParametrosGobernanzaEndpointDesignMenu';
import { ParametrosGobernanzaModalFormLayout } from './gobernanza/ParametrosGobernanzaModalFormLayout';
import { governanceEndpointActionId, governanceEndpointConfigureActionId, GovernedButton, TENANT_GOVERNANCE_ACTION_IDS } from '@/app/presentation/actions';
import { PoliticaBypassPanel } from './PoliticaBypassPanel';
import { PoliticasRuntimePanel } from './PoliticasRuntimePanel';
import {
  expandTenantGlobalDescendants,
  filtrarTenantGlobalesAlcanceJwtReglasGlobales,
  filtrarTenantGlobalesPorJerarquiaSuperAdmin,
  filtrarTenantGlobalesPorSaElegido,
  tenantGlobalOptionsFromJerarquiaUsuarios,
} from './gobernanza/tenantGlobalJerarquiaHelpers';
import {
  filtrarIndiceSaSubarbol,
  filtrarSaJerarquiaMetaRamaDescendiente,
  type SaJerarquiaCounterIndice,
} from './gobernanza/saJerarquiaCounterFilter';
import {
  formatSaJerarquiaOptionLabel,
  formatSaUsuarioParametrizarLabel,
} from './gobernanza/SaJerarquiaUsuariosPanel';
import {
  buildTenantGlobalSelectsEnriched,
  buildTenantGlobalSelectsFromApi,
  tenantGlobalFormularioToFieldMap,
  type TenantGlobalFormularioDetalle,
} from './gobernanza/tenantGlobalSelectHelpers';
import {
  esEndpointCreacionSaDocumento,
} from './gobernanza/tenantSuperAdminInsertEndpoints';
import {
  cargarJerarquiaRecursosDesdeCounter,
  type DiosRecursoRow,
  type DiosRecursoSuiteJerarquia,
} from './gobernanza/diosReglaRecursosJerarquia';
import {
  requiereSelectorUsuariosSa,
  type DiosReglaSaMeta,
} from './gobernanza/diosReglaAlcanceHelpers';
import {
  buildDiosReglaSaAccesoHelpRows,
  resolverSecurityPlatformDesdeTenantSa,
  resolverSaJerarquiaTieneCorporativoEnCounters,
  resolverSaJerarquiaPosicion,
  type SaPosicionJerarquia,
} from './gobernanza/diosReglaAyudaHelpers';
import { DIOS_REGLA_BTN_ACTIVO, diosReglaExecuteButtonClassName } from './gobernanza/diosReglaButtonStyles';
import { DiosReglaAccesoFullHelpSection } from './gobernanza/DiosReglaAccesoFullHelpSection';
import { GobernanzaFlowHelpProvider } from './gobernanza/gobernanzaFlowHelpContext';
import { ParametrosGobernanzaCtx } from './gobernanza/ParametrosGobernanzaCtx';
import { GobernanzaFormFieldsInner } from './gobernanza/GobernanzaFormFieldsInner';
import { GobernanzaHerenciaAsociadaDetalle } from './gobernanza/GobernanzaHerenciaAsociadaDetalle';
import { GobernanzaPermisosBuilder } from './gobernanza/GobernanzaPermisosBuilder';
import { GobernanzaHerenciaSelectionBuilder } from './gobernanza/GobernanzaHerenciaSelectionBuilder';
import { GobernanzaFormResultSlot } from './gobernanza/GobernanzaFormResultSlot';
import { computePermisosCatalog } from './gobernanza/permisosCatalogLogic';
import { runEndpointLogic } from './gobernanza/runEndpointLogic';
import { type JerarquiaResponse } from '@/app/services/tenantUsuariosService';
import { ENDPOINTS } from './gobernanza/parametrosGobernanzaEndpoints';
import {
  METHOD_STYLE,
  SECTION_META,
} from './gobernanza/parametrosGobernanzaSectionUi';
import type {
  EndpointActor,
  EndpointSection,
  EndpointSpec,
  FieldSpec,
  FieldType,
  HttpMethod,
  ParametrosGobernanzaProps,
  RunEndpointOpts,
} from './gobernanza/parametrosGobernanzaTypes';
import {
  type Vista,
  type Accion,
  type TenantGlobal,
  type PermisoItem,
  type ReglaOption,
  type ContextOption,
  type HeredaGlobalOption,
  type CatalogSelection,
  type NodoRuta,
  type TenantCorporativoOption,
  type GenericSelectOption,
  type HeredaScope,
  type VistaItem,
  type SaJerarquiaMeta,
  computeRuleCatalogPermisosDigest,
  findReglaPlataformaPorSuperAdmin,
  saIdCoincideEnRegla,
  findReglasPorTenantSuperAdmin,
  resolverNvlGeneracionMeta,
  esNodoFormularioLike,
  collectFormularioLikeNodes,
  getModuloNodes,
  collectAllNodes,
  getEntityId,
  normalizePermisoRefId,
  collectGobernanzaRefIds,
  idsPermisoRefsCoinciden,
  vistaIdEnCounterFormularioSubformulario,
  extractPermisoRefIds,
  resolveContextoIdFromRegla,
  alignSelectionToCatalogIds,
  vistaIdMatchesCatalog,
  getEntityLabel,
  buildVistaLocationMap,
  buildGroupedVistas,
  buildSuiteSummaryLabel,
  pickArray,
  pickTenantCorporate,
  buildTenantGlobalContextLabel,
  pickTenantCorreo,
  isTenantSuperAdminScopeOption,
  toMongoIdQueryParam,
  resolveTenantSuperAdminIdForHerenciaSelect,
  safeAccionEtiqueta,
} from './gobernanza/parametrosGobernanzaPureHelpers';

const REGLAS_GLOBALES_ENDPOINT_IDS = new Set([
  'tenant-crear-global-reglas',
  'tenant-actualizar-global-reglas',
  'tenant-desactivar-global-reglas',
  'tenant-eliminar-global-reglas',
]);

export type {
  EndpointActor,
  EndpointSection,
  EndpointSpec,
  FieldSpec,
  FieldType,
  HttpMethod,
  ParametrosGobernanzaProps,
};

const ParametrosGobernanza: React.FC<ParametrosGobernanzaProps> = ({
  mode = 'full',
  initialSection = 'tenant',
  lockedSection = null,
  allowedEndpointIds,
  initialEndpointId = null,
  syncRouteWithEndpoint = false,
  onRouteEndpointClear,
  cardDesignQueryParam = 'diseno',
  enableCardDesignEditor = true,
  inlineModuloConfig: inlineModuloConfigProp = null,
  inlineModuloSlug,
  shellVariant = 'full',
  menuPath: menuPathProp,
  preferredActionId: preferredActionIdProp = null,
  operacionesHub = false,
  tipoSection: tipoSectionProp = null,
  singleFormInline = false,
}) => {
  const { sets: parametrizacionUiSets } = useGobernanzaParametrizacionUi();
  const HIDDEN_ENDPOINT_IDS = parametrizacionUiSets.endpointIdsOcultosPanel;
  const RULES_ENDPOINT_IDS = parametrizacionUiSets.endpointIdsModoReglas;
  const SUPERADMIN_RULES_ENDPOINT_IDS = parametrizacionUiSets.endpointIdsModoReglasSuperadmin;
  const DIOS_REGLAS_ENDPOINT_IDS = parametrizacionUiSets.endpointIdsModoReglasDios;
  const PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS = parametrizacionUiSets.endpointIdsPermAdminActualizar;
  const ENDPOINT_IDS_OPCIONES_TG_JERARQUIA_SUPERADMIN = parametrizacionUiSets.endpointIdsJerarquiaTgSelect;
  const ENDPOINT_IDS_SELECT_MULTI_SA_JERARQUIA = parametrizacionUiSets.endpointIdsJerarquiaSaMulti;

  const { pathname } = useLocation();
  const explicitMenuPath = String(menuPathProp || '').trim();
  const resolvedMenuPath = explicitMenuPath || pathname || null;
  const effectiveOperacionesHub = useMemo(
    () =>
      operacionesHub
      || esRutaHubGobernanzaPermisos(resolvedMenuPath)
      || esRutaHubGobernanzaReglas(resolvedMenuPath)
      || esRutaHubGobernanzaTenant(resolvedMenuPath)
      || esRutaHubGobernanzaTenantGlobal(resolvedMenuPath),
    [operacionesHub, resolvedMenuPath]
  );
  const effectiveTipoSection = useMemo(() => {
    const explicit = String(tipoSectionProp || '').trim().toLowerCase();
    if (explicit) return explicit;
    if (effectiveOperacionesHub && esRutaHubGobernanzaTenant(resolvedMenuPath)) {
      return GOBERNANZA_TIPO_SECTION_TENANT_SUPER_ADMIN;
    }
    if (effectiveOperacionesHub && esRutaHubGobernanzaTenantGlobal(resolvedMenuPath)) {
      return GOBERNANZA_TIPO_SECTION_TENANT_GLOBAL;
    }
    if (effectiveOperacionesHub && esRutaHubGobernanzaReglas(resolvedMenuPath)) {
      return GOBERNANZA_TIPO_SECTION_REGLAS_SA;
    }
    if (effectiveOperacionesHub && esRutaHubGobernanzaPermisos(resolvedMenuPath)) {
      return GOBERNANZA_TIPO_SECTION_PERMISOS_SA;
    }
    if (effectiveOperacionesHub && lockedSection === 'permisos') {
      return GOBERNANZA_TIPO_SECTION_PERMISOS_SA;
    }
    if (effectiveOperacionesHub && lockedSection === 'reglas') {
      return GOBERNANZA_TIPO_SECTION_REGLAS_SA;
    }
    return '';
  }, [tipoSectionProp, effectiveOperacionesHub, resolvedMenuPath, lockedSection]);
  const preferredActionId = String(preferredActionIdProp || '').trim() || null;
  const isRulesMode = mode === 'rules' || mode === 'superAdminRules';
  const shellModuloParametrizado = Boolean(
    lockedSection
    && !allowedEndpointIds
    && !isRulesMode
    && (inlineModuloSlug || lockedSection === 'permisos' || lockedSection === 'reglas' || lockedSection === 'tenant')
  );
  const compactShell = shellVariant === 'compact' || shellModuloParametrizado;
  const initialResolvedSection = lockedSection ?? initialSection;
  const [activeSection, setActiveSection] = useState<EndpointSection>(initialResolvedSection);
  const [searchParams, setSearchParams] = useSearchParams();
  const [endpointModal, setEndpointModal] = useState<EndpointSpec | null>(null);
  const [cardDesignById, setCardDesignById] = useState<Record<string, GobernanzaCardDesign>>(() =>
    typeof window !== 'undefined' ? loadAllCardDesigns() : {}
  );

  const updateCardDesignForEndpoint = useCallback((endpointId: string, next: GobernanzaCardDesign) => {
    setCardDesignById((prev) => {
      const merged = { ...prev, [endpointId]: next };
      persistAllCardDesigns(merged);
      return merged;
    });
  }, []);
  const [endpointSearch, setEndpointSearch] = useState('');
  const [reglasSearch, setReglasSearch] = useState('');
  const [vistaSearchByEndpoint, setVistaSearchByEndpoint] = useState<Record<string, string>>({});
  const [reglasTenantFilter, setReglasTenantFilter] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<Record<string, string>>({});
  const [resultData, setResultData] = useState<Record<string, any>>({});
  const [formData, setFormData] = useState<Record<string, Record<string, string>>>({});
  const formDataRef = useRef<Record<string, Record<string, string>>>({});
  formDataRef.current = formData;
  const [permisoData, setPermisoData] = useState<Record<string, PermisoItem[]>>({});
  const [tenantGlobales, setTenantGlobales] = useState<TenantGlobal[]>([]);
  /** Desde GET selects: tenantSuperAdmin con filas en tenantjerarquiacounters (+ corporativo) */
  const [tenantSuperAdminsJerarquiaCounters, setTenantSuperAdminsJerarquiaCounters] = useState<
    SaJerarquiaMeta[]
  >([]);
  /** Índice crudo counters (codigoPadre) para filtrar subárbol SA en combo. */
  const [jerarquiaSaCounters, setJerarquiaSaCounters] = useState<SaJerarquiaCounterIndice[]>([]);
  /** Modal diff políticas + vistas padre→hijo */
  const [diffPadreData, setDiffPadreData] = useState<{
    faltanEnHijo: { id: string; codigo: string | null; dominio: string | null; tipo: string | null; efecto: string | null; activo: boolean }[];
    totalFaltantes: number;
    codigoPadre: string;
    faltanVistas: { id: string; name: string | null; path: string | null }[];
    totalVistasHijoLeFaltan: number;
  } | null>(null);
  const [showDiffPadreModal, setShowDiffPadreModal] = useState(false);
  const [diffPoliticasSel, setDiffPoliticasSel] = useState<Set<string>>(new Set());
  const [diffVistasSel, setDiffVistasSel] = useState<Set<string>>(new Set());
  const [aplicandoDiffPadre, setAplicandoDiffPadre] = useState(false);
  const [vistas, setVistas] = useState<Vista[]>([]);
  const [acciones, setAcciones] = useState<Accion[]>([]);
  const [reglas, setReglas] = useState<ReglaOption[]>([]);
  const [contextos, setContextos] = useState<ContextOption[]>([]);
  const [ruleCatalog, setRuleCatalog] = useState<Record<string, any>>({});
  const ruleCatalogRef = useRef<Record<string, any>>({});
  useEffect(() => { ruleCatalogRef.current = ruleCatalog; }, [ruleCatalog]);
  const [, setDominioPlataformaSistema] = useState('');
  const dominioPorSaMap = useMemo(
    () => buildDominioPorSaMapFromSaMetas(tenantSuperAdminsJerarquiaCounters),
    [tenantSuperAdminsJerarquiaCounters],
  );
  const ruleCatalogPermisosDigest = useMemo(
    () => computeRuleCatalogPermisosDigest(ruleCatalog),
    [ruleCatalog]
  );
  const [heredaGlobalOptions, setHeredaGlobalOptions] = useState<HeredaGlobalOption[]>([]);
  const [heredaGlobalScopeById, setHeredaGlobalScopeById] = useState<Record<string, HeredaScope>>({});
  const [catalogSelection, setCatalogSelection] = useState<Record<string, CatalogSelection>>({});
  /** IDs de acciones elegidas para POST crear regla DIOS (`tenant-crear-dios-reglas`). */
  const [diosReglaAccionesSeleccion, setDiosReglaAccionesSeleccion] = useState<Record<string, string[]>>({});
  /** IDs de recursos (vistas/rutas) elegidos para POST crear regla DIOS. */
  const [diosReglaRecursosSeleccion, setDiosReglaRecursosSeleccion] = useState<Record<string, string[]>>({});
  /** Tenants SA marcados en crear/actualizar regla DIOS (multi-select). */
  const [diosReglaTenantsSel, setDiosReglaTenantsSel] = useState<Record<string, string[]>>({});
  /** Usuarios por tenant SA en regla DIOS (saId → userIds). */
  const [diosReglaUsuariosPorTenantSel, setDiosReglaUsuariosPorTenantSel] = useState<
    Record<string, Record<string, string[]>>
  >({});
  /** Políticas runtime vinculadas al registrar/actualizar reglas (multi-select). */
  const [politicasRuntimeCatalog, setPoliticasRuntimeCatalog] = useState<PoliticaRuntime[]>([]);
  const [reglasPoliticasRuntimeSel, setReglasPoliticasRuntimeSel] = useState<Record<string, string[]>>({});
  const [bulkAllMode, setBulkAllMode] = useState<Record<string, boolean>>({});
  const [tenantCorporativos, setTenantCorporativos] = useState<TenantCorporativoOption[]>([]);
  const [tenantGlobalSelects, setTenantGlobalSelects] = useState<Record<string, GenericSelectOption[]>>({});
  const [tenantActualizarPrefillLoading, setTenantActualizarPrefillLoading] = useState(false);
  const tenantActualizarLoadedIdRef = useRef('');
  const tenantActualizarLabelsRef = useRef<Partial<Record<string, string>>>({});
  const [tenantGlobalActor, setTenantGlobalActor] = useState<{
    rol?: string;
    tenantGlobalId?: string | null;
    tenantSuperAdminId?: string | null;
    tenantCorporativoId?: string | null;
    /** Alineado con listarSelects: counters con corporativo para este SA */
    saJerarquiaTieneCorporativoEnCounters?: boolean;
    /** Un solo corporativo en tenantJerarquiaCounter para el SA → autollenar combo */
    corporativoJerarquiaAutoId?: string | null;
    corporativoIdsJerarquia?: string[];
    /** tipo_tenant del SA en JWT cuando counters ya tienen corporativo */
    tipoTenantAutoId?: string | null;
  }>({});
  const [, setTenantGlobalSelectsDebug] = useState<string>('');
  const [tenantCorpLoadingByEndpoint, setTenantCorpLoadingByEndpoint] = useState<Record<string, boolean>>({});
  const [tenantCorpErrorByEndpoint, setTenantCorpErrorByEndpoint] = useState<Record<string, string>>({});
  const [herenciasUsuario, setHerenciasUsuario] = useState<any[]>([]);
  const [herenciasExistentesPorTG, setHerenciasExistentesPorTG] = useState<Record<string, any[]>>({});
  const [herenciasPorUsuario, setHerenciasPorUsuario] = useState<Record<string, any[]>>({});
  const [loadingHerenciasPorUsuario, setLoadingHerenciasPorUsuario] = useState<Record<string, boolean>>({});
  const [herenciaAsociadaOptionsByEndpoint, setHerenciaAsociadaOptionsByEndpoint] = useState<Record<string, GenericSelectOption[]>>({});
  const [herenciaAsociadaDataByEndpoint, setHerenciaAsociadaDataByEndpoint] = useState<Record<string, Record<string, any>>>({});
  /** Vistas a quitar con PATCH (desactivar / eliminar parcial): payload vistaIds en un solo envío. */
  const [vistasDesactivarSeleccion, setVistasDesactivarSeleccion] = useState<Record<string, string[]>>({});
  const [syncInfoByEndpoint, setSyncInfoByEndpoint] = useState<Record<string, any>>({});
  const [syncRunningByEndpoint, setSyncRunningByEndpoint] = useState<Record<string, boolean>>({});
  const [herenciaDetalle, setHerenciaDetalle] = useState<any | null>(null);
  /** Modal resumen tras «Actualizar catálogo de reglas y herencia» en modal admin/global. */
  const [reglasHerenciaSyncReport, setReglasHerenciaSyncReport] = useState<{ lineas: string[] } | null>(null);
  const [reglasHerenciaSyncBusy, setReglasHerenciaSyncBusy] = useState(false);
  /** POST sincronizar counters global + refresh catálogo (solo modal Crear reglas globales, SA+corporativo en counters). */
  const [crearReglasJerarquiaSyncing, setCrearReglasJerarquiaSyncing] = useState(false);
  const [rutasJerarquia, setRutasJerarquia] = useState<NodoRuta[]>([]);
  const [diosRecursosJerarquiaTree, setDiosRecursosJerarquiaTree] = useState<DiosRecursoSuiteJerarquia[]>([]);
  const [diosRecursosJerarquiaFlat, setDiosRecursosJerarquiaFlat] = useState<DiosRecursoRow[]>([]);
  const [diosRecursosJerarquiaLoading, setDiosRecursosJerarquiaLoading] = useState(false);
  const [diosRecursosByFormId, setDiosRecursosByFormId] = useState<Record<string, DiosRecursoRow>>({});
  const [suiteSelByEndpoint, setSuiteSelByEndpoint] = useState<Record<string, string>>({});
  const [expandedModulos, setExpandedModulos] = useState<Set<string>>(new Set());
  const [usuariosDestinoSel, setUsuariosDestinoSel] = useState<Record<string, string[]>>({});
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<Record<string, { id: string; label: string }[]>>({});
  const [loadingUsuarios, setLoadingUsuarios] = useState<Record<string, boolean>>({});
  /** Misma respuesta que usa hydrateData (Usuarios tenant); evita segundo GET bloqueante al poblar reglas globales. */
  const jerarquiaUsuariosRef = useRef<JerarquiaResponse | null>(null);
  /** Detecta fin de `hydrateData` para volver a cargar herencias asociadas y alinear checkboxes con el servidor. */
  const hydrateLoadingPrevRef = useRef<boolean | null>(null);
  const hydrateSessionRef = useRef<{ promise: Promise<void> | null; finishedAt: number }>({
    promise: null,
    finishedAt: 0,
  });
  const HYDRATE_DEDUPE_MS = 45_000;
  const diosJerarquiaLoadRef = useRef<{ promise: Promise<void> | null; done: boolean }>({
    promise: null,
    done: false,
  });
  const hydrateBundlesLoadedRef = useRef<Set<HydrateBundle>>(new Set());
  const hydrateDeferredRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [catalogSeedRunning, setCatalogSeedRunning] = useState(false);
  const [catalogItems, setCatalogItems] = useState<{ iud: string; tipo_comprador: string; sigla: string; esDefault: boolean }[]>([]);
  const [catalogItemsLoaded, setCatalogItemsLoaded] = useState(false);
  const [deltaByEndpoint, setDeltaByEndpoint] = useState<Record<string, any>>({});
  const [loadingDeltaByEndpoint, setLoadingDeltaByEndpoint] = useState<Record<string, boolean>>({});
  const [tenantFilterByEndpoint, setTenantFilterByEndpoint] = useState<Record<string, string>>({});
  const [saFilterByEndpoint, setSaFilterByEndpoint] = useState<Record<string, string>>({});

  const loadCatalogItems = async () => {
    try {
      const res = await apiFetch('/api/config/permisos/corporativo/listar/catalogo/tenant/corporativo', { method: 'GET' });
      setCatalogItems(Array.isArray(res?.data) ? res.data : []);
    } catch {
      // ignore
    } finally {
      setCatalogItemsLoaded(true);
    }
  };

  const handleCatalogSeedDefaults = async () => {
    setCatalogSeedRunning(true);
    try {
      const res = await apiFetch('/api/config/permisos/corporativo/inicializar/catalogo', { method: 'POST' });
      if (res?.sembrados?.length) {
        toast.success(`${res.sembrados.length} catÃ¡logo(s) por defecto creados`);
      } else {
        toast.info(res?.msg || 'Los catÃ¡logos por defecto ya existen');
      }
      await loadCatalogItems();
    } catch (err: any) {
      toast.error(err?.message || 'Error al inicializar');
    } finally {
      setCatalogSeedRunning(false);
    }
  };

  const tenantPrimaryForms = useMemo(() => {
    if (mode === 'superAdminRules') {
      return { rules: null, superAdmin: null, tenantGlobal: null };
    }
    if (mode === 'rules') {
      return {
        rules: ENDPOINTS.find((e) => e.id === 'tenant-crear-global-reglas') || null,
        superAdmin: null,
        tenantGlobal: null
      };
    }

    return {
      rules: null,
      superAdmin: ENDPOINTS.find((e) => e.id === 'tenant-crear-global-admin') || null,
      tenantGlobal: ENDPOINTS.find((e) => e.id === 'tenant-crear-global-usuario') || null
    };
  }, [mode]);

  const visibleTenantPrimaryForms = useMemo(() => {
    if (mode === 'superAdminRules') return [];
    if (allowedEndpointIds) return [];
    if (isRulesMode) return tenantPrimaryForms.rules ? [tenantPrimaryForms.rules] : [];

    // modo superAdmin: flujo tenantSuperAdmin -> tenantGlobal y listados SA (pantalla TenantSuperAdmin)
    if (mode === 'superAdmin') {
      return tenantPrimaryForms.superAdmin ? [tenantPrimaryForms.superAdmin] : [];
    }

    // modo full: flujo puro tenantGlobal (Descendencia) en ParametrosGobernanza
    const items = [];
    if (tenantPrimaryForms.tenantGlobal) items.push(tenantPrimaryForms.tenantGlobal);
    return items;
  }, [allowedEndpointIds, isRulesMode, mode, tenantPrimaryForms]);

  const actorTieneScopeTenantSuperAdmin = Boolean(String(tenantGlobalActor?.tenantSuperAdminId || '').trim());
  const actorTieneGlobal = Boolean(String(tenantGlobalActor?.tenantGlobalId || '').trim());
  const actorTieneScopeTenantGlobal = actorTieneGlobal && !actorTieneScopeTenantSuperAdmin;
  const tenantGlobalSelectsLoaded = useMemo(
    () => Object.keys(tenantGlobalSelects || {}).length > 0,
    [tenantGlobalSelects]
  );
  const tenantUpdateTargets = useMemo(() => {
    const actorTenantSuperAdminId = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
    if (!actorTenantSuperAdminId) return [];
    const actorCounter = jerarquiaSaCounters.find(
      (row) => String(row?.tenantSuperAdminId || '').trim() === actorTenantSuperAdminId,
    );
    const diosRaizSinCodigoPadre =
      String(tenantGlobalActor?.rol || '').trim().toUpperCase() === 'DIOS' &&
      !String(actorCounter?.codigoPadre || '').trim();

    return tenantSuperAdminsJerarquiaCounters
      .filter((tenant) => {
        const id = String(tenant?.id || '').trim();
        return Boolean(id && (diosRaizSinCodigoPadre || id !== actorTenantSuperAdminId));
      })
      .map((tenant) => ({
        id: String(tenant.id),
        label:
          String(tenant.label || '').trim() ||
          `${tenant.codigoJerarquia || 'SA'}${tenant.rolNombre ? ` · ${tenant.rolNombre}` : ''}${
            tenant.coporativoNombre ? ` · ${tenant.coporativoNombre}` : ''
          }`,
        meta: { scope: 'tenantSuperAdmin' as const },
      }));
  }, [jerarquiaSaCounters, tenantGlobalActor, tenantSuperAdminsJerarquiaCounters]);

  const endpointDisponibleParaScope = (endpoint: EndpointSpec) => {
    if (endpoint.actor === 'ambos') return true;
    if (endpoint.actor === 'tenantSuperAdmin') {
      // Crear tenant Administrador del sistema: solo ejecutable con scope tenantSuperAdmin (alineado al POST .../superAdmin/tenant/global)
      return actorTieneScopeTenantSuperAdmin;
    }
    if (endpoint.actor === 'tenantGlobal') {
      // en modo superAdmin este flujo lo ejecuta solo el DIOS (SA sin global)
      if (mode === 'superAdmin') return actorTieneScopeTenantSuperAdmin && !actorTieneGlobal;
      // Alineado a crearGlobalTenantService.resolverRolEjecutorAdminGlobal: POST .../usu/tenant/global admite SA o TG.
      return actorTieneScopeTenantSuperAdmin || actorTieneScopeTenantGlobal;
    }
    return false;
  };

  const esJwtSoloTenantSuperAdmin = useMemo(() => {
    const tsa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
    const tg = String(tenantGlobalActor?.tenantGlobalId || '').trim();
    const tc = String(tenantGlobalActor?.tenantCorporativoId || '').trim();
    return Boolean(tsa && !tg && !tc);
  }, [tenantGlobalActor]);

  const saJerarquiaTieneCorporativoEnCountersEfectivo = useMemo(
    (): boolean | undefined =>
      resolverSaJerarquiaTieneCorporativoEnCounters(
        String(tenantGlobalActor?.tenantSuperAdminId || '').trim(),
        jerarquiaSaCounters,
        tenantGlobalActor?.saJerarquiaTieneCorporativoEnCounters,
      ),
    [
      tenantGlobalActor?.tenantSuperAdminId,
      tenantGlobalActor?.saJerarquiaTieneCorporativoEnCounters,
      jerarquiaSaCounters,
    ],
  );

  const saJerarquiaConCorporativo = saJerarquiaTieneCorporativoEnCountersEfectivo === true;

  // Posición del SA del JWT (para el botón sincronizar)
  const saJerarquiaPosicion = useMemo(
    (): SaPosicionJerarquia =>
      resolverSaJerarquiaPosicion(
        String(tenantGlobalActor?.tenantSuperAdminId || '').trim(),
        jerarquiaSaCounters,
      ),
    [tenantGlobalActor?.tenantSuperAdminId, jerarquiaSaCounters],
  );

  // SA seleccionado en el dropdown "Actualizar Reglas" (puede ser diferente al JWT cuando SA-0001 edita regla de SA-0002)
  const saIdSeleccionadoActualizar = String(
    saFilterByEndpoint['tenant-actualizar-global-reglas'] || tenantGlobalActor?.tenantSuperAdminId || ''
  ).trim();

  // Posición jerárquica del SA seleccionado en el dropdown (para el denominador de vistas)
  const saJerarquiaPosicionDropdown = useMemo(
    (): SaPosicionJerarquia =>
      resolverSaJerarquiaPosicion(saIdSeleccionadoActualizar, jerarquiaSaCounters),
    [saIdSeleccionadoActualizar, jerarquiaSaCounters],
  );

  const [padreTotalVistas, setPadreTotalVistas] = useState<number | null>(null);

  useEffect(() => {
    if (!saJerarquiaPosicionDropdown.esHijo || !saIdSeleccionadoActualizar) {
      setPadreTotalVistas(null);
      return;
    }
    apiFetch(`/api/config/tenant/tipo/sincronizar/jerarquia/diff-padre?saId=${encodeURIComponent(saIdSeleccionadoActualizar)}`, { method: 'GET' })
      .then((res: any) => {
        const data = res?.data ?? null;
        if (data) {
          setDiffPadreData(data);
          setPadreTotalVistas(typeof data.totalRecursosPadre === 'number' ? data.totalRecursosPadre : null);
        }
      })
      .catch(() => {
        setPadreTotalVistas(null);
      });
  }, [saJerarquiaPosicionDropdown.esHijo, saIdSeleccionadoActualizar]);

  const saPuedeSincronizarJerarquia = saJerarquiaPosicion.esRaizPrimera || saJerarquiaPosicion.esHijo;

  const scopeJwtSaAlcanceJerarquiaValidado = useMemo(
    () =>
      esJwtSoloTenantSuperAdmin &&
      saJerarquiaTieneCorporativoEnCountersEfectivo !== undefined,
    [esJwtSoloTenantSuperAdmin, saJerarquiaTieneCorporativoEnCountersEfectivo],
  );

  const diosReglaDiosExecuteDisabledReason = (() => {
    if (!esJwtSoloTenantSuperAdmin) return undefined;
    if (saJerarquiaTieneCorporativoEnCountersEfectivo === undefined) {
      return 'Validando alcance JWT en tenantJerarquiaCounter… Recarga datos si el botón no se habilita.';
    }
    return undefined;
  })();

  const diosReglaDiosExecuteButtonClassName = diosReglaExecuteButtonClassName(
    scopeJwtSaAlcanceJerarquiaValidado,
    esJwtSoloTenantSuperAdmin,
  );

  const diosReglasDisponibleModal = (endpoint: EndpointSpec) => {
    if (!DIOS_REGLAS_ENDPOINT_IDS.has(endpoint.id)) return endpointDisponibleParaScope(endpoint);
    return endpointDisponibleParaScope(endpoint) && esJwtSoloTenantSuperAdmin;
  };

  const modoSoloLecturaReglasDios = (_endpoint: EndpointSpec) => false;

  /** Tenant/usuario/contexto: editable; el alcance lo valida backend (counters + configs NVL). */
  const diosReglaAlcanceFormularioEditable = (_endpoint: EndpointSpec) => true;

  const puedeMostrarToolbarSincronizarDios = (endpoint: EndpointSpec) =>
    endpoint.id === 'tenant-crear-dios-reglas' &&
    diosReglasDisponibleModal(endpoint) &&
    esJwtSoloTenantSuperAdmin &&
    scopeJwtSaAlcanceJerarquiaValidado;

  // RunEndpointOpts moved to parametrosGobernanzaTypes.ts

  const allowedSet = useMemo(
    () => (allowedEndpointIds ? new Set(allowedEndpointIds) : null),
    [allowedEndpointIds]
  );
  const availableEndpoints = useMemo(() => {
    // allowedEndpointIds overrides everything: muestra exactamente esos IDs sin filtros de ocultación
    if (allowedSet) return ENDPOINTS.filter((e) => allowedSet.has(e.id));
    return mode === 'rules'
      ? ENDPOINTS.filter((endpoint) => RULES_ENDPOINT_IDS.has(endpoint.id))
      : mode === 'superAdminRules'
        ? ENDPOINTS.filter((endpoint) => SUPERADMIN_RULES_ENDPOINT_IDS.has(endpoint.id))
        : mode === 'superAdmin'
          ? ENDPOINTS.filter((endpoint) => endpoint.actor === 'tenantSuperAdmin' && !RULES_ENDPOINT_IDS.has(endpoint.id) && !HIDDEN_ENDPOINT_IDS.has(endpoint.id))
          : ENDPOINTS.filter((endpoint) => !RULES_ENDPOINT_IDS.has(endpoint.id) && !HIDDEN_ENDPOINT_IDS.has(endpoint.id));
  }, [mode, allowedSet, parametrizacionUiSets]);
  const sectionCounts = useMemo(
    () =>
      availableEndpoints.reduce(
        (acc, endpoint) => {
          acc[endpoint.section] += 1;
          return acc;
        },
        { tenant: 0, permisos: 0, corporativo: 0, reglas: 0 } as Record<EndpointSection, number>
      ),
    [availableEndpoints]
  );
  const endpointsBySection = useMemo(() => {
    const esSA = Boolean(String(tenantGlobalActor?.tenantSuperAdminId || '').trim());
    const esTG = Boolean(String(tenantGlobalActor?.tenantGlobalId || '').trim()) && !esSA;
    const esCorp = Boolean(String(tenantGlobalActor?.tenantCorporativoId || '').trim()) && !esSA && !esTG;
    return availableEndpoints.filter((e) => e.section === activeSection && (!e.primary || !!allowedEndpointIds))
      .filter((e) => {
        // El GET «Listar tenantSuperAdmin (rama JWT)» vive en la pagina TenantSuperAdmin, no en el panel full
        if (e.id === 'tenant-listar-libres-superadmin' && mode === 'full') return false;
        if (activeSection === 'tenant' && (e.id === 'tenant-listar-libres-superadmin' || e.id === 'tenant-listar-libres-tenantglobal')) {
          return true;
        }
        if (e.actor === 'tenantSuperAdmin' && !esSA) return false;
        // Misma regla que endpointDisponibleParaScope (TG): visible para SA o TG, no solo corporativo.
        if (e.actor === 'tenantGlobal' && !esTG && !esSA) return false;
        // parametrizacion: solo SA y TG pueden asignar, no corporativo
        if (e.id === 'perm-usuario-tenant-global' && esCorp) return false;
        return true;
      })
      .filter((e) => {
        const q = endpointSearch.trim().toLowerCase();
        if (!q) return true;
        return (
          e.title.toLowerCase().includes(q) ||
          e.path.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.method.toLowerCase().includes(q)
        );
      });
  }, [activeSection, endpointSearch, tenantGlobalActor, availableEndpoints, mode]);

  const endpointNavItems = useMemo(() => {
    const seen = new Set<string>();
    const out: EndpointSpec[] = [];
    for (const p of visibleTenantPrimaryForms) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        out.push(p);
      }
    }
    for (const e of endpointsBySection) {
      if (!seen.has(e.id)) {
        seen.add(e.id);
        out.push(e);
      }
    }
    return out;
  }, [visibleTenantPrimaryForms, endpointsBySection]);

  const designRouteId = (searchParams.get(cardDesignQueryParam) ?? '').trim();
  const designRouteEndpoint = useMemo(
    () => (designRouteId ? ENDPOINTS.find((e) => e.id === designRouteId) ?? null : null),
    [designRouteId]
  );

  const gobernanzaCapabilityContext = useMemo<GobernanzaCapabilityContext>(
    () => ({
      mode,
      tenantSuperAdminId: tenantGlobalActor?.tenantSuperAdminId,
      tenantGlobalId: tenantGlobalActor?.tenantGlobalId,
      tenantCorporativoId: tenantGlobalActor?.tenantCorporativoId,
      saJerarquiaConCorporativo,
      saJerarquiaTieneCorporativoEnCounters: saJerarquiaTieneCorporativoEnCountersEfectivo,
      parametrizacionUi: parametrizacionUiSets,
    }),
    [mode, tenantGlobalActor, saJerarquiaConCorporativo, saJerarquiaTieneCorporativoEnCountersEfectivo, parametrizacionUiSets]
  );

  const inlineModuloResolved = useMemo((): GobernanzaModuloConfig | null => {
    if (inlineModuloConfigProp) return inlineModuloConfigProp;
    if (inlineModuloSlug) {
      const local = getGobernanzaModuloCatalogoLocal(inlineModuloSlug);
      return gobernanzaModuloOperativoStub(inlineModuloSlug, local
        ? { section: local.section, label: local.label, description: local.description }
        : undefined);
    }
    if (mode === 'full' && !allowedEndpointIds && !lockedSection && !isRulesMode && activeSection === 'tenant') {
      return gobernanzaModuloOperativoStub(GOBERNANZA_MODULO_TENANT.slug, {
        section: GOBERNANZA_MODULO_TENANT.section,
        label: GOBERNANZA_MODULO_TENANT.label,
        description: GOBERNANZA_MODULO_TENANT.description,
        submenuTitle: GOBERNANZA_MODULO_TENANT.submenuTitle,
        submenuHint: GOBERNANZA_MODULO_TENANT.submenuHint,
      });
    }
    if (mode === 'full' && !allowedEndpointIds && !isRulesMode && activeSection === 'permisos') {
      return gobernanzaModuloOperativoStub(GOBERNANZA_MODULO_PERMISOS.slug, {
        section: GOBERNANZA_MODULO_PERMISOS.section,
        label: GOBERNANZA_MODULO_PERMISOS.label,
        description: GOBERNANZA_MODULO_PERMISOS.description,
        submenuTitle: GOBERNANZA_MODULO_PERMISOS.submenuTitle,
        submenuHint: GOBERNANZA_MODULO_PERMISOS.submenuHint,
      });
    }
    if (mode === 'full' && !allowedEndpointIds && activeSection === 'reglas') {
      return gobernanzaModuloOperativoStub(GOBERNANZA_MODULO_REGLAS.slug, {
        section: GOBERNANZA_MODULO_REGLAS.section,
        label: GOBERNANZA_MODULO_REGLAS.label,
        description: GOBERNANZA_MODULO_REGLAS.description,
        submenuTitle: GOBERNANZA_MODULO_REGLAS.submenuTitle,
        submenuHint: GOBERNANZA_MODULO_REGLAS.submenuHint,
      });
    }
    return null;
  }, [inlineModuloConfigProp, inlineModuloSlug, mode, allowedEndpointIds, lockedSection, isRulesMode, activeSection]);

  const useModuloInlineFlow = Boolean(
    inlineModuloResolved && activeSection === inlineModuloResolved.section
  );

  const esModuloPoliticaBypass =
    inlineModuloSlug === GOBERNANZA_MODULO_POLITICA_BYPASS.slug
    || inlineModuloResolved?.slug === GOBERNANZA_MODULO_POLITICA_BYPASS.slug;

  const esModuloPoliticasRuntime =
    inlineModuloSlug === GOBERNANZA_MODULO_POLITICAS_RUNTIME.slug
    || inlineModuloResolved?.slug === GOBERNANZA_MODULO_POLITICAS_RUNTIME.slug;

  const esModuloPoliticaEspecial = esModuloPoliticaBypass || esModuloPoliticasRuntime;

  const inlineModuloMenu = useParametrosGobernanzaModuloMenu({
    moduloSlug: inlineModuloResolved?.slug,
    menuPath: resolvedMenuPath,
    preferredActionId,
    operacionesHub: effectiveOperacionesHub,
    tipoSection: effectiveTipoSection || null,
    enabled: Boolean(inlineModuloSlug) || useModuloInlineFlow,
    syncDefaultAction: !effectiveOperacionesHub && !resolvedMenuPath,
  });

  const resolveAccionMenuDesdeEndpointTab = useCallback(
    (endpoint: EndpointSpec) => {
      const tabId = String(endpoint?.id || '').trim();
      if (!tabId) return inlineModuloMenu.activeAccionMenu;
      return (
        inlineModuloMenu.menuAcciones?.find((a) => a.id === tabId)
        ?? inlineModuloMenu.menuAcciones?.find((a) => a.configSlug === tabId)
        ?? inlineModuloMenu.menuAcciones?.find(
          (a) =>
            resolverGobernanzaEndpointId({
              endpointId: a.endpointId,
              id: a.id,
              formularioComponent: a.formularioComponent,
              menuPath: a.menuPath,
            }) === tabId
        )
        ?? null
      );
    },
    [inlineModuloMenu.menuAcciones, inlineModuloMenu.activeAccionMenu]
  );

  const resolveEndpointInlineDesdeMenu = useCallback(
    (endpoint: EndpointSpec): EndpointSpec => {
      if (!useModuloInlineFlow) return endpoint;
      const accion = resolveAccionMenuDesdeEndpointTab(endpoint);
      const catalogId = resolverGobernanzaEndpointId({
        endpointId: accion?.endpointId,
        formularioComponent:
          accion?.formularioComponent ?? inlineModuloMenu.config.formularioComponent,
        menuPath: accion?.menuPath,
        id: endpoint.id,
      });
      const base =
        catalogId && ENDPOINTS_BY_ID[catalogId]
          ? ENDPOINTS_BY_ID[catalogId]
          : ENDPOINTS_BY_ID[endpoint.id]
            ? ENDPOINTS_BY_ID[endpoint.id]
            : null;
      if (!base) return endpoint;
      return endpointSpecOperativoDesdeCatalogo(base, {
        id: catalogId || base.id,
        title: String(accion?.shortLabel || accion?.title || base.title).trim(),
        description: String(accion?.description || base.description).trim(),
      });
    },
    [useModuloInlineFlow, resolveAccionMenuDesdeEndpointTab, inlineModuloMenu.config.formularioComponent]
  );

  const esFormularioHojaPublicado = useMemo(() => {
    if (effectiveOperacionesHub || !resolvedMenuPath) return false;
    const pathKey = normalizarGobernanzaMenuPath(resolvedMenuPath).toLowerCase();
    return (inlineModuloMenu.menuConfigs ?? []).some((cfg) => {
      const cfgPath = normalizarGobernanzaMenuPath(cfg.menuPath || cfg.frontPath || cfg.rutaPath)?.toLowerCase();
      return cfgPath && cfgPath === pathKey;
    });
  }, [effectiveOperacionesHub, resolvedMenuPath, inlineModuloMenu.menuConfigs]);

  const inlineModuloValidacion = useMemo(() => {
    if (!useModuloInlineFlow || !inlineModuloResolved) return null;
    const accion = inlineModuloMenu.activeAccionMenu;
    return validarGobernanzaModuloInline({
      config: {
        ...inlineModuloMenu.config,
        formularioComponent: accion?.formularioComponent ?? inlineModuloMenu.config.formularioComponent,
        menuPath: accion?.menuPath ?? inlineModuloMenu.config.menuPath,
        rutaId: accion?.rutaId ?? inlineModuloMenu.config.rutaId,
      },
      activeEndpoint: inlineModuloMenu.activeEndpoint,
      menuEndpointIds: inlineModuloMenu.endpoints.map((e) => e.id),
      menuDesdeApi: inlineModuloMenu.menuDesdeApi,
      menuLoading: inlineModuloMenu.menuLoading,
      paginaComponent: 'ParametrosGobernanza',
      accionMenu: accion,
      operacionesHub: effectiveOperacionesHub,
    });
  }, [useModuloInlineFlow, inlineModuloResolved, inlineModuloMenu, effectiveOperacionesHub]);

  const inlineModuloEndpointIds = useMemo(
    () => new Set(inlineModuloMenu.endpoints.map((e) => e.id)),
    [inlineModuloMenu.endpoints]
  );

  /** Endpoint activo en modal o en pestaña inline (Permisos, etc.). */
  const resolveActiveHerenciaEndpointId = (): string | null => {
    if (endpointModal?.id) return endpointModal.id;
    if (useModuloInlineFlow) {
      const inlineId = String(inlineModuloMenu.activeEndpoint?.id || '').trim();
      return inlineId || null;
    }
    return null;
  };

  const isHerenciaAdminPrecargaEndpoint = (endpointId: string): boolean =>
    endpointId === 'perm-admin-tenant-global' ||
    PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpointId) ||
    endpointId === 'perm-admin-tenant-global-listar' ||
    endpointId === 'perm-admin-tenant-global-desactivar' ||
    endpointId === 'perm-admin-tenant-global-eliminar' ||
    endpointId === 'perm-listar-herencias' ||
    endpointId === 'perm-usuario-tenant-global';

  const clearDesignRoute = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(cardDesignQueryParam);
        return next;
      },
      { replace: true }
    );
  }, [cardDesignQueryParam, setSearchParams]);

  const lastOpenedRouteEndpointRef = useRef<string | undefined>(undefined);

  const sincronizarReglasPermUsuarioTenantGlobal = async () => {
    const endpointId = 'perm-usuario-tenant-global';
    const tgSel = String(getFieldValue(endpointId, 'tenantGlobalScope') || '').trim();
    if (!tgSel) {
      toast.warning('Selecciona TenantGlobal antes de sincronizar reglas.');
      return;
    }

    setReglasHerenciaSyncBusy(true);
    try {
      const qsSync = new URLSearchParams();
      qsSync.set('tenantGlobal', tgSel);
      qsSync.set('incluirSuperAdmin', 'false');
      qsSync.set('soloActivos', 'true');
      qsSync.set('sincronizar', 'true');
      try {
        const syncPayload: any = await apiFetch(
          `/api/config/permisos/creacion/admin/tenant/global?${qsSync.toString()}`,
          { method: 'GET' }
        );
        const ctxSync = Number(syncPayload?.sincronizacionResumen?.contextosSincronizados ?? 0);
        if (ctxSync > 0) {
          toast.info(`Servidor alineó ${ctxSync} contexto(s) de herencia con reglas.`);
        }
      } catch (syncErr: any) {
        toast.warning(
          String(syncErr?.message || syncErr || 'GET sincronizar herencias no disponible; se sigue con recarga local.')
        );
      }

      await hydrateData({ force: true });

      const herenciasTg = await cargarHerenciasExistentesTG(tgSel);
      await cargarUsuariosParaEndpoint(endpointId, tgSel);

      setFieldValue(endpointId, 'heredaGlobal', '');
      setSuiteSelByEndpoint((prev) => ({ ...prev, [endpointId]: '' }));
      const usuariosSel = new Set((usuariosDestinoSel[endpointId] || []).map((id) => String(id).trim()).filter(Boolean));
      aplicarHeredaYCatalogoPermUsuario(
        endpointId,
        tgSel,
        herenciasTg,
        Array.from(usuariosSel)
      );
      setPermisos(endpointId, [{ vistaId: '', accionId: [] }]);

      toast.success(
        herenciasTg.length
          ? 'Catálogo actualizado: herencias y reglas releídas; checks según parametrización existente de usuarios seleccionados.'
          : 'Catálogo actualizado. Marca usuarios destino y herencia para continuar.'
      );
    } catch (error: any) {
      toast.error(String(error?.message || 'No se pudo sincronizar reglas'));
    } finally {
      setReglasHerenciaSyncBusy(false);
    }
  };

  useEffect(() => {
    const raw = initialEndpointId != null ? String(initialEndpointId).trim() : '';
    if (!raw) {
      lastOpenedRouteEndpointRef.current = undefined;
      return;
    }
    if (lastOpenedRouteEndpointRef.current === raw) return;
    const ep = availableEndpoints.find((e) => e.id === raw);
    if (!ep) return;
    lastOpenedRouteEndpointRef.current = raw;
    setActiveSection(ep.section);
    setEndpointModal(ep);
  }, [initialEndpointId, availableEndpoints]);

  const hydrateData = async (options?: { force?: boolean; bundles?: Set<HydrateBundle> }) => {
    const force = options?.force === true;
    const isBackground = Boolean(options?.bundles?.size);
    const now = Date.now();
    if (!force && !isBackground && hydrateSessionRef.current.promise) {
      return hydrateSessionRef.current.promise;
    }
    if (!force && !isBackground && now - hydrateSessionRef.current.finishedAt < HYDRATE_DEDUPE_MS) {
      return;
    }

    const task = (async () => {
    if (!isBackground) setLoadingData(true);
    try {
      let actorTenantSuperAdminId = '';
      let actorTenantGlobalId = '';
      let vistasResolved: Vista[] = [];
      let accionesResolved: Accion[] = [];

      const endpointId =
        String(
          inlineModuloMenu.activeEndpoint?.id ||
            endpointModal?.id ||
            preferredActionId ||
            initialEndpointId ||
            ''
        ).trim() || null;

      const priorityBundles =
        options?.bundles ??
        resolveHydrateBundles({
          mode,
          activeSection,
          endpointId,
          isRulesMode,
          operacionesHub: effectiveOperacionesHub,
        });

      if (force) {
        hydrateBundlesLoadedRef.current = new Set();
      }

      const bundlesToFetch = force
        ? priorityBundles
        : new Set([...priorityBundles].filter((b) => !hydrateBundlesLoadedRef.current.has(b)));

      let bundleResults: HydrateBundleResults = {};
      if (bundlesToFetch.size) {
        bundleResults = await fetchHydrateBundles(bundlesToFetch);
        bundlesToFetch.forEach((b) => hydrateBundlesLoadedRef.current.add(b));
      }

      const pickBundle = (
        primary: HydrateBundle,
        fallback?: HydrateBundle
      ): PromiseSettledResult<unknown> => {
        const hit = bundleResults[primary] ?? (fallback ? bundleResults[fallback] : undefined);
        return hit ?? { status: 'rejected', reason: new Error('bundle not loaded') };
      };

      const selectsRes = pickBundle('selects', 'selectsLite');
      const rutasRes = pickBundle('vistas');
      const accionesRes = pickBundle('acciones');
      const herenciasRes = pickBundle('herencias');
      const reglasRes = pickBundle('reglas');
      const tenantsDestinoRes = pickBundle('tenantsDestino');
      const contextosRes = pickBundle('contextos');
      const tenantCorpRes = pickBundle('tenantCorp');
      const jerarquiaRes = pickBundle('jerarquiaRutas');
      const jerarquiaUsuariosRes = pickBundle('jerarquiaUsuarios');
      const heredaOptionsMap = new Map<string, HeredaGlobalOption>();
      const heredaScopeMap: Record<string, HeredaScope> = {};

      if (selectsRes.status === 'fulfilled') {
        const data = (selectsRes.value as any)?.data || {};
        actorTenantSuperAdminId = String(data?.actor?.tenantSuperAdminId || '').trim();
        actorTenantGlobalId = String(data?.actor?.tenantGlobalId || '').trim();
        setTenantGlobalActor({
          rol: String(data?.actor?.rol || '').trim(),
          tenantGlobalId: data?.actor?.tenantGlobalId ? String(data.actor.tenantGlobalId) : null,
          tenantSuperAdminId: data?.actor?.tenantSuperAdminId ? String(data.actor.tenantSuperAdminId) : null,
          tenantCorporativoId: data?.actor?.tenantCorporativoId ? String(data.actor.tenantCorporativoId) : null,
          saJerarquiaTieneCorporativoEnCounters:
            typeof data?.actor?.saJerarquiaTieneCorporativoEnCounters === 'boolean'
              ? data.actor.saJerarquiaTieneCorporativoEnCounters
              : undefined,
          corporativoJerarquiaAutoId: data?.actor?.corporativoJerarquiaAutoId
            ? String(data.actor.corporativoJerarquiaAutoId)
            : null,
          corporativoIdsJerarquia: Array.isArray(data?.actor?.corporativoIdsJerarquia)
            ? data.actor.corporativoIdsJerarquia.map((x: unknown) => String(x)).filter(Boolean)
            : undefined,
          tipoTenantAutoId: data?.actor?.tipoTenantAutoId
            ? String(data.actor.tipoTenantAutoId)
            : null,
        });
        const enrichedSelects =
          bundlesToFetch.has('selectsLite') && !bundlesToFetch.has('selects')
            ? buildTenantGlobalSelectsFromApi(data)
            : await buildTenantGlobalSelectsEnriched(data);
        setTenantGlobalSelects(enrichedSelects);
        setTenantGlobalSelectsDebug(
          `Selects: niveles-config=${Array.isArray(data.nivelesGlobales) ? data.nivelesGlobales.length : 0}, tipos=${Array.isArray(data.tiposTenant) ? data.tiposTenant.length : 0}, dominios=${Array.isArray(data.dominios) ? data.dominios.length : 0}, dominiosScope=${Array.isArray(data.dominiosScope) ? data.dominiosScope.length : 0}, ownerTypes=${Array.isArray(data.ownerTypes) ? data.ownerTypes.length : 0}, acciones=${Array.isArray(data.acciones) ? data.acciones.length : 0}, roles=${Array.isArray(data.rolesMabs) ? data.rolesMabs.length : 0}, corporativos=${Array.isArray(data.corporativosDisponibles) ? data.corporativosDisponibles.length : 0}`
        );
        setTenantSuperAdminsJerarquiaCounters(
          Array.isArray(data.tenantSuperAdminsDesdeJerarquiaCounters) ? data.tenantSuperAdminsDesdeJerarquiaCounters : []
        );
        setJerarquiaSaCounters(
          Array.isArray(data.jerarquiaSaCounters)
            ? data.jerarquiaSaCounters
                .map((r: any) => ({
                  tenantSuperAdminId: String(r?.tenantSuperAdminId || '').trim(),
                  codigoJerarquia: r?.codigoJerarquia ?? null,
                  codigoPadre: r?.codigoPadre ?? null,
                  secuenciaJerarquia: r?.secuenciaJerarquia ?? null,
                  corporativoId: r?.corporativoId ?? null,
                }))
                .filter((r: SaJerarquiaCounterIndice) => Boolean(r.tenantSuperAdminId))
            : []
        );
      } else if (bundlesToFetch.has('selects') || bundlesToFetch.has('selectsLite')) {
        const reason = (selectsRes as PromiseRejectedResult)?.reason as any;
        const msg = String(
          reason?.message ||
          reason?.msg ||
          'No se pudieron cargar los selects de creacion tenant global'
        );
        toast.error(`Selects tenant global: ${msg}`);
        setTenantGlobalSelects({});
        setTenantGlobalActor({});
        setTenantSuperAdminsJerarquiaCounters([]);
        setJerarquiaSaCounters([]);
        setTenantGlobalSelectsDebug(`Error selects: ${msg}`);
      }

      {
        const allById = new Map<string, TenantGlobal>();
        const selectsDataJer = selectsRes.status === 'fulfilled' ? ((selectsRes.value as any)?.data || {}) : {};
        const jerarquiaTgMerge = Array.isArray(selectsDataJer.tenantGlobalesDesdeJerarquiaCounters)
          ? selectsDataJer.tenantGlobalesDesdeJerarquiaCounters
          : [];

        // Fuente principal para select JWT-driven (scope por rol/contexto).
        if (tenantsDestinoRes.status === 'fulfilled') {
          const destinoPayload: any = tenantsDestinoRes.value;
          const actorDesdeContexto =
            destinoPayload?.data?.actor ||
            destinoPayload?.actor ||
            null;
          if (actorDesdeContexto) {
            setTenantGlobalActor((prev) => ({
              rol: String(actorDesdeContexto?.rol || prev.rol || '').trim() || undefined,
              tenantGlobalId: actorDesdeContexto?.tenantGlobalId
                ? String(actorDesdeContexto.tenantGlobalId)
                : prev.tenantGlobalId ?? null,
              tenantSuperAdminId: actorDesdeContexto?.tenantSuperAdminId
                ? String(actorDesdeContexto.tenantSuperAdminId)
                : prev.tenantSuperAdminId ?? null,
              tenantCorporativoId: actorDesdeContexto?.tenantCorporativoId
                ? String(actorDesdeContexto.tenantCorporativoId)
                : prev.tenantCorporativoId ?? null,
              saJerarquiaTieneCorporativoEnCounters: prev.saJerarquiaTieneCorporativoEnCounters,
              corporativoJerarquiaAutoId: prev.corporativoJerarquiaAutoId ?? null,
              corporativoIdsJerarquia: prev.corporativoIdsJerarquia,
            }));
          }

          const destinoRows = Array.isArray(destinoPayload?.data)
            ? destinoPayload.data
            : pickArray(destinoPayload, ['items']).length > 0
              ? pickArray(destinoPayload, ['items'])
              : pickArray(destinoPayload?.data, ['items']);
          destinoRows.forEach((row: any) => {
            const id = String(row?.tenantGlobalId || row?.id || row?._id || row?.iud || '').trim();
            if (!id) return;
            const label = buildTenantGlobalContextLabel(row, id);
            allById.set(id, {
              id,
              label,
              corporativo: pickTenantCorporate(row),
              correo: pickTenantCorreo(row),
              tenantSuperAdmin: String(row?.tenantSuperAdmin || '').trim() || undefined,
              tenantGlobalAdmin: String(row?.tenantGlobalAdmin || '').trim() || undefined,
            });
          });
        }

        /** GET tenant/libres devuelve solo tenantSuperAdmin; no mezclar aquí (tenantGlobal viene de contexto + selects). */

        jerarquiaTgMerge.forEach((row: any) => {
          const id = String(row?.id || '').trim();
          if (!id) return;
          if (!allById.has(id)) {
            allById.set(id, {
              id,
              label: String(row?.label || id),
              corporativo: row?.coporativoNombre || undefined,
              correo: undefined,
              tenantSuperAdmin: row?.tenantSuperAdminId ? String(row.tenantSuperAdminId) : undefined,
              tenantGlobalAdmin: undefined,
            });
          }
        });

        let listaTenants: TenantGlobal[];

        /** Fuente autorizada para gobernanza: coincide con GET selects (counters + corporativo). */
        if (jerarquiaTgMerge.length > 0) {
          listaTenants = jerarquiaTgMerge
            .map((row: any) => {
              const id = String(row?.id || '').trim();
              if (!id) return null;
              const rich = allById.get(id);
              return {
                id,
                label: rich?.label || String(row?.label || id),
                corporativo: rich?.corporativo || row?.coporativoNombre || undefined,
                correo: rich?.correo,
                /** Preferir SA del GET selects (jerarquía JWT); el TG en Mongo puede tener otro tenantSuperAdmin (sub-SA). */
                tenantSuperAdmin:
                  (row?.tenantSuperAdminId ? String(row.tenantSuperAdminId) : '').trim() ||
                  rich?.tenantSuperAdmin ||
                  undefined,
                tenantGlobalAdmin: rich?.tenantGlobalAdmin,
              } as TenantGlobal;
            })
            .filter(Boolean) as TenantGlobal[];
        } else {
          listaTenants = Array.from(allById.values());
          const idsJerarquiaConCorp = new Set(
            jerarquiaTgMerge.map((row: any) => String(row?.id || '').trim()).filter(Boolean)
          );
          if (idsJerarquiaConCorp.size > 0) {
            listaTenants = listaTenants.filter((t) =>
              idsJerarquiaConCorp.has(String(t.id || '').trim())
            );
          }
        }

        /** Mismo universo TG que el organigrama «Usuarios tenant» (JWT + counters global / árbol). */
        if (jerarquiaUsuariosRes.status === 'fulfilled') {
          const jr = jerarquiaUsuariosRes.value as JerarquiaResponse;
          jerarquiaUsuariosRef.current = jr;
          const desdeOrg = tenantGlobalOptionsFromJerarquiaUsuarios(jr);
          const byId = new Map(listaTenants.map((t) => [String(t.id || '').trim(), t]));
          desdeOrg.forEach((row) => {
            const id = String(row.id || '').trim();
            if (!id) return;
            const prev = byId.get(id);
            if (!prev) {
              byId.set(id, {
                id,
                label: row.label,
                corporativo: row.corporativo,
                tenantSuperAdmin: row.tenantSuperAdmin,
                tenantGlobalAdmin: row.tenantGlobalAdmin,
              });
            } else {
              byId.set(id, {
                ...prev,
                label: prev.label && prev.label.length >= row.label.length ? prev.label : row.label,
                tenantSuperAdmin: prev.tenantSuperAdmin || row.tenantSuperAdmin,
                tenantGlobalAdmin: prev.tenantGlobalAdmin || row.tenantGlobalAdmin,
              });
            }
          });
          listaTenants = Array.from(byId.values());
        }

        /** Respaldo: registrados del GET selects (modo libre SA / árbol vacío). */
        const registradosRaw = Array.isArray(selectsDataJer.tenantGlobalesRegistrados)
          ? selectsDataJer.tenantGlobalesRegistrados
          : [];
        if (registradosRaw.length > 0) {
          const byIdReg = new Map(listaTenants.map((t) => [String(t.id || '').trim(), t]));
          registradosRaw.forEach((row: any) => {
            const id = String(row?.id || row?._id || '').trim();
            if (!id) return;
            const prev = byIdReg.get(id);
            const rol = String(row?.rol || 'TENANT').trim();
            const corp = String(row?.coporativoNombre || '').trim();
            const label = `${rol}${corp ? ` · ${corp}` : ''} · …${id.slice(-8)}`;
            if (!prev) {
              byIdReg.set(id, { id, label, corporativo: corp || undefined });
            } else if (!prev.label || prev.label === id) {
              byIdReg.set(id, { ...prev, label });
            }
          });
          listaTenants = Array.from(byIdReg.values());
        }

        setTenantGlobales(listaTenants);
      }

      if (tenantCorpRes.status === 'fulfilled') {
        const rowsCorp = pickArray(tenantCorpRes.value, ['data', 'items']);
        const corporativosDetectados = rowsCorp
          .map((row: any) => {
            const id = String(row?.id || row?._id || row?.iud || '').trim();
            const tenantGlobalId = String(
              row?.tenantGlobalId ||
              row?.tenantGlobal?._id ||
              row?.tenantGlobal ||
              ''
            ).trim();
            if (!id || !tenantGlobalId) return null;
            const label = String(row?.label || row?.name || row?.nombre || id).trim();
            return { id, tenantGlobalId, label: `${label} | ${id}` };
          })
          .filter(Boolean) as TenantCorporativoOption[];
        setTenantCorporativos(corporativosDetectados);
      }

      if (rutasRes.status === 'fulfilled') {
        const rows = pickArray(rutasRes.value, ['data', 'rutas', 'items']);
        vistasResolved = rows
          .filter((r: any) => r?.estadoRuta !== false)
          .map((r: any) => ({ id: String(r?.iud || r?._id || r?.id || ''), label: String(r?.label || r?.name || r?.path || r?.iud || r?._id || ''), path: String(r?.path || '') }))
          .filter((v: Vista) => v.id);
      }

      if (accionesRes.status === 'fulfilled') {
        const source = Array.isArray(accionesRes.value?.accionesSistema) ? accionesRes.value.accionesSistema : [];
        accionesResolved = source
          .filter((a: any) => a?.estadoAccion !== false)
          .map((a: any) => ({
            id: gobernanzaEntityId(a),
            label: safeAccionEtiqueta(a?.etiquetas, String(a?.method || gobernanzaEntityId(a) || '')),
            method: String(a?.method || ''),
          }))
          .filter((a: Accion) => a.id);
      }

      if (herenciasRes.status === 'fulfilled' && (!accionesResolved.length || accionesRes.status !== 'fulfilled')) {
        const herencias = Array.isArray(herenciasRes.value?.herencias) ? herenciasRes.value.herencias : [];
        const map = new Map<string, Accion>();
        herencias.forEach((h: any) => {
          const arr = Array.isArray(h?.acciones) ? h.acciones : [];
          arr.forEach((a: any) => {
            const id = String(a?._id || a || '');
            if (!id || map.has(id)) return;
            map.set(id, { id, label: safeAccionEtiqueta(a?.etiquetas, String(a?.method || id)), method: String(a?.method || '') });
          });
        });
        const fromHerencia = Array.from(map.values());
        if (fromHerencia.length) accionesResolved = fromHerencia;
      }

      // Fallback: usar acciones del endpoint de selects (accesible para todos los roles)
      if (!accionesResolved.length && selectsRes.status === 'fulfilled') {
        const selectsData = (selectsRes.value as any)?.data || {};
        const rawAcciones = Array.isArray(selectsData.acciones) ? selectsData.acciones : [];
        const mapped = rawAcciones
          .filter((a: any) => a?.estadoAccion !== false)
          .map((a: any) => ({
            id: gobernanzaEntityId(a),
            label: safeAccionEtiqueta(a?.etiquetas, String(a?.method || a?.label || gobernanzaEntityId(a) || '')),
            method: String(a?.method || ''),
          }))
          .filter((a: Accion) => a.id);
        if (mapped.length) accionesResolved = mapped;
      }

      if (herenciasRes.status === 'fulfilled' && (!vistasResolved.length || rutasRes.status !== 'fulfilled')) {
        const herencias = pickArray(herenciasRes.value, ['herencias', 'data']);
        const map = new Map<string, Vista>();
        herencias.forEach((h: any) => {
          const arr = Array.isArray(h?.vistas) ? h.vistas : [];
          arr.forEach((v: any) => {
            const id = String(v?._id || v || '');
            if (!id || map.has(id)) return;
            map.set(id, {
              id,
              label: String(v?.label || v?.name || v?.path || id),
              path: String(v?.path || ''),
            });
          });
        });
        if (map.size) vistasResolved = Array.from(map.values());
      }

      // Fallback SOLO para tenantSuperAdmin sin herencia dinÃ¡mica:
      // usar rutas de seguridad y acciones del sistema.
      const actorEsSoloSuperAdmin = !!actorTenantSuperAdminId && !actorTenantGlobalId;
      if (actorEsSoloSuperAdmin && !vistasResolved.length) {
        try {
          const fallbackRutas: any = await apiFetch('/api/seguridad/rutas/listarRutas/admin', { method: 'GET' });
          const rowsFallback = pickArray(fallbackRutas, ['data', 'items', 'rutas']);
          const mapped = rowsFallback
            .filter((r: any) => r?.estadoRuta !== false)
            .map((r: any) => ({ id: String(r?._id || r?.iud || r?.id || ''), label: String(r?.label || r?.name || r?.path || r?._id || ''), path: String(r?.path || '') }))
            .filter((v: Vista) => v.id);
          if (mapped.length) vistasResolved = mapped;
        } catch (_error) {
          // noop
        }
      }

      if (actorEsSoloSuperAdmin && !accionesResolved.length) {
        try {
          const fallbackAcciones: any = await apiFetch('/api/config/parametrizacion/widget/branding/acciones/publico', { method: 'GET' });
          const rowsFallback = Array.isArray(fallbackAcciones?.acciones) ? fallbackAcciones.acciones : [];
          const mapped = rowsFallback
            .filter((a: any) => a?.estadoAccion !== false)
            .map((a: any) => ({ id: String(a?._id || a?.id || ''), label: safeAccionEtiqueta(a?.etiquetas, String(a?.method || a?._id || '')), method: String(a?.method || '') }))
            .filter((a: Accion) => a.id);
          if (mapped.length) accionesResolved = mapped;
        } catch (_error) {
          // noop
        }
      }

      setVistas(vistasResolved);
      setAcciones(accionesResolved);

      if (herenciasRes.status === 'fulfilled') {
        const herencias = pickArray(herenciasRes.value, ['herencias', 'data', 'items']);
        setHerenciasUsuario(herencias);
        herencias.forEach((h: any) => {
          const heredaId = String(h?.heredaGlobal?._id || h?.heredaGlobal || '').trim();
          if (!heredaId || heredaOptionsMap.has(heredaId)) return;
          const vCount = Array.isArray(h?.vistas) ? h.vistas.length : 0;
          const aCount = Array.isArray(h?.acciones) ? h.acciones.length : 0;
          const tenantGlobalId = String(
            h?.tenantGlobal?._id ||
            h?.tenantGlobal?.id ||
            h?.tenantGlobal ||
            ''
          ).trim();
          const tenantCorporativoId = String(
            h?.tenantCorporativo?._id ||
            h?.tenantCorporativo?.id ||
            h?.tenantCorporativo ||
            ''
          ).trim();
          const tenantLabel = tenantGlobalId
            ? `TG:${tenantGlobalId}${tenantCorporativoId ? ` | TC:${tenantCorporativoId}` : ''}`
            : 'TG:-';
          const fuente = String(h?.fuenteHerencia || h?.fuente || '').toLowerCase();
          const tenantSuperRef = String(
            h?.tenantSuperTenant?._id ||
            h?.tenantSuperTenant ||
            h?.tenantSuperAdmin?._id ||
            h?.tenantSuperAdmin ||
            ''
          ).trim();
          const esScopeSuperAdmin =
            fuente.includes('superadmin') ||
            fuente.includes('dios') ||
            !!tenantSuperRef;
          heredaScopeMap[heredaId] = esScopeSuperAdmin ? 'tenantSuperAdmin' : 'tenantGlobal';
          const rolLabel = String(h?.rolId?.rol || '').trim();
          const heredaLabel = rolLabel
            ? `${rolLabel} | ${tenantLabel} | Vistas:${vCount} | Acciones:${aCount}`
            : `${heredaId.slice(0, 8)}... | ${tenantLabel} | Vistas:${vCount} | Acciones:${aCount}`;
          heredaOptionsMap.set(heredaId, {
            id: heredaId,
            label: heredaLabel,
          });
        });
      }

      if (reglasRes.status === 'fulfilled') {
        const reglasPayload = reglasRes.value as { meta?: { dominioPlataforma?: string | null }; data?: unknown };
        const metaDominio = String(reglasPayload?.meta?.dominioPlataforma || '').trim();
        if (metaDominio) setDominioPlataformaSistema(metaDominio);
        const rows = pickArray(reglasRes.value, ['data', 'reglas', 'items']);
        const contextoMap = new Map<string, ContextOption>();
        const rulesMap: Record<string, any> = {};
        setReglas(
          rows
            .map((r: any) => {
              const rid = resolveReglaPublicId(r);
              const ridRaw = resolveReglaLegacyId(r);
              if (rid) rulesMap[rid] = r;
              // Also index by ridRaw so lookups by raw _id work even when ridEncrypted differs
              if (ridRaw && ridRaw !== rid) rulesMap[ridRaw] = r;
              const tenantRef =
                (Array.isArray(r?.generacionGlovallNvlRoles) && r.generacionGlovallNvlRoles[0]) ||
                (Array.isArray(r?.generacionTenatGlobales) && r.generacionTenatGlobales[0]) ||
                '';
              const platformFlag = r?.securityPlatform === true ? 'DIOS' : 'TENANT';
              const rolMabs = String(
                tenantRef?.rolesMabs?.rol ||
                (Array.isArray(tenantRef?.rolesMabs) ? tenantRef.rolesMabs[0]?.rol : '') ||
                ''
              ).trim();
              const tenantLabel =
                rolMabs ||
                String(tenantRef?._id || tenantRef || '').trim() ||
                `Regla ${ridRaw.slice(0, 8) || rid.slice(0, 8)}`;
              const base = r?.nombre || r?.name || r?.titulo || `Tenant ${tenantLabel}`;
                const ctx = Array.isArray(r?.contextoDefi) ? r.contextoDefi : [];
                ctx.forEach((c: any) => {
                  const cid = String(c?._id || c || '').trim();
                  if (!cid || contextoMap.has(cid)) return;
                  const cname = String(c?.contexto || c?.name || c?.nombre || cid);
                  const tipoCtx = String(c?.contexto || c?.tipoContexto || '').trim();
                  contextoMap.set(cid, { id: cid, label: `${cname} | ${cid}`, tipoContexto: tipoCtx });
                });
                if (ridRaw && !heredaOptionsMap.has(ridRaw)) {
                  heredaOptionsMap.set(ridRaw, { id: ridRaw, label: `[REGLA] ${base} | ${ridRaw}` });
                  heredaScopeMap[ridRaw] = r?.securityPlatform === true ? 'tenantSuperAdmin' : 'tenantGlobal';
                }
                return rid ? { id: rid, label: `[${platformFlag}] ${base}` } : null;
              })
            .filter(Boolean) as ReglaOption[]
        );
        setRuleCatalog(rulesMap);
        setContextos(Array.from(contextoMap.values()));
      }

      setHeredaGlobalOptions(Array.from(heredaOptionsMap.values()));
      setHeredaGlobalScopeById(heredaScopeMap);

      if (contextosRes.status === 'fulfilled') {
        const rows = pickArray(contextosRes.value, ['data', 'contextos', 'items']);
        const fromApi = rows
          .filter((c: any) => c?.estado !== false)
          .map((c: any) => {
            const id = String(c?._id || c?.iud || '').trim();
            const nombre = String(c?.contexto || c?.name || c?.nombre || id);
            const tipoCtx = String(c?.contexto || '').trim();
            return id ? { id, label: `${nombre} | ${id}`, tipoContexto: tipoCtx } : null;
          })
          .filter(Boolean) as ContextOption[];
        if (fromApi.length) setContextos(fromApi);
      }
      if (jerarquiaRes.status === 'fulfilled') {
        const rows = pickArray(jerarquiaRes.value, ['data', 'rutas', 'items']);
        setRutasJerarquia(rows as NodoRuta[]);
      }

      if (!isBackground && !options?.bundles) {
        const deferred = [...ALL_HYDRATE_BUNDLES].filter(
          (b) => !hydrateBundlesLoadedRef.current.has(b)
        );
        if (deferred.length) {
          if (hydrateDeferredRef.current) clearTimeout(hydrateDeferredRef.current);
          hydrateDeferredRef.current = setTimeout(() => {
            void hydrateData({ bundles: new Set(deferred) });
          }, 300);
        }
      }
    } catch (error: any) {
      if (!isBackground) {
        toast.error(error?.message || 'No se pudo cargar contexto de gobernanza');
      }
    } finally {
      if (!isBackground) setLoadingData(false);
    }
    })();

    hydrateSessionRef.current.promise = task;
    try {
      await task;
    } finally {
      hydrateSessionRef.current.promise = null;
      hydrateSessionRef.current.finishedAt = Date.now();
    }
  };

  /** Firma estable de vistas+acciones de una fila herencia (validar si el servidor devolvió otra asignación). */
  const snapshotHerenciaPermisos = (row: any): string => {
    if (!row) return '';
    const v = (Array.isArray(row?.vistas) ? row.vistas : [])
      .map((x: any) => String(x?._id || x || '').trim())
      .filter(Boolean)
      .sort()
      .join(',');
    const a = (Array.isArray(row?.acciones) ? row.acciones : [])
      .map((x: any) => String(x?._id || x || '').trim())
      .filter(Boolean)
      .sort()
      .join(',');
    return `${v}::${a}`;
  };

  useEffect(() => { hydrateData(); }, []);

  useEffect(() => {
    const endpointId = String(inlineModuloMenu.activeEndpoint?.id || '').trim();
    if (!endpointId) return;
    if (!endpointNeedsSelectsLite(endpointId) && !endpointNeedsSelectsFull(endpointId)) return;
    const needFull = endpointNeedsSelectsFull(endpointId);
    const bundle: HydrateBundle = needFull ? 'selects' : 'selectsLite';
    if (hydrateBundlesLoadedRef.current.has(bundle)) return;
    void hydrateData({ bundles: new Set([bundle]) });
  }, [inlineModuloMenu.activeEndpoint?.id]);

  /** Jerarquía DIOS (4× jerarquia/opciones): solo modo full; no bloquea permisos SA. */
  useEffect(() => {
    if (mode !== 'full') return;
    if (diosJerarquiaLoadRef.current.done) return;
    if (diosJerarquiaLoadRef.current.promise) return;

    const task = (async () => {
      try {
        setDiosRecursosJerarquiaLoading(true);
        const { tree, flatFormularios, byFormId } = await cargarJerarquiaRecursosDesdeCounter();
        setDiosRecursosJerarquiaTree(tree);
        setDiosRecursosJerarquiaFlat(flatFormularios);
        setDiosRecursosByFormId(Object.fromEntries(byFormId.entries()));
        diosJerarquiaLoadRef.current.done = true;
      } catch {
        setDiosRecursosJerarquiaTree([]);
        setDiosRecursosJerarquiaFlat([]);
        setDiosRecursosByFormId({});
      } finally {
        setDiosRecursosJerarquiaLoading(false);
      }
    })();

    diosJerarquiaLoadRef.current.promise = task;
    void task.finally(() => {
      diosJerarquiaLoadRef.current.promise = null;
    });
  }, [mode]);

  useEffect(() => {
    if (isRulesMode && activeSection !== 'tenant') {
      setActiveSection('tenant');
    }
  }, [isRulesMode, activeSection]);
  useEffect(() => {
    if (isRulesMode) return;
    if (lockedSection) {
      setActiveSection(lockedSection);
      return;
    }
    setActiveSection(initialSection);
  }, [initialSection, isRulesMode, lockedSection]);

  useEffect(() => {
    if (endpointModal?.id === 'corp-crear-catalogo') {
      setCatalogItemsLoaded(false);
      void loadCatalogItems();
    }
  }, [endpointModal?.id]);

  const getFieldValue = (endpointId: string, key: string): string => formData[endpointId]?.[key] ?? '';
  const setFieldValue = (endpointId: string, key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [endpointId]: { ...(prev[endpointId] || {}), [key]: value } }));
  };
  useEffect(() => {
    const actorEsSoloTenantGlobal =
      !!String(tenantGlobalActor?.tenantGlobalId || '').trim() &&
      !String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
    const saConJerarquiaCorporativa = saJerarquiaConCorporativo;
    const unicaOpcionCorporativa = tenantGlobalSelects.coporativo?.length === 1
      ? tenantGlobalSelects.coporativo[0]
      : null;
    const corporativoAuto =
      unicaOpcionCorporativa ||
      (String(tenantGlobalActor?.corporativoJerarquiaAutoId || '').trim()
        ? {
            id: String(tenantGlobalActor.corporativoJerarquiaAutoId).trim(),
          }
        : null);

    const debeAutollenarCorporativo =
      !!corporativoAuto &&
      (actorEsSoloTenantGlobal || (saConJerarquiaCorporativa && !!tenantGlobalActor?.tenantSuperAdminId));

    if (!debeAutollenarCorporativo) return;

    const endpointIds = [
      'tenant-crear-global-usuario',
      'tenant-crear-global-admin',
      'tenant-superadmin-insert-documento',
      'tenant-actualizar-global',
    ];

    const tipoTenantAutoId = String(tenantGlobalActor?.tipoTenantAutoId || '').trim();

    setFormData((prev) => {
      let changed = false;
      const next = { ...prev };

      endpointIds.forEach((endpointId) => {
        const current = next[endpointId] || {};
        const selectedNvl = String(current.nvlGeneracionTenant || '').trim();
        if (!selectedNvl) return;

        const nvlOpt = (tenantGlobalSelects.nvlGeneracionTenant || []).find((opt) => opt.id === selectedNvl);
        const { esTenantGlobal, esTenantCorporativo } = resolverNvlGeneracionMeta(nvlOpt);
        if (!esTenantGlobal && !esTenantCorporativo) return;

        const patch: Record<string, string> = { ...current };
        let endpointChanged = false;

        if (corporativoAuto?.id) {
          const targetId = corporativoAuto.id;
          if (String(current.coporativo || '').trim() !== targetId) {
            patch.coporativo = targetId;
            endpointChanged = true;
          }
        }

        if (
          tipoTenantAutoId &&
          (esEndpointCreacionSaDocumento(endpointId) || endpointId === 'tenant-crear-global-admin') &&
          saConJerarquiaCorporativa &&
          String(current.tipo_tenant || '').trim() !== tipoTenantAutoId
        ) {
          patch.tipo_tenant = tipoTenantAutoId;
          endpointChanged = true;
        }

        if (endpointChanged) {
          next[endpointId] = patch;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [
    tenantGlobalActor,
    tenantGlobalSelects.coporativo,
    tenantGlobalSelects.nvlGeneracionTenant,
    saJerarquiaConCorporativo,
  ]);

  useEffect(() => {
    const nvlAutoSelectEndpoints = ['tenant-superadmin-insert-documento', 'tenant-crear-global-admin'];
    for (const endpointId of nvlAutoSelectEndpoints) {
      const currentNvl = getFieldValue(endpointId, 'nvlGeneracionTenant').trim();
      if (currentNvl) continue;

      const libre = (tenantGlobalSelects.nvlGeneracionTenant || []).find((opt) => {
        const { esLibre } = resolverNvlGeneracionMeta(opt);
        return esLibre;
      });
      if (libre?.id) {
        setFieldValue(endpointId, 'nvlGeneracionTenant', libre.id);
      }
    }
  }, [tenantGlobalSelects.nvlGeneracionTenant]);

  useEffect(() => {
    const endpointId = 'tenant-actualizar-global';
    const selectedId = String(formData?.[endpointId]?.id || '').trim();
    if (!selectedId) return;
    if (tenantUpdateTargets.some((opt) => opt.id === selectedId)) return;
    setFieldValue(endpointId, 'id', '');
  }, [formData, tenantUpdateTargets]);

  /** Precarga tipo tenant, owner, dominios, rol y acciones al elegir ID en PUT actualizar tenant global. */
  useEffect(() => {
    const endpointId = 'tenant-actualizar-global';
    if (endpointModal?.id !== endpointId) {
      tenantActualizarLoadedIdRef.current = '';
      return;
    }
    const selectedId = String(formData?.[endpointId]?.id || '').trim();
    if (!selectedId) {
      tenantActualizarLoadedIdRef.current = '';
      return;
    }
    if (!/^[0-9a-fA-F]{24}$/.test(selectedId)) return;
    if (selectedId === tenantActualizarLoadedIdRef.current) return;

    let cancelled = false;
    (async () => {
      setTenantActualizarPrefillLoading(true);
      try {
        const res: { data?: TenantGlobalFormularioDetalle } = await apiFetch(
          `/api/config/global/creacion/usu/tenant/superadmin/${selectedId}/formulario`,
          { method: 'GET' },
        );
        const detalle = (res?.data ?? res) as TenantGlobalFormularioDetalle;
        if (cancelled) return;
        tenantActualizarLabelsRef.current = detalle?.labels ?? {};
        const fields = tenantGlobalFormularioToFieldMap(detalle);
        tenantActualizarLoadedIdRef.current = selectedId;
        setFormData((prev) => ({
          ...prev,
          [endpointId]: {
            ...(prev[endpointId] || {}),
            id: selectedId,
            ...fields,
          },
        }));
      } catch (error) {
        if (!cancelled) {
          tenantActualizarLoadedIdRef.current = '';
          toast.error(
            error instanceof Error
              ? error.message.replace(/^\[\d+\]\s*/, '')
              : 'No se pudo cargar los datos del tenant seleccionado.',
          );
        }
      } finally {
        if (!cancelled) setTenantActualizarPrefillLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [endpointModal?.id, formData?.['tenant-actualizar-global']?.id]);

  useEffect(() => {
    if (endpointModal?.id === 'tenant-actualizar-global') return;
    tenantActualizarLoadedIdRef.current = '';
    tenantActualizarLabelsRef.current = {};
    setTenantActualizarPrefillLoading(false);
  }, [endpointModal?.id]);

  /**
   * Contexto view (tenant/interfaz). Excluye reglas cuyos contextos resueltos son solo `api`.
   */
  const reglaCumpleContextoViewReglasGlobales = (rule: any): boolean => {
    if (!rule) return false;
    const ctxArr = Array.isArray(rule.contextoDefi) ? rule.contextoDefi : [];
    const ids = ctxArr.map((c: any) => String(c?._id || c || '').trim()).filter(Boolean);
    if (ids.length === 0) return true;

    const tipos = ids.map((id) => {
      const meta = contextos.find((x) => x.id === id);
      return String(meta?.tipoContexto || '').trim().toLowerCase();
    });

    if (tipos.some((t) => t === 'view')) return true;

    const soloApi = tipos.length > 0 && tipos.every((t) => t === 'api');
    return !soloApi;
  };

  /** La regla DIOS solo puede aparecer cuando está relacionada con el tenant elegido. */
  const permiteReglaDiosEnActualizarReglasGlobales = (): boolean => true;

  const actualizarReglasGlobalesSoloLectura = (): boolean => false;

  /** Consulta reglas globales por rama — alcance vía counters; ya no bloquea por corporativo. */
  const consultaReglasGlobalesRamaCorporativo = (_endpointId: string): boolean => false;

  /**
   * Reglas válidas en crear/desactivar/eliminar globales: contexto view y securityPlatform false.
   */
  const reglaEsGlobalesTenantContextoView = (rule: any): boolean =>
    Boolean(rule && rule.securityPlatform !== true && reglaCumpleContextoViewReglasGlobales(rule));

  /**
   * MongoId del **tenant global** destino de la regla.
   * Solo `generacionGlovallNvlRoles` (documento tenantGlobal). No usar `generacionTenatGlobales`:
   * ahí va la referencia de generación / SuperAdmin — no coincide con el id del combo «Tenant global».
   */
  const resolveTenantGlobalIdFromRule = (rule: any): string => {
    if (!rule) return '';
    const g1 = Array.isArray(rule.generacionGlovallNvlRoles) ? rule.generacionGlovallNvlRoles[0] : null;
    if (!g1) return '';
    const direct = normalizePermisoRefId(g1);
    if (direct) return direct;
    for (const alt of collectGobernanzaRefIds(g1)) {
      if (alt && alt !== '[object Object]') return alt;
    }
    return '';
  };

  const resolveTenantGlobalLabelFromRule = (rule: any, tgId: string): string => {
    const g1 = Array.isArray(rule?.generacionGlovallNvlRoles) ? rule.generacionGlovallNvlRoles[0] : null;
    const rol = String(
      g1?.rolesMabs?.rol ||
        (Array.isArray(g1?.rolesMabs) ? g1?.rolesMabs[0]?.rol : '') ||
        '',
    ).trim();
    const corp = String(g1?.coporativo?.razon_social || g1?.coporativo?.titulo || '').trim();
    const base = String(rule?.nombre || rule?.name || rule?.titulo || '').trim();
    if (rol || corp) return `${rol || 'TENANT'}${corp ? ` · ${corp}` : ''} · …${tgId.slice(-8)}`;
    if (base) return `${base} · …${tgId.slice(-8)}`;
    return tgId;
  };

  /** Selección de checkboxes al cargar una regla global (vistas/recursos + acciones). */
  const buildCatalogSelectionFromReglaGlobal = (rule: any): CatalogSelection => {
    const vistas = new Set<string>();
    const accs = new Set<string>();
    if (!rule) return { vistas: [], acciones: [] };
    extractPermisoRefIds(rule.recurso).forEach((id) => vistas.add(id));
    extractPermisoRefIds(rule.accionesUsu).forEach((id) => accs.add(id));
    (Array.isArray(rule.permisos) ? rule.permisos : []).forEach((p: any) => {
      extractPermisoRefIds(p?.vistaId).forEach((id) => vistas.add(id));
      extractPermisoRefIds(p?.accionId).forEach((id) => accs.add(id));
    });
    return { vistas: Array.from(vistas), acciones: Array.from(accs) };
  };

  const getCatalogSelection = (endpointId: string): CatalogSelection =>
    catalogSelection[endpointId] ?? { vistas: [], acciones: [] };
  const setCatalogSelectionFor = (endpointId: string, next: CatalogSelection) => {
    setCatalogSelection((prev) => ({
      ...prev,
      [endpointId]: {
        vistas: next.vistas.map((id) => normalizePermisoRefId(id)).filter(Boolean),
        acciones: next.acciones.map((id) => normalizePermisoRefId(id)).filter(Boolean),
      },
    }));
  };
  /** MongoId del tenant global en flujos de reglas globales (crear / actualizar / desactivar / eliminar). */
  const resolveTenantGlobalParaReglasEndpoint = (endpointId: string): string => {
    if (
      endpointId === 'tenant-actualizar-global-reglas' ||
      endpointId === 'tenant-desactivar-global-reglas' ||
      endpointId === 'tenant-eliminar-global-reglas'
    ) {
      return String(tenantFilterByEndpoint[endpointId] || '').trim();
    }
    const tg = getFieldValue(endpointId, 'tenantGlobal').trim();
    if (!tg || isTenantSuperAdminScopeOption(tg)) return '';
    return tg;
  };

  /** SuperAdmin asociado al tenant global elegido en flujos crear/actualizar reglas globales. */
  const resolveSaParaReglasGlobalesEndpoint = (endpointId: string): string => {
    if (endpointId === 'tenant-actualizar-global-reglas') {
      const saElegido = String(saFilterByEndpoint[endpointId] || '').trim();
      if (saElegido) return saElegido;
    }
    const tg = resolveTenantGlobalParaReglasEndpoint(endpointId);
    const jwtSa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
    if (!tg) return jwtSa;
    return resolveTenantSuperAdminIdForHerenciaSelect(tg, tenantGlobales, jwtSa);
  };

  const endpointEsReglasGlobalesTenant = (endpointId: string): boolean =>
    endpointId === 'tenant-crear-global-reglas' || endpointId === 'tenant-actualizar-global-reglas';

  const getReglasFiltradasPorTenant = (endpointId: string): ReglaOption[] => {
    const filtroReglasGlobalesView =
      endpointId === 'tenant-actualizar-global-reglas' ||
      endpointId === 'tenant-desactivar-global-reglas' ||
      endpointId === 'tenant-eliminar-global-reglas' ||
      endpointId === 'tenant-crear-global-reglas';

    let base = reglas;
    if (filtroReglasGlobalesView) {
      base = reglas.filter((r) => {
        const rule = ruleCatalog[r.id];
        if (endpointId === 'tenant-actualizar-global-reglas') {
          return reglaEsActualizableEnReglasGlobalesEndpoint(rule, endpointId);
        }
        return reglaEsGlobalesTenantContextoView(rule);
      });
    }

    let tenantFiltro = tenantFilterByEndpoint[endpointId] || '';
    if (endpointId === 'tenant-crear-global-reglas') {
      tenantFiltro = resolveTenantGlobalParaReglasEndpoint(endpointId);
      if (!tenantFiltro) return [];
    }
    if (
      endpointId === 'tenant-actualizar-global-reglas' ||
      endpointId === 'tenant-desactivar-global-reglas' ||
      endpointId === 'tenant-eliminar-global-reglas'
    ) {
      tenantFiltro = resolveTenantGlobalParaReglasEndpoint(endpointId);
      if (endpointId === 'tenant-actualizar-global-reglas' && !tenantFiltro) {
        const saSel = String(
          saFilterByEndpoint[endpointId] || tenantGlobalActor?.tenantSuperAdminId || '',
        ).trim();
        if (!saSel) return [];
        return base.filter((r) => {
          const rule = ruleCatalog[r.id];
          return Boolean(rule && saCoincideReglaAlcance(rule, saSel));
        });
      }
    }

    if (!tenantFiltro) return base;

    const norm = (s: string) => String(s || '').trim().toLowerCase();
    const filtroN = norm(tenantFiltro);
    return base.filter((r) => {
      const rule = ruleCatalog[r.id];
      const tenantId = resolveTenantGlobalIdFromRule(rule);
      return tenantId && norm(tenantId) === filtroN;
    });
  };

  const normTenantIdReglas = (s: string) => String(s || '').trim().toLowerCase();

  const resolveSaIdsEquivalentes = (saId: string): Set<string> => {
    const out = new Set<string>();
    const seed = String(saId || '').trim();
    if (!seed) return out;
    out.add(seed);

    const meta = tenantSuperAdminsJerarquiaCounters.find((m) => String(m.id) === seed);
    const counter = jerarquiaSaCounters.find((c) => String(c.tenantSuperAdminId) === seed);
    const codigo = String(meta?.codigoJerarquia || counter?.codigoJerarquia || '').trim();

    if (meta?.id) out.add(String(meta.id));
    if (counter?.tenantSuperAdminId) out.add(String(counter.tenantSuperAdminId));

    if (codigo) {
      tenantSuperAdminsJerarquiaCounters
        .filter((m) => String(m.codigoJerarquia || '') === codigo)
        .forEach((m) => out.add(String(m.id)));
      jerarquiaSaCounters
        .filter((c) => String(c.codigoJerarquia || '') === codigo)
        .forEach((c) => out.add(String(c.tenantSuperAdminId)));
    }

    const codigosEnOut = new Set<string>();
    for (const id of out) {
      const meta = tenantSuperAdminsJerarquiaCounters.find((m) => String(m.id) === id);
      if (meta?.codigoJerarquia) codigosEnOut.add(String(meta.codigoJerarquia));
      const counter = jerarquiaSaCounters.find((c) => String(c.tenantSuperAdminId) === id);
      if (counter?.codigoJerarquia) codigosEnOut.add(String(counter.codigoJerarquia));
    }
    for (const cod of codigosEnOut) {
      tenantSuperAdminsJerarquiaCounters
        .filter((m) => String(m.codigoJerarquia || '') === cod)
        .forEach((m) => out.add(String(m.id)));
      jerarquiaSaCounters
        .filter((c) => String(c.codigoJerarquia || '') === cod)
        .forEach((c) => out.add(String(c.tenantSuperAdminId)));
    }

    Object.values(ruleCatalog).forEach((rule: any) => {
      (Array.isArray(rule?.generacionTenatGlobales) ? rule.generacionTenatGlobales : []).forEach(
        (g: any) => {
          const gids = collectGobernanzaRefIds(g);
          let enlaza = false;
          for (const gid of gids) {
            if (out.has(gid)) {
              enlaza = true;
              break;
            }
            for (const v of out) {
              if (gid === v || idsPermisoRefsCoinciden(g, v)) {
                enlaza = true;
                break;
              }
            }
            if (enlaza) break;
          }
          if (!enlaza && gids.size) {
            const counter = jerarquiaSaCounters.find((c) =>
              gids.has(String(c.tenantSuperAdminId || '').trim()),
            );
            if (counter?.codigoJerarquia && codigosEnOut.has(String(counter.codigoJerarquia))) {
              enlaza = true;
            }
          }
          if (enlaza) {
            gids.forEach((gid) => out.add(gid));
          }
        },
      );
    });

    return out;
  };

  const saCoincideReglaAlcance = (rule: any, saId: string): boolean => {
    const variantes = resolveSaIdsEquivalentes(saId);
    for (const v of variantes) {
      if (saIdCoincideEnRegla(rule, v)) return true;
    }
    const gens = Array.isArray(rule?.generacionTenatGlobales) ? rule.generacionTenatGlobales : [];
    for (const g of gens) {
      for (const gid of collectGobernanzaRefIds(g)) {
        if (variantes.has(gid)) return true;
      }
    }
    return false;
  };

  const resolveSaIdCanonicoParaReglas = (saId: string): string => {
    const variantes = resolveSaIdsEquivalentes(saId);
    const meta = tenantSuperAdminsJerarquiaCounters.find((m) => variantes.has(String(m.id)));
    if (meta?.id) return String(meta.id);
    const counter = jerarquiaSaCounters.find((c) => variantes.has(String(c.tenantSuperAdminId)));
    if (counter?.tenantSuperAdminId) return String(counter.tenantSuperAdminId);
    return String(saId || '').trim();
  };

  const reglaSinTenantGlobalMaterializado = (rule: any): boolean =>
    !resolveTenantGlobalIdFromRule(rule);

  /** En actualizar, el tipo de regla no decide el alcance: lo decide la relación con el tenant elegido. */
  const reglaEsActualizableEnReglasGlobalesEndpoint = (rule: any, _endpointId: string): boolean => {
    if (!reglaCumpleContextoViewReglasGlobales(rule)) return false;
    return true;
  };

  const findReglaJerarquiaPorSaEnCatalogo = (
    saId: string,
    catalog: Record<string, any>,
    endpointId: string = 'tenant-actualizar-global-reglas',
  ): ReglaOption | undefined => {
    const sa = String(saId || '').trim();
    if (!sa) return undefined;
    const toOption = (rule: any, publicId: string): ReglaOption | undefined => {
      if (!rule || !reglaEsActualizableEnReglasGlobalesEndpoint(rule, endpointId)) return undefined;
      if (!saCoincideReglaAlcance(rule, sa)) return undefined;
      const rid = resolveReglaPublicId(rule) || publicId;
      const ridRaw = resolveReglaLegacyId(rule);
      const base =
        rule?.nombre ||
        rule?.name ||
        rule?.titulo ||
        `Regla ${ridRaw.slice(0, 8) || rid.slice(0, 8)}`;
      const platformFlag = rule?.securityPlatform === true ? 'DIOS' : 'TENANT';
      return { id: rid, label: `[${platformFlag}] ${base}` };
    };
    for (const r of reglas) {
      const hit = toOption(catalog[r.id] ?? ruleCatalog[r.id], r.id);
      if (hit) return hit;
    }
    for (const [id, rule] of Object.entries(catalog)) {
      if (reglas.some((r) => r.id === id)) continue;
      const hit = toOption(rule, id);
      if (hit) return hit;
    }
    if (
      endpointId === 'tenant-actualizar-global-reglas' &&
      permiteReglaDiosEnActualizarReglasGlobales()
    ) {
      const plataforma = Object.values(catalog).find(
        (r) => r?.securityPlatform === true && saCoincideReglaAlcance(r, sa),
      );
      if (
        plataforma &&
        reglaSinTenantGlobalMaterializado(plataforma) &&
        reglaCumpleContextoViewReglasGlobales(plataforma)
      ) {
        return toOption(plataforma, resolveReglaPublicId(plataforma) || resolveReglaLegacyId(plataforma));
      }
    }
    return undefined;
  };

  const findReglaJerarquiaPorSa = (
    saId: string,
    catalogOverride?: Record<string, any>,
    endpointId: string = 'tenant-actualizar-global-reglas',
  ): ReglaOption | undefined => {
    const catalog = catalogOverride ?? ruleCatalog;
    return findReglaJerarquiaPorSaEnCatalogo(saId, catalog, endpointId);
  };

  /** SA padre inmediato según tenantjerarquiacounters (codigoPadre). */
  const resolverSaPadreJerarquia = (saId: string): string => {
    const sa = String(saId || '').trim();
    if (!sa || !jerarquiaSaCounters.length) return '';
    const row = jerarquiaSaCounters.find((c) => String(c.tenantSuperAdminId) === sa);
    const codigoPadre = String(row?.codigoPadre || '').trim();
    if (!codigoPadre) return '';
    const padre = jerarquiaSaCounters.find(
      (c) => String(c.codigoJerarquia || '').trim() === codigoPadre,
    );
    return String(padre?.tenantSuperAdminId || '').trim();
  };

  /** Regla techo para parametrizar: regla del SA padre o plataforma del propio SA si es raíz. */
  const findReglaTechoJerarquiaSa = (saId: string): any | undefined => {
    const sa = String(saId || '').trim();
    if (!sa) return undefined;
    const saPadre = resolverSaPadreJerarquia(sa);
    if (saPadre) {
      const optPadre = findReglaJerarquiaPorSa(saPadre);
      if (optPadre?.id && ruleCatalog[optPadre.id]) return ruleCatalog[optPadre.id];
      return findReglaPlataformaPorSuperAdmin(ruleCatalog, saPadre);
    }
    return findReglaPlataformaPorSuperAdmin(ruleCatalog, sa);
  };

  const seleccionarReglaJerarquiaPorSaActualizar = (
    endpointId: string,
    saId: string,
    catalogOverride?: Record<string, any>,
  ): void => {
    if (endpointId !== 'tenant-actualizar-global-reglas') return;
    if (actualizarReglasGlobalesSoloLectura()) return;
    const match = findReglaJerarquiaPorSa(saId, catalogOverride);
    if (!match?.id) return;
    setFieldValue(endpointId, 'x-regla-id', match.id);
    applyRuleToForm(endpointId, match.id, catalogOverride);
  };

  const findReglaViewPorTenantGlobal = (
    tenantId: string,
    saId?: string,
    catalogOverride?: Record<string, any>,
  ): ReglaOption | undefined => {
    const filtroN = normTenantIdReglas(tenantId);
    if (!filtroN) return undefined;
    const sa = String(saId || '').trim();
    const catalog = catalogOverride ?? ruleCatalog;

    const toOption = (rule: any): ReglaOption | undefined => {
      if (!rule || !reglaCumpleContextoViewReglasGlobales(rule)) return undefined;
      const tid = resolveTenantGlobalIdFromRule(rule);
      if (!tid || normTenantIdReglas(tid) !== filtroN) return undefined;
      if (sa && !saCoincideReglaAlcance(rule, sa)) return undefined;
      const rid = resolveReglaPublicId(rule) || resolveReglaLegacyId(rule);
      if (!rid) return undefined;
      const platformFlag = rule?.securityPlatform === true ? 'DIOS' : 'TENANT';
      const base = rule?.nombre || rule?.name || rule?.titulo || `Regla ${rid.slice(0, 8)}`;
      return { id: rid, label: `[${platformFlag}] ${base}` };
    };

    for (const r of reglas) {
      const hit = toOption(catalog[r.id] ?? ruleCatalog[r.id]);
      if (hit) return hit;
    }
    for (const rule of Object.values(catalog)) {
      const hit = toOption(rule);
      if (hit) return hit;
    }
    if (!sa) return undefined;
    return reglas.map((r) => toOption(catalog[r.id] ?? ruleCatalog[r.id])).find(Boolean);
  };

  const tenantGlobalesOpcionesDesdeReglasPorSa = (
    saId: string,
    catalogOverride?: Record<string, any>,
  ): TenantGlobal[] => {
    const sa = String(saId || '').trim();
    if (!sa) return [];
    const catalog = catalogOverride ?? ruleCatalog;
    const byId = new Map<string, TenantGlobal>();
    const seenRuleKeys = new Set<string>();

    Object.values(catalog).forEach((rule: any) => {
      const ruleKey = String(rule?.rid || rule?._id || rule?.iud || '').trim();
      if (ruleKey && seenRuleKeys.has(ruleKey)) return;
      if (ruleKey) seenRuleKeys.add(ruleKey);

      if (!saCoincideReglaAlcance(rule, sa)) return;
      if (!reglaEsGlobalesTenantContextoView(rule)) return;

      const tgId = resolveTenantGlobalIdFromRule(rule);
      if (!tgId) return;

      const fromState = tenantGlobales.find((t) => String(t.id || '').trim() === tgId);
      const fromRef = (tenantGlobalSelects.tenantGlobalRef || []).find((r) => String(r.id || '').trim() === tgId);
      byId.set(
        tgId,
        fromState ||
          (fromRef
            ? {
                id: tgId,
                label: String(fromRef.label || tgId),
                tenantSuperAdmin: sa,
              }
            : {
                id: tgId,
                label: resolveTenantGlobalLabelFromRule(rule, tgId),
                tenantSuperAdmin: sa,
              }),
      );
    });

    return Array.from(byId.values());
  };

  const seleccionarReglaParametrizadaPorTenantActualizar = (
    endpointId: string,
    tenantId: string,
    catalogOverride?: Record<string, any>,
  ): void => {
    if (endpointId !== 'tenant-actualizar-global-reglas') return;
    const tg = String(tenantId || '').trim();
    if (!tg || isTenantSuperAdminScopeOption(tg)) return;
    const saSel = String(
      saFilterByEndpoint[endpointId] || tenantGlobalActor?.tenantSuperAdminId || '',
    ).trim();
    const match = findReglaViewPorTenantGlobal(tg, saSel, catalogOverride);
    if (!match?.id) return;
    setFieldValue(endpointId, 'x-regla-id', match.id);
    applyRuleToForm(endpointId, match.id, catalogOverride);
  };

  const ensureReglaSeleccionadaParaVista = (endpointId: string): void => {
    if (
      endpointId !== 'tenant-actualizar-global-reglas' &&
      endpointId !== 'tenant-desactivar-global-reglas' &&
      endpointId !== 'tenant-eliminar-global-reglas'
    )
      return;
    const tenantFiltro =
      endpointId === 'tenant-actualizar-global-reglas'
        ? resolveTenantGlobalParaReglasEndpoint(endpointId)
        : '';
    if (endpointId === 'tenant-actualizar-global-reglas') {
      if (!tenantFiltro) return;
      const currentRuleId = getFieldValue(endpointId, 'x-regla-id').trim();
      if (currentRuleId) {
        const rule = ruleCatalog[currentRuleId];
        const tid = resolveTenantGlobalIdFromRule(rule);
        if (tid && normTenantIdReglas(tid) === normTenantIdReglas(tenantFiltro)) return;
      }
      seleccionarReglaParametrizadaPorTenantActualizar(endpointId, tenantFiltro);
      return;
    }

    if (getFieldValue(endpointId, 'x-regla-id').trim()) return;

    const firstRule = getReglasFiltradasPorTenant(endpointId)[0];
    if (!firstRule?.id) return;

    setFieldValue(endpointId, 'x-regla-id', firstRule.id);
  };
  const toggleCatalogItem = (endpointId: string, key: 'vistas' | 'acciones', id: string, checked: boolean) => {
    if (consultaReglasGlobalesRamaCorporativo(endpointId)) return;
    if (checked && endpointId === 'perm-usuario-tenant-global') {
      const rule = resolveReglaTechoPermUsuario(endpointId);
      if (rule) {
        const getId = (value: unknown): string => String((value as { _id?: string; iud?: string })?._id || (value as { iud?: string })?.iud || value || '').trim();
        const techoSet = new Set(
          (key === 'vistas'
            ? (Array.isArray(rule?.recurso) ? rule.recurso : [])
            : (Array.isArray(rule?.accionesUsu) ? rule.accionesUsu : [])
          ).map((item) => getId(item)).filter(Boolean)
        );
        if (!techoSet.has(id)) return;
      }
    }
    if (checked && key === 'vistas') {
      ensureReglaSeleccionadaParaVista(endpointId);
    }

    const current = getCatalogSelection(endpointId);
    const set = new Set(current[key]);
    if (checked) set.add(id); else set.delete(id);
    setCatalogSelectionFor(endpointId, { ...current, [key]: Array.from(set) });
  };
  const getBulkAllMode = (endpointId: string): boolean => !!bulkAllMode[endpointId];
  const setBulkAllFor = (endpointId: string, enabled: boolean) => {
    setBulkAllMode((prev) => ({ ...prev, [endpointId]: enabled }));
  };
  const politicaRuntimeId = (politica: PoliticaRuntime): string => gobernanzaEntityId(politica);
  const politicaRuntimeLabel = (politica: PoliticaRuntime): string => {
    const codigo = String(politica.codigo || '').trim();
    const dominio = String(politica.dominio || '').trim();
    const tipo = String(politica.tipo || '').trim();
    return [codigo, dominio, tipo].filter(Boolean).join(' · ') || politicaRuntimeId(politica);
  };
  const parsePoliticasRuntimeIdsFromRule = (rule: Record<string, unknown> | null | undefined): string[] => {
    const lista = Array.isArray(rule?.politicasRuntimeIds) ? rule.politicasRuntimeIds : [];
    return lista
      .map((item) => {
        if (typeof item === 'string') return gobernanzaEntityId(item).trim();
        if (item && typeof item === 'object') {
          return gobernanzaEntityId(item as { iud?: string; _id?: string }).trim();
        }
        return '';
      })
      .filter(Boolean);
  };
  const appendPoliticasRuntimeIdsToBody = (endpointId: string, body: Record<string, unknown>) => {
    const ids = getReglasPoliticasRuntimeSel(endpointId)
      .map((id) => gobernanzaEntityId(id))
      .filter(Boolean);
    body.politicasRuntimeIds = ids;
  };
  const getReglasPoliticasRuntimeSel = (endpointId: string): string[] => (
    reglasPoliticasRuntimeSel[endpointId] ?? []
  );
  const toggleReglaPoliticaRuntime = (endpointId: string, politicaId: string, checked: boolean) => {
    setReglasPoliticasRuntimeSel((prev) => {
      const current = new Set(prev[endpointId] ?? []);
      if (checked) current.add(politicaId);
      else current.delete(politicaId);
      return { ...prev, [endpointId]: Array.from(current) };
    });
  };
  const getDiosReglaTenantsSel = (endpointId: string): string[] => diosReglaTenantsSel[endpointId] ?? [];
  const setDiosReglaTenantsSelFor = (endpointId: string, tenantIds: string[]) => {
    const { tenants: normalized, reducido, dominioComun } = normalizarTenantsSaMismoDominio(
      tenantIds,
      dominioPorSaMap,
    );
    if (reducido) {
      toast.warning(
        'Solo puedes elegir varios tenants SuperAdmin si comparten el mismo dominio. Se dejó el último seleccionado.',
      );
    }
    setDiosReglaTenantsSel((prev) => ({ ...prev, [endpointId]: normalized }));
    setFieldValue(endpointId, 'tenantSuperAdmin', normalized[0] || '');
    if (dominioComun) {
      setFieldValue(endpointId, 'dominioTenatGlobales', dominioComun);
    }
    setDiosReglaUsuariosPorTenantSel((prev) => {
      const current = prev[endpointId] ?? {};
      const next: Record<string, string[]> = {};
      for (const id of normalized) {
        if (current[id]?.length) next[id] = current[id];
      }
      return { ...prev, [endpointId]: next };
    });
  };
  const getDiosReglaUsuariosPorTenantSel = (endpointId: string): Record<string, string[]> => (
    diosReglaUsuariosPorTenantSel[endpointId] ?? {}
  );
  const setDiosReglaUsuariosPorTenantFor = (endpointId: string, saId: string, userIds: string[]) => {
    setDiosReglaUsuariosPorTenantSel((prev) => ({
      ...prev,
      [endpointId]: { ...(prev[endpointId] ?? {}), [saId]: userIds },
    }));
  };
  /** Reglas DIOS: solo rama JWT + descendientes (sin DIOS padre ni ramas hermanas). */
  const resolveDiosReglaSaMetasVisibles = (): SaJerarquiaMeta[] => {
    const anclaSa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
    if (!anclaSa) return [];
    if (!jerarquiaSaCounters.length) {
      return tenantSuperAdminsJerarquiaCounters.filter((m) => String(m?.id || '').trim() === anclaSa);
    }
    return filtrarSaJerarquiaMetaRamaDescendiente(
      tenantSuperAdminsJerarquiaCounters,
      jerarquiaSaCounters,
      anclaSa,
    );
  };
  const buildDiosReglaSaMetasMap = (): Map<string, DiosReglaSaMeta> => {
    const counterBySa = new Map(
      jerarquiaSaCounters.map((r) => [String(r.tenantSuperAdminId || '').trim(), r]),
    );
    const m = new Map<string, DiosReglaSaMeta>();
    resolveDiosReglaSaMetasVisibles().forEach((s) => {
      const id = String(s?.id || '').trim();
      if (!id) return;
      const counter = counterBySa.get(id);
      m.set(id, {
        ...(s as DiosReglaSaMeta),
        codigoJerarquia: s.codigoJerarquia || counter?.codigoJerarquia || null,
        nvlGeneracionTenantId:
          (s as DiosReglaSaMeta).nvlGeneracionTenantId ??
          (s as SaJerarquiaMeta).nvlGeneracionTenantId ??
          null,
        securityPlatform:
          typeof (s as DiosReglaSaMeta).securityPlatform === 'boolean'
            ? (s as DiosReglaSaMeta).securityPlatform
            : typeof (s as SaJerarquiaMeta).securityPlatform === 'boolean'
              ? (s as SaJerarquiaMeta).securityPlatform
              : undefined,
      });
    });
    const jwtSa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
    if (jwtSa && !m.has(jwtSa)) {
      const counter = counterBySa.get(jwtSa);
      const fromList = tenantSuperAdminsJerarquiaCounters.find((x) => String(x?.id) === jwtSa);
      m.set(jwtSa, {
        id: jwtSa,
        ...(fromList as DiosReglaSaMeta | undefined),
        codigoJerarquia: fromList?.codigoJerarquia || counter?.codigoJerarquia || null,
        rolNombre: fromList?.rolNombre ?? null,
        coporativoNombre: fromList?.coporativoNombre ?? null,
      });
    }
    return m;
  };

  const renderGobernanzaFlowHelpExtra = useCallback(
    (endpointId: string) => {
      if (endpointId !== 'tenant-crear-dios-reglas' && endpointId !== 'tenant-actualizar-dios-reglas') {
        return null;
      }
      const metas = Array.from(buildDiosReglaSaMetasMap().values());
      const rows = buildDiosReglaSaAccesoHelpRows(
        metas,
        jerarquiaSaCounters,
        String(tenantGlobalActor?.tenantSuperAdminId || '').trim(),
      );
      return (
        <DiosReglaAccesoFullHelpSection
          rows={rows}
          jwtScopeFullValidado={scopeJwtSaAlcanceJerarquiaValidado}
          jwtSaTieneCorporativo={saJerarquiaTieneCorporativoEnCountersEfectivo}
        />
      );
    },
    [
      tenantSuperAdminsJerarquiaCounters,
      jerarquiaSaCounters,
      tenantGlobalActor?.tenantSuperAdminId,
      saJerarquiaTieneCorporativoEnCountersEfectivo,
      scopeJwtSaAlcanceJerarquiaValidado,
    ],
  );

  const gobernanzaFlowHelpContextValue = useMemo(
    () => ({ renderHelpExtra: renderGobernanzaFlowHelpExtra }),
    [renderGobernanzaFlowHelpExtra],
  );

  const validarAlcanceDiosRegla = (endpointId: string): void => {
    const metaById = buildDiosReglaSaMetasMap();
    const jwtSa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
    const tenants = getDiosReglaTenantsSel(endpointId);
    const effectiveTenants = tenants.length ? tenants : jwtSa ? [jwtSa] : [];
    if (!effectiveTenants.length) {
      throw new Error('Selecciona al menos un Tenant SuperAdmin para la regla DIOS.');
    }
    const usuariosMap = getDiosReglaUsuariosPorTenantSel(endpointId);
    for (const saId of effectiveTenants) {
      const meta = metaById.get(saId);
      if (!requiereSelectorUsuariosSa(meta)) continue;
      const sel = usuariosMap[saId] ?? [];
      if (!sel.length) {
        throw new Error(
          `El tenant ${formatSaUsuarioParametrizarLabel(meta || { id: saId })} tiene varios usuarios: elige al menos uno.`,
        );
      }
    }
  };
  const actorEsTenantSuperAdmin = (): boolean =>
    Boolean(String(tenantGlobalActor?.tenantSuperAdminId || '').trim());
  const actorEsTenantGlobalScope = (): boolean =>
    Boolean(String(tenantGlobalActor?.tenantGlobalId || '').trim()) &&
    !Boolean(String(tenantGlobalActor?.tenantSuperAdminId || '').trim());
  const actorEsTenantCorporativoScope = (): boolean =>
    Boolean(String(tenantGlobalActor?.tenantCorporativoId || '').trim()) &&
    !actorEsTenantSuperAdmin() &&
    !actorEsTenantGlobalScope();
  /** Regla seleccionada en ruleCatalog: heredaGlobal / herenciaAsociada o x-regla-id (tenant globales). */
  const getSelectedRuleCatalogKey = (endpointId: string): string => {
    const usaXReglaId =
      endpointId === 'tenant-actualizar-global-reglas' ||
      endpointId === 'tenant-desactivar-global-reglas' ||
      endpointId === 'tenant-eliminar-global-reglas';
    if (usaXReglaId) {
      const rid = getFieldValue(endpointId, 'x-regla-id').trim();
      return rid && ruleCatalog[rid] ? rid : '';
    }
    if (endpointId === 'tenant-crear-global-reglas') {
      const plantilla = getFieldValue(endpointId, 'reglaPlantillaId').trim();
      if (plantilla && ruleCatalog[plantilla]) return plantilla;
    }
    const heredaSelVal =
      getFieldValue(endpointId, 'heredaGlobal').trim() ||
      getFieldValue(endpointId, 'herenciaAsociada').trim();
    return heredaSelVal && ruleCatalog[heredaSelVal] ? heredaSelVal : '';
  };

  /** Vistas IDs declaradas en la regla plantilla (crear global): deben verse en el árbol aunque no coincidan con `vistas` API. */
  const getExtraVistaIdsReglaPlantillaCrear = (endpointId: string): Set<string> => {
    if (endpointId !== 'tenant-crear-global-reglas') return new Set();
    const pk = getFieldValue(endpointId, 'reglaPlantillaId').trim();
    const r = pk && ruleCatalog[pk] ? ruleCatalog[pk] : null;
    if (!r) return new Set();
    return new Set(buildCatalogSelectionFromReglaGlobal(r).vistas.map((id) => String(id)));
  };

  const getCatalogoVistaIdsRelacionadas = (endpointId: string, suiteId = ''): string[] => {
    const { vistasCatalogo } = getPermisosCatalog(endpointId);
    const esReglaSeleccionada = !!getSelectedRuleCatalogKey(endpointId);
    const extraIdsPlantillaCrear = getExtraVistaIdsReglaPlantillaCrear(endpointId);
    const esSA = actorEsTenantSuperAdmin();
    const forzarTechoCatalogo = endpointId === 'perm-usuario-tenant-global';
    const esReglasGlobalesTenant = endpointEsReglasGlobalesTenant(endpointId);
    const tgSelReglas = esReglasGlobalesTenant ? resolveTenantGlobalParaReglasEndpoint(endpointId) : '';
    const tenantGlobalElegidoReglas = Boolean(
      esReglasGlobalesTenant && tgSelReglas && !isTenantSuperAdminScopeOption(tgSelReglas)
    );
    const allowedVistaIds: Set<string> = esSA
      ? (forzarTechoCatalogo || esReglasGlobalesTenant
          ? new Set(vistasCatalogo.map((v) => v.id))
          : new Set<string>())
      : new Set(vistasCatalogo.map((v) => v.id));
    const catalogIds = new Set(vistasCatalogo.map((v) => v.id));
    const hasCatalogFilter = catalogIds.size > 0;
    const vistaIdsActivos = new Set(vistas.map((v) => v.id));
    const suitesFuente = suiteId
      ? rutasJerarquia.filter((suite) => String(getEntityId(suite)) === String(suiteId))
      : rutasJerarquia.filter((suite) => Array.isArray(suite.children) && suite.children.length > 0);
    const relacionadas = new Set<string>();

    const getFormulariosDeModulo = (modulo: any) =>
      collectAllNodes(modulo.children || []).filter((f) => {
        const fid = getEntityId(f);
        if (!fid) return false;
        if (allowedVistaIds.size > 0 && !vistaIdMatchesCatalog(fid, vistasCatalogo) && !allowedVistaIds.has(fid)) {
          let allowed = false;
          allowedVistaIds.forEach((aid) => {
            if (idsPermisoRefsCoinciden(aid, fid)) allowed = true;
          });
          if (!allowed) return false;
        }
        if ((esReglaSeleccionada || tenantGlobalElegidoReglas) && esReglasGlobalesTenant) {
          return (
            vistaIdMatchesCatalog(fid, vistasCatalogo) ||
            extraIdsPlantillaCrear.has(fid) ||
            esNodoFormularioLike(f)
          );
        }
        if (esReglaSeleccionada) {
          return (
            vistaIdsActivos.has(fid) ||
            esNodoFormularioLike(f) ||
            extraIdsPlantillaCrear.has(fid)
          );
        }
        return esNodoFormularioLike(f) || (hasCatalogFilter && catalogIds.has(fid));
      });

    suitesFuente.forEach((suite) => {
      getModuloNodes(suite).forEach((modulo) => {
        getFormulariosDeModulo(modulo).forEach((form) => {
          const fid = getEntityId(form);
          if (!fid) return;
          relacionadas.add(fid);
        });
      });
    });

    extraIdsPlantillaCrear.forEach((vid) => relacionadas.add(vid));

    if (!relacionadas.size && !suiteId) {
      vistasCatalogo.forEach((vista) => {
        const fid = String(vista?.id || '').trim();
        if (fid) relacionadas.add(fid);
      });
    }

    // Parametrización global admin y asignación por usuario: el denominador debe incluir todas las vistas
    // del catálogo plano (recursos en regla/herencia aún no colgados del árbol de suites → evita 50/48).
    if (
      endpointId === 'perm-admin-tenant-global' ||
      endpointId === 'perm-usuario-tenant-global' ||
      endpointId === 'tenant-crear-global-reglas' ||
      endpointId === 'tenant-actualizar-global-reglas' ||
      PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpointId)
    ) {
      vistasCatalogo.forEach((vista) => {
        const fid = String(vista?.id || '').trim();
        if (fid) relacionadas.add(fid);
      });
    }

    // Asignación por usuario: incluir selección actual solo si está dentro del techo de regla.
    if (endpointId === 'perm-usuario-tenant-global') {
      const rule = resolveReglaTechoPermUsuario(endpointId);
      const techoVistas = rule
        ? new Set(
            (Array.isArray(rule?.recurso) ? rule.recurso : [])
              .map((v: unknown) => String((v as { _id?: string; iud?: string })?._id || (v as { iud?: string })?.iud || v || '').trim())
              .filter(Boolean)
          )
        : null;
      (getCatalogSelection(endpointId).vistas || []).forEach((vid) => {
        const id = String(vid || '').trim();
        if (!id) return;
        if (techoVistas && !techoVistas.has(id)) return;
        relacionadas.add(id);
      });
    }

    return Array.from(relacionadas);
  };
  const applySuiteCatalogSelection = (endpointId: string, suiteId: string) => {
    setSuiteSelByEndpoint((prev) => ({ ...prev, [endpointId]: suiteId }));
    setExpandedModulos(new Set());
  };
  const getTenantGlobalOptionsForPermUsuario = (): HeredaGlobalOption[] => {
    const actorTg = String(tenantGlobalActor?.tenantGlobalId || '').trim();
    if (!actorTg) return [];
    const tg = tenantGlobales.find((t) => String(t?.id || '').trim() === actorTg);
    return [{ id: actorTg, label: tg ? tg.label : `tenantGlobal | ${actorTg}` }];
  };
  const getHeredaOptionsPermitidasPorTenantGlobal = (tenantGlobalId: string): HeredaGlobalOption[] => {
    const tg = String(tenantGlobalId || '').trim();
    if (!tg) return [];

    if (actorEsTenantSuperAdmin()) {
      // 1. Buscar herenciaGlobal directa del tenant seleccionado.
      //    Combina herenciasUsuario + herenciasExistentesPorTG[tg] (cargadas dinÃ¡micamente al seleccionar TG).
      const herenciasDelTG: any[] = [
        ...herenciasUsuario,
        ...(herenciasExistentesPorTG[tg] || []),
      ];

      const herenciaDirecta = herenciasDelTG.filter((h: any) => {
        const hTg = String(h?.tenantGlobal?._id || h?.tenantGlobal || '').trim();
        const tieneVistas = Array.isArray(h?.vistas) && h.vistas.length > 0;
        const tieneAcciones = Array.isArray(h?.acciones) && h.acciones.length > 0;
        const esDirecta = !String(h?.heredaGlobal?._id || h?.heredaGlobal || '').trim();
        return hTg === tg && tieneVistas && tieneAcciones && esDirecta;
      });

      if (herenciaDirecta.length > 0) {
        const reglasParaTg: HeredaGlobalOption[] = [];
        const seenReglas = new Set<string>();
        const tgInfoRegla = tenantGlobales.find((t) => String(t?.id || '').trim() === tg);
        const tgRolNombre = tgInfoRegla ? String(tgInfoRegla.label).split('|')[0].trim().toUpperCase() : '';
        Object.entries(ruleCatalog).forEach(([reglaId, rule]: [string, any]) => {
          const nvlRoles = Array.isArray(rule?.generacionGlovallNvlRoles) ? rule.generacionGlovallNvlRoles : [];
          const coincide = nvlRoles.some((x: any) => {
            const xId = String(x?._id || x || '').trim();
            const xRol = String(x?.rolesMabs?.rol || (Array.isArray(x?.rolesMabs) ? x.rolesMabs[0]?.rol : '') || '').trim().toUpperCase();
            return xId === tg || (tgRolNombre && xRol === tgRolNombre);
          });
          if (!coincide || seenReglas.has(reglaId)) return;
          seenReglas.add(reglaId);
          const vCount = Array.isArray(rule?.recurso) ? rule.recurso.length : 0;
          const aCount = Array.isArray(rule?.accionesUsu) ? rule.accionesUsu.length : 0;
          const tenantRef = Array.isArray(rule?.generacionGlovallNvlRoles) ? rule.generacionGlovallNvlRoles[0] : null;
          const rolNombre = String(
            tenantRef?.rolesMabs?.rol ||
            (Array.isArray(tenantRef?.rolesMabs) ? tenantRef.rolesMabs[0]?.rol : '') ||
            rule?.nombre || rule?.name || rule?.titulo || ''
          ).trim();
          const label = rolNombre
            ? `${rolNombre} | Regla TG | Vistas:${vCount} | Acciones:${aCount}`
            : `Regla TG | Vistas:${vCount} | Acciones:${aCount}`;
          reglasParaTg.push({ id: reglaId, label });
        });
        if (reglasParaTg.length > 0) return reglasParaTg;

        // El tenant ya tiene herencia parametrizada - mostrar esa (y solo esa)
        const tgInfo = tenantGlobales.find((t) => String(t?.id || '').trim() === tg);
        const tgNombre = tgInfo ? String(tgInfo.label).split('|')[0].trim() : tg.slice(-6);
        const seen = new Set<string>();
        const opts: HeredaGlobalOption[] = [];
        herenciaDirecta.forEach((h: any) => {
          const hId = String(h?.iud || h?._id || '').trim();
          if (!hId || seen.has(hId)) return;
          seen.add(hId);
          const vCount = Array.isArray(h?.vistas) ? h.vistas.length : 0;
          const aCount = Array.isArray(h?.acciones) ? h.acciones.length : 0;
          opts.push({ id: hId, label: `${tgNombre} | Vistas:${vCount} | Acciones:${aCount}` });
        });
        return opts;
      }

      // 2. El tenant NO tiene herencia â†’ mostrar reglas parametrizadas sobre su rol.
      //    Coincidencia primaria: rolesMabs.rol del TG. Secundaria: _id del TG en generacionGlovallNvlRoles.
      const tgInfo = tenantGlobales.find((t) => String(t?.id || '').trim() === tg);
      const tgRolNombre = tgInfo ? String(tgInfo.label).split('|')[0].trim().toUpperCase() : '';

      const reglasParaTg: HeredaGlobalOption[] = [];
      const seenReglas = new Set<string>();
      Object.entries(ruleCatalog).forEach(([reglaId, rule]: [string, any]) => {
        const nvlRoles = Array.isArray(rule?.generacionGlovallNvlRoles) ? rule.generacionGlovallNvlRoles : [];
        const coincide = nvlRoles.some((x: any) => {
          const xId = String(x?._id || x || '').trim();
          const xRol = String(x?.rolesMabs?.rol || (Array.isArray(x?.rolesMabs) ? x.rolesMabs[0]?.rol : '') || '').trim().toUpperCase();
          // Coincide si el ID del TG coincide, O si el rol del TG coincide
          return xId === tg || (tgRolNombre && xRol === tgRolNombre);
        });
        if (coincide && !seenReglas.has(reglaId)) {
          seenReglas.add(reglaId);
          const vCount = Array.isArray(rule?.recurso) ? rule.recurso.length : 0;
          const aCount = Array.isArray(rule?.accionesUsu) ? rule.accionesUsu.length : 0;
          // El modelo reglas no tiene campo nombre - se deriva del rolesMabs.rol del primer tenantGlobal asignado
          const tenantRef = Array.isArray(rule?.generacionGlovallNvlRoles) ? rule.generacionGlovallNvlRoles[0] : null;
          const rolNombre = String(
            tenantRef?.rolesMabs?.rol ||
            (Array.isArray(tenantRef?.rolesMabs) ? tenantRef.rolesMabs[0]?.rol : '') ||
            rule?.nombre || rule?.name || rule?.titulo || ''
          ).trim();
          const label = rolNombre
            ? `${rolNombre} | Vistas:${vCount} | Acciones:${aCount}`
            : `Regla | Vistas:${vCount} | Acciones:${aCount}`;
          reglasParaTg.push({ id: reglaId, label });
        }
      });
      if (reglasParaTg.length > 0) return reglasParaTg;

      // 3. Sin herencia directa ni reglas para este TG → retornar [] para que el catalogo
      //    caiga al "last resort" y muestre todas las rutasSeguridad disponibles.
      return [];
    }

    // TenantGlobal branch: filtrar por tenantGlobal ID
    const ids = new Set<string>();
    herenciasUsuario.forEach((h: any) => {
      const tgH = String(h?.tenantGlobal?._id || h?.tenantGlobal || '').trim();
      if (tgH === tg) {
        // Herencia directa (sin heredaGlobal): usar su propio _id
        const hId = String(h?.iud || h?._id || '').trim();
        if (hId) ids.add(hId);
      }
    });
    const byTg = herenciasUsuario
      .filter((h: any) => ids.has(String(h?.iud || h?._id || '').trim()))
      .map((h: any) => {
        const hId = String(h?.iud || h?._id || '').trim();
        const vCount = Array.isArray(h?.vistas) ? h.vistas.length : 0;
        const aCount = Array.isArray(h?.acciones) ? h.acciones.length : 0;
        return { id: hId, label: `Herencia TG | Vistas:${vCount} | Acciones:${aCount}` };
      });
    if (byTg.length) return byTg;
    return heredaGlobalOptions.filter((opt) => heredaGlobalScopeById[opt.id] === 'tenantGlobal');
  };

  const getHerenciasUsuariosSeleccionadosParaPermUsuario = (tenantGlobalId: string): HeredaGlobalOption[] => {
    const tg = String(tenantGlobalId || '').trim();
    if (!tg) return [];
    const endpointId = 'perm-usuario-tenant-global';
    const usuariosSel = new Set((usuariosDestinoSel[endpointId] || []).map((id) => String(id).trim()).filter(Boolean));
    if (!usuariosSel.size) return [];
    const rows = [
      ...herenciasUsuario,
      ...(herenciasExistentesPorTG[tg] || []),
    ];
    const seen = new Set<string>();
    return rows
      .map((h: any) => {
        const hId = String(h?.iud || h?._id || '').trim();
        const hTg = String(h?.tenantGlobal?._id || h?.tenantGlobal || '').trim();
        const uId = String(h?.usuarioId?._id || h?.usuarioId || '').trim();
        if (!hId || hTg !== tg || !usuariosSel.has(uId) || seen.has(hId)) return null;
        seen.add(hId);
        const usuario = String(h?.usuarioId?.nombre || h?.usuarioId?.name || h?.usuarioId?.correo || h?.usuarioId?.email || uId).trim();
        const vCount = Array.isArray(h?.vistas) ? h.vistas.length : 0;
        const aCount = Array.isArray(h?.acciones) ? h.acciones.length : 0;
        return {
          id: hId,
          label: `${usuario || 'Usuario'} | Vistas:${vCount} | Acciones:${aCount}`,
        };
      })
      .filter(Boolean) as HeredaGlobalOption[];
  };
  // Retorna las herenciaGlobal del TG (las asignadas al TG por el SA) como opciones de dropdown.
  // Estas sirven como techo de vistas/acciones cuando el TG asigna permisos corporativos.
  const getHerenciaGlobalOpcionesParaTG = (): HeredaGlobalOption[] => {
    const tgId = String(tenantGlobalActor?.tenantGlobalId || '').trim();
    if (!tgId) return [];
    const seen = new Set<string>();
    const opts: HeredaGlobalOption[] = [];
    herenciasUsuario.forEach((h: any) => {
      const hTg = String(h?.tenantGlobal?._id || h?.tenantGlobal || '').trim();
      if (hTg !== tgId) return;
      // herenciaGlobal records del TG no tienen heredaGlobal - usar su propio _id
      const hId = String(h?.iud || h?._id || '').trim();
      if (!hId || seen.has(hId)) return;
      seen.add(hId);
      const vCount = Array.isArray(h?.vistas) ? h.vistas.length : 0;
      const aCount = Array.isArray(h?.acciones) ? h.acciones.length : 0;
      const label = `Herencia TG | Vistas:${vCount} | Acciones:${aCount}`;
      opts.push({ id: hId, label });
    });
    return opts;
  };

  // Retorna los tenantCorporativos del TG autenticado filtrados desde tenantCorporativos state
  const getCorporativosDelTG = (): TenantCorporativoOption[] => {
    const tgId = String(tenantGlobalActor?.tenantGlobalId || '').trim();
    if (!tgId) return [];
    return tenantCorporativos.filter((tc) => String(tc.tenantGlobalId || '').trim() === tgId);
  };

  const getCorporativoByHerencia = (heredaId: string): string | null => {
    const h = herenciasUsuario.find((h: any) =>
      String(h?.heredaGlobal?._id || h?.heredaGlobal || '').trim() === heredaId
    );
    if (!h) return null;
    const tc = String(h?.tenantCorporativo?._id || h?.tenantCorporativo || '').trim();
    const tcNombre = String(h?.tenantCorporativo?.razon_social || h?.tenantCorporativo?.titulo || '').trim();
    return tc ? (tcNombre ? `${tcNombre} | ${tc}` : tc) : null;
  };

  /** Etiqueta visible: nombre/apellidos desde perfil (perfilGlobal unificado en API jerarquía) si existen; si no, correo. */
  const labelUsuarioDesdeJerarquia = (u: any): string => {
    const perfil = u?.perfil ?? u?.perfilGlobal ?? null;
    const nombre = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(' ').trim();
    const correo = String(u?.correo || '').trim();
    const rol = String(u?.rol || '').trim();
    const base = nombre || correo || String(u?.iud || u?._id || '').trim();
    return rol ? `${base} · ${rol}` : base;
  };

  const buscarNodoTenantGlobalEnArbol = (nodos: any[], tgId: string): any | null => {
    const idBuscado = String(tgId || '').trim();
    if (!idBuscado || !Array.isArray(nodos)) return null;
    for (const n of nodos) {
      const id = String(n?.tenantGlobal?.iud || n?.tenantGlobal?._id || '').trim();
      if (id === idBuscado) return n;
      const subs = Array.isArray(n?.subTenantGlobales) ? n.subTenantGlobales : [];
      const found = buscarNodoTenantGlobalEnArbol(subs, idBuscado);
      if (found) return found;
    }
    return null;
  };

  const endpointEsReglasGlobalesJerarquia = (endpointId: string) =>
    endpointId === 'tenant-crear-global-reglas' || endpointId === 'tenant-actualizar-global-reglas';

  const endpointExcluyeUsuariosSuperAdminEnTenantGlobal = (endpointId: string) =>
    endpointEsReglasGlobalesJerarquia(endpointId) || endpointId === 'perm-usuario-tenant-global';

  /** Reglas globales: excluye rol DIOS/SuperAdmin y la rama usuariosTenantSuperAdmin del organigrama. */
  const rolExcluirReglasGlobales = (rolRaw: unknown): boolean => {
    const r = String(rolRaw || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/\s+/g, ' ');
    if (!r) return false;
    if (r === 'DIOS' || r === 'SUPERADMIN') return true;
    if (r.includes('SUPERADMIN') && !r.includes('ADMINISTRAD')) return true;
    return false;
  };

  /** Lista deduplicada de usuarios bajo el nodo TG en la jerarquía (perfil → etiqueta; si no, correo). */
  const collectUsuariosListaParaTenantGlobal = (
    jerarquia: any,
    tenantGlobalId: string,
    opts?: { globalesReglas?: boolean }
  ): { id: string; label: string }[] => {
    const globalesReglas = opts?.globalesReglas === true;
    const tgId = String(tenantGlobalId || '').trim();
    const lista: { id: string; label: string }[] = [];

    const extraerUsuario = (u: any) => {
      if (globalesReglas && rolExcluirReglasGlobales(u?.rol)) return;
      const id = String(u?.iud || u?._id || '').trim();
      if (!id) return;
      lista.push({ id, label: labelUsuarioDesdeJerarquia(u) });
    };

    const extraerDeNodo = (nodo: any) => {
      const uArr = Array.isArray(nodo?.usuarios) ? nodo.usuarios : [];
      uArr.forEach(extraerUsuario);
      if (!globalesReglas) {
        const saRama = Array.isArray(nodo?.usuariosTenantSuperAdmin) ? nodo.usuariosTenantSuperAdmin : [];
        saRama.forEach(extraerUsuario);
      }

      const hijos = Array.isArray(nodo?.hijos) ? nodo.hijos : [];
      hijos.forEach(extraerDeNodo);
      const corps = Array.isArray(nodo?.corporativos) ? nodo.corporativos : [];
      corps.forEach(extraerDeNodo);

      const subs = Array.isArray(nodo?.subTenantGlobales) ? nodo.subTenantGlobales : [];
      subs.forEach(extraerDeNodo);
    };

    const tgRows: any[] = Array.isArray(jerarquia?.tenantsGlobales) ? jerarquia.tenantsGlobales : [];
    if (tgId) {
      const tgMatch =
        buscarNodoTenantGlobalEnArbol(tgRows, tgId) ||
        tgRows.find((tg: any) => String(tg?.tenantGlobal?.iud || tg?.tenantGlobal?._id || '').trim() === tgId);
      if (tgMatch) extraerDeNodo(tgMatch);
    } else {
      tgRows.forEach(extraerDeNodo);
    }

    return Array.from(new Map(lista.map((u) => [u.id, u])).values());
  };

  const aplicarUsuariosDesdeJerarquiaRef = (endpointId: string, tgId: string) => {
    const snap = jerarquiaUsuariosRef.current;
    const id = String(tgId || '').trim();
    if (!snap || !id) return;
    const lista = collectUsuariosListaParaTenantGlobal(snap, id, {
      globalesReglas: endpointExcluyeUsuariosSuperAdminEnTenantGlobal(endpointId),
    });
    setUsuariosDisponibles((prev) => ({ ...prev, [endpointId]: lista }));
    setUsuariosDestinoSel((prev) => ({
      ...prev,
      [endpointId]: (prev[endpointId] || []).filter((idSel) => lista.some((u) => u.id === idSel)),
    }));
  };

  const cargarUsuariosParaEndpoint = async (endpointId: string, tenantGlobalId: string) => {
    const tgId = String(tenantGlobalId || '').trim();
    const globalesReglas = endpointExcluyeUsuariosSuperAdminEnTenantGlobal(endpointId);
    const snapPrev = jerarquiaUsuariosRef.current;
    if (snapPrev) {
      const listaSync = collectUsuariosListaParaTenantGlobal(snapPrev, tgId, { globalesReglas });
      setUsuariosDisponibles((prev) => ({ ...prev, [endpointId]: listaSync }));
      setUsuariosDestinoSel((prev) => ({
        ...prev,
        [endpointId]: (prev[endpointId] || []).filter((idSel) => listaSync.some((u) => u.id === idSel)),
      }));
    }

    const debeSpinner = !snapPrev;
    if (debeSpinner) {
      setLoadingUsuarios((prev) => ({ ...prev, [endpointId]: true }));
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), JERARQUIA_USUARIOS_FETCH_MS);
    const limpiarTimer = () => {
      window.clearTimeout(timer);
    };

    try {
      const jerarquia: any = await apiFetch('/api/registro/jerarquia/usuarios', {
        method: 'GET',
        signal: controller.signal,
      });
      limpiarTimer();
      jerarquiaUsuariosRef.current = jerarquia;
      const unicos = collectUsuariosListaParaTenantGlobal(jerarquia, tgId, { globalesReglas });
      setUsuariosDisponibles((prev) => ({ ...prev, [endpointId]: unicos }));
      setUsuariosDestinoSel((prev) => ({
        ...prev,
        [endpointId]: (prev[endpointId] || []).filter((idSel) => unicos.some((u) => u.id === idSel)),
      }));
      return unicos;
    } catch (_e) {
      limpiarTimer();
      if (!jerarquiaUsuariosRef.current) {
        setUsuariosDisponibles((prev) => ({ ...prev, [endpointId]: [] }));
      }
      return snapPrev
        ? collectUsuariosListaParaTenantGlobal(snapPrev, tgId, { globalesReglas })
        : [];
    } finally {
      if (debeSpinner) {
        setLoadingUsuarios((prev) => ({ ...prev, [endpointId]: false }));
      }
    }
  };

  const resolveReglaTechoPermUsuario = (endpointId: string): Record<string, unknown> | null => {
    const selectedHeredaGlobal = getFieldValue(endpointId, 'heredaGlobal').trim();
    if (selectedHeredaGlobal && ruleCatalog[selectedHeredaGlobal]) {
      return ruleCatalog[selectedHeredaGlobal];
    }
    const herencia = selectedHeredaGlobal
      ? herenciasUsuario.find((h: any) => String(h?.iud || h?._id || '').trim() === selectedHeredaGlobal)
      : null;
    const ruleRef = String(herencia?.heredaGlobal?._id || herencia?.heredaGlobal || '').trim();
    if (ruleRef && ruleCatalog[ruleRef]) return ruleCatalog[ruleRef];
    const tgScope = actorEsTenantGlobalScope()
      ? String(tenantGlobalActor?.tenantGlobalId || '').trim()
      : getFieldValue(endpointId, 'tenantGlobalScope').trim();
    const reglaId = resolverReglaParametrizadaParaTenantGlobal(tgScope);
    return reglaId && ruleCatalog[reglaId] ? ruleCatalog[reglaId] : null;
  };

  const recortarSeleccionAlTechoRegla = (
    endpointId: string,
    vistas: string[],
    acciones: string[]
  ): CatalogSelection => {
    if (endpointId !== 'perm-usuario-tenant-global') {
      return { vistas, acciones };
    }
    const rule = resolveReglaTechoPermUsuario(endpointId);
    if (!rule) return { vistas, acciones };
    const getId = (value: unknown): string => String((value as { _id?: string; iud?: string })?._id || (value as { iud?: string })?.iud || value || '').trim();
    const techoVistas = new Set(
      (Array.isArray(rule?.recurso) ? rule.recurso : []).map((v) => getId(v)).filter(Boolean)
    );
    const techoAcciones = new Set(
      (Array.isArray(rule?.accionesUsu) ? rule.accionesUsu : []).map((a) => getId(a)).filter(Boolean)
    );
    return {
      vistas: vistas.filter((id) => techoVistas.has(id)),
      acciones: acciones.filter((id) => techoAcciones.has(id)),
    };
  };

  const pintarCatalogoDesdeHerenciaRow = (endpointId: string, h: any) => {
    const vistasIds = (Array.isArray(h?.vistas) ? h.vistas : [])
      .map((v: any) => String(v?._id || v?.iud || v || '').trim())
      .filter(Boolean);
    const accionesIds = (Array.isArray(h?.acciones) ? h.acciones : [])
      .map((a: any) => String(a?._id || a?.iud || a || '').trim())
      .filter(Boolean);
    setCatalogSelectionFor(endpointId, recortarSeleccionAlTechoRegla(endpointId, vistasIds, accionesIds));
  };

  const pintarCatalogoDesdeReglaId = (endpointId: string, reglaId: string) => {
    const rule = ruleCatalog[reglaId];
    if (!rule) {
      setCatalogSelectionFor(endpointId, { vistas: [], acciones: [] });
      return;
    }
    const vistasIds = (Array.isArray(rule?.recurso) ? rule.recurso : [])
      .map((v: any) => String(v?._id || v?.iud || v || '').trim())
      .filter(Boolean);
    const accionesIds = (Array.isArray(rule?.accionesUsu) ? rule.accionesUsu : [])
      .map((a: any) => String(a?._id || a?.iud || a || '').trim())
      .filter(Boolean);
    setCatalogSelectionFor(endpointId, { vistas: vistasIds, acciones: accionesIds });
  };

  const resolverReglaParametrizadaParaTenantGlobal = (tgId: string): string | null => {
    const tg = String(tgId || '').trim();
    if (!tg) return null;
    const tgInfo = tenantGlobales.find((t) => String(t?.id || '').trim() === tg);
    const tgRolNombre = tgInfo ? String(tgInfo.label).split('|')[0].trim().toUpperCase() : '';
    const saId = String(tgInfo?.tenantSuperAdmin || tenantGlobalActor?.tenantSuperAdminId || '').trim();

    if (saId) {
      const reglaSa = findReglaPlataformaPorSuperAdmin(ruleCatalog, saId);
      if (reglaSa) {
        const entry = Object.entries(ruleCatalog).find(([, rule]) => rule === reglaSa);
        if (entry?.[0]) return entry[0];
        const rid = String(reglaSa?._id || reglaSa?.iud || '').trim();
        if (rid) return rid;
      }
    }

    for (const [reglaId, rule] of Object.entries(ruleCatalog)) {
      const nvlRoles = Array.isArray(rule?.generacionGlovallNvlRoles) ? rule.generacionGlovallNvlRoles : [];
      const coincide = nvlRoles.some((x: any) => {
        const xId = String(x?._id || x?.iud || x || '').trim();
        const xRol = String(
          x?.rolesMabs?.rol || (Array.isArray(x?.rolesMabs) ? x.rolesMabs[0]?.rol : '') || ''
        ).trim().toUpperCase();
        return xId === tg || (tgRolNombre && xRol === tgRolNombre);
      });
      if (coincide) return reglaId;
    }
    return null;
  };

  const aplicarHeredaYCatalogoPermUsuario = (
    endpointId: string,
    tgId: string,
    herenciasTg: any[],
    usuariosIds: string[]
  ) => {
    const usuariosSet = new Set(usuariosIds.map((id) => String(id).trim()).filter(Boolean));

    const herenciasUsu = herenciasTg.filter((h: any) => {
      const hTg = String(h?.tenantGlobal?._id || h?.tenantGlobal || '').trim();
      const uId = String(h?.usuarioId?._id || h?.usuarioId || '').trim();
      return hTg === tgId && usuariosSet.has(uId);
    });

    if (herenciasUsu.length) {
      const vistasSet = new Set<string>();
      const accionesSet = new Set<string>();
      herenciasUsu.forEach((h: any) => {
        (Array.isArray(h?.vistas) ? h.vistas : []).forEach((v: any) => {
          const id = String(v?._id || v?.iud || v || '').trim();
          if (id) vistasSet.add(id);
        });
        (Array.isArray(h?.acciones) ? h.acciones : []).forEach((a: any) => {
          const id = String(a?._id || a?.iud || a || '').trim();
          if (id) accionesSet.add(id);
        });
      });
      setCatalogSelectionFor(endpointId, recortarSeleccionAlTechoRegla(
        endpointId,
        Array.from(vistasSet),
        Array.from(accionesSet)
      ));
      const herenciaIds = [...new Set(
        herenciasUsu.map((h) => String(h?.iud || h?._id || '').trim()).filter(Boolean)
      )];
      if (herenciaIds.length === 1) {
        setFieldValue(endpointId, 'heredaGlobal', herenciaIds[0]);
      }
      return;
    }

    const herenciaDirecta = herenciasTg.filter((h: any) => {
      const hTg = String(h?.tenantGlobal?._id || h?.tenantGlobal || '').trim();
      const tieneVistas = Array.isArray(h?.vistas) && h.vistas.length > 0;
      const tieneAcciones = Array.isArray(h?.acciones) && h.acciones.length > 0;
      const esDirecta = !String(h?.heredaGlobal?._id || h?.heredaGlobal || '').trim();
      return hTg === tgId && tieneVistas && tieneAcciones && esDirecta;
    });

    if (herenciaDirecta.length) {
      const hId = String(herenciaDirecta[0]?.iud || herenciaDirecta[0]?._id || '').trim();
      if (hId) {
        setFieldValue(endpointId, 'heredaGlobal', hId);
        pintarCatalogoDesdeHerenciaRow(endpointId, herenciaDirecta[0]);
      }
      return;
    }

    const reglaId = resolverReglaParametrizadaParaTenantGlobal(tgId);
    if (reglaId) {
      setFieldValue(endpointId, 'heredaGlobal', reglaId);
      setFieldValue(endpointId, 'reglaGlobalFallback', reglaId);
      pintarCatalogoDesdeReglaId(endpointId, reglaId);
      return;
    }

    setFieldValue(endpointId, 'heredaGlobal', '');
    setCatalogSelectionFor(endpointId, { vistas: [], acciones: [] });
  };

  /** Al elegir tenantGlobal: usuarios de la rama, herencias existentes y regla SA si no hay herencia. */
  const sincronizarContextoTenantGlobalPermUsuario = async (endpointId: string, tgId: string) => {
    const tg = String(tgId || '').trim();
    if (!tg) return;

    setFieldValue(endpointId, 'tenantGlobalScope', tg);
    setFieldValue(endpointId, 'heredaGlobal', '');
    setFieldValue(endpointId, 'reglaGlobalFallback', '');
    setSuiteSelByEndpoint((prev) => ({ ...prev, [endpointId]: '' }));
    setCatalogSelectionFor(endpointId, { vistas: [], acciones: [] });

    const usuariosLista = await cargarUsuariosParaEndpoint(endpointId, tg);
    const usuariosIds = (usuariosLista || []).map((u) => u.id).filter(Boolean);
    setUsuariosDestinoSel((prev) => ({ ...prev, [endpointId]: usuariosIds }));

    await Promise.all(usuariosIds.map((uid) => cargarHerenciasPorUsuario(uid)));
    const herenciasTg = await cargarHerenciasExistentesTG(tg);
    aplicarHeredaYCatalogoPermUsuario(endpointId, tg, herenciasTg, usuariosIds);
  };

  const cargarHerenciasExistentesTG = async (tgId: string): Promise<any[]> => {
    if (!tgId) return [];
    try {
      const res: any = await apiFetch(
        `/api/config/permisos/listar/usu/tenant/libres?soloMios=false&tenantGlobal=${tgId}`,
        { method: 'GET' }
      );
      const lista = Array.isArray(res?.data) ? res.data : pickArray(res, ['herencias', 'items']);
      setHerenciasExistentesPorTG((prev) => ({ ...prev, [tgId]: lista }));
      return lista;
    } catch {
      setHerenciasExistentesPorTG((prev) => ({ ...prev, [tgId]: [] }));
      return [];
    }
  };

  const cargarHerenciasPorUsuario = async (usuarioId: string) => {
    if (!usuarioId || herenciasPorUsuario[usuarioId] !== undefined) return;
    setLoadingHerenciasPorUsuario((prev) => ({ ...prev, [usuarioId]: true }));
    try {
      const res: any = await apiFetch(
        '/api/config/permisos/listar/usu/tenant/libres?usuarioId=' + usuarioId + '&soloMios=false',
        { method: 'GET' }
      );
      const lista = Array.isArray(res?.data) ? res.data : [];
      setHerenciasPorUsuario((prev) => ({ ...prev, [usuarioId]: lista }));
    } catch {
      setHerenciasPorUsuario((prev) => ({ ...prev, [usuarioId]: [] }));
    } finally {
      setLoadingHerenciasPorUsuario((prev) => ({ ...prev, [usuarioId]: false }));
    }
  };

  const getTenantCorporativoOptions = (endpointId: string): TenantCorporativoOption[] => {
    const tenantGlobalId = getFieldValue(endpointId, 'tenantGlobal').trim();
    if (!tenantGlobalId || isTenantSuperAdminScopeOption(tenantGlobalId)) return [];
    const unique = new Map<string, TenantCorporativoOption>();
    tenantCorporativos
      .filter((c) => c.tenantGlobalId === tenantGlobalId)
      .forEach((c) => unique.set(c.id, c));

    herenciasUsuario.forEach((h: any) => {
      const tg = String(h?.tenantGlobal?._id || h?.tenantGlobal || '').trim();
      const tc = String(h?.tenantCorporativo?._id || h?.tenantCorporativo || '').trim();
      if (!tc || tg !== tenantGlobalId || unique.has(tc)) return;
      unique.set(tc, { id: tc, tenantGlobalId, label: `${tc}` });
    });

    return Array.from(unique.values());
  };

  /**
   * Tenant globales en combos herencia/listar: deben acotarse al SA del JWT **o** al SA elegido en
   * `__tsa_scope__:id` (rama tenantjerarquiacounters), no mezclar ramas (p. ej. SA-0001 vs SA-0002).
   */
  const resolveEffectiveSaParaComboTg = (endpointId: string): string => {
    const jwtSa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
    const raw = String(getFieldValue(endpointId, 'tenantGlobal') || '').trim();
    if (raw && isTenantSuperAdminScopeOption(raw)) {
      const picked = raw.slice(TENANT_SUPERADMIN_SCOPE_PREFIX.length).trim();
      if (picked) return picked;
    }
    if (raw && /^[a-f0-9]{24}$/i.test(raw)) {
      const row = tenantGlobales.find((t) => String(t.id || '').trim() === raw);
      const sa = String(row?.tenantSuperAdmin || '').trim();
      if (sa) return sa;
    }
    return jwtSa;
  };

  /** SA visibles en combo según subárbol tenantjerarquiacounters (codigoPadre). */
  const filtrarSaMetasPorSubarbolJerarquia = (
    metas: SaJerarquiaMeta[],
    indice: SaJerarquiaCounterIndice[],
    anclaSaId: string,
    opts: { incluirAncestros?: boolean; incluirDescendientes?: boolean } = {},
  ): SaJerarquiaMeta[] => {
    if (!metas.length) return [];
    const ancla = String(anclaSaId || '').trim();
    if (!indice.length || !ancla) return metas;

    const anclaEnIndice = indice.some(
      (row) =>
        String(row.tenantSuperAdminId || '').trim() === ancla ||
        idsPermisoRefsCoinciden(row.tenantSuperAdminId, ancla),
    );
    if (!anclaEnIndice) return metas;

    const allowedRows = filtrarIndiceSaSubarbol(indice, {
      anclaSaId: ancla,
      incluirAncestros: opts.incluirAncestros ?? true,
      incluirDescendientes: opts.incluirDescendientes ?? true,
    });
    const codigosPermitidos = new Set(
      allowedRows.map((r) => String(r.codigoJerarquia || '').trim()).filter(Boolean),
    );
    const idsPermitidos = new Set<string>();
    allowedRows.forEach((row) => {
      const id = String(row.tenantSuperAdminId || '').trim();
      if (!id) return;
      idsPermitidos.add(id);
      resolveSaIdsEquivalentes(id).forEach((v) => idsPermitidos.add(v));
    });

    const matched = metas.filter((m) => {
      const mid = String(m?.id || '').trim();
      if (!mid) return false;
      if (idsPermitidos.has(mid)) return true;
      for (const pid of idsPermitidos) {
        if (idsPermisoRefsCoinciden(pid, mid)) return true;
      }
      const cod = String(m?.codigoJerarquia || '').trim();
      return Boolean(cod && codigosPermitidos.has(cod));
    });

    return matched.length ? matched : metas;
  };

  const resolveActiveReglasEndpointId = (): string | null => {
    const fromModal = String(endpointModal?.id || '').trim();
    if (fromModal) return fromModal;
    if (useModuloInlineFlow) {
      return (
        String(inlineModuloMenu.activeEndpoint?.id || preferredActionId || initialEndpointId || '').trim() ||
        null
      );
    }
    return null;
  };

  const resolveSaJerarquiaMetasVisibles = (endpointId: string): SaJerarquiaMeta[] => {
    const metas = tenantSuperAdminsJerarquiaCounters;
    if (!metas.length) return [];

    const anclaSa =
      endpointId === 'tenant-actualizar-global-reglas'
        ? String(saFilterByEndpoint[endpointId] || tenantGlobalActor?.tenantSuperAdminId || '').trim()
        : resolveEffectiveSaParaComboTg(endpointId);

    if (!jerarquiaSaCounters.length || !anclaSa) {
      return metas;
    }

    return filtrarSaMetasPorSubarbolJerarquia(metas, jerarquiaSaCounters, anclaSa, {
      incluirAncestros: true,
      incluirDescendientes: true,
    });
  };

  const aplicarReglaDiosParametrizadaAlFormulario = useCallback(
    (endpointId: string, saId: string) => {
      const saKey = String(saId || '').trim();
      if (!saKey) return;
      const regla = findReglaPlataformaPorSuperAdmin(ruleCatalog, saKey);
      if (!regla) return;
      const recIds = (Array.isArray(regla?.recurso) ? regla.recurso : [])
        .map((v: any) => String(v?._id || v || '').trim())
        .filter(Boolean);
      const accIds = (Array.isArray(regla?.accionesUsu) ? regla.accionesUsu : [])
        .map((a: any) => String(a?._id || a || '').trim())
        .filter(Boolean);
      if (recIds.length) {
        setDiosReglaRecursosSeleccion((prev) => ({ ...prev, [endpointId]: recIds }));
      }
      if (accIds.length) {
        setDiosReglaAccionesSeleccion((prev) => ({ ...prev, [endpointId]: accIds }));
      }
      const ctxRow = Array.isArray(regla?.contextoDefi) ? regla.contextoDefi[0] : null;
      const ctxId = String(ctxRow?._id || ctxRow || '').trim();
      if (ctxId) {
        setFieldValue(endpointId, 'contexto', ctxId);
      }
      const dominio = resolveDominioTenatPorSa(dominioPorSaMap, saKey);
      if (dominio) {
        setFieldValue(endpointId, 'dominioTenatGlobales', dominio);
      }
      const sp = resolverSecurityPlatformDesdeTenantSa(
        saKey,
        tenantSuperAdminsJerarquiaCounters,
        tenantGlobalSelects.nvlGeneracionTenant || [],
      );
      setFieldValue(endpointId, 'securityPlatform', sp ? 'true' : 'false');
      const politicasIds = parsePoliticasRuntimeIdsFromRule(regla);
      if (politicasIds.length) {
        setReglasPoliticasRuntimeSel((prev) => ({ ...prev, [endpointId]: politicasIds }));
      }
      void fetchPoliticasRuntimeCatalogo({})
        .then((rows) => setPoliticasRuntimeCatalog(rows))
        .catch(() => setPoliticasRuntimeCatalog([]));
    },
    [dominioPorSaMap, ruleCatalog, tenantSuperAdminsJerarquiaCounters, tenantGlobalSelects.nvlGeneracionTenant],
  );

  const aplicarSecurityPlatformDesdeSaDiosRegla = useCallback(
    (endpointId: string, saId: string) => {
      const saKey = String(saId || '').trim();
      if (!saKey) return;
      const sp = resolverSecurityPlatformDesdeTenantSa(
        saKey,
        tenantSuperAdminsJerarquiaCounters,
        tenantGlobalSelects.nvlGeneracionTenant || [],
      );
      setFieldValue(endpointId, 'securityPlatform', sp ? 'true' : 'false');
    },
    [tenantSuperAdminsJerarquiaCounters, tenantGlobalSelects.nvlGeneracionTenant],
  );

  const resolveUniversoTenantGlobalesState = (): TenantGlobal[] => {
    const byId = new Map<string, TenantGlobal>();
    const mergeRows = (rows: TenantGlobal[]) => {
      rows.forEach((t) => {
        const id = String(t.id || '').trim();
        if (!id) return;
        const prev = byId.get(id);
        byId.set(
          id,
          prev
            ? {
                ...prev,
                ...t,
                label: (prev.label && prev.label.length > (t.label || '').length ? prev.label : t.label) || prev.label || id,
                tenantSuperAdmin: prev.tenantSuperAdmin || t.tenantSuperAdmin,
                tenantGlobalAdmin: prev.tenantGlobalAdmin || t.tenantGlobalAdmin,
              }
            : t,
        );
      });
    };
    mergeRows(tenantGlobales);
    mergeRows(
      tenantGlobalOptionsFromJerarquiaUsuarios(jerarquiaUsuariosRef.current).map((row) => ({
        id: row.id,
        label: row.label,
        corporativo: row.corporativo,
        tenantSuperAdmin: row.tenantSuperAdmin,
        tenantGlobalAdmin: row.tenantGlobalAdmin,
      })),
    );
    (tenantGlobalSelects.tenantGlobalRef || []).forEach((o) => {
      const id = String(o.id || '').trim();
      if (!id) return;
      mergeRows([{ id, label: String(o.label || id) }]);
    });
    return Array.from(byId.values());
  };

  const getTenantGlobalOptions = (endpointId: string): TenantGlobal[] => {
    const actorTenantGlobal = String(tenantGlobalActor.tenantGlobalId || '').trim();
    const actorTenantSuper = String(tenantGlobalActor.tenantSuperAdminId || '').trim();
    const actorTenantCorporativo = String(tenantGlobalActor.tenantCorporativoId || '').trim();
    const isHerenciaEndpoint =
      endpointId === 'perm-admin-tenant-global' ||
      PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpointId) ||
      endpointId === 'perm-admin-tenant-global-desactivar' ||
      endpointId === 'perm-admin-tenant-global-eliminar' ||
      endpointId === 'perm-listar-herencias';

    const expandByTree = (seedIds: string[]): Set<string> =>
      expandTenantGlobalDescendants(tenantGlobales, seedIds);

    const scopeOptionDios = (): TenantGlobal => ({
      id: `${TENANT_SUPERADMIN_SCOPE_PREFIX}${actorTenantSuper}`,
      label: `tenantSuperAdmin (DIOS) | ${actorTenantSuper}`,
      corporativo: 'SCOPE_DIOS',
      tenantSuperAdmin: actorTenantSuper,
    });

    if (
      actorTenantSuper &&
      ENDPOINT_IDS_OPCIONES_TG_JERARQUIA_SUPERADMIN.has(endpointId)
    ) {
      const baseLista = filtrarTenantGlobalesPorJerarquiaSuperAdmin(
        tenantGlobales,
        resolveEffectiveSaParaComboTg(endpointId),
        tenantGlobalActor?.saJerarquiaTieneCorporativoEnCounters === true
      );
      /** Permisos heredados / actualizar / desactivar / eliminar: una opción por SA del jerarquía counter (misma herencia que GET). */
      if (ENDPOINT_IDS_SELECT_MULTI_SA_JERARQUIA.has(endpointId)) {
        const saMetasVisibles = resolveSaJerarquiaMetasVisibles(endpointId);
        if (saMetasVisibles.length > 0) {
          const saScopeOptions: TenantGlobal[] = saMetasVisibles
            .map((s: any) => {
              const sid = String(s?.id || '').trim();
              if (!sid) return null;
              return {
                id: `${TENANT_SUPERADMIN_SCOPE_PREFIX}${sid}`,
                label: formatSaJerarquiaOptionLabel(s),
                corporativo: 'SCOPE_DIOS',
                tenantSuperAdmin: sid,
              };
            })
            .filter(Boolean) as TenantGlobal[];
          const byKey = new Map<string, TenantGlobal>();
          saScopeOptions.forEach((o) => byKey.set(o.id, o));
          const mergedSa = Array.from(byKey.values()).sort((a, b) =>
            String(a.tenantSuperAdmin || '').localeCompare(String(b.tenantSuperAdmin || ''))
          );
          return [...mergedSa, ...baseLista];
        }
      }
      return [scopeOptionDios(), ...baseLista];
    }

    if (!isHerenciaEndpoint) {
      const esReglasGlobales =
        endpointId === 'tenant-crear-global-reglas' ||
        endpointId === 'tenant-actualizar-global-reglas' ||
        endpointId === 'tenant-desactivar-global-reglas' ||
        endpointId === 'tenant-eliminar-global-reglas';

      if (
        esReglasGlobales &&
        tenantGlobales.length === 0 &&
        Array.isArray(tenantGlobalSelects.tenantGlobalRef) &&
        tenantGlobalSelects.tenantGlobalRef.length > 0
      ) {
        /** Solo refs de selects (jerarquía): son MongoIds de TG; no anteponer opción sintética DIOS. */
        return tenantGlobalSelects.tenantGlobalRef.map((o) => ({
          id: o.id,
          label: o.label,
        })) as TenantGlobal[];
      }

      /**
       * Reglas globales: el destino del POST/PUT es siempre un documento tenantGlobal (MongoId).
       */
      if (esReglasGlobales) {
        const fuente = resolveUniversoTenantGlobalesState();
        const refs = (tenantGlobalSelects.tenantGlobalRef || []).map((o) => ({
          id: o.id,
          label: o.label,
        })) as TenantGlobal[];

        let base = fuente.filter((t) => !isTenantSuperAdminScopeOption(String(t.id || '')));

        if (!base.length && refs.length) {
          base = refs.filter((t) => !isTenantSuperAdminScopeOption(String(t.id || '')));
        }

        const tenantGlobalIdsCorporativo = actorTenantCorporativo
          ? [
              ...new Set(
                herenciasUsuario
                  .filter(
                    (h: { tenantCorporativo?: { _id?: string } | string; tenantGlobal?: { _id?: string } | string }) =>
                      String(h?.tenantCorporativo?._id || h?.tenantCorporativo || '').trim() ===
                      actorTenantCorporativo,
                  )
                  .map((h: { tenantGlobal?: { _id?: string } | string }) =>
                    String(h?.tenantGlobal?._id || h?.tenantGlobal || '').trim(),
                  )
                  .filter(Boolean),
              ),
            ]
          : undefined;

        const actorTgJwt = actorTenantGlobal || undefined;

        return filtrarTenantGlobalesAlcanceJwtReglasGlobales({
          fuente: base.length ? base : fuente,
          actorTenantSuperAdminId: actorTenantSuper || undefined,
          actorTenantGlobalId: actorTgJwt,
          actorTenantCorporativoId: actorTenantCorporativo || undefined,
          saJerarquiaTieneCorporativoEnCounters:
            tenantGlobalActor?.saJerarquiaTieneCorporativoEnCounters === true,
          tenantGlobalIdsCorporativo,
        }) as TenantGlobal[];
      }

      return (() => {
        const merged = resolveUniversoTenantGlobalesState();
        return merged.length ? merged : tenantGlobales;
      })();
    }

    if (actorTenantGlobal) {
      // Para actualizar: TG solo puede gestionar herencias de su propio TG
      if (PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpointId)) {
        const ownTg = tenantGlobales.find((t) => String(t.id || '').trim() === actorTenantGlobal);
        return ownTg ? [ownTg] : [];
      }
      const allowed = expandByTree([actorTenantGlobal]);
      const visibles = tenantGlobales.filter((t) => allowed.has(String(t.id || '').trim()));
      return visibles.length ? visibles : tenantGlobales;
    }

    if (actorTenantCorporativo) {
      if (actorTenantGlobal) {
        const visibles = tenantGlobales.filter((t) => String(t.id || '').trim() === actorTenantGlobal);
        if (visibles.length) return visibles;
      }
      const tgFromHerencias = new Set(
        herenciasUsuario
          .filter((h: any) => String(h?.tenantCorporativo?._id || h?.tenantCorporativo || '').trim() === actorTenantCorporativo)
          .map((h: any) => String(h?.tenantGlobal?._id || h?.tenantGlobal || '').trim())
          .filter(Boolean)
      );
      const visibles = tenantGlobales.filter((t) => tgFromHerencias.has(String(t.id || '').trim()));
      return visibles.length ? visibles : tenantGlobales;
    }

    return [];
  };

  const getTenantGlobalesOpcionesPorSaActualizar = (
    saId: string,
    catalogOverride?: Record<string, any>,
  ): TenantGlobal[] => {
    const sa = String(saId || '').trim();
    if (!sa) return [];

    const fromRules = tenantGlobalesOpcionesDesdeReglasPorSa(sa, catalogOverride);
    const baseOpciones = getTenantGlobalOptions('tenant-actualizar-global-reglas').filter(
      (t) => !isTenantSuperAdminScopeOption(String(t.id || '')),
    );
    const jwtSa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();

    const mergeOpciones = (...lists: TenantGlobal[][]): TenantGlobal[] => {
      const byId = new Map<string, TenantGlobal>();
      lists.forEach((rows) => {
        rows.forEach((t) => {
          const id = normalizePermisoRefId(t.id);
          if (!id) return;
          const prev = byId.get(id);
          byId.set(id, prev ? { ...prev, ...t, id, label: prev.label || t.label } : { ...t, id });
        });
      });
      return Array.from(byId.values());
    };

    const saPorTgId = new Map<string, string>();
    tenantGlobales.forEach((t) => {
      const id = normalizePermisoRefId(t.id);
      const tsa = String(t.tenantSuperAdmin || '').trim();
      if (id && tsa) saPorTgId.set(id, tsa);
    });
    (tenantGlobalSelects.tenantGlobalRef || []).forEach((r) => {
      const id = normalizePermisoRefId(r.id);
      const tsa = String(r.meta?.tenantSuperAdmin || '').trim();
      if (id && tsa) saPorTgId.set(id, tsa);
    });

    const enriquecerSa = (rows: TenantGlobal[]) =>
      rows.map((t) => {
        const id = normalizePermisoRefId(t.id);
        if (!id) return t;
        const tsa = saPorTgId.get(id);
        const normalized = { ...t, id };
        if (!tsa || t.tenantSuperAdmin) return normalized;
        return { ...normalized, tenantSuperAdmin: tsa };
      }).filter((t) => Boolean(normalizePermisoRefId(t.id)));

    const universoJwt = enriquecerSa(baseOpciones);
    let filteredJerarquia = filtrarTenantGlobalesPorSaElegido(
      universoJwt,
      sa,
      saJerarquiaConCorporativo,
    ) as TenantGlobal[];

    if (!filteredJerarquia.length) {
      filteredJerarquia = filtrarTenantGlobalesPorSaElegido(
        enriquecerSa(
          resolveUniversoTenantGlobalesState().filter(
            (t) => !isTenantSuperAdminScopeOption(String(t.id || '')),
          ),
        ),
        sa,
        saJerarquiaConCorporativo,
      ) as TenantGlobal[];
    }

    /** Reglas materializadas tienen prioridad (TG real aunque falte tenantSuperAdmin en catálogo). */
    if (fromRules.length) {
      return mergeOpciones(fromRules, sa === jwtSa ? baseOpciones : filteredJerarquia);
    }

    if (sa === jwtSa) return baseOpciones;

    return filteredJerarquia;
  };

  const limpiarActualizarReglasAlCambiarSa = (endpointId: string) => {
    setTenantFilterByEndpoint((prev) => {
      const next = { ...prev };
      delete next[endpointId];
      return next;
    });
    setFieldValue(endpointId, 'x-regla-id', '');
    setDeltaByEndpoint((prev) => {
      const next = { ...prev };
      delete next[endpointId];
      return next;
    });
    setCatalogSelectionFor(endpointId, { vistas: [], acciones: [] });
    setPermisos(endpointId, [{ vistaId: '', accionId: [] }]);
    setReglasPoliticasRuntimeSel((prev) => ({ ...prev, [endpointId]: [] }));
  };

  const runHerenciaSyncCheck = async (endpointId: string, sincronizar: boolean) => {
    try {
      let tenantGlobalSelection = getFieldValue(endpointId, 'tenantGlobal').trim();
      const tenantCorporativoId = getFieldValue(endpointId, 'tenantCorporativo').trim();
      const esTenantSuperAdmin = !!String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
      if (!tenantGlobalSelection && esTenantSuperAdmin) {
        const options = getTenantGlobalOptions(endpointId);
        const firstTenantId = String(options?.[0]?.id || '').trim();
        if (firstTenantId) {
          tenantGlobalSelection = firstTenantId;
          setFieldValue(endpointId, 'tenantGlobal', firstTenantId);
          await fetchHerenciasAsociadasByTenantGlobal(endpointId, firstTenantId);
        }
      }
      if (!tenantGlobalSelection && !esTenantSuperAdmin) {
        toast.error('Selecciona tenant global antes de validar sincronizacion');
        return;
      }
      const tenantGlobalId = isTenantSuperAdminScopeOption(tenantGlobalSelection) ? '' : tenantGlobalSelection;

      setSyncRunningByEndpoint((prev) => ({ ...prev, [endpointId]: true }));

      const qs = new URLSearchParams();
      if (tenantGlobalId) qs.set('tenantGlobal', tenantGlobalId);
      if (tenantCorporativoId) qs.set('tenantCorporativo', tenantCorporativoId);
      if (isTenantSuperAdminScopeOption(tenantGlobalSelection)) {
        const saPicked = tenantGlobalSelection.slice(TENANT_SUPERADMIN_SCOPE_PREFIX.length).trim();
        if (saPicked) {
          qs.set('tenantSuperTenant', toMongoIdQueryParam(saPicked));
          qs.set('incluirSuperAdmin', 'true');
        }
      }
      if (sincronizar) qs.set('sincronizar', 'true');

      const payload = await apiFetch(`/api/config/permisos/creacion/admin/tenant/global?${qs.toString()}`, {
        method: 'GET',
      });

      setSyncInfoByEndpoint((prev) => ({ ...prev, [endpointId]: payload }));
      if (tenantGlobalSelection) {
        await fetchHerenciasAsociadasByTenantGlobal(endpointId, tenantGlobalSelection, null, { notify: true });
      }
      if (!sincronizar) {
        toast.success('Validación de rutas completada (solo lectura, sin transacción de escritura).');
      }
      if (sincronizar) {
        toastTransaccionDesdePayload(
          (payload as any)?.transaccionResumen,
          'Sincronización ejecutada (sin cambios pendientes en base de datos).'
        );

        // Tras sincronizar: solo refrescar selección en UI (GET). El PUT se ejecuta al pulsar Guardar en la tarjeta actualizar.
        if (PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpointId)) {
          const herenciaId = getFieldValue(endpointId, 'herenciaAsociada').trim();
          if (herenciaId) {
            const { vistasCatalogo, accionesCatalogo } = getPermisosCatalog(endpointId);
            const todasVistas = vistasCatalogo.map((v) => v.id);
            const todasAcciones = accionesCatalogo.map((a) => a.id);
            setCatalogSelectionFor(endpointId, { vistas: todasVistas, acciones: todasAcciones });
            applyHerenciaAsociadaSelection(endpointId, herenciaId);
          }
        }
      }
    } catch (error: any) {
      if (!toastErrorConTransaccion(error)) {
        toast.error(String(error?.message || 'No se pudo ejecutar la sincronizacion'));
      }
    } finally {
      setSyncRunningByEndpoint((prev) => ({ ...prev, [endpointId]: false }));
    }
  };
  const applyHerenciaAsociadaSelection = (
    endpointId: string,
    herenciaId: string,
    /** Mapa recién obtenido del GET (evita leer state obsoleto justo después de setHerenciaAsociadaDataByEndpoint). */
    byIdOverride?: Record<string, any>
  ) => {
    const byId = byIdOverride || herenciaAsociadaDataByEndpoint[endpointId] || {};
    const row = byId[herenciaId];
    if (!row) {
      setCatalogSelectionFor(endpointId, { vistas: [], acciones: [] });
      setPermisos(endpointId, [{ vistaId: '', accionId: [] }]);
      return;
    }

    const vistasIds = Array.isArray(row?.vistas)
      ? row.vistas.map((v: any) => normalizePermisoRefId(v)).filter(Boolean)
      : [];
    const accionesIds = Array.isArray(row?.acciones)
      ? row.acciones.map((a: any) => normalizePermisoRefId(a)).filter(Boolean)
      : [];

    setCatalogSelectionFor(endpointId, {
      vistas: vistasIds,
      acciones: accionesIds,
    });

    const permisos = vistasIds.map((vistaId: string) => ({
      vistaId,
      accionId: accionesIds,
    }));
    setPermisos(endpointId, permisos.length ? permisos : [{ vistaId: '', accionId: [] }]);
  };
  const fetchHerenciasAsociadasByTenantGlobal = async (
    endpointId: string,
    tenantGlobalId: string,
    ruleCatalogSnapshot?: Record<string, any> | null,
    options?: { notify?: boolean }
  ): Promise<string> => {
    const notify = options?.notify === true;
    try {
      const catalogForRules = ruleCatalogSnapshot ?? ruleCatalog;
      const tgSelection = String(tenantGlobalId || '').trim();
      if (!tgSelection) {
        setHerenciaAsociadaOptionsByEndpoint((prev) => ({ ...prev, [endpointId]: [] }));
        setHerenciaAsociadaDataByEndpoint((prev) => ({ ...prev, [endpointId]: {} }));
        setFieldValue(endpointId, 'herenciaAsociada', '');
        return '';
      }
      const isTsaScope = isTenantSuperAdminScopeOption(tgSelection);
      const tg = isTsaScope ? '' : tgSelection;

      const qs = new URLSearchParams();
      if (tg) qs.set('tenantGlobal', tg);
      if (tg) qs.set('incluirSuperAdmin', 'false');
      if (isTsaScope) {
        const saPicked = tgSelection.slice(TENANT_SUPERADMIN_SCOPE_PREFIX.length).trim();
        if (saPicked) {
          qs.set('tenantSuperTenant', toMongoIdQueryParam(saPicked));
          qs.set('incluirSuperAdmin', 'true');
        }
      }
      qs.set('soloActivos', 'true');
      const res: any = await apiFetch(
        `/api/config/permisos/creacion/admin/tenant/global?${qs.toString()}`,
        { method: 'GET' }
      );
      let rows = pickArray(res, ['data', 'items', 'herencias']).filter((row: any) => {
        if (!tg) return true;
        const rowTg = getEntityId(row?.tenantGlobal);
        return rowTg === tg;
      });
      if (isTsaScope) {
        const saPicked = tgSelection.slice(TENANT_SUPERADMIN_SCOPE_PREFIX.length).trim();
        if (saPicked) {
          rows = rows.filter((row: any) =>
            idsPermisoRefsCoinciden(row?.tenantSuperTenant, saPicked)
          );
        }
      }
      const byId: Record<string, any> = {};
      const actorTgScope = String(tenantGlobalActor?.tenantGlobalId || '').trim();
      const esTgScope = !isTsaScope && !!actorTgScope;
      const { byId: vistaLocationMap, byPath: vistaByPath } = buildVistaLocationMap(rutasJerarquia);
      const options = rows
        .map((row: any) => {
          const id = getEntityId(row);
          if (!id) return null;
          byId[id] = row;
          const vCount = Array.isArray(row?.vistas) ? row.vistas.length : 0;
          const aCount = Array.isArray(row?.acciones) ? row.acciones.length : 0;
          // Omitir herencias sin vistas parametrizadas
          if (vCount === 0) return null;
          const tc = getEntityId(row?.tenantCorporativo);
          const tcLabel = getEntityLabel(row?.tenantCorporativo);
          const tgId = getEntityId(row?.tenantGlobal);
          const tgFromState = tenantGlobales.find((t) => String(t.id || '').trim() === tgId);
          const tgLabelBase = tgFromState
            ? String(tgFromState.label || '').trim().split('|')[0].trim()
            : getEntityLabel(row?.tenantGlobal);
          const tgDisplay = tgLabelBase || tgId.slice(-8) || id.slice(-8);
          const vistasDetalle: VistaItem[] = (Array.isArray(row?.vistas) ? row.vistas : [])
            .map((vista: any) => ({
              id: getEntityId(vista),
              label: String(vista?.name || vista?.path || getEntityId(vista)).trim(),
              path: String(vista?.path || '').trim(),
            }))
            .filter((vista: VistaItem) => vista.id);
          const { suiteGroups, sinSuite } = buildGroupedVistas(vistasDetalle, vistaLocationMap, vistaByPath);
          const suiteSummary = buildSuiteSummaryLabel(suiteGroups, sinSuite.length);
          const tcDisplay = tcLabel || (tc ? tc.slice(-6) : '');
          if (esTgScope) {
            return {
              id,
              label: `${tgDisplay}${tcDisplay ? ` | TC:${tcDisplay}` : ''} | Suites:${suiteSummary} | V:${vCount} A:${aCount}`,
              meta: {
                suiteSummary,
                tenantGlobalLabel: tgDisplay,
                tenantCorporativoLabel: tcDisplay,
              },
            };
          }
          const fuente = String(row?.fuenteHerencia || 'tenantGlobal').trim();
          if (endpointId === 'perm-admin-tenant-global-desactivar' && fuente !== 'tenantGlobal') return null;
          const rol = String(row?.rolId?.rol || row?.rolId?._id || row?.rolId || 'SIN_ROL').trim();
          const usuario = String(row?.usuarioId?.nombre || row?.usuarioId?.name || row?.usuarioId?._id || '-').trim();
          const fuenteTxt = fuente === 'tenantSuperAdmin' ? '[SUPERADMIN]' : fuente === 'regla' ? '[REGLA PARAM]' : '[TENANT]';
          return {
            id,
            label: `${fuenteTxt} ${tgDisplay}${tcDisplay ? ` | TC:${tcDisplay}` : ''} | Suites:${suiteSummary} | Rol:${rol} | V:${vCount} A:${aCount}`,
            meta: {
              suiteSummary,
              tenantGlobalLabel: tgDisplay,
              tenantCorporativoLabel: tcDisplay,
              fuenteHerencia: fuenteTxt,
              usuario,
            },
          };
        })
        .filter(Boolean) as GenericSelectOption[];

      const mergedOptions: GenericSelectOption[] = [...options];
      const tieneHerenciaPersistida = rows.some((row: any) => {
        const id = getEntityId(row);
        if (!id) return false;
        const vCount = Array.isArray(row?.vistas) ? row.vistas.length : 0;
        if (vCount === 0) return false;
        return String(row?.fuenteHerencia || 'tenantGlobal').trim() !== 'regla';
      });
      // Herencia persistida y reglas del catálogo son mutuamente excluyentes en el select.
      // Si ya existe herencia (SUPERADMIN / TENANT / CORP), no mezclar con `[REGLA CAT]`.
      const esHerenciaAdminGlobal =
        endpointId === 'perm-admin-tenant-global' ||
        PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpointId) ||
        endpointId === 'perm-listar-herencias';
      if (esHerenciaAdminGlobal && tieneHerenciaPersistida) {
        const persistedIds = new Set(
          options
            .filter((opt) => {
              const row = byId[opt.id];
              return row && String(row?.fuenteHerencia || 'tenantGlobal').trim() !== 'regla';
            })
            .map((opt) => opt.id),
        );
        mergedOptions.splice(0, mergedOptions.length, ...options.filter((opt) => persistedIds.has(opt.id)));
        Object.keys(byId).forEach((key) => {
          if (!persistedIds.has(key)) delete byId[key];
        });
      } else if (esHerenciaAdminGlobal) {
        const jwtSa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
        const effectiveSa = resolveTenantSuperAdminIdForHerenciaSelect(tgSelection, tenantGlobales, jwtSa);
        if (effectiveSa && Object.keys(catalogForRules || {}).length > 0) {
          let reglas = findReglasPorTenantSuperAdmin(catalogForRules, effectiveSa).sort((a: any, b: any) => {
            const pa = a?.securityPlatform === true ? 0 : a?.securityPlatform === false ? 1 : 2;
            const pb = b?.securityPlatform === true ? 0 : b?.securityPlatform === false ? 1 : 2;
            return pa - pb;
          });
          if (!isTsaScope && tgSelection) {
            reglas = reglas.filter((r: any) => {
              const tgRule = resolveTenantGlobalIdFromRule(r);
              if (!tgRule) return true;
              return tgRule === tgSelection;
            });
          }
          if (!reglas.length) {
            const plataforma = findReglaPlataformaPorSuperAdmin(catalogForRules, effectiveSa);
            if (plataforma) reglas = [plataforma];
          }
          const tgDisplay = (() => {
            if (isTsaScope) return `SA:${effectiveSa.slice(-8)}`;
            const tSel = tenantGlobales.find((t) => String(t.id) === tgSelection);
            if (tSel) return String(tSel.label || '').trim().split('|')[0].trim() || tgSelection.slice(-8);
            return effectiveSa.slice(-8);
          })();
          for (const regla of reglas) {
            const rid = resolveReglaLegacyId(regla) || resolveReglaPublicId(regla);
            if (!rid) continue;
            const syntheticId = `${REGLA_SA_SYNTH_PREFIX}${rid}`;
            if (mergedOptions.some((o) => o.id === syntheticId)) continue;
            const recursos = Array.isArray(regla?.recurso) ? regla.recurso : [];
            const accs = Array.isArray(regla?.accionesUsu) ? regla.accionesUsu : [];
            if (!recursos.length && !accs.length) continue;
            const vistasDetalle: VistaItem[] = recursos
              .map((vista: any) => {
                const id = normalizePermisoRefId(vista);
                if (!id) return null;
                return {
                  id,
                  label: String(vista?.name || vista?.path || id).trim(),
                  path: String(vista?.path || '').trim(),
                };
              })
              .filter((vista): vista is VistaItem => Boolean(vista?.id));
            const vCount = vistasDetalle.length;
            const aCount = accs.length;
            const { suiteGroups, sinSuite } = buildGroupedVistas(vistasDetalle, vistaLocationMap, vistaByPath);
            const suiteSummary = buildSuiteSummaryLabel(suiteGroups, sinSuite.length);
            const ruleLabel = String(regla?.nombre || regla?.name || rid.slice(-8)).trim();
            byId[syntheticId] = {
              _id: syntheticId,
              fuenteHerencia: 'regla',
              vistas: recursos.map((v: any) => {
                const id = normalizePermisoRefId(v);
                return id
                  ? { _id: id, name: v?.name, path: v?.path, iud: v?.iud }
                  : v;
              }).filter((v: any) => normalizePermisoRefId(v)),
              acciones: accs.map((a: any) => {
                const id = normalizePermisoRefId(a);
                return id
                  ? { _id: id, etiquetas: a?.etiquetas, method: a?.method, iud: a?.iud }
                  : a;
              }).filter((a: any) => normalizePermisoRefId(a)),
            };
            mergedOptions.push({
              id: syntheticId,
              label: `[REGLA CAT] ${ruleLabel} | ${tgDisplay} | Suites:${suiteSummary} | V:${vCount} A:${aCount}`,
              meta: {
                suiteSummary,
                tenantGlobalLabel: tgDisplay,
                tenantCorporativoLabel: '',
                fuenteHerencia: '[REGLA CAT]',
                usuario: '',
              },
            });
          }
        }
      }

      const current = getFieldValue(endpointId, 'herenciaAsociada').trim();
      const nextId =
        !current || !mergedOptions.some((o) => o.id === current) ? mergedOptions[0]?.id || '' : current;

      const prevMapHerencia = herenciaAsociadaDataByEndpoint[endpointId] || {};
      const oldSnap = nextId ? snapshotHerenciaPermisos(prevMapHerencia[nextId]) : '';
      const newSnap = nextId ? snapshotHerenciaPermisos(byId[nextId]) : '';
      const permisosCambiaronEnServidor =
        Boolean(nextId && oldSnap && newSnap && oldSnap !== newSnap);

      setHerenciaAsociadaOptionsByEndpoint((prev) => ({ ...prev, [endpointId]: mergedOptions }));
      setHerenciaAsociadaDataByEndpoint((prev) => ({ ...prev, [endpointId]: byId }));

      setFieldValue(endpointId, 'herenciaAsociada', nextId);
      if (nextId) applyHerenciaAsociadaSelection(endpointId, nextId, byId);
      if (permisosCambiaronEnServidor) {
        toast.success('La herencia cambió en servidor; se aplicó la asignación nueva en vistas y acciones.');
      } else if (notify) {
        if (mergedOptions.length) {
          toast.success(`${mergedOptions.length} herencia(s)/regla(s) disponibles para el alcance seleccionado.`);
        } else {
          toast.warning('No hay herencias ni reglas en catálogo para este alcance.');
        }
      }
      return nextId;
    } catch (error: any) {
      const msg = String(error?.message || 'No se pudieron cargar herencias asociadas').trim();
      if (notify) toast.error(msg);
      setHerenciaAsociadaOptionsByEndpoint((prev) => ({ ...prev, [endpointId]: [] }));
      setHerenciaAsociadaDataByEndpoint((prev) => ({ ...prev, [endpointId]: {} }));
      setFieldValue(endpointId, 'herenciaAsociada', '');
      return '';
    }
  };

  /** GET listar/reglas acotado al SA o TG elegido en el formulario (no solo JWT). */
  const loadRuleCatalogParaAlcance = async (endpointId: string): Promise<Record<string, any>> => {
    const tgSel = String(getFieldValue(endpointId, 'tenantGlobal') || '').trim();
    const reglasParams: { tenantSuperTenant?: string; tenantGlobal?: string } = {};
    if (isTenantSuperAdminScopeOption(tgSel)) {
      const saPicked = tgSel.slice(TENANT_SUPERADMIN_SCOPE_PREFIX.length).trim();
      if (saPicked) reglasParams.tenantSuperTenant = toMongoIdQueryParam(saPicked);
    } else if (tgSel) {
      reglasParams.tenantGlobal = toMongoIdQueryParam(tgSel);
    }
    const res: any = await fetchReglasTenantCached(reglasParams);
    const rows = pickArray(res, ['data', 'reglas', 'items']);
    const rulesMap: Record<string, any> = {};
    rows.forEach((r: any) => {
      const rid = resolveReglaPublicId(r);
      const ridRaw = resolveReglaLegacyId(r);
      if (rid) rulesMap[rid] = r;
      if (ridRaw && ridRaw !== rid) rulesMap[ridRaw] = r;
    });
    return rulesMap;
  };

  /** Recarga reglas del SA elegido (generacionTenatGlobales) para actualizar sin TG materializado. */
  const refreshReglasCatalogoPorSaActualizar = async (
    endpointId: string,
    saId: string,
  ): Promise<{ rulesMap: Record<string, any>; options: ReglaOption[] }> => {
    const empty = { rulesMap: {} as Record<string, any>, options: [] as ReglaOption[] };
    if (endpointId !== 'tenant-actualizar-global-reglas') return empty;
    const saCanon = resolveSaIdCanonicoParaReglas(saId) || String(saId || '').trim();
    if (!saCanon) return empty;
    // Operación de refresco explícito: limpiar cache para ver datos actualizados.
    invalidarReglasCache();
    const variantes = [...resolveSaIdsEquivalentes(saCanon)];
    const saQueries = [
      ...variantes,
      saCanon,
      ...variantes.filter((id) => /^[a-f0-9]{24}$/i.test(id)),
    ].filter((id, idx, arr) => id && arr.indexOf(id) === idx);
    const fetchRows = async (): Promise<any[]> => {
      for (const saQuery of saQueries) {
        try {
          const res: any = await fetchReglasTenantCached({
            tenantSuperTenant: toMongoIdQueryParam(saQuery),
          });
          const rows = pickArray(res, ['data', 'reglas', 'items']);
          if (rows.length) return rows;
        } catch {
          /* intentar siguiente variante de id */
        }
      }
      return [];
    };
    try {
      const rows = await fetchRows();
      if (!rows.length) return empty;
      const rulesMap: Record<string, any> = {};
      const nuevasOpciones: ReglaOption[] = [];
      rows.forEach((r: any) => {
        const rid = resolveReglaPublicId(r);
        const ridRaw = resolveReglaLegacyId(r);
        if (rid) {
          rulesMap[rid] = r;
          const platformFlag = r?.securityPlatform === true ? 'DIOS' : 'TENANT';
          const base = r?.nombre || r?.name || r?.titulo || `Regla ${ridRaw.slice(0, 8) || rid.slice(0, 8)}`;
          nuevasOpciones.push({ id: rid, label: `[${platformFlag}] ${base}` });
        }
        if (ridRaw && ridRaw !== rid) rulesMap[ridRaw] = r;
      });
      setRuleCatalog((prev) => ({ ...prev, ...rulesMap }));
      if (nuevasOpciones.length) {
        setReglas((prev) => {
          const byId = new Map(prev.map((x) => [x.id, x]));
          nuevasOpciones.forEach((o) => byId.set(o.id, o));
          return Array.from(byId.values());
        });
      }
      return { rulesMap, options: nuevasOpciones };
    } catch {
      return empty;
    }
  };

  /** Carga reglas del alcance y herencias parametrizadas del tenant (misma secuencia que POST perm-admin). */
  const fetchHerenciasConReglasParaTenant = (
    endpointId: string,
    tenantGlobalId: string,
    opts?: { notify?: boolean; successToastReglas?: boolean }
  ) => {
    void (async () => {
      try {
        const rulesMap = await loadRuleCatalogParaAlcance(endpointId);
        if (Object.keys(rulesMap).length) {
          setRuleCatalog((prev) => ({ ...prev, ...rulesMap }));
          if (opts?.successToastReglas) {
            toast.success(`Reglas cargadas para el alcance (${Object.keys(rulesMap).length}).`);
          }
        }
        await fetchHerenciasAsociadasByTenantGlobal(endpointId, tenantGlobalId, rulesMap, {
          notify: opts?.notify ?? false,
        });
      } catch (err: any) {
        if (opts?.notify !== false) {
          toast.error(String(err?.message || 'No se pudo cargar reglas y herencias del tenant'));
        }
        try {
          await fetchHerenciasAsociadasByTenantGlobal(endpointId, tenantGlobalId, null, {
            notify: opts?.notify ?? false,
          });
        } catch {
          /* ya notificado arriba */
        }
      }
    })();
  };

  /** Lista reglas desde API, actualiza catálogo y vuelve a GET herencias para alinear vistas/acciones (sin marcar checks a mano). */
  const sincronizarCatalogoReglasYHerencia = async (endpointId: string) => {
    let tgSel = String(getFieldValue(endpointId, 'tenantGlobal') || '').trim();
    if (!tgSel && actorEsTenantSuperAdmin()) {
      const firstScope = getTenantGlobalOptions(endpointId).find((option) =>
        isTenantSuperAdminScopeOption(String(option.id || ''))
      );
      const fallbackScope =
        firstScope?.id ||
        `${TENANT_SUPERADMIN_SCOPE_PREFIX}${String(tenantGlobalActor?.tenantSuperAdminId || '').trim()}`;
      if (fallbackScope && isTenantSuperAdminScopeOption(fallbackScope)) {
        tgSel = fallbackScope;
        setFieldValue(endpointId, 'tenantGlobal', fallbackScope);
      }
    }
    if (!tgSel) {
      toast.warning('Selecciona el tenant global (o alcance SuperAdmin) antes de sincronizar.');
      return;
    }
    const countAntes = Object.keys(ruleCatalog || {}).length;
    const digestAntes = ruleCatalogPermisosDigest;
    setReglasHerenciaSyncBusy(true);
    try {
      const syncQs = new URLSearchParams();
      const tenantGlobalReal = isTenantSuperAdminScopeOption(tgSel) ? '' : tgSel;
      const tenantCorporativoId = getFieldValue(endpointId, 'tenantCorporativo').trim();
      if (tenantGlobalReal) syncQs.set('tenantGlobal', toMongoIdQueryParam(tenantGlobalReal));
      if (tenantCorporativoId) syncQs.set('tenantCorporativo', toMongoIdQueryParam(tenantCorporativoId));
      if (isTenantSuperAdminScopeOption(tgSel)) {
        const saPicked = tgSel.slice(TENANT_SUPERADMIN_SCOPE_PREFIX.length).trim();
        if (saPicked) syncQs.set('tenantSuperTenant', toMongoIdQueryParam(saPicked));
      }
      syncQs.set('soloActivos', 'true');
      syncQs.set('sincronizar', 'true');

      const syncPayload: any = await apiFetch(
        `/api/config/permisos/creacion/admin/tenant/global?${syncQs.toString()}`,
        { method: 'GET' }
      );
      const syncResumen = syncPayload?.sincronizacionResumen || {};
      const contextosSincronizados = Number(syncResumen?.contextosSincronizados || 0);
      const rutasSincronizadas = Number(syncResumen?.rutasSincronizadasAproximadas || 0);
      toastTransaccionDesdePayload(syncPayload?.transaccionResumen);

      invalidarReglasCache();
      const rulesMap = await loadRuleCatalogParaAlcance(endpointId);
      const digestDespues = computeRuleCatalogPermisosDigest(rulesMap);
      const countDespues = Object.keys(rulesMap).length;
      const catalogoCambio = digestAntes !== digestDespues;

      setRuleCatalog(rulesMap);
      if (countDespues > 0) {
        toast.success(`Catálogo de reglas cargado: ${countDespues} documento(s).`);
      } else {
        toast.warning('No se encontraron reglas para el SuperAdmin/tenant elegido.');
      }

      const herenciaAplicada = await fetchHerenciasAsociadasByTenantGlobal(
        endpointId,
        tgSel,
        rulesMap,
        { notify: true }
      );

      const lineas: string[] = [
        `Documentos en catálogo de reglas: ${countAntes} → ${countDespues}.`,
        countDespues === 0
          ? 'No se encontraron reglas para el SuperAdmin/tenant elegido. Verifica generacionTenatGlobales en Mongo y el dominio activo.'
          : '',
        `SincronizaciÃ³n servidor: ${contextosSincronizados} contexto(s), ${rutasSincronizadas} vista(s) agregada(s) a herencia.`,
        catalogoCambio
          ? 'Hay cambios en el catálogo (reglas nuevas o permisos/recursos actualizados).'
          : 'La firma del catálogo coincide con la anterior (mismo contenido efectivo de permisos).',
        herenciaAplicada
          ? `Herencia aplicada al formulario (id): ${herenciaAplicada}`
          : 'No quedó herencia seleccionada (sin opciones o sin datos).',
        'Las listas Vistas / Acciones reflejan la herencia devuelta por el servidor.',
      ].filter(Boolean);
      setReglasHerenciaSyncReport({ lineas });
      if (herenciaAplicada) {
        toast.success('Vistas y acciones del formulario actualizadas desde herencia/regla.');
      }
    } catch (e: any) {
      if (!toastErrorConTransaccion(e)) {
        toast.error(String(e?.message || 'No se pudo sincronizar catálogo y herencia'));
      }
    } finally {
      setReglasHerenciaSyncBusy(false);
    }
  };

  /** Tras «Recargar datos API»: volver a GET herencias para alinear checkboxes con el servidor. */
  useEffect(() => {
    const prev = hydrateLoadingPrevRef.current;
    hydrateLoadingPrevRef.current = loadingData;
    if (prev !== true || loadingData !== false) return;
    const epModal = resolveActiveHerenciaEndpointId();
    if (!epModal) return;
    const esModalHerenciasAdmin =
      epModal === 'perm-admin-tenant-global' ||
      PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(epModal) ||
      epModal === 'perm-admin-tenant-global-desactivar' ||
      epModal === 'perm-admin-tenant-global-eliminar';
    if (!esModalHerenciasAdmin) return;
    const tgSel = getFieldValue(epModal, 'tenantGlobal').trim();
    if (!tgSel) return;
    if (
      epModal === 'perm-admin-tenant-global' ||
      PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(epModal)
    ) {
      fetchHerenciasConReglasParaTenant(epModal, tgSel);
    } else {
      void fetchHerenciasAsociadasByTenantGlobal(epModal, tgSel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo fin de hidratación
  }, [loadingData, endpointModal?.id, useModuloInlineFlow, inlineModuloMenu.activeEndpoint?.id]);

  /** Select compuesto tenantSuperAdmin vs tenant global (perm-admin-*): un solo campo `tenantGlobal` en el formulario. */
  const applyPermAdminTenantGlobalSelection = (endpointId: string, fieldName: string, nextValue: string) => {
    setFieldValue(endpointId, fieldName, nextValue);
    if (endpointId === 'perm-admin-tenant-global' || PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpointId)) {
      setPermisos(endpointId, [{ vistaId: '', accionId: [] }]);
      setCatalogSelectionFor(endpointId, { vistas: [], acciones: [] });
      setBulkAllFor(endpointId, false);
      setSyncInfoByEndpoint((prev) => ({ ...prev, [endpointId]: null }));
      setHerenciaAsociadaOptionsByEndpoint((prev) => ({ ...prev, [endpointId]: [] }));
      setHerenciaAsociadaDataByEndpoint((prev) => ({ ...prev, [endpointId]: {} }));
      setFieldValue(endpointId, 'herenciaAsociada', '');
      if (nextValue) {
        fetchHerenciasConReglasParaTenant(endpointId, nextValue, {
          notify: true,
          successToastReglas: endpointId === 'perm-admin-tenant-global',
        });
      }
      setTenantCorpErrorByEndpoint((prev) => ({ ...prev, [endpointId]: '' }));
      if (endpointId === 'perm-admin-tenant-global' && nextValue) {
        setFieldValue(endpointId, 'tenantCorporativo', '');
        if (!isTenantSuperAdminScopeOption(nextValue)) {
          void fetchTenantCorporativosByGlobal(endpointId, nextValue);
        }
      }
    }
  };

  const fetchTenantGlobalesFromHerenciasJwt = async (): Promise<TenantGlobal[]> => {
    try {
      const res: any = await apiFetch('/api/config/permisos/creacion/admin/tenant/global?soloActivos=true', {
        method: 'GET',
      });
      const rows = pickArray(res, ['data', 'items', 'herencias']);
      const byId = new Map<string, TenantGlobal>();
      rows.forEach((row: any) => {
        const tgId = String(row?.tenantGlobal?._id || row?.tenantGlobal || '').trim();
        if (!tgId) return;
        if (byId.has(tgId)) return;
        const tgLabel = String(row?.tenantGlobal?.label || row?.tenantGlobal?.nombre || row?.tenantGlobal?.name || '').trim();
        byId.set(tgId, {
          id: tgId,
          label: tgLabel ? `${tgLabel} | ${tgId}` : tgId,
          corporativo: String(row?.tenantGlobal?.corporativo || '').trim(),
          tenantSuperAdmin: String(row?.tenantGlobal?.tenantSuperAdmin || '').trim() || undefined,
          tenantGlobalAdmin: String(row?.tenantGlobal?.tenantGlobalAdmin || '').trim() || undefined,
        });
      });
      return Array.from(byId.values());
    } catch {
      return [];
    }
  };
  const renderHerenciaAsociadaDetalle = (endpointId: string): React.ReactElement | null => <GobernanzaHerenciaAsociadaDetalle endpointId={endpointId} />;
  const getPermisosCatalog = (
    endpointId: string,
    ruleIdOverride?: string,
    deltaOverride?: any,
  ) => computePermisosCatalog(
    {
      vistas, rutasJerarquia, diosRecursosJerarquiaFlat, acciones, ruleCatalog,
      deltaByEndpoint, loadingDeltaByEndpoint, herenciaAsociadaDataByEndpoint, herenciasUsuario, tenantGlobales,
      tenantGlobalActor, result,
      getFieldValue, actorEsTenantGlobalScope, actorEsTenantSuperAdmin,
      getHeredaOptionsPermitidasPorTenantGlobal, getHerenciaGlobalOpcionesParaTG,
      resolveReglaTechoPermUsuario,
      PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS,
      consultaReglasGlobalesRamaCorporativo,
      findReglaTechoJerarquiaSa,
      getReglasFiltradasPorTenant,
      resolveSaParaReglasGlobalesEndpoint,
      resolveTenantGlobalIdFromRule,
      resolveTenantGlobalParaReglasEndpoint,
    },
    endpointId, ruleIdOverride, deltaOverride,
  );

  /**
   * Etiqueta de ruta para IDs guardados en herenciaGlobal: GET vistas/contexto + árbol listarRutas (seguridad).
   * Alineado con resolveVistaCatalogByIds dentro de getPermisosCatalog.
   */
  const resolverVistaDesdeRutasSeguridad = (rawId: string): Vista => {
    const id = String(rawId || '').trim();
    if (!id) return { id: '', label: '', path: '' };
    const fromList = vistas.find((v) => v.id === id);
    if (fromList) return { id, label: fromList.label, path: fromList.path };

    for (const suite of rutasJerarquia) {
      const suiteId = getEntityId(suite);
      if (suiteId === id) {
        return {
          id,
          label: String(suite?.name || suite?.path || id),
          path: String((suite as any)?.path || ''),
        };
      }
      const hit = collectAllNodes(suite.children || []).find((n: any) => String(n?._id || '') === id);
      if (hit) {
        return {
          id,
          label: String(hit?.name || hit?.path || id),
          path: String(hit?.path || ''),
        };
      }
    }
    return { id, label: id, path: '' };
  };

  const getPermisos = (endpointId: string): PermisoItem[] => permisoData[endpointId] || [{ vistaId: '', accionId: [] }];
  const setPermisos = (endpointId: string, value: PermisoItem[]) => setPermisoData((prev) => ({ ...prev, [endpointId]: value }));
  const fetchTenantCorporativosByGlobal = async (endpointId: string, tenantGlobalId: string) => {
    const tg = tenantGlobalId.trim();
    if (!tg) return;
    try {
      setTenantCorpLoadingByEndpoint((prev) => ({ ...prev, [endpointId]: true }));
      setTenantCorpErrorByEndpoint((prev) => ({ ...prev, [endpointId]: '' }));
      const response = await apiFetch(`/api/config/permisos/creacion/admin/tenant/corporativos?tenantGlobal=${encodeURIComponent(tg)}`, {
        method: 'GET'
      });
      const rows = pickArray(response, ['data', 'items']);
      const mapped = rows
        .map((row: any) => {
          const id = String(row?.id || row?._id || row?.iud || '').trim();
          const tenantGlobalRow = String(
            row?.tenantGlobalId ||
            row?.tenantGlobal?._id ||
            row?.tenantGlobal ||
            tg
          ).trim();
          if (!id || !tenantGlobalRow) return null;
          const label = String(row?.label || row?.name || row?.nombre || id).trim();
          return { id, tenantGlobalId: tenantGlobalRow, label: `${label} | ${id}` };
        })
        .filter(Boolean) as TenantCorporativoOption[];

      setTenantCorporativos((prev) => {
        const keep = prev.filter((x) => x.tenantGlobalId !== tg);
        const unique = new Map<string, TenantCorporativoOption>();
        [...keep, ...mapped].forEach((item) => unique.set(`${item.tenantGlobalId}:${item.id}`, item));
        return Array.from(unique.values());
      });
    } catch (error: any) {
      const message = String(error?.message || 'No se pudo cargar tenant corporativo').trim();
      setTenantCorpErrorByEndpoint((prev) => ({ ...prev, [endpointId]: message }));
      toast.error(message);
    } finally {
      setTenantCorpLoadingByEndpoint((prev) => ({ ...prev, [endpointId]: false }));
    }
  };
  const getAccionesPorVistaDesdeRegla = (endpointId: string): Map<string, string[]> => {
    const ruleId = getFieldValue(endpointId, 'x-regla-id').trim();
    const rule = ruleCatalog[ruleId];
    const map = new Map<string, string[]>();
    if (!rule) return map;

    const global = extractPermisoRefIds(rule?.accionesUsu);

    const permisosDetalle = Array.isArray((rule as any)?.permisos) ? (rule as any).permisos : [];
    permisosDetalle.forEach((p: any) => {
      const vistaId = normalizePermisoRefId(p?.vistaId);
      const accionIds = extractPermisoRefIds(p?.accionId);
      if (vistaId) map.set(vistaId, accionIds.length ? accionIds : global);
    });

    if (!permisosDetalle.length) {
      (Array.isArray(rule?.recurso) ? rule.recurso : []).forEach((r: any) => {
        const vistaId = normalizePermisoRefId(r);
        if (vistaId) map.set(vistaId, global);
      });
    }

    return map;
  };

  const loadDeltaForRule = async (endpointId: string, ruleId: string) => {
    if (consultaReglasGlobalesRamaCorporativo(endpointId)) return;
    setLoadingDeltaByEndpoint((prev) => ({ ...prev, [endpointId]: true }));
    const rule = ruleCatalog[ruleId];
    try {
      const res = await apiFetch('/api/config/tenant/reglas/globales/delta', {
        method: 'GET',
        headers: { 'x-regla-id': ruleId },
      });
      if (res?.ok && res?.data) {
        const deltaPayload = res.data;
        setDeltaByEndpoint((prev) => ({ ...prev, [endpointId]: deltaPayload }));
        if (deltaPayload?.reglaActual && ruleId) {
          setRuleCatalog((prev) => {
            const current = prev[ruleId] || rule || {};
            return {
              ...prev,
              [ruleId]: {
                ...current,
                recurso: Array.isArray(deltaPayload.reglaActual?.recurso)
                  ? deltaPayload.reglaActual.recurso
                  : current.recurso,
                accionesUsu: Array.isArray(deltaPayload.reglaActual?.accionesUsu)
                  ? deltaPayload.reglaActual.accionesUsu
                  : current.accionesUsu,
              },
            };
          });
        }
        const ctxArr = Array.isArray(deltaPayload.contextoResuelto) ? deltaPayload.contextoResuelto : [];
        const ctxId = resolveContextoIdFromRegla({ contextoDefi: ctxArr }, contextos);
        if (ctxId) setFieldValue(endpointId, 'contextoDefi', ctxId);
        const ruleDoc = rule || ruleCatalog[ruleId];
        if (ruleDoc) {
          const rawSel = buildCatalogSelectionFromReglaGlobal({
            ...ruleDoc,
            recurso: [
              ...(Array.isArray(ruleDoc?.recurso) ? ruleDoc.recurso : []),
              ...(Array.isArray(deltaPayload?.reglaActual?.recurso) ? deltaPayload.reglaActual.recurso : []),
            ],
            accionesUsu: [
              ...(Array.isArray(ruleDoc?.accionesUsu) ? ruleDoc.accionesUsu : []),
              ...(Array.isArray(deltaPayload?.reglaActual?.accionesUsu)
                ? deltaPayload.reglaActual.accionesUsu
                : []),
            ],
          });
          const { vistasCatalogo, accionesCatalogo } = getPermisosCatalog(
            endpointId,
            ruleId,
            deltaPayload,
          );
          setCatalogSelectionFor(
            endpointId,
            alignSelectionToCatalogIds(rawSel, vistasCatalogo, accionesCatalogo),
          );
        }
        const counterFormIds = new Set(
          diosRecursosJerarquiaFlat.map((r) => String(r._id || '').trim()).filter(Boolean),
        );
        const vistasFaltantesRaw = Array.isArray(deltaPayload.vistasFaltantes)
          ? deltaPayload.vistasFaltantes
          : [];
        const vistasNuevasCounter = vistasFaltantesRaw.filter((v: any) => {
          const id = normalizePermisoRefId(v);
          return id && vistaIdEnCounterFormularioSubformulario(id, counterFormIds);
        });
        const origenTecho =
          deltaPayload?.techoJerarquia?.origen === 'saPadre' ? 'SA padre' : 'techo DIOS/plataforma';
        if (vistasNuevasCounter.length > 0) {
          toast.success(
            `Sincronización con regla del ${origenTecho}: ${vistasNuevasCounter.length} vista(s) formulario/subformulario nuevas (countertiponodorutas) disponibles para elegir.`,
          );
        } else {
          toast.success(
            `Sincronización con regla del ${origenTecho} completada. Sin vistas formulario/subformulario nuevas por agregar.`,
          );
        }
      } else {
        toast.error('No se pudo sincronizar con la regla del SA padre (respuesta inválida).');
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message || '')
          : 'No se pudo sincronizar con la regla del SA padre';
      toast.error(message);
    } finally {
      setLoadingDeltaByEndpoint((prev) => ({ ...prev, [endpointId]: false }));
    }
  };

  const cargarPoliticasRuntimeParaReglaActualizar = (endpointId: string, rule: any) => {
    const idsFromRule = parsePoliticasRuntimeIdsFromRule(rule);
    void fetchPoliticasRuntimeCatalogo({})
      .then((rows) => {
        setPoliticasRuntimeCatalog(rows);
        if (idsFromRule.length) {
          setReglasPoliticasRuntimeSel((prev) => ({ ...prev, [endpointId]: idsFromRule }));
        }
      })
      .catch(() => setPoliticasRuntimeCatalog([]));
  };

  const applyRuleToForm = (
    endpointId: string,
    ruleId: string,
    catalogOverride?: Record<string, any>,
  ) => {
    const catalog = catalogOverride ? { ...ruleCatalog, ...catalogOverride } : ruleCatalog;
    const rule = catalog[ruleId];
    if (!rule) return;

    if (endpointId === 'tenant-actualizar-global-reglas') {
      if (catalogOverride) {
        setRuleCatalog((prev) => ({ ...prev, ...catalogOverride }));
      }
      const ctxId = resolveContextoIdFromRegla(rule, contextos);
      if (ctxId) setFieldValue(endpointId, 'contextoDefi', ctxId);
      const rawSel = buildCatalogSelectionFromReglaGlobal(rule);
      const { vistasCatalogo, accionesCatalogo } = getPermisosCatalog(endpointId, ruleId);
      setCatalogSelectionFor(
        endpointId,
        alignSelectionToCatalogIds(rawSel, vistasCatalogo, accionesCatalogo),
      );
      setReglasPoliticasRuntimeSel((prev) => ({
        ...prev,
        [endpointId]: parsePoliticasRuntimeIdsFromRule(rule),
      }));
      cargarPoliticasRuntimeParaReglaActualizar(endpointId, rule);
      setDeltaByEndpoint((prev) => { const next = { ...prev }; delete next[endpointId]; return next; });
      loadDeltaForRule(endpointId, ruleId);
      return;
    }

    if (endpointId === 'tenant-crear-global-reglas') {
      setCatalogSelectionFor(endpointId, buildCatalogSelectionFromReglaGlobal(rule));
      setBulkAllFor(endpointId, false);
      setReglasPoliticasRuntimeSel((prev) => ({
        ...prev,
        [endpointId]: parsePoliticasRuntimeIdsFromRule(rule),
      }));
      cargarPoliticasRuntimeParaReglaActualizar(endpointId, rule);
    }

    const ctxArr = Array.isArray(rule?.contextoDefi) ? rule.contextoDefi : [];
    const ctxId = String(ctxArr[0]?._id || ctxArr[0] || '').trim();
    if (ctxId) setFieldValue(endpointId, 'contextoDefi', ctxId);

    const recursos = Array.isArray(rule?.recurso) ? rule.recurso : [];
    const accionesIdsGlobal = (Array.isArray(rule?.accionesUsu) ? rule.accionesUsu : [])
      .map((a: any) => String(a?._id || a || '').trim())
      .filter(Boolean);

    const accionesPorVista = new Map<string, string[]>();
    const permisosDetalle = Array.isArray((rule as any)?.permisos) ? (rule as any).permisos : [];
    permisosDetalle.forEach((p: any) => {
      const vistaId = String(p?.vistaId?._id || p?.vistaId || '').trim();
      const accionIds = (Array.isArray(p?.accionId) ? p.accionId : [])
        .map((a: any) => String(a?._id || a || '').trim())
        .filter(Boolean);
      if (vistaId && accionIds.length) accionesPorVista.set(vistaId, accionIds);
    });

    const nextPermisos: PermisoItem[] = recursos
      .map((recurso: any) => {
        const vistaId = String(recurso?._id || recurso || '').trim();
        if (!vistaId) return null;
        const accionesVista = accionesPorVista.get(vistaId) || accionesIdsGlobal;
        return {
          vistaId,
          accionId: accionesVista
        };
      })
      .filter(Boolean) as PermisoItem[];

    if (nextPermisos.length) {
      setPermisos(endpointId, nextPermisos);
    }
  };

  useEffect(() => {
    const epSource = resolveActiveReglasEndpointId();
    if (!epSource) return;
    const reglasEndpoints = new Set([
      'tenant-crear-global-reglas',
      'tenant-actualizar-global-reglas',
      'tenant-crear-dios-reglas',
      'tenant-actualizar-dios-reglas',
    ]);
    if (!reglasEndpoints.has(epSource)) return;

    let ruleActualizar: any = null;
    if (epSource === 'tenant-actualizar-global-reglas') {
      const ruleId = getFieldValue(epSource, 'x-regla-id').trim();
      ruleActualizar = ruleId ? ruleCatalog[ruleId] : null;
    }

    void fetchPoliticasRuntimeCatalogo({})
      .then((rows) => {
        setPoliticasRuntimeCatalog(rows);
        if (epSource === 'tenant-actualizar-global-reglas' && ruleActualizar) {
          const ids = parsePoliticasRuntimeIdsFromRule(ruleActualizar);
          if (ids.length) {
            setReglasPoliticasRuntimeSel((prev) => ({ ...prev, [epSource]: ids }));
          }
        }
      })
      .catch(() => setPoliticasRuntimeCatalog([]));
  }, [
    endpointModal?.id,
    useModuloInlineFlow,
    inlineModuloMenu.activeEndpoint?.id,
    preferredActionId,
    initialEndpointId,
    formData['tenant-actualizar-global-reglas']?.['x-regla-id'],
    ruleCatalog,
  ]);

  useEffect(() => {
    const ep = endpointModal?.id ?? (useModuloInlineFlow ? inlineModuloMenu.activeEndpoint?.id : null);
    if (!ep) return;
    if (ep !== 'tenant-crear-dios-reglas' && ep !== 'tenant-actualizar-dios-reglas') return;
    const jwtSa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
    const selectedSa =
      getDiosReglaTenantsSel(ep)[0] || getFieldValue(ep, 'tenantSuperAdmin').trim() || jwtSa;
    if (!selectedSa) return;
    const regla = findReglaPlataformaPorSuperAdmin(ruleCatalog, selectedSa);
    if (!regla) return;
    setReglasPoliticasRuntimeSel((prev) => {
      if (prev[ep]?.length) return prev;
      const ids = parsePoliticasRuntimeIdsFromRule(regla);
      if (!ids.length) return prev;
      return { ...prev, [ep]: ids };
    });
  }, [
    endpointModal?.id,
    useModuloInlineFlow,
    inlineModuloMenu.activeEndpoint?.id,
    diosReglaTenantsSel,
    ruleCatalog,
    tenantGlobalActor?.tenantSuperAdminId,
  ]);

  useEffect(() => {
    const ep = resolveActiveReglasEndpointId();
    if (ep !== 'tenant-actualizar-global-reglas') return;
    const jwtSa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
    if (!jwtSa || saFilterByEndpoint[ep]) return;
    const canonico = resolveSaIdCanonicoParaReglas(jwtSa);
    setSaFilterByEndpoint((prev) => ({ ...prev, [ep]: canonico || jwtSa }));
  }, [
    endpointModal?.id,
    useModuloInlineFlow,
    inlineModuloMenu.activeEndpoint?.id,
    preferredActionId,
    initialEndpointId,
    tenantGlobalActor?.tenantSuperAdminId,
    tenantSuperAdminsJerarquiaCounters.length,
    jerarquiaSaCounters.length,
    saFilterByEndpoint,
  ]);

  useEffect(() => {
    const ep = resolveActiveReglasEndpointId();
    if (ep !== 'tenant-actualizar-global-reglas') return;
    const saSel = String(saFilterByEndpoint[ep] || tenantGlobalActor?.tenantSuperAdminId || '').trim();
    if (!saSel) return;

    let cancelled = false;
    void refreshReglasCatalogoPorSaActualizar(ep, saSel).then(({ rulesMap }) => {
      if (cancelled) return;
      // Usar ref para evitar que ruleCatalog en deps cause el loop delta.
      const catalogMerged = { ...ruleCatalogRef.current, ...rulesMap };
      if (!actualizarReglasGlobalesSoloLectura()) {
        seleccionarReglaJerarquiaPorSaActualizar(ep, saSel, catalogMerged);
      }

      const tenantActual = String(tenantFilterByEndpoint[ep] || '').trim();
      if (tenantActual) {
        ensureReglaSeleccionadaParaVista(ep);
        return;
      }

      const opts = getTenantGlobalesOpcionesPorSaActualizar(saSel, catalogMerged);
      if (!opts.length) return;

      const autoTg = String(opts[0]?.id || '').trim();
      if (!autoTg) return;

      if (actualizarReglasGlobalesSoloLectura() || opts.length === 1) {
        setTenantFilterByEndpoint((prev) => (prev[ep] === autoTg ? prev : { ...prev, [ep]: autoTg }));
        seleccionarReglaParametrizadaPorTenantActualizar(ep, autoTg, catalogMerged);
        if (!isTenantSuperAdminScopeOption(autoTg)) {
          aplicarUsuariosDesdeJerarquiaRef(ep, autoTg);
          void cargarUsuariosParaEndpoint(ep, autoTg);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    endpointModal?.id,
    useModuloInlineFlow,
    inlineModuloMenu.activeEndpoint?.id,
    preferredActionId,
    initialEndpointId,
    saFilterByEndpoint,
    tenantFilterByEndpoint,
    tenantGlobales.length,
    tenantSuperAdminsJerarquiaCounters.length,
    jerarquiaSaCounters.length,
    loadingData,
    reglas.length,
    contextos.length,
    // ruleCatalog excluido: loadDeltaForRule lo actualiza y generaría loop infinito.
  ]);

  useEffect(() => {
    const ep = resolveActiveReglasEndpointId();
    if (ep !== 'tenant-actualizar-global-reglas') return;
    const tenantFiltro = resolveTenantGlobalParaReglasEndpoint(ep);
    if (!tenantFiltro) return;
    ensureReglaSeleccionadaParaVista(ep);
  }, [
    endpointModal?.id,
    useModuloInlineFlow,
    inlineModuloMenu.activeEndpoint?.id,
    preferredActionId,
    initialEndpointId,
    reglas.length,
    tenantFilterByEndpoint,
    saFilterByEndpoint,
    contextos.length,
    ruleCatalog,
  ]);

  useEffect(() => {
    const ep = endpointModal?.id ?? (useModuloInlineFlow ? inlineModuloMenu.activeEndpoint?.id : null);
    if (!ep) return;
    if (ep !== 'tenant-crear-dios-reglas' && ep !== 'tenant-actualizar-dios-reglas') return;
    const jwtSa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
    if (!jwtSa) return;
    if (!getDiosReglaTenantsSel(ep).length) {
      setDiosReglaTenantsSelFor(ep, [jwtSa]);
    }
    if (!getFieldValue(ep, 'tenantSuperAdmin').trim()) {
      setFieldValue(ep, 'tenantSuperAdmin', jwtSa);
    }
    const selectedSa = getDiosReglaTenantsSel(ep)[0] || getFieldValue(ep, 'tenantSuperAdmin').trim() || jwtSa;
    aplicarSecurityPlatformDesdeSaDiosRegla(ep, selectedSa);
    const dominio = resolveDominioTenatPorSa(dominioPorSaMap, selectedSa);
    if (dominio) setFieldValue(ep, 'dominioTenatGlobales', dominio);
  }, [
    endpointModal?.id,
    useModuloInlineFlow,
    inlineModuloMenu.activeEndpoint?.id,
    tenantGlobalActor?.tenantSuperAdminId,
    dominioPorSaMap,
    aplicarSecurityPlatformDesdeSaDiosRegla,
  ]);

  useEffect(() => {
    const ep = endpointModal?.id ?? (useModuloInlineFlow ? inlineModuloMenu.activeEndpoint?.id : null);
    if (!ep) return;
    if (ep !== 'tenant-crear-dios-reglas' && ep !== 'tenant-actualizar-dios-reglas') return;
    const jwtSa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
    const selectedSa =
      getDiosReglaTenantsSel(ep)[0] || getFieldValue(ep, 'tenantSuperAdmin').trim() || jwtSa;
    if (!selectedSa) return;
    aplicarSecurityPlatformDesdeSaDiosRegla(ep, selectedSa);
  }, [
    endpointModal?.id,
    useModuloInlineFlow,
    inlineModuloMenu.activeEndpoint?.id,
    diosReglaTenantsSel,
    tenantSuperAdminsJerarquiaCounters,
    tenantGlobalSelects.nvlGeneracionTenant,
    tenantGlobalActor?.tenantSuperAdminId,
    aplicarSecurityPlatformDesdeSaDiosRegla,
  ]);

  useEffect(() => {
    const ep = endpointModal?.id ?? (useModuloInlineFlow ? inlineModuloMenu.activeEndpoint?.id : null);
    if (!ep) return;
    if (ep !== 'tenant-crear-dios-reglas' && ep !== 'tenant-actualizar-dios-reglas') return;
    const jwtSa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
    const selectedSa =
      getDiosReglaTenantsSel(ep)[0] || getFieldValue(ep, 'tenantSuperAdmin').trim() || jwtSa;
    const dominio = resolveDominioTenatPorSa(dominioPorSaMap, selectedSa);
    if (dominio) setFieldValue(ep, 'dominioTenatGlobales', dominio);
  }, [
    endpointModal?.id,
    useModuloInlineFlow,
    inlineModuloMenu.activeEndpoint?.id,
    diosReglaTenantsSel,
    dominioPorSaMap,
    tenantGlobalActor?.tenantSuperAdminId,
  ]);

  useEffect(() => {
    const ep = endpointModal?.id ?? (useModuloInlineFlow ? inlineModuloMenu.activeEndpoint?.id : null);
    if (!ep) return;
    if (ep !== 'tenant-crear-dios-reglas' && ep !== 'tenant-actualizar-dios-reglas') return;
    if (!saJerarquiaConCorporativo) return;
    const jwtSa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
    const selectedSa =
      getDiosReglaTenantsSel(ep)[0] || getFieldValue(ep, 'tenantSuperAdmin').trim() || jwtSa;
    if (!selectedSa) return;
    aplicarReglaDiosParametrizadaAlFormulario(ep, selectedSa);
  }, [
    endpointModal?.id,
    useModuloInlineFlow,
    inlineModuloMenu.activeEndpoint?.id,
    diosReglaTenantsSel,
    ruleCatalog,
    saJerarquiaConCorporativo,
    tenantGlobalActor?.tenantSuperAdminId,
    aplicarReglaDiosParametrizadaAlFormulario,
  ]);

  useEffect(() => {
    if (!acciones.length) return;
    setDiosReglaAccionesSeleccion((prev) => {
      const k = 'tenant-crear-dios-reglas';
      if (prev[k]?.length) return prev;
      return { ...prev, [k]: acciones.map((a) => a.id) };
    });
  }, [acciones]);

  useEffect(() => {
    const fromCounter = diosRecursosJerarquiaFlat.map((r) => r._id).filter(Boolean);
    const fromVistas = vistas.map((v) => String(v.id || '').trim()).filter(Boolean);
    const fromTree =
      !fromCounter.length && !fromVistas.length && rutasJerarquia.length
        ? collectFormularioLikeNodes(rutasJerarquia)
            .map((n: any) => String(n?._id || '').trim())
            .filter(Boolean)
        : [];
    const seed = fromCounter.length
      ? fromCounter
      : fromVistas.length
        ? fromVistas
        : fromTree;
    if (!seed.length) return;
    setDiosReglaRecursosSeleccion((prev) => {
      const k = 'tenant-crear-dios-reglas';
      if (prev[k]?.length) return prev;
      return { ...prev, [k]: seed };
    });
  }, [vistas, rutasJerarquia, diosRecursosJerarquiaFlat]);

  useEffect(() => {
    const ep =
      endpointModal?.id ??
      (useModuloInlineFlow ? inlineModuloMenu.activeEndpoint?.id : null) ??
      (singleFormInline ? availableEndpoints[0]?.id : null);
    if (!ep) return;
    const needsTenantGlobal =
      ENDPOINTS.find((e) => e.id === ep)?.fields.some((f) => f.name === 'tenantGlobal' || f.name === 'tenantGlobalId') ?? false;
    const needsTenantGlobalSelects =
      ep === 'tenant-crear-global-usuario' ||
      ep === 'tenant-crear-global-admin' ||
      ep === 'tenant-superadmin-insert-documento' ||
      ep === 'tenant-actualizar-global';
    if (needsTenantGlobalSelects && !loadingData) {
      const needsBootstrap =
        !tenantGlobalSelectsLoaded ||
        (ep === 'tenant-actualizar-global' && tenantUpdateTargets.length === 0);
      if (needsBootstrap) {
        hydrateData();
      }
      return;
    }
    const reglasEndpointsConTenantGlobal = REGLAS_GLOBALES_ENDPOINT_IDS;
    if (reglasEndpointsConTenantGlobal.has(ep) && !loadingData) {
      const reglasNeedsHydrate = singleFormInline
        ? tenantSuperAdminsJerarquiaCounters.length === 0
        : tenantGlobales.length === 0;
      if (reglasNeedsHydrate) {
        void hydrateData({
          bundles: new Set(['selectsLite', 'tenantsDestino', 'jerarquiaUsuarios']),
        });
        return;
      }
    }
    if (!needsTenantGlobal) return;
  }, [
    endpointModal?.id,
    useModuloInlineFlow,
    inlineModuloMenu.activeEndpoint?.id,
    singleFormInline,
    availableEndpoints[0]?.id,
    tenantGlobales.length,
    tenantSuperAdminsJerarquiaCounters.length,
    loadingData,
    tenantGlobalSelectsLoaded,
    tenantUpdateTargets.length,
  ]);

  useEffect(() => {
    if (!useModuloInlineFlow) return;
    const ep = inlineModuloMenu.activeEndpoint;
    if (!ep) return;
    const needsTenantGlobalSelects =
      ep.id === 'tenant-crear-global-usuario' ||
      ep.id === 'tenant-crear-global-admin' ||
      ep.id === 'tenant-superadmin-insert-documento' ||
      ep.id === 'tenant-actualizar-global' ||
      isHerenciaAdminPrecargaEndpoint(ep.id);
    if (needsTenantGlobalSelects && !loadingData) {
      const needsBootstrap =
        !tenantGlobalSelectsLoaded ||
        (ep.id === 'tenant-actualizar-global' && tenantUpdateTargets.length === 0) ||
        (isHerenciaAdminPrecargaEndpoint(ep.id) &&
          tenantGlobales.length === 0 &&
          herenciasUsuario.length === 0);
      if (needsBootstrap) {
        void hydrateData();
      }
    }
  }, [
    useModuloInlineFlow,
    inlineModuloMenu.activeEndpoint,
    tenantGlobalSelectsLoaded,
    tenantUpdateTargets.length,
    loadingData,
    tenantGlobales.length,
    herenciasUsuario.length,
  ]);

  useEffect(() => {
    const endpointId = resolveActiveHerenciaEndpointId();
    if (!endpointId || !isHerenciaAdminPrecargaEndpoint(endpointId)) return;
    if (loadingData) return;
    if (tenantGlobales.length > 0) return;

    let cancelled = false;
    (async () => {
      const fallback = await fetchTenantGlobalesFromHerenciasJwt();
      if (cancelled || !fallback.length) return;
      setTenantGlobales((prev) => {
        if (prev.length) return prev;
        return fallback;
      });
      if (PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpointId) && fallback.length === 1) {
        const onlyId = String(fallback[0]?.id || '').trim();
                  if (onlyId) {
          setFieldValue(endpointId, 'tenantGlobal', onlyId);
          fetchHerenciasConReglasParaTenant(endpointId, onlyId);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    endpointModal?.id,
    useModuloInlineFlow,
    inlineModuloMenu.activeEndpoint?.id,
    loadingData,
    tenantGlobales.length,
  ]);

  useEffect(() => {
    const endpointId = resolveActiveHerenciaEndpointId();
    if (!endpointId || !isHerenciaAdminPrecargaEndpoint(endpointId) || loadingData) return;

    const currentTenantGlobal = getFieldValue(endpointId, 'tenantGlobal').trim();
    const options = getTenantGlobalOptions(endpointId);
    const idsPermitidos = new Set(options.map((o) => String(o?.id || '').trim()).filter(Boolean));
    const seleccionValida = currentTenantGlobal && idsPermitidos.has(currentTenantGlobal);

    // Si ya hay TG / alcance SA en el formulario y sigue siendo opción válida, recargar herencias.
    // Si la lista de opciones cambió (p. ej. llegaron tenantSuperTenants del GET selects), invalidar selección obsoleta.
    if (currentTenantGlobal && seleccionValida) {
      fetchHerenciasConReglasParaTenant(endpointId, currentTenantGlobal);
      return;
    }

    if (currentTenantGlobal && !seleccionValida) {
      setFieldValue(endpointId, 'tenantGlobal', '');
      setHerenciaAsociadaOptionsByEndpoint((prev) => ({ ...prev, [endpointId]: [] }));
      setHerenciaAsociadaDataByEndpoint((prev) => ({ ...prev, [endpointId]: {} }));
      setFieldValue(endpointId, 'herenciaAsociada', '');
    }

    const firstTenantGlobalId = String(options?.[0]?.id || '').trim();
    if (!firstTenantGlobalId) return;

    setFieldValue(endpointId, 'tenantGlobal', firstTenantGlobalId);
    fetchHerenciasConReglasParaTenant(endpointId, firstTenantGlobalId);
  }, [
    endpointModal?.id,
    useModuloInlineFlow,
    inlineModuloMenu.activeEndpoint?.id,
    loadingData,
    tenantGlobales.length,
    tenantSuperAdminsJerarquiaCounters.length,
    jerarquiaSaCounters.length,
    herenciasUsuario.length,
    tenantGlobalActor?.tenantSuperAdminId,
    tenantGlobalActor?.tenantGlobalId,
    tenantGlobalActor?.tenantCorporativoId,
    tenantGlobalActor?.saJerarquiaTieneCorporativoEnCounters,
  ]);

  /** Catálogo de reglas ([REGLA CAT]): cualquier cambio en recurso/acciones de una regla vuelve a armar opciones y checkboxes. */
  useEffect(() => {
    if (loadingData) return;
    const epModal = resolveActiveHerenciaEndpointId();
    if (!epModal || (epModal !== 'perm-admin-tenant-global' && !PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(epModal))) return;
    const tgSel = getFieldValue(epModal, 'tenantGlobal').trim();
    if (!tgSel) return;
    fetchHerenciasConReglasParaTenant(epModal, tgSel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleCatalogPermisosDigest, loadingData, endpointModal?.id, useModuloInlineFlow, inlineModuloMenu.activeEndpoint?.id]);

  /** Volver a la pestaña: sincronizar herencia/vistas con servidor sin interacción manual. */
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (loadingData) return;
      const epModal = resolveActiveHerenciaEndpointId();
      if (!epModal) return;
      const modalHerencia =
        epModal === 'perm-admin-tenant-global' ||
        PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(epModal) ||
        epModal === 'perm-admin-tenant-global-desactivar' ||
        epModal === 'perm-admin-tenant-global-eliminar';
      if (!modalHerencia) return;
      const tgSel = String(formDataRef.current[epModal]?.tenantGlobal || '').trim();
      if (!tgSel) return;
      if (
        epModal === 'perm-admin-tenant-global' ||
        PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(epModal)
      ) {
        fetchHerenciasConReglasParaTenant(epModal, tgSel);
      } else {
        void fetchHerenciasAsociadasByTenantGlobal(epModal, tgSel);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingData, endpointModal?.id, useModuloInlineFlow, inlineModuloMenu.activeEndpoint?.id]);

  /** Modo lectura / supervisión: mismo formulario abierto → polling ligero para reflejar cambios de regla o herencia en vistas. */
  useEffect(() => {
    const epModal = resolveActiveHerenciaEndpointId();
    if (!epModal || !PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(epModal)) return;
    const tick = () => {
      if (document.visibilityState !== 'visible' || loadingData) return;
      const tgSel = String(formDataRef.current[epModal]?.tenantGlobal || '').trim();
      if (!tgSel) return;
      void fetchHerenciasAsociadasByTenantGlobal(epModal, tgSel);
    };
    const id = window.setInterval(tick, POLL_HERENCIA_ADMIN_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpointModal?.id, useModuloInlineFlow, inlineModuloMenu.activeEndpoint?.id, loadingData]);

  // TG: cargar corporativos y auto-poblar campos al abrir el modal
  useEffect(() => {
    const endpointId = 'perm-usuario-tenant-global';
    if (!endpointModal || endpointModal.id !== endpointId) return;
    if (!actorEsTenantGlobalScope()) return;

    const tgId = String(tenantGlobalActor?.tenantGlobalId || '').trim();
    if (!tgId) return;

    // Cargar corporativos del TG si no estÃ¡n aÃºn
    const corpDelTG = getCorporativosDelTG();
    if (!corpDelTG.length) {
      fetchTenantCorporativosByGlobal(endpointId, tgId);
    }

    const herenciasTG = getHerenciaGlobalOpcionesParaTG();
    const currentHereda = getFieldValue(endpointId, 'heredaGlobal').trim();
    if (currentHereda && !herenciasTG.some((h) => h.id === currentHereda)) {
      setFieldValue(endpointId, 'heredaGlobal', '');
    }

  }, [
    endpointModal,
    tenantGlobalActor?.tenantGlobalId,
    herenciasUsuario.length,
    tenantCorporativos.length,
  ]);

  useEffect(() => {
    const ep = endpointModal?.id ?? (useModuloInlineFlow ? inlineModuloMenu.activeEndpoint?.id : null);
    if (!ep || (ep !== 'tenant-crear-global-reglas' && ep !== 'tenant-actualizar-global-reglas')) return;
    const tgSel =
      ep === 'tenant-actualizar-global-reglas'
        ? resolveTenantGlobalParaReglasEndpoint(ep)
        : String((formData[ep] || {}).tenantGlobal ?? '').trim();
    if (!tgSel || isTenantSuperAdminScopeOption(tgSel)) return;
    aplicarUsuariosDesdeJerarquiaRef(ep, tgSel);
    void cargarUsuariosParaEndpoint(ep, tgSel);
  }, [
    endpointModal?.id,
    useModuloInlineFlow,
    inlineModuloMenu.activeEndpoint?.id,
    formData['tenant-crear-global-reglas']?.tenantGlobal,
    tenantFilterByEndpoint['tenant-actualizar-global-reglas'],
  ]);

  useEffect(() => {
    const endpointId = 'perm-usuario-tenant-global';
    const currentHereda = getFieldValue(endpointId, 'heredaGlobal').trim();
    const currentTsa = getFieldValue(endpointId, 'tenantSuperAdminScope').trim();
    const currentRegla = getFieldValue(endpointId, 'reglaGlobalFallback').trim();

    if (actorEsTenantGlobalScope()) {
      const tgId = String(tenantGlobalActor?.tenantGlobalId || '').trim();
      const currentTg = getFieldValue(endpointId, 'tenantGlobalScope').trim();
      if (tgId && currentTg !== tgId) {
        setFieldValue(endpointId, 'tenantGlobalScope', tgId);
        cargarUsuariosParaEndpoint(endpointId, tgId);
      }
      const herenciasDisponibles = getHeredaOptionsPermitidasPorTenantGlobal(tgId);
      if (currentHereda && !herenciasDisponibles.some((h) => h.id === currentHereda)) {
        setFieldValue(endpointId, 'heredaGlobal', '');
      }
      if (currentTsa) setFieldValue(endpointId, 'tenantSuperAdminScope', '');
      if (currentRegla) setFieldValue(endpointId, 'reglaGlobalFallback', '');
      return;
    }

    if (!actorEsTenantSuperAdmin()) {
      if (currentHereda) setFieldValue(endpointId, 'heredaGlobal', '');
      if (currentTsa) setFieldValue(endpointId, 'tenantGlobalScope', '');
      if (currentRegla) setFieldValue(endpointId, 'reglaGlobalFallback', '');
      return;
    }

    // SuperAdmin: auto-selecciona el primer tenantGlobal disponible
    const tgOptions = tenantGlobales.map((t) => ({ id: t.id, label: t.label }));
    const resolvedTg = tgOptions.some((opt) => opt.id === currentTsa)
      ? currentTsa
      : String(tgOptions[0]?.id || '').trim();
    if (!resolvedTg) return;
    if (resolvedTg !== currentTsa) {
      void sincronizarContextoTenantGlobalPermUsuario(endpointId, resolvedTg);
      return;
    }

    const herenciasDisponibles = getHeredaOptionsPermitidasPorTenantGlobal(resolvedTg);

    if (herenciasDisponibles.length > 0) {
      if (currentHereda && !herenciasDisponibles.some((h) => h.id === currentHereda)) {
        setFieldValue(endpointId, 'heredaGlobal', '');
      }
      if (currentRegla) setFieldValue(endpointId, 'reglaGlobalFallback', '');
    } else {
      if (currentHereda) setFieldValue(endpointId, 'heredaGlobal', '');
    }
  }, [
    heredaGlobalOptions.length,
    herenciasUsuario.length,
    tenantGlobales.length,
    tenantGlobalActor?.tenantSuperAdminId,
    Object.keys(ruleCatalog || {}).length,
  ]);

  // Al cargar herencias/reglas del TG: marcar solo lo ya parametrizado; reglas nuevas quedan visibles sin check.
  useEffect(() => {
    const endpointId = 'perm-usuario-tenant-global';
    if (!actorEsTenantSuperAdmin()) return;
    if (!endpointModal || endpointModal.id !== endpointId) return;
    const tgId = String((formData[endpointId] || {})['tenantGlobalScope'] || '').trim();
    if (!tgId) return;
    const herenciasDelTG = herenciasExistentesPorTG[tgId];
    if (herenciasDelTG === undefined) return;
    const usuariosSel = new Set((usuariosDestinoSel[endpointId] || []).map((id) => String(id).trim()).filter(Boolean));
    if (!usuariosSel.size) {
      setFieldValue(endpointId, 'heredaGlobal', '');
      setCatalogSelectionFor(endpointId, { vistas: [], acciones: [] });
      return;
    }
    const { vistasCatalogo, accionesCatalogo } = getPermisosCatalog(endpointId);
    const catalogVistaIds = new Set(vistasCatalogo.map((v) => v.id));
    const catalogAccionIds = new Set(accionesCatalogo.map((a) => a.id));
    const vistasSet = new Set<string>();
    const accionesSet = new Set<string>();

    herenciasDelTG
      .filter((h: any) => usuariosSel.has(String(h?.usuarioId?._id || h?.usuarioId || '').trim()))
      .forEach((h: any) => {
      (Array.isArray(h?.vistas) ? h.vistas : []).forEach((v: any) => {
        const id = String(v?._id || v || '').trim();
        if (id && (!catalogVistaIds.size || catalogVistaIds.has(id))) vistasSet.add(id);
      });
      (Array.isArray(h?.acciones) ? h.acciones : []).forEach((a: any) => {
        const id = String(a?._id || a || '').trim();
        if (id && (!catalogAccionIds.size || catalogAccionIds.has(id))) accionesSet.add(id);
      });
    });

    setCatalogSelectionFor(endpointId, {
      vistas: Array.from(vistasSet),
      acciones: Array.from(accionesSet),
    });
  }, [
    herenciasExistentesPorTG,
    usuariosDestinoSel,
    endpointModal?.id,
    tenantGlobalActor?.tenantSuperAdminId,
    Object.keys(ruleCatalog || {}).length,
  ]);

  /** SuperAdmin: si solo existe una herenciaGlobal del TG para los usuarios marcados, seleccionarla y pintar checks. */
  useEffect(() => {
    const endpointId = 'perm-usuario-tenant-global';
    if (!actorEsTenantSuperAdmin()) return;
    if (!endpointModal || endpointModal.id !== endpointId) return;
    const tg = String((formData[endpointId] || {})['tenantGlobalScope'] || '').trim();
    if (!tg) return;
    if (!(usuariosDestinoSel[endpointId] || []).length) return;
    const opcionesUsuario = getHerenciasUsuariosSeleccionadosParaPermUsuario(tg);
    if (opcionesUsuario.length !== 1) return;
    const onlyId = opcionesUsuario[0].id;
    if (getFieldValue(endpointId, 'heredaGlobal').trim() === onlyId) return;
    setFieldValue(endpointId, 'heredaGlobal', onlyId);
    const rows = [...herenciasUsuario, ...(herenciasExistentesPorTG[tg] || [])];
    const h = rows.find((row: any) => String(row?.iud || row?._id || '').trim() === onlyId);
    if (h) {
      const vistasIds = (Array.isArray(h?.vistas) ? h.vistas : [])
        .map((v: any) => String(v?._id || v || '').trim())
        .filter(Boolean);
      const accionesIds = (Array.isArray(h?.acciones) ? h.acciones : [])
        .map((a: any) => String(a?._id || a || '').trim())
        .filter(Boolean);
      setCatalogSelectionFor(endpointId, { vistas: vistasIds, acciones: accionesIds });
    }
  }, [
    endpointModal?.id,
    formData['perm-usuario-tenant-global']?.tenantGlobalScope,
    usuariosDestinoSel,
    herenciasUsuario.length,
    herenciasExistentesPorTG,
  ]);

  const runEndpoint = async (endpoint: EndpointSpec, opts?: RunEndpointOpts) =>
    runEndpointLogic(endpoint, {
      diosReglaAccionesSeleccion, diosReglaRecursosSeleccion, dominioPorSaMap,
      reglas, ruleCatalog, running, suiteSelByEndpoint, tenantGlobalActor, tenantGlobalSelects,
      tenantSuperAdminsJerarquiaCounters, usuariosDestinoSel,
      PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS, herenciaAsociadaOptionsByEndpoint,
      rutasJerarquia, saJerarquiaConCorporativo, vistasDesactivarSeleccion,
      setResult, setResultData, setRunning, setFieldValue, setReglasPoliticasRuntimeSel,
      setVistasDesactivarSeleccion,
      actorEsTenantGlobalScope, actorEsTenantSuperAdmin, actualizarReglasGlobalesSoloLectura,
      appendPoliticasRuntimeIdsToBody, aplicarSecurityPlatformDesdeSaDiosRegla,
      buildDiosReglaSaMetasMap, findReglaTechoJerarquiaSa, getBulkAllMode,
      getCatalogSelection, getDiosReglaTenantsSel, getDiosReglaUsuariosPorTenantSel,
      getFieldValue, getPermisos, getPermisosCatalog, hydrateData, recortarSeleccionAlTechoRegla,
      reglaSinTenantGlobalMaterializado, resolveReglaTechoPermUsuario,
      resolveSaParaReglasGlobalesEndpoint, resolveDominioTenatPorSa,
      resolveTenantGlobalIdFromRule, resolveTenantGlobalParaReglasEndpoint,
      validarAlcanceDiosRegla,
    }, opts);

  const actorBadge = (actor: EndpointActor): string =>
    actor === 'tenantSuperAdmin' ? 'tenantSuperAdmin (DIOS)' : actor === 'tenantGlobal' ? 'tenantGlobal (ADMIN)' : 'Ambos';

  const renderPermisosBuilder = (endpoint: EndpointSpec) => <GobernanzaPermisosBuilder endpoint={endpoint} />;

  const renderHerenciaSelectionBuilder = (endpoint: EndpointSpec) => <GobernanzaHerenciaSelectionBuilder endpoint={endpoint} />;

  const clearEndpointModalForm = (endpoint: EndpointSpec) => {
    endpoint.fields.forEach((field) => {
      setFieldValue(endpoint.id, field.name, '');
    });
    setPermisos(endpoint.id, [{ vistaId: '', accionId: [] }]);
    setCatalogSelectionFor(endpoint.id, { vistas: [], acciones: [] });
    setBulkAllFor(endpoint.id, false);
    if (endpoint.id === 'perm-admin-tenant-global-desactivar' || endpoint.id === 'perm-admin-tenant-global-eliminar') {
      setFieldValue(endpoint.id, 'tenantGlobal', '');
      setFieldValue(endpoint.id, 'herenciaAsociada', '');
      setFieldValue(endpoint.id, 'tenantCorporativo', '');
      setFieldValue(endpoint.id, 'vistaObjetivoId', '');
      setHerenciaAsociadaOptionsByEndpoint((prev) => ({ ...prev, [endpoint.id]: [] }));
      setHerenciaAsociadaDataByEndpoint((prev) => ({ ...prev, [endpoint.id]: {} }));
      setVistasDesactivarSeleccion((prev) => {
        const next = { ...prev };
        delete next[endpoint.id];
        return next;
      });
    }
    setResult((prev) => ({ ...prev, [endpoint.id]: '' }));
    setResultData((prev) => ({ ...prev, [endpoint.id]: null }));
    if (endpoint.id === 'tenant-crear-dios-reglas' || endpoint.id === 'tenant-actualizar-dios-reglas') {
      setDiosReglaAccionesSeleccion((prev) => {
        const next = { ...prev };
        delete next[endpoint.id];
        return next;
      });
      setDiosReglaRecursosSeleccion((prev) => {
        const next = { ...prev };
        delete next[endpoint.id];
        return next;
      });
      setDiosReglaTenantsSel((prev) => {
        const next = { ...prev };
        delete next[endpoint.id];
        return next;
      });
      setDiosReglaUsuariosPorTenantSel((prev) => {
        const next = { ...prev };
        delete next[endpoint.id];
        return next;
      });
      setReglasPoliticasRuntimeSel((prev) => {
        const next = { ...prev };
        delete next[endpoint.id];
        return next;
      });
    }
  };

  const sincronizarJerarquiaReglasGlobalesCrear = async () => {
    if (saJerarquiaPosicion.esHijo) {
      setCrearReglasJerarquiaSyncing(true);
      try {
        const res: any = await apiFetch('/api/config/tenant/tipo/sincronizar/jerarquia/diff-padre', {
          method: 'GET',
        });
        setDiffPadreData(res?.data ?? null);
        setDiffPoliticasSel(new Set());
        setDiffVistasSel(new Set());
        setShowDiffPadreModal(true);
      } catch (err: any) {
        toast.error(String(err?.message || 'No se pudo obtener el diff del SA padre'));
      } finally {
        setCrearReglasJerarquiaSyncing(false);
      }
      return;
    }
    setCrearReglasJerarquiaSyncing(true);
    try {
      const res: any = await apiFetch('/api/config/tenant/tipo/sincronizar/jerarquia/counters-globales', {
        method: 'POST',
      });
      const ins = Number(res?.data?.insertadosEnCountersGlobal ?? 0);
      const rev = Number(res?.data?.filasCounterRevisadas ?? 0);
      const vistas = Number(res?.data?.vistasSincronizadas ?? 0);
      toast.success(
        res?.msg ||
          `Jerarquía sincronizada: ${ins} materialización(es) en counters global (${rev} revisadas), ${vistas} vista(s) nueva(s) en regla.`
      );
      await hydrateData({ force: true });
      const epActualizar = resolveActiveReglasEndpointId();
      if (epActualizar === 'tenant-actualizar-global-reglas') {
        const ruleId = getFieldValue(epActualizar, 'x-regla-id').trim();
        if (ruleId) {
          await loadDeltaForRule(epActualizar, ruleId);
        }
      }
    } catch (err: any) {
      toast.error(String(err?.message || 'No se pudo sincronizar la jerarquía'));
    } finally {
      setCrearReglasJerarquiaSyncing(false);
    }
  };

  const aplicarDiffPoliticasPadre = async () => {
    if (!diffPadreData || (!diffPoliticasSel.size && !diffVistasSel.size)) return;
    setAplicandoDiffPadre(true);
    try {
      const res: any = await apiFetch('/api/config/tenant/tipo/sincronizar/jerarquia/aplicar-diff-padre', {
        method: 'POST',
        body: JSON.stringify({
          politicasRuntimeIds: [...diffPoliticasSel],
          recursosIds: [...diffVistasSel],
        }),
      });
      toast.success(
        res?.msg ||
          `${diffPoliticasSel.size} política(s) y ${diffVistasSel.size} vista(s) aplicada(s) del SA padre`
      );
      setShowDiffPadreModal(false);
      setDiffPadreData(null);
      setDiffVistasSel(new Set());
      await hydrateData({ force: true });
    } catch (err: any) {
      toast.error(String(err?.message || 'No se pudo aplicar las políticas del padre'));
    } finally {
      setAplicandoDiffPadre(false);
    }
  };

  const inlineExecuteLabel = (endpoint: EndpointSpec): string => {
    if (endpoint.method === 'GET') return 'Consultar';
    if (endpoint.method === 'POST') return 'Guardar';
    if (endpoint.method === 'PUT') return 'Actualizar';
    if (endpoint.method === 'DELETE') return 'Confirmar';
    return 'Ejecutar';
  };

  const renderFormResultSlot = (endpoint: EndpointSpec) => <GobernanzaFormResultSlot endpoint={endpoint} />;

  const renderFormFieldsInner = (
    endpoint: EndpointSpec,
    opts?: { omitGenericFields?: boolean }
  ) => (
    <GobernanzaFormFieldsInner endpoint={endpoint} opts={opts} />
  );

  const renderForm = (endpoint: EndpointSpec) => {
    const accionTab = resolveAccionMenuDesdeEndpointTab(endpoint);
    const endpointOperativo = resolveEndpointInlineDesdeMenu(endpoint);
    const validacionTab =
      useModuloInlineFlow && inlineModuloResolved
        ? validarGobernanzaModuloInline({
            config: {
              ...inlineModuloMenu.config,
              formularioComponent:
                accionTab?.formularioComponent ?? inlineModuloMenu.config.formularioComponent,
              menuPath: accionTab?.menuPath ?? inlineModuloMenu.config.menuPath,
              rutaId: accionTab?.rutaId ?? inlineModuloMenu.config.rutaId,
            },
            activeEndpoint: endpointOperativo,
            menuEndpointIds: inlineModuloMenu.endpoints.map((e) => e.id),
            menuDesdeApi: inlineModuloMenu.menuDesdeApi,
            menuLoading: inlineModuloMenu.menuLoading,
            paginaComponent: 'ParametrosGobernanza',
            accionMenu: accionTab,
            operacionesHub: effectiveOperacionesHub,
          })
        : null;
    const endpointSyncDios = ENDPOINTS.find((e) => e.id === 'tenant-actualizar-dios-reglas');
    const disponibleModal = diosReglasDisponibleModal(endpointOperativo);
    const ejecutarSoloLecturaDios = modoSoloLecturaReglasDios(endpointOperativo);
    const ejecutarSoloLecturaActualizarGlobales =
      endpointOperativo.id === 'tenant-actualizar-global-reglas' && actualizarReglasGlobalesSoloLectura();
    const ejecutarDeshabilitado = ejecutarSoloLecturaDios || ejecutarSoloLecturaActualizarGlobales;
    const ejecutarDeshabilitadoRazon = ejecutarSoloLecturaDios
      ? diosReglaDiosExecuteDisabledReason
      : ejecutarSoloLecturaActualizarGlobales
        ? 'Jerarquía con corporativo en tenantJerarquiaCounter: solo consulta en tu rama, sin PUT desde este flujo.'
        : undefined;
    const runningSync = !!running['tenant-actualizar-dios-reglas'];
    const runningMain = !!running[endpointOperativo.id];
    const esModalReglasGlobalesCrearOActualizar =
      endpointOperativo.id === 'tenant-crear-global-reglas' || endpointOperativo.id === 'tenant-actualizar-global-reglas';
    /** Visible con JWT tenantSuperAdmin (crear POST y actualizar PUT). El API puede exigir corporativo en counters. */
    const mostrarSincJerarquiaReglasGlobales =
      esModalReglasGlobalesCrearOActualizar && actorEsTenantSuperAdmin();
    const esModuloInlineParametrizado = useModuloInlineFlow && Boolean(validacionTab ?? inlineModuloValidacion);
    const formularioComponentResuelto =
      accionTab?.formularioComponent
      ?? validacionTab?.formularioComponent
      ?? inlineModuloMenu.config.formularioComponent
      ?? null;
    const omitGenericFields =
      tieneFormularioComponentResuelto({ formularioComponent: formularioComponentResuelto })
      && endpointOperativo.fields.length === 0;
    const formLayout = (
      <ParametrosGobernanzaModalFormLayout
        path={endpointOperativo.path}
        showApiPath={!useModuloInlineFlow}
        executeLabel={useModuloInlineFlow ? inlineExecuteLabel(endpointOperativo) : 'Ejecutar'}
        executeActionId={esEndpointCreacionSaDocumento(endpointOperativo.id) ? TENANT_GOVERNANCE_ACTION_IDS.CREATE_TENANT_USER : governanceEndpointActionId(endpointOperativo.id)}
        actorLabel={endpointOperativo.actor}
        running={
          runningMain ||
          (endpointOperativo.id === 'tenant-crear-dios-reglas' && runningSync) ||
          (esModalReglasGlobalesCrearOActualizar && crearReglasJerarquiaSyncing)
        }
        disponible={disponibleModal}
        executeDisabled={ejecutarDeshabilitado}
        executeDisabledReason={ejecutarDeshabilitadoRazon}
        executeButtonClassName={
          DIOS_REGLAS_ENDPOINT_IDS.has(endpointOperativo.id) ? diosReglaDiosExecuteButtonClassName : undefined
        }
        extraToolbar={
          puedeMostrarToolbarSincronizarDios(endpointOperativo) && endpointSyncDios ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={runningSync}
              className={DIOS_REGLA_BTN_ACTIVO}
              title="Crea o sincroniza la regla DIOS con todas las vistas activas, securityPlatform true y sin políticas runtime (solo JWT tenantSuperAdmin sin corporativo)."
              onClick={() =>
                void runEndpoint(endpointSyncDios, {
                  diosSyncCompleta: true,
                  diosFormSourceId: endpointOperativo.id,
                })
              }
            >
              {runningSync ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sincronizar regla DIOS (todas las vistas activas)
            </Button>
          ) : null
        }
        onExecute={() => runEndpoint(endpointOperativo)}
        onClearForm={() => clearEndpointModalForm(endpointOperativo)}
        clearFormReplacement={
          endpoint.id === 'perm-usuario-tenant-global' ? (
            <Button
              type="button"
              variant="outline"
              disabled={reglasHerenciaSyncBusy || loadingData}
              title="Llama GET admin/tenant/global?sincronizar=true para alinear herencias con reglas en servidor; luego recarga datos (árbol, listar reglas, herencias del TG) y marca checks según parametrización de usuarios seleccionados."
              onClick={() => void sincronizarReglasPermUsuarioTenantGlobal()}
            >
              {reglasHerenciaSyncBusy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sincronizacion de reglas
            </Button>
          ) : mostrarSincJerarquiaReglasGlobales ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={crearReglasJerarquiaSyncing || loadingData || !saPuedeSincronizarJerarquia}
                title={
                  saJerarquiaPosicion.esRaizPrimera
                    ? 'SA raíz primaria: sincroniza counters global y reglas con lo parametrizado'
                    : saJerarquiaPosicion.esHijo
                    ? `SA hijo (padre: ${saJerarquiaPosicion.codigoPadre}): muestra lo que le falta parametrizar respecto a la regla del SA padre`
                    : 'No disponible: el tenant no ocupa posición de raíz primaria ni de hijo en tenantJerarquiaCounter'
                }
                onClick={() => void sincronizarJerarquiaReglasGlobalesCrear()}
              >
                {crearReglasJerarquiaSyncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sincronizar jerarquía y reglas
              </Button>
              {showDiffPadreModal && diffPadreData && (
                <Dialog open={showDiffPadreModal} onOpenChange={(open) => { if (!open) setShowDiffPadreModal(false); }}>
                  <DialogContent className="max-w-xl">
                    <DialogHeader>
                      <DialogTitle>
                        Diff SA padre → hijo (padre: {diffPadreData.codigoPadre})
                      </DialogTitle>
                    </DialogHeader>

                    {/* Sección políticas runtime */}
                    <div className="mb-3">
                      <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                        Políticas runtime faltantes ({diffPadreData.totalFaltantes})
                      </p>
                      {diffPadreData.faltanEnHijo.length === 0 ? (
                        <p className="text-xs text-success">El hijo ya tiene todas las políticas del padre.</p>
                      ) : (
                        <>
                          <div className="flex gap-2 mb-1">
                            <button type="button" className="text-xs underline"
                              onClick={() => setDiffPoliticasSel(new Set(diffPadreData.faltanEnHijo.map((p) => p.id)))}>
                              Todas
                            </button>
                            <button type="button" className="text-xs underline"
                              onClick={() => setDiffPoliticasSel(new Set())}>
                              Ninguna
                            </button>
                          </div>
                          <div className="max-h-40 overflow-y-auto space-y-1 border rounded p-2">
                            {diffPadreData.faltanEnHijo.map((p) => (
                              <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={diffPoliticasSel.has(p.id)}
                                  onChange={(e) => {
                                    setDiffPoliticasSel((prev) => {
                                      const next = new Set(prev);
                                      if (e.target.checked) next.add(p.id); else next.delete(p.id);
                                      return next;
                                    });
                                  }}
                                />
                                <span>
                                  <strong>{p.codigo || p.id}</strong>
                                  {p.dominio && <span className="text-muted-foreground"> · {p.dominio}</span>}
                                  {p.efecto && <span className={p.efecto === 'ALLOW' ? ' text-success' : ' text-destructive'}> · {p.efecto}</span>}
                                </span>
                              </label>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Sección vistas (recurso) */}
                    <div className="mb-3">
                      <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                        Vistas faltantes en regla del hijo ({diffPadreData.totalVistasHijoLeFaltan ?? 0})
                      </p>
                      {(diffPadreData.faltanVistas ?? []).length === 0 ? (
                        <p className="text-xs text-success">El hijo ya tiene todas las vistas del padre.</p>
                      ) : (
                        <>
                          <div className="flex gap-2 mb-1">
                            <button type="button" className="text-xs underline"
                              onClick={() => setDiffVistasSel(new Set((diffPadreData.faltanVistas ?? []).map((v) => v.id)))}>
                              Todas
                            </button>
                            <button type="button" className="text-xs underline"
                              onClick={() => setDiffVistasSel(new Set())}>
                              Ninguna
                            </button>
                          </div>
                          <div className="max-h-40 overflow-y-auto space-y-1 border rounded p-2">
                            {(diffPadreData.faltanVistas ?? []).map((v) => (
                              <label key={v.id} className="flex items-center gap-2 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={diffVistasSel.has(v.id)}
                                  onChange={(e) => {
                                    setDiffVistasSel((prev) => {
                                      const next = new Set(prev);
                                      if (e.target.checked) next.add(v.id); else next.delete(v.id);
                                      return next;
                                    });
                                  }}
                                />
                                <span>
                                  <strong>{v.name || v.id}</strong>
                                  {v.path && <span className="text-muted-foreground"> · {v.path}</span>}
                                </span>
                              </label>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 mt-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowDiffPadreModal(false)}>
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={aplicandoDiffPadre || (!diffPoliticasSel.size && !diffVistasSel.size)}
                        onClick={() => void aplicarDiffPoliticasPadre()}
                      >
                        {aplicandoDiffPadre ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                        Aplicar selección ({diffPoliticasSel.size}P + {diffVistasSel.size}V)
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </>
          ) : undefined
        }
        resultSlot={renderFormResultSlot(endpointOperativo)}
      >
        {renderFormFieldsInner(endpointOperativo, { omitGenericFields })}
      </ParametrosGobernanzaModalFormLayout>
    );
    if (esModuloInlineParametrizado && (validacionTab ?? inlineModuloValidacion)) {
      return envolverFormularioInline({
        validacion: validacionTab ?? inlineModuloValidacion!,
        endpoint: endpointOperativo,
        embeddedApiForm: formLayout,
        renderTenantForm: (props) => (
          <GobernanzaTenantFormByEndpoint
            endpoint={props.endpoint}
            embeddedApiForm={props.embeddedApiForm}
            formularioComponent={
              formularioComponentResuelto
              ?? validacionTab?.formularioComponent
              ?? inlineModuloMenu.config.formularioComponent
            }
            capabilities={computeGobernanzaEndpointCapabilities(props.endpoint, gobernanzaCapabilityContext)}
          />
        ),
        renderPermisosForm: (props) => (
          <GobernanzaPermisosFormByEndpoint
            endpoint={props.endpoint}
            embeddedApiForm={props.embeddedApiForm}
            formularioComponent={formularioComponentResuelto ?? inlineModuloMenu.config.formularioComponent}
          />
        ),
        renderReglasForm: (props) => (
          <GobernanzaReglasFormByEndpoint
            endpoint={props.endpoint}
            embeddedApiForm={props.embeddedApiForm}
            formularioComponent={formularioComponentResuelto ?? inlineModuloMenu.config.formularioComponent}
          />
        ),
      });
    }
    if (RULES_ENDPOINT_IDS.has(endpointOperativo.id)) {
      return (
        <GobernanzaReglasFormByEndpoint
          endpoint={endpointOperativo}
          embeddedApiForm={formLayout}
          capabilities={computeGobernanzaEndpointCapabilities(endpointOperativo, gobernanzaCapabilityContext)}
        />
      );
    }
    if (endpointOperativo.section === 'tenant') {
      return (
        <GobernanzaTenantFormByEndpoint
          endpoint={endpointOperativo}
          embeddedApiForm={formLayout}
          capabilities={computeGobernanzaEndpointCapabilities(endpointOperativo, gobernanzaCapabilityContext)}
        />
      );
    }
    return formLayout;
  };

  const renderDesignPanel = (endpoint: EndpointSpec) => {
    const capabilities = computeGobernanzaEndpointCapabilities(endpoint, gobernanzaCapabilityContext);
    const readOnly = !capabilities.canEditCardDesign;
    const design = { ...DEFAULT_GOBERNANZA_CARD_DESIGN, ...cardDesignById[endpoint.id] };

    return (
      <GobernanzaCardDesignForm
        endpoint={endpoint}
        value={design}
        onChange={(next) => updateCardDesignForEndpoint(endpoint.id, next)}
        readOnly={readOnly}
        capabilities={capabilities}
        embeddedApiForm={renderForm(endpoint)}
      />
    );
  };

  const pageTitle = isRulesMode ? 'Reglas Tenant' : 'Parametros Gobernanza';
  const pageDescription = isRulesMode
    ? 'Gestiona reglas globales y sincronizacion de permisos desde un flujo enfocado.'
    : 'Administra tenants, permisos y parametros corporativos desde un panel guiado.';
  const activeSectionMeta = SECTION_META[activeSection];
  const ActiveSectionIcon = activeSectionMeta.icon;
  const stats = [
    { label: 'Vistas', value: vistas.length },
    { label: 'Acciones', value: acciones.length },
    { label: 'Tenants', value: tenantGlobales.length },
    { label: 'Contextos', value: contextos.length },
    ...(isRulesMode ? [{ label: 'Reglas', value: availableEndpoints.length }] : []),
  ];

  const moduloDinamicoInline = useModuloInlineFlow && inlineModuloResolved ? (
    <GobernanzaModuloDinamico
      variant="operational"
      menuLayout={effectiveOperacionesHub || activeSection !== 'tenant' ? 'tabs' : 'grid'}
      menuState={inlineModuloMenu}
      paginaComponent="ParametrosGobernanza"
      renderForm={renderForm}
      getCapabilities={(ep) => computeGobernanzaEndpointCapabilities(ep, gobernanzaCapabilityContext)}
      hideTabsWhenSingleForm={!effectiveOperacionesHub && esFormularioHojaPublicado}
      menuOnly={false}
      hideSubmenuHeader={effectiveOperacionesHub}
      hideParametrizarMenu={effectiveOperacionesHub}
    />
  ) : null;

  const seleccionarTodasVistasDesactivar = (endpointId: string, ids: string[]) => {
    setVistasDesactivarSeleccion((prev) => ({ ...prev, [endpointId]: ids }));
  };

  const _ctxValue = {
    acciones,
    catalogItems,
    catalogItemsLoaded,
    catalogSeedRunning,
    contextos,
    deltaByEndpoint,
    diosRecursosByFormId,
    diosRecursosJerarquiaFlat,
    diosRecursosJerarquiaLoading,
    diosRecursosJerarquiaTree,
    diosReglaAccionesSeleccion,
    diosReglaRecursosSeleccion,
    herenciaAsociadaDataByEndpoint,
    herenciaAsociadaOptionsByEndpoint,
    herenciasExistentesPorTG,
    herenciasPorUsuario,
    herenciasUsuario,
    jerarquiaSaCounters,
    loadingData,
    loadingDeltaByEndpoint,
    loadingHerenciasPorUsuario,
    loadingUsuarios,
    politicasRuntimeCatalog,
    reglas,
    ruleCatalog,
    rutasJerarquia,
    saFilterByEndpoint,
    suiteSelByEndpoint,
    syncInfoByEndpoint,
    syncRunningByEndpoint,
    tenantActualizarPrefillLoading,
    tenantCorpErrorByEndpoint,
    tenantCorpLoadingByEndpoint,
    tenantFilterByEndpoint,
    tenantGlobalActor,
    tenantGlobalSelects,
    tenantGlobales,
    tenantSuperAdminsJerarquiaCounters,
    tenantUpdateTargets,
    usuariosDestinoSel,
    usuariosDisponibles,
    vistasDesactivarSeleccion,
    vistas,
    DIOS_REGLAS_ENDPOINT_IDS,
    PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS,
    ENDPOINT_IDS_SELECT_MULTI_SA_JERARQUIA,
    TENANT_SUPERADMIN_SCOPE_PREFIX,
    saJerarquiaConCorporativo,
    saJerarquiaPosicion,
    saJerarquiaPosicionDropdown,
    padreTotalVistas,
    esJwtSoloTenantSuperAdmin,
    scopeJwtSaAlcanceJerarquiaValidado,
    saJerarquiaTieneCorporativoEnCountersEfectivo,
    tenantActualizarLoadedIdRef,
    tenantActualizarLabelsRef,
    dominioPorSaMap,
    running,
    setDeltaByEndpoint,
    setDiosReglaAccionesSeleccion,
    setDiosReglaRecursosSeleccion,
    setHerenciaAsociadaDataByEndpoint,
    setHerenciaAsociadaOptionsByEndpoint,
    setReglasPoliticasRuntimeSel,
    setSaFilterByEndpoint,
    setSuiteSelByEndpoint,
    setSyncInfoByEndpoint,
    setTenantFilterByEndpoint,
    setUsuariosDestinoSel,
    setVistasDesactivarSeleccion,
    setCatalogSelectionFor,
    setDiosReglaTenantsSelFor,
    setDiosReglaUsuariosPorTenantFor,
    setFieldValue,
    setPermisos,
    getCatalogSelection,
    getCatalogoVistaIdsRelacionadas,
    getExtraVistaIdsReglaPlantillaCrear,
    getSelectedRuleCatalogKey,
    getBulkAllMode,
    getPermisos,
    getAccionesPorVistaDesdeRegla,
    resolveActiveReglasEndpointId,
    resolveTenantGlobalParaReglasEndpoint,
    resolverVistaDesdeRutasSeguridad,
    seleccionarTodasVistasDesactivar,
    crearReglasJerarquiaSyncing,
    expandedModulos,
    bulkAllMode,
    result,
    resultData,
    reglasSearch,
    reglasTenantFilter,
    reglasHerenciaSyncBusy,
    vistaSearchByEndpoint,
    setCrearReglasJerarquiaSyncing,
    setExpandedModulos,
    setReglasSearch,
    setReglasTenantFilter,
    setVistaSearchByEndpoint,
    setBulkAllFor,
    getDiosReglaTenantsSel,
    getDiosReglaUsuariosPorTenantSel,
    getFieldValue,
    getHeredaOptionsPermitidasPorTenantGlobal,
    getHerenciaGlobalOpcionesParaTG,
    getHerenciasUsuariosSeleccionadosParaPermUsuario,
    getPermisosCatalog,
    getReglasPoliticasRuntimeSel,
    getReglasFiltradasPorTenant,
    getTenantCorporativoOptions,
    getTenantGlobalOptions,
    getTenantGlobalOptionsForPermUsuario,
    getTenantGlobalesOpcionesPorSaActualizar,
    getCorporativoByHerencia,
    getCorporativosDelTG,
    actorEsTenantSuperAdmin,
    actorEsTenantGlobalScope,
    actorEsTenantCorporativoScope,
    actualizarReglasGlobalesSoloLectura,
    applyHerenciaAsociadaSelection,
    applyPermAdminTenantGlobalSelection,
    applyRuleToForm,
    applySuiteCatalogSelection,
    aplicarUsuariosDesdeJerarquiaRef,
    buildDiosReglaSaMetasMap,
    cargarHerenciasPorUsuario,
    cargarUsuariosParaEndpoint,
    consultaReglasGlobalesRamaCorporativo,
    diosReglaAlcanceFormularioEditable,
    endpointDisponibleParaScope,
    endpointEsReglasGlobalesTenant,
    fetchHerenciasAsociadasByTenantGlobal,
    fetchHerenciasConReglasParaTenant,
    fetchTenantCorporativosByGlobal,
    findReglaJerarquiaPorSa,
    handleCatalogSeedDefaults,
    hydrateData,
    limpiarActualizarReglasAlCambiarSa,
    modoSoloLecturaReglasDios,
    permiteReglaDiosEnActualizarReglasGlobales,
    politicaRuntimeId,
    politicaRuntimeLabel,
    refreshReglasCatalogoPorSaActualizar,
    reglaSinTenantGlobalMaterializado,
    resolveDominioTenatPorSa,
    resolveSaIdCanonicoParaReglas,
    resolveSaJerarquiaMetasVisibles,
    runHerenciaSyncCheck,
    seleccionarReglaJerarquiaPorSaActualizar,
    seleccionarReglaParametrizadaPorTenantActualizar,
    sincronizarCatalogoReglasYHerencia,
    sincronizarContextoTenantGlobalPermUsuario,
    toggleCatalogItem,
    toggleReglaPoliticaRuntime,
    renderHerenciaAsociadaDetalle,
    renderHerenciaSelectionBuilder,
    renderPermisosBuilder,
  };

  if (singleFormInline) {
    const soloEndpoint = availableEndpoints[0] ?? null;
    return (
      <ParametrosGobernanzaCtx.Provider value={_ctxValue}>
      <GobernanzaFlowHelpProvider value={gobernanzaFlowHelpContextValue}>
        <div className="p-4 md:p-6">
          {soloEndpoint
            ? renderForm(soloEndpoint)
            : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando formulario...
              </div>
            )}
        </div>
      </GobernanzaFlowHelpProvider>
      </ParametrosGobernanzaCtx.Provider>
    );
  }

  return (
    <ParametrosGobernanzaCtx.Provider value={_ctxValue}>
    <GobernanzaFlowHelpProvider value={gobernanzaFlowHelpContextValue}>
    <div className={compactShell ? 'min-h-0' : 'min-h-screen bg-muted/50 p-4 md:p-6'}>
      {compactShell && (useModuloInlineFlow || esModuloPoliticaEspecial) ? (
        <GobernanzaModuloOperativoShell
          title={
            esModuloPoliticasRuntime
              ? GOBERNANZA_MODULO_POLITICAS_RUNTIME.label
              : esModuloPoliticaBypass
                ? GOBERNANZA_MODULO_POLITICA_BYPASS.label
                : inlineModuloMenu.panelTitle
          }
          description={
            esModuloPoliticasRuntime
              ? GOBERNANZA_MODULO_POLITICAS_RUNTIME.description
              : esModuloPoliticaBypass
                ? GOBERNANZA_MODULO_POLITICA_BYPASS.description
                : inlineModuloMenu.panelHint
          }
          submenuTitle={effectiveOperacionesHub || esModuloPoliticaEspecial ? undefined : inlineModuloMenu.submenuTitle}
          hideInfoBanner={effectiveOperacionesHub || esModuloPoliticaEspecial}
          menuLoading={esModuloPoliticaEspecial ? false : inlineModuloMenu.menuLoading}
          onRefreshMenu={() => inlineModuloMenu.refreshMenu()}
          onReloadData={() => void hydrateData({ force: true })}
          reloadingData={loadingData}
        >
          {esModuloPoliticasRuntime ? (
            <PoliticasRuntimePanel />
          ) : esModuloPoliticaBypass ? (
            <PoliticaBypassPanel />
          ) : moduloDinamicoInline}
        </GobernanzaModuloOperativoShell>
      ) : (
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted/50 text-foreground">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Panel administrativo
                  </p>
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    {pageTitle}
                  </h1>
                </div>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{pageDescription}</p>
            </div>

            <div className="flex w-full flex-col gap-3 lg:max-w-xl">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {stats.map((item) => (
                  <div key={item.label} className="rounded-md border border-border bg-muted/50 px-3 py-2">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-lg font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => void hydrateData({ force: true })}
                  disabled={loadingData}
                  className="w-full justify-center sm:w-auto"
                >
                  {loadingData ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Recargar datos API
                </Button>
              </div>
            </div>
          </div>
        </section>

        {!isRulesMode && !lockedSection && (
          <div className="grid gap-3 md:grid-cols-3">
            {(['tenant', 'permisos', 'corporativo'] as EndpointSection[]).map((section) => {
              const meta = SECTION_META[section];
              const Icon = meta.icon;
              const selected = activeSection === section;

              return (
                <button
                  key={section}
                  type="button"
                  onClick={() => setActiveSection(section)}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    selected
                      ? 'border-primary/35 bg-primary/5 text-foreground shadow-sm'
                      : 'border-border bg-card text-foreground hover:border-input hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 rounded-md border p-2 ${selected ? 'border-primary/20 bg-card text-primary' : 'border-border bg-muted/50 text-muted-foreground'}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <h2 className="text-sm font-semibold">{meta.label}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">{meta.description}</p>
                      </div>
                    </div>
                    <Badge variant={selected ? 'default' : 'outline'} className="shrink-0 rounded-md">
                      {sectionCounts[section]}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {useModuloInlineFlow && activeSection === 'tenant' ? (
          moduloDinamicoInline
        ) : (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 text-muted-foreground">
                  <ActiveSectionIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {isRulesMode
                      ? 'Flujo de reglas'
                      : useModuloInlineFlow
                      ? inlineModuloMenu.panelTitle
                      : activeSectionMeta.label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isRulesMode
                      ? 'Flujo guiado solo para reglas de tenant'
                      : useModuloInlineFlow
                      ? inlineModuloMenu.panelHint
                      : `${activeSectionMeta.description} ${endpointsBySection.length} endpoints visibles.`}
                  </p>
                </div>
              </div>
              {!useModuloInlineFlow ? (
                <div className="relative w-full lg:max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/90" />
                  <Input
                    value={endpointSearch}
                    onChange={(e) => setEndpointSearch(e.target.value)}
                    placeholder="Buscar endpoint por nombre, ruta o metodo"
                    className="pl-9"
                  />
                </div>
              ) : null}
            </div>
            {enableCardDesignEditor && !useModuloInlineFlow ? (
              <ParametrosGobernanzaEndpointDesignMenu
                endpoints={endpointNavItems}
                designQueryParam={cardDesignQueryParam}
                canEditDesign={(ep) =>
                  computeGobernanzaEndpointCapabilities(ep, gobernanzaCapabilityContext).canEditCardDesign
                }
              />
            ) : null}
            {moduloDinamicoInline}
          </CardContent>
        </Card>
        )}

        {useModuloInlineFlow || activeSection === 'tenant' ? null : endpointsBySection.length === 0 ? (
          <Card className="border-dashed border-input bg-card shadow-sm">
            <CardContent className="flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center">
              <Search className="h-5 w-5 text-muted-foreground/90" />
              <p className="text-sm font-medium text-foreground">Sin endpoints para mostrar</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Ajusta la busqueda o cambia de seccion para ver mas opciones.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {endpointsBySection.map((endpoint) => {
              const disponible = endpointDisponibleParaScope(endpoint);
              const actionProps = {
                endpoint,
                disponible,
                running: !!running[endpoint.id],
                actorLabel: actorBadge(endpoint.actor),
                shellClassName: enableCardDesignEditor ? cardShellClassForDesign(endpoint.id, cardDesignById) : undefined,
                pathClassName: enableCardDesignEditor ? cardPathClassForDesign(endpoint.id, cardDesignById) : undefined,
                spanClassName: endpoint.method === 'GET' ? 'md:col-span-2 xl:col-span-3' : undefined,
                onConfigure: setEndpointModal,
                onExecute: (ep: EndpointSpec) => ep.fields.length === 0 ? runEndpoint(ep) : setEndpointModal(ep),
              };

              if (endpoint.id === 'tenant-listar-libres-tenantglobal' || endpoint.id === 'tenant-listar-libres-superadmin') {
                return <ListarTenantGlobalActionCard key={endpoint.id} {...actionProps} />;
              }

              if (endpoint.id === 'tenant-actualizar-global') {
                return <ActualizarTenantGlobalActionCard key={endpoint.id} {...actionProps} />;
              }

              if (endpoint.id === 'tenant-desactivar-global') {
                return <DesactivarTenantGlobalActionCard key={endpoint.id} {...actionProps} />;
              }

              if (endpoint.id === 'tenant-eliminar-global') {
                return <EliminarTenantGlobalActionCard key={endpoint.id} {...actionProps} />;
              }

              return (
                <Card
                  key={endpoint.id}
                  className={cn(
                    'border-border bg-card shadow-sm transition-colors hover:border-primary/30',
                    endpoint.method === 'GET' && 'md:col-span-2 xl:col-span-3',
                    !disponible && 'opacity-75',
                    enableCardDesignEditor && cardShellClassForDesign(endpoint.id, cardDesignById)
                  )}
                >
                  <CardHeader className="space-y-3 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <Badge className={`border ${METHOD_STYLE[endpoint.method]}`}>{endpoint.method}</Badge>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Badge variant="outline" className="rounded-md">{actorBadge(endpoint.actor)}</Badge>
                        {!disponible ? <Badge variant="outline" className="rounded-md">Solo visible</Badge> : null}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-base leading-snug text-foreground">{endpoint.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{endpoint.description}</CardDescription>
                    </div>
                    {!disponible ? (
                      <p className="rounded-md border border-warning/20 bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
                        Este bloque pertenece a otro scope y queda disponible solo como referencia.
                      </p>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-4 p-5 pt-0">
                    <p
                      className={cn(
                        'rounded-md border border-border bg-muted/50 p-2 font-mono text-xs text-muted-foreground',
                        endpoint.method !== 'GET' && 'line-clamp-2',
                        enableCardDesignEditor && cardPathClassForDesign(endpoint.id, cardDesignById)
                      )}
                    >
                      {endpoint.path}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <GovernedButton actionId={governanceEndpointConfigureActionId(endpoint.id)} variant="outline" onClick={() => setEndpointModal(endpoint)}>
                        <Settings2 className="mr-2 h-4 w-4" />
                        Configurar
                      </GovernedButton>
                      <GovernedButton actionId={governanceEndpointActionId(endpoint.id)} onClick={() => endpoint.fields.length === 0 ? runEndpoint(endpoint) : setEndpointModal(endpoint)} disabled={!!running[endpoint.id] || !disponible}>
                        {running[endpoint.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                        Ejecutar
                      </GovernedButton>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      )}

      <Dialog open={!!herenciaDetalle} onOpenChange={(open) => !open && setHerenciaDetalle(null)}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 sm:max-w-5xl">
          <DialogHeader className="border-b border-border px-6 py-4 pr-12">
            <DialogTitle className="text-base text-foreground">Detalle de herencias por usuario/tenant</DialogTitle>
          </DialogHeader>
          {herenciaDetalle ? (
            <div className="max-h-[calc(92vh-72px)] space-y-3 overflow-auto px-6 py-5 text-xs">
              <div className="grid gap-2 md:grid-cols-3">
                <div className="rounded border border-border bg-muted/50 p-2">Usuario: <span className="font-semibold">{String(herenciaDetalle?.usuario || herenciaDetalle?.usuarioId || '-')}</span></div>
                <div className="rounded border border-border bg-muted/50 p-2">Total herencias: <span className="font-semibold">{Number(herenciaDetalle?.totalHerencias || herenciaDetalle?.total || 0)}</span></div>
                <div className="rounded border border-border bg-muted/50 p-2">Tenant globales: <span className="font-semibold">{Array.isArray(herenciaDetalle?.tenantGlobales) ? herenciaDetalle.tenantGlobales.length : 0}</span></div>
              </div>

              <div className="overflow-auto rounded-lg border border-border bg-card">
                <table className="w-full min-w-[980px] text-left text-xs">
                  <thead className="bg-muted text-foreground">
                    <tr>
                      <th className="px-3 py-2">ID</th>
                      <th className="px-3 py-2">TenantGlobal</th>
                      <th className="px-3 py-2">TenantCorporativo</th>
                      <th className="px-3 py-2">Rol</th>
                      <th className="px-3 py-2">Vista(s)</th>
                      <th className="px-3 py-2">Nodo/Formulario</th>
                      <th className="px-3 py-2">Acciones (populate)</th>
                      <th className="px-3 py-2">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(herenciaDetalle?.items) ? herenciaDetalle.items : []).map((row: any, idx: number) => (
                      <tr key={String(row?._id || row?.iud || idx)} className="border-t border-border/80">
                        <td className="px-3 py-2 font-mono">{String(row?._id || row?.iud || '-')}</td>
                        <td className="px-3 py-2">{String(row?.tenantGlobal?._id || row?.tenantGlobal || '-')}</td>
                        <td className="px-3 py-2">{String(row?.tenantCorporativo?._id || row?.tenantCorporativo || '-')}</td>
                        <td className="px-3 py-2">{String(row?.rolId?.rol || row?.rolId?._id || row?.rolId || '-')}</td>
                        <td className="px-3 py-2">
                          {Array.isArray(row?.vistas) && row.vistas.length
                            ? row.vistas.map((v: any) => String(v?.name || v?.path || v?._id || '-')).join(', ')
                            : '-'}
                        </td>
                        <td className="px-3 py-2">
                          {Array.isArray(row?.vistas) && row.vistas.length
                            ? row.vistas
                                .map((v: any) => {
                                  const nodo = String(v?.tipoNodo || '').trim();
                                  const form = String(v?.formulariosConfig || '').trim();
                                  if (nodo && form) return `${nodo}/${form}`;
                                  return nodo || form || '-';
                                })
                                .join(', ')
                            : '-'}
                        </td>
                        <td className="px-3 py-2">
                          {Array.isArray(row?.acciones) && row.acciones.length
                            ? row.acciones.map((a: any) => String(a?.etiquetas || a?.method || a?._id || '-')).join(', ')
                            : '-'}
                        </td>
                        <td className="px-3 py-2">{String(row?.fechaAsignacion || row?.createdAt || '-')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!reglasHerenciaSyncReport} onOpenChange={(open) => !open && setReglasHerenciaSyncReport(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Sincronización reglas y herencia</DialogTitle>
          </DialogHeader>
          {reglasHerenciaSyncReport ? (
            <ul className="list-inside list-disc space-y-2 text-xs text-muted-foreground">
              {reglasHerenciaSyncReport.lineas.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          ) : null}
          <div className="flex justify-end pt-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setReglasHerenciaSyncReport(null)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!useModuloInlineFlow ? (
      <Dialog
        open={Boolean(enableCardDesignEditor && designRouteEndpoint)}
        onOpenChange={(open) => {
          if (!open) clearDesignRoute();
        }}
      >
        <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden sm:max-w-5xl">
          {designRouteEndpoint ? (
            <>
              <DialogHeader className="border-b border-border px-6 py-4 pr-12">
                <DialogTitle className="text-base text-foreground">{designRouteEndpoint.title}</DialogTitle>
                <p className="font-mono text-xs text-muted-foreground">{designRouteEndpoint.path}</p>
              </DialogHeader>
                <div className="min-h-0 flex-1 overflow-auto px-6 py-5">{renderDesignPanel(designRouteEndpoint)}</div>
              <div className="flex flex-wrap justify-end gap-2 border-t border-border px-6 py-4">
                <Button type="button" size="sm" onClick={clearDesignRoute}>
                  Cerrar
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      ) : null}

      <Dialog
        open={
          !!endpointModal &&
          !(useModuloInlineFlow && endpointModal && inlineModuloEndpointIds.has(endpointModal.id))
        }
        onOpenChange={(open) => {
        if (!open) {
          if (endpointModal?.id === 'tenant-actualizar-global-reglas') {
            setSaFilterByEndpoint((prev) => {
              const next = { ...prev };
              delete next['tenant-actualizar-global-reglas'];
              return next;
            });
            setTenantFilterByEndpoint((prev) => {
              const next = { ...prev };
              delete next['tenant-actualizar-global-reglas'];
              return next;
            });
            setDeltaByEndpoint((prev) => { const next = { ...prev }; delete next['tenant-actualizar-global-reglas']; return next; });
          }
          setEndpointModal(null);
          if (syncRouteWithEndpoint) {
            lastOpenedRouteEndpointRef.current = undefined;
            onRouteEndpointClear?.();
          }
        }
      }}>
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-4xl">
          {endpointModal && (
            <>
              <DialogHeader className="border-b border-border px-6 py-4 pr-12">
                <DialogTitle className="flex items-center gap-2 text-base text-foreground">
                  <Shield className="h-5 w-5 text-muted-foreground" /> {endpointModal.title}
                </DialogTitle>
                <p className="font-mono text-xs text-muted-foreground">{endpointModal.path}</p>
              </DialogHeader>
              <div className="max-h-[calc(92vh-92px)] overflow-auto px-6 py-5">
                {renderForm(endpointModal)}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </GobernanzaFlowHelpProvider>
    </ParametrosGobernanzaCtx.Provider>
  );
};

export default ParametrosGobernanza;
