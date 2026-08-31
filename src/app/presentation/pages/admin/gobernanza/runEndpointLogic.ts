// @ts-nocheck
import React from 'react';
import type { EndpointSpec, RunEndpointOpts } from './parametrosGobernanzaTypes';
import { toast } from 'react-toastify';
import { apiFetch } from '@/app/services/api';
import {
  REGLA_SA_SYNTH_PREFIX,
  TENANT_SUPERADMIN_SCOPE_PREFIX,
} from './parametrosGobernanzaConstants';
import {
  TENANT_SUPERADMIN_INSERT_ENDPOINT_ID_SET,
  TENANT_SUPERADMIN_INSERT_OPTIONAL_AUTH_IDS,
  esEndpointAltaTenantPanel,
  esEndpointCreacionSaDocumento,
} from './tenantSuperAdminInsertEndpoints';
import { buildDiosReglaAlcancesPayload } from './diosReglaAlcanceHelpers';
import { resolverSecurityPlatformDesdeTenantSa } from './diosReglaAyudaHelpers';
import {
  collectFormularioLikeNodes,
  esNvl12ParametrosResueltosDesdeJwt,
  getModuloNodes,
  idsPermisoRefsCoinciden,
  isTenantSuperAdminScopeOption,
  normalizeGobernanzaRequestPayloadIds,
  normalizePermisoRefId,
  parseGobernanzaBooleanField,
  parseMaybeJson,
  resolverNvlGeneracionMeta,
  toMongoIdQueryParam,
  type GenericSelectOption,
} from './parametrosGobernanzaPureHelpers';
import { gobernanzaEntityId, gobernanzaEntityIdForPath } from './gobernanzaEntityId';
import {
  toastErrorConTransaccion,
  toastTransaccionDesdePayload,
  type TransaccionResumen,
} from './gobernanzaTransaccionToast';

export interface RunEndpointDeps {
  diosReglaAccionesSeleccion: Record<string, string[]>;
  diosReglaRecursosSeleccion: Record<string, string[]>;
  dominioPorSaMap: any;
  reglas: any[];
  ruleCatalog: Record<string, any>;
  running: Record<string, boolean>;
  suiteSelByEndpoint: Record<string, string>;
  tenantGlobalActor: any;
  tenantGlobalSelects: Record<string, GenericSelectOption[]>;
  tenantSuperAdminsJerarquiaCounters: any[];
  usuariosDestinoSel: Record<string, string[]>;
  PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS: Set<string>;
  herenciaAsociadaOptionsByEndpoint: Record<string, any[]>;
  rutasJerarquia: any[];
  saJerarquiaConCorporativo: boolean;
  vistasDesactivarSeleccion: Record<string, string[]>;
  setResult: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setResultData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setRunning: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setFieldValue: (endpointId: string, field: string, value: string) => void;
  setReglasPoliticasRuntimeSel: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setVistasDesactivarSeleccion: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  actorEsTenantGlobalScope: () => boolean;
  actorEsTenantSuperAdmin: () => boolean;
  actualizarReglasGlobalesSoloLectura: (...args: any[]) => any;
  appendPoliticasRuntimeIdsToBody: (endpointId: string, body: Record<string, unknown>) => void;
  aplicarSecurityPlatformDesdeSaDiosRegla: (endpointId: string, selectedSa: string) => void;
  buildDiosReglaSaMetasMap: (...args: any[]) => any;
  findReglaTechoJerarquiaSa: (saId: string) => any | undefined;
  getBulkAllMode: (endpointId: string) => boolean;
  getCatalogSelection: (endpointId: string) => any;
  getDiosReglaTenantsSel: (endpointId: string) => string[];
  getDiosReglaUsuariosPorTenantSel: (endpointId: string) => Record<string, string[]>;
  getFieldValue: (endpointId: string, field: string) => string;
  getPermisos: (endpointId: string) => any[];
  getPermisosCatalog: (endpointId: string, ruleIdOverride?: string, deltaOverride?: any) => any;
  hydrateData: (options?: { force?: boolean; bundles?: Set<any> }) => Promise<void>;
  recortarSeleccionAlTechoRegla: (endpointId: string, vistas: string[], acciones: string[]) => { vistas: string[]; acciones: string[] };
  reglaSinTenantGlobalMaterializado: (rule: any) => boolean;
  resolveReglaTechoPermUsuario: (endpointId: string) => any;
  resolveSaParaReglasGlobalesEndpoint: (endpointId: string) => string;
  resolveDominioTenatPorSa: (...args: any[]) => any;
  resolveTenantGlobalIdFromRule: (rule: any) => string;
  resolveTenantGlobalParaReglasEndpoint: (endpointId: string) => string;
  validarAlcanceDiosRegla: (endpointId: string) => void;
}

export async function runEndpointLogic(
  endpoint: EndpointSpec,
  deps: RunEndpointDeps,
  opts?: RunEndpointOpts,
): Promise<void> {
  const {
    diosReglaAccionesSeleccion, diosReglaRecursosSeleccion, dominioPorSaMap,
    reglas, ruleCatalog, running, suiteSelByEndpoint, tenantGlobalActor, tenantGlobalSelects,
    tenantSuperAdminsJerarquiaCounters, usuariosDestinoSel,
    PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS, herenciaAsociadaOptionsByEndpoint,
    rutasJerarquia, saJerarquiaConCorporativo, vistasDesactivarSeleccion,
    setResult, setResultData, setRunning, setFieldValue, setReglasPoliticasRuntimeSel,
    setVistasDesactivarSeleccion,
    actorEsTenantGlobalScope, actorEsTenantSuperAdmin, actualizarReglasGlobalesSoloLectura,
    appendPoliticasRuntimeIdsToBody, aplicarSecurityPlatformDesdeSaDiosRegla,
    buildDiosReglaSaMetasMap, findReglaTechoJerarquiaSa, getBulkAllMode,
    getCatalogSelection, getDiosReglaTenantsSel, getDiosReglaUsuariosPorTenantSel,
    getFieldValue, getPermisos, getPermisosCatalog, hydrateData, recortarSeleccionAlTechoRegla,
    reglaSinTenantGlobalMaterializado, resolveReglaTechoPermUsuario,
    resolveSaParaReglasGlobalesEndpoint, resolveDominioTenatPorSa,
    resolveTenantGlobalIdFromRule, resolveTenantGlobalParaReglasEndpoint,
    validarAlcanceDiosRegla,
  } = deps;
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
            endpoint.id === 'tenant-actualizar-global' ||
            endpoint.id === 'tenant-global-actualizar-propio'
          ) &&
          !!getFieldValue(endpoint.id, 'coporativo').trim();
        const isAccionUsuarioMulti =
          field.name === 'accionesUsu' &&
          (
            endpoint.id === 'tenant-crear-global-usuario' ||
            esEndpointCreacionSaDocumento(endpoint.id) ||
            endpoint.id === 'tenant-actualizar-global' ||
            endpoint.id === 'tenant-global-actualizar-propio'
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
          const hayTecho = !!(saSel && !actualizarReglasGlobalesSoloLectura() && findReglaTechoJerarquiaSa(saSel));
          if (hayTecho) {
            // vistasCatalogo ya fue construido con aplicarTechoJerarquia aplicado; usarlo como
            // set permitido evita el mismatch raw-ObjectId vs iud-cifrado que causaba falsos positivos.
            const techoIds = new Set(vistasCatalogo.map((v: any) => v.id));
            const fueraTecho = vistasBase.filter(
              (vid: string) => !techoIds.has(vid) && !vistasCatalogo.some((v: any) => idsPermisoRefsCoinciden(v.id, vid)),
            );
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
        const ruleId = getFieldValue(endpoint.id, 'x-regla-id').trim();
        if (!ruleId) throw new Error('Selecciona la regla a actualizar (x-regla-id)');
        const saSeleccionado = resolveSaParaReglasGlobalesEndpoint(endpoint.id);
        if (!saSeleccionado) throw new Error('Selecciona el TenantSuperAdmin (SA) de la regla');
        body.tenantSuperAdmin = toMongoIdQueryParam(saSeleccionado);
        delete body.tenantGlobal;
      }
      if (
        endpoint.id === 'tenant-crear-global-usuario' ||
        esEndpointCreacionSaDocumento(endpoint.id) ||
        endpoint.id === 'tenant-actualizar-global' ||
        endpoint.id === 'tenant-global-actualizar-propio'
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
          for (const key of ['coporativo', 'tenantGlobalRef', 'apisDominios', 'rolesMabs', 'rolGlobal'] as const) {
            if (body[key]) body[key] = gobernanzaEntityId(body[key]);
          }
          if (!esSuperAdminUsuario && 'tenantGlobalRef' in body) {
            const autoRef = String(tenantGlobalActor?.tenantGlobalId || '').trim();
            if (autoRef) body.tenantGlobalRef = gobernanzaEntityId(autoRef);
          }
        }
        if (
          esEndpointCreacionSaDocumento(endpoint.id) ||
          endpoint.id === 'tenant-actualizar-global' ||
          endpoint.id === 'tenant-global-actualizar-propio'
        ) {
          if (Array.isArray(body.accionesUsu)) {
            body.accionesUsu = body.accionesUsu.map((id: unknown) => gobernanzaEntityId(id)).filter(Boolean);
          }
          for (const key of [
            'nvlGeneracionTenant',
            'tipo_tenant',
            'coporativo',
            'apisDominios',
            'rolesMabs',
            'rolGlobal',
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
}
