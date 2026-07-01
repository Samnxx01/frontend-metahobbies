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

export const GobernanzaHerenciasUsuarioTable: React.FC = () => {
  const ctx = useParametrosGobernanzaCtx();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { acciones, catalogItems, catalogItemsLoaded, catalogSeedRunning, contextos, diosRecursosByFormId, diosRecursosJerarquiaFlat, diosRecursosJerarquiaLoading, diosRecursosJerarquiaTree, diosReglaAccionesSeleccion, diosReglaRecursosSeleccion, herenciaAsociadaDataByEndpoint, herenciaAsociadaOptionsByEndpoint, herenciasExistentesPorTG, herenciasPorUsuario, herenciasUsuario, jerarquiaSaCounters, loadingData, loadingHerenciasPorUsuario, loadingUsuarios, politicasRuntimeCatalog, ruleCatalog, rutasJerarquia, saFilterByEndpoint, suiteSelByEndpoint, syncInfoByEndpoint, syncRunningByEndpoint, tenantActualizarPrefillLoading, tenantCorpErrorByEndpoint, tenantCorpLoadingByEndpoint, tenantFilterByEndpoint, tenantGlobalActor, tenantGlobalSelects, tenantGlobales, tenantSuperAdminsJerarquiaCounters, usuariosDestinoSel, usuariosDisponibles, vistas, crearReglasJerarquiaSyncing, expandedModulos, bulkAllMode, PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS, ENDPOINT_IDS_SELECT_MULTI_SA_JERARQUIA, DIOS_REGLAS_ENDPOINT_IDS, TENANT_SUPERADMIN_SCOPE_PREFIX, saJerarquiaConCorporativo, esJwtSoloTenantSuperAdmin, dominioPorSaMap, running, setDeltaByEndpoint, setDiosReglaAccionesSeleccion, setDiosReglaRecursosSeleccion, setHerenciaAsociadaDataByEndpoint, setHerenciaAsociadaOptionsByEndpoint, setReglasPoliticasRuntimeSel, setSaFilterByEndpoint, setSuiteSelByEndpoint, setSyncInfoByEndpoint, setTenantFilterByEndpoint, setUsuariosDestinoSel, setVistasDesactivarSeleccion, setCrearReglasJerarquiaSyncing, setExpandedModulos, setBulkAllFor, setCatalogSelectionFor, setDiosReglaTenantsSelFor, setDiosReglaUsuariosPorTenantFor, setFieldValue, setPermisos, getCatalogSelection, getCatalogoVistaIdsRelacionadas, getExtraVistaIdsReglaPlantillaCrear, getSelectedRuleCatalogKey, getBulkAllMode, getPermisos, getAccionesPorVistaDesdeRegla, resolveActiveReglasEndpointId, resolveTenantGlobalParaReglasEndpoint, resolverVistaDesdeRutasSeguridad, seleccionarTodasVistasDesactivar, getDiosReglaTenantsSel, getDiosReglaUsuariosPorTenantSel, getFieldValue, getHeredaOptionsPermitidasPorTenantGlobal, getHerenciaGlobalOpcionesParaTG, getHerenciasUsuariosSeleccionadosParaPermUsuario, getPermisosCatalog, getReglasPoliticasRuntimeSel, getReglasFiltradasPorTenant, getTenantCorporativoOptions, getTenantGlobalOptions, getTenantGlobalOptionsForPermUsuario, getTenantGlobalesOpcionesPorSaActualizar, getCorporativoByHerencia, getCorporativosDelTG, resolveSaJerarquiaMetasVisibles, runHerenciaSyncCheck, fetchHerenciasAsociadasByTenantGlobal, fetchHerenciasConReglasParaTenant, fetchTenantCorporativosByGlobal, renderHerenciaAsociadaDetalle, renderHerenciaSelectionBuilder, renderPermisosBuilder, buildDiosReglaSaMetasMap, cargarUsuariosParaEndpoint, cargarHerenciasPorUsuario, actualizarReglasGlobalesSoloLectura, consultaReglasGlobalesRamaCorporativo, diosReglaAlcanceFormularioEditable, endpointDisponibleParaScope, findReglaJerarquiaPorSa, handleCatalogSeedDefaults, limpiarActualizarReglasAlCambiarSa, modoSoloLecturaReglasDios, permiteReglaDiosEnActualizarReglasGlobales, politicaRuntimeId, politicaRuntimeLabel, refreshReglasCatalogoPorSaActualizar, reglaSinTenantGlobalMaterializado, resolveDominioTenatPorSa, resolveSaIdCanonicoParaReglas, seleccionarReglaJerarquiaPorSaActualizar, seleccionarReglaParametrizadaPorTenantActualizar, sincronizarContextoTenantGlobalPermUsuario, toggleReglaPoliticaRuntime, applyHerenciaAsociadaSelection, applyPermAdminTenantGlobalSelection, applyRuleToForm, applySuiteCatalogSelection, aplicarUsuariosDesdeJerarquiaRef, actorEsTenantCorporativoScope, actorEsTenantGlobalScope, actorEsTenantSuperAdmin, result, resultData, reglasSearch, reglasTenantFilter, setReglasSearch, setReglasTenantFilter } = ctx;

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