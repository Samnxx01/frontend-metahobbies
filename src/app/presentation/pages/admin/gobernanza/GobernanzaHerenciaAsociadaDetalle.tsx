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
  filterDiosJerarquiaTreeByAllowedIds,
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

export const GobernanzaHerenciaAsociadaDetalle: React.FC<{ endpointId: string }> = ({ endpointId }) => {
  const ctx = useParametrosGobernanzaCtx();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { acciones, catalogItems, catalogItemsLoaded, catalogSeedRunning, contextos, diosRecursosByFormId, diosRecursosJerarquiaFlat, diosRecursosJerarquiaLoading, diosRecursosJerarquiaTree, diosReglaAccionesSeleccion, diosReglaRecursosSeleccion, herenciaAsociadaDataByEndpoint, herenciaAsociadaOptionsByEndpoint, herenciasExistentesPorTG, herenciasPorUsuario, herenciasUsuario, jerarquiaSaCounters, loadingData, loadingHerenciasPorUsuario, loadingUsuarios, politicasRuntimeCatalog, ruleCatalog, rutasJerarquia, saFilterByEndpoint, suiteSelByEndpoint, syncInfoByEndpoint, syncRunningByEndpoint, tenantActualizarPrefillLoading, tenantCorpErrorByEndpoint, tenantCorpLoadingByEndpoint, tenantFilterByEndpoint, tenantGlobalActor, tenantGlobalSelects, tenantGlobales, tenantSuperAdminsJerarquiaCounters, usuariosDestinoSel, usuariosDisponibles, vistasDesactivarSeleccion, vistas, crearReglasJerarquiaSyncing, expandedModulos, bulkAllMode, PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS, ENDPOINT_IDS_SELECT_MULTI_SA_JERARQUIA, DIOS_REGLAS_ENDPOINT_IDS, TENANT_SUPERADMIN_SCOPE_PREFIX, saJerarquiaConCorporativo, esJwtSoloTenantSuperAdmin, dominioPorSaMap, running, setDeltaByEndpoint, setDiosReglaAccionesSeleccion, setDiosReglaRecursosSeleccion, setHerenciaAsociadaDataByEndpoint, setHerenciaAsociadaOptionsByEndpoint, setReglasPoliticasRuntimeSel, setSaFilterByEndpoint, setSuiteSelByEndpoint, setSyncInfoByEndpoint, setTenantFilterByEndpoint, setUsuariosDestinoSel, setVistasDesactivarSeleccion, setCrearReglasJerarquiaSyncing, setExpandedModulos, setBulkAllFor, setCatalogSelectionFor, setDiosReglaTenantsSelFor, setDiosReglaUsuariosPorTenantFor, setFieldValue, setPermisos, getCatalogSelection, getCatalogoVistaIdsRelacionadas, getExtraVistaIdsReglaPlantillaCrear, getSelectedRuleCatalogKey, getBulkAllMode, getPermisos, getAccionesPorVistaDesdeRegla, resolveActiveReglasEndpointId, resolveTenantGlobalParaReglasEndpoint, resolverVistaDesdeRutasSeguridad, getDiosReglaTenantsSel, getDiosReglaUsuariosPorTenantSel, getFieldValue, getHeredaOptionsPermitidasPorTenantGlobal, getHerenciaGlobalOpcionesParaTG, getHerenciasUsuariosSeleccionadosParaPermUsuario, getPermisosCatalog, getReglasPoliticasRuntimeSel, getReglasFiltradasPorTenant, getTenantCorporativoOptions, getTenantGlobalOptions, getTenantGlobalOptionsForPermUsuario, getTenantGlobalesOpcionesPorSaActualizar, getCorporativoByHerencia, getCorporativosDelTG, resolveSaJerarquiaMetasVisibles, runHerenciaSyncCheck, fetchHerenciasAsociadasByTenantGlobal, fetchHerenciasConReglasParaTenant, fetchTenantCorporativosByGlobal, renderHerenciaAsociadaDetalle, renderHerenciaSelectionBuilder, renderPermisosBuilder, buildDiosReglaSaMetasMap, cargarUsuariosParaEndpoint, cargarHerenciasPorUsuario, actualizarReglasGlobalesSoloLectura, consultaReglasGlobalesRamaCorporativo, diosReglaAlcanceFormularioEditable, endpointDisponibleParaScope, findReglaJerarquiaPorSa, handleCatalogSeedDefaults, limpiarActualizarReglasAlCambiarSa, modoSoloLecturaReglasDios, permiteReglaDiosEnActualizarReglasGlobales, politicaRuntimeId, politicaRuntimeLabel, refreshReglasCatalogoPorSaActualizar, reglaSinTenantGlobalMaterializado, resolveDominioTenatPorSa, resolveSaIdCanonicoParaReglas, seleccionarReglaJerarquiaPorSaActualizar, seleccionarReglaParametrizadaPorTenantActualizar, sincronizarContextoTenantGlobalPermUsuario, toggleReglaPoliticaRuntime, applyHerenciaAsociadaSelection, applyPermAdminTenantGlobalSelection, applyRuleToForm, applySuiteCatalogSelection, aplicarUsuariosDesdeJerarquiaRef, actorEsTenantCorporativoScope, actorEsTenantGlobalScope, actorEsTenantSuperAdmin, result, resultData, reglasSearch, reglasTenantFilter, setReglasSearch, setReglasTenantFilter } = ctx;

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
          <p className="text-[10px] font-semibold uppercase tracking-wide text-info">{titulo}</p>
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
        className={`flex items-start gap-2 rounded border px-2 py-1.5 text-xs ${puedeSeleccionarVista ? 'cursor-pointer' : ''} ${puedeSeleccionarVista && seleccionSet.has(vista.id) ? 'border-destructive/30 bg-destructive/10' : 'border-border/80 bg-muted/50'}`}
      >
        {puedeSeleccionarVista && (
          <input
            type="checkbox"
            className="mt-0.5 shrink-0 accent-destructive"
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
      <div className="md:col-span-2 rounded-lg border border-destructive/10 bg-destructive/50 p-3">
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
        <div className="mb-3 grid gap-3 rounded-md border border-info/20 bg-info/50 p-3 text-xs md:grid-cols-2">
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
                    <p className="mb-1 rounded bg-warning/10 px-2 py-0.5 text-xs font-bold text-warning">Sin suite asignada</p>
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
                    className="text-xs text-destructive underline"
                    onClick={seleccionarTodasVistasDesactivar}
                  >
                    Seleccionar todas
                  </button>
                  <button type="button" className="text-xs text-muted-foreground underline" onClick={limpiarVistasDesactivar}>
                    Limpiar selección
                  </button>
                </div>
                {seleccionadas.length > 0 ? (
                  <div className="rounded border border-warning/20 bg-warning/10 px-2 py-1.5">
                    <p className="text-xs font-medium text-warning">
                      {endpointId === 'perm-admin-tenant-global-eliminar'
                        ? `Se enviará PATCH para quitar ${seleccionadas.length} vista${seleccionadas.length === 1 ? '' : 's'} de la herencia (no borra el documento completo).`
                        : `Se enviará PATCH con vistaIds (${seleccionadas.length} vista${seleccionadas.length === 1 ? '' : 's'}).`}
                    </p>
                  </div>
                ) : endpointId === 'perm-admin-tenant-global-eliminar' ? (
                  <p className="text-xs font-medium text-destructive">
                    Sin vistas marcadas: eliminación definitiva del registro (DELETE …/force).
                  </p>
                ) : (
                  <p className="text-xs font-medium text-destructive">
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
