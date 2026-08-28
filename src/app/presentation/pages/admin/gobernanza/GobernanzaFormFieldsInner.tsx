import React from 'react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { GOVERNANCE_PERMISSIONS_ACTION_IDS, GovernedButton } from '@/app/presentation/actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, RefreshCw } from 'lucide-react';
import { useParametrosGobernanzaCtx } from './ParametrosGobernanzaCtx';
import type { EndpointSpec } from './parametrosGobernanzaTypes';
import {
  renderTenantGlobalSelectOptionGroups,
  collectAllNodes,
  collectFormularioLikeNodes,
  esNvl12ParametrosResueltosDesdeJwt,
  findReglaPlataformaPorSuperAdmin,
  idsPermisoRefsCoinciden,
  isTenantSuperAdminScopeOption,
  normalizePermisoRefId,
  buildVistaLocationMap,
  getEntityId,
  getTipoNodoLabel,
  resolveContextoIdFromRegla,
  resolverNvlGeneracionMeta,
  type GenericSelectOption,
  type HeredaGlobalOption,
} from './parametrosGobernanzaPureHelpers';
import { esEndpointCreacionSaDocumento } from './tenantSuperAdminInsertEndpoints';
import { mergeSelectOptionForValue } from './tenantGlobalSelectHelpers';
import { type DiosRecursoRow, formatDiosRecursoJerarquiaTipo } from './diosReglaRecursosJerarquia';
import { resolverSecurityPlatformDesdeTenantSa } from './diosReglaAyudaHelpers';
import { DiosReglaAlcanceTenantsPanel } from './DiosReglaAlcanceTenantsPanel';
import { DiosReglaRecursosJerarquiaPanel } from './DiosReglaRecursosJerarquiaPanel';
import { ReglasActualizarSaAlcancePanel } from './ReglasActualizarSaAlcancePanel';

export const GobernanzaFormFieldsInner: React.FC<{
  endpoint: EndpointSpec;
  opts?: { omitGenericFields?: boolean };
}> = ({ endpoint, opts }) => {
  const {
    acciones,
    catalogItems,
    catalogItemsLoaded,
    catalogSeedRunning,
    contextos,
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
    loadingHerenciasPorUsuario,
    loadingUsuarios,
    politicasRuntimeCatalog,
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
    usuariosDestinoSel,
    usuariosDisponibles,
    vistas,
    PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS,
    ENDPOINT_IDS_SELECT_MULTI_SA_JERARQUIA,
    TENANT_SUPERADMIN_SCOPE_PREFIX,
    saJerarquiaConCorporativo,
    esJwtSoloTenantSuperAdmin,
    scopeJwtSaAlcanceJerarquiaValidado,
    saJerarquiaTieneCorporativoEnCountersEfectivo,
    tenantActualizarLoadedIdRef,
    tenantActualizarLabelsRef,
    tenantUpdateTargets,
    dominioPorSaMap,
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
    resolveSaJerarquiaMetasVisibles,
    runHerenciaSyncCheck,
    fetchHerenciasAsociadasByTenantGlobal,
    fetchHerenciasConReglasParaTenant,
    fetchTenantCorporativosByGlobal,
    renderHerenciaAsociadaDetalle,
    renderHerenciaSelectionBuilder,
    renderPermisosBuilder,
    buildDiosReglaSaMetasMap,
    cargarUsuariosParaEndpoint,
    cargarHerenciasPorUsuario,
    actualizarReglasGlobalesSoloLectura,
    consultaReglasGlobalesRamaCorporativo,
    diosReglaAlcanceFormularioEditable,
    endpointDisponibleParaScope,
    findReglaJerarquiaPorSa,
    handleCatalogSeedDefaults,
    limpiarActualizarReglasAlCambiarSa,
    modoSoloLecturaReglasDios,
    permiteReglaDiosEnActualizarReglasGlobales,
    politicaRuntimeId,
    politicaRuntimeLabel,
    refreshReglasCatalogoPorSaActualizar,
    reglaSinTenantGlobalMaterializado,
    resolveDominioTenatPorSa,
    resolveSaIdCanonicoParaReglas,
    seleccionarReglaJerarquiaPorSaActualizar,
    seleccionarReglaParametrizadaPorTenantActualizar,
    sincronizarContextoTenantGlobalPermUsuario,
    toggleReglaPoliticaRuntime,
    applyHerenciaAsociadaSelection,
    applyPermAdminTenantGlobalSelection,
    applyRuleToForm,
    applySuiteCatalogSelection,
    aplicarUsuariosDesdeJerarquiaRef,
    actorEsTenantCorporativoScope,
    actorEsTenantGlobalScope,
    actorEsTenantSuperAdmin,
  } = useParametrosGobernanzaCtx();

  return (    <>
      {(PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpoint.id) || endpoint.id === 'perm-admin-tenant-global') ? (
        <div className="rounded-md border border-info/20 bg-info/10 p-3 text-xs text-info">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <GovernedButton
              actionId={GOVERNANCE_PERMISSIONS_ACTION_IDS.VALIDATE_NEW_ROUTES}
              type="button"
              size="sm"
              variant="outline"
              disabled={!!syncRunningByEndpoint[endpoint.id]}
              onClick={() => runHerenciaSyncCheck(endpoint.id, false)}
            >
              Validar rutas nuevas
            </GovernedButton>
            <GovernedButton
              actionId={GOVERNANCE_PERMISSIONS_ACTION_IDS.SYNC_NOW}
              type="button"
              size="sm"
              variant="outline"
              disabled={!!syncRunningByEndpoint[endpoint.id]}
              onClick={() => runHerenciaSyncCheck(endpoint.id, true)}
            >
              Sincronizar ahora
            </GovernedButton>
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
                  <div className="max-h-36 overflow-auto rounded border border-info/20 bg-card p-2 text-[11px] text-foreground">
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
                  <p className="mt-1 text-xs text-destructive">
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
        <div className="rounded-md border border-success/20 bg-success/10 p-3 space-y-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <p className="text-success font-medium">
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
                          className="accent-success mt-0.5 shrink-0"
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
                const vistaIdsEnHerencia = new Set((vcSuite as { id: string }[]).map((v) => v.id));
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
                  <div className="rounded-lg border border-success/80 bg-success/50 p-3">
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
                    <p className="text-xs text-warning">
                      No hay opciones de tenant cargadas. Pulsa Recargar datos API.
                    </p>
                  ) : null}
                </div>
              );
            }
            return (
              <div key={field.name} className="space-y-4">
                {scopeOpts.length > 0 && !ocultarSelectorSuperAdmin ? (
                  <div className="rounded-lg border border-warning/80 bg-warning/50 p-3">
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
                <div className="rounded-lg border border-success/80 bg-success/50 p-3">
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
                  <p className="text-xs text-warning">
                    No hay opciones de tenant cargadas. Pulsa Recargar datos API.
                  </p>
                ) : null}
              </div>
            );
          }
          const tenantOptions = getTenantGlobalOptions(endpoint.id);
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
                      <div className="mt-2 space-y-1 rounded-md border border-info/10 bg-info/70 px-2 py-1.5">
                        <p className="text-[11px] font-semibold text-info">
                          Usuarios en la rama de este tenant global
                          {soloConsulta ? (
                            <span className="ml-1 font-normal text-muted-foreground">(solo consulta)</span>
                          ) : null}
                        </p>
                        <p className="text-[11px] text-info/90">
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
                      <div className="mt-2 space-y-1 rounded-md border border-info/10 bg-info/70 px-2 py-2">
                        <Label className="text-xs font-semibold text-info">
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
                <p className="mt-1 text-xs text-warning">
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
                <p className="mt-1 text-xs text-destructive">
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
                <p className="mt-1 text-xs text-warning">
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
                  {loadingData ? 'Cargando opciones...' : 'Selecciona Tenant SA descendiente'}
                </option>
                {tenantUpdateTargets.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                {actorEsTenantSuperAdminScope
                  ? 'Scope tenantSuperAdmin: solo aparecen SA descendientes y subdescendientes. DIOS raíz sin codigoPadre ve todos los SA activos.'
                  : actorEsTenantGlobal
                  ? 'Scope tenantGlobal: solo puedes seleccionar tu tenantGlobal y sus nodos corporativos descendientes.'
                  : 'El listado se resuelve desde tu scope actual.'}
              </p>
              {!loadingData && !tenantUpdateTargets.length ? (
                <p className="mt-1 text-xs text-warning">
                  No hay Tenant SA descendientes disponibles para actualizar con tu scope actual.
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
          const _nvlMetaNum = String(nvlMeta?.nvl ?? '').trim(); void _nvlMetaNum;
          const _nvlTexto = String(nvlLabel).toLowerCase(); void _nvlTexto;
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
                <p className="mt-1 rounded-md border border-success/20 bg-success/10 px-3 py-2 text-xs text-success">
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
                      ? 'border-destructive/30 bg-destructive/60 font-medium text-foreground focus:border-destructive/50'
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
                <p className="mt-1 text-xs text-destructive">
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
                <p className="mt-1 text-xs text-warning">
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
                <p className="mt-1 text-xs text-success">
                  NVL 0: corporativo opcional. Si eliges uno, debe ser coherente con tu rama; el alta sigue validando codigo de jerarquia en backend según scope.
                </p>
              ) : null}
              {ownerTypeBloqueadoPorScope ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  `ownerType` solo puede ajustarlo un usuario con scope `tenantSuperAdmin`.
                </p>
              ) : null}
              {field.name === 'tenantGlobalRef' && actorEsTenantGlobalPuro ? (
                <p className="mt-1 text-xs text-info">
                  Flujo puro <span className="font-semibold">tenantGlobal</span>: la referencia queda amarrada a tu propio tenantGlobal y solo afecta tu rama descendente.
                </p>
              ) : null}
              {field.name === 'tenantGlobalRef' && actorEsTenantSuperAdminScope ? (
                <p className="mt-1 text-xs text-info">
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
                  <div className="rounded-md border border-border bg-card/70 px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-semibold">Modo consulta: </span>
                    tu JWT tiene corporativo en tenantJerarquiaCounter. Elige un tenant global de tu rama para ver la
                    regla parametrizada (vistas, acciones y políticas). No se valida contra el techo del SA padre ni
                    puedes guardar cambios desde este flujo.
                  </div>
                ) : null}
                <div>
                  <Label>Tenant global {modoSaSinTg ? '' : '*'}</Label>
                  <select
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
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
                    <p className="mt-1 text-xs text-muted-foreground">
                      El SuperAdmin elegido no tiene regla global (view) con tenant materializado. Crea la regla desde «Crear reglas globales» o sincroniza jerarquía.
                    </p>
                  ) : null}
                  {modoSaSinTg ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Regla parametrizada por SuperAdmin (generacionTenatGlobales). No requiere tenant global en counters — edita vistas y permisos abajo.
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label>{field.label} {field.required ? '*' : ''}</Label>
                  <select
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
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
                    <p className="mt-1 text-xs text-warning">
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
                    <p className="mt-1 text-xs text-warning">
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
                    <p className="mt-1 text-xs text-warning">
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
                      className="text-xs text-info hover:underline disabled:opacity-50"
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
                {corpError && <p className="mt-1 text-xs text-destructive">{corpError}</p>}
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
          <div className="rounded-xl border border-info/10 bg-info/60 p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-info">
                Usuarios destino ({seleccionados.length}/{disponibles.length})
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded border border-info/30 bg-card px-2 py-1 text-xs text-info hover:bg-info/10"
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
              <p className="text-xs text-info">Cargando usuarios...</p>
            ) : disponibles.length === 0 ? (
              <p className="text-xs text-muted-foreground">No hay usuarios disponibles.</p>
            ) : (
              <div className="max-h-48 overflow-auto rounded-md border border-info/20 bg-card p-2 space-y-2">
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
                          <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
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
                          <div className="ml-5 rounded-md border border-success/20 bg-success/10 px-2 py-1.5 space-y-1">
                            <p className="text-[10px] font-semibold text-success uppercase tracking-wide">
                              Parametrizado en {tgsUsu.length} tenantGlobal{tgsUsu.length > 1 ? 'es' : ''}
                            </p>
                            {tgsUsu.map((tg) => (
                              <div key={tg.id} className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-success">
                                <span className="font-mono text-success">{tg.id.slice(-8)}</span>
                                <span className="flex-1 truncate">{tg.label !== tg.id ? tg.label : ''}</span>
                                <span>V:<strong>{tg.vistas}</strong></span>
                                <span>A:<strong>{tg.acciones}</strong></span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      {tieneHerencia && seleccionados.includes(u.id) && (
                        <div className="ml-5 rounded-md border border-warning/20 bg-warning/10 px-2 py-1.5 space-y-1">
                          <p className="text-[10px] font-semibold text-warning uppercase tracking-wide">Herencias existentes</p>
                          {herenciasUsu.map((h: any) => {
                            const hId = String(h?.iud || h?._id || '');
                            const vistas = Array.isArray(h?.vistas) ? h.vistas.length : 0;
                            const acciones = Array.isArray(h?.acciones) ? h.acciones.length : 0;
                            const tgRef = String(h?.tenantGlobal?.label || h?.tenantGlobal?.correo || h?.tenantGlobal || '');
                            const tcRef = String(h?.tenantCorporativo?.label || h?.tenantCorporativo?.correo || h?.tenantCorporativo || '');
                            return (
                              <div key={hId} className="text-[10px] text-warning flex flex-wrap gap-x-3 gap-y-0.5">
                                <span>Vistas: <strong>{vistas}</strong></span>
                                <span>Acciones: <strong>{acciones}</strong></span>
                                {tgRef && <span>TG: <strong>{tgRef}</strong></span>}
                                {tcRef && <span>TC: <strong>{tcRef}</strong></span>}
                                <span className="text-warning font-mono">{hId.slice(-6)}</span>
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
              <p className="text-xs text-info font-medium">
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
              <div className="rounded-md border border-warning/20 bg-warning/10 px-3 py-2 text-xs text-warning">
                <span className="font-semibold">Modo referencia (jerarquía con corporativo): </span>
                vistas y acciones acotadas a la regla DIOS parametrizada para tu tenantSuperAdmin. Ejecutar está deshabilitado; el servidor también bloquea crear/sincronizar totales en este perfil.
              </div>
            ) : scopeJwtSaAlcanceJerarquiaValidado ? (
              <div className="rounded-md border border-success/20 bg-success/10 px-3 py-2 text-xs text-success">
                Alcance JWT validado en{' '}
                <code className="rounded bg-card/80 px-1">tenantJerarquiaCounter</code>. Puedes crear la regla DIOS y
                usar &quot;Sincronizar regla DIOS&quot; para alinear todas las vistas activas (el servidor valida configs NVL y rama).
              </div>
            ) : esJwtSoloTenantSuperAdmin ? (
              <div className="rounded-md border border-warning/20 bg-warning/10 px-3 py-2 text-xs text-warning">
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
};
