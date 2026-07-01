// @ts-nocheck
import React from 'react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useParametrosGobernanzaCtx } from './ParametrosGobernanzaCtx';
import type { EndpointSpec } from './parametrosGobernanzaTypes';
import {
  getEntityId,
  getEntityLabel,
  buildVistaLocationMap,
  buildGroupedVistas,
  buildSuiteSummaryLabel,
  isTenantSuperAdminScopeOption,
  collectAllNodes,
  collectFormularioLikeNodes,
  pickArray,
  type Vista,
  type Accion,
  type PermisoItem,
  type GenericSelectOption,
  type HeredaGlobalOption,
  type CatalogSelection,
  type NodoRuta,
} from './parametrosGobernanzaPureHelpers';
import { DiosReglaAlcanceTenantsPanel } from './DiosReglaAlcanceTenantsPanel';
import { DiosReglaRecursosJerarquiaPanel } from './DiosReglaRecursosJerarquiaPanel';
import { GobernanzaAltaTenantResultPanel } from './GobernanzaAltaTenantResultPanel';
import { esEndpointAltaTenantPanel } from './tenantSuperAdminInsertEndpoints';
import { GobernanzaReglasTable } from './GobernanzaReglasTable';
import { GobernanzaActualizarReglaDiosResultado } from './GobernanzaActualizarReglaDiosResultado';
import { GobernanzaHerenciasAdminTable } from './GobernanzaHerenciasAdminTable';
import { GobernanzaTenantLibresTable } from './GobernanzaTenantLibresTable';
import { GobernanzaHerenciasUsuarioTable } from './GobernanzaHerenciasUsuarioTable';

export const GobernanzaFormResultSlot: React.FC<{ endpoint: EndpointSpec }> = ({ endpoint }) => {
  const ctx = useParametrosGobernanzaCtx();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { acciones, catalogItems, catalogItemsLoaded, catalogSeedRunning, contextos, diosRecursosByFormId, diosRecursosJerarquiaFlat, diosRecursosJerarquiaLoading, diosRecursosJerarquiaTree, diosReglaAccionesSeleccion, diosReglaRecursosSeleccion, herenciaAsociadaDataByEndpoint, herenciaAsociadaOptionsByEndpoint, herenciasExistentesPorTG, herenciasPorUsuario, herenciasUsuario, jerarquiaSaCounters, loadingData, loadingHerenciasPorUsuario, loadingUsuarios, politicasRuntimeCatalog, ruleCatalog, rutasJerarquia, saFilterByEndpoint, suiteSelByEndpoint, syncInfoByEndpoint, syncRunningByEndpoint, tenantActualizarPrefillLoading, tenantCorpErrorByEndpoint, tenantCorpLoadingByEndpoint, tenantFilterByEndpoint, tenantGlobalActor, tenantGlobalSelects, tenantGlobales, tenantSuperAdminsJerarquiaCounters, usuariosDestinoSel, usuariosDisponibles, vistas, crearReglasJerarquiaSyncing, expandedModulos, bulkAllMode, PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS, ENDPOINT_IDS_SELECT_MULTI_SA_JERARQUIA, DIOS_REGLAS_ENDPOINT_IDS, TENANT_SUPERADMIN_SCOPE_PREFIX, saJerarquiaConCorporativo, esJwtSoloTenantSuperAdmin, dominioPorSaMap, running, setDeltaByEndpoint, setDiosReglaAccionesSeleccion, setDiosReglaRecursosSeleccion, setHerenciaAsociadaDataByEndpoint, setHerenciaAsociadaOptionsByEndpoint, setReglasPoliticasRuntimeSel, setSaFilterByEndpoint, setSuiteSelByEndpoint, setSyncInfoByEndpoint, setTenantFilterByEndpoint, setUsuariosDestinoSel, setVistasDesactivarSeleccion, setCrearReglasJerarquiaSyncing, setExpandedModulos, setBulkAllFor, setCatalogSelectionFor, setDiosReglaTenantsSelFor, setDiosReglaUsuariosPorTenantFor, setFieldValue, setPermisos, getCatalogSelection, getCatalogoVistaIdsRelacionadas, getExtraVistaIdsReglaPlantillaCrear, getSelectedRuleCatalogKey, getBulkAllMode, getPermisos, getAccionesPorVistaDesdeRegla, resolveActiveReglasEndpointId, resolveTenantGlobalParaReglasEndpoint, resolverVistaDesdeRutasSeguridad, seleccionarTodasVistasDesactivar, getDiosReglaTenantsSel, getDiosReglaUsuariosPorTenantSel, getFieldValue, getHeredaOptionsPermitidasPorTenantGlobal, getHerenciaGlobalOpcionesParaTG, getHerenciasUsuariosSeleccionadosParaPermUsuario, getPermisosCatalog, getReglasPoliticasRuntimeSel, getReglasFiltradasPorTenant, getTenantCorporativoOptions, getTenantGlobalOptions, getTenantGlobalOptionsForPermUsuario, getTenantGlobalesOpcionesPorSaActualizar, getCorporativoByHerencia, getCorporativosDelTG, resolveSaJerarquiaMetasVisibles, runHerenciaSyncCheck, fetchHerenciasAsociadasByTenantGlobal, fetchHerenciasConReglasParaTenant, fetchTenantCorporativosByGlobal, renderHerenciaAsociadaDetalle, renderHerenciaSelectionBuilder, renderPermisosBuilder, buildDiosReglaSaMetasMap, cargarUsuariosParaEndpoint, cargarHerenciasPorUsuario, actualizarReglasGlobalesSoloLectura, consultaReglasGlobalesRamaCorporativo, diosReglaAlcanceFormularioEditable, endpointDisponibleParaScope, findReglaJerarquiaPorSa, handleCatalogSeedDefaults, limpiarActualizarReglasAlCambiarSa, modoSoloLecturaReglasDios, permiteReglaDiosEnActualizarReglasGlobales, politicaRuntimeId, politicaRuntimeLabel, refreshReglasCatalogoPorSaActualizar, reglaSinTenantGlobalMaterializado, resolveDominioTenatPorSa, resolveSaIdCanonicoParaReglas, seleccionarReglaJerarquiaPorSaActualizar, seleccionarReglaParametrizadaPorTenantActualizar, sincronizarContextoTenantGlobalPermUsuario, toggleReglaPoliticaRuntime, applyHerenciaAsociadaSelection, applyPermAdminTenantGlobalSelection, applyRuleToForm, applySuiteCatalogSelection, aplicarUsuariosDesdeJerarquiaRef, actorEsTenantCorporativoScope, actorEsTenantGlobalScope, actorEsTenantSuperAdmin, result, resultData, reglasSearch, reglasTenantFilter, setReglasSearch, setReglasTenantFilter } = ctx;

    const useModuloInlineFlow = false;
    const formData: Record<string, Record<string, string>> = {};
    const renderReglasTable = () => <GobernanzaReglasTable />;
    const renderActualizarReglaDiosResultado = () => <GobernanzaActualizarReglaDiosResultado />;
    const renderHerenciasAdminTable = () => <GobernanzaHerenciasAdminTable />;
    const renderTenantLibresTable = (epId: string) => <GobernanzaTenantLibresTable endpointId={epId} />;
    const renderHerenciasUsuarioTable = () => <GobernanzaHerenciasUsuarioTable />;
    const inlineExecuteLabel = (ep: EndpointSpec): string => {
      if (ep.method === 'GET') return 'Consultar';
      if (ep.method === 'POST') return 'Guardar';
      if (ep.method === 'PUT') return 'Actualizar';
      if (ep.method === 'DELETE') return 'Confirmar';
      return 'Ejecutar';
    };

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