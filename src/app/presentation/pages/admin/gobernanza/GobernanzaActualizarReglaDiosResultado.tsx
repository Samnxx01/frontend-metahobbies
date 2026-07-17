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

export const GobernanzaActualizarReglaDiosResultado: React.FC = () => {
  const ctx = useParametrosGobernanzaCtx();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { acciones, catalogItems, catalogItemsLoaded, catalogSeedRunning, contextos, diosRecursosByFormId, diosRecursosJerarquiaFlat, diosRecursosJerarquiaLoading, diosRecursosJerarquiaTree, diosReglaAccionesSeleccion, diosReglaRecursosSeleccion, herenciaAsociadaDataByEndpoint, herenciaAsociadaOptionsByEndpoint, herenciasExistentesPorTG, herenciasPorUsuario, herenciasUsuario, jerarquiaSaCounters, loadingData, loadingHerenciasPorUsuario, loadingUsuarios, politicasRuntimeCatalog, ruleCatalog, rutasJerarquia, saFilterByEndpoint, suiteSelByEndpoint, syncInfoByEndpoint, syncRunningByEndpoint, tenantActualizarPrefillLoading, tenantCorpErrorByEndpoint, tenantCorpLoadingByEndpoint, tenantFilterByEndpoint, tenantGlobalActor, tenantGlobalSelects, tenantGlobales, tenantSuperAdminsJerarquiaCounters, usuariosDestinoSel, usuariosDisponibles, vistas, crearReglasJerarquiaSyncing, expandedModulos, bulkAllMode, PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS, ENDPOINT_IDS_SELECT_MULTI_SA_JERARQUIA, DIOS_REGLAS_ENDPOINT_IDS, TENANT_SUPERADMIN_SCOPE_PREFIX, saJerarquiaConCorporativo, esJwtSoloTenantSuperAdmin, dominioPorSaMap, running, setDeltaByEndpoint, setDiosReglaAccionesSeleccion, setDiosReglaRecursosSeleccion, setHerenciaAsociadaDataByEndpoint, setHerenciaAsociadaOptionsByEndpoint, setReglasPoliticasRuntimeSel, setSaFilterByEndpoint, setSuiteSelByEndpoint, setSyncInfoByEndpoint, setTenantFilterByEndpoint, setUsuariosDestinoSel, setVistasDesactivarSeleccion, setCrearReglasJerarquiaSyncing, setExpandedModulos, setBulkAllFor, setCatalogSelectionFor, setDiosReglaTenantsSelFor, setDiosReglaUsuariosPorTenantFor, setFieldValue, setPermisos, getCatalogSelection, getCatalogoVistaIdsRelacionadas, getExtraVistaIdsReglaPlantillaCrear, getSelectedRuleCatalogKey, getBulkAllMode, getPermisos, getAccionesPorVistaDesdeRegla, resolveActiveReglasEndpointId, resolveTenantGlobalParaReglasEndpoint, resolverVistaDesdeRutasSeguridad, seleccionarTodasVistasDesactivar, getDiosReglaTenantsSel, getDiosReglaUsuariosPorTenantSel, getFieldValue, getHeredaOptionsPermitidasPorTenantGlobal, getHerenciaGlobalOpcionesParaTG, getHerenciasUsuariosSeleccionadosParaPermUsuario, getPermisosCatalog, getReglasPoliticasRuntimeSel, getReglasFiltradasPorTenant, getTenantCorporativoOptions, getTenantGlobalOptions, getTenantGlobalOptionsForPermUsuario, getTenantGlobalesOpcionesPorSaActualizar, getCorporativoByHerencia, getCorporativosDelTG, resolveSaJerarquiaMetasVisibles, runHerenciaSyncCheck, fetchHerenciasAsociadasByTenantGlobal, fetchHerenciasConReglasParaTenant, fetchTenantCorporativosByGlobal, renderHerenciaAsociadaDetalle, renderHerenciaSelectionBuilder, renderPermisosBuilder, buildDiosReglaSaMetasMap, cargarUsuariosParaEndpoint, cargarHerenciasPorUsuario, actualizarReglasGlobalesSoloLectura, consultaReglasGlobalesRamaCorporativo, diosReglaAlcanceFormularioEditable, endpointDisponibleParaScope, findReglaJerarquiaPorSa, handleCatalogSeedDefaults, limpiarActualizarReglasAlCambiarSa, modoSoloLecturaReglasDios, permiteReglaDiosEnActualizarReglasGlobales, politicaRuntimeId, politicaRuntimeLabel, refreshReglasCatalogoPorSaActualizar, reglaSinTenantGlobalMaterializado, resolveDominioTenatPorSa, resolveSaIdCanonicoParaReglas, seleccionarReglaJerarquiaPorSaActualizar, seleccionarReglaParametrizadaPorTenantActualizar, sincronizarContextoTenantGlobalPermUsuario, toggleReglaPoliticaRuntime, applyHerenciaAsociadaSelection, applyPermAdminTenantGlobalSelection, applyRuleToForm, applySuiteCatalogSelection, aplicarUsuariosDesdeJerarquiaRef, actorEsTenantCorporativoScope, actorEsTenantGlobalScope, actorEsTenantSuperAdmin, result, resultData, reglasSearch, reglasTenantFilter, setReglasSearch, setReglasTenantFilter } = ctx;

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
          <div className="rounded border border-success/20 bg-success/10 px-3 py-2 text-xs font-medium text-success">{respuestaMsg}</div>
        ) : null}
        <div className="grid gap-2 text-xs md:grid-cols-2">
          <div className="rounded border border-success/20 bg-success/10 p-2">
            Vistas faltantes detectadas: <span className="font-semibold">{Number(sync?.vistasFaltantesTotal || 0)}</span>
          </div>
          <div className="rounded border border-success/20 bg-success/10 p-2">
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
