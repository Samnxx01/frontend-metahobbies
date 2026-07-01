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
  contarVistasCatalogoEnModulo,
  contarVistasCatalogoEnSuite,
  esNodoFormularioLike,
  filterDiosJerarquiaTreeByAllowedIds,
  getModuloNodes,
  getTipoNodoLabel,
  idsPermisoRefsCoinciden,
  isTenantSuperAdminScopeOption,
  collectAllNodes,
  collectFormularioLikeNodes,
  pickArray,
  vistaIdMatchesCatalog,
  vistaIdMatchesIdSet,
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

export const GobernanzaHerenciaSelectionBuilder: React.FC<{ endpoint: EndpointSpec }> = ({ endpoint }) => {
  const ctx = useParametrosGobernanzaCtx();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { acciones, catalogItems, catalogItemsLoaded, catalogSeedRunning, contextos, diosRecursosByFormId, diosRecursosJerarquiaFlat, diosRecursosJerarquiaLoading, diosRecursosJerarquiaTree, diosReglaAccionesSeleccion, diosReglaRecursosSeleccion, herenciaAsociadaDataByEndpoint, herenciaAsociadaOptionsByEndpoint, herenciasExistentesPorTG, herenciasPorUsuario, herenciasUsuario, jerarquiaSaCounters, loadingData, loadingDeltaByEndpoint, loadingHerenciasPorUsuario, loadingUsuarios, politicasRuntimeCatalog, ruleCatalog, rutasJerarquia, saFilterByEndpoint, suiteSelByEndpoint, syncInfoByEndpoint, syncRunningByEndpoint, tenantActualizarPrefillLoading, tenantCorpErrorByEndpoint, tenantCorpLoadingByEndpoint, tenantFilterByEndpoint, tenantGlobalActor, tenantGlobalSelects, tenantGlobales, tenantSuperAdminsJerarquiaCounters, usuariosDestinoSel, usuariosDisponibles, vistas, crearReglasJerarquiaSyncing, expandedModulos, bulkAllMode, PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS, ENDPOINT_IDS_SELECT_MULTI_SA_JERARQUIA, DIOS_REGLAS_ENDPOINT_IDS, TENANT_SUPERADMIN_SCOPE_PREFIX, saJerarquiaConCorporativo, saJerarquiaPosicion, saJerarquiaPosicionDropdown, padreTotalVistas, esJwtSoloTenantSuperAdmin, dominioPorSaMap, running, setDeltaByEndpoint, setDiosReglaAccionesSeleccion, setDiosReglaRecursosSeleccion, setHerenciaAsociadaDataByEndpoint, setHerenciaAsociadaOptionsByEndpoint, setReglasPoliticasRuntimeSel, setSaFilterByEndpoint, setSuiteSelByEndpoint, setSyncInfoByEndpoint, setTenantFilterByEndpoint, setUsuariosDestinoSel, setVistasDesactivarSeleccion, setCrearReglasJerarquiaSyncing, setExpandedModulos, setBulkAllFor, setCatalogSelectionFor, setDiosReglaTenantsSelFor, setDiosReglaUsuariosPorTenantFor, setFieldValue, setPermisos, getCatalogSelection, getCatalogoVistaIdsRelacionadas, getExtraVistaIdsReglaPlantillaCrear, getSelectedRuleCatalogKey, getBulkAllMode, getPermisos, getAccionesPorVistaDesdeRegla, resolveActiveReglasEndpointId, resolveTenantGlobalParaReglasEndpoint, resolverVistaDesdeRutasSeguridad, seleccionarTodasVistasDesactivar, getDiosReglaTenantsSel, getDiosReglaUsuariosPorTenantSel, getFieldValue, getHeredaOptionsPermitidasPorTenantGlobal, getHerenciaGlobalOpcionesParaTG, getHerenciasUsuariosSeleccionadosParaPermUsuario, getPermisosCatalog, getReglasPoliticasRuntimeSel, getReglasFiltradasPorTenant, getTenantCorporativoOptions, getTenantGlobalOptions, getTenantGlobalOptionsForPermUsuario, getTenantGlobalesOpcionesPorSaActualizar, getCorporativoByHerencia, getCorporativosDelTG, resolveSaJerarquiaMetasVisibles, runHerenciaSyncCheck, fetchHerenciasAsociadasByTenantGlobal, fetchHerenciasConReglasParaTenant, fetchTenantCorporativosByGlobal, renderHerenciaAsociadaDetalle, renderHerenciaSelectionBuilder, renderPermisosBuilder, buildDiosReglaSaMetasMap, cargarUsuariosParaEndpoint, cargarHerenciasPorUsuario, actualizarReglasGlobalesSoloLectura, consultaReglasGlobalesRamaCorporativo, diosReglaAlcanceFormularioEditable, endpointDisponibleParaScope, endpointEsReglasGlobalesTenant, findReglaJerarquiaPorSa, handleCatalogSeedDefaults, hydrateData, limpiarActualizarReglasAlCambiarSa, modoSoloLecturaReglasDios, permiteReglaDiosEnActualizarReglasGlobales, politicaRuntimeId, politicaRuntimeLabel, refreshReglasCatalogoPorSaActualizar, reglaSinTenantGlobalMaterializado, resolveDominioTenatPorSa, resolveSaIdCanonicoParaReglas, seleccionarReglaJerarquiaPorSaActualizar, seleccionarReglaParametrizadaPorTenantActualizar, sincronizarCatalogoReglasYHerencia, sincronizarContextoTenantGlobalPermUsuario, toggleCatalogItem, toggleReglaPoliticaRuntime, applyHerenciaAsociadaSelection, applyPermAdminTenantGlobalSelection, applyRuleToForm, applySuiteCatalogSelection, aplicarUsuariosDesdeJerarquiaRef, actorEsTenantCorporativoScope, actorEsTenantGlobalScope, actorEsTenantSuperAdmin, result, resultData, reglasSearch, reglasTenantFilter, reglasHerenciaSyncBusy, vistaSearchByEndpoint, setReglasSearch, setReglasTenantFilter, setVistaSearchByEndpoint } = ctx;

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
                  const totalCatalog =
                    saJerarquiaPosicionDropdown?.esHijo &&
                    padreTotalVistas != null &&
                    (endpoint.id === 'tenant-actualizar-global-reglas' || endpoint.id === 'tenant-crear-global-reglas')
                      ? padreTotalVistas
                      : catalogRelacionadasIds.length;
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
};
