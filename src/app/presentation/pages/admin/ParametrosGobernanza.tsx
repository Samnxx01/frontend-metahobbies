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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Building2,
  KeyRound,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Settings2,
  Shield,
  ShieldCheck,
  X,
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
import { gobernanzaEntityId, gobernanzaEntityIdForPath } from './gobernanza/gobernanzaEntityId';
import {
  buildDominioPorSaMapFromSaMetas,
  normalizarTenantsSaMismoDominio,
  resolveDominioTenatPorSa,
} from './gobernanza/parametrosGobernanzaRuleCatalog';
import {
  toastErrorConTransaccion,
  toastTransaccionDesdePayload,
  type TransaccionResumen,
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
import { PoliticaBypassPanel } from './PoliticaBypassPanel';
import { PoliticasRuntimePanel } from './PoliticasRuntimePanel';
import {
  expandTenantGlobalDescendants,
  filtrarTenantGlobalesAlcanceJwtReglasGlobales,
  filtrarTenantGlobalesPorJerarquiaSuperAdmin,
  filtrarTenantGlobalesPorSaElegido,
  tenantGlobalOptionsFromJerarquiaUsuarios,
} from './gobernanza/tenantGlobalJerarquiaHelpers';
import { ReglasActualizarSaAlcancePanel } from './gobernanza/ReglasActualizarSaAlcancePanel';
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
  mergeSelectOptionForValue,
  tenantGlobalFormularioToFieldMap,
  type TenantGlobalFormularioDetalle,
} from './gobernanza/tenantGlobalSelectHelpers';
import {
  TENANT_SUPERADMIN_INSERT_ENDPOINT_ID_SET,
  TENANT_SUPERADMIN_INSERT_OPTIONAL_AUTH_IDS,
  esEndpointCreacionSaDocumento,
  esEndpointAltaTenantPanel,
} from './gobernanza/tenantSuperAdminInsertEndpoints';
import { GobernanzaAltaTenantResultPanel } from './gobernanza/GobernanzaAltaTenantResultPanel';
import {
  cargarJerarquiaRecursosDesdeCounter,
  formatDiosRecursoJerarquiaTipo,
  type DiosRecursoRow,
  type DiosRecursoSuiteJerarquia,
} from './gobernanza/diosReglaRecursosJerarquia';
import { DiosReglaRecursosJerarquiaPanel } from './gobernanza/DiosReglaRecursosJerarquiaPanel';
import { DiosReglaAlcanceTenantsPanel } from './gobernanza/DiosReglaAlcanceTenantsPanel';
import {
  buildDiosReglaAlcancesPayload,
  getUsuariosParametrizablesSa,
  requiereSelectorUsuariosSa,
  type DiosReglaSaMeta,
} from './gobernanza/diosReglaAlcanceHelpers';
import {
  buildDiosReglaSaAccesoHelpRows,
  resolverSecurityPlatformDesdeTenantSa,
  resolverSaJerarquiaTieneCorporativoEnCounters,
} from './gobernanza/diosReglaAyudaHelpers';
import { DIOS_REGLA_BTN_ACTIVO, DIOS_REGLA_BTN_PENDIENTE, diosReglaExecuteButtonClassName } from './gobernanza/diosReglaButtonStyles';
import { DiosReglaAccesoFullHelpSection } from './gobernanza/DiosReglaAccesoFullHelpSection';
import { GobernanzaFlowHelpProvider } from './gobernanza/gobernanzaFlowHelpContext';
import { type JerarquiaResponse, getJerarquiaUsuarios } from '@/app/services/tenantUsuariosService';
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
  type VistaLoc,
  type VistaItem,
  type SaJerarquiaMeta,
  computeRuleCatalogPermisosDigest,
  findReglaPlataformaPorSuperAdmin,
  saIdCoincideEnRegla,
  findReglasPorTenantSuperAdmin,
  filterDiosJerarquiaTreeByAllowedIds,
  resolverNvlGeneracionMeta,
  esNvl12ParametrosResueltosDesdeJwt,
  getTipoNodoLabel,
  esNodoFormularioLike,
  hasChildNodes,
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
  vistaIdMatchesIdSet,
  getEntityLabel,
  buildVistaLocationMap,
  buildGroupedVistas,
  resolveVistaLocEnArbol,
  contarVistasCatalogoEnSuite,
  contarVistasCatalogoEnModulo,
  buildSuiteSummaryLabel,
  parseMaybeJson,
  pickArray,
  pickTenantCorporate,
  buildTenantGlobalContextLabel,
  pickTenantCorreo,
  isTenantSuperAdminScopeOption,
  GOBERNANZA_ID_BODY_KEYS,
  shouldNormalizeGobernanzaIdKey,
  normalizeGobernanzaApiIdValue,
  normalizeGobernanzaApiIds,
  normalizeGobernanzaRequestPayloadIds,
  parseGobernanzaBooleanField,
  toMongoIdQueryParam,
  renderTenantGlobalSelectOptionGroups,
  resolveTenantSuperAdminIdForHerenciaSelect,
  resolveTenantGlobalDisplayMeta,
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
  const [vistas, setVistas] = useState<Vista[]>([]);
  const [acciones, setAcciones] = useState<Accion[]>([]);
  const [reglas, setReglas] = useState<ReglaOption[]>([]);
  const [contextos, setContextos] = useState<ContextOption[]>([]);
  const [ruleCatalog, setRuleCatalog] = useState<Record<string, any>>({});
  const [dominioPlataformaSistema, setDominioPlataformaSistema] = useState('');
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
  const [tenantGlobalSelectsDebug, setTenantGlobalSelectsDebug] = useState<string>('');
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
    const actorTenantGlobalId = String(tenantGlobalActor?.tenantGlobalId || '').trim();
    const actorTenantSuperAdminId = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
    const esSuperAdmin = !!actorTenantSuperAdminId;
    const esTenantGlobal = !!actorTenantGlobalId && !esSuperAdmin;

    const classifyScope = (tenant: TenantGlobal): 'tenantSuperAdmin' | 'tenantGlobal' | 'tenantCorporativo' => {
      const parentTenantGlobalId = String(tenant?.tenantGlobalAdmin || '').trim();
      const superAdminRef = String(tenant?.tenantSuperAdmin || '').trim();

      if (actorTenantGlobalId && tenant.id === actorTenantGlobalId) return 'tenantGlobal';
      if (parentTenantGlobalId) return 'tenantCorporativo';
      if (superAdminRef) return 'tenantSuperAdmin';
      return 'tenantGlobal';
    };

    return tenantGlobales
      .filter((tenant) => {
        if (esSuperAdmin) return true;
        if (!esTenantGlobal) return false;
        const parentTenantGlobalId = String(tenant?.tenantGlobalAdmin || '').trim();
        return tenant.id === actorTenantGlobalId || parentTenantGlobalId === actorTenantGlobalId;
      })
      .map((tenant) => {
        const scope = classifyScope(tenant);
        const scopeLabel =
          scope === 'tenantSuperAdmin'
            ? 'tenantSuperAdmin'
            : scope === 'tenantCorporativo'
            ? 'tenantCorporativo'
            : 'tenantGlobal';
        const corporativo = String(tenant?.corporativo || '').trim();
        return {
          id: tenant.id,
          label: `${scopeLabel} | ${tenant.label}${corporativo ? ` | ${corporativo}` : ''}`,
          meta: { scope },
        };
      });
  }, [tenantGlobalActor, tenantGlobales]);

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

  type RunEndpointOpts = {
    /** PUT sync total: securityPlatform true, sin políticas runtime, datos del formulario origen. */
    diosSyncCompleta?: boolean;
    diosFormSourceId?: string;
  };

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

  const coincideRutaFormularioActivo = useMemo(() => {
    const pathKey = String(resolvedMenuPath || '').replace(/\/+$/, '').toLowerCase();
    const activeKey = String(inlineModuloMenu.activeActionId || '').replace(/\/+$/, '').toLowerCase();
    return Boolean(pathKey && activeKey && pathKey === activeKey);
  }, [resolvedMenuPath, inlineModuloMenu.activeActionId]);

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
        console.log('[PG] selectsLite response → tenantSuperAdminsDesdeJerarquiaCounters:', data.tenantSuperAdminsDesdeJerarquiaCounters, '| jerarquiaSaCounters:', data.jerarquiaSaCounters);
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
          .map((r: any) => ({ id: String(r?._id || r?.id || ''), label: String(r?.label || r?.name || r?.path || r?._id || ''), path: String(r?.path || '') }))
          .filter((v: Vista) => v.id);
      }

      if (accionesRes.status === 'fulfilled') {
        const source = Array.isArray(accionesRes.value?.accionesSistema) ? accionesRes.value.accionesSistema : [];
        accionesResolved = source
          .filter((a: any) => a?.estadoAccion !== false)
          .map((a: any) => ({
            id: gobernanzaEntityId(a),
            label: String(a?.etiquetas || a?.method || gobernanzaEntityId(a) || ''),
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
            map.set(id, { id, label: String(a?.etiquetas || a?.method || id), method: String(a?.method || '') });
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
            label: String(a?.etiquetas || a?.method || a?.label || gobernanzaEntityId(a) || ''),
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
            .map((a: any) => ({ id: String(a?._id || a?.id || ''), label: String(a?.etiquetas || a?.method || a?._id || ''), method: String(a?.method || '') }))
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
          `/api/config/global/creacion/usu/tenant/global/${selectedId}/formulario`,
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

  /** JWT tenantSuperAdmin puro con alcance validado en counters — habilita regla DIOS en actualizar globales. */
  const permiteReglaDiosEnActualizarReglasGlobales = (): boolean =>
    esJwtSoloTenantSuperAdmin && scopeJwtSaAlcanceJerarquiaValidado;

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
        if (actualizarReglasGlobalesSoloLectura()) return [];
        const saSel = String(
          saFilterByEndpoint[endpointId] || tenantGlobalActor?.tenantSuperAdminId || '',
        ).trim();
        const porSa = saSel ? findReglaJerarquiaPorSa(saSel) : undefined;
        return porSa ? [porSa] : [];
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

  /**
   * Reglas editables en actualizar globales: tenant view o DIOS sin TG materializado (solo JWT SA sin corporativo).
   */
  const reglaEsActualizableEnReglasGlobalesEndpoint = (rule: any, endpointId: string): boolean => {
    if (!reglaCumpleContextoViewReglasGlobales(rule)) return false;
    if (rule?.securityPlatform === true) {
      return (
        endpointId === 'tenant-actualizar-global-reglas' &&
        permiteReglaDiosEnActualizarReglasGlobales() &&
        reglaSinTenantGlobalMaterializado(rule)
      );
    }
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
    applyRuleToForm(endpointId, match.id);
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
      if (!rule || !reglaEsGlobalesTenantContextoView(rule)) return undefined;
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
  /** Contrasta políticas de la regla con el catálogo runtime del dominio del tenant (alcance JWT). */
  const getPoliticasRuntimeMatchEstado = (endpointId: string): { huerfanas: string[]; validas: string[] } => {
    const seleccionadas = getReglasPoliticasRuntimeSel(endpointId);
    const catalogCanon = new Map<string, string>();
    politicasRuntimeCatalog.forEach((p) => {
      const pid = politicaRuntimeId(p);
      if (!pid) return;
      catalogCanon.set(pid, pid);
      collectGobernanzaRefIds(p).forEach((alt) => catalogCanon.set(alt, pid));
    });
    const resolverEnCatalogo = (rawId: string): string | null => {
      const id = gobernanzaEntityId(rawId).trim();
      if (!id) return null;
      if (catalogCanon.has(id)) return catalogCanon.get(id)!;
      for (const [alt, canon] of catalogCanon) {
        if (idsPermisoRefsCoinciden(alt, id)) return canon;
      }
      return null;
    };
    const validas: string[] = [];
    const huerfanas: string[] = [];
    seleccionadas.forEach((raw) => {
      const canon = resolverEnCatalogo(raw);
      if (canon) {
        if (!validas.includes(canon)) validas.push(canon);
      } else {
        huerfanas.push(raw);
      }
    });
    return { huerfanas, validas };
  };
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
  const syncCatalogSelection = (endpointId: string, suiteId = '') => {
    const { accionesCatalogo } = getPermisosCatalog(endpointId);
    const current = getCatalogSelection(endpointId);
    const vistasRelacionadas = getCatalogoVistaIdsRelacionadas(endpointId, suiteId);
    const accionesValidas = current.acciones.filter((id) => accionesCatalogo.some((accion) => accion.id === id));

    setCatalogSelectionFor(endpointId, {
      vistas: vistasRelacionadas,
      acciones: accionesValidas.length ? accionesValidas : accionesCatalogo.map((accion) => accion.id),
    });
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
    console.log('[PG][resolveSaMetas] endpointId:', endpointId, '| metas.length:', metas.length, '| jerarquiaSaCounters.length:', jerarquiaSaCounters.length);
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
    const qs = new URLSearchParams();
    if (isTenantSuperAdminScopeOption(tgSel)) {
      const saPicked = tgSel.slice(TENANT_SUPERADMIN_SCOPE_PREFIX.length).trim();
      if (saPicked) qs.set('tenantSuperTenant', toMongoIdQueryParam(saPicked));
    } else if (tgSel) {
      qs.set('tenantGlobal', toMongoIdQueryParam(tgSel));
    }
    const res: any = await apiFetch(
      `/api/config/tenant/listar/reglas${qs.toString() ? `?${qs.toString()}` : ''}`,
      { method: 'GET' }
    );
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
    const variantes = [...resolveSaIdsEquivalentes(saCanon)];
    const saQueries = [
      ...variantes,
      saCanon,
      ...variantes.filter((id) => /^[a-f0-9]{24}$/i.test(id)),
    ].filter((id, idx, arr) => id && arr.indexOf(id) === idx);
    const fetchRows = async (): Promise<any[]> => {
      for (const saQuery of saQueries) {
        const qs = new URLSearchParams();
        qs.set('tenantSuperTenant', toMongoIdQueryParam(saQuery));
        try {
          const res: any = await apiFetch(
            `/api/config/tenant/listar/reglas?${qs.toString()}`,
            { method: 'GET' },
          );
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
  const renderHerenciaAsociadaDetalle = (endpointId: string): React.ReactElement | null => {
    const selectedHerenciaId = getFieldValue(endpointId, 'herenciaAsociada').trim();
    if (!selectedHerenciaId) return null;

    const byId = herenciaAsociadaDataByEndpoint[endpointId] || {};
    const row = byId[selectedHerenciaId];
    if (!row) return null;

    const vistasDetalle: VistaItem[] = (Array.isArray(row?.vistas) ? row.vistas : [])
      .map((vista: any) => ({
        id: getEntityId(vista),
        label: String(vista?.name || vista?.path || getEntityId(vista)).trim(),
        path: String(vista?.path || '').trim(),
      }))
      .filter((v: VistaItem) => v.id);

    const accionesDetalle = (Array.isArray(row?.acciones) ? row.acciones : [])
      .map((accion: any) => ({
        id: String(accion?._id || accion || '').trim(),
        label: String(accion?.etiquetas || accion?.method || accion?._id || accion || '').trim(),
        method: String(accion?.method || '').trim(),
      }))
      .filter((a: { id: string }) => a.id);

    const puedeSeleccionarVista =
      endpointId === 'perm-admin-tenant-global-desactivar' ||
      endpointId === 'perm-admin-tenant-global-eliminar';
    const seleccionadas = vistasDesactivarSeleccion[endpointId] ?? [];
    const seleccionSet = new Set(seleccionadas);

    const toggleVistaDesactivar = (vid: string) => {
      setVistasDesactivarSeleccion((prev) => {
        const cur = [...(prev[endpointId] ?? [])];
        const i = cur.indexOf(vid);
        if (i >= 0) cur.splice(i, 1);
        else cur.push(vid);
        return { ...prev, [endpointId]: cur };
      });
    };
    const seleccionarTodasVistasDesactivar = () => {
      const allIds = vistasDetalle.map((v) => v.id);
      setVistasDesactivarSeleccion((prev) => ({ ...prev, [endpointId]: allIds }));
    };
    const limpiarVistasDesactivar = () => {
      setVistasDesactivarSeleccion((prev) => ({ ...prev, [endpointId]: [] }));
    };

    // â”€â”€ Agrupar vistas por suite â†’ mÃ³dulo (con fallback por path) â”€â”€
    const { byId: _locById, byPath: _locByPath } = buildVistaLocationMap(rutasJerarquia);
    const { suiteGroups, sinSuite } = buildGroupedVistas(vistasDetalle, _locById, _locByPath);

    const suiteSummary = buildSuiteSummaryLabel(suiteGroups as Map<string, { suiteName: string }>, sinSuite.length);
    const tgId = getEntityId(row?.tenantGlobal);
    const tgFromState = tenantGlobales.find((tenant) => String(tenant.id || '').trim() === tgId);
    const tgLabel = (tgFromState
      ? String(tgFromState.label || '').trim().split('|')[0].trim()
      : getEntityLabel(row?.tenantGlobal)) || tgId || '-';
    const tcId = getEntityId(row?.tenantCorporativo);
    const tcLabel = getEntityLabel(row?.tenantCorporativo) || tcId || '-';
    const fuenteHerencia = String(row?.fuenteHerencia || row?.fuente || 'tenantGlobal').trim();
    const rolHerencia = String(row?.rolId?.rol || row?.rolId?.name || row?.rolId || '-').trim();
    const uDoc = row?.usuarioId && typeof row.usuarioId === 'object' ? (row.usuarioId as Record<string, unknown>) : null;
    const usuarioHerencia = String(
      (uDoc?.correo as string) ||
        (uDoc?.nombre as string) ||
        (uDoc?.name as string) ||
        (uDoc?._id as string) ||
        '-'
    ).trim();
    const perfilG = uDoc?.perfilGlobal as Record<string, unknown> | null | undefined;
    const perfilSA = uDoc?.perfilSuperAdmin as Record<string, unknown> | null | undefined;
    const asignDoc =
      row?.asignadoPor && typeof row.asignadoPor === 'object' ? (row.asignadoPor as Record<string, unknown>) : null;
    const creadoDoc =
      row?.creadoPor && typeof row.creadoPor === 'object' ? (row.creadoPor as Record<string, unknown>) : null;

    const bloquePerfil = (p: Record<string, unknown> | null | undefined, titulo: string) =>
      p && Object.keys(p).length ? (
        <div className="rounded border border-border bg-background/90 px-2 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700">{titulo}</p>
          <p className="font-medium text-foreground">
            {[p.nombre, p.apellido].filter(Boolean).join(' ') || '—'}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {[p.cc ? `CC ${p.cc}` : '', p.telefono ? `Tel ${String(p.telefono)}` : '', p.direccion ? String(p.direccion) : '']
              .filter(Boolean)
              .join(' · ') || null}
          </p>
        </div>
      ) : (
        <p className="text-[11px] italic text-muted-foreground">Sin datos de {titulo}</p>
      );

    const renderVistaItem = (vista: VistaItem) => (
      <label
        key={vista.id}
        className={`flex items-start gap-2 rounded border px-2 py-1.5 text-xs ${puedeSeleccionarVista ? 'cursor-pointer' : ''} ${puedeSeleccionarVista && seleccionSet.has(vista.id) ? 'border-rose-300 bg-rose-100' : 'border-border/80 bg-muted/50'}`}
      >
        {puedeSeleccionarVista && (
          <input
            type="checkbox"
            className="mt-0.5 shrink-0 accent-rose-600"
            checked={seleccionSet.has(vista.id)}
            onChange={() => toggleVistaDesactivar(vista.id)}
          />
        )}
        <div>
          <p className="font-medium text-foreground">{vista.label}</p>
          {vista.path && <p className="text-muted-foreground/90">{vista.path}</p>}
        </div>
      </label>
    );

    return (
      <div className="md:col-span-2 rounded-lg border border-rose-100 bg-rose-50/50 p-3">
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge variant="outline">Vistas: {vistasDetalle.length}</Badge>
          <Badge variant="outline">Acciones: {accionesDetalle.length}</Badge>
          <Badge variant="outline">Suites: {Array.from(suiteGroups.values()).length || 0}</Badge>
        </div>
        <div className="mb-3 grid gap-2 rounded-md border border-border bg-card p-3 text-xs text-muted-foreground md:grid-cols-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">TG: {tgLabel}</Badge>
            {tcId ? <Badge variant="secondary">TC: {tcLabel}</Badge> : null}
            <Badge variant="secondary">Fuente: {fuenteHerencia}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Rol: {rolHerencia}</Badge>
            <Badge variant="outline">Usuario: {usuarioHerencia}</Badge>
          </div>
          <div className="md:col-span-2">
            <span className="font-medium text-foreground">Jerarquia:</span> {suiteSummary}
          </div>
        </div>
        <div className="mb-3 grid gap-3 rounded-md border border-violet-200 bg-violet-50/50 p-3 text-xs md:grid-cols-2">
          <div>
            <p className="mb-1 font-semibold text-foreground">Usuario asociado a la herencia (RegisUsu)</p>
            {uDoc?._id ? (
              <p className="mb-1 font-mono text-[10px] text-muted-foreground">{String(uDoc._id)}</p>
            ) : null}
            <p className="mb-2 text-foreground">{usuarioHerencia}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {bloquePerfil(perfilG, 'perfilGlobal (PerfilUsuGlobal)')}
              {bloquePerfil(perfilSA, 'perfilSuperAdmin (PerfilUsuSuperAdmin)')}
            </div>
          </div>
          <div>
            {asignDoc ? (
              <>
                <p className="mb-1 font-semibold text-foreground">Asignado por (herencia global)</p>
                {asignDoc._id ? (
                  <p className="mb-1 font-mono text-[10px] text-muted-foreground">{String(asignDoc._id)}</p>
                ) : null}
                <p className="mb-2 text-foreground">
                  {String(asignDoc.correo || asignDoc._id || '-')}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {bloquePerfil(asignDoc.perfilGlobal as Record<string, unknown>, 'perfilGlobal')}
                  {bloquePerfil(asignDoc.perfilSuperAdmin as Record<string, unknown>, 'perfilSuperAdmin')}
                </div>
              </>
            ) : creadoDoc ? (
              <>
                <p className="mb-1 font-semibold text-foreground">Creado por (herencia corporativa)</p>
                {creadoDoc._id ? (
                  <p className="mb-1 font-mono text-[10px] text-muted-foreground">{String(creadoDoc._id)}</p>
                ) : null}
                <p className="mb-2 text-foreground">
                  {String(creadoDoc.correo || creadoDoc._id || '-')}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {bloquePerfil(creadoDoc.perfilGlobal as Record<string, unknown>, 'perfilGlobal')}
                  {bloquePerfil(creadoDoc.perfilSuperAdmin as Record<string, unknown>, 'perfilSuperAdmin')}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Sin asignadoPor / creadoPor en este registro.</p>
            )}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-border bg-card p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vistas parametrizadas</p>
            {vistasDetalle.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin vistas parametrizadas.</p>
            ) : puedeSeleccionarVista &&
              (diosRecursosJerarquiaTree.length > 0 || diosRecursosJerarquiaFlat.length > 0) ? (
              <div className="max-h-72 overflow-y-auto">
                <DiosReglaRecursosJerarquiaPanel
                  tree={filterDiosJerarquiaTreeByAllowedIds(
                    diosRecursosJerarquiaTree,
                    new Set(vistasDetalle.map((v) => v.id))
                  )}
                  flatFallback={diosRecursosJerarquiaFlat.filter((r) =>
                    vistasDetalle.some((v) => v.id === String(r._id || '').trim())
                  )}
                  seleccionados={seleccionadas}
                  onChangeSeleccion={(ids) =>
                    setVistasDesactivarSeleccion((prev) => ({ ...prev, [endpointId]: ids }))
                  }
                  loading={diosRecursosJerarquiaLoading && !diosRecursosJerarquiaTree.length}
                />
              </div>
            ) : (
              <div className="max-h-64 overflow-auto space-y-3 pr-1">
                {/* Vistas agrupadas por suite */}
                {Array.from(suiteGroups.entries()).map(([suiteId, sg]) => (
                  <div key={suiteId}>
                    <p className="mb-1 rounded bg-muted px-2 py-0.5 text-xs font-bold text-foreground">{sg.suiteName}</p>
                    {Array.from(sg.modulos.entries()).map(([mKey, mg]) => (
                      <div key={mKey} className="ml-2 mb-1">
                        {mg.moduloName && mKey !== '__direct__' && (
                          <p className="mb-0.5 text-xs font-semibold text-muted-foreground pl-1">{mg.moduloName}</p>
                        )}
                        <div className="ml-2 space-y-1">
                          {mg.vistas.map(renderVistaItem)}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                {/* Vistas sin suite */}
                {sinSuite.length > 0 && (
                  <div>
                    <p className="mb-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">Sin suite asignada</p>
                    <div className="ml-2 space-y-1">
                      {sinSuite.map(renderVistaItem)}
                    </div>
                  </div>
                )}
              </div>
            )}
            {puedeSeleccionarVista && vistasDetalle.length > 0 && (
              <div className="mt-2 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="text-xs text-rose-700 underline"
                    onClick={seleccionarTodasVistasDesactivar}
                  >
                    Seleccionar todas
                  </button>
                  <button type="button" className="text-xs text-muted-foreground underline" onClick={limpiarVistasDesactivar}>
                    Limpiar selección
                  </button>
                </div>
                {seleccionadas.length > 0 ? (
                  <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5">
                    <p className="text-xs font-medium text-amber-800">
                      {endpointId === 'perm-admin-tenant-global-eliminar'
                        ? `Se enviará PATCH para quitar ${seleccionadas.length} vista${seleccionadas.length === 1 ? '' : 's'} de la herencia (no borra el documento completo).`
                        : `Se enviará PATCH con vistaIds (${seleccionadas.length} vista${seleccionadas.length === 1 ? '' : 's'}).`}
                    </p>
                  </div>
                ) : endpointId === 'perm-admin-tenant-global-eliminar' ? (
                  <p className="text-xs font-medium text-rose-600">
                    Sin vistas marcadas: eliminación definitiva del registro (DELETE …/force).
                  </p>
                ) : (
                  <p className="text-xs font-medium text-rose-600">
                    Sin vistas marcadas: se desactiva la herencia completa (DELETE del documento).
                  </p>
                )}
                <p className="text-xs text-muted-foreground/90">
                  {endpointId === 'perm-admin-tenant-global-eliminar'
                    ? 'Marca vistas para quitarlas con PATCH; déjalo vacío solo si quieres borrar todo el registro con force.'
                    : 'Marca las vistas a quitar de la herencia; el payload usa vistaIds en una sola petición.'}
                </p>
              </div>
            )}
          </div>
          {/* â”€â”€ Panel Acciones â”€â”€ */}
          <div className="rounded-md border border-border bg-card p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acciones parametrizadas</p>
            {accionesDetalle.length ? (
              <div className="max-h-64 space-y-1 overflow-auto pr-1">
                {accionesDetalle.map((accion: { id: string; label: string; method: string }) => (
                  <div key={accion.id} className="rounded border border-border/80 bg-muted/50 px-2 py-1.5">
                    <p className="text-sm font-medium text-foreground">{accion.label}</p>
                    {accion.method && <p className="text-xs text-muted-foreground">{accion.method}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sin acciones parametrizadas.</p>
            )}
          </div>
        </div>
      </div>
    );
  };
  const getPermisosCatalog = (
    endpointId: string,
    ruleIdOverride?: string,
    deltaOverride?: any,
  ): { vistasCatalogo: Vista[]; accionesCatalogo: Accion[] } => {
    const resolveVistaCatalogByIds = (ids: string[]): Vista[] => {
      const vistaById = new Map(vistas.map((v) => [v.id, v]));
      const hierarchyById = new Map<string, Vista>();

      rutasJerarquia.forEach((suite) => {
        const suiteId = getEntityId(suite);
        if (suiteId && !hierarchyById.has(suiteId)) {
          hierarchyById.set(suiteId, {
            id: suiteId,
            label: String(suite?.name || suite?.path || suiteId),
            path: String((suite as any)?.path || ''),
          });
        }

        collectAllNodes(suite.children || []).forEach((node: any) => {
          const nodeId = getEntityId(node);
          if (!nodeId || hierarchyById.has(nodeId)) return;
          hierarchyById.set(nodeId, {
            id: nodeId,
            label: String(node?.name || node?.path || nodeId),
            path: String(node?.path || ''),
          });
        });
      });

      diosRecursosJerarquiaFlat.forEach((r) => {
        const rid = String(r._id || '').trim();
        if (!rid || hierarchyById.has(rid)) return;
        hierarchyById.set(rid, {
          id: rid,
          label: String(r.name || r.path || rid),
          path: String(r.path || ''),
        });
      });

      return ids
        .map((id) => vistaById.get(id) || hierarchyById.get(id) || { id, label: id, path: '' })
        .filter(Boolean) as Vista[];
    };

    if (endpointId === 'perm-usuario-tenant-global') {
      const getId = (value: any): string => String(value?._id || value || '').trim();
      const reglaTecho = resolveReglaTechoPermUsuario(endpointId);
      if (reglaTecho) {
        const recursoIds = (Array.isArray(reglaTecho?.recurso) ? reglaTecho.recurso : [])
          .map((v: any) => getId(v))
          .filter(Boolean);
        const accionIds = (Array.isArray(reglaTecho?.accionesUsu) ? reglaTecho.accionesUsu : [])
          .map((a: any) => getId(a))
          .filter(Boolean);
        const accionByIdTecho = new Map(acciones.map((a) => [a.id, a]));
        const vistasDesdeRegla = resolveVistaCatalogByIds(recursoIds);
        const accionesDesdeRegla = accionIds.length
          ? accionIds.map((aid: string) => accionByIdTecho.get(aid) || { id: aid, label: aid, method: '' })
          : [];
        if (vistasDesdeRegla.length) {
          return { vistasCatalogo: vistasDesdeRegla, accionesCatalogo: accionesDesdeRegla };
        }
        if (recursoIds.length > 0) {
          return { vistasCatalogo: [], accionesCatalogo: [] };
        }
      }

      const selectedHeredaGlobal = getFieldValue(endpointId, 'heredaGlobal').trim();
      const selectedEsReglaCatalogo = !!(selectedHeredaGlobal && ruleCatalog[selectedHeredaGlobal]);
      const usarSeleccionComoFuenteCatalogo =
        selectedHeredaGlobal &&
        (actorEsTenantGlobalScope() || selectedEsReglaCatalogo || endpointId !== 'perm-usuario-tenant-global');
      const sourceIds = usarSeleccionComoFuenteCatalogo
        ? [selectedHeredaGlobal]
        : actorEsTenantGlobalScope()
        ? getHerenciaGlobalOpcionesParaTG().map((opt) => String(opt.id || '').trim()).filter(Boolean)
        : getHeredaOptionsPermitidasPorTenantGlobal(getFieldValue(endpointId, 'tenantGlobalScope').trim())
            .map((opt) => String(opt.id || '').trim())
            .filter(Boolean);
      const vistasMap = new Map<string, Vista>();
      const accionesMap = new Map<string, Accion>();
      const accionById = new Map(acciones.map((a) => [a.id, a]));
      const addVista = (vista: Vista | null | undefined) => {
        if (vista?.id && !vistasMap.has(vista.id)) vistasMap.set(vista.id, vista);
      };
      const addAccion = (accion: Accion | null | undefined) => {
        if (accion?.id && !accionesMap.has(accion.id)) accionesMap.set(accion.id, accion);
      };
      if (!selectedHeredaGlobal && actorEsTenantGlobalScope()) {
        sourceIds.forEach((sourceId) => {
          const herencia = herenciasUsuario.find((h: any) =>
            String(h?.iud || h?._id || '').trim() === sourceId
          );
          if (!herencia) return;
          (Array.isArray(herencia?.vistas) ? herencia.vistas : []).forEach((v: any) => {
            const id = getId(v);
            if (!id) return;
            addVista({ id, label: String(v?.name || v?.path || id), path: String(v?.path || '') });
          });
          (Array.isArray(herencia?.acciones) ? herencia.acciones : []).forEach((a: any) => {
            const id = getId(a);
            if (!id) return;
            addAccion({ id, label: String(a?.etiquetas || a?.method || id), method: String(a?.method || '') });
          });
        });
        // Si hay vistas de herencias propias del TG, retornarlas; sino caer al last resort
        if (vistasMap.size > 0) {
          return { vistasCatalogo: Array.from(vistasMap.values()), accionesCatalogo: Array.from(accionesMap.values()) };
        }
      }
      if (!selectedHeredaGlobal && !actorEsTenantGlobalScope()) {
        sourceIds.forEach((sourceId) => {
          const herenciaDirectaSA = herenciasUsuario.find((h: any) =>
            String(h?.iud || h?._id || '').trim() === sourceId
          );
          const herenciaConDatos = herenciaDirectaSA || herenciasUsuario.find((h: any) => {
            const heredaId = String(h?.heredaGlobal?._id || h?.heredaGlobal || '').trim();
            return heredaId === sourceId && Array.isArray(h?.vistas) && h.vistas.length > 0;
          });
          if (herenciaConDatos) {
            (Array.isArray(herenciaConDatos?.vistas) ? herenciaConDatos.vistas : []).forEach((v: any) => {
              const id = getId(v);
              if (!id) return;
              addVista({ id, label: String(v?.name || v?.path || id), path: String(v?.path || '') });
            });
            (Array.isArray(herenciaConDatos?.acciones) ? herenciaConDatos.acciones : []).forEach((a: any) => {
              const id = getId(a);
              if (!id) return;
              addAccion({ id, label: String(a?.etiquetas || a?.method || id), method: String(a?.method || '') });
            });
            return;
          }
          const rule = ruleCatalog[sourceId];
          if (!rule) return;
          const recursoIds = (Array.isArray(rule?.recurso) ? rule.recurso : [])
            .map((v: any) => getId(v))
            .filter(Boolean);
          const accionIds = (Array.isArray(rule?.accionesUsu) ? rule.accionesUsu : [])
            .map((a: any) => getId(a))
            .filter(Boolean);
          resolveVistaCatalogByIds(recursoIds).forEach(addVista);
          accionIds
            .map((id: string) => accionById.get(id) || { id, label: id, method: '' })
            .forEach(addAccion);
        });
        if (vistasMap.size || accionesMap.size) {
          return { vistasCatalogo: Array.from(vistasMap.values()), accionesCatalogo: Array.from(accionesMap.values()) };
        }
      }

      // TG scope: la herencia seleccionada ES el _id del registro herenciaGlobal (no tiene campo heredaGlobal)
      if (actorEsTenantGlobalScope()) {
        const herencia = herenciasUsuario.find((h: any) =>
          String(h?.iud || h?._id || '').trim() === selectedHeredaGlobal
        );
        if (herencia) {
          const vistasCatalogo = (Array.isArray(herencia?.vistas) ? herencia.vistas : [])
            .map((v: any) => {
              const id = getId(v);
              if (!id) return null;
              return { id, label: String(v?.name || v?.path || id), path: String(v?.path || '') };
            })
            .filter(Boolean) as Vista[];
          const accionesCatalogo = (Array.isArray(herencia?.acciones) ? herencia.acciones : [])
            .map((a: any) => {
              const id = getId(a);
              if (!id) return null;
              return { id, label: String(a?.etiquetas || a?.method || id), method: String(a?.method || '') };
            })
            .filter(Boolean) as Accion[];
          if (vistasCatalogo.length && accionesCatalogo.length) {
            return { vistasCatalogo, accionesCatalogo };
          }
        }
        // Sin herencia con datos: caer al last resort para mostrar todas las rutasSeguridad
      }

      // SA scope: buscar primero por _id directo (herenciaGlobal directa del tenant)
      // y como fallback por campo h.heredaGlobal (referencia a regla - estilo antiguo)
      const herenciaDirectaSA = herenciasUsuario.find((h: any) =>
        String(h?.iud || h?._id || '').trim() === selectedHeredaGlobal
      );
      const herenciaConDatos = herenciaDirectaSA || herenciasUsuario.find((h: any) => {
        const heredaId = String(h?.heredaGlobal?._id || h?.heredaGlobal || '').trim();
        return heredaId === selectedHeredaGlobal && Array.isArray(h?.vistas) && h.vistas.length > 0;
      });

      if (herenciaConDatos) {
        // Para SA: el techo del catálogo es la REGLA padre (66 vistas), no la herencia (45).
        // La herencia es un subconjunto de la regla — mostrar todas las vistas de la regla
        // para que el SA pueda ampliar/modificar la asignación de la herencia.
        const ruleRef = String(herenciaConDatos?.heredaGlobal?._id || herenciaConDatos?.heredaGlobal || '').trim();
        const parentRule = ruleRef ? ruleCatalog[ruleRef] : null;

        if (parentRule) {
          const recursoIds = (Array.isArray(parentRule?.recurso) ? parentRule.recurso : [])
            .map((v: any) => getId(v))
            .filter(Boolean);
          const accionIds = (Array.isArray(parentRule?.accionesUsu) ? parentRule.accionesUsu : [])
            .map((a: any) => getId(a))
            .filter(Boolean);
          const accionByIdMap = new Map(acciones.map((a) => [a.id, a]));
          const vistasDesdeRegla = resolveVistaCatalogByIds(recursoIds);
          const accionesDesdeRegla = accionIds.length
            ? accionIds.map((id: string) => accionByIdMap.get(id) || { id, label: id, method: '' })
            : acciones;
          if (vistasDesdeRegla.length) {
            return { vistasCatalogo: vistasDesdeRegla, accionesCatalogo: accionesDesdeRegla };
          }
        }

        // Sin regla padre resolvible: usar vistas de la herencia directamente como catálogo
        const vistasCatalogo = (Array.isArray(herenciaConDatos?.vistas) ? herenciaConDatos.vistas : [])
          .map((v: any) => {
            const id = getId(v);
            if (!id) return null;
            return {
              id,
              label: String(v?.name || v?.path || id),
              path: String(v?.path || ''),
            };
          })
          .filter(Boolean) as Vista[];

        const accionesCatalogo = (Array.isArray(herenciaConDatos?.acciones) ? herenciaConDatos.acciones : [])
          .map((a: any) => {
            const id = getId(a);
            if (!id) return null;
            return {
              id,
              label: String(a?.etiquetas || a?.method || id),
              method: String(a?.method || ''),
            };
          })
          .filter(Boolean) as Accion[];

        if (vistasCatalogo.length && accionesCatalogo.length) {
          return { vistasCatalogo, accionesCatalogo };
        }
      }

      // Fallback: si la herencia no trae datos, usar recurso/acciones de la regla.
      const rule = ruleCatalog[selectedHeredaGlobal];
      if (rule) {
        const recursoIds = (Array.isArray(rule?.recurso) ? rule.recurso : [])
          .map((v: any) => getId(v))
          .filter(Boolean);
        const accionIds = (Array.isArray(rule?.accionesUsu) ? rule.accionesUsu : [])
          .map((a: any) => getId(a))
          .filter(Boolean);

        const accionById = new Map(acciones.map((a) => [a.id, a]));

        const vistasCatalogo = resolveVistaCatalogByIds(recursoIds);
        const accionesCatalogo = accionIds.length
          ? accionIds.map((id: string) => accionById.get(id) || { id, label: id, method: '' })
          : [];

        if (vistasCatalogo.length) {
          return { vistasCatalogo, accionesCatalogo };
        }

        // La regla tiene vistas pero todas estÃ¡n inactivas â†’ informar sin catÃ¡logo
        if (recursoIds.length > 0) {
          return { vistasCatalogo: [], accionesCatalogo: [] };
        }
      }

      // Last resort: solo para SA puro sin tenantGlobal ni tenantCorporativo en el JWT.
      // Si el JWT trae tenant, no se debe exponer el catalogo completo.
      const esSaPuro = actorEsTenantSuperAdmin()
        && !String(tenantGlobalActor?.tenantGlobalId || '').trim()
        && !String(tenantGlobalActor?.tenantCorporativoId || '').trim();
      if (esSaPuro) {
        // Derivar vistas desde rutasJerarquia (incluye rutas nuevas no enlazadas a contextos aun)
        const seenIds = new Set<string>();
        const allFromTree: Vista[] = [];
        const traverseTree = (nodes: NodoRuta[]) => {
          nodes.forEach((node) => {
            const id = String(node._id || '').trim();
            if (id && !seenIds.has(id)) {
              seenIds.add(id);
              allFromTree.push({ id, label: String(node.name || node.path || id), path: String(node.path || '') });
            }
            if (Array.isArray(node.children)) traverseTree(node.children);
          });
        };
        traverseTree(rutasJerarquia);
        const sourceVistas = allFromTree.length ? allFromTree : vistas;
        if (sourceVistas.length) return { vistasCatalogo: sourceVistas, accionesCatalogo: acciones };
      }

      return { vistasCatalogo: [], accionesCatalogo: [] };
    }

    /** Une vistas/acciones de la fila herencia con las reglas del catálogo (GET listar reglas) del mismo SA/TG,
     * para que rutas nuevas en reglas aparezcan en el árbol sin depender de que el doc herencia ya esté sincronizado. */
    const mergeReglasTenantEnCatalogoPermAdmin = (
      endpointIdMerge: string,
      vistasBase: Vista[],
      accionesBase: Accion[]
    ): { vistasCatalogo: Vista[]; accionesCatalogo: Accion[] } => {
      const mergeVistas = (a: Vista[], b: Vista[]): Vista[] => {
        const m = new Map<string, Vista>();
        a.forEach((v) => {
          if (v?.id) m.set(v.id, v);
        });
        b.forEach((v) => {
          if (v?.id && !m.has(v.id)) m.set(v.id, v);
        });
        return Array.from(m.values());
      };
      const mergeAccs = (a: Accion[], b: Accion[]): Accion[] => {
        const m = new Map<string, Accion>();
        a.forEach((x) => {
          if (x?.id) m.set(x.id, x);
        });
        b.forEach((x) => {
          if (x?.id && !m.has(x.id)) m.set(x.id, x);
        });
        return Array.from(m.values());
      };

      let vistasOut = vistasBase;
      let accionesOut = accionesBase;
      const tgSel = getFieldValue(endpointIdMerge, 'tenantGlobal').trim();
      if (!tgSel || !Object.keys(ruleCatalog || {}).length) {
        return { vistasCatalogo: vistasOut, accionesCatalogo: accionesOut };
      }
      const jwtSa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
      const effectiveSa = resolveTenantSuperAdminIdForHerenciaSelect(tgSel, tenantGlobales, jwtSa);
      if (!effectiveSa) return { vistasCatalogo: vistasOut, accionesCatalogo: accionesOut };

      let reglas = findReglasPorTenantSuperAdmin(ruleCatalog, effectiveSa).sort((a: any, b: any) => {
        const pa = a?.securityPlatform === true ? 0 : a?.securityPlatform === false ? 1 : 2;
        const pb = b?.securityPlatform === true ? 0 : b?.securityPlatform === false ? 1 : 2;
        return pa - pb;
      });
      const isTsaScope = isTenantSuperAdminScopeOption(tgSel);
      if (!isTsaScope && tgSel) {
        reglas = reglas.filter((r: any) => {
          const tgRule = resolveTenantGlobalIdFromRule(r);
          if (!tgRule) return true;
          return tgRule === tgSel;
        });
      }
      if (!reglas.length) {
        const plataforma = findReglaPlataformaPorSuperAdmin(ruleCatalog, effectiveSa);
        if (plataforma) reglas = [plataforma];
      }

      const accionByIdMap = new Map(acciones.map((a) => [a.id, a]));
      const vistasExtra: Vista[] = [];
      const accionesExtra: Accion[] = [];
      for (const regla of reglas) {
        const recursoIds = (Array.isArray(regla?.recurso) ? regla.recurso : [])
          .map((v: any) => normalizePermisoRefId(v))
          .filter(Boolean);
        resolveVistaCatalogByIds(recursoIds).forEach((v) => vistasExtra.push(v));
        const accionIds = (Array.isArray(regla?.accionesUsu) ? regla.accionesUsu : [])
          .map((a: any) => normalizePermisoRefId(a))
          .filter(Boolean);
        accionIds.forEach((id: string) => {
          const fromCat = accionByIdMap.get(id);
          accionesExtra.push(
            fromCat || {
              id,
              label: String(id).slice(-8),
              method: '',
            }
          );
        });
      }
      vistasOut = mergeVistas(vistasOut, vistasExtra);
      accionesOut = mergeAccs(accionesOut, accionesExtra);
      return { vistasCatalogo: vistasOut, accionesCatalogo: accionesOut };
    };

    /** Si hay fila de «Herencia asociada», el catálogo sale de esa herencia; si no, reglas del SA/TG (techo). */
    const isPermAdminHerenciaCatalogEndpoint =
      endpointId === 'perm-admin-tenant-global' || PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpointId);

    if (isPermAdminHerenciaCatalogEndpoint) {
      const byId = herenciaAsociadaDataByEndpoint[endpointId] || {};
      const selectedHerenciaId = getFieldValue(endpointId, 'herenciaAsociada').trim();
      const row =
        (selectedHerenciaId ? byId[selectedHerenciaId] : null) ||
        (Object.keys(byId).length ? byId[Object.keys(byId)[0]] : null);

      let vistasCatalogo: Vista[] = [];
      let accionesCatalogo: Accion[] = [];

      if (row) {
        vistasCatalogo = (Array.isArray(row?.vistas) ? row.vistas : [])
          .map((v: any) => {
            const id = normalizePermisoRefId(v);
            if (!id) return null;
            return {
              id,
              label: String(v?.name || v?.path || id),
              path: String(v?.path || ''),
            };
          })
          .filter(Boolean) as Vista[];

        accionesCatalogo = (Array.isArray(row?.acciones) ? row.acciones : [])
          .map((a: any) => {
            const id = normalizePermisoRefId(a);
            if (!id) return null;
            return {
              id,
              label: String(a?.etiquetas || a?.method || id),
              method: String(a?.method || ''),
            };
          })
          .filter(Boolean) as Accion[];
      }

      const merged = mergeReglasTenantEnCatalogoPermAdmin(endpointId, vistasCatalogo, accionesCatalogo);
      if (merged.vistasCatalogo.length || merged.accionesCatalogo.length) {
        return merged;
      }

      const tenantGlobalRaw = getFieldValue(endpointId, 'tenantGlobal').trim();
      if (tenantGlobalRaw) {
        const superAdminRefForRegla = (() => {
          if (isTenantSuperAdminScopeOption(tenantGlobalRaw)) {
            return tenantGlobalRaw.slice(TENANT_SUPERADMIN_SCOPE_PREFIX.length).trim();
          }
          const tenantSel = tenantGlobales.find((t) => String(t.id) === tenantGlobalRaw);
          let sa = String(tenantSel?.tenantSuperAdmin || '').trim();
          if (!sa && tenantSel) {
            const parentId = String(tenantSel?.tenantGlobalAdmin || '').trim();
            if (parentId) {
              const padre = tenantGlobales.find((t) => t.id === parentId);
              sa = String(padre?.tenantSuperAdmin || '').trim();
            }
          }
          return sa || String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
        })();

        if (superAdminRefForRegla) {
          const seenTreeIds = new Set<string>();
          const allVistasFromTree: Vista[] = [];
          const traversePermAdminFallback = (nodes: NodoRuta[]) => {
            nodes.forEach((node) => {
              const id = String(node._id || '').trim();
              if (id && !seenTreeIds.has(id)) {
                seenTreeIds.add(id);
                allVistasFromTree.push({
                  id,
                  label: String(node.name || node.path || id),
                  path: String(node.path || ''),
                });
              }
              if (Array.isArray(node.children)) traversePermAdminFallback(node.children);
            });
          };
          traversePermAdminFallback(rutasJerarquia);
          const vistasFallback = allVistasFromTree.length ? allVistasFromTree : vistas;

          const reglaDios = findReglaPlataformaPorSuperAdmin(ruleCatalog, superAdminRefForRegla) as any;
          if (reglaDios) {
            const recursoIds = Array.isArray(reglaDios?.recurso)
              ? reglaDios.recurso.map((v: any) => String(v?._id || v || '').trim()).filter(Boolean)
              : [];
            const accionIds = Array.isArray(reglaDios?.accionesUsu)
              ? reglaDios.accionesUsu.map((a: any) => String(a?._id || a || '').trim()).filter(Boolean)
              : [];
            if (recursoIds.length) {
              const accionById = new Map(acciones.map((a) => [a.id, a]));
              const vistasDesdeRegla = resolveVistaCatalogByIds(recursoIds);
              const accionesDesdeRegla = accionIds.length
                ? accionIds.map((id: string) => accionById.get(id) || { id, label: id, method: '' })
                : acciones;
              return { vistasCatalogo: vistasDesdeRegla, accionesCatalogo: accionesDesdeRegla };
            }
          }
          return { vistasCatalogo: vistasFallback, accionesCatalogo: acciones };
        }
      }

      return { vistasCatalogo: [], accionesCatalogo: [] };
    }

    if (endpointId === 'tenant-actualizar-global-reglas') {
      const ruleId = String(ruleIdOverride || getFieldValue(endpointId, 'x-regla-id')).trim();
      if (!ruleId) {
        return { vistasCatalogo: [], accionesCatalogo: [] };
      }

      const rule = ruleCatalog[ruleId] || null;
      const delta = deltaOverride ?? deltaByEndpoint[endpointId];
      const saSel = resolveSaParaReglasGlobalesEndpoint(endpointId);
      const reglaTecho = saSel ? findReglaTechoJerarquiaSa(saSel) : null;
      const recursoFuente = [
        ...(Array.isArray(rule?.recurso) ? rule.recurso : []),
        ...(Array.isArray(delta?.reglaActual?.recurso) ? delta.reglaActual.recurso : []),
      ];
      const accionesFuente = [
        ...(Array.isArray(rule?.accionesUsu) ? rule.accionesUsu : []),
        ...(Array.isArray(delta?.reglaActual?.accionesUsu) ? delta.reglaActual.accionesUsu : []),
      ];
      const accionByIdMap = new Map<string, Accion>();
      acciones.forEach((a) => {
        accionByIdMap.set(a.id, a);
        collectGobernanzaRefIds(a).forEach((alt) => {
          if (!accionByIdMap.has(alt)) accionByIdMap.set(alt, a);
        });
      });

      const vistasDesdeReglaDoc: Vista[] = [];
      const vistaMer = new Map<string, Vista>();
      recursoFuente.forEach((v: any) => {
        const id = normalizePermisoRefId(v);
        if (!id) return;
        const fromTree = resolveVistaCatalogByIds([id])[0];
        const row =
          fromTree ||
          ({
            id,
            label: String(v?.name || v?.path || v?.label || id),
            path: String(v?.path || ''),
          } as Vista);
        if (!vistaMer.has(row.id)) vistaMer.set(row.id, row);
      });
      extractPermisoRefIds(recursoFuente).forEach((id) => {
        if (vistaMer.has(id)) return;
        const fromTree = resolveVistaCatalogByIds([id])[0];
        if (fromTree) vistaMer.set(fromTree.id, fromTree);
      });
      vistasDesdeReglaDoc.push(...vistaMer.values());

      const accionesDesdeReglaDoc: Accion[] = [];
      const accMer = new Map<string, Accion>();
      accionesFuente.forEach((a: any) => {
        const id = normalizePermisoRefId(a);
        if (!id) return;
        const fromCat = accionByIdMap.get(id);
        const labelRaw = String(a?.etiquetas || a?.method || a?.nombre || a?.label || '').trim();
        const row =
          fromCat ||
          ({
            id,
            label: labelRaw && labelRaw !== '[object Object]' ? labelRaw : id,
            method: String(a?.method || ''),
          } as Accion);
        if (!accMer.has(row.id)) accMer.set(row.id, row);
      });
      extractPermisoRefIds(accionesFuente).forEach((id) => {
        if (accMer.has(id)) return;
        const fromCat = accionByIdMap.get(id);
        if (fromCat) accMer.set(fromCat.id, fromCat);
      });
      accionesDesdeReglaDoc.push(...accMer.values());

      const counterFormIds = new Set(
        diosRecursosJerarquiaFlat.map((r) => String(r._id || '').trim()).filter(Boolean),
      );
      const idsVistasReglaHijo = new Set(vistasDesdeReglaDoc.map((v) => v.id));

      const aplicarTechoJerarquia = (result: { vistasCatalogo: Vista[]; accionesCatalogo: Accion[] }) => {
        if (consultaReglasGlobalesRamaCorporativo(endpointId)) return result;
        if (!reglaTecho) return result;
        const vistaMerTecho = new Map(result.vistasCatalogo.map((v) => [v.id, v]));
        const accMerTecho = new Map(result.accionesCatalogo.map((a) => [a.id, a]));
        (Array.isArray(reglaTecho.recurso) ? reglaTecho.recurso : []).forEach((v: any) => {
          const id = normalizePermisoRefId(v);
          if (!id || vistaMerTecho.has(id) || idsVistasReglaHijo.has(id)) return;
          if (!vistaIdEnCounterFormularioSubformulario(id, counterFormIds)) return;
          const fromTree = resolveVistaCatalogByIds([id])[0];
          const fromCounter = diosRecursosJerarquiaFlat.find(
            (r) => String(r._id || '').trim() === id || idsPermisoRefsCoinciden(r._id, id),
          );
          vistaMerTecho.set(
            id,
            fromTree ||
              ({
                id,
                label: String(
                  fromCounter?.name || v?.name || v?.path || v?.label || id,
                ),
                path: String(fromCounter?.path || v?.path || ''),
              } as Vista),
          );
        });
        (Array.isArray(reglaTecho.accionesUsu) ? reglaTecho.accionesUsu : []).forEach((a: any) => {
          const id = normalizePermisoRefId(a);
          if (!id || accMerTecho.has(id)) return;
          const fromCat = accionByIdMap.get(id);
          const labelRaw = String(a?.etiquetas || a?.method || a?.nombre || a?.label || '').trim();
          accMerTecho.set(
            id,
            fromCat ||
              ({
                id,
                label: labelRaw && labelRaw !== '[object Object]' ? labelRaw : id,
                method: String(a?.method || ''),
              } as Accion),
          );
        });
        return {
          vistasCatalogo: Array.from(vistaMerTecho.values()),
          accionesCatalogo: accMerTecho.size
            ? Array.from(accMerTecho.values())
            : result.accionesCatalogo,
        };
      };

      if (delta) {
        const vistasDelta: Vista[] = (Array.isArray(delta.vistasFaltantes) ? delta.vistasFaltantes : [])
          .map((v: any) => {
            const id = normalizePermisoRefId(v);
            return {
              id,
              label: String(v?.name || v?.path || id || ''),
              path: String(v?.path || ''),
            };
          })
          .filter(
            (v) =>
              v.id &&
              (counterFormIds.size === 0 || vistaIdEnCounterFormularioSubformulario(v.id, counterFormIds)),
          );
        const accionesDelta: Accion[] = (Array.isArray(delta.accionesFaltantes) ? delta.accionesFaltantes : [])
          .map((a: any) => {
            const id = normalizePermisoRefId(a);
            const labelRaw = String(a?.etiquetas || a?.method || a?.nombre || '').trim();
            return {
              id,
              label: labelRaw && labelRaw !== '[object Object]' ? labelRaw : id,
              method: String(a?.method || ''),
            };
          })
          .filter((a) => a.id);
        const vistaMerDelta = new Map<string, Vista>();
        vistasDesdeReglaDoc.forEach((v) => vistaMerDelta.set(v.id, v));
        vistasDelta.forEach((v) => {
          if (v.id && !vistaMerDelta.has(v.id)) vistaMerDelta.set(v.id, v);
        });
        const accMerDelta = new Map<string, Accion>();
        accionesDesdeReglaDoc.forEach((a) => accMerDelta.set(a.id, a));
        accionesDelta.forEach((a) => {
          if (a.id && !accMerDelta.has(a.id)) accMerDelta.set(a.id, a);
        });
        const vistasMerged = Array.from(vistaMerDelta.values());
        const accionesMerged = Array.from(accMerDelta.values());
        return aplicarTechoJerarquia({
          vistasCatalogo: vistasMerged,
          accionesCatalogo: accionesMerged.length ? accionesMerged : accionesDesdeReglaDoc,
        });
      }

      if (loadingDeltaByEndpoint[endpointId] && ruleId) {
        if (vistasDesdeReglaDoc.length) {
          return aplicarTechoJerarquia({
            vistasCatalogo: vistasDesdeReglaDoc,
            accionesCatalogo: accionesDesdeReglaDoc.length ? accionesDesdeReglaDoc : acciones,
          });
        }
        return { vistasCatalogo: [], accionesCatalogo: [] };
      }

      if (ruleId && (vistasDesdeReglaDoc.length || accionesDesdeReglaDoc.length)) {
        return aplicarTechoJerarquia({
          vistasCatalogo: vistasDesdeReglaDoc,
          accionesCatalogo: accionesDesdeReglaDoc.length ? accionesDesdeReglaDoc : acciones,
        });
      }

      return { vistasCatalogo: [], accionesCatalogo: [] };
    }

    if (endpointId === 'tenant-crear-global-reglas') {
      // Derivar vistas desde rutasJerarquia para incluir rutas nuevas no sincronizadas aún en `vistas`
      const seenTreeIds = new Set<string>();
      const allVistasFromTree: Vista[] = [];
      const traverseForReglas = (nodes: NodoRuta[]) => {
        nodes.forEach((node) => {
          const id = String(node._id || '').trim();
          if (id && !seenTreeIds.has(id)) {
            seenTreeIds.add(id);
            allVistasFromTree.push({ id, label: String(node.name || node.path || id), path: String(node.path || '') });
          }
          if (Array.isArray(node.children)) traverseForReglas(node.children);
        });
      };
      traverseForReglas(rutasJerarquia);
      const vistasFallback = allVistasFromTree.length ? allVistasFromTree : vistas;

      const tenantGlobalRaw = resolveTenantGlobalParaReglasEndpoint(endpointId);
      if (!tenantGlobalRaw) return { vistasCatalogo: [], accionesCatalogo: [] };

      let superAdminRef = '';
      const tenantSel = tenantGlobales.find((t) => t.id === tenantGlobalRaw);
      superAdminRef = String(tenantSel?.tenantSuperAdmin || '').trim();
      if (!superAdminRef) {
        const parentTenantId = String(tenantSel?.tenantGlobalAdmin || '').trim();
        if (parentTenantId) {
          const tenantPadre = tenantGlobales.find((t) => t.id === parentTenantId);
          superAdminRef = String(tenantPadre?.tenantSuperAdmin || '').trim();
        }
      }
      if (!superAdminRef) {
        superAdminRef = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
      }
      if (!superAdminRef) return { vistasCatalogo: vistasFallback, accionesCatalogo: acciones };

      const reglasTenant = getReglasFiltradasPorTenant(endpointId);
      if (reglasTenant.length) {
        const accionByIdMerged = new Map(acciones.map((a) => [a.id, a]));
        const vistaMer = new Map<string, Vista>();
        const accMer = new Map<string, Accion>();
        for (const opt of reglasTenant) {
          const regla = ruleCatalog[opt.id];
          if (!regla) continue;
          const recursoIds = (Array.isArray(regla?.recurso) ? regla.recurso : [])
            .map((v: any) => String(v?._id || v || '').trim())
            .filter(Boolean);
          resolveVistaCatalogByIds(recursoIds).forEach((v) => vistaMer.set(v.id, v));
          (Array.isArray(regla?.accionesUsu) ? regla.accionesUsu : [])
            .map((a: any) => String(a?._id || a || '').trim())
            .filter(Boolean)
            .forEach((id: string) => {
              accMer.set(id, accionByIdMerged.get(id) || { id, label: id, method: '' });
            });
        }
        if (vistaMer.size) {
          return {
            vistasCatalogo: Array.from(vistaMer.values()),
            accionesCatalogo: accMer.size ? Array.from(accMer.values()) : acciones,
          };
        }
      }

      const reglaDios = findReglaPlataformaPorSuperAdmin(ruleCatalog, superAdminRef) as any;

      if (!reglaDios) return { vistasCatalogo: vistasFallback, accionesCatalogo: acciones };

      const recursoIds = Array.isArray(reglaDios?.recurso)
        ? reglaDios.recurso.map((v: any) => String(v?._id || v || '').trim()).filter(Boolean)
        : [];
      const accionIds = Array.isArray(reglaDios?.accionesUsu)
        ? reglaDios.accionesUsu.map((a: any) => String(a?._id || a || '').trim()).filter(Boolean)
        : [];

      if (!recursoIds.length) return { vistasCatalogo: vistasFallback, accionesCatalogo: acciones };

      const accionById = new Map(acciones.map((a) => [a.id, a]));

      const vistasDesdeRegla = resolveVistaCatalogByIds(recursoIds);
      const accionesDesdeRegla = accionIds.length
        ? accionIds.map((id: string) => accionById.get(id) || { id, label: id, method: '' })
        : acciones;

      return {
        vistasCatalogo: vistasDesdeRegla.length ? vistasDesdeRegla : vistasFallback,
        accionesCatalogo: accionesDesdeRegla.length ? accionesDesdeRegla : acciones,
      };
    }

    if (endpointId !== 'perm-admin-tenant-global' && !PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpointId)) {
      return { vistasCatalogo: vistas, accionesCatalogo: acciones };
    }

    const tenantGlobalRaw = getFieldValue(endpointId, 'tenantGlobal').trim();
    if (!tenantGlobalRaw) return { vistasCatalogo: vistas, accionesCatalogo: acciones };

    const vistaPermitida = new Set<string>();
    const accionPermitida = new Set<string>();
    const actorTenantGlobal = String(tenantGlobalActor.tenantGlobalId || '').trim();
    const actorTenantSuper = String(tenantGlobalActor.tenantSuperAdminId || '').trim();
    let effectiveSuperAdmin = actorTenantSuper;
    if (isTenantSuperAdminScopeOption(tenantGlobalRaw)) {
      const sid = tenantGlobalRaw.slice(TENANT_SUPERADMIN_SCOPE_PREFIX.length).trim();
      if (sid) effectiveSuperAdmin = sid;
    }

    const getId = (value: any): string => String(value?._id || value || '').trim();
    const matchesSuperAdminContext = (h: any): boolean => {
      if (!effectiveSuperAdmin) return false;
      const tenantSuperH = String(h?.tenantSuperTenant?._id || h?.tenantSuperTenant || '').trim();
      return tenantSuperH === effectiveSuperAdmin;
    };
    const matchesGlobalContext = (h: any): boolean => {
      if (!actorTenantGlobal) return false;
      const tgH = getId(h?.tenantGlobal);
      return tgH === actorTenantGlobal;
    };
    const matchesTargetTenant = (h: any): boolean => {
      const tgH = getId(h?.tenantGlobal);
      return tgH === tenantGlobalRaw;
    };

    herenciasUsuario.forEach((h: any) => {
      // SUPERADMIN: acepta herencias del superadmin, priorizando las que apunten al tenantGlobal objetivo.
      // TENANTGLOBAL: solo herencias del tenantGlobal autenticado y del tenant objetivo.
      const inSuperCtx = matchesSuperAdminContext(h);
      const inGlobalCtx = matchesGlobalContext(h);
      const inTarget = matchesTargetTenant(h);
      if (!((inSuperCtx && (inTarget || !getId(h?.tenantGlobal))) || (inGlobalCtx && inTarget))) return;

      const vs = Array.isArray(h?.vistas) ? h.vistas : [];
      const ac = Array.isArray(h?.acciones) ? h.acciones : [];
      vs.forEach((v: any) => {
        const id = getId(v);
        if (id) vistaPermitida.add(id);
      });
      ac.forEach((a: any) => {
        const id = getId(a);
        if (id) accionPermitida.add(id);
      });
    });

    // Sin herencia de usuario parametrizada: mismo criterio que reglas globales — regla de plataforma del SA (efectivo).
    if (!vistaPermitida.size || !accionPermitida.size) {
      if (isPermAdminHerenciaCatalogEndpoint) {
        const superAdminRefForRegla = (() => {
          if (isTenantSuperAdminScopeOption(tenantGlobalRaw)) return effectiveSuperAdmin;
          const tenantSel = tenantGlobales.find((t) => String(t.id) === tenantGlobalRaw);
          let sa = String(tenantSel?.tenantSuperAdmin || '').trim();
          if (!sa && tenantSel) {
            const parentId = String(tenantSel?.tenantGlobalAdmin || '').trim();
            if (parentId) {
              const padre = tenantGlobales.find((t) => t.id === parentId);
              sa = String(padre?.tenantSuperAdmin || '').trim();
            }
          }
          return sa || effectiveSuperAdmin;
        })();

        if (superAdminRefForRegla) {
          const seenTreeIds = new Set<string>();
          const allVistasFromTree: Vista[] = [];
          const traversePermAdminFallback = (nodes: NodoRuta[]) => {
            nodes.forEach((node) => {
              const id = String(node._id || '').trim();
              if (id && !seenTreeIds.has(id)) {
                seenTreeIds.add(id);
                allVistasFromTree.push({ id, label: String(node.name || node.path || id), path: String(node.path || '') });
              }
              if (Array.isArray(node.children)) traversePermAdminFallback(node.children);
            });
          };
          traversePermAdminFallback(rutasJerarquia);
          const vistasFallback = allVistasFromTree.length ? allVistasFromTree : vistas;

          const reglaDios = findReglaPlataformaPorSuperAdmin(ruleCatalog, superAdminRefForRegla) as any;
          if (reglaDios) {
            const recursoIds = Array.isArray(reglaDios?.recurso)
              ? reglaDios.recurso.map((v: any) => String(v?._id || v || '').trim()).filter(Boolean)
              : [];
            const accionIds = Array.isArray(reglaDios?.accionesUsu)
              ? reglaDios.accionesUsu.map((a: any) => String(a?._id || a || '').trim()).filter(Boolean)
              : [];
            if (recursoIds.length) {
              const accionById = new Map(acciones.map((a) => [a.id, a]));
              const vistasDesdeRegla = resolveVistaCatalogByIds(recursoIds);
              const accionesDesdeRegla = accionIds.length
                ? accionIds.map((id: string) => accionById.get(id) || { id, label: id, method: '' })
                : acciones;
              return { vistasCatalogo: vistasDesdeRegla, accionesCatalogo: accionesDesdeRegla };
            }
          }
          return { vistasCatalogo: vistasFallback, accionesCatalogo: acciones };
        }
      }
      return { vistasCatalogo: [], accionesCatalogo: [] };
    }

    return {
      vistasCatalogo: vistas.filter((v) => vistaPermitida.has(v.id)),
      accionesCatalogo: acciones.filter((a) => accionPermitida.has(a.id)),
    };
  };

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

  const alinearPoliticasRuntimeSeleccionConCatalogo = (
    idsFromRule: string[],
    catalog: PoliticaRuntime[],
  ): string[] => {
    if (!idsFromRule.length || !catalog.length) return idsFromRule;
    const catalogCanon = new Map<string, string>();
    catalog.forEach((p) => {
      const pid = politicaRuntimeId(p);
      if (!pid) return;
      catalogCanon.set(pid, pid);
      collectGobernanzaRefIds(p).forEach((alt) => catalogCanon.set(alt, pid));
    });
    const out: string[] = [];
    idsFromRule.forEach((raw) => {
      const id = gobernanzaEntityId(raw).trim();
      if (!id) return;
      if (catalogCanon.has(id)) {
        const canon = catalogCanon.get(id)!;
        if (!out.includes(canon)) out.push(canon);
        return;
      }
      for (const [alt, canon] of catalogCanon) {
        if (idsPermisoRefsCoinciden(alt, id) && !out.includes(canon)) {
          out.push(canon);
          break;
        }
      }
    });
    return out;
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
      const catalogMerged = { ...ruleCatalog, ...rulesMap };
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
    ruleCatalog,
    contextos.length,
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
    console.log('[PG][effect-hydrate] ep:', ep, '| singleFormInline:', singleFormInline, '| loadingData:', loadingData, '| tenantGlobales:', tenantGlobales.length, '| saCounters:', tenantSuperAdminsJerarquiaCounters.length);
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
      console.log('[PG][effect-hydrate] reglasEndpoint=true | reglasNeedsHydrate:', reglasNeedsHydrate);
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

  const runEndpoint = async (endpoint: EndpointSpec, opts?: RunEndpointOpts) => {
    try {
      if (endpoint.id === 'tenant-actualizar-global-reglas' && actualizarReglasGlobalesSoloLectura()) {
        throw new Error(
          'Jerarquía con corporativo en tenantJerarquiaCounter: no puedes actualizar reglas desde este flujo.',
        );
      }
      setRunning((prev) => ({ ...prev, [endpoint.id]: true }));
      const ocultarJsonRunning =
        endpoint.id === 'tenant-actualizar-global-reglas' ||
        endpoint.id === 'tenant-crear-global-reglas' ||
        endpoint.id === 'tenant-crear-dios-reglas' ||
        endpoint.id === 'tenant-actualizar-dios-reglas' ||
        esEndpointAltaTenantPanel(endpoint.id);
      if (!ocultarJsonRunning) {
        setResult((prev) => ({
          ...prev,
          [endpoint.id]: JSON.stringify(
            {
              ok: true,
              status: 'running',
              endpoint: endpoint.path,
              method: endpoint.method,
              startedAt: new Date().toISOString()
            },
            null,
            2
          )
        }));
      } else {
        setResult((prev) => ({ ...prev, [endpoint.id]: '' }));
      }
      const body: Record<string, unknown> = {};
      const headers: Record<string, string> = {};
      let resolvedPath = endpoint.path;
      const diosFormSourceId =
        endpoint.id === 'tenant-actualizar-dios-reglas' && opts?.diosSyncCompleta
          ? String(opts.diosFormSourceId || 'tenant-crear-dios-reglas').trim()
          : endpoint.id;

      endpoint.fields.forEach((field) => {
        if (
          (endpoint.id === 'tenant-crear-dios-reglas' || endpoint.id === 'tenant-actualizar-dios-reglas') &&
          field.name === 'contexto'
        ) {
          const ctxEndpointId =
            endpoint.id === 'tenant-actualizar-dios-reglas' && opts?.diosSyncCompleta
              ? diosFormSourceId
              : endpoint.id;
          const selected = getFieldValue(ctxEndpointId, field.name).trim();
          if (selected) (body as Record<string, unknown>).contextoDefi = [selected];
          return;
        }
        if (field.type === 'permisos') {
          const isTenantReglasEndpoint = endpoint.id === 'tenant-crear-global-reglas' || endpoint.id === 'tenant-actualizar-global-reglas';
          if (isTenantReglasEndpoint && getBulkAllMode(endpoint.id)) {
            const { vistasCatalogo, accionesCatalogo } = getPermisosCatalog(endpoint.id);
            body[field.name] = vistasCatalogo.map((vista) => ({
              vistaId: vista.id,
              accionId: accionesCatalogo.map((a) => a.id),
            }));
          } else {
            body[field.name] = getPermisos(endpoint.id).filter((p) => p.vistaId && p.accionId.length);
          }
          return;
        }
        if (field.type === 'politicasRuntime') {
          appendPoliticasRuntimeIdsToBody(endpoint.id, body as Record<string, unknown>);
          return;
        }
        if (field.type === 'dominioDinamico') {
          return;
        }
        if (
          (endpoint.id === 'tenant-crear-dios-reglas' || endpoint.id === 'tenant-actualizar-dios-reglas') &&
          field.name === 'tenantSuperAdmin'
        ) {
          return;
        }
        if (field.name === 'contextoDefi') {
          const selected = getFieldValue(endpoint.id, field.name).trim();
          if (field.required && !selected) throw new Error(`Completa: ${field.label}`);
          body[field.name] = selected ? [selected] : [];
          return;
        }
        let raw = getFieldValue(endpoint.id, field.name);
        if (
          field.name === 'id' &&
          (
            endpoint.id === 'perm-admin-tenant-global-desactivar' ||
            endpoint.id === 'perm-admin-tenant-global-eliminar'
          )
        ) {
          raw = getFieldValue(endpoint.id, 'herenciaAsociada').trim() || raw;
        }
        const isOwnerTypeDisabledByCorporativo =
          field.name === 'ownerType' &&
          (
            endpoint.id === 'tenant-crear-global-usuario' ||
            esEndpointCreacionSaDocumento(endpoint.id) ||
            endpoint.id === 'tenant-actualizar-global'
          ) &&
          !!getFieldValue(endpoint.id, 'coporativo').trim();
        const isAccionUsuarioMulti =
          field.name === 'accionesUsu' &&
          (
            endpoint.id === 'tenant-crear-global-usuario' ||
            esEndpointCreacionSaDocumento(endpoint.id) ||
            endpoint.id === 'tenant-actualizar-global'
          );
        const selectedNvlForJwt = getFieldValue(endpoint.id, 'nvlGeneracionTenant').trim();
        const parametrosResueltosJwt = esNvl12ParametrosResueltosDesdeJwt(
          endpoint.id,
          selectedNvlForJwt,
          tenantGlobalSelects.nvlGeneracionTenant || [],
          saJerarquiaConCorporativo,
          actorEsTenantSuperAdmin(),
        );
        const skipRequiredPorJwtNvl12 =
          parametrosResueltosJwt && (field.name === 'tipo_tenant' || field.name === 'coporativo');
        const value = isAccionUsuarioMulti
          ? raw.split(',').map((v) => v.trim()).filter(Boolean)
          : field.type === 'json'
          ? parseMaybeJson(raw)
          : raw.trim();
        if (!isOwnerTypeDisabledByCorporativo && !skipRequiredPorJwtNvl12 && field.required && (value === '' || (Array.isArray(value) && !value.length))) {
          throw new Error(`Completa: ${field.label}`);
        }
        if (skipRequiredPorJwtNvl12) {
          if (field.name === 'tipo_tenant') {
            const autoTipo = String(tenantGlobalActor?.tipoTenantAutoId || value || '').trim();
            if (autoTipo) body[field.name] = autoTipo;
          }
          return;
        }
        if (field.pathParam) {
          if (value) {
            const pathSegment =
              field.type === 'id' ? gobernanzaEntityIdForPath(value) : encodeURIComponent(String(value));
            resolvedPath = resolvedPath
              .replace(`:${field.name}`, pathSegment)
              .replace(`{${field.name}}`, pathSegment);
          }
          return;
        }
        if (field.header) {
          if (value) headers[field.name] = String(value);
          return;
        }
        if (value !== '') {
          if (field.type === 'id') {
            if (Array.isArray(value)) {
              body[field.name] = value.map((v) => gobernanzaEntityId(v)).filter(Boolean);
            } else {
              body[field.name] = gobernanzaEntityId(value);
            }
          } else {
            body[field.name] = value;
          }
        }
      });

      if (endpoint.id === 'tenant-crear-dios-reglas') {
        validarAlcanceDiosRegla(endpoint.id);
        const metaById = buildDiosReglaSaMetasMap();
        const jwtSa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
        const tenantsMarcados = getDiosReglaTenantsSel(endpoint.id);
        const effectiveTenants = tenantsMarcados.length ? tenantsMarcados : jwtSa ? [jwtSa] : [];
        const alcances = buildDiosReglaAlcancesPayload(
          effectiveTenants,
          getDiosReglaUsuariosPorTenantSel(endpoint.id),
          metaById,
        );
        (body as Record<string, unknown>).alcances = alcances;
        if (alcances.length === 1) {
          (body as Record<string, unknown>).tenantSuperAdmin = alcances[0].tenantSuperAdmin;
        } else if (alcances.length > 1) {
          (body as Record<string, unknown>).tenantSuperAdmins = alcances.map((a) => a.tenantSuperAdmin);
        }
        const saDominio =
          alcances[0]?.tenantSuperAdmin || jwtSa;
        const spFromConfig = resolverSecurityPlatformDesdeTenantSa(
          saDominio,
          tenantSuperAdminsJerarquiaCounters,
          tenantGlobalSelects.nvlGeneracionTenant || [],
        );
        (body as Record<string, unknown>).securityPlatform = spFromConfig;
        const dominio = resolveDominioTenatPorSa(dominioPorSaMap, saDominio);
        if (!dominio) {
          throw new Error(
            'El tenant SuperAdmin seleccionado no tiene apisDominios parametrizado. Asigna dominio al tenant antes de guardar la regla.'
          );
        }
        (body as Record<string, unknown>).dominioTenatGlobales = dominio;
        const selAcc = diosReglaAccionesSeleccion[endpoint.id] ?? [];
        if (!selAcc.length) {
          throw new Error('Selecciona al menos una acción para la regla DIOS (catálogo de acciones).');
        }
        (body as Record<string, unknown>).accionesSeleccionadas = selAcc;
        const selRec = diosReglaRecursosSeleccion[endpoint.id] ?? [];
        if (!selRec.length) {
          throw new Error('Selecciona al menos un recurso (vista/ruta) para la regla DIOS (catálogo de recursos).');
        }
        (body as Record<string, unknown>).recursosSeleccionadas = selRec;
        appendPoliticasRuntimeIdsToBody(endpoint.id, body as Record<string, unknown>);
        if (alcances.length > 1) {
          const dominiosBatch = [
            ...new Set(
              alcances.map((a) => resolveDominioTenatPorSa(dominioPorSaMap, a.tenantSuperAdmin)),
            ),
          ].filter(Boolean);
          if (dominiosBatch.length > 1) {
            throw new Error(
              'Los tenants SuperAdmin seleccionados no comparten el mismo dominio. Elige uno solo o tenants con dominio igual.'
            );
          }
        }
      }

      if (endpoint.id === 'tenant-actualizar-dios-reglas') {
        validarAlcanceDiosRegla(diosFormSourceId);
        const metaById = buildDiosReglaSaMetasMap();
        const jwtSa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
        const tenantsMarcados = getDiosReglaTenantsSel(diosFormSourceId);
        const effectiveTenants = tenantsMarcados.length ? tenantsMarcados : jwtSa ? [jwtSa] : [];
        const alcances = buildDiosReglaAlcancesPayload(
          effectiveTenants,
          getDiosReglaUsuariosPorTenantSel(diosFormSourceId),
          metaById,
        );
        (body as Record<string, unknown>).alcances = alcances;
        if (alcances.length === 1) {
          (body as Record<string, unknown>).tenantSuperAdmin = alcances[0].tenantSuperAdmin;
        } else if (alcances.length > 1) {
          (body as Record<string, unknown>).tenantSuperAdmins = alcances.map((a) => a.tenantSuperAdmin);
        }
        const saDominioUpd =
          alcances[0]?.tenantSuperAdmin || jwtSa;
        (body as Record<string, unknown>).securityPlatform = resolverSecurityPlatformDesdeTenantSa(
          saDominioUpd,
          tenantSuperAdminsJerarquiaCounters,
          tenantGlobalSelects.nvlGeneracionTenant || [],
        );
        if (opts?.diosSyncCompleta) {
          (body as Record<string, unknown>).politicasRuntimeIds = [];
        } else {
          appendPoliticasRuntimeIdsToBody(endpoint.id, body as Record<string, unknown>);
        }
        const dominioUpd = resolveDominioTenatPorSa(dominioPorSaMap, saDominioUpd);
        if (!dominioUpd) {
          throw new Error(
            'El tenant SuperAdmin seleccionado no tiene apisDominios parametrizado. Asigna dominio al tenant antes de guardar la regla.'
          );
        }
        (body as Record<string, unknown>).dominioTenatGlobales = dominioUpd;
      }

      if (PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpoint.id)) {
        const herenciaId = getFieldValue(endpoint.id, 'herenciaAsociada').trim();
        if (!herenciaId) throw new Error('Completa: Herencia asociada');
        if (herenciaId.startsWith(REGLA_SA_SYNTH_PREFIX)) {
          throw new Error(
            'Esta opción es solo vista previa desde el catálogo de reglas. Crea o sincroniza una herencia persistida antes de actualizar (las opciones [REGLA CAT] no tienen id en base de datos).'
          );
        }
        const optsActualizar = herenciaAsociadaOptionsByEndpoint[endpoint.id] || [];
        if (optsActualizar.length > 0 && !optsActualizar.some((o) => o.id === herenciaId)) {
          setFieldValue(endpoint.id, 'herenciaAsociada', '');
          throw new Error('La herencia seleccionada ya no estÃ¡ disponible. Selecciona otra.');
        }
        const herenciaPathId = gobernanzaEntityIdForPath(herenciaId);
        resolvedPath = resolvedPath.replace(':id', herenciaPathId).replace('{id}', herenciaPathId);
        delete (body as any).herenciaAsociada;
      }
      if (
        endpoint.id === 'perm-admin-tenant-global-desactivar' ||
        endpoint.id === 'perm-admin-tenant-global-eliminar'
      ) {
        const tenantGlobalSel = getFieldValue(endpoint.id, 'tenantGlobal').trim();
        const herenciaId = getFieldValue(endpoint.id, 'herenciaAsociada').trim() || getFieldValue(endpoint.id, 'id').trim();
        if (!tenantGlobalSel) throw new Error('Selecciona tenant global');
        if (!herenciaId) throw new Error('Selecciona herencia asociada');
        const herenciaPathId = gobernanzaEntityIdForPath(herenciaId);
        resolvedPath = resolvedPath.replace(':id', herenciaPathId).replace('{id}', herenciaPathId);
        setFieldValue(endpoint.id, 'id', gobernanzaEntityId(herenciaId));
      }

      let payload: any = { method: endpoint.method, headers };
      if (endpoint.method !== 'GET' && endpoint.method !== 'DELETE') payload.body = body;

      // ── Vistas concretas: DELETE /:id o …/force → PATCH /:id/vista con vistaIds (o vistaId legacy)
      if (
        endpoint.id === 'perm-admin-tenant-global-desactivar' ||
        endpoint.id === 'perm-admin-tenant-global-eliminar'
      ) {
        const herenciaId = getFieldValue(endpoint.id, 'herenciaAsociada').trim() || getFieldValue(endpoint.id, 'id').trim();
        const desdeChecks = [...new Set((vistasDesactivarSeleccion[endpoint.id] ?? []).map((v) => String(v).trim()).filter(Boolean))];
        const legacySingle = getFieldValue(endpoint.id, 'vistaObjetivoId').trim();
        const vistaIds = desdeChecks.length ? desdeChecks : legacySingle ? [legacySingle] : [];
        if (vistaIds.length > 0 && herenciaId) {
          resolvedPath = `/api/config/permisos/creacion/admin/tenant/global/${gobernanzaEntityIdForPath(herenciaId)}/vista`;
          payload = {
            method: 'PATCH',
            headers,
            body: vistaIds.length === 1 ? { vistaId: vistaIds[0] } : { vistaIds },
          };
        }
      }

      if (endpoint.id === 'perm-usuario-tenant-global') {
        const esSA = actorEsTenantSuperAdmin();
        const esTG = actorEsTenantGlobalScope();

        if (!esSA && !esTG) {
          throw new Error('Solo tenantSuperAdmin o tenantGlobal pueden ejecutar esta operacion');
        }

        if (esTG) {
          const tenantCorporativoScope = getFieldValue(endpoint.id, 'tenantCorporativoScope').trim();
          if (!tenantCorporativoScope) throw new Error('Selecciona tenantCorporativo');
          const herenciaGlobalRef = getFieldValue(endpoint.id, 'heredaGlobal').trim();
          if (herenciaGlobalRef) body.herenciaGlobalRefId = herenciaGlobalRef;
          body.tenantCorporativoId = tenantCorporativoScope;
        } else {
          const tenantGlobalScope = getFieldValue(endpoint.id, 'tenantGlobalScope').trim();
          if (!tenantGlobalScope) throw new Error('Selecciona tenantGlobal');
          body.tenantGlobalId = tenantGlobalScope;
        }

        const { vistasCatalogo, accionesCatalogo } = getPermisosCatalog(endpoint.id);
        if (!vistasCatalogo.length) {
          throw new Error('No hay vistas disponibles para asignar');
        }

        const selected = getCatalogSelection(endpoint.id);
        const vistasBase = selected.vistas.length ? selected.vistas : vistasCatalogo.map((v) => v.id);
        const accionesBase = selected.acciones.length ? selected.acciones : accionesCatalogo.map((a) => a.id);
        const recortado = recortarSeleccionAlTechoRegla(endpoint.id, vistasBase, accionesBase);
        if (
          resolveReglaTechoPermUsuario(endpoint.id) &&
          (recortado.vistas.length !== vistasBase.length || recortado.acciones.length !== accionesBase.length)
        ) {
          throw new Error('La selección incluye vistas o acciones fuera del techo de la regla');
        }
        body.vistasSeleccionadas = recortado.vistas;
        body.accionesSeleccionadas = recortado.acciones;

        const suiteId = suiteSelByEndpoint[endpoint.id] || '';
        if (suiteId) {
          body.suiteId = suiteId;
          const suiteNodo = rutasJerarquia.find((s) => s._id === suiteId);
          if (suiteNodo) {
            const vistasSet = new Set<string>(body.vistasSeleccionadas as string[]);
            body.vistasPorModulo = getModuloNodes(suiteNodo)
              .map((modulo) => ({
                moduloId: modulo._id,
                vistas: collectFormularioLikeNodes(modulo.children || [])
                  .map((f) => String(f._id))
                  .filter((fid) => vistasSet.has(fid)),
              }))
              .filter((m) => m.vistas.length > 0);
          }
        }

        const usuariosSel = usuariosDestinoSel[endpoint.id] || [];
        if (usuariosSel.length > 1) {
          body.usuariosDestinoIds = usuariosSel;
        } else if (usuariosSel.length === 1) {
          body.usuarioDestinoId = usuariosSel[0];
        }

        const heredaGlobalRef = getFieldValue(endpoint.id, 'heredaGlobal').trim();
        if (heredaGlobalRef) {
          body.heredaGlobal = heredaGlobalRef;
          body.herenciaId = heredaGlobalRef;
        }
      }

      if (endpoint.id === 'perm-admin-tenant-global' || PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpoint.id)) {
        const tgRaw = String(body.tenantGlobal || '').trim();
        const tg = isTenantSuperAdminScopeOption(tgRaw) ? '' : tgRaw;
        const tc = String(body.tenantCorporativo || '').trim();
        if (tc && !tg) {
          throw new Error('tenantGlobal es obligatorio cuando seleccionas tenantCorporativo');
        }
        if (endpoint.id === 'perm-admin-tenant-global' && isTenantSuperAdminScopeOption(tgRaw)) {
          const scopeSa = tgRaw.slice(TENANT_SUPERADMIN_SCOPE_PREFIX.length).trim();
          if (scopeSa) (body as Record<string, unknown>).tenantSuperAdmin = scopeSa;
        }
        if (tg) {
          body.tenantGlobal = tg;
          delete (body as Record<string, unknown>).tenantSuperAdmin;
        } else delete body.tenantGlobal;

        const { vistasCatalogo, accionesCatalogo } = getPermisosCatalog(endpoint.id);
        const selected = getCatalogSelection(endpoint.id);
        const vistasBase = selected.vistas.length ? selected.vistas : vistasCatalogo.map((v) => v.id);
        const accionesBase = selected.acciones.length ? selected.acciones : accionesCatalogo.map((a) => a.id);
        const permisosGenerados = vistasBase.map((vistaId) => ({
          vistaId,
          accionId: accionesBase
        })).filter((p) => p.vistaId && p.accionId.length > 0);

        body.permisos = permisosGenerados;
        delete body.heredaGlobal;
        if (endpoint.id === 'perm-admin-tenant-global' && !permisosGenerados.length) {
          throw new Error('Debes seleccionar al menos un permiso vÃ¡lido para el tenantGlobal');
        }
      }
      if (endpoint.id === 'tenant-crear-global-reglas' || endpoint.id === 'tenant-actualizar-global-reglas') {
        const { vistasCatalogo, accionesCatalogo } = getPermisosCatalog(endpoint.id);
        const selected = getCatalogSelection(endpoint.id);
        const vistasBase = selected.vistas.length ? selected.vistas : vistasCatalogo.map((v) => v.id);
        const accionesBase = selected.acciones.length ? selected.acciones : accionesCatalogo.map((a) => a.id);
        if (endpoint.id === 'tenant-actualizar-global-reglas') {
          const saSel = resolveSaParaReglasGlobalesEndpoint(endpoint.id);
          const reglaTecho = saSel && !actualizarReglasGlobalesSoloLectura()
            ? findReglaTechoJerarquiaSa(saSel)
            : null;
          if (reglaTecho) {
            const techoVistaIds = new Set(
              (Array.isArray(reglaTecho.recurso) ? reglaTecho.recurso : [])
                .map((v: any) => normalizePermisoRefId(v))
                .filter(Boolean),
            );
            const fueraTecho = vistasBase.filter((vid) => {
              if (techoVistaIds.has(vid)) return false;
              for (const tid of techoVistaIds) {
                if (idsPermisoRefsCoinciden(tid, vid)) return false;
              }
              return true;
            });
            if (fueraTecho.length) {
              throw new Error(
                `Vista(s) no permitidas por el techo del SA padre: ${fueraTecho.slice(0, 5).join(', ')}${
                  fueraTecho.length > 5 ? '…' : ''
                }`,
              );
            }
          }
        }
        const permisosReglas = vistasBase
          .map((vistaId) => ({ vistaId, accionId: accionesBase }))
          .filter((p) => p.vistaId && p.accionId.length > 0);
        if (!permisosReglas.length) throw new Error('Debes seleccionar al menos una vista con acciones');
        body.permisos = permisosReglas;
        appendPoliticasRuntimeIdsToBody(endpoint.id, body as Record<string, unknown>);
      }
      if (endpoint.id === 'tenant-actualizar-global-reglas') {
        const tg = resolveTenantGlobalParaReglasEndpoint(endpoint.id);
        const ruleId = getFieldValue(endpoint.id, 'x-regla-id').trim();
        if (!ruleId) throw new Error('Selecciona la regla a actualizar (x-regla-id)');
        if (!tg) {
          const rule = ruleCatalog[ruleId];
          if (!rule || !reglaSinTenantGlobalMaterializado(rule)) {
            throw new Error('Selecciona tenant global dentro de tu alcance JWT');
          }
        } else {
          const rule = ruleCatalog[ruleId];
          if (rule) {
            const ruleTg = resolveTenantGlobalIdFromRule(rule);
            if (ruleTg && ruleTg !== tg) {
              throw new Error('La regla seleccionada no pertenece al tenant global elegido');
            }
          }
        }
      }
      if (
        endpoint.id === 'tenant-crear-global-usuario' ||
        esEndpointCreacionSaDocumento(endpoint.id) ||
        endpoint.id === 'tenant-actualizar-global'
      ) {
        const ownerTypeDisabled = !!String(body.coporativo || '').trim();
        if (ownerTypeDisabled) {
          delete body.ownerType;
        }
        if (endpoint.id === 'tenant-crear-global-usuario') {
          delete body.nvlGeneracionTenant;
          const esSuperAdminUsuario = Boolean(String(tenantGlobalActor?.tenantSuperAdminId || '').trim());
          if (Array.isArray(body.accionesUsu)) {
            body.accionesUsu = body.accionesUsu.map((id: unknown) => gobernanzaEntityId(id)).filter(Boolean);
          }
          for (const key of ['coporativo', 'tenantGlobalRef', 'apisDominios', 'rolesMabs'] as const) {
            if (body[key]) body[key] = gobernanzaEntityId(body[key]);
          }
          if (!esSuperAdminUsuario && 'tenantGlobalRef' in body) {
            const autoRef = String(tenantGlobalActor?.tenantGlobalId || '').trim();
            if (autoRef) body.tenantGlobalRef = gobernanzaEntityId(autoRef);
          }
        }
        if (esEndpointCreacionSaDocumento(endpoint.id) || endpoint.id === 'tenant-actualizar-global') {
          if (Array.isArray(body.accionesUsu)) {
            body.accionesUsu = body.accionesUsu.map((id: unknown) => gobernanzaEntityId(id)).filter(Boolean);
          }
          for (const key of [
            'nvlGeneracionTenant',
            'tipo_tenant',
            'coporativo',
            'apisDominios',
            'rolesMabs',
            'ownerType',
            'tenantGlobalRef',
          ] as const) {
            if (body[key]) body[key] = gobernanzaEntityId(body[key]);
          }
          const selectedNvlId = String(body.nvlGeneracionTenant || '').trim();
          const selectedNvlOptRun = (tenantGlobalSelects.nvlGeneracionTenant || []).find((opt) => opt.id === selectedNvlId);
          const selectedNvlLabel = selectedNvlOptRun?.label || '';
          const runMeta = (selectedNvlOptRun as GenericSelectOption & { meta?: Record<string, string> })?.meta;
          const nvlRun = resolverNvlGeneracionMeta(selectedNvlOptRun);
          const nvlMetaEsCeroRun = nvlRun.esLibre;
          const nvlEsLibre = nvlRun.esLibre;
          const nvlPermiteCorporativo =
            nvlRun.esTenantGlobal || nvlRun.esTenantCorporativo;
          const nvlEsTenantCorporativo = nvlRun.esTenantCorporativo;
          const esSuperAdmin = Boolean(String(tenantGlobalActor?.tenantSuperAdminId || '').trim());
          const esTenantGlobal = Boolean(String(tenantGlobalActor?.tenantGlobalId || '').trim()) && !esSuperAdmin;
          if (
            esSuperAdmin &&
            saJerarquiaConCorporativo &&
            nvlPermiteCorporativo &&
            !String(body.tipo_tenant || '').trim()
          ) {
            const autoTipo = String(tenantGlobalActor?.tipoTenantAutoId || '').trim();
            if (autoTipo) body.tipo_tenant = gobernanzaEntityId(autoTipo);
          }
          if (
            esSuperAdmin &&
            saJerarquiaConCorporativo &&
            nvlPermiteCorporativo &&
            !String(body.coporativo || '').trim()
          ) {
            const autoCorp =
              String(tenantGlobalActor?.corporativoJerarquiaAutoId || '').trim() ||
              (tenantGlobalSelects.coporativo?.length === 1
                ? String(tenantGlobalSelects.coporativo[0]?.id || '').trim()
                : '');
            if (autoCorp) body.coporativo = gobernanzaEntityId(autoCorp);
          }
          if (esTenantGlobal && nvlEsLibre && String(body.coporativo || '').trim()) {
            throw new Error(
              'NVL 0 / LIBRE con scope solo tenantGlobal: no envíes corporativo aquí; jerarquía sin tenantSuperAdmin en JWT se valida por otro flujo (código de jerarquía).',
            );
          }
          if (esTenantGlobal && !nvlEsLibre && nvlPermiteCorporativo && !String(body.coporativo || '').trim()) {
            throw new Error('Completa: Corporativo (empresa)');
          }
          if (
            esSuperAdmin &&
            !saJerarquiaConCorporativo &&
            !nvlEsLibre &&
            nvlPermiteCorporativo &&
            !String(body.coporativo || '').trim()
          ) {
            throw new Error('Selecciona corporativo (empresa) para NVL 1 o NVL 2');
          }
          if (!nvlEsTenantCorporativo && 'tenantGlobalRef' in body) {
            delete body.tenantGlobalRef;
          }
          if (esTenantGlobal && nvlEsTenantCorporativo) {
            const autoRef = String(tenantGlobalActor?.tenantGlobalId || '').trim();
            if (autoRef) {
              body.tenantGlobalRef = gobernanzaEntityId(autoRef);
            }
          }
          const refsDisponibles = tenantGlobalSelects.tenantGlobalRef || [];
          const debeExigirTenantGlobalRef = nvlEsTenantCorporativo && refsDisponibles.length > 0;
          if (debeExigirTenantGlobalRef && !String(body.tenantGlobalRef || '').trim()) {
            throw new Error('Completa: Tenant global ref');
          }
        }
      }

      if (endpoint.id === 'perm-listar-herencias') {
        const esSuperAdmin = Boolean(String(tenantGlobalActor?.tenantSuperAdminId || '').trim());
        const esTenantGlobal = Boolean(String(tenantGlobalActor?.tenantGlobalId || '').trim()) && !esSuperAdmin;
        const esTenantCorporativo = Boolean(String(tenantGlobalActor?.tenantCorporativoId || '').trim()) && !esSuperAdmin;
        const qs = new URLSearchParams();
        if (esTenantGlobal) {
          qs.set('soloMios', 'true');
        } else if (esTenantCorporativo) {
          qs.set('soloMios', 'true');
        } else if (esSuperAdmin) {
          qs.set('soloMios', 'false');
        }
        const tenantGlobalRaw = getFieldValue(endpoint.id, 'tenantGlobal').trim();
        if (isTenantSuperAdminScopeOption(tenantGlobalRaw)) {
          const saPick = tenantGlobalRaw.slice(TENANT_SUPERADMIN_SCOPE_PREFIX.length).trim();
          if (saPick) qs.set('tenantSuperTenant', toMongoIdQueryParam(saPick));
        } else if (tenantGlobalRaw) {
          qs.set('tenantGlobal', tenantGlobalRaw);
        }
        const tenantCorporativoSel = getFieldValue(endpoint.id, 'tenantCorporativo').trim();
        if (tenantCorporativoSel) qs.set('tenantCorporativo', tenantCorporativoSel);
        if (qs.toString()) {
          resolvedPath = `${resolvedPath}${resolvedPath.includes('?') ? '&' : '?'}${qs.toString()}`;
        }
      }
      if (endpoint.id === 'perm-admin-tenant-global-listar') {
        const qs = new URLSearchParams();
        const tenantGlobalRaw = getFieldValue(endpoint.id, 'tenantGlobal').trim();
        const tenantGlobalSel = isTenantSuperAdminScopeOption(tenantGlobalRaw) ? '' : tenantGlobalRaw;
        const tenantCorporativoSel = getFieldValue(endpoint.id, 'tenantCorporativo').trim();
        if (tenantGlobalSel) qs.set('tenantGlobal', tenantGlobalSel);
        if (tenantCorporativoSel) qs.set('tenantCorporativo', tenantCorporativoSel);
        if (qs.toString()) {
          resolvedPath = `${resolvedPath}${resolvedPath.includes('?') ? '&' : '?'}${qs.toString()}`;
        }
      }

      if (endpoint.id === 'tenant-crear-global-reglas') {
        const tgRaw = String(body.tenantGlobal ?? '').trim();
        if (isTenantSuperAdminScopeOption(tgRaw)) {
          throw new Error(
            'Para crear la regla elige un tenant global destino (ID real). La opción «tenantSuperAdmin (DIOS)» solo sirve para cargar vistas desde la regla DIOS; el API exige tenantGlobal MongoId.'
          );
        }
      }

      if (TENANT_SUPERADMIN_INSERT_ENDPOINT_ID_SET.has(endpoint.id)) {
        if ('parametrizarTenantSuperAdmin' in body) {
          const parsed = parseGobernanzaBooleanField(body.parametrizarTenantSuperAdmin);
          if (parsed === undefined) delete body.parametrizarTenantSuperAdmin;
          else body.parametrizarTenantSuperAdmin = parsed;
        }
        if ('canReferir' in body) {
          const parsed = parseGobernanzaBooleanField(body.canReferir);
          if (parsed === undefined) delete body.canReferir;
          else body.canReferir = parsed;
        }
        if (endpoint.id === 'tenant-superadmin-insert-rol-admin') {
          delete body.tenantGlobal;
          delete body.tenantCorporativo;
        }
        if (endpoint.id === 'tenant-superadmin-insert-rol-tenant' || endpoint.id === 'tenant-superadmin-insert-rol-admin') {
          const rol = String(body.rol || '').trim().toUpperCase();
          if (rol) body.rol = rol;
        }
      }

      payload = normalizeGobernanzaRequestPayloadIds(payload);
      const hasToken = typeof window !== 'undefined' && Boolean(localStorage.getItem('token'));
      const optionalAuth = TENANT_SUPERADMIN_INSERT_OPTIONAL_AUTH_IDS.has(endpoint.id);
      const response = await apiFetch(resolvedPath, {
        ...payload,
        ...(optionalAuth ? { useAuth: hasToken, logoutOn401: hasToken } : {}),
      });
      setResultData((prev) => ({ ...prev, [endpoint.id]: response }));
      if (opts?.diosSyncCompleta && endpoint.id === 'tenant-actualizar-dios-reglas') {
        setResult((prev) => ({ ...prev, [endpoint.id]: '' }));
        setReglasPoliticasRuntimeSel((prev) => ({ ...prev, [diosFormSourceId]: [] }));
        const jwtSaSync = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
        const selectedSaSync =
          getDiosReglaTenantsSel(diosFormSourceId)[0] ||
          getFieldValue(diosFormSourceId, 'tenantSuperAdmin').trim() ||
          jwtSaSync;
        aplicarSecurityPlatformDesdeSaDiosRegla(diosFormSourceId, selectedSaSync);
        const operacion = String((response as { operacion?: string })?.operacion || '').trim();
        toast.success(
          operacion === 'creada'
            ? 'Regla DIOS creada y sincronizada con todas las vistas activas (securityPlatform desde config NVL del tenant).'
            : 'Regla DIOS sincronizada con todas las vistas activas (securityPlatform desde config NVL del tenant).',
        );
      } else if (endpoint.id === 'tenant-crear-dios-reglas') {
        setResult((prev) => ({ ...prev, [endpoint.id]: '' }));
        const msg = String(response?.msg || '').trim() || 'Regla DIOS creada correctamente.';
        toast.success(msg);
      } else if (
        endpoint.id === 'tenant-actualizar-global-reglas' ||
        endpoint.id === 'tenant-crear-global-reglas'
      ) {
        setResult((prev) => ({ ...prev, [endpoint.id]: '' }));
        toast.success(
          endpoint.id === 'tenant-actualizar-global-reglas'
            ? String(response?.msg || 'Regla actualizada correctamente.')
            : String(response?.msg || `${endpoint.title} ejecutado`),
        );
      } else if (esEndpointAltaTenantPanel(endpoint.id)) {
        setResult((prev) => ({ ...prev, [endpoint.id]: '' }));
        const res = response as {
          msg?: string;
          transaccionResumen?: TransaccionResumen;
          data?: Record<string, unknown>;
          codigoJerarquia?: string;
        };
        if (res.transaccionResumen) {
          toastTransaccionDesdePayload(res.transaccionResumen, res.msg || `${endpoint.title} ejecutado`);
        } else {
          const payload =
            res.data && typeof res.data === 'object' ? res.data : (response as Record<string, unknown>);
          const codigo = String(payload?.codigoJerarquia || '').trim();
          const msg = String(res.msg || '').trim() || `${endpoint.title} ejecutado`;
          toast.success(codigo ? `${msg} · ${codigo}` : msg);
        }
      } else if (response?.transaccionResumen) {
        if (
          endpoint.id === 'perm-admin-tenant-global' ||
          PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpoint.id) ||
          endpoint.id === 'perm-admin-tenant-global-desactivar' ||
          endpoint.id === 'perm-admin-tenant-global-eliminar' ||
          endpoint.id === 'perm-usuario-tenant-global'
        ) {
          setResult((prev) => ({ ...prev, [endpoint.id]: '' }));
        }
        toastTransaccionDesdePayload(response.transaccionResumen, `${endpoint.title} ejecutado`);
      } else if (
        endpoint.id === 'perm-admin-tenant-global' ||
        PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpoint.id) ||
        endpoint.id === 'perm-admin-tenant-global-desactivar' ||
        endpoint.id === 'perm-admin-tenant-global-eliminar' ||
        endpoint.id === 'perm-usuario-tenant-global'
      ) {
        setResult((prev) => ({ ...prev, [endpoint.id]: '' }));
        toast.success(`${endpoint.title} ejecutado`);
      } else {
        const serialized =
          response === undefined
            ? JSON.stringify({ ok: true, note: 'Sin cuerpo en respuesta' }, null, 2)
            : JSON.stringify(response, null, 2);
        setResult((prev) => ({ ...prev, [endpoint.id]: serialized }));
        if (endpoint.id !== 'tenant-actualizar-global-reglas') {
          toast.success(`${endpoint.title} ejecutado`);
        }
      }
      if (
        endpoint.id === 'perm-admin-tenant-global-desactivar' ||
        endpoint.id === 'perm-admin-tenant-global-eliminar'
      ) {
        setVistasDesactivarSeleccion((prev) => {
          const next = { ...prev };
          delete next[endpoint.id];
          return next;
        });
      }
      if (typeof window !== 'undefined' && endpoint.method !== 'GET') {
        if (
          endpoint.id === 'perm-admin-tenant-global' ||
          PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpoint.id) ||
          endpoint.id === 'perm-usuario-tenant-global'
        ) {
          window.dispatchEvent(new CustomEvent('user-menu-tags-updated'));
          window.dispatchEvent(new CustomEvent('admin-routes-updated'));
        }
      }
      if (endpoint.method !== 'GET') {
        try {
          await hydrateData({ force: true });
        } catch (hydrateErr: any) {
          console.error('hydrateData tras mutación:', hydrateErr);
          toast.warning(
            'Operación guardada; no se pudieron actualizar los listados automáticamente. Pulsa «Recargar datos API».'
          );
        }
      }
    } catch (error: any) {
      const msg = error?.message || 'Error al ejecutar endpoint';
      setResultData((prev) => ({ ...prev, [endpoint.id]: null }));
      const ocultarJsonError =
        endpoint.id === 'tenant-actualizar-global-reglas' ||
        endpoint.id === 'tenant-crear-global-reglas' ||
        endpoint.id === 'tenant-crear-dios-reglas' ||
        endpoint.id === 'tenant-actualizar-dios-reglas' ||
        esEndpointAltaTenantPanel(endpoint.id);
      setResult((prev) => ({
        ...prev,
        [endpoint.id]: ocultarJsonError ? '' : JSON.stringify({ ok: false, error: msg }, null, 2),
      }));
      toastErrorConTransaccion(error, msg);
    } finally {
      setRunning((prev) => ({ ...prev, [endpoint.id]: false }));
    }
  };

  const renderReglasTable = () => {
    const rows = pickArray(resultData['tenant-listar-reglas'], ['data', 'items', 'reglas']);
    if (!rows.length) {
      return <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-muted/50 p-3 text-xs text-foreground">{result['tenant-listar-reglas'] || 'Aun sin respuesta'}</pre>;
    }

    const resolveRuleUserLabel = (row: any): string => {
      const tenant = Array.isArray(row?.generacionGlovallNvlRoles) ? row.generacionGlovallNvlRoles[0] : null;
      const usuarioRol = tenant?.rolesMabs?.usuarioId;
      return String(
        usuarioRol?.nombre ||
        usuarioRol?.name ||
        usuarioRol?.correo ||
        usuarioRol?.email ||
        '-'
      ).trim() || '-';
    };

    const q = reglasSearch.trim().toLowerCase();
    const tenantFilter = reglasTenantFilter.trim();
    const tenantOptions = Array.from(
      new Map(
        rows
          .map((row: any) => {
            const tenant = Array.isArray(row?.generacionGlovallNvlRoles) ? row.generacionGlovallNvlRoles[0] : null;
            const tenantId = gobernanzaEntityId(tenant?._id ?? tenant);
            if (!tenantId) return null;
            const corp = tenant?.coporativo;
            const tenantLabel = String(
              resolveRuleUserLabel(row) !== '-' ? resolveRuleUserLabel(row) : (
                corp?.razon_social ||
                corp?.titulo ||
                tenantId ||
                '-'
              )
            ).trim();
            return [tenantId, { id: tenantId, label: tenantLabel }] as const;
          })
          .filter((entry): entry is readonly [string, { id: string; label: string }] => Boolean(entry))
      ).values()
    );

    const filteredRows = rows.filter((row: any) => {
      const tenant = Array.isArray(row?.generacionGlovallNvlRoles) ? row.generacionGlovallNvlRoles[0] : null;
      const tenantId = String(tenant?._id || tenant || '').trim();
      if (tenantFilter && tenantId !== tenantFilter) return false;
      if (!q) return true;
      const corp = tenant?.coporativo;
      const userLabel = resolveRuleUserLabel(row).toLowerCase();
      const contexto = Array.isArray(row?.contextoDefi) ? row.contextoDefi.map((c: any) => c?.contexto || c?._id || c).join(', ').toLowerCase() : '';
      const vistas = Array.isArray(row?.recurso) ? row.recurso.map((v: any) => v?.name || v?.path || v?._id || v).join(', ').toLowerCase() : '';
      const acciones = Array.isArray(row?.accionesUsu) ? row.accionesUsu.map((a: any) => a?.etiquetas || a?.method || a?._id || a).join(', ').toLowerCase() : '';
      const corpLabel = String(corp?.razon_social || corp?.titulo || '').toLowerCase();
      const dominio = String(row?.dominioTenatGlobales || '').toLowerCase();
      const tipo = String(row?.securityPlatform === true ? 'DIOS' : 'TENANT').toLowerCase();

      return [userLabel, contexto, vistas, acciones, corpLabel, dominio, tipo].some((value) => value.includes(q));
    });

    return (
      <div className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              value={reglasSearch}
              onChange={(e) => setReglasSearch(e.target.value)}
              placeholder="Buscar regla por usuario, contexto, corporativo, vista o accion"
              className="md:w-[420px]"
            />
            <select
              className="h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground md:w-[320px]"
              value={reglasTenantFilter}
              onChange={(e) => setReglasTenantFilter(e.target.value)}
            >
              <option value="">Todos los tenants</option>
              {tenantOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted-foreground">Resultados: {filteredRows.length}</p>
        </div>
        <div className="overflow-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[980px] text-left text-xs">
          <thead className="bg-muted text-foreground">
            <tr>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Dominio</th>
              <th className="px-3 py-2">Usuario</th>
              <th className="px-3 py-2">Corporativo</th>
              <th className="px-3 py-2">Contexto</th>
              <th className="px-3 py-2">Vistas</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row: any, idx: number) => {
              const reglaId = resolveReglaPublicId(row);
              const tenant = Array.isArray(row?.generacionGlovallNvlRoles) ? row.generacionGlovallNvlRoles[0] : null;
              const corp = tenant?.coporativo;
              const userLabel = resolveRuleUserLabel(row);
              const contexto = Array.isArray(row?.contextoDefi) ? row.contextoDefi.map((c: any) => c?.contexto || c?._id || c).join(', ') : '-';
              const vistas = Array.isArray(row?.recurso) ? row.recurso.map((v: any) => v?.name || v?.path || v?._id || v).join(', ') : '-';
              const acciones = Array.isArray(row?.accionesUsu) ? row.accionesUsu.map((a: any) => a?.etiquetas || a?.method || a?._id || a).join(', ') : '-';
              return (
                <tr key={reglaId || idx} className="border-t border-border/80">
                  <td className="px-3 py-2">{row?.securityPlatform === true ? 'DIOS' : 'TENANT'}</td>
                  <td className="px-3 py-2">{row?.dominioTenatGlobales || '-'}</td>
                  <td className="px-3 py-2">{userLabel}</td>
                  <td className="px-3 py-2">{corp?.razon_social || corp?.titulo || '-'}</td>
                  <td className="px-3 py-2">{contexto || '-'}</td>
                  <td className="px-3 py-2">{vistas || '-'}</td>
                  <td className="px-3 py-2">{acciones || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>
    );
  };

  const renderActualizarReglaDiosResultado = () => {
    const raw = resultData['tenant-actualizar-dios-reglas'] as any;
    const payload = raw?.data ? raw.data : raw;
    const sync = payload?.sincronizacion;
    const regla = payload?.regla;
    const respuestaMsg = typeof raw?.msg === 'string' ? raw.msg : '';

    if (!sync) {
      return <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-muted/50 p-3 text-xs text-foreground">{result['tenant-actualizar-dios-reglas'] || 'Aun sin respuesta'}</pre>;
    }

    const vistasFaltantes = Array.isArray(sync?.vistasFaltantes) ? sync.vistasFaltantes : [];
    const accionesFaltantes = Array.isArray(sync?.accionesFaltantes) ? sync.accionesFaltantes : [];
    const vistasRegla = Array.isArray(regla?.recurso) ? regla.recurso : [];
    const accionesRegla = Array.isArray(regla?.accionesUsu) ? regla.accionesUsu : [];

    return (
      <div className="space-y-3">
        {respuestaMsg ? (
          <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">{respuestaMsg}</div>
        ) : null}
        <div className="grid gap-2 text-xs md:grid-cols-2">
          <div className="rounded border border-emerald-200 bg-emerald-50 p-2">
            Vistas faltantes detectadas: <span className="font-semibold">{Number(sync?.vistasFaltantesTotal || 0)}</span>
          </div>
          <div className="rounded border border-emerald-200 bg-emerald-50 p-2">
            Acciones faltantes detectadas: <span className="font-semibold">{Number(sync?.accionesFaltantesTotal || 0)}</span>
          </div>
          <div className="rounded border border-border bg-muted/50 p-2">
            Vistas extra detectadas: <span className="font-semibold">{Number(sync?.vistasExtraTotal || 0)}</span>
          </div>
          <div className="rounded border border-border bg-muted/50 p-2">
            Acciones extra detectadas: <span className="font-semibold">{Number(sync?.accionesExtraTotal || 0)}</span>
          </div>
        </div>

        <div className="overflow-auto rounded-lg border border-border bg-card">
          <div className="border-b border-border bg-muted/50 px-3 py-2 text-xs font-semibold text-foreground">
            DataTable - Vistas faltantes detectadas
          </div>
          {!vistasFaltantes.length ? (
            <p className="p-3 text-xs text-muted-foreground">No hay vistas faltantes.</p>
          ) : (
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-muted text-foreground">
                <tr>
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Path</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {vistasFaltantes.map((v: any, idx: number) => (
                  <tr key={String(v?.id || idx)} className="border-t border-border/80">
                    <td className="px-3 py-2 font-mono">{String(v?.id || '-')}</td>
                    <td className="px-3 py-2">{String(v?.name || 'Vista')}</td>
                    <td className="px-3 py-2">{String(v?.path || '-')}</td>
                    <td className="px-3 py-2">{v?.estadoRuta ? 'Activa' : 'Inactiva'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="overflow-auto rounded-lg border border-border bg-card">
          <div className="border-b border-border bg-muted/50 px-3 py-2 text-xs font-semibold text-foreground">
            DataTable - Acciones faltantes detectadas
          </div>
          {!accionesFaltantes.length ? (
            <p className="p-3 text-xs text-muted-foreground">No hay acciones faltantes.</p>
          ) : (
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-muted text-foreground">
                <tr>
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Etiqueta</th>
                  <th className="px-3 py-2">Metodo</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {accionesFaltantes.map((a: any, idx: number) => (
                  <tr key={String(a?.id || idx)} className="border-t border-border/80">
                    <td className="px-3 py-2 font-mono">{String(a?.id || '-')}</td>
                    <td className="px-3 py-2">{String(a?.etiquetas || '-')}</td>
                    <td className="px-3 py-2">{String(a?.method || '-')}</td>
                    <td className="px-3 py-2">{a?.estadoAccion ? 'Activa' : 'Inactiva'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="overflow-auto rounded-lg border border-border bg-card">
          <div className="border-b border-border bg-muted/50 px-3 py-2 text-xs font-semibold text-foreground">
            Regla plataforma tras sincronizar (vistas y acciones en regla)
          </div>
          <div className="grid gap-3 p-3 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold text-foreground">Vistas en regla ({vistasRegla.length})</p>
              <div className="max-h-36 overflow-auto rounded border border-border">
                <table className="w-full min-w-[320px] text-left text-xs">
                  <thead className="bg-muted text-foreground">
                    <tr>
                      <th className="px-2 py-1.5">Nombre</th>
                      <th className="px-2 py-1.5">Path</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vistasRegla.map((v: any, idx: number) => (
                      <tr key={String(v?._id || idx)} className="border-t border-border/80">
                        <td className="px-2 py-1.5">{String(v?.name || v?._id || '-')}</td>
                        <td className="px-2 py-1.5">{String(v?.path || '-')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-foreground">Acciones en regla ({accionesRegla.length})</p>
              <div className="max-h-36 overflow-auto rounded border border-border">
                <table className="w-full min-w-[320px] text-left text-xs">
                  <thead className="bg-muted text-foreground">
                    <tr>
                      <th className="px-2 py-1.5">Etiqueta</th>
                      <th className="px-2 py-1.5">Metodo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accionesRegla.map((a: any, idx: number) => (
                      <tr key={String(a?._id || idx)} className="border-t border-border/80">
                        <td className="px-2 py-1.5">{String(a?.etiquetas || a?._id || '-')}</td>
                        <td className="px-2 py-1.5">{String(a?.method || '-')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-muted/50 p-3 text-xs text-foreground">
          {JSON.stringify(raw, null, 2)}
        </pre>
      </div>
    );
  };

  const renderHerenciasAdminTable = () => {
    const raw = resultData['perm-admin-tenant-global-listar'] as any;
    const grupos = Array.isArray(raw?.grupos) ? raw.grupos : [];
    const rows = pickArray(raw, ['data', 'items', 'herencias']);
    const rowsFromGrupos = grupos.flatMap((g: any) => (Array.isArray(g?.items) ? g.items : []));
    const dataRows = rows.length ? rows : rowsFromGrupos;
    const formatDate = (value: any): string => {
      const txt = String(value || '').trim();
      if (!txt) return '-';
      const date = new Date(txt);
      if (Number.isNaN(date.getTime())) return txt;
      return date.toLocaleString();
    };
    if (!dataRows.length) {
      return <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-muted/50 p-3 text-xs text-foreground">{result['perm-admin-tenant-global-listar'] || 'Aun sin respuesta'}</pre>;
    }

    return (
      <div className="overflow-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[1400px] text-left text-xs">
          <thead className="bg-muted text-foreground">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Rol</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Tenant Global</th>
              <th className="px-3 py-2">Tenant Corporativo</th>
              <th className="px-3 py-2">Usuario</th>
              <th className="px-3 py-2">Vistas</th>
              <th className="px-3 py-2">Acciones</th>
              <th className="px-3 py-2">Fecha asignaciÃ³n</th>
              <th className="px-3 py-2">Creado</th>
              <th className="px-3 py-2">Actualizado</th>
              <th className="px-3 py-2">Fuente</th>
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row: any, idx: number) => {
              const vistasArr = Array.isArray(row?.vistas) ? row.vistas : [];
              const accionesArr = Array.isArray(row?.acciones) ? row.acciones : [];
              const vistasPreview = vistasArr
                .slice(0, 2)
                .map((v: any) => String(v?.name || v?.path || v?._id || '').trim())
                .filter(Boolean)
                .join(', ');
              const accionesPreview = accionesArr
                .slice(0, 3)
                .map((a: any) => String(a?.etiquetas || a?.method || a?._id || '').trim())
                .filter(Boolean)
                .join(', ');
              return (
              <tr key={String(row?._id || row?.iud || idx)} className="border-t border-border/80">
                <td className="px-3 py-2 font-mono">{String(row?._id || row?.iud || '-')}</td>
                <td className="px-3 py-2">{String(row?.rolId?.rol || row?.rol || '-')}</td>
                <td className="px-3 py-2">{row?.estado === false ? 'Inactivo' : 'Activo'}</td>
                <td className="px-3 py-2">{String(row?.tenantGlobal?._id || row?.tenantGlobal || '-')}</td>
                <td className="px-3 py-2">{String(row?.tenantCorporativo?._id || row?.tenantCorporativo || '-')}</td>
                <td className="px-3 py-2">{String(row?.usuarioId?.nombre || row?.usuarioId?.name || row?.usuarioId?._id || row?.usuarioId || '-')}</td>
                <td className="px-3 py-2">{vistasArr.length}{vistasPreview ? ` | ${vistasPreview}` : ''}</td>
                <td className="px-3 py-2">{accionesArr.length}{accionesPreview ? ` | ${accionesPreview}` : ''}</td>
                <td className="px-3 py-2">{formatDate(row?.fechaAsignacion)}</td>
                <td className="px-3 py-2">{formatDate(row?.createdAt)}</td>
                <td className="px-3 py-2">{formatDate(row?.updatedAt)}</td>
                <td className="px-3 py-2">{String(row?.fuenteHerencia || 'tenantGlobal')}</td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTenantLibresTable = (endpointId: string) => {
    const rows = pickArray(resultData[endpointId], ['data', 'items', 'tenants']);
    if (!rows.length) {
      return <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-muted/50 p-3 text-xs text-foreground">{result[endpointId] || 'Aun sin respuesta'}</pre>;
    }

    return (
      <div className="overflow-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[920px] text-left text-xs">
          <thead className="bg-muted text-foreground">
            <tr>
              <th className="px-3 py-2">ID tenantSuperAdmin</th>
              <th className="px-3 py-2">Código / rol</th>
              <th className="px-3 py-2">Corporativo</th>
              <th className="px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, idx: number) => (
              <tr key={String(row?._id || row?.iud || idx)} className="border-t border-border/80">
                <td className="px-3 py-2 font-mono">{String(row?._id || row?.iud || '-')}</td>
                <td className="px-3 py-2">
                  {(() => {
                    const codigo = String(row?.codigoJerarquia || '').trim();
                    const id = String(row?._id || row?.iud || '').trim();
                    const rolDirecto = String(
                      row?.rolNombre ||
                      row?.nombre ||
                      row?.rolesMabs?.rol ||
                      (Array.isArray(row?.rolesMabs) ? row.rolesMabs[0]?.rol : '') ||
                      (row?.rolesMabs && typeof row.rolesMabs === 'object' && !Array.isArray(row.rolesMabs)
                        ? (row.rolesMabs as { rol?: string }).rol
                        : '') ||
                      row?.name ||
                      row?.titulo ||
                      ''
                    ).trim();
                    if (codigo && rolDirecto) return `${codigo} · ${rolDirecto}`;
                    if (codigo) return codigo;
                    if (rolDirecto) return rolDirecto;

                    const tenantCtx = tenantGlobales.find((t) => t.id === id);
                    const labelCtx = String(tenantCtx?.label || '').trim();
                    if (labelCtx.includes('|')) {
                      return labelCtx.split('|')[0].trim() || '-';
                    }
                    return labelCtx || '-';
                  })()}
                </td>
                <td className="px-3 py-2">{pickTenantCorporate(row)}</td>
                <td className="px-3 py-2">{row?.estado === false ? 'Inactivo' : 'Activo'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderHerenciasUsuarioTable = () => {
    const raw = resultData['perm-listar-herencias'] as any;
    let rows = pickArray(raw, ['herencias', 'data', 'items']);
    const herenciaListarId = getFieldValue('perm-listar-herencias', 'herenciaAsociada').trim();
    if (herenciaListarId) {
      rows = rows.filter((row: any) => String(row?._id || row?.iud || '').trim() === herenciaListarId);
    }
    const gruposRaw = Array.isArray(raw?.grupos) ? raw.grupos : [];

    const grupos = gruposRaw.length && !herenciaListarId
      ? gruposRaw
      : Object.values(
          rows.reduce((acc: Record<string, any>, row: any) => {
            const userId = String(row?.usuarioId?._id || row?.usuarioId || 'SIN_USUARIO').trim();
            const userLabel = String(
              row?.usuarioId?.nombre ||
              row?.usuarioId?.name ||
              row?.usuarioId?.correo ||
              row?.usuarioId?.email ||
              userId
            );
            if (!acc[userId]) {
              acc[userId] = {
                usuarioId: userId === 'SIN_USUARIO' ? null : userId,
                usuario: userLabel,
                totalHerencias: 0,
                tenantGlobales: [] as string[],
                tenantCorporativos: [] as string[],
                vistasPromedio: 0,
                accionesPromedio: 0,
                _vistasTotal: 0,
                _accionesTotal: 0,
                items: [] as any[],
              };
            }
            const tg = String(row?.tenantGlobal?._id || row?.tenantGlobal || '').trim();
            const tc = String(row?.tenantCorporativo?._id || row?.tenantCorporativo || '').trim();
            if (tg && !acc[userId].tenantGlobales.includes(tg)) acc[userId].tenantGlobales.push(tg);
            if (tc && !acc[userId].tenantCorporativos.includes(tc)) acc[userId].tenantCorporativos.push(tc);
            acc[userId].totalHerencias += 1;
            acc[userId]._vistasTotal += Array.isArray(row?.vistas) ? row.vistas.length : 0;
            acc[userId]._accionesTotal += Array.isArray(row?.acciones) ? row.acciones.length : 0;
            acc[userId].items.push(row);
            return acc;
          }, {})
        ).map((g: any) => ({
          ...g,
          vistasPromedio: Number(((g._vistasTotal || 0) / (g.totalHerencias || 1)).toFixed(2)),
          accionesPromedio: Number(((g._accionesTotal || 0) / (g.totalHerencias || 1)).toFixed(2)),
        }));

    return (
      <div className="space-y-4">
        <div className="overflow-auto rounded-lg border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-muted/40 px-4 py-2.5 text-sm font-medium text-foreground">
            Vistas heredadas
          </div>
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Usuario</th>
                <th className="px-3 py-2">Vista (nombre)</th>
                <th className="px-3 py-2">Acciones</th>
                <th className="px-3 py-2 w-28">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.flatMap((row: any, idx: number) => {
                  const vistasRow = Array.isArray(row?.vistas) && row.vistas.length ? row.vistas : [null];
                  const usuarioTxt = String(
                    row?.usuarioId?.nombre ||
                      row?.usuarioId?.name ||
                      row?.usuarioId?.correo ||
                      row?.usuarioId?.email ||
                      row?.usuarioId?._id ||
                      row?.usuarioId ||
                      '-'
                  ).trim();
                  const accionesRow = Array.isArray(row?.acciones) ? row.acciones : [];
                  const accionesTxt = accionesRow.length
                    ? accionesRow
                        .map((a: any) => String(a?.etiquetas || a?.method || a?._id || '').trim())
                        .filter(Boolean)
                        .join(', ')
                    : '-';
                  const tg = String(row?.tenantGlobal?._id || row?.tenantGlobal || '-');
                  const tc = String(row?.tenantCorporativo?._id || row?.tenantCorporativo || '-');
                  return vistasRow.map((v: any, vIdx: number) => {
                    const vistaTxt = v ? String(v?.name || v?.path || v?._id || '-') : '-';
                    return (
                      <tr key={`${String(row?._id || idx)}-${vIdx}`} className="border-t border-border/80">
                        <td className="px-3 py-2">{usuarioTxt}</td>
                        <td className="px-3 py-2">{vistaTxt}</td>
                        <td className="px-3 py-2">{accionesTxt}</td>
                        <td className="px-3 py-2">
                          {vIdx === 0 ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setHerenciaDetalle({
                                  usuarioId: row?.usuarioId?._id || row?.usuarioId || null,
                                  usuario: usuarioTxt,
                                  totalHerencias: 1,
                                  tenantGlobales: tg !== '-' ? [tg] : [],
                                  tenantCorporativos: tc !== '-' ? [tc] : [],
                                  items: [row],
                                })
                              }
                            >
                              Ver detalle
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  });
                })
              ) : (
                <tr className="border-t border-border/80">
                  <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                    Sin vistas/herencias para el filtro actual.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-auto rounded-lg border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-muted/40 px-4 py-2.5 text-sm font-medium text-foreground">
            Resumen por usuario
          </div>
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Usuario</th>
                <th className="px-3 py-2">Total herencias</th>
                <th className="px-3 py-2">Tenant globales</th>
                <th className="px-3 py-2">Tenant corporativos</th>
                <th className="px-3 py-2">Vistas (promedio)</th>
                <th className="px-3 py-2">Acciones (promedio)</th>
                <th className="px-3 py-2">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {grupos.length ? (
                grupos.map((g: any, idx: number) => (
                  <tr key={String(g?.usuarioId || g?.usuario || idx)} className="border-t border-border/80">
                    <td className="px-3 py-2">{String(g?.usuario || g?.usuarioId || '-')}</td>
                    <td className="px-3 py-2">{Number(g?.totalHerencias || g?.total || 0)}</td>
                    <td className="px-3 py-2">{Array.isArray(g?.tenantGlobales) ? g.tenantGlobales.length : 0}</td>
                    <td className="px-3 py-2">{Array.isArray(g?.tenantCorporativos) ? g.tenantCorporativos.length : 0}</td>
                    <td className="px-3 py-2">{Number(g?.vistasPromedio || 0).toFixed(2)}</td>
                    <td className="px-3 py-2">{Number(g?.accionesPromedio || 0).toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => setHerenciaDetalle(g)}>
                        Ver detalle
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-t border-border/80">
                  <td className="px-3 py-3 text-muted-foreground" colSpan={7}>
                    Sin herencias para el contexto JWT actual.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const actorBadge = (actor: EndpointActor): string =>
    actor === 'tenantSuperAdmin' ? 'tenantSuperAdmin (DIOS)' : actor === 'tenantGlobal' ? 'tenantGlobal (ADMIN)' : 'Ambos';

  const renderPermisosBuilder = (endpoint: EndpointSpec) => {
    const rows = getPermisos(endpoint.id);
    const { vistasCatalogo, accionesCatalogo } = getPermisosCatalog(endpoint.id);
    const isTenantReglasEndpoint = endpoint.id === 'tenant-crear-global-reglas' || endpoint.id === 'tenant-actualizar-global-reglas';
    const allViewsWithAllActionsSelected = getBulkAllMode(endpoint.id);
    const vistasInsertarCount = allViewsWithAllActionsSelected
      ? vistasCatalogo.length
      : rows.filter((r) => r.vistaId).length;
    const accionesInsertarCount = allViewsWithAllActionsSelected
      ? vistasCatalogo.length * accionesCatalogo.length
      : rows.reduce((acc, row) => acc + row.accionId.length, 0);
    const combinacionesInsertarCount = accionesInsertarCount;
    return (
      <div className="rounded-xl border border-rose-100 bg-card/80 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-rose-600">Vistas activas + acciones activas</p>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs text-foreground">
              <input
                type="checkbox"
                checked={allViewsWithAllActionsSelected}
                onChange={(e) => {
                  if (e.target.checked) {
                    setBulkAllFor(endpoint.id, true);
                    return;
                  }
                  setBulkAllFor(endpoint.id, false);
                  setPermisos(endpoint.id, [{ vistaId: '', accionId: [] }]);
                }}
              />
              Todas vistas + acciones
            </label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={allViewsWithAllActionsSelected}
              onClick={() => setPermisos(endpoint.id, [...rows, { vistaId: '', accionId: [] }])}
            >
              Agregar vista
            </Button>
            {rows.length > 1 && !allViewsWithAllActionsSelected && (
              <Button type="button" size="sm" variant="outline" onClick={() => setPermisos(endpoint.id, rows.slice(0, -1))}>
                Quitar ultima
              </Button>
            )}
          </div>
        </div>
        {!vistasCatalogo.length && loadingDeltaByEndpoint[endpoint.id] ? (
          <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin shrink-0" />
            Calculando vistas faltantes para esta regla…
          </div>
        ) : !vistasCatalogo.length && endpoint.id === 'tenant-actualizar-global-reglas' && !getFieldValue(endpoint.id, 'x-regla-id') ? (
          <div className="rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
            Selecciona una regla para ver las vistas disponibles.
          </div>
        ) : !vistasCatalogo.length ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Faltan datos para construir permisos.
            <Button className="ml-2 h-7 px-2 text-xs" type="button" variant="outline" onClick={() => void hydrateData({ force: true })} disabled={loadingData}>
              Recargar datos
            </Button>
          </div>
        ) : null}
        {isTenantReglasEndpoint && allViewsWithAllActionsSelected ? (
          <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
            Modo masivo activo. Se insertarÃ¡n todas las vistas con todas las acciones.
          </div>
        ) : null}
        {!allViewsWithAllActionsSelected && rows.map((item, idx) => (
          <div key={`${endpoint.id}-${idx}`} className="mb-3 rounded-lg border border-border bg-muted/50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <Label>Vista activa</Label>
              {rows.length > 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const next = rows.filter((_, index) => index !== idx);
                    setPermisos(endpoint.id, next.length ? next : [{ vistaId: '', accionId: [] }]);
                  }}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Quitar
                </Button>
              )}
            </div>
            <select className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm" value={item.vistaId} onChange={(e) => {
              const next = [...rows];
              const nextVista = e.target.value;
              if (endpoint.id === 'tenant-actualizar-global-reglas') {
                const accionesMap = getAccionesPorVistaDesdeRegla(endpoint.id);
                const accionesVista = accionesMap.get(nextVista) || [];
                next[idx] = { ...next[idx], vistaId: nextVista, accionId: accionesVista };
              } else {
                next[idx] = { ...next[idx], vistaId: nextVista };
              }
              setPermisos(endpoint.id, next);
            }}>
              <option value="">Selecciona vista</option>
              {vistasCatalogo.map((vista) => <option key={vista.id} value={vista.id}>{vista.label} ({vista.path})</option>)}
            </select>
            <div className="mt-3 flex items-center justify-between gap-2">
              <Label className="block">Acciones activas</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const next = [...rows];
                    next[idx] = { ...next[idx], accionId: accionesCatalogo.map((a) => a.id) };
                    setPermisos(endpoint.id, next);
                  }}
                >
                  Todas
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const next = [...rows];
                    next[idx] = { ...next[idx], accionId: [] };
                    setPermisos(endpoint.id, next);
                  }}
                >
                  Limpiar
                </Button>
              </div>
            </div>
            <div className="mt-1 max-h-24 overflow-auto rounded-md border border-input bg-card p-2">
              {accionesCatalogo.map((accion) => (
                <label key={accion.id} className="mb-1 flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.accionId.includes(accion.id)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const next = [...rows];
                      const set = new Set(next[idx].accionId);
                      if (checked) set.add(accion.id); else set.delete(accion.id);
                      next[idx] = { ...next[idx], accionId: Array.from(set) };
                      setPermisos(endpoint.id, next);
                    }}
                  />
                  <span>{accion.label}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Seleccionadas: <span className="font-semibold">{item.accionId.length}</span>
            </p>
          </div>
        ))}
        <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-foreground">
          Resumen: vistas <span className="font-semibold">{vistasInsertarCount}</span> | acciones a insertar <span className="font-semibold">{accionesInsertarCount}</span> | combinaciones <span className="font-semibold">{combinacionesInsertarCount}</span>
        </div>
      </div>
    );
  };

  const renderHerenciaSelectionBuilder = (endpoint: EndpointSpec) => {
    const selected = getCatalogSelection(endpoint.id);
    const { vistasCatalogo, accionesCatalogo } = getPermisosCatalog(endpoint.id);
    const soloConsultaReglasGlobales = consultaReglasGlobalesRamaCorporativo(endpoint.id);
    const catalogItemSelected = (key: 'vistas' | 'acciones', catalogId: string): boolean =>
      selected[key].some((id) => id === catalogId || idsPermisoRefsCoinciden(id, catalogId));
    const esReglaSeleccionada = !!getSelectedRuleCatalogKey(endpoint.id);
    const vistaSearch = String(vistaSearchByEndpoint[endpoint.id] || '').trim().toLowerCase();
    const matchesVistaSearch = (vista: any): boolean => {
      if (!vistaSearch) return true;
      return [
        vista?.id,
        vista?._id,
        vista?.label,
        vista?.name,
        vista?.path,
        vista?.component,
      ].some((value) => String(value || '').toLowerCase().includes(vistaSearch));
    };
    return (
      <div className="rounded-xl border border-emerald-100 bg-card/80 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-emerald-700">
            {soloConsultaReglasGlobales
              ? 'Vistas y permisos parametrizados en tu rama (solo consulta)'
              : 'Elige la vista que quieres cambiarle los permisos'}
          </p>
          <div className="flex flex-1 flex-wrap justify-end gap-2">
            <Input
              className="h-8 min-w-[180px] max-w-xs bg-card text-xs"
              value={vistaSearchByEndpoint[endpoint.id] || ''}
              onChange={(e) => setVistaSearchByEndpoint((prev) => ({ ...prev, [endpoint.id]: e.target.value }))}
              placeholder="Buscar vista, ruta o componente"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={actorEsTenantCorporativoScope() || soloConsultaReglasGlobales}
              title={actorEsTenantCorporativoScope() ? 'Sin permisos para esta acción' : 'Seleccionar todas las vistas'}
              onClick={() => {
                if (actorEsTenantCorporativoScope()) return;
                const todasVistasIds = getCatalogoVistaIdsRelacionadas(endpoint.id);
                setCatalogSelectionFor(endpoint.id, {
                  vistas: todasVistasIds,
                  acciones: accionesCatalogo.map((a) => a.id),
                });
              }}
            >
              Todas
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={soloConsultaReglasGlobales}
              onClick={() => setCatalogSelectionFor(endpoint.id, { vistas: [], acciones: [] })}
            >
              Limpiar
            </Button>
          </div>
        </div>
        {endpoint.id === 'perm-admin-tenant-global' || PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpoint.id) ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 border-t border-emerald-100/80 pt-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-border bg-background text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground"
              disabled={reglasHerenciaSyncBusy}
              title={
                actorEsTenantCorporativoScope()
                  ? 'Sin permisos para esta acción'
                  : 'Vuelve a leer reglas del servidor y aplica la herencia al formulario'
              }
              onClick={() => {
                if (actorEsTenantCorporativoScope()) {
                  toast.error('Sin permisos para actualizar catálogo y herencia.');
                  return;
                }
                void sincronizarCatalogoReglasYHerencia(endpoint.id);
              }}
            >
              {reglasHerenciaSyncBusy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Actualizar catálogo de reglas y herencia
            </Button>
            <p className="max-w-xl text-[11px] leading-snug text-muted-foreground">
              Detecta reglas nuevas o modificadas en servidor, alinea el catálogo con la herencia del tenant elegido y
              refresca vistas y acciones en el formulario.
            </p>
          </div>
        ) : null}
        {!vistasCatalogo.length ? (
          (() => {
            const esActualizar = endpoint.id === 'tenant-actualizar-global-reglas';
            const tgSel = esActualizar ? resolveTenantGlobalParaReglasEndpoint(endpoint.id) : '';
            const ruleSel = esActualizar ? getFieldValue(endpoint.id, 'x-regla-id').trim() : '';
            const saSelActualizar = esActualizar
              ? String(
                  saFilterByEndpoint[endpoint.id] ||
                    tenantGlobalActor?.tenantSuperAdminId ||
                    '',
                ).trim()
              : '';
            const reglaPorSaActualizar =
              esActualizar && saSelActualizar ? findReglaJerarquiaPorSa(saSelActualizar) : undefined;
            const loadingDelta = !!loadingDeltaByEndpoint[endpoint.id];
            if (esActualizar && !tgSel && !ruleSel && !reglaPorSaActualizar) {
              return (
                <div className="rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
                  Selecciona un SuperAdmin con regla parametrizada o un tenant global en tu alcance JWT.
                </div>
              );
            }
            if (esActualizar && tgSel && !ruleSel) {
              return (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  Elige la regla (x-regla-id) del tenant para ver vistas y permisos actuales.
                </div>
              );
            }
            if (esActualizar && loadingDelta) {
              return (
                <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                  Calculando vistas y delta de la regla seleccionada…
                </div>
              );
            }
            return (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                No hay vistas resueltas para este tenant en el catalogo actual.
                <Button className="ml-2 h-7 px-2 text-xs" type="button" variant="outline" onClick={() => void hydrateData({ force: true })} disabled={loadingData}>
                  Recargar datos
                </Button>
              </div>
            );
          })()
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              {(() => {
                const suiteId = suiteSelByEndpoint[endpoint.id] || '';
                const suiteNodo = suiteId ? rutasJerarquia.find((s) => s._id === suiteId) : null;

                const esSA = actorEsTenantSuperAdmin();
                const forzarTechoCatalogo = endpoint.id === 'perm-usuario-tenant-global';
                const esReglasGlobalesTenant = endpointEsReglasGlobalesTenant(endpoint.id);
                const tgSelReglas = esReglasGlobalesTenant
                  ? resolveTenantGlobalParaReglasEndpoint(endpoint.id)
                  : '';
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
                const catalogRelacionadasIds = getCatalogoVistaIdsRelacionadas(endpoint.id);
                const catalogRelacionadasSet = new Set(catalogRelacionadasIds.map((id) => String(id)));
                const permAdminGlobalUx =
                  endpoint.id === 'perm-admin-tenant-global' || PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpoint.id);
                /** Misma regla que admin: solo cuentan checks que existen en el universo renderizable/contable. */
                const vistasSeleccionadasConteo = permAdminGlobalUx || endpoint.id === 'perm-usuario-tenant-global'
                  ? selected.vistas.filter((id) => catalogRelacionadasSet.has(String(id))).length
                  : selected.vistas.length;
                const idsPresentesEnArbol = new Set<string>();
                rutasJerarquia.forEach((suite: any) => {
                  collectAllNodes(suite.children || []).forEach((n: any) => {
                    const nid = getEntityId(n);
                    if (nid) idsPresentesEnArbol.add(nid);
                  });
                });
                diosRecursosJerarquiaFlat.forEach((r) => {
                  const rid = String(r._id || '').trim();
                  if (rid) idsPresentesEnArbol.add(rid);
                });
                const vistaLocMaps = buildVistaLocationMap(rutasJerarquia);
                // IDs de rutas activas (fuente de verdad del frontend)
                const vistaIdsActivos = new Set(vistas.map((v) => v.id));
                const extraIdsPlantillaCrear = getExtraVistaIdsReglaPlantillaCrear(endpoint.id);

                // Nodos visibles en el mÃ³dulo:
                // - Si hay regla: todos los nodos activos del Ã¡rbol (habilitados si estÃ¡n en catÃ¡logo)
                // - Si hay catÃ¡logo sin regla: nodos en catÃ¡logo o FORMULARIO/SUBFORMULARIO
                // - Sin catÃ¡logo: solo FORMULARIO/SUBFORMULARIO
                const getFormulariosDeModulo = (modulo: any) =>
                  collectAllNodes(modulo.children || []).filter((f) => {
                    const fid = getEntityId(f);
                    if (!fid) return false;
                    if (
                      allowedVistaIds.size > 0 &&
                      !vistaIdMatchesCatalog(fid, vistasCatalogo) &&
                      !allowedVistaIds.has(fid)
                    ) {
                      let allowed = false;
                      allowedVistaIds.forEach((aid) => {
                        if (idsPermisoRefsCoinciden(aid, fid)) allowed = true;
                      });
                      if (!allowed) return false;
                    }
                    if (!matchesVistaSearch(f)) return false;
                    if ((esReglaSeleccionada || tenantGlobalElegidoReglas) && esReglasGlobalesTenant) {
                      return (
                        vistaIdMatchesCatalog(fid, vistasCatalogo) ||
                        extraIdsPlantillaCrear.has(fid) ||
                        esNodoFormularioLike(f)
                      );
                    }
                    if (esReglaSeleccionada) {
                      // Mostrar cualquier nodo que esté activo en el árbol de rutas
                      return (
                        vistaIdsActivos.has(fid) ||
                        esNodoFormularioLike(f) ||
                        extraIdsPlantillaCrear.has(fid)
                      );
                    }
                    return esNodoFormularioLike(f) || (hasCatalogFilter && vistaIdMatchesCatalog(fid, vistasCatalogo));
                  });

                // Renderiza la jerarquÃ­a mÃ³dulo â†’ formularios de una suite
                const renderSuiteTree = (suite: any) => {
                  const modulos = getModuloNodes(suite);
                  const suiteId = getEntityId(suite);
                  const totalCatalogEnArbol = modulos.reduce(
                    (acc, m) => acc + getFormulariosDeModulo(m).length,
                    0
                  );
                  const selectedSet = new Set(selected.vistas.map((x) => String(x)));
                  const parametrizadasEnArbol = modulos.reduce(
                    (acc, m) =>
                      acc +
                      getFormulariosDeModulo(m).filter((f) => selectedSet.has(getEntityId(f))).length,
                    0
                  );
                  const catalogSuite = contarVistasCatalogoEnSuite(
                    suiteId,
                    vistasCatalogo,
                    selected.vistas,
                    vistaLocMaps.byId,
                    vistaLocMaps.byPath
                  );
                  const parametrizadasEnSuite =
                    catalogSuite.total > 0 ? catalogSuite.parametrizadas : parametrizadasEnArbol;
                  const totalCatalogEnSuite =
                    catalogSuite.total > 0 ? catalogSuite.total : totalCatalogEnArbol;
                  if (modulos.length === 0) return null;
                  return (
                    <div key={getEntityId(suite)} className="mb-2">
                      {!suiteNodo && (
                        <div className="mb-2 flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-800">{suite.name}</span>
                          <span
                            className="ml-auto rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-800"
                            title="Marcadas en formulario / vistas del catálogo asignadas a esta suite (por id o path en árbol de rutas)"
                          >
                            {parametrizadasEnSuite}/{totalCatalogEnSuite}
                          </span>
                        </div>
                      )}
                      <div className="space-y-1">
                        {modulos.map((modulo) => {
                          const formularios = getFormulariosDeModulo(modulo);
                          if (formularios.length === 0) return null;
                          const moduleKey = `${endpoint.id}::${modulo._id}`;
                          const closedKey = `${moduleKey}::closed`;
                          const defaultExpand = endpoint.id === 'perm-usuario-tenant-global';
                          const isExpanded = defaultExpand ? !expandedModulos.has(closedKey) : expandedModulos.has(moduleKey);
                          const selectedSetM = new Set(selected.vistas.map((x) => String(x)));
                          const catalogModulo = contarVistasCatalogoEnModulo(
                            suiteId,
                            getEntityId(modulo),
                            vistasCatalogo,
                            selected.vistas,
                            vistaLocMaps.byId,
                            vistaLocMaps.byPath
                          );
                          const selectedCount =
                            catalogModulo.total > 0
                              ? catalogModulo.parametrizadas
                              : formularios.filter((f) => selectedSetM.has(getEntityId(f))).length;
                          const totalModulo =
                            catalogModulo.total > 0 ? catalogModulo.total : formularios.length;
                          return (
                            <div key={getEntityId(modulo)} className="rounded-md border border-emerald-200 bg-card">
                              <button
                                type="button"
                                className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                                onClick={() =>
                                  setExpandedModulos((prev) => {
                                    const next = new Set(prev);
                                    if (defaultExpand) {
                                      next.has(closedKey) ? next.delete(closedKey) : next.add(closedKey);
                                    } else {
                                      next.has(moduleKey) ? next.delete(moduleKey) : next.add(moduleKey);
                                    }
                                    return next;
                                  })
                                }
                              >
                                <span>{modulo.name}</span>
                                <span className="text-muted-foreground/90 font-normal">{selectedCount}/{totalModulo} {isExpanded ? '▲' : '▼'}</span>
                              </button>
                              {isExpanded && (
                                <div className="border-t border-emerald-100 p-1.5 space-y-0.5">
                                  {(() => {
                                    const formularioIds = new Set(formularios.map((f) => getEntityId(f)));
                                    const hasVisibleDescendant = (node: any): boolean => {
                                      const nid = getEntityId(node);
                                      if (formularioIds.has(nid)) return true;
                                      return (Array.isArray(node.children) ? node.children : []).some(hasVisibleDescendant);
                                    };
                                    const renderNodo = (nodo: any, depth: number): React.ReactNode => {
                                      if (!hasVisibleDescendant(nodo)) return null;
                                      const nid = getEntityId(nodo);
                                      const tipo = getTipoNodoLabel(nodo);
                                      const esSelec = formularioIds.has(nid);
                                      const hijos = Array.isArray(nodo.children) ? nodo.children : [];
                                      const enCatalogo = esReglaSeleccionada
                                        ? catalogIds.size === 0 || vistaIdMatchesCatalog(nid, vistasCatalogo)
                                        : !hasCatalogFilter || vistaIdMatchesCatalog(nid, vistasCatalogo);
                                      const isSubForm = tipo === 'SUBFORMULARIO';
                                      return (
                                        <div key={nid} style={{ paddingLeft: depth * 12 }}>
                                          {esSelec ? (
                                            <label className={`flex items-start gap-2 rounded px-1.5 py-1 text-xs border-l-2 ${soloConsultaReglasGlobales ? 'opacity-90' : 'cursor-pointer hover:bg-muted/50'} ${isSubForm ? 'border-border' : 'border-input'}`}>
                                              <input
                                                type="checkbox"
                                                className="mt-0.5 shrink-0 accent-emerald-600"
                                                checked={catalogItemSelected('vistas', nid)}
                                                disabled={soloConsultaReglasGlobales}
                                                onChange={(e) => toggleCatalogItem(endpoint.id, 'vistas', nid, e.target.checked)}
                                              />
                                              <span className="flex flex-wrap items-center gap-1 leading-tight">
                                                {isSubForm && (
                                                  <span className="rounded bg-muted px-1 text-[10px] font-medium text-muted-foreground">Sub</span>
                                                )}
                                                <span className={isSubForm ? 'text-muted-foreground' : 'text-foreground font-medium'}>{nodo.name}</span>
                                                {nodo.path && <span className="text-muted-foreground/90">({nodo.path})</span>}
                                                {!enCatalogo && <span className="text-amber-500">[fuera de regla]</span>}
                                              </span>
                                            </label>
                                          ) : (
                                            <p className="mt-1 mb-0.5 rounded border-l-2 border-blue-300 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                                              {nodo.name}
                                            </p>
                                          )}
                                          {hijos.map((hijo: any) => renderNodo(hijo, depth + 1))}
                                        </div>
                                      );
                                    };
                                    return (modulo.children || []).map((child: any) => renderNodo(child, 0));
                                  })()}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                };

                // Suite seleccionada: mostrar solo esa suite
                if (suiteNodo) {
                  const totalFormularios = getModuloNodes(suiteNodo).reduce(
                    (acc, m) => acc + getFormulariosDeModulo(m).length, 0
                  );
                  return (
                    <>
                      <p className="mb-2 text-xs font-semibold text-foreground">
                        Vistas ({vistasSeleccionadasConteo}/{totalFormularios}) - {suiteNodo.name}
                      </p>
                      <div className="max-h-64 overflow-auto space-y-1">
                        {renderSuiteTree(suiteNodo) || <p className="text-xs text-muted-foreground px-2">Esta suite no tiene mÃ³dulos disponibles.</p>}
                      </div>
                    </>
                  );
                }

                // Regla seleccionada sin suite - mostrar TODAS las suites con jerarquia completa
                if (
                  esReglaSeleccionada ||
                  tenantGlobalElegidoReglas ||
                  endpoint.id === 'perm-usuario-tenant-global' ||
                  endpoint.id === 'perm-admin-tenant-global' ||
                  PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpoint.id) ||
                  endpoint.id === 'tenant-crear-global-reglas'
                ) {
                  const suitesConNodos = rutasJerarquia.filter((s) => Array.isArray(s.children) && s.children.length > 0);
                  const totalCatalog = catalogRelacionadasIds.length;
                  const vistasFueraArbol = vistasCatalogo.filter(
                    (v) => v?.id && !vistaIdMatchesIdSet(String(v.id), idsPresentesEnArbol),
                  );
                  const catalogIdSet = new Set(vistasCatalogo.map((v) => String(v.id)));
                  const vistasIdsSinFilaCatalogo = selected.vistas.filter(
                    (vid) => !catalogIdSet.has(String(vid)) && !vistaIdMatchesCatalog(vid, vistasCatalogo),
                  );
                  const usarJerarquiaCounterPermAdmin =
                    permAdminGlobalUx &&
                    (diosRecursosJerarquiaTree.length > 0 || diosRecursosJerarquiaFlat.length > 0);
                  const counterTreeFiltrado = usarJerarquiaCounterPermAdmin
                    ? filterDiosJerarquiaTreeByAllowedIds(diosRecursosJerarquiaTree, catalogIdSet)
                    : [];
                  const counterFlatFiltrado = usarJerarquiaCounterPermAdmin
                    ? diosRecursosJerarquiaFlat.filter((r) => catalogIdSet.has(String(r._id || '').trim()))
                    : [];
                  const vistasSinCatResueltas =
                    endpoint.id === 'perm-usuario-tenant-global'
                      ? vistasIdsSinFilaCatalogo.filter((vid) => {
                          const m = resolverVistaDesdeRutasSeguridad(vid);
                          return matchesVistaSearch({
                            id: vid,
                            label: m.label,
                            name: m.label,
                            path: m.path,
                          });
                        })
                      : [];
                  const mostrarHuerfanosCatalogo =
                    (permAdminGlobalUx ||
                      endpoint.id === 'perm-usuario-tenant-global' ||
                      tenantGlobalElegidoReglas ||
                      endpoint.id === 'tenant-actualizar-global-reglas' ||
                      endpoint.id === 'tenant-crear-global-reglas') &&
                    vistasFueraArbol.some((v) => matchesVistaSearch(v));
                  const arbolSinCheckboxes =
                    (endpoint.id === 'tenant-actualizar-global-reglas' ||
                      endpoint.id === 'tenant-crear-global-reglas') &&
                    vistasCatalogo.length > 0 &&
                    suitesConNodos.every(
                      (suite) =>
                        getModuloNodes(suite).every((m) => getFormulariosDeModulo(m).length === 0),
                    );
                  return (
                    <>
                      <p className="mb-2 text-xs font-semibold text-foreground">
                        Vistas ({vistasSeleccionadasConteo}/{totalCatalog})
                        {usarJerarquiaCounterPermAdmin
                          ? ' - jerarquía countertiponodorutas'
                          : ' - Todas las suites'}
                      </p>
                      {usarJerarquiaCounterPermAdmin ? (
                        <div className="max-h-72 overflow-y-auto rounded-md border border-border/80 bg-card px-2 py-1">
                          <DiosReglaRecursosJerarquiaPanel
                            tree={counterTreeFiltrado}
                            flatFallback={counterFlatFiltrado}
                            seleccionados={selected.vistas}
                            onChangeSeleccion={(ids) =>
                              setCatalogSelectionFor(endpoint.id, { vistas: ids, acciones: selected.acciones })
                            }
                            disabled={actorEsTenantCorporativoScope()}
                            loading={diosRecursosJerarquiaLoading && !diosRecursosJerarquiaTree.length}
                          />
                        </div>
                      ) : (
                        <div className="max-h-72 overflow-auto space-y-2">
                          {arbolSinCheckboxes ? null : suitesConNodos.map((suite) => renderSuiteTree(suite))}
                        </div>
                      )}
                      {arbolSinCheckboxes ? (
                        <div className="max-h-72 overflow-auto rounded-md border border-input bg-card p-2">
                          {vistasCatalogo.filter(matchesVistaSearch).map((vista) => (
                            <label
                              key={vista.id}
                              className="mb-1 flex cursor-pointer items-center gap-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                className="accent-emerald-600"
                                checked={catalogItemSelected('vistas', vista.id)}
                                onChange={(e) =>
                                  toggleCatalogItem(endpoint.id, 'vistas', vista.id, e.target.checked)
                                }
                              />
                              <span>
                                {vista.label}{' '}
                                {vista.path ? (
                                  <span className="text-muted-foreground">({vista.path})</span>
                                ) : null}
                              </span>
                            </label>
                          ))}
                        </div>
                      ) : null}
                      {mostrarHuerfanosCatalogo && !arbolSinCheckboxes ? (
                        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50/90 p-2">
                          <p className="mb-2 text-[11px] font-semibold text-amber-950">
                            Vistas del catálogo (regla/herencia) aún sin nodo en el árbol de suites — puedes marcarlas aquí
                            {' '}
                            (
                            {vistasFueraArbol.filter((v) => selected.vistas.includes(v.id)).length}
                            /
                            {vistasFueraArbol.filter(matchesVistaSearch).length}
                            {' '}
                            parametrizadas
                            )
                          </p>
                          <div className="max-h-40 space-y-1 overflow-auto">
                            {vistasFueraArbol.filter(matchesVistaSearch).map((vista) => (
                              <label
                                key={vista.id}
                                className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-amber-100/80"
                              >
                                <input
                                  type="checkbox"
                                  className="accent-emerald-600"
                                  checked={catalogItemSelected('vistas', vista.id)}
                                  onChange={(e) =>
                                    toggleCatalogItem(endpoint.id, 'vistas', vista.id, e.target.checked)
                                  }
                                />
                                <span>
                                  {vista.label}{' '}
                                  {vista.path ? (
                                    <span className="text-muted-foreground">({vista.path})</span>
                                  ) : null}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {endpoint.id === 'perm-usuario-tenant-global' && vistasSinCatResueltas.length > 0 ? (
                        <div className="mt-2 rounded-md border border-rose-200 bg-rose-50/90 p-2">
                          <p className="mb-2 text-[11px] font-semibold text-rose-950">
                            Vistas en herencia no incluidas en el catálogo del formulario ({vistasSinCatResueltas.length}
                            {vistaSearch && vistasIdsSinFilaCatalogo.length !== vistasSinCatResueltas.length
                              ? ` de ${vistasIdsSinFilaCatalogo.length}`
                              : ''}
                            ) — nombre/path desde GET vistas y árbol listarRutas (seguridad) cuando existen.
                          </p>
                          <div className="max-h-36 space-y-1 overflow-auto">
                            {vistasSinCatResueltas.map((vid) => {
                              const meta = resolverVistaDesdeRutasSeguridad(vid);
                              const sinRutaSeguridad = meta.label === vid && !meta.path;
                              return (
                                <label
                                  key={vid}
                                  className="flex cursor-pointer items-start gap-2 rounded px-1 py-0.5 text-xs hover:bg-rose-100/80"
                                >
                                  <input
                                    type="checkbox"
                                    className="accent-rose-600 mt-0.5 shrink-0"
                                    checked={catalogItemSelected('vistas', vid)}
                                    onChange={(e) =>
                                      toggleCatalogItem(endpoint.id, 'vistas', vid, e.target.checked)
                                    }
                                  />
                                  <span className="min-w-0 leading-snug text-rose-950">
                                    {!sinRutaSeguridad ? (
                                      <>
                                        <span className="font-medium text-foreground">{meta.label}</span>
                                        {meta.path ? (
                                          <span className="text-muted-foreground"> ({meta.path})</span>
                                        ) : null}
                                        <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                                          id · {vid}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="font-mono text-[11px] font-medium text-foreground">{vid}</span>
                                        <span className="mt-0.5 block text-[10px] text-amber-800">
                                          No aparece en vistas/contexto ni en el árbol de rutas cargado — sincroniza «Recargar datos» o quita el permiso si el id es obsoleto.
                                        </span>
                                      </>
                                    )}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </>
                  );
                }

                // Sin suite y sin regla: lista plana del catÃ¡logo
                return (
                  <>
                    <p className="mb-2 text-xs font-semibold text-foreground">Vistas ({selected.vistas.length}/{vistasCatalogo.length})</p>
                    <div className="max-h-40 overflow-auto rounded-md border border-input bg-card p-2">
                      {vistasCatalogo.filter(matchesVistaSearch).map((vista) => (
                        <label key={vista.id} className={`mb-1 flex items-center gap-2 text-sm ${soloConsultaReglasGlobales ? '' : 'cursor-pointer'}`}>
                          <input
                            type="checkbox"
                            checked={catalogItemSelected('vistas', vista.id)}
                            disabled={soloConsultaReglasGlobales}
                            onChange={(e) => toggleCatalogItem(endpoint.id, 'vistas', vista.id, e.target.checked)}
                          />
                          <span>{vista.label} {vista.path ? `(${vista.path})` : ''}</span>
                        </label>
                      ))}
                      {!vistasCatalogo.filter(matchesVistaSearch).length && (
                        <p className="text-xs text-muted-foreground">Sin vistas para la busqueda actual.</p>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <p className="mb-2 text-xs font-semibold text-foreground">Acciones ({selected.acciones.length}/{accionesCatalogo.length})</p>
              <div className="max-h-40 overflow-auto rounded-md border border-input bg-card p-2">
                {accionesCatalogo.map((accion) => (
                  <label key={accion.id} className={`mb-1 flex items-center gap-2 text-sm ${soloConsultaReglasGlobales ? '' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      checked={catalogItemSelected('acciones', accion.id)}
                      disabled={soloConsultaReglasGlobales}
                      onChange={(e) => toggleCatalogItem(endpoint.id, 'acciones', accion.id, e.target.checked)}
                    />
                    <span>{accion.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

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
    setCrearReglasJerarquiaSyncing(true);
    try {
      const res: any = await apiFetch('/api/config/tenant/tipo/sincronizar/jerarquia/counters-globales', {
        method: 'POST',
      });
      const ins = Number(res?.data?.insertadosEnCountersGlobal ?? 0);
      const rev = Number(res?.data?.filasCounterRevisadas ?? 0);
      toast.success(
        res?.msg ||
          `Jerarquía sincronizada: ${ins} materialización(es) nueva(s) en counters global (${rev} emisiones en tenantJerarquiaCounter revisadas).`
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

  const inlineExecuteLabel = (endpoint: EndpointSpec): string => {
    if (endpoint.method === 'GET') return 'Consultar';
    if (endpoint.method === 'POST') return 'Guardar';
    if (endpoint.method === 'PUT') return 'Actualizar';
    if (endpoint.method === 'DELETE') return 'Confirmar';
    return 'Ejecutar';
  };

  const renderFormResultSlot = (endpoint: EndpointSpec) => {
    if (endpoint.id === 'tenant-crear-dios-reglas') {
      return null;
    }
    const ocultarJsonRespuestaGuardado =
      endpoint.id === 'perm-admin-tenant-global' ||
      PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpoint.id) ||
      endpoint.id === 'perm-admin-tenant-global-desactivar' ||
      endpoint.id === 'perm-admin-tenant-global-eliminar' ||
      endpoint.id === 'perm-usuario-tenant-global' ||
      endpoint.id === 'tenant-actualizar-global-reglas' ||
      endpoint.id === 'tenant-crear-global-reglas' ||
      esEndpointAltaTenantPanel(endpoint.id);
    if (ocultarJsonRespuestaGuardado) {
      return null;
    }
    const fallbackJson = result[endpoint.id];
    const genericPre = (
      <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-muted/50 p-3 text-xs text-foreground">
        {fallbackJson != null && fallbackJson !== ''
          ? fallbackJson
          : useModuloInlineFlow
            ? ''
            : 'Aun sin respuesta'}
      </pre>
    );
    const inlineEmpty = useModuloInlineFlow && !fallbackJson;

    const body =
      esEndpointAltaTenantPanel(endpoint.id)
        ? (
            <GobernanzaAltaTenantResultPanel
              endpointId={endpoint.id}
              response={resultData[endpoint.id]}
              formFields={formData[endpoint.id]}
              selects={tenantGlobalSelects}
              fallbackJson={fallbackJson}
            />
          )
        : endpoint.id === 'tenant-listar-reglas'
        ? renderReglasTable()
        : endpoint.id === 'tenant-actualizar-dios-reglas'
          ? renderActualizarReglaDiosResultado()
          : endpoint.id === 'tenant-listar-libres' ||
              endpoint.id === 'tenant-listar-libres-superadmin' ||
              endpoint.id === 'tenant-listar-libres-tenantglobal'
            ? renderTenantLibresTable(endpoint.id)
            : endpoint.id === 'perm-listar-herencias'
              ? renderHerenciasUsuarioTable()
              : endpoint.id === 'perm-admin-tenant-global-listar'
                ? renderHerenciasAdminTable()
                : genericPre;

    if (!useModuloInlineFlow) return body;

    return (
      <div className="space-y-2">
        {inlineEmpty ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            Sin resultados todavía. Usa «{inlineExecuteLabel(endpoint)}» para cargar la información.
          </p>
        ) : null}
        {inlineEmpty ? null : body}
      </div>
    );
  };

  const renderFormFieldsInner = (
    endpoint: EndpointSpec,
    opts?: { omitGenericFields?: boolean }
  ) => (
    <>
      {(PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpoint.id) || endpoint.id === 'perm-admin-tenant-global') ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!!syncRunningByEndpoint[endpoint.id]}
              onClick={() => runHerenciaSyncCheck(endpoint.id, false)}
            >
              Validar rutas nuevas
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!!syncRunningByEndpoint[endpoint.id]}
              onClick={() => runHerenciaSyncCheck(endpoint.id, true)}
            >
              Sincronizar ahora
            </Button>
          </div>
          {(() => {
            const sync = syncInfoByEndpoint[endpoint.id];
            if (!sync) return <p>Selecciona tenant y ejecuta validacion para ver rutas faltantes.</p>;
            const resumen = sync?.sincronizacionResumen || {};
            const permitida = sync?.sincronizacionPermitida;
            const rows = Array.isArray(sync?.sincronizacion) ? sync.sincronizacion : [];
            const pendientes = rows.reduce((acc: number, r: any) => acc + Number(r?.rutasNoAgregadasTotal || 0), 0);
            return (
              <div className="space-y-2">
                <p>
                  Permiso sincronizacion: <span className="font-semibold">{permitida ? 'HABILITADA (tenantSuperAdmin)' : 'SOLO DIAGNOSTICO'}</span>
                </p>
                <p>
                  Contextos: <span className="font-semibold">{Number(resumen?.contextos || rows.length || 0)}</span> | Sincronizados:{' '}
                  <span className="font-semibold">{Number(resumen?.contextosSincronizados || 0)}</span> | Rutas activas:{' '}
                  <span className="font-semibold">{Number(resumen?.rutasActivasTotal || 0)}</span> | Pendientes:{' '}
                  <span className="font-semibold">{pendientes}</span>
                </p>
                {rows.length ? (
                  <div className="max-h-36 overflow-auto rounded border border-blue-200 bg-card p-2 text-[11px] text-foreground">
                    {rows.map((r: any, idx: number) => (
                      <div key={`${r?.tenantGlobal || 'tg'}-${r?.tenantCorporativo || 'tc'}-${idx}`} className="mb-2 border-b border-border/80 pb-1 last:mb-0 last:border-b-0">
                        <p>
                          TG: <span className="font-mono">{String(r?.tenantGlobal || '-')}</span> | TC:{' '}
                          <span className="font-mono">{String(r?.tenantCorporativo || '-')}</span> | Faltantes:{' '}
                          <span className="font-semibold">{Number(r?.rutasNoAgregadasTotal || 0)}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })()}
        </div>
      ) : null}
      {endpoint.id === 'perm-listar-herencias' ? (() => {
        const tenantOptions = getTenantGlobalOptions(endpoint.id);
        const tenantGlobalSelected = getFieldValue(endpoint.id, 'tenantGlobal').trim();
        const actorRolJwt = String(tenantGlobalActor?.rol || '').trim();
        const actorTsaJwt = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
        const actorTgJwt = String(tenantGlobalActor?.tenantGlobalId || '').trim();
        const actorTcJwt = String(tenantGlobalActor?.tenantCorporativoId || '').trim();
        const herenciaSelected = getFieldValue(endpoint.id, 'herenciaAsociada').trim();
        const herenciaOptions = herenciaAsociadaOptionsByEndpoint[endpoint.id] || [];
        const herenciaById = herenciaAsociadaDataByEndpoint[endpoint.id] || {};
        const tenantCorpError = String(tenantCorpErrorByEndpoint[endpoint.id] || '').trim();
        const tenantCorpSel = getFieldValue(endpoint.id, 'tenantCorporativo').trim();
        const corpOptionsListar = getTenantCorporativoOptions(endpoint.id);
        const tgEsMongoReal = Boolean(tenantGlobalSelected) && !isTenantSuperAdminScopeOption(tenantGlobalSelected);
        return (
          <div className="space-y-3">
            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
              Elige la rama Tenant SuperAdmin o un tenant global. Los permisos y acciones se validan en servidor según{' '}
              <code className="rounded bg-muted px-1">tenantjerarquiacounters</code> (sin mostrar rangos jerárquicos al usuario).
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Tenant global / rama SuperAdmin</Label>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                  value={tenantGlobalSelected}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setFieldValue(endpoint.id, 'tenantGlobal', nextValue);
                    setFieldValue(endpoint.id, 'herenciaAsociada', '');
                    setFieldValue(endpoint.id, 'tenantCorporativo', '');
                    setHerenciaAsociadaOptionsByEndpoint((prev) => ({ ...prev, [endpoint.id]: [] }));
                    setHerenciaAsociadaDataByEndpoint((prev) => ({ ...prev, [endpoint.id]: {} }));
                    if (nextValue) fetchHerenciasAsociadasByTenantGlobal(endpoint.id, nextValue);
                  }}
                >
                  <option value="">
                    Sin filtro TG/SA explícito en la URL (el servidor aplica solo el alcance del JWT)
                  </option>
                  {renderTenantGlobalSelectOptionGroups(
                    tenantOptions,
                    resolveSaJerarquiaMetasVisibles(endpoint.id),
                  )}
                </select>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  Si ves el mismo nombre o correo más de una vez, no es un duplicado: cada fila es un{' '}
                  <span className="font-medium text-foreground">Tenant SuperAdmin distinto</span> (código SA-0001,
                  SA-0002, sufijo …id). Un usuario puede administrar varias ramas. Los TG (SA-0002-TG-0004…) son
                  tenants globales bajo esa rama.
                </p>
                {(actorRolJwt || actorTsaJwt || actorTgJwt || actorTcJwt) ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {`JWT: ${actorRolJwt || 'SIN_ROL'} | TSA:${actorTsaJwt || '-'} | TG:${actorTgJwt || '-'} | TC:${actorTcJwt || '-'}`}
                  </p>
                ) : null}
              </div>
              <div>
                <Label>Herencia asociada</Label>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm disabled:opacity-50"
                  value={herenciaSelected}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setFieldValue(endpoint.id, 'herenciaAsociada', nextId);
                    const row = herenciaById[nextId];
                    const tc = String(row?.tenantCorporativo?._id || row?.tenantCorporativo || '').trim();
                    setFieldValue(endpoint.id, 'tenantCorporativo', tc);
                    if (nextId) applyHerenciaAsociadaSelection(endpoint.id, nextId);
                  }}
                  disabled={!tenantGlobalSelected}
                >
                  <option value="">
                    {!tenantGlobalSelected
                      ? 'Opcional: elige un TG o un SA del combo para filtrar'
                      : herenciaOptions.length
                      ? 'Todas las herencias del ámbito seleccionado'
                      : 'Sin herencia persistida: elige una regla del catálogo ([REGLA CAT])'}
                  </option>
                  {herenciaOptions.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.label}
                    </option>
                  ))}
                </select>
                {tenantCorpError ? (
                  <p className="mt-1 text-xs text-rose-700">
                    Error cargando herencias: {tenantCorpError}
                  </p>
                ) : null}
              </div>
            </div>
            {tgEsMongoReal ? (
              <div>
                <Label>Tenant corporativo (opcional · query GET)</Label>
                <select
                  className="mt-1 h-10 w-full max-w-lg rounded-md border border-input px-3 text-sm"
                  value={tenantCorpSel}
                  onChange={(e) => setFieldValue(endpoint.id, 'tenantCorporativo', e.target.value)}
                >
                  <option value="">Todos los corporativos permitidos para ese TG</option>
                  {corpOptionsListar.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Si eliges uno, el GET envía <code className="rounded bg-muted px-1">tenantCorporativo</code> y el servidor filtra
                  herencias de ese corporativo (validado contra tu jerarquía).
                </p>
              </div>
            ) : null}
            {renderHerenciaAsociadaDetalle(endpoint.id)}
          </div>
        );
      })() : null}
      {endpoint.id === 'perm-admin-tenant-global-listar' ? (() => {
        // Solo tenantGlobales reales (sin opción tenantSuperAdmin DIOS)
        const tenantOptions = getTenantGlobalOptions(endpoint.id).filter((t) => !isTenantSuperAdminScopeOption(t.id));
        const tenantGlobalSelected = getFieldValue(endpoint.id, 'tenantGlobal').trim();
        const herenciaSelected = getFieldValue(endpoint.id, 'herenciaAsociada').trim();
        const herenciaOptions = herenciaAsociadaOptionsByEndpoint[endpoint.id] || [];
        const herenciaById = herenciaAsociadaDataByEndpoint[endpoint.id] || {};
        return (
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Tenant global</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                value={tenantGlobalSelected}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setFieldValue(endpoint.id, 'tenantGlobal', nextValue);
                  setFieldValue(endpoint.id, 'herenciaAsociada', '');
                  setFieldValue(endpoint.id, 'tenantCorporativo', '');
                  setHerenciaAsociadaOptionsByEndpoint((prev) => ({ ...prev, [endpoint.id]: [] }));
                  setHerenciaAsociadaDataByEndpoint((prev) => ({ ...prev, [endpoint.id]: {} }));
                  if (nextValue) fetchHerenciasConReglasParaTenant(endpoint.id, nextValue);
                }}
              >
                <option value="">Todos los tenant globales del contexto JWT</option>
                {tenantOptions.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Herencia asociada (visual)</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                value={herenciaSelected}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setFieldValue(endpoint.id, 'herenciaAsociada', nextId);
                  const row = herenciaById[nextId];
                  const tc = String(row?.tenantCorporativo?._id || row?.tenantCorporativo || '').trim();
                  setFieldValue(endpoint.id, 'tenantCorporativo', tc);
                }}
                disabled={!tenantGlobalSelected}
              >
                <option value="">
                  {!tenantGlobalSelected
                    ? 'Selecciona tenant global primero'
                    : herenciaOptions.length
                    ? 'Selecciona herencia asociada'
                    : 'Sin herencias asociadas'}
                </option>
                {herenciaOptions.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
              </select>
            </div>
            {renderHerenciaAsociadaDetalle(endpoint.id)}
          </div>
        );
      })() : null}
      {(endpoint.id === 'perm-admin-tenant-global-desactivar' || endpoint.id === 'perm-admin-tenant-global-eliminar') ? (() => {
        const tenantOptions = getTenantGlobalOptions(endpoint.id);
        const tenantGlobalSelected = getFieldValue(endpoint.id, 'tenantGlobal').trim();
        const herenciaSelected = getFieldValue(endpoint.id, 'herenciaAsociada').trim();
        const herenciaOptions = herenciaAsociadaOptionsByEndpoint[endpoint.id] || [];
        const herenciaById = herenciaAsociadaDataByEndpoint[endpoint.id] || {};
        return (
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Tenant global</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                value={tenantGlobalSelected}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setFieldValue(endpoint.id, 'tenantGlobal', nextValue);
                  setFieldValue(endpoint.id, 'herenciaAsociada', '');
                  setFieldValue(endpoint.id, 'tenantCorporativo', '');
                  setFieldValue(endpoint.id, 'vistaObjetivoId', '');
                  setFieldValue(endpoint.id, 'id', '');
                  setHerenciaAsociadaOptionsByEndpoint((prev) => ({ ...prev, [endpoint.id]: [] }));
                  setHerenciaAsociadaDataByEndpoint((prev) => ({ ...prev, [endpoint.id]: {} }));
                  setVistasDesactivarSeleccion((prev) => ({ ...prev, [endpoint.id]: [] }));
                  if (nextValue) fetchHerenciasConReglasParaTenant(endpoint.id, nextValue, { notify: true });
                }}
              >
                <option value="">Selecciona tenant global</option>
                {tenantOptions.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Herencia asociada</Label>
              {!tenantGlobalSelected ? (
                <p className="mt-2 text-xs text-muted-foreground">Selecciona tenant global primero</p>
              ) : herenciaOptions.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">Sin herencias asociadas</p>
              ) : (
                <div className="mt-1 max-h-48 overflow-y-auto rounded-md border border-input divide-y">
                  {herenciaOptions.map((h) => (
                    <label
                      key={h.id}
                      className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 ${herenciaSelected === h.id ? 'bg-muted' : ''}`}
                    >
                      <input
                        type="radio"
                        name={`herencia-${endpoint.id}`}
                        value={h.id}
                        checked={herenciaSelected === h.id}
                        onChange={() => {
                          setFieldValue(endpoint.id, 'herenciaAsociada', h.id);
                          setFieldValue(endpoint.id, 'id', h.id);
                          setFieldValue(endpoint.id, 'vistaObjetivoId', '');
                          setVistasDesactivarSeleccion((prev) => ({ ...prev, [endpoint.id]: [] }));
                          const row = herenciaById[h.id];
                          const tc = String(row?.tenantCorporativo?._id || row?.tenantCorporativo || '').trim();
                          setFieldValue(endpoint.id, 'tenantCorporativo', tc);
                        }}
                        className="accent-primary"
                      />
                      <span className="flex-1 truncate">{h.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {renderHerenciaAsociadaDetalle(endpoint.id)}
          </div>
        );
      })() : null}
      {endpoint.id === 'corp-crear-catalogo' ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 space-y-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <p className="text-emerald-800 font-medium">
              CLIENTE y EMPLEADO se crean automÃ¡ticamente al guardar si aÃºn no existen.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={catalogSeedRunning}
              onClick={() => void handleCatalogSeedDefaults()}
              className="shrink-0 text-xs"
            >
              {catalogSeedRunning ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
              Inicializar defaults
            </Button>
          </div>
          {catalogItemsLoaded && catalogItems.length > 0 && (
            <div className="space-y-1">
              {catalogItems.filter((c) => c.esDefault).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {catalogItems.filter((c) => c.esDefault).map((c) => (
                    <span key={c.iud} className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-muted-foreground font-mono">
                      ðŸ”’ {c.tipo_comprador} <span className="text-muted-foreground/90">({c.sigla})</span>
                    </span>
                  ))}
                </div>
              )}
              {catalogItems.filter((c) => !c.esDefault).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {catalogItems.filter((c) => !c.esDefault).map((c) => (
                    <span key={c.iud} className="inline-flex items-center gap-1 rounded bg-card border border-border px-2 py-0.5 text-foreground font-mono">
                      {c.tipo_comprador} <span className="text-muted-foreground/90">({c.sigla})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
      {!opts?.omitGenericFields ? endpoint.fields.map((field) => {
        if ((endpoint.id === 'tenant-crear-dios-reglas' || endpoint.id === 'tenant-actualizar-dios-reglas') && field.name === 'tenantSuperAdmin') {
          const diosMetas = Array.from(buildDiosReglaSaMetasMap().values());
          return (
            <div key={field.name}>
              <DiosReglaAlcanceTenantsPanel
                endpointId={endpoint.id}
                disabled={!diosReglaAlcanceFormularioEditable(endpoint)}
                metas={diosMetas}
                jwtSaId={String(tenantGlobalActor?.tenantSuperAdminId || '')}
                tenantsSel={getDiosReglaTenantsSel(endpoint.id)}
                usuariosPorTenantSel={getDiosReglaUsuariosPorTenantSel(endpoint.id)}
                onTenantsChange={setDiosReglaTenantsSelFor}
                onUsuariosChange={setDiosReglaUsuariosPorTenantFor}
                resolveDominioSa={(saId) => resolveDominioTenatPorSa(dominioPorSaMap, saId)}
              />
            </div>
          );
        }
        if ((endpoint.id === 'tenant-crear-dios-reglas' || endpoint.id === 'tenant-actualizar-dios-reglas') && field.name === 'contexto') {
          return (
            <div key={field.name}>
              <Label>{field.label} {field.required ? '*' : ''}</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                disabled={!diosReglaAlcanceFormularioEditable(endpoint)}
                value={getFieldValue(endpoint.id, field.name)}
                onChange={(e) => setFieldValue(endpoint.id, field.name, e.target.value)}
              >
                <option value="">Por defecto (contexto view activo en servidor)</option>
                {contextos.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          );
        }
        if (
          (endpoint.id === 'tenant-crear-dios-reglas' || endpoint.id === 'tenant-actualizar-dios-reglas') &&
          (field.name === 'dominioTenatGlobales' || field.type === 'dominioDinamico')
        ) {
          const jwtSa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
          const selectedSa =
            getDiosReglaTenantsSel(endpoint.id)[0] ||
            getFieldValue(endpoint.id, 'tenantSuperAdmin').trim() ||
            jwtSa;
          const dominioResuelto =
            getFieldValue(endpoint.id, field.name).trim() ||
            resolveDominioTenatPorSa(dominioPorSaMap, selectedSa);
          const tenantsSelCount = getDiosReglaTenantsSel(endpoint.id).length;
          return (
            <div key={field.name}>
              <Label>{field.label}</Label>
              <Input
                className="mt-1 bg-muted/40 font-mono text-sm"
                readOnly
                disabled
                value={dominioResuelto}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Dominio apisDominios del tenant SuperAdmin seleccionado
                {tenantsSelCount > 1 ? ` (${tenantsSelCount} tenants con el mismo dominio)` : ''}.
                {!dominioResuelto ? ' El tenant no tiene apisDominios parametrizado.' : ''}
              </p>
            </div>
          );
        }
        if (
          (endpoint.id === 'tenant-crear-dios-reglas' || endpoint.id === 'tenant-actualizar-dios-reglas') &&
          field.name === 'securityPlatform'
        ) {
          const jwtSa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
          const selectedSa =
            getDiosReglaTenantsSel(endpoint.id)[0] ||
            getFieldValue(endpoint.id, 'tenantSuperAdmin').trim() ||
            jwtSa;
          const spAuto = resolverSecurityPlatformDesdeTenantSa(
            selectedSa,
            tenantSuperAdminsJerarquiaCounters,
            tenantGlobalSelects.nvlGeneracionTenant || [],
          );
          const spLabel = spAuto
            ? 'true — acceso libre / plataforma DIOS'
            : 'false — regla tenant (techo jerárquico)';
          return (
            <div key={field.name}>
              <Label>{field.label}</Label>
              <Input
                className="mt-1 bg-muted/40 font-mono text-sm"
                readOnly
                disabled
                value={spLabel}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Resuelto desde tenantsupertenants.nvlGeneracionTenant → generacionglobalnvlrolesconfigs.securityPlatform
                {selectedSa ? ` (tenant ${selectedSa.slice(-8)})` : ''}.
              </p>
            </div>
          );
        }
        if (
          (endpoint.id === 'perm-admin-tenant-global-desactivar' || endpoint.id === 'perm-admin-tenant-global-eliminar') &&
          (field.name === 'id' || field.name === 'tenantGlobal' || field.name === 'herenciaAsociada')
        ) {
          return null;
        }
        if (field.type === 'permisos') {
          if (
            endpoint.id === 'perm-admin-tenant-global' ||
            PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpoint.id) ||
            endpoint.id === 'tenant-crear-global-reglas' ||
            endpoint.id === 'tenant-actualizar-global-reglas'
          ) {
            return <div key={field.name}>{renderHerenciaSelectionBuilder(endpoint)}</div>;
          }
          return <div key={field.name}>{renderPermisosBuilder(endpoint)}</div>;
        }
        if (field.type === 'politicasRuntime') {
          const seleccionadas = getReglasPoliticasRuntimeSel(endpoint.id);
          const esReglasConCatalogoCompleto =
            endpoint.id === 'tenant-crear-global-reglas' ||
            endpoint.id === 'tenant-actualizar-global-reglas' ||
            endpoint.id === 'tenant-crear-dios-reglas' ||
            endpoint.id === 'tenant-actualizar-dios-reglas';
          const politicasDeshabilitadas =
            (endpoint.id === 'tenant-crear-dios-reglas' || endpoint.id === 'tenant-actualizar-dios-reglas') &&
            !diosReglaAlcanceFormularioEditable(endpoint)
            || consultaReglasGlobalesRamaCorporativo(endpoint.id);
          return (
            <div key={field.name} className="space-y-2">
              {esReglasConCatalogoCompleto ? (
                <p className="text-[11px] text-muted-foreground">
                  Listado de políticas runtime disponibles. Al guardar se envían exactamente las que marques en{' '}
                  <span className="font-mono">politicasRuntimeIds</span>, sin importar el SA seleccionado.
                </p>
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <Label>{field.label}</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    disabled={politicasDeshabilitadas || !politicasRuntimeCatalog.length}
                    onClick={() => {
                      setReglasPoliticasRuntimeSel((prev) => ({
                        ...prev,
                        [endpoint.id]: politicasRuntimeCatalog.map((p) => politicaRuntimeId(p)).filter(Boolean),
                      }));
                    }}
                  >
                    Todas
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    disabled={politicasDeshabilitadas || !seleccionadas.length}
                    onClick={() => setReglasPoliticasRuntimeSel((prev) => ({ ...prev, [endpoint.id]: [] }))}
                  >
                    Ninguna
                  </Button>
                </div>
              </div>
              <div className="space-y-1 rounded-md border border-border p-2">
                {!politicasRuntimeCatalog.length ? (
                  <p className="text-xs text-muted-foreground">Sin políticas runtime (recarga datos o crea políticas primero).</p>
                ) : (
                  politicasRuntimeCatalog.map((politica) => {
                    const id = politicaRuntimeId(politica);
                    if (!id) return null;
                    const efecto = String(politica.efecto || '').trim();
                    const tipo = String(politica.tipo || '').trim();
                    return (
                      <label
                        key={id}
                        className={`flex items-start gap-2 rounded px-1 py-0.5 text-xs ${politicasDeshabilitadas ? 'opacity-70' : 'cursor-pointer hover:bg-muted/60'}`}
                      >
                        <input
                          type="checkbox"
                          className="accent-emerald-600 mt-0.5 shrink-0"
                          checked={seleccionadas.some(
                            (sid) => sid === id || idsPermisoRefsCoinciden(sid, id),
                          )}
                          disabled={politicasDeshabilitadas}
                          onChange={(e) => toggleReglaPoliticaRuntime(endpoint.id, id, e.target.checked)}
                        />
                        <span className="min-w-0 leading-snug">
                          <span className="font-medium">{politicaRuntimeLabel(politica)}</span>
                          {(tipo || efecto) ? (
                            <span className="ml-1 text-[10px] text-muted-foreground">
                              {[tipo, efecto].filter(Boolean).join(' · ')}
                            </span>
                          ) : null}
                          <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">{id}</span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {seleccionadas.length
                  ? `${seleccionadas.length} política(s) se enviarán en politicasRuntimeIds al guardar la regla.`
                  : esReglasConCatalogoCompleto
                    ? 'Sin políticas marcadas: al guardar se enviará politicasRuntimeIds como arreglo vacío.'
                    : 'Opcional: vincula una o varias políticas runtime a la regla.'}
              </p>
            </div>
          );
        }
        if (endpoint.id === 'perm-usuario-tenant-global' && field.name === 'heredaGlobal') {
          const esSuperAdmin = actorEsTenantSuperAdmin();
          const esTenantGlobal = actorEsTenantGlobalScope();

          // â”€â”€ Rama: TenantGlobal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          if (esTenantGlobal) {
            const tgOptions = getTenantGlobalOptionsForPermUsuario();
            const tgSelected = getFieldValue(endpoint.id, 'tenantGlobalScope').trim()
              || String(tgOptions[0]?.id || '');
            const herenciasDisponibles = getHeredaOptionsPermitidasPorTenantGlobal(tgSelected);
            const hayHerencias = herenciasDisponibles.length > 0;
            return (
              <div key={field.name}>
                <Label>TenantGlobal *</Label>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                  value={tgSelected}
                  onChange={(e) => {
                    const nextTg = e.target.value;
                    setFieldValue(endpoint.id, 'tenantGlobalScope', nextTg);
                    setFieldValue(endpoint.id, 'heredaGlobal', '');
                    setUsuariosDestinoSel((prev) => ({ ...prev, [endpoint.id]: [] }));
                    if (nextTg) void sincronizarContextoTenantGlobalPermUsuario(endpoint.id, nextTg);
                  }}
                >
                  <option value="">{tgOptions.length ? 'Selecciona tenantGlobal' : 'Sin tenantGlobal asignado'}</option>
                  {tgOptions.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                </select>

                <Label className="mt-2 block">{field.label} {field.required ? '*' : ''}</Label>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                  value={getFieldValue(endpoint.id, field.name)}
                  onChange={(e) => setFieldValue(endpoint.id, field.name, e.target.value)}
                  disabled={!tgSelected}
                >
                  <option value="">
                    {!tgSelected
                      ? 'Selecciona tenantGlobal primero'
                      : hayHerencias
                      ? 'Selecciona herencia'
                      : 'Sin herencias para este tenantGlobal'}
                  </option>
                  {herenciasDisponibles.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
                </select>

                {(() => {
                  const selectedHereda = getFieldValue(endpoint.id, field.name).trim();
                  const corporativo = selectedHereda ? getCorporativoByHerencia(selectedHereda) : null;
                  if (!corporativo) return null;
                  return (
                    <div className="mt-2 rounded-md border border-border bg-muted/50 px-3 py-2">
                      <p className="text-xs font-medium text-muted-foreground">Corporativo asociado</p>
                      <p className="text-sm text-foreground">{corporativo}</p>
                    </div>
                  );
                })()}

                <p className="mt-1 text-xs text-muted-foreground">
                  {hayHerencias
                    ? 'Selecciona la herencia global a asignar.'
                    : tgSelected ? 'Este tenantGlobal no tiene herencias globales disponibles.' : ''}
                </p>
              </div>
            );
          }

          // â”€â”€ Rama: TenantGlobal (listado completo para SuperAdmin) â”€â”€â”€â”€â”€â”€
          const tgOptionsAll: HeredaGlobalOption[] = tenantGlobales.map((t) => ({ id: t.id, label: t.label }));
          const tsaSelected = getFieldValue(endpoint.id, 'tenantGlobalScope').trim()
            || String(tgOptionsAll[0]?.id || '');
          const herenciasDisponibles = getHeredaOptionsPermitidasPorTenantGlobal(tsaSelected);
          const hayHerencias = herenciasDisponibles.length > 0;
          return (
            <div key={field.name}>
              <Label>TenantGlobal *</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                value={tsaSelected}
                  onChange={(e) => {
                    const nextTg = e.target.value;
                    if (!nextTg) {
                      setFieldValue(endpoint.id, 'tenantGlobalScope', '');
                      setFieldValue(endpoint.id, 'heredaGlobal', '');
                      setUsuariosDestinoSel((prev) => ({ ...prev, [endpoint.id]: [] }));
                      setCatalogSelectionFor(endpoint.id, { vistas: [], acciones: [] });
                      return;
                    }
                    void sincronizarContextoTenantGlobalPermUsuario(endpoint.id, nextTg);
                  }}
                  disabled={!esSuperAdmin}
              >
                <option value="">{esSuperAdmin ? 'Selecciona tenantGlobal' : 'Sin acceso'}</option>
                {tgOptionsAll.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
              </select>

              <Label className="mt-2 block">{field.label} {field.required ? '*' : ''}</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                value={getFieldValue(endpoint.id, field.name)}
                onChange={(e) => setFieldValue(endpoint.id, field.name, e.target.value)}
                disabled={!esSuperAdmin || !hayHerencias}
              >
                <option value="">
                  {!esSuperAdmin ? 'Sin acceso' : !tsaSelected ? 'Selecciona tenantGlobal primero' : hayHerencias ? 'Selecciona herencia parametrizada' : 'Sin herencias parametrizadas disponibles'}
                </option>
                {herenciasDisponibles.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
              </select>

              {(() => {
                const selectedHereda = getFieldValue(endpoint.id, field.name).trim();
                const { vistasCatalogo: vcSuite } = selectedHereda ? getPermisosCatalog(endpoint.id) : { vistasCatalogo: [] };
                const vistaIdsEnHerencia = new Set(vcSuite.map((v) => v.id));
                // Suites que contengan al menos un nodo (cualquier tipo) cuyo _id estÃ© en las vistas de la herencia
                const suitesConJerarquia = rutasJerarquia.filter((s) => {
                  if (!Array.isArray(s.children) || s.children.length === 0) return false;
                  if (!selectedHereda) return false;
                  if (vistaIdsEnHerencia.size === 0) return false;
                  return collectAllNodes(s.children).some((node) => vistaIdsEnHerencia.has(String(node._id)));
                });
                const suiteDisabled = !esSuperAdmin || !tsaSelected || !selectedHereda;
                return (
                  <>
                    <Label className="mt-2 block">Suite</Label>
                    <select
                      className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                      value={suiteSelByEndpoint[endpoint.id] || ''}
                      onChange={(e) => {
                        applySuiteCatalogSelection(endpoint.id, e.target.value);
                      }}
                      disabled={suiteDisabled}
                    >
                      <option value="">
                        {!esSuperAdmin
                          ? 'Sin acceso'
                          : !tsaSelected
                          ? 'Selecciona tenantSuperAdmin primero'
                          : !selectedHereda
                          ? 'Selecciona primero una herencia'
                          : suitesConJerarquia.length
                          ? 'Selecciona suite para filtrar vistas'
                          : 'Sin suites con jerarquÃ­a disponibles'}
                      </option>
                      {suitesConJerarquia.map((suite) => (
                        <option key={getEntityId(suite)} value={getEntityId(suite)}>{suite.name}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {!esSuperAdmin
                        ? 'Sin acceso de ejecuciÃ³n.'
                        : !selectedHereda
                        ? 'Elige primero la herencia global para habilitar el filtro por suite.'
                        : 'Filtra las vistas por suite y mÃ³dulo segÃºn la herencia seleccionada.'}
                    </p>
                  </>
                );
              })()}
            </div>
          );
        }
        if (field.name === 'tenantGlobal' || field.name === 'tenantGlobalId') {
          if (
            (endpoint.id === 'perm-admin-tenant-global' || PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpoint.id)) &&
            field.name === 'tenantGlobal'
          ) {
            const tenantOptions = getTenantGlobalOptions(endpoint.id);
            const scopeOpts = tenantOptions.filter((t) => isTenantSuperAdminScopeOption(String(t.id)));
            const tgOpts = tenantOptions.filter((t) => !isTenantSuperAdminScopeOption(String(t.id)));
            const current = getFieldValue(endpoint.id, field.name).trim();
            const scopeVal = isTenantSuperAdminScopeOption(current) ? current : '';
            const tgVal = current && !isTenantSuperAdminScopeOption(current) ? current : '';
            const actorRolJwt = String(tenantGlobalActor?.rol || '').trim();
            const actorTsaJwt = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
            const actorTgJwt = String(tenantGlobalActor?.tenantGlobalId || '').trim();
            const actorTcJwt = String(tenantGlobalActor?.tenantCorporativoId || '').trim();
            const usarComboJerarquiaUnificado =
              endpoint.id === 'perm-admin-tenant-global-actualizar-sa' ||
              (PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpoint.id) &&
                ENDPOINT_IDS_SELECT_MULTI_SA_JERARQUIA.has(endpoint.id));
            const ocultarSelectorSuperAdmin =
              endpoint.id === 'perm-admin-tenant-global-actualizar-tg';
            if (usarComboJerarquiaUnificado) {
              return (
                <div key={field.name} className="space-y-3">
                  <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/50 p-3">
                    <Label className="text-foreground">Tenant global / rama SuperAdmin</Label>
                    <p className="mb-2 text-[11px] text-muted-foreground">
                      Elige la rama Tenant SuperAdmin (sesión DIOS) o un tenant global. Al seleccionar se listan herencias
                      y el catálogo de vistas para actualizar permisos.
                    </p>
                    <select
                      className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={current}
                      onChange={(e) => applyPermAdminTenantGlobalSelection(endpoint.id, field.name, e.target.value)}
                    >
                      <option value="">— Selecciona tenant SuperAdmin o global —</option>
                      {renderTenantGlobalSelectOptionGroups(
                        tenantOptions,
                        resolveSaJerarquiaMetasVisibles(endpoint.id),
                      )}
                    </select>
                  </div>
                  {(actorRolJwt || actorTsaJwt || actorTgJwt || actorTcJwt) ? (
                    <p className="text-xs text-muted-foreground">
                      {`JWT: ${actorRolJwt || 'SIN_ROL'} | TSA:${actorTsaJwt || '-'} | TG:${actorTgJwt || '-'} | TC:${actorTcJwt || '-'}`}
                    </p>
                  ) : null}
                  {!loadingData && tenantOptions.length === 0 ? (
                    <p className="text-xs text-amber-700">
                      No hay opciones de tenant cargadas. Pulsa Recargar datos API.
                    </p>
                  ) : null}
                </div>
              );
            }
            return (
              <div key={field.name} className="space-y-4">
                {scopeOpts.length > 0 && !ocultarSelectorSuperAdmin ? (
                  <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 p-3">
                    <Label className="text-foreground">Tenant SuperAdmin (jerarquía)</Label>
                    <p className="mb-2 text-[11px] text-muted-foreground">
                      Cada opción es un tenantSuperTenant del árbol; el usuario RegisUsu enlazado usa perfilSuperAdmin (metadatos en counters).
                    </p>
                    <select
                      className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={scopeVal}
                      onChange={(e) => applyPermAdminTenantGlobalSelection(endpoint.id, field.name, e.target.value)}
                    >
                      <option value="">— Ninguno: elige «Tenant global» abajo —</option>
                      {scopeOpts.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                    {(() => {
                      if (!scopeVal || !isTenantSuperAdminScopeOption(scopeVal)) return null;
                      const saId = scopeVal.slice(TENANT_SUPERADMIN_SCOPE_PREFIX.length);
                      const meta = tenantSuperAdminsJerarquiaCounters.find((x) => String(x.id) === saId);
                      if (!meta?.usuarioNombre && !meta?.usuarioCorreo) return null;
                      return (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Usuario del SuperAdmin (RegisUsu · perfilSuperAdmin):{' '}
                          <span className="font-medium text-foreground">
                            {[meta.codigoJerarquia, meta.usuarioNombre, meta.usuarioCorreo].filter(Boolean).join(' · ')}
                          </span>
                        </p>
                      );
                    })()}
                  </div>
                ) : null}
                <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/50 p-3">
                  <Label className="text-foreground">Tenant global (empresa)</Label>
                  <p className="mb-2 text-[11px] text-muted-foreground">
                    Documentos tenantGlobal; al seleccionar se listan herencias y en el detalle: usuario, perfilGlobal y perfilSuperAdmin cuando existan.
                  </p>
                  <select
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={tgVal}
                    onChange={(e) => applyPermAdminTenantGlobalSelection(endpoint.id, field.name, e.target.value)}
                  >
                    <option value="">— Selecciona tenant global —</option>
                    {tgOpts.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
                {(actorRolJwt || actorTsaJwt || actorTgJwt || actorTcJwt) ? (
                  <p className="text-xs text-muted-foreground">
                    {`JWT: ${actorRolJwt || 'SIN_ROL'} | TSA:${actorTsaJwt || '-'} | TG:${actorTgJwt || '-'} | TC:${actorTcJwt || '-'}`}
                  </p>
                ) : null}
                {!loadingData && tenantOptions.length === 0 ? (
                  <p className="text-xs text-amber-700">
                    No hay opciones de tenant cargadas. Pulsa Recargar datos API.
                  </p>
                ) : null}
              </div>
            );
          }
          const tenantOptions = getTenantGlobalOptions(endpoint.id);
          const actorRolJwt = String(tenantGlobalActor?.rol || '').trim();
          const actorTsaJwt = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
          const actorTgJwt = String(tenantGlobalActor?.tenantGlobalId || '').trim();
          const actorTcJwt = String(tenantGlobalActor?.tenantCorporativoId || '').trim();
          return (
            <div key={field.name}>
              <Label>{field.label} {field.required ? '*' : ''}</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                disabled={
                  endpoint.id === 'tenant-crear-global-reglas' &&
                  !endpointDisponibleParaScope(endpoint)
                }
                value={getFieldValue(endpoint.id, field.name)}
                onChange={(e) => {
                  const v = e.target.value;
                  setFieldValue(endpoint.id, field.name, v);
                  if (endpoint.id === 'tenant-crear-global-reglas') {
                    setFieldValue(endpoint.id, 'reglaPlantillaId', '');
                    setCatalogSelectionFor(endpoint.id, { vistas: [], acciones: [] });
                    setPermisos(endpoint.id, [{ vistaId: '', accionId: [] }]);
                  }
                  const trimmed = v.trim();
                  if (
                    endpoint.id === 'tenant-crear-global-reglas' &&
                    trimmed &&
                    !isTenantSuperAdminScopeOption(trimmed)
                  ) {
                    aplicarUsuariosDesdeJerarquiaRef(endpoint.id, trimmed);
                    void cargarUsuariosParaEndpoint(endpoint.id, trimmed);
                  }
                }}
              >
                <option value="">
                  {loadingData ? 'Cargando tenants...' : 'Selecciona tenant'}
                </option>
                {tenantOptions.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              {endpoint.id === 'tenant-crear-global-reglas' ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {saJerarquiaConCorporativo
                    ? 'Jerarquía con corporativo en counters: solo tenant globales de tu rama SA (codigoPadre).'
                    : 'SA sin corporativo en counters (rama sin codigoPadre / modo libre): ves todos los tenant globales existentes y sus sub-ramas materializadas.'}
                </p>
              ) : null}
              {(() => {
                const tgSel = getFieldValue(endpoint.id, field.name).trim();
                if (!tgSel || !isTenantSuperAdminScopeOption(tgSel)) return null;
                const saId = tgSel.startsWith(TENANT_SUPERADMIN_SCOPE_PREFIX)
                  ? tgSel.slice(TENANT_SUPERADMIN_SCOPE_PREFIX.length)
                  : '';
                const meta = tenantSuperAdminsJerarquiaCounters.find((x) => String(x.id) === saId);
                if (!meta?.usuarioNombre && !meta?.usuarioCorreo) return null;
                return (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Usuario del SuperAdmin seleccionado (RegisUsu · perfilSuperAdmin):{' '}
                    <span className="font-medium text-foreground">
                      {[meta.usuarioNombre, meta.usuarioCorreo].filter(Boolean).join(' · ')}
                    </span>
                  </p>
                );
              })()}
              {(endpoint.id === 'tenant-crear-global-reglas')
                ? (() => {
                  const tgSelLoc = getFieldValue(endpoint.id, field.name).trim();
                  const esTgReal = tgSelLoc && !isTenantSuperAdminScopeOption(tgSelLoc);
                  const listaLoc = usuariosDisponibles[endpoint.id] || [];
                  const cargandoLoc = !!loadingUsuarios[endpoint.id];
                  const soloConsulta = !endpointDisponibleParaScope(endpoint);
                  if (esTgReal) {
                    return (
                      <div className="mt-2 space-y-1 rounded-md border border-violet-100 bg-violet-50/70 px-2 py-1.5">
                        <p className="text-[11px] font-semibold text-violet-900">
                          Usuarios en la rama de este tenant global
                          {soloConsulta ? (
                            <span className="ml-1 font-normal text-muted-foreground">(solo consulta)</span>
                          ) : null}
                        </p>
                        <p className="text-[11px] text-violet-950/90">
                          {cargandoLoc && listaLoc.length === 0
                            ? 'Sincronizando lista con el organigrama…'
                            : `${listaLoc.length} usuario${listaLoc.length === 1 ? '' : 's'} de tenant global en esta rama (sin rama SuperAdmin del árbol ni roles DIOS/SuperAdmin). Nombre/apellidos si hay perfil en jerarquía; si no, correo.`}
                        </p>
                        {listaLoc.length > 0 ? (
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {listaLoc
                              .slice(0, 5)
                              .map((u) => u.label)
                              .join(' · ')}
                            {listaLoc.length > 5 ? ` · +${listaLoc.length - 5} más` : ''}
                          </p>
                        ) : null}
                        <details className="text-[10px] text-muted-foreground">
                          <summary className="cursor-pointer text-foreground/80">Detalle técnico (alcance JWT / counters)</summary>
                          <p className="mt-1">
                            Mismas ramas que «Usuarios tenant»:{' '}
                            <code className="rounded bg-muted px-0.5">tenantScope</code> y TG desde{' '}
                            <code className="rounded bg-muted px-0.5">tenantJerarquiaCountersGlobal</code>, sub–TG en árbol.
                          </p>
                        </details>
                      </div>
                    );
                  }
                  return (
                    <>
                      <details className="mt-1 text-xs text-muted-foreground">
                        <summary className="cursor-pointer font-medium text-foreground">Nota: jerarquía tenant global</summary>
                        <p className="mt-1">
                          Al elegir un tenant global concreto se listan aquí los usuarios de esa rama (mismo criterio que «Usuarios tenant»).
                        </p>
                      </details>
                      {tenantSuperAdminsJerarquiaCounters.length > 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">SuperAdmin (tenantSuperTenant / selects): </span>
                          {tenantSuperAdminsJerarquiaCounters.map((s) =>
                            s.usuarioNombre
                              ? `${s.codigoJerarquia || 'SA'} · ${s.usuarioNombre}${s.usuarioCorreo ? ` (${s.usuarioCorreo})` : ''}`
                              : s.label
                          ).join(' · ')}
                        </p>
                      ) : null}
                    </>
                  );
                })()
                : null}
              {endpoint.id === 'tenant-crear-global-reglas'
                ? (() => {
                    const tgSel = getFieldValue(endpoint.id, field.name).trim();
                    const esTgReal = Boolean(tgSel && !isTenantSuperAdminScopeOption(tgSel));
                    const opcionesReglas = getReglasFiltradasPorTenant(endpoint.id);
                    const plantillaVal = getFieldValue(endpoint.id, 'reglaPlantillaId').trim();
                    return (
                      <div className="mt-2 space-y-1 rounded-md border border-sky-100 bg-sky-50/70 px-2 py-2">
                        <Label className="text-xs font-semibold text-sky-950">
                          Reglas ya creadas para este tenant global
                        </Label>
                        <select
                          className="mt-0.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          value={plantillaVal}
                          disabled={!esTgReal || loadingData}
                          onChange={(e) => {
                            const next = e.target.value.trim();
                            setFieldValue(endpoint.id, 'reglaPlantillaId', next);
                            if (next) applyRuleToForm(endpoint.id, next);
                          }}
                        >
                          <option value="">
                            {!esTgReal
                              ? 'Selecciona un tenant global (ID Mongo) para ver sus reglas'
                              : opcionesReglas.length === 0
                                ? 'No hay reglas «view» en catálogo para este tenant — puedes crear una nueva'
                                : 'Opcional: elige una regla para copiar contexto y permisos al formulario'}
                          </option>
                          {opcionesReglas.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] leading-snug text-muted-foreground">
                          Misma fuente que{' '}
                          <span className="font-medium text-foreground">GET /api/config/tenant/listar/reglas</span>, filtrada
                          por el tenant elegido. No envía el id al crear: solo rellena contexto y permisos; el POST crea una
                          regla nueva.
                        </p>
                      </div>
                    );
                  })()
                : null}
              {!loadingData && tenantOptions.length === 0 ? (
                <p className="mt-1 text-xs text-amber-700">
                  No hay tenants globales cargados. Pulsa "Recargar datos API".
                </p>
              ) : null}
            </div>
          );
        }
        if (field.name === 'herenciaAsociada' && PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpoint.id)) {
          const options = herenciaAsociadaOptionsByEndpoint[endpoint.id] || [];
          const tenantGlobalSelected = getFieldValue(endpoint.id, 'tenantGlobal').trim();
          const selectedId = getFieldValue(endpoint.id, field.name).trim();
          const selectedRow = (herenciaAsociadaDataByEndpoint[endpoint.id] || {})[selectedId];
          const selectedFuente = String(selectedRow?.fuenteHerencia || 'tenantGlobal').trim();
          return (
            <div key={field.name}>
              <Label>{field.label} {field.required ? '*' : ''}</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                value={getFieldValue(endpoint.id, field.name)}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setFieldValue(endpoint.id, field.name, nextId);
                  applyHerenciaAsociadaSelection(endpoint.id, nextId);
                }}
                disabled={!tenantGlobalSelected}
              >
                <option value="">
                  {!tenantGlobalSelected
                    ? 'Selecciona tenant global primero'
                    : options.length
                    ? 'Selecciona herencia'
                    : 'Sin herencias asociadas'}
                </option>
                {options.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              {selectedId ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Fuente heredada:{' '}
                  <span className="font-semibold">
                    {selectedFuente === 'regla'
                      ? 'catálogo de reglas (vista previa; no es documento herencia)'
                      : selectedFuente === 'tenantSuperAdmin'
                        ? 'tenantSuperAdmin (DIOS)'
                        : 'tenantGlobal'}
                  </span>
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={!tenantGlobalSelected || loadingData}
                  onClick={() => {
                    const tg = getFieldValue(endpoint.id, 'tenantGlobal').trim();
                    if (!tg) {
                      toast.warning('Selecciona un tenant SuperAdmin o global primero.');
                      return;
                    }
                    void fetchHerenciasAsociadasByTenantGlobal(endpoint.id, tg, null, { notify: true });
                  }}
                >
                  Validar con servidor
                </Button>
                <span className="text-[11px] text-muted-foreground">
                  También se sincroniza al volver a esta pestaña, si cambia el catálogo de reglas, y cada ~45s con el
                  modal abierto (vistas/acciones desde servidor, sin marcar checks a mano).
                </span>
              </div>
            </div>
          );
        }
        if (field.name === 'tenantCorporativo' && endpoint.id === 'perm-admin-tenant-global') {
          const options = herenciaAsociadaOptionsByEndpoint[endpoint.id] || [];
          const tenantGlobalSelected = getFieldValue(endpoint.id, 'tenantGlobal').trim();
          const selectedId = getFieldValue(endpoint.id, 'herenciaAsociada').trim();
          return (
            <div key={field.name}>
              <Label>Herencia asociada</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                value={selectedId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setFieldValue(endpoint.id, 'herenciaAsociada', nextId);
                  const row = (herenciaAsociadaDataByEndpoint[endpoint.id] || {})[nextId];
                  const tc = String(row?.tenantCorporativo?._id || row?.tenantCorporativo || '').trim();
                  setFieldValue(endpoint.id, 'tenantCorporativo', tc);
                  applyHerenciaAsociadaSelection(endpoint.id, nextId);
                }}
                disabled={!tenantGlobalSelected}
              >
                <option value="">
                  {!tenantGlobalSelected
                    ? 'Selecciona tenant global primero'
                    : options.length
                    ? 'Selecciona herencia asociada'
                    : 'Sin herencias asociadas'}
                </option>
                {options.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              {endpoint.id !== 'perm-admin-tenant-global' && (
                <>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Se usa la herencia como base de vistas y acciones para parametrizar.
                  </p>
                  {renderHerenciaAsociadaDetalle(endpoint.id)}
                </>
              )}
            </div>
          );
        }
        if (field.name === 'tenantCorporativo' && PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpoint.id)) {
          const options = getTenantCorporativoOptions(endpoint.id);
          const tenantGlobalSelected = getFieldValue(endpoint.id, 'tenantGlobal').trim();
          const loadingCorp = !!tenantCorpLoadingByEndpoint[endpoint.id];
          const tenantCorpError = String(tenantCorpErrorByEndpoint[endpoint.id] || '').trim();
          return (
            <div key={field.name}>
              <Label>{field.label} {field.required ? '*' : ''}</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                value={getFieldValue(endpoint.id, field.name)}
                onChange={(e) => {
                  setFieldValue(endpoint.id, field.name, e.target.value);
                  setSyncInfoByEndpoint((prev) => ({ ...prev, [endpoint.id]: null }));
                }}
                disabled={!tenantGlobalSelected}
              >
                <option value="">
                  {loadingCorp ? 'Cargando corporativos...' : 'Sin tenant corporativo'}
                </option>
                {options.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Opcional. Si seleccionas tenant corporativo, se usa bajo el tenant global elegido.
              </p>
              {tenantCorpError ? (
                <p className="mt-1 text-xs text-rose-700">
                  Error cargando corporativos: {tenantCorpError}
                </p>
              ) : null}
            </div>
          );
        }
        if (field.name === 'contextoDefi') {
          const soloContextoViewTenant =
            endpoint.id === 'tenant-crear-global-reglas' || endpoint.id === 'tenant-actualizar-global-reglas';
          const opcionesBase = soloContextoViewTenant
            ? contextos.filter((c) => String(c.tipoContexto || '').toLowerCase() === 'view')
            : contextos;
          const ctxRaw = getFieldValue(endpoint.id, field.name).trim();
          const ruleIdCtx = getFieldValue(endpoint.id, 'x-regla-id').trim();
          const ruleCtx = ruleIdCtx ? ruleCatalog[ruleIdCtx] : null;
          const ctxDesdeRegla = ruleCtx ? resolveContextoIdFromRegla(ruleCtx, contextos) : '';
          const opcionesCtx = [...opcionesBase];
          const ensureCtxOption = (id: string) => {
            const norm = normalizePermisoRefId(id);
            if (!norm) return;
            if (opcionesCtx.some((c) => c.id === norm || idsPermisoRefsCoinciden(c.id, norm))) return;
            opcionesCtx.push({ id: norm, label: `Contexto regla | ${norm}`, tipoContexto: 'view' });
          };
          if (ctxDesdeRegla) ensureCtxOption(ctxDesdeRegla);
          if (ctxRaw) ensureCtxOption(ctxRaw);
          const ctxResolved =
            opcionesCtx.find((c) => c.id === ctxRaw || idsPermisoRefsCoinciden(c.id, ctxRaw))?.id ||
            ctxDesdeRegla ||
            ctxRaw;
          return (
            <div key={field.name}>
              <Label>{field.label} {field.required ? '*' : ''}</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                value={ctxResolved}
                onChange={(e) => setFieldValue(endpoint.id, field.name, e.target.value)}
              >
                <option value="">Selecciona contexto</option>
                {opcionesCtx.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              {soloContextoViewTenant ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Solo contexto <span className="font-medium text-foreground">view</span> (tenant global / interfaz). No se ofrece{' '}
                  <span className="font-medium text-foreground">api</span> en este flujo.
                </p>
              ) : null}
              {soloContextoViewTenant && opcionesCtx.length === 0 ? (
                <p className="mt-1 text-xs text-amber-700">
                  No hay contextos «view» activos. Comprueba parametrización de contextos o recarga datos API.
                </p>
              ) : null}
            </div>
          );
        }
        if (endpoint.id === 'tenant-actualizar-global' && field.name === 'id') {
          const actorEsTenantSuperAdminScope = actorEsTenantSuperAdmin();
          const actorEsTenantGlobal = actorEsTenantGlobalScope();
          return (
            <div key={field.name}>
              <Label>{field.label} {field.required ? '*' : ''}</Label>
              <select
                className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm"
                value={getFieldValue(endpoint.id, field.name)}
                onChange={(e) => {
                  tenantActualizarLoadedIdRef.current = '';
                  setFieldValue(endpoint.id, field.name, e.target.value);
                }}
              >
                <option value="">
                  {loadingData ? 'Cargando opciones...' : 'Selecciona tenant a actualizar'}
                </option>
                {tenantUpdateTargets.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                {actorEsTenantSuperAdminScope
                  ? 'Scope tenantSuperAdmin: puedes seleccionar nodos tenantSuperAdmin, tenantGlobal y tenantCorporativo visibles.'
                  : actorEsTenantGlobal
                  ? 'Scope tenantGlobal: solo puedes seleccionar tu tenantGlobal y sus nodos corporativos descendientes.'
                  : 'El listado se resuelve desde tu scope actual.'}
              </p>
              {!loadingData && !tenantUpdateTargets.length ? (
                <p className="mt-1 text-xs text-amber-700">
                  No hay tenants disponibles para actualizar con tu scope actual.
                </p>
              ) : null}
              {tenantActualizarPrefillLoading ? (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Cargando parametros del tenant...
                </p>
              ) : null}
            </div>
          );
        }
        const usesTenantGlobalSelects =
          (
            endpoint.id === 'tenant-crear-global-usuario' ||
            endpoint.id === 'tenant-crear-global-admin' ||
            esEndpointCreacionSaDocumento(endpoint.id) ||
            endpoint.id === 'tenant-actualizar-global'
          ) &&
          ['tipo_tenant', 'ownerType', 'nvlGeneracionTenant', 'apisDominios', 'apis', 'accionesUsu', 'rolesMabs', 'coporativo', 'tenantGlobalRef'].includes(field.name);
        if (usesTenantGlobalSelects) {
          const options = tenantGlobalSelects[field.name] || [];
          const actorEsTenantGlobal = actorEsTenantGlobalScope();
          const actorEsTenantCorporativo = actorEsTenantCorporativoScope();
          const selectedNvl = getFieldValue(endpoint.id, 'nvlGeneracionTenant').trim();
          const selectedNvlOpt = (tenantGlobalSelects.nvlGeneracionTenant || []).find((opt) => opt.id === selectedNvl);
          const nvlLabel = selectedNvlOpt?.label || '';
          const nvlMeta = (selectedNvlOpt as GenericSelectOption & { meta?: Record<string, string> })?.meta;
          const nvlResolved = resolverNvlGeneracionMeta(selectedNvlOpt);
          const nvlMetaNum = String(nvlMeta?.nvl ?? '').trim();
          const nvlTexto = String(nvlLabel).toLowerCase();
          const nvlMetaEsCero = nvlResolved.esLibre;
          const nvlEsLibre = nvlResolved.esLibre;
          const nvlEsTenantGlobal = nvlResolved.esTenantGlobal;
          const nvlEsTenantCorporativo = nvlResolved.esTenantCorporativo;
          /**
           * NVL 0 (LIBRE/DIOS): corporativo solo si scope tenantSuperAdmin — jerarquía/secuencia las resuelve el backend.
           * NVL 1/2: si el SA ya tiene corporativo en counters → no pedir selector; si no → listar opciones.
           */
          const nvlPermiteCorporativo =
            nvlEsTenantGlobal ||
            nvlEsTenantCorporativo ||
            (nvlMetaEsCero && actorEsTenantSuperAdmin());
          const corporativoResueltoJerarquiaSa =
            esNvl12ParametrosResueltosDesdeJwt(
              endpoint.id,
              selectedNvl,
              tenantGlobalSelects.nvlGeneracionTenant || [],
              saJerarquiaConCorporativo,
              actorEsTenantSuperAdmin(),
            );

          if (field.name === 'tipo_tenant' && corporativoResueltoJerarquiaSa) {
            return null;
          }

          if (field.name === 'coporativo' && corporativoResueltoJerarquiaSa) {
            const autoCorpId =
              String(tenantGlobalActor?.corporativoJerarquiaAutoId || '').trim() ||
              String(getFieldValue(endpoint.id, 'coporativo') || '').trim() ||
              (tenantGlobalSelects.coporativo?.length === 1
                ? String(tenantGlobalSelects.coporativo[0]?.id || '').trim()
                : '');
            const autoCorpLabel =
              tenantGlobalSelects.coporativo?.find((o) => o.id === autoCorpId)?.label || autoCorpId;
            if (!autoCorpLabel) return null;
            return (
              <div key={field.name}>
                <p className="mt-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  Se usará: <span className="font-medium">{autoCorpLabel}</span>
                </p>
              </div>
            );
          }
          const nvlBloqueaRolDios =
            endpoint.id !== 'tenant-crear-global-usuario' &&
            (nvlEsTenantGlobal || nvlEsTenantCorporativo);
          const actorEsTenantSuperAdminScope = actorEsTenantSuperAdmin();
          const actorEsTenantGlobalPuro = actorEsTenantGlobal && !actorEsTenantSuperAdminScope;
          const opcionesRolesPorNivel = field.name === 'rolesMabs'
            ? (tenantGlobalSelects.rolesMabs || [])
            : options;
          const optionsRoles = field.name === 'rolesMabs'
            ? opcionesRolesPorNivel.filter((opt) => !nvlBloqueaRolDios || String(opt.rol || '').toUpperCase() !== 'DIOS')
            : opcionesRolesPorNivel;
          const ownerTypeBloqueadoPorScope =
            endpoint.id === 'tenant-actualizar-global' &&
            field.name === 'ownerType' &&
            !actorEsTenantSuperAdmin();
          const filtrarNivelesPorScope = (opts: GenericSelectOption[]): GenericSelectOption[] => {
            const filtered = opts.filter((opt) => {
              const { esLibre, esTenantCorporativo } = resolverNvlGeneracionMeta(opt);

              if (actorEsTenantSuperAdmin()) {
                return true;
              }
              if (actorEsTenantGlobal) return !esLibre;
              if (actorEsTenantCorporativo) return esTenantCorporativo;
              return !esLibre;
            });
            if (filtered.length > 0) return filtered;
            const sinLibre = opts.filter((opt) => !resolverNvlGeneracionMeta(opt).esLibre);
            return sinLibre.length > 0 ? sinLibre : opts;
          };
          const optionsNivelPorScope =
            field.name === 'nvlGeneracionTenant' ? filtrarNivelesPorScope(options) : options;
          const optionsFiltradas = field.name === 'coporativo'
            ? endpoint.id === 'tenant-crear-global-usuario'
              ? options
              : nvlPermiteCorporativo
                ? options
                : []
            : field.name === 'nvlGeneracionTenant'
            ? optionsNivelPorScope
            : field.name === 'tenantGlobalRef'
            ? endpoint.id === 'tenant-crear-global-usuario'
              ? actorEsTenantSuperAdminScope || actorEsTenantGlobal
                ? options
                : []
              : nvlEsTenantCorporativo
                ? options
                : []
            : optionsRoles;
          const disabled =
            field.name === 'coporativo'
              ? endpoint.id === 'tenant-crear-global-usuario'
                ? false
                : corporativoResueltoJerarquiaSa
                  ? true
                  : !selectedNvl || !nvlPermiteCorporativo
              : field.name === 'tenantGlobalRef'
              ? endpoint.id === 'tenant-crear-global-usuario'
                ? actorEsTenantGlobalPuro
                : !selectedNvl || !nvlEsTenantCorporativo || actorEsTenantGlobalPuro
              : ownerTypeBloqueadoPorScope
              ? true
              : false;
          const isAccionUsuarioMulti =
            field.name === 'accionesUsu' &&
            (
              endpoint.id === 'tenant-crear-global-usuario' ||
              esEndpointCreacionSaDocumento(endpoint.id) ||
              endpoint.id === 'tenant-actualizar-global'
            );
          const selectedMultiValues = isAccionUsuarioMulti
            ? getFieldValue(endpoint.id, field.name).split(',').map((v) => v.trim()).filter(Boolean)
            : [];
          const currentFieldValue = getFieldValue(endpoint.id, field.name);
          const prefillLabels = tenantActualizarLabelsRef.current;
          const optionsRender =
            endpoint.id === 'tenant-actualizar-global' &&
            ['tipo_tenant', 'apisDominios', 'rolesMabs', 'nvlGeneracionTenant'].includes(field.name)
              ? mergeSelectOptionForValue(optionsFiltradas, currentFieldValue, prefillLabels[field.name])
              : optionsFiltradas;
          const selectsLoading =
            loadingData || (endpoint.id === 'tenant-actualizar-global' && tenantActualizarPrefillLoading);

          return (
            <div key={field.name}>
              <Label>{field.label} {field.required ? '*' : ''}</Label>
              {isAccionUsuarioMulti ? (
                <div className="mt-1 rounded-lg border border-input bg-card p-2">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setFieldValue(endpoint.id, field.name, optionsRender.map((opt) => opt.id).join(','))}
                    >
                      Seleccionar todas
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setFieldValue(endpoint.id, field.name, '')}
                    >
                      Limpiar
                    </Button>
                    <span className="ml-auto rounded bg-muted px-2 py-1 text-xs text-foreground">
                      Seleccionadas: {selectedMultiValues.length}
                    </span>
                  </div>
                  <div className="max-h-40 overflow-auto rounded-md border border-border bg-muted/50 p-2">
                    {optionsRender.map((opt) => {
                      const checked = selectedMultiValues.includes(opt.id);
                      return (
                        <label key={opt.id} className="mb-1 flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-card">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const set = new Set(selectedMultiValues);
                              if (e.target.checked) set.add(opt.id);
                              else set.delete(opt.id);
                              setFieldValue(endpoint.id, field.name, Array.from(set).join(','));
                            }}
                          />
                          <span>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <select
                  className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm shadow-sm transition-colors ${
                    field.name === 'nvlGeneracionTenant'
                      ? 'border-rose-300 bg-rose-50/60 font-medium text-foreground focus:border-rose-400'
                      : 'border-input bg-card'
                  }`}
                  value={getFieldValue(endpoint.id, field.name)}
                  onChange={(e) => {
                    setFieldValue(endpoint.id, field.name, e.target.value);
                    if (field.name === 'nvlGeneracionTenant') {
                      const nextOpt = (tenantGlobalSelects.nvlGeneracionTenant || []).find((opt) => opt.id === e.target.value);
                      const nextNvl = resolverNvlGeneracionMeta(nextOpt);
                      const nextNvlEsLibre = nextNvl.esLibre;
                      const nextNvlEsTenantCorporativo = nextNvl.esTenantCorporativo;
                      setFieldValue(endpoint.id, 'coporativo', '');
                      if (actorEsTenantGlobalPuro && nextNvlEsTenantCorporativo) {
                        const autoRef = String(tenantGlobalActor?.tenantGlobalId || '').trim();
                        setFieldValue(endpoint.id, 'tenantGlobalRef', autoRef);
                      } else {
                        setFieldValue(endpoint.id, 'tenantGlobalRef', '');
                      }
                      if (nextNvlEsLibre) setFieldValue(endpoint.id, 'ownerType', '');
                    }
                    if (field.name === 'coporativo') {
                    }
                  }}
                  disabled={disabled}
                >
                  <option value="">
                    {selectsLoading ? 'Cargando opciones...' : `Selecciona ${field.label.toLowerCase()}`}
                  </option>
                  {optionsRender.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              )}
              {field.name === 'nvlGeneracionTenant' ? (
                <p className="mt-1 text-xs text-rose-700">
                  Modelo 3:3 — una config activa por catálogo NVL (0/1/2) en{' '}
                  <span className="font-semibold">generacionglobalnvlrolesconfigs</span>.
                  {!selectsLoading ? (
                    <>
                      {' '}
                      Configs activas: {(tenantGlobalSelects.nvlGeneracionTenant || []).length} · visibles: {optionsRender.length}
                    </>
                  ) : null}
                </p>
              ) : null}
              {isAccionUsuarioMulti ? <p className="mt-1 text-xs text-muted-foreground">Selecciona una o varias acciones.</p> : null}
              {!selectsLoading && optionsRender.length === 0 ? (
                <p className="mt-1 text-xs text-amber-700">
                  {field.name === 'nvlGeneracionTenant'
                    ? (tenantGlobalSelects.nvlGeneracionTenant || []).length === 0
                      ? 'No hay filas activas en generacionglobalnvlrolesconfigs. Ve a Parametrización → NVL jerarquía global, crea NVL 0/1/2, pulsa Parametrizar en cada uno y luego Recargar datos API aquí.'
                      : 'No hay niveles visibles para tu scope JWT. Sesión tenantGlobal: solo NVL ≥ 1; tenantCorporativo: solo NVL 2; tenantSuperAdmin: según configs activas en generacionglobalnvlrolesconfigs.'
                    : field.name === 'coporativo' && nvlEsLibre && !actorEsTenantSuperAdminScope
                    ? 'NVL 0 / LIBRE: con scope solo tenantGlobal no se asocia corporativo aquí; sube a tenantSuperAdmin o usa la ruta con código de jerarquía.'
                    : field.name === 'coporativo' && nvlEsLibre && actorEsTenantSuperAdminScope
                      ? 'NVL 0 / LIBRE con tenantSuperAdmin: puedes asociar corporativo; jerarquía y secuencia se resuelven del scope JWT.'
                      : field.name === 'coporativo' && nvlEsLibre
                        ? 'Para NVL LIBRE no se requiere corporativo.'
                        : field.name === 'coporativo' &&
                            (nvlEsTenantGlobal || nvlEsTenantCorporativo) &&
                            !saJerarquiaConCorporativo
                          ? 'Selecciona un corporativo de la lista (tu tenantSuperAdmin aún no tiene corporativo en counters).'
                          : 'Sin opciones para este campo. Verifica rol `tenantSuperAdmin` o la configuracion del nivel.'}
                </p>
              ) : null}
              {field.name === 'coporativo' && nvlMetaEsCero && actorEsTenantSuperAdminScope && optionsRender.length > 0 ? (
                <p className="mt-1 text-xs text-emerald-800">
                  NVL 0: corporativo opcional. Si eliges uno, debe ser coherente con tu rama; el alta sigue validando codigo de jerarquia en backend según scope.
                </p>
              ) : null}
              {ownerTypeBloqueadoPorScope ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  `ownerType` solo puede ajustarlo un usuario con scope `tenantSuperAdmin`.
                </p>
              ) : null}
              {field.name === 'tenantGlobalRef' && actorEsTenantGlobalPuro ? (
                <p className="mt-1 text-xs text-sky-700">
                  Flujo puro <span className="font-semibold">tenantGlobal</span>: la referencia queda amarrada a tu propio tenantGlobal y solo afecta tu rama descendente.
                </p>
              ) : null}
              {field.name === 'tenantGlobalRef' && actorEsTenantSuperAdminScope ? (
                <p className="mt-1 text-xs text-fuchsia-700">
                  Flujo <span className="font-semibold">tenantSuperAdmin -&gt; tenantGlobal</span>: puedes parametrizar sobre tenantGlobales visibles dentro de tu jerarquÃ­a.
                </p>
              ) : null}
            </div>
          );
        }
        if (field.name === 'x-regla-id') {
          const reglasFiltradas = getReglasFiltradasPorTenant(endpoint.id);
          const actorTsaJwt = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
          const actorTgJwt = String(tenantGlobalActor?.tenantGlobalId || '').trim();
          const actorTcJwt = String(tenantGlobalActor?.tenantCorporativoId || '').trim();

          if (endpoint.id === 'tenant-actualizar-global-reglas') {
            const saSel = String(
              saFilterByEndpoint[endpoint.id] || actorTsaJwt || '',
            ).trim();
            const tenantFiltro = tenantFilterByEndpoint[endpoint.id] || '';
            const soloLecturaActualizarGlobales = actualizarReglasGlobalesSoloLectura();
            const opcionesTenantGlobal = saSel
              ? getTenantGlobalesOpcionesPorSaActualizar(saSel)
              : [];
            const reglaCargadaId = getFieldValue(endpoint.id, 'x-regla-id').trim();
            const reglaPorSa = soloLecturaActualizarGlobales
              ? undefined
              : (saSel ? findReglaJerarquiaPorSa(saSel, undefined, endpoint.id) : undefined);
            const reglaCargadaDoc = reglaCargadaId ? ruleCatalog[reglaCargadaId] : null;
            const docReglaSa = reglaCargadaDoc
              || (reglaPorSa ? ruleCatalog[reglaPorSa.id] : null);
            const esReglaDiosSaSinTg = Boolean(
              !soloLecturaActualizarGlobales
              && docReglaSa?.securityPlatform === true
              && reglaSinTenantGlobalMaterializado(docReglaSa),
            );
            const modoSaSinTg = Boolean(
              !soloLecturaActualizarGlobales
              && docReglaSa
              && reglaSinTenantGlobalMaterializado(docReglaSa),
            );
            const tenantComboBloqueado =
              !saSel ||
              (!loadingData && opcionesTenantGlobal.length === 0 && !modoSaSinTg);
            const saOpciones = resolveSaJerarquiaMetasVisibles(endpoint.id);
            return (
              <div key={field.name} className="space-y-3">
                <ReglasActualizarSaAlcancePanel
                  actorTsaJwt={actorTsaJwt}
                  actorTgJwt={actorTgJwt}
                  actorTcJwt={actorTcJwt}
                  saJerarquiaConCorporativo={saJerarquiaConCorporativo}
                  jerarquiaSaCounters={jerarquiaSaCounters}
                  tenantSuperAdminsJerarquiaCounters={tenantSuperAdminsJerarquiaCounters}
                  saOptions={saOpciones}
                  selectedSaId={saSel}
                  onSaChange={(nextSa) => {
                    const canonico = resolveSaIdCanonicoParaReglas(nextSa);
                    setSaFilterByEndpoint((prev) => ({ ...prev, [endpoint.id]: canonico || nextSa }));
                    limpiarActualizarReglasAlCambiarSa(endpoint.id);
                    void refreshReglasCatalogoPorSaActualizar(endpoint.id, canonico || nextSa).then(
                      ({ rulesMap }) => {
                        const catalogMerged = { ...ruleCatalog, ...rulesMap };
                        if (!actualizarReglasGlobalesSoloLectura()) {
                          seleccionarReglaJerarquiaPorSaActualizar(
                            endpoint.id,
                            canonico || nextSa,
                            catalogMerged,
                          );
                        }
                        if (actualizarReglasGlobalesSoloLectura()) {
                          const opts = getTenantGlobalesOpcionesPorSaActualizar(
                            canonico || nextSa,
                            catalogMerged,
                          );
                          const autoTg = String(opts[0]?.id || '').trim();
                          if (autoTg) {
                            setTenantFilterByEndpoint((prev) => ({ ...prev, [endpoint.id]: autoTg }));
                            seleccionarReglaParametrizadaPorTenantActualizar(
                              endpoint.id,
                              autoTg,
                              catalogMerged,
                            );
                          }
                        }
                      },
                    );
                  }}
                  tenantGlobales={tenantGlobales}
                  tenantGlobalRefs={tenantGlobalSelects.tenantGlobalRef || []}
                  selectedTenantGlobalId={tenantFiltro}
                />
                {soloLecturaActualizarGlobales ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <span className="font-semibold">Modo consulta: </span>
                    tu JWT tiene corporativo en tenantJerarquiaCounter. Elige un tenant global de tu rama para ver la
                    regla parametrizada (vistas, acciones y políticas). No se valida contra el techo del SA padre ni
                    puedes guardar cambios desde este flujo.
                  </div>
                ) : null}
                {modoSaSinTg && esReglaDiosSaSinTg && permiteReglaDiosEnActualizarReglasGlobales() ? (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                    Regla <strong>DIOS</strong> (securityPlatform true) del SuperAdmin sin tenant global materializado.
                    Editable en este flujo porque tu JWT es tenantSuperAdmin sin corporativo.
                  </div>
                ) : null}
                <div>
                  <Label>Tenant global {modoSaSinTg ? '' : '*'}</Label>
                  <select
                    className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                    value={tenantFiltro}
                    disabled={tenantComboBloqueado}
                    onChange={(e) => {
                      const nextTenant = e.target.value;
                      setTenantFilterByEndpoint((prev) => ({ ...prev, [endpoint.id]: nextTenant }));
                      setFieldValue(endpoint.id, field.name, '');
                      setDeltaByEndpoint((prev) => {
                        const next = { ...prev };
                        delete next[endpoint.id];
                        return next;
                      });
                      setCatalogSelectionFor(endpoint.id, { vistas: [], acciones: [] });
                      setPermisos(endpoint.id, [{ vistaId: '', accionId: [] }]);
                      setReglasPoliticasRuntimeSel((prev) => ({ ...prev, [endpoint.id]: [] }));
                      if (nextTenant && !isTenantSuperAdminScopeOption(nextTenant)) {
                        aplicarUsuariosDesdeJerarquiaRef(endpoint.id, nextTenant);
                        void cargarUsuariosParaEndpoint(endpoint.id, nextTenant);
                        seleccionarReglaParametrizadaPorTenantActualizar(endpoint.id, nextTenant);
                      }
                    }}
                  >
                    <option value="">
                      {modoSaSinTg
                        ? 'Regla jerarquía por SA (sin tenant global materializado)'
                        : !saSel
                        ? 'Primero selecciona un SuperAdmin'
                        : tenantComboBloqueado
                          ? 'Sin tenant global en la rama de este SA'
                          : loadingData
                            ? 'Cargando tenants…'
                            : 'Selecciona tenant global'}
                    </option>
                    {opcionesTenantGlobal.map((t, tgIdx) => {
                      const tgOptId = normalizePermisoRefId(t.id);
                      if (!tgOptId) return null;
                      return (
                        <option key={tgOptId || `tg-opt-${tgIdx}`} value={tgOptId}>{t.label}</option>
                      );
                    })}
                  </select>
                  {saSel && tenantComboBloqueado && !loadingData && !modoSaSinTg && !soloLecturaActualizarGlobales ? (
                    <p className="mt-1 text-xs text-amber-800">
                      El SuperAdmin elegido no tiene regla global (view) con tenant materializado. Crea la regla desde «Crear reglas globales» o sincroniza jerarquía.
                    </p>
                  ) : null}
                  {modoSaSinTg ? (
                    <p className="mt-1 text-xs text-emerald-800">
                      Regla parametrizada por SuperAdmin (generacionTenatGlobales). No requiere tenant global en counters — edita vistas y permisos abajo.
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label>{field.label} {field.required ? '*' : ''}</Label>
                  <select
                    className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                    value={getFieldValue(endpoint.id, field.name)}
                    disabled={
                      soloLecturaActualizarGlobales
                        ? !tenantFiltro && !reglaCargadaId
                        : !tenantFiltro && !reglaCargadaId && !reglaPorSa
                    }
                    onChange={(e) => {
                      const selected = e.target.value;
                      setFieldValue(endpoint.id, field.name, selected);
                      if (selected) applyRuleToForm(endpoint.id, selected);
                    }}
                  >
                    <option value="">
                      {reglaPorSa || reglaCargadaId
                        ? reglasFiltradas.length === 0
                          ? 'No hay reglas view para este alcance'
                          : 'Selecciona regla a actualizar'
                        : soloLecturaActualizarGlobales
                          ? tenantFiltro
                            ? 'Selecciona regla parametrizada de tu rama (solo lectura)'
                            : 'Primero selecciona un tenant global de tu rama'
                          : 'Primero selecciona un SuperAdmin con regla'}
                    </option>
                    {reglasFiltradas.map((r) => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                  {tenantFiltro && !reglasFiltradas.length ? (
                    <p className="mt-1 text-xs text-amber-800">
                      No hay reglas con contexto view para este tenant en tu alcance JWT. Sincroniza jerarquía o crea la regla primero.
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    ID encriptado según listar reglas. Reglas con contexto{' '}
                    <span className="font-medium text-foreground">view</span>
                    {permiteReglaDiosEnActualizarReglasGlobales()
                      ? ' (incluye regla DIOS del SA sin tenant global si tu JWT no tiene corporativo)'
                      : ' (tenant global) — sin DIOS ni solo contexto api'}
                    .
                  </p>
                </div>
              </div>
            );
          }

          if (
            endpoint.id === 'tenant-desactivar-global-reglas' ||
            endpoint.id === 'tenant-eliminar-global-reglas'
          ) {
            const tenantFiltro = tenantFilterByEndpoint[endpoint.id] || '';
            const opcionesTenantGlobal = getTenantGlobalOptions(endpoint.id);
            return (
              <div key={field.name} className="space-y-3">
                <div>
                  <Label>Tenant global *</Label>
                  <select
                    className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                    value={tenantFiltro}
                    onChange={(e) => {
                      const nextTenant = e.target.value;
                      setTenantFilterByEndpoint((prev) => ({ ...prev, [endpoint.id]: nextTenant }));
                      setFieldValue(endpoint.id, field.name, '');
                      setDeltaByEndpoint((prev) => {
                        const next = { ...prev };
                        delete next[endpoint.id];
                        return next;
                      });
                      setCatalogSelectionFor(endpoint.id, { vistas: [], acciones: [] });
                      setPermisos(endpoint.id, [{ vistaId: '', accionId: [] }]);
                      setReglasPoliticasRuntimeSel((prev) => ({ ...prev, [endpoint.id]: [] }));
                      if (nextTenant && !isTenantSuperAdminScopeOption(nextTenant)) {
                        aplicarUsuariosDesdeJerarquiaRef(endpoint.id, nextTenant);
                        void cargarUsuariosParaEndpoint(endpoint.id, nextTenant);
                      }
                    }}
                  >
                    <option value="">
                      {loadingData ? 'Cargando tenants…' : 'Selecciona tenant global'}
                    </option>
                    {opcionesTenantGlobal.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                  {!loadingData && !opcionesTenantGlobal.length ? (
                    <p className="mt-1 text-xs text-amber-800">
                      Sin tenants en tu alcance JWT. Pulsa «Recargar datos API».
                    </p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {saJerarquiaConCorporativo
                      ? 'Jerarquía con corporativo en counters: solo tenant globales de tu rama SA (codigoPadre).'
                      : 'SA sin corporativo en counters (rama sin codigoPadre / modo libre): ves todos los tenant globales existentes y sus sub-ramas materializadas.'}
                  </p>
                </div>
                <div>
                  <Label>{field.label} {field.required ? '*' : ''}</Label>
                  <select
                    className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                    value={getFieldValue(endpoint.id, field.name)}
                    disabled={!tenantFiltro}
                    onChange={(e) => setFieldValue(endpoint.id, field.name, e.target.value)}
                  >
                    <option value="">
                      {tenantFiltro
                        ? endpoint.id === 'tenant-desactivar-global-reglas'
                          ? 'Selecciona regla a desactivar'
                          : 'Selecciona regla a eliminar'
                        : 'Primero selecciona un tenant'}
                    </option>
                    {reglasFiltradas.map((r) => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                  {tenantFiltro && !reglasFiltradas.length ? (
                    <p className="mt-1 text-xs text-amber-800">
                      No hay reglas con contexto view para este tenant en tu alcance JWT. Sincroniza jerarquía o crea la regla primero.
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    ID encriptado según listar reglas. Solo reglas con contexto{' '}
                    <span className="font-medium text-foreground">view</span> (tenant global), igual que en crear/actualizar — sin DIOS ni solo contexto{' '}
                    <span className="font-medium text-foreground">api</span>.
                  </p>
                </div>
              </div>
            );
          }

          return null;
        }
        if (field.type === 'textarea' || field.type === 'json') {
          return (
            <div key={field.name}>
              <Label>{field.label} {field.required ? '*' : ''}</Label>
              <Textarea rows={4} className="mt-1 font-mono text-xs" value={getFieldValue(endpoint.id, field.name)} onChange={(e) => setFieldValue(endpoint.id, field.name, e.target.value)} placeholder={field.placeholder} />
            </div>
          );
        }
        return (
          <div key={field.name}>
            <Label>{field.label} {field.required ? '*' : ''}</Label>
            <Input className="mt-1" value={getFieldValue(endpoint.id, field.name)} onChange={(e) => setFieldValue(endpoint.id, field.name, e.target.value)} placeholder={field.placeholder || `Ingresa ${field.label}`} />
          </div>
        );
      }) : null}
      {/* â”€â”€ Selectores segÃºn scope: SA ve TenantGlobal, TG ve Herencia + Corporativo â”€â”€ */}
      {endpoint.id === 'perm-usuario-tenant-global' ? (() => {
        const esSA = actorEsTenantSuperAdmin();
        const esTG = actorEsTenantGlobalScope();

        if (esSA) {
          const tgOptionsAll: HeredaGlobalOption[] = tenantGlobales.map((t) => ({ id: t.id, label: t.label }));
          const tsaSelected = getFieldValue(endpoint.id, 'tenantGlobalScope').trim() || String(tgOptionsAll[0]?.id || '');
          const herenciasPorUsuario = getHerenciasUsuariosSeleccionadosParaPermUsuario(tsaSelected);
          const herenciasYReglasTenant = getHeredaOptionsPermitidasPorTenantGlobal(tsaSelected);
          const herenciaParamOptions = (() => {
            const m = new Map<string, HeredaGlobalOption>();
            herenciasYReglasTenant.forEach((o) => m.set(o.id, o));
            herenciasPorUsuario.forEach((o) => {
              if (!m.has(o.id)) m.set(o.id, o);
            });
            return Array.from(m.values());
          })();
          const herenciaSel = getFieldValue(endpoint.id, 'heredaGlobal').trim();
          const suitesConJerarquia = herenciaParamOptions.map((h) => ({ _id: h.id, name: h.label }));
          const usuariosDestinoOk = (usuariosDestinoSel[endpoint.id] || []).length > 0;
          return (
            <div className="space-y-2">
              <div>
                <Label>TenantGlobal *</Label>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                  value={tsaSelected}
                  onChange={(e) => {
                    const nextTg = e.target.value;
                    if (!nextTg) {
                      setFieldValue(endpoint.id, 'tenantGlobalScope', '');
                      setFieldValue(endpoint.id, 'heredaGlobal', '');
                      setUsuariosDestinoSel((prev) => ({ ...prev, [endpoint.id]: [] }));
                      setCatalogSelectionFor(endpoint.id, { vistas: [], acciones: [] });
                      return;
                    }
                    void sincronizarContextoTenantGlobalPermUsuario(endpoint.id, nextTg);
                  }}
                >
                  <option value="">Selecciona tenantGlobal</option>
                  {tgOptionsAll.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="mt-2 block">Herencia parametrizada</Label>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                  value={herenciaSel}
                  disabled={!tsaSelected || !usuariosDestinoOk || herenciaParamOptions.length === 0}
                  onChange={(e) => {
                    const herenciaId = e.target.value;
                    setFieldValue(endpoint.id, 'heredaGlobal', herenciaId);
                    setSuiteSelByEndpoint((prev) => ({ ...prev, [endpoint.id]: '' }));
                    if (!herenciaId) {
                      setCatalogSelectionFor(endpoint.id, { vistas: [], acciones: [] });
                      return;
                    }
                    const rows = [
                      ...herenciasUsuario,
                      ...(herenciasExistentesPorTG[tsaSelected] || []),
                    ];
                    const h = rows.find((row: any) => String(row?.iud || row?._id || '').trim() === herenciaId);
                    if (h) {
                      const vistasIds = (Array.isArray(h?.vistas) ? h.vistas : [])
                        .map((v: any) => String(v?._id || v || '').trim())
                        .filter(Boolean);
                      const accionesIds = (Array.isArray(h?.acciones) ? h.acciones : [])
                        .map((a: any) => String(a?._id || a || '').trim())
                        .filter(Boolean);
                      setCatalogSelectionFor(endpoint.id, { vistas: vistasIds, acciones: accionesIds });
                      return;
                    }
                    const rule = ruleCatalog[herenciaId];
                    if (rule) {
                      setCatalogSelectionFor(endpoint.id, { vistas: [], acciones: [] });
                      return;
                    }
                    setCatalogSelectionFor(endpoint.id, { vistas: [], acciones: [] });
                  }}
                >
                  <option value="">
                    {!tsaSelected
                      ? 'Selecciona tenantGlobal primero'
                      : !usuariosDestinoOk
                      ? 'Selecciona al menos un usuario destino'
                      : herenciaParamOptions.length
                      ? 'Selecciona herencia global o regla (techo de vistas)'
                      : 'Sin herencias ni reglas para este tenant — recarga datos o sincroniza reglas'}
                  </option>
                  {suitesConJerarquia.map((suite) => (
                    <option key={getEntityId(suite)} value={getEntityId(suite)}>{suite.name}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tsaSelected
                    ? 'Incluye documentos herenciaGlobal del tenant y reglas del catálogo (GET listar reglas). Si solo hay reglas, elige una para usarla como techo; los checks puedes marcarlos después.'
                    : 'Selecciona tenantGlobal para resolver su catálogo y luego filtrar por suite.'}
                </p>
              </div>
            </div>
          );
        }
        if (esTG) {
          const herenciasTG = getHerenciaGlobalOpcionesParaTG();
          const corporativosDelTG = getCorporativosDelTG();
          const heredaSelVal = getFieldValue(endpoint.id, 'heredaGlobal').trim();
          const corpSelVal = getFieldValue(endpoint.id, 'tenantCorporativoScope').trim();
          const loadingCorp = !!tenantCorpLoadingByEndpoint[endpoint.id];
          const corpError = String(tenantCorpErrorByEndpoint[endpoint.id] || '').trim();
          const tgId = String(tenantGlobalActor?.tenantGlobalId || '').trim();
          return (
            <div className="space-y-2">
              <div>
                <Label>Herencia de referencia (techo)</Label>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                  value={heredaSelVal}
                  onChange={(e) => setFieldValue(endpoint.id, 'heredaGlobal', e.target.value)}
                >
                  <option value="">{herenciasTG.length ? 'Selecciona herencia (opcional)' : 'Sin herencias asignadas'}</option>
                  {herenciasTG.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">Opcional: limita vistas/acciones al techo de tu herenciaGlobal.</p>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>TenantCorporativo *</Label>
                  {tgId && (
                    <button
                      type="button"
                      className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                      disabled={loadingCorp}
                      onClick={() => fetchTenantCorporativosByGlobal(endpoint.id, tgId)}
                    >
                      {loadingCorp ? 'Cargando...' : 'Recargar'}
                    </button>
                  )}
                </div>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                  value={corpSelVal}
                  disabled={loadingCorp}
                  onChange={(e) => {
                    const nextCorp = e.target.value;
                    setFieldValue(endpoint.id, 'tenantCorporativoScope', nextCorp);
                    setUsuariosDestinoSel((prev) => ({ ...prev, [endpoint.id]: [] }));
                    if (nextCorp && tgId) cargarUsuariosParaEndpoint(endpoint.id, tgId);
                  }}
                >
                  <option value="">
                    {loadingCorp ? 'Cargando corporativos...' : corporativosDelTG.length ? 'Selecciona corporativo' : 'Sin corporativos disponibles'}
                  </option>
                  {corporativosDelTG.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                {corpError && <p className="mt-1 text-xs text-red-500">{corpError}</p>}
              </div>
            </div>
          );
        }

        return null;
      })() : null}

      {/* â”€â”€ Panel de usuarios destino â”€â”€ */}
      {endpoint.id === 'perm-usuario-tenant-global' ? (() => {
        const endpointId = endpoint.id;
        const isTG = actorEsTenantGlobalScope();
        const tgId = isTG
          ? String(tenantGlobalActor?.tenantGlobalId || '').trim()
          : getFieldValue(endpointId, 'tenantGlobalScope').trim();
        const scopeId = isTG
          ? getFieldValue(endpointId, 'tenantCorporativoScope').trim()
          : tgId;
        const disponibles = usuariosDisponibles[endpointId] || [];
        const seleccionados = usuariosDestinoSel[endpointId] || [];
        const cargando = !!loadingUsuarios[endpointId];
        const herenciasDelTG = herenciasExistentesPorTG[tgId] || [];

        if (!scopeId) return null;
        return (
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-blue-700">
                Usuarios destino ({seleccionados.length}/{disponibles.length})
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded border border-blue-300 bg-card px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
                  onClick={() => setUsuariosDestinoSel((prev) => ({ ...prev, [endpointId]: disponibles.map((u) => u.id) }))}
                  disabled={cargando}
                >Seleccionar todos</button>
                <button
                  type="button"
                  className="rounded border border-input bg-card px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50"
                  onClick={() => setUsuariosDestinoSel((prev) => ({ ...prev, [endpointId]: [] }))}
                  disabled={cargando}
                >Limpiar</button>
                <button
                  type="button"
                  className="rounded border border-border bg-card px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50"
                  onClick={() => {
                    void sincronizarContextoTenantGlobalPermUsuario(endpointId, tgId);
                  }}
                  disabled={cargando}
                >{cargando ? '...' : 'Recargar'}</button>
              </div>
            </div>
            {cargando ? (
              <p className="text-xs text-blue-500">Cargando usuarios...</p>
            ) : disponibles.length === 0 ? (
              <p className="text-xs text-muted-foreground">No hay usuarios disponibles.</p>
            ) : (
              <div className="max-h-48 overflow-auto rounded-md border border-blue-200 bg-card p-2 space-y-2">
                {disponibles.map((u) => {
                  const herenciasUsu = herenciasDelTG.filter(
                    (h: any) => String(h?.usuarioId?._id || h?.usuarioId || '').trim() === u.id
                  );
                  const tieneHerencia = herenciasUsu.length > 0;
                  return (
                    <div key={u.id} className="space-y-1">
                      <label className="flex cursor-pointer items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={seleccionados.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) cargarHerenciasPorUsuario(u.id);
                            setUsuariosDestinoSel((prev) => {
                              const curr = prev[endpointId] || [];
                              return { ...prev, [endpointId]: e.target.checked ? [...curr, u.id] : curr.filter((id) => id !== u.id) };
                            });
                          }}
                        />
                        <span className="flex-1 text-foreground">{u.label}</span>
                        {tieneHerencia && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                            {herenciasUsu.length} herencia{herenciasUsu.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </label>
                      {seleccionados.includes(u.id) && (() => {
                        const hxUsu = herenciasPorUsuario[u.id] || [];
                        const loadingUsu = loadingHerenciasPorUsuario[u.id];
                        const tgsMap = new Map();
                        hxUsu.forEach((h) => {
                          const tgId = String(h?.tenantGlobal?._id || h?.tenantGlobal || '').trim();
                          if (!tgId || tgsMap.has(tgId)) return;
                          tgsMap.set(tgId, {
                            id: tgId,
                            label: String(h?.tenantGlobal?.correo || h?.tenantGlobal?.label || tgId),
                            vistas: Array.isArray(h?.vistas) ? h.vistas.length : 0,
                            acciones: Array.isArray(h?.acciones) ? h.acciones.length : 0,
                          });
                        });
                        const tgsUsu = Array.from(tgsMap.values());
                        if (loadingUsu) return <p className="ml-5 text-[10px] text-muted-foreground/90">Validando tenants...</p>;
                        if (!tgsUsu.length) return null;
                        return (
                          <div className="ml-5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 space-y-1">
                            <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">
                              Parametrizado en {tgsUsu.length} tenantGlobal{tgsUsu.length > 1 ? 'es' : ''}
                            </p>
                            {tgsUsu.map((tg) => (
                              <div key={tg.id} className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-emerald-800">
                                <span className="font-mono text-emerald-500">{tg.id.slice(-8)}</span>
                                <span className="flex-1 truncate">{tg.label !== tg.id ? tg.label : ''}</span>
                                <span>V:<strong>{tg.vistas}</strong></span>
                                <span>A:<strong>{tg.acciones}</strong></span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      {tieneHerencia && seleccionados.includes(u.id) && (
                        <div className="ml-5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 space-y-1">
                          <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Herencias existentes</p>
                          {herenciasUsu.map((h: any) => {
                            const hId = String(h?.iud || h?._id || '');
                            const vistas = Array.isArray(h?.vistas) ? h.vistas.length : 0;
                            const acciones = Array.isArray(h?.acciones) ? h.acciones.length : 0;
                            const tgRef = String(h?.tenantGlobal?.label || h?.tenantGlobal?.correo || h?.tenantGlobal || '');
                            const tcRef = String(h?.tenantCorporativo?.label || h?.tenantCorporativo?.correo || h?.tenantCorporativo || '');
                            return (
                              <div key={hId} className="text-[10px] text-amber-800 flex flex-wrap gap-x-3 gap-y-0.5">
                                <span>Vistas: <strong>{vistas}</strong></span>
                                <span>Acciones: <strong>{acciones}</strong></span>
                                {tgRef && <span>TG: <strong>{tgRef}</strong></span>}
                                {tcRef && <span>TC: <strong>{tcRef}</strong></span>}
                                <span className="text-amber-500 font-mono">{hId.slice(-6)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {seleccionados.length > 1 && (
              <p className="text-xs text-blue-600 font-medium">
                Se crearan {seleccionados.length} documentos de herencia (uno por usuario).
              </p>
            )}
          </div>
        );
      })() : null}
      {endpoint.id === 'perm-usuario-tenant-global' ? renderHerenciaSelectionBuilder(endpoint) : null}
      {(endpoint.id === 'tenant-crear-dios-reglas' || endpoint.id === 'tenant-actualizar-dios-reglas') ? (() => {
        const jwtSa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
        const tenantsMarcados = getDiosReglaTenantsSel(endpoint.id);
        const effectiveSaParaRegla = tenantsMarcados[0] || getFieldValue(endpoint.id, 'tenantSuperAdmin').trim() || jwtSa;
        const reglaDiosJerarquia = findReglaPlataformaPorSuperAdmin(ruleCatalog, effectiveSaParaRegla) as any;
        const recursoIdSet = new Set(
          (Array.isArray(reglaDiosJerarquia?.recurso) ? reglaDiosJerarquia.recurso : [])
            .map((v: any) => String(v?._id || v || '').trim())
            .filter(Boolean)
        );
        const accionReglaIdSet = new Set(
          (Array.isArray(reglaDiosJerarquia?.accionesUsu) ? reglaDiosJerarquia.accionesUsu : [])
            .map((a: any) => String(a?._id || a || '').trim())
            .filter(Boolean)
        );
        const acotarPorRegla =
          modoSoloLecturaReglasDios(endpoint) && recursoIdSet.size > 0;
        const soloLecturaDios = modoSoloLecturaReglasDios(endpoint);
        const mostrarTablaRutasArbolDios =
          (endpoint.id === 'tenant-crear-dios-reglas' || endpoint.id === 'tenant-actualizar-dios-reglas') &&
          esJwtSoloTenantSuperAdmin &&
          !saJerarquiaConCorporativo;
        const nodes = collectAllNodes(rutasJerarquia);
        const nodeById = new Map<string, any>();
        nodes.forEach((n: any) => {
          const id = String(n?._id || '').trim();
          if (id) nodeById.set(id, n);
        });
        type DiosRow = { _id: string; name: string; path: string; tipo: string; accionesText: string };
        const accionesTextFromNode = (n: any): string => {
          if (!n || !Array.isArray(n?.acciones)) return '—';
          const joined = (n.acciones as any[])
            .map((a: any) => String(a?.etiquetas || a?.method || a?._id || '').trim())
            .filter(Boolean)
            .join(', ');
          return joined || '—';
        };
        const counterSource = diosRecursosJerarquiaFlat.length > 0;
        const locMapCounter = buildVistaLocationMap(rutasJerarquia);

        const buildRowFromCounter = (r: DiosRecursoRow): DiosRow => ({
          _id: r._id,
          name: r.name,
          path: r.path || '—',
          tipo: formatDiosRecursoJerarquiaTipo(r),
          accionesText: accionesTextFromNode(nodeById.get(r._id)),
        });

        let catalogRows: DiosRow[] = counterSource
          ? diosRecursosJerarquiaFlat.map(buildRowFromCounter)
          : collectFormularioLikeNodes(rutasJerarquia).map((n: any) => {
            const id = String(n?._id || '').trim();
            const loc = locMapCounter.byId.get(id);
            return {
              _id: id,
              name: String(n?.name || '—'),
              path: String(n?.path || '—'),
              tipo: loc
                ? `${loc.suiteName || '—'} · ${loc.moduloName || 'Directo'}`
                : getTipoNodoLabel(n) || '—',
              accionesText: accionesTextFromNode(n),
            };
          });

        if (!catalogRows.length && vistas.length) {
          catalogRows = vistas.map((v) => ({
            _id: v.id,
            name: v.label,
            path: v.path || '—',
            tipo: '—',
            accionesText: 'Ver catálogo global de acciones abajo',
          }));
        }

        if (acotarPorRegla) {
          catalogRows = catalogRows.filter((row) => recursoIdSet.has(String(row._id || '').trim()));
        }
        const recursosReglaArr = Array.isArray(reglaDiosJerarquia?.recurso) ? reglaDiosJerarquia.recurso : [];
        const rowsFromGet: DiosRow[] = recursosReglaArr
          .map((v: any) => {
            const id = String(v?._id || v || '').trim();
            if (!id) return null;
            const counterMeta = diosRecursosByFormId[id];
            const n = nodeById.get(id);
            return {
              _id: id,
              name: counterMeta?.name || (n ? String(n?.name || '—') : String(v?.name || v?.label || '—')),
              path: counterMeta?.path || (n ? String(n?.path || '—') : String(v?.path || '—')),
              tipo: counterMeta
                ? formatDiosRecursoJerarquiaTipo(counterMeta)
                : (() => {
                  const loc = locMapCounter.byId.get(id);
                  if (loc) return `${loc.suiteName || '—'} · ${loc.moduloName || 'Directo'}`;
                  return n ? getTipoNodoLabel(n) || '—' : '—';
                })(),
              accionesText: accionesTextFromNode(n),
            };
          })
          .filter(Boolean) as DiosRow[];
        const rowsFromGetSorted = counterSource
          ? rowsFromGet
          : [...rowsFromGet].sort((a, b) =>
            String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' })
          );
        const tablaFuenteGet = mostrarTablaRutasArbolDios && rowsFromGetSorted.length > 0;
        let tableRows: DiosRow[] = [];
        if (mostrarTablaRutasArbolDios) {
          tableRows = tablaFuenteGet ? rowsFromGetSorted : catalogRows;
          if (
            (endpoint.id === 'tenant-crear-dios-reglas' || endpoint.id === 'tenant-actualizar-dios-reglas') &&
            !soloLecturaDios
          ) {
            const rawSel = diosReglaRecursosSeleccion[endpoint.id] ?? [];
            const selSet = new Set(rawSel.map((id) => String(id).trim()).filter(Boolean));
            if (selSet.size > 0) {
              tableRows = catalogRows.filter((row) => selSet.has(String(row._id || '').trim()));
            }
          }
        } else if (soloLecturaDios) {
          tableRows = rowsFromGetSorted.length ? rowsFromGetSorted : catalogRows;
        } else {
          tableRows = catalogRows;
        }
        const recursosMostrar = catalogRows;
        const recursosJerarquiaTree = acotarPorRegla
          ? diosRecursosJerarquiaTree
              .map((suite) => ({
                ...suite,
                modulos: suite.modulos
                  .map((mod) => ({
                    ...mod,
                    formularios: mod.formularios.filter((f) => recursoIdSet.has(f._id)),
                  }))
                  .filter((mod) => mod.formularios.length > 0),
              }))
              .filter((suite) => suite.modulos.length > 0)
          : diosRecursosJerarquiaTree;
        const accionesMostrar = acotarPorRegla && accionReglaIdSet.size > 0
          ? acciones.filter((a) => accionReglaIdSet.has(a.id))
          : acciones;
        const mostrarBloqueTablaReferenciaCorp = soloLecturaDios && !mostrarTablaRutasArbolDios;
        return (
          <div className="space-y-2">
            {soloLecturaDios ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <span className="font-semibold">Modo referencia (jerarquía con corporativo): </span>
                vistas y acciones acotadas a la regla DIOS parametrizada para tu tenantSuperAdmin. Ejecutar está deshabilitado; el servidor también bloquea crear/sincronizar totales en este perfil.
              </div>
            ) : scopeJwtSaAlcanceJerarquiaValidado ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                Alcance JWT validado en{' '}
                <code className="rounded bg-white/80 px-1">tenantJerarquiaCounter</code>. Puedes crear la regla DIOS y
                usar &quot;Sincronizar regla DIOS&quot; para alinear todas las vistas activas (el servidor valida configs NVL y rama).
              </div>
            ) : esJwtSoloTenantSuperAdmin ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {saJerarquiaTieneCorporativoEnCountersEfectivo === undefined
                  ? 'Validando scope JWT… Recarga datos API si los botones no se habilitan.'
                  : 'Jerarquía con corporativo en counters: botones deshabilitados (solo referencia de la regla parametrizada).'}
              </div>
            ) : null}
            {mostrarBloqueTablaReferenciaCorp ? (
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="border-b border-border bg-muted/50 px-3 py-2 text-xs font-semibold text-foreground">
                  Regla DIOS — vista desde GET <code className="rounded bg-muted px-1">/api/config/tenant/listar/reglas</code> ({tableRows.length} filas
                  {rowsFromGetSorted.length ? ' · recurso de la regla' : ' · sin recurso en regla; árbol acotado'})
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-xs">
                    <thead className="sticky top-0 bg-muted text-foreground">
                      <tr>
                        <th className="px-3 py-2">Nombre</th>
                        <th className="px-3 py-2">Tipo nodo</th>
                        <th className="px-3 py-2">Acciones asociadas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((row, idx) => (
                        <tr key={getEntityId(row) || `cre-${idx}`} className="border-t border-border/80">
                          <td className="px-3 py-2">{row.name}</td>
                          <td className="px-3 py-2">{row.tipo}</td>
                          <td className="max-w-md px-3 py-2 text-[11px] text-muted-foreground">{row.accionesText}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
            {(endpoint.id === 'tenant-crear-dios-reglas' || endpoint.id === 'tenant-actualizar-dios-reglas') &&
            !soloLecturaDios &&
            mostrarTablaRutasArbolDios &&
            recursosMostrar.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-dashed border-primary/30 bg-card">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-muted/50 px-3 py-2">
                  <div className="text-[11px] font-semibold text-foreground">
                    Recursos parametrizables (vistas/rutas){' '}
                    {endpoint.id === 'tenant-crear-dios-reglas' ? 'para crear la regla DIOS' : '— vista previa / filtro (PUT sincroniza todas las rutas activas en servidor)'} (
                    {(diosReglaRecursosSeleccion[endpoint.id] ?? []).length} / {recursosMostrar.length}
                    {acotarPorRegla ? ' · techo regla' : ''}
                    {diosRecursosJerarquiaTree.length ? ' · jerarquía countertiponodorutas' : ''})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={() =>
                        setDiosReglaRecursosSeleccion((p) => ({
                          ...p,
                          [endpoint.id]: recursosMostrar.map((r) => r._id),
                        }))
                      }
                    >
                      Seleccionar todas
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={() => setDiosReglaRecursosSeleccion((p) => ({ ...p, [endpoint.id]: [] }))}
                    >
                      Limpiar
                    </Button>
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto px-3 py-2">
                  <DiosReglaRecursosJerarquiaPanel
                    tree={recursosJerarquiaTree}
                    flatFallback={recursosMostrar.map((r) => ({
                      _id: r._id,
                      name: r.name,
                      path: r.path,
                      tipo: r.tipo,
                    }))}
                    seleccionados={diosReglaRecursosSeleccion[endpoint.id] ?? []}
                    onChangeSeleccion={(ids) =>
                      setDiosReglaRecursosSeleccion((prev) => ({ ...prev, [endpoint.id]: ids }))
                    }
                    disabled={soloLecturaDios}
                    loading={diosRecursosJerarquiaLoading && !diosRecursosJerarquiaTree.length}
                  />
                </div>
              </div>
            ) : null}
            {accionesMostrar.length > 0 ? (
              endpoint.id === 'tenant-crear-dios-reglas' && !modoSoloLecturaReglasDios(endpoint) ? (
                <div className="overflow-hidden rounded-lg border border-dashed border-primary/30 bg-card">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-muted/50 px-3 py-2">
                    <div className="text-[11px] font-semibold text-foreground">
                      Acciones parametrizables para la regla DIOS ({(diosReglaAccionesSeleccion['tenant-crear-dios-reglas'] ?? []).length} / {accionesMostrar.length}
                      {acotarPorRegla ? ' · techo regla' : ''})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        onClick={() =>
                          setDiosReglaAccionesSeleccion((p) => ({
                            ...p,
                            'tenant-crear-dios-reglas': accionesMostrar.map((a) => a.id),
                          }))
                        }
                      >
                        Seleccionar todas
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        onClick={() => setDiosReglaAccionesSeleccion((p) => ({ ...p, 'tenant-crear-dios-reglas': [] }))}
                      >
                        Limpiar
                      </Button>
                    </div>
                  </div>
                  <div className="px-3 py-2">
                    {accionesMostrar.map((a) => {
                      const checked = (diosReglaAccionesSeleccion['tenant-crear-dios-reglas'] ?? []).includes(a.id);
                      return (
                        <label key={a.id} className="mb-1.5 flex cursor-pointer items-center gap-2 text-xs text-foreground">
                          <input
                            type="checkbox"
                            className="accent-primary"
                            checked={checked}
                            onChange={(e) => {
                              const on = e.target.checked;
                              setDiosReglaAccionesSeleccion((prev) => {
                                const k = 'tenant-crear-dios-reglas';
                                const set = new Set(prev[k] ?? []);
                                if (on) set.add(a.id);
                                else set.delete(a.id);
                                return { ...prev, [k]: Array.from(set) };
                              });
                            }}
                          />
                          <span>
                            {a.label}
                            {a.method ? <span className="text-muted-foreground"> ({a.method})</span> : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-dashed border-border bg-muted/30">
                  <div className="border-b border-border/80 bg-muted/50 px-3 py-1.5 text-[11px] font-semibold text-foreground">
                    Catálogo de acciones ({accionesMostrar.length}
                    {acotarPorRegla ? ' · heredables según regla' : ''})
                  </div>
                  <div className="px-3 py-2 text-[11px] text-muted-foreground">
                    {accionesMostrar.map((a) => (
                      <span key={a.id} className="mr-2 inline-block rounded bg-card px-1.5 py-0.5">
                        {a.label}{a.method ? ` (${a.method})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )
            ) : null}
            <p className="text-xs text-muted-foreground">
              {acotarPorRegla
                ? 'Vista previa acotada al techo de la regla DIOS (recurso / accionesUsu) aplicable al Tenant SuperAdmin elegido (GET listar reglas cuando hay recurso persistido).'
                : mostrarTablaRutasArbolDios && endpoint.id === 'tenant-crear-dios-reglas' && !soloLecturaDios
                  ? 'El POST envía dominio, securityPlatform, alcances (tenants SA y usuarios opcionales), recursosSeleccionadas y accionesSeleccionadas. Las políticas runtime se validan al guardar (roles del tenant vs. políticas parametrizadas).'
                : mostrarTablaRutasArbolDios && endpoint.id === 'tenant-actualizar-dios-reglas' && !soloLecturaDios
                  ? 'Elige Tenant SuperAdmin: el PUT sincroniza todas las rutas y acciones activas para esa regla. Los checks de recursos filtran qué formularios se envían.'
                : mostrarTablaRutasArbolDios
                  ? 'Sin fila con corporativo en tenantJerarquiaCounter para tu SA: tabla con datos de GET listar reglas cuando la regla ya tiene recurso; si no, vista desde el árbol.'
                  : soloLecturaDios
                    ? 'Con corporativo en counters: solo referencia desde GET listar reglas (tabla compacta), sin el árbol completo de creación.'
                    : 'La regla DIOS en el servidor sigue la política de creación/sincronización según tu jerarquía.'}
            </p>
          </div>
        );
      })() : null}
    </>
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
            <Button
              type="button"
              variant="outline"
              disabled={crearReglasJerarquiaSyncing || loadingData}
              title={
                saJerarquiaConCorporativo
                  ? 'Materializa tenantJerarquiaCountersGlobal desde tenantJerarquiaCounter y recarga reglas'
                  : 'Sincroniza jerarquía (requiere emisiones SA+corporativo en tenantJerarquiaCounter; si no aplica, el servidor indicará el motivo)'
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

  if (singleFormInline) {
    const soloEndpoint = availableEndpoints[0] ?? null;
    return (
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
    );
  }

  return (
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
                      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
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
                      <Button variant="outline" onClick={() => setEndpointModal(endpoint)}>
                        <Settings2 className="mr-2 h-4 w-4" />
                        Configurar
                      </Button>
                      <Button onClick={() => endpoint.fields.length === 0 ? runEndpoint(endpoint) : setEndpointModal(endpoint)} disabled={!!running[endpoint.id] || !disponible}>
                        {running[endpoint.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                        Ejecutar
                      </Button>
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
  );
};

export default ParametrosGobernanza;
