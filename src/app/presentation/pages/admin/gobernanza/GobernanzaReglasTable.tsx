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

export const GobernanzaReglasTable: React.FC = () => {
  const ctx = useParametrosGobernanzaCtx();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { acciones, catalogItems, catalogItemsLoaded, catalogSeedRunning, contextos, diosRecursosByFormId, diosRecursosJerarquiaFlat, diosRecursosJerarquiaLoading, diosRecursosJerarquiaTree, diosReglaAccionesSeleccion, diosReglaRecursosSeleccion, herenciaAsociadaDataByEndpoint, herenciaAsociadaOptionsByEndpoint, herenciasExistentesPorTG, herenciasPorUsuario, herenciasUsuario, jerarquiaSaCounters, loadingData, loadingHerenciasPorUsuario, loadingUsuarios, politicasRuntimeCatalog, ruleCatalog, rutasJerarquia, saFilterByEndpoint, suiteSelByEndpoint, syncInfoByEndpoint, syncRunningByEndpoint, tenantActualizarPrefillLoading, tenantCorpErrorByEndpoint, tenantCorpLoadingByEndpoint, tenantFilterByEndpoint, tenantGlobalActor, tenantGlobalSelects, tenantGlobales, tenantSuperAdminsJerarquiaCounters, usuariosDestinoSel, usuariosDisponibles, vistas, crearReglasJerarquiaSyncing, expandedModulos, bulkAllMode, PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS, ENDPOINT_IDS_SELECT_MULTI_SA_JERARQUIA, DIOS_REGLAS_ENDPOINT_IDS, TENANT_SUPERADMIN_SCOPE_PREFIX, saJerarquiaConCorporativo, esJwtSoloTenantSuperAdmin, dominioPorSaMap, running, setDeltaByEndpoint, setDiosReglaAccionesSeleccion, setDiosReglaRecursosSeleccion, setHerenciaAsociadaDataByEndpoint, setHerenciaAsociadaOptionsByEndpoint, setReglasPoliticasRuntimeSel, setSaFilterByEndpoint, setSuiteSelByEndpoint, setSyncInfoByEndpoint, setTenantFilterByEndpoint, setUsuariosDestinoSel, setVistasDesactivarSeleccion, setCrearReglasJerarquiaSyncing, setExpandedModulos, setBulkAllFor, setCatalogSelectionFor, setDiosReglaTenantsSelFor, setDiosReglaUsuariosPorTenantFor, setFieldValue, setPermisos, getCatalogSelection, getCatalogoVistaIdsRelacionadas, getExtraVistaIdsReglaPlantillaCrear, getSelectedRuleCatalogKey, getBulkAllMode, getPermisos, getAccionesPorVistaDesdeRegla, resolveActiveReglasEndpointId, resolveTenantGlobalParaReglasEndpoint, resolverVistaDesdeRutasSeguridad, seleccionarTodasVistasDesactivar, getDiosReglaTenantsSel, getDiosReglaUsuariosPorTenantSel, getFieldValue, getHeredaOptionsPermitidasPorTenantGlobal, getHerenciaGlobalOpcionesParaTG, getHerenciasUsuariosSeleccionadosParaPermUsuario, getPermisosCatalog, getReglasPoliticasRuntimeSel, getReglasFiltradasPorTenant, getTenantCorporativoOptions, getTenantGlobalOptions, getTenantGlobalOptionsForPermUsuario, getTenantGlobalesOpcionesPorSaActualizar, getCorporativoByHerencia, getCorporativosDelTG, resolveSaJerarquiaMetasVisibles, runHerenciaSyncCheck, fetchHerenciasAsociadasByTenantGlobal, fetchHerenciasConReglasParaTenant, fetchTenantCorporativosByGlobal, renderHerenciaAsociadaDetalle, renderHerenciaSelectionBuilder, renderPermisosBuilder, buildDiosReglaSaMetasMap, cargarUsuariosParaEndpoint, cargarHerenciasPorUsuario, actualizarReglasGlobalesSoloLectura, consultaReglasGlobalesRamaCorporativo, diosReglaAlcanceFormularioEditable, endpointDisponibleParaScope, findReglaJerarquiaPorSa, handleCatalogSeedDefaults, limpiarActualizarReglasAlCambiarSa, modoSoloLecturaReglasDios, permiteReglaDiosEnActualizarReglasGlobales, politicaRuntimeId, politicaRuntimeLabel, refreshReglasCatalogoPorSaActualizar, reglaSinTenantGlobalMaterializado, resolveDominioTenatPorSa, resolveSaIdCanonicoParaReglas, seleccionarReglaJerarquiaPorSaActualizar, seleccionarReglaParametrizadaPorTenantActualizar, sincronizarContextoTenantGlobalPermUsuario, toggleReglaPoliticaRuntime, applyHerenciaAsociadaSelection, applyPermAdminTenantGlobalSelection, applyRuleToForm, applySuiteCatalogSelection, aplicarUsuariosDesdeJerarquiaRef, actorEsTenantCorporativoScope, actorEsTenantGlobalScope, actorEsTenantSuperAdmin, result, resultData, reglasSearch, reglasTenantFilter, setReglasSearch, setReglasTenantFilter } = ctx;

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
