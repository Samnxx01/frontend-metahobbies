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

export const GobernanzaPermisosBuilder: React.FC<{ endpoint: EndpointSpec }> = ({ endpoint }) => {
  const ctx = useParametrosGobernanzaCtx();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { acciones, catalogItems, catalogItemsLoaded, catalogSeedRunning, contextos, diosRecursosByFormId, diosRecursosJerarquiaFlat, diosRecursosJerarquiaLoading, diosRecursosJerarquiaTree, diosReglaAccionesSeleccion, diosReglaRecursosSeleccion, herenciaAsociadaDataByEndpoint, herenciaAsociadaOptionsByEndpoint, herenciasExistentesPorTG, herenciasPorUsuario, herenciasUsuario, jerarquiaSaCounters, loadingData, loadingDeltaByEndpoint, loadingHerenciasPorUsuario, loadingUsuarios, politicasRuntimeCatalog, ruleCatalog, rutasJerarquia, saFilterByEndpoint, suiteSelByEndpoint, syncInfoByEndpoint, syncRunningByEndpoint, tenantActualizarPrefillLoading, tenantCorpErrorByEndpoint, tenantCorpLoadingByEndpoint, tenantFilterByEndpoint, tenantGlobalActor, tenantGlobalSelects, tenantGlobales, tenantSuperAdminsJerarquiaCounters, usuariosDestinoSel, usuariosDisponibles, vistas, crearReglasJerarquiaSyncing, expandedModulos, bulkAllMode, PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS, ENDPOINT_IDS_SELECT_MULTI_SA_JERARQUIA, DIOS_REGLAS_ENDPOINT_IDS, TENANT_SUPERADMIN_SCOPE_PREFIX, saJerarquiaConCorporativo, esJwtSoloTenantSuperAdmin, dominioPorSaMap, running, setDeltaByEndpoint, setDiosReglaAccionesSeleccion, setDiosReglaRecursosSeleccion, setHerenciaAsociadaDataByEndpoint, setHerenciaAsociadaOptionsByEndpoint, setReglasPoliticasRuntimeSel, setSaFilterByEndpoint, setSuiteSelByEndpoint, setSyncInfoByEndpoint, setTenantFilterByEndpoint, setUsuariosDestinoSel, setVistasDesactivarSeleccion, setCrearReglasJerarquiaSyncing, setExpandedModulos, setBulkAllFor, setCatalogSelectionFor, setDiosReglaTenantsSelFor, setDiosReglaUsuariosPorTenantFor, setFieldValue, setPermisos, getCatalogSelection, getCatalogoVistaIdsRelacionadas, getExtraVistaIdsReglaPlantillaCrear, getSelectedRuleCatalogKey, getBulkAllMode, getPermisos, getAccionesPorVistaDesdeRegla, resolveActiveReglasEndpointId, resolveTenantGlobalParaReglasEndpoint, resolverVistaDesdeRutasSeguridad, seleccionarTodasVistasDesactivar, getDiosReglaTenantsSel, getDiosReglaUsuariosPorTenantSel, getFieldValue, getHeredaOptionsPermitidasPorTenantGlobal, getHerenciaGlobalOpcionesParaTG, getHerenciasUsuariosSeleccionadosParaPermUsuario, getPermisosCatalog, getReglasPoliticasRuntimeSel, getReglasFiltradasPorTenant, getTenantCorporativoOptions, getTenantGlobalOptions, getTenantGlobalOptionsForPermUsuario, getTenantGlobalesOpcionesPorSaActualizar, getCorporativoByHerencia, getCorporativosDelTG, resolveSaJerarquiaMetasVisibles, runHerenciaSyncCheck, fetchHerenciasAsociadasByTenantGlobal, fetchHerenciasConReglasParaTenant, fetchTenantCorporativosByGlobal, renderHerenciaAsociadaDetalle, renderHerenciaSelectionBuilder, renderPermisosBuilder, buildDiosReglaSaMetasMap, cargarUsuariosParaEndpoint, cargarHerenciasPorUsuario, actualizarReglasGlobalesSoloLectura, consultaReglasGlobalesRamaCorporativo, diosReglaAlcanceFormularioEditable, endpointDisponibleParaScope, findReglaJerarquiaPorSa, handleCatalogSeedDefaults, hydrateData, limpiarActualizarReglasAlCambiarSa, modoSoloLecturaReglasDios, permiteReglaDiosEnActualizarReglasGlobales, politicaRuntimeId, politicaRuntimeLabel, refreshReglasCatalogoPorSaActualizar, reglaSinTenantGlobalMaterializado, resolveDominioTenatPorSa, resolveSaIdCanonicoParaReglas, seleccionarReglaJerarquiaPorSaActualizar, seleccionarReglaParametrizadaPorTenantActualizar, sincronizarContextoTenantGlobalPermUsuario, toggleReglaPoliticaRuntime, applyHerenciaAsociadaSelection, applyPermAdminTenantGlobalSelection, applyRuleToForm, applySuiteCatalogSelection, aplicarUsuariosDesdeJerarquiaRef, actorEsTenantCorporativoScope, actorEsTenantGlobalScope, actorEsTenantSuperAdmin, result, resultData, reglasSearch, reglasTenantFilter, setReglasSearch, setReglasTenantFilter } = ctx;

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
      <div className="rounded-xl border border-destructive/10 bg-card/80 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-destructive">Vistas activas + acciones activas</p>
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
          <div className="rounded-md border border-info/20 bg-info/10 p-3 text-xs text-info flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin shrink-0" />
            Calculando vistas faltantes para esta regla…
          </div>
        ) : !vistasCatalogo.length && endpoint.id === 'tenant-actualizar-global-reglas' && !getFieldValue(endpoint.id, 'x-regla-id') ? (
          <div className="rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
            Selecciona una regla para ver las vistas disponibles.
          </div>
        ) : !vistasCatalogo.length ? (
          <div className="rounded-md border border-warning/20 bg-warning/10 p-3 text-xs text-warning">
            Faltan datos para construir permisos.
            <Button className="ml-2 h-7 px-2 text-xs" type="button" variant="outline" onClick={() => void hydrateData({ force: true })} disabled={loadingData}>
              Recargar datos
            </Button>
          </div>
        ) : null}
        {isTenantReglasEndpoint && allViewsWithAllActionsSelected ? (
          <div className="mb-3 rounded-lg border border-success/20 bg-success/10 p-3 text-xs text-success">
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
