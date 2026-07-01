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

export const GobernanzaTenantLibresTable: React.FC<{ endpointId: string }> = ({ endpointId }) => {
  const ctx = useParametrosGobernanzaCtx();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { acciones, catalogItems, catalogItemsLoaded, catalogSeedRunning, contextos, diosRecursosByFormId, diosRecursosJerarquiaFlat, diosRecursosJerarquiaLoading, diosRecursosJerarquiaTree, diosReglaAccionesSeleccion, diosReglaRecursosSeleccion, herenciaAsociadaDataByEndpoint, herenciaAsociadaOptionsByEndpoint, herenciasExistentesPorTG, herenciasPorUsuario, herenciasUsuario, jerarquiaSaCounters, loadingData, loadingHerenciasPorUsuario, loadingUsuarios, politicasRuntimeCatalog, ruleCatalog, rutasJerarquia, saFilterByEndpoint, suiteSelByEndpoint, syncInfoByEndpoint, syncRunningByEndpoint, tenantActualizarPrefillLoading, tenantCorpErrorByEndpoint, tenantCorpLoadingByEndpoint, tenantFilterByEndpoint, tenantGlobalActor, tenantGlobalSelects, tenantGlobales, tenantSuperAdminsJerarquiaCounters, usuariosDestinoSel, usuariosDisponibles, vistas, crearReglasJerarquiaSyncing, expandedModulos, bulkAllMode, PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS, ENDPOINT_IDS_SELECT_MULTI_SA_JERARQUIA, DIOS_REGLAS_ENDPOINT_IDS, TENANT_SUPERADMIN_SCOPE_PREFIX, saJerarquiaConCorporativo, esJwtSoloTenantSuperAdmin, dominioPorSaMap, running, setDeltaByEndpoint, setDiosReglaAccionesSeleccion, setDiosReglaRecursosSeleccion, setHerenciaAsociadaDataByEndpoint, setHerenciaAsociadaOptionsByEndpoint, setReglasPoliticasRuntimeSel, setSaFilterByEndpoint, setSuiteSelByEndpoint, setSyncInfoByEndpoint, setTenantFilterByEndpoint, setUsuariosDestinoSel, setVistasDesactivarSeleccion, setCrearReglasJerarquiaSyncing, setExpandedModulos, setBulkAllFor, setCatalogSelectionFor, setDiosReglaTenantsSelFor, setDiosReglaUsuariosPorTenantFor, setFieldValue, setPermisos, getCatalogSelection, getCatalogoVistaIdsRelacionadas, getExtraVistaIdsReglaPlantillaCrear, getSelectedRuleCatalogKey, getBulkAllMode, getPermisos, getAccionesPorVistaDesdeRegla, resolveActiveReglasEndpointId, resolveTenantGlobalParaReglasEndpoint, resolverVistaDesdeRutasSeguridad, seleccionarTodasVistasDesactivar, getDiosReglaTenantsSel, getDiosReglaUsuariosPorTenantSel, getFieldValue, getHeredaOptionsPermitidasPorTenantGlobal, getHerenciaGlobalOpcionesParaTG, getHerenciasUsuariosSeleccionadosParaPermUsuario, getPermisosCatalog, getReglasPoliticasRuntimeSel, getReglasFiltradasPorTenant, getTenantCorporativoOptions, getTenantGlobalOptions, getTenantGlobalOptionsForPermUsuario, getTenantGlobalesOpcionesPorSaActualizar, getCorporativoByHerencia, getCorporativosDelTG, resolveSaJerarquiaMetasVisibles, runHerenciaSyncCheck, fetchHerenciasAsociadasByTenantGlobal, fetchHerenciasConReglasParaTenant, fetchTenantCorporativosByGlobal, renderHerenciaAsociadaDetalle, renderHerenciaSelectionBuilder, renderPermisosBuilder, buildDiosReglaSaMetasMap, cargarUsuariosParaEndpoint, cargarHerenciasPorUsuario, actualizarReglasGlobalesSoloLectura, consultaReglasGlobalesRamaCorporativo, diosReglaAlcanceFormularioEditable, endpointDisponibleParaScope, findReglaJerarquiaPorSa, handleCatalogSeedDefaults, limpiarActualizarReglasAlCambiarSa, modoSoloLecturaReglasDios, permiteReglaDiosEnActualizarReglasGlobales, politicaRuntimeId, politicaRuntimeLabel, refreshReglasCatalogoPorSaActualizar, reglaSinTenantGlobalMaterializado, resolveDominioTenatPorSa, resolveSaIdCanonicoParaReglas, seleccionarReglaJerarquiaPorSaActualizar, seleccionarReglaParametrizadaPorTenantActualizar, sincronizarContextoTenantGlobalPermUsuario, toggleReglaPoliticaRuntime, applyHerenciaAsociadaSelection, applyPermAdminTenantGlobalSelection, applyRuleToForm, applySuiteCatalogSelection, aplicarUsuariosDesdeJerarquiaRef, actorEsTenantCorporativoScope, actorEsTenantGlobalScope, actorEsTenantSuperAdmin, result, resultData, reglasSearch, reglasTenantFilter, setReglasSearch, setReglasTenantFilter } = ctx;

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