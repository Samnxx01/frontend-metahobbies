import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { apiFetch } from '@/app/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Building2,
  KeyRound,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Settings2,
  Shield,
  ShieldCheck,
  X,
} from 'lucide-react';
import { ParametrosGobernanzaModalFormLayout } from './gobernanza/ParametrosGobernanzaModalFormLayout';
import {
  expandTenantGlobalDescendants,
  filtrarTenantGlobalesPorJerarquiaSuperAdmin,
  tenantGlobalOptionsFromJerarquiaUsuarios,
} from './gobernanza/tenantGlobalJerarquiaHelpers';
import { getJerarquiaUsuarios, type JerarquiaResponse } from '@/app/services/tenantUsuariosService';

/** Tiempo máximo para refrescar GET jerarquía usuarios (evita UI colgada en «Cargando…»). */
const JERARQUIA_USUARIOS_FETCH_MS = 22_000;

/** Cambia si recurso/acciones o metadatos de cualquier regla cambian (no solo la cantidad de claves). */
function computeRuleCatalogPermisosDigest(catalog: Record<string, any>): string {
  const keys = Object.keys(catalog || {}).sort();
  const chunks: string[] = [];
  for (const k of keys) {
    const r = catalog[k];
    const vr = (Array.isArray(r?.recurso) ? r.recurso : [])
      .map((x: any) => String(x?._id || x || '').trim())
      .filter(Boolean)
      .sort()
      .join(',');
    const ar = (Array.isArray(r?.accionesUsu) ? r.accionesUsu : [])
      .map((x: any) => String(x?._id || x || '').trim())
      .filter(Boolean)
      .sort()
      .join(',');
    const ts = String(r?.updatedAt || r?.updated_at || r?.fechaModificacion || '').trim();
    chunks.push(`${k}:${vr}:${ar}:${ts}`);
  }
  return `${keys.length}|${chunks.join(';')}`;
}

/** Intervalo para re-leer herencias en modal PUT admin/global (lectura alineada con servidor sin pulsar checks). */
const POLL_HERENCIA_ADMIN_MS = 45_000;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type EndpointSection = 'tenant' | 'permisos' | 'corporativo';
export type EndpointActor = 'tenantSuperAdmin' | 'tenantGlobal' | 'ambos';
type FieldType = 'text' | 'textarea' | 'json' | 'id' | 'permisos' | 'context';

export type FieldSpec = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  header?: boolean;
  pathParam?: boolean;
};

export type EndpointSpec = {
  id: string;
  section: EndpointSection;
  actor: EndpointActor;
  method: HttpMethod;
  path: string;
  title: string;
  description: string;
  fields: FieldSpec[];
  primary?: boolean;
};

export interface ParametrosGobernanzaProps {
  mode?: 'full' | 'rules' | 'superAdmin' | 'superAdminRules';
  initialSection?: EndpointSection;
  lockedSection?: EndpointSection | null;
  allowedEndpointIds?: string[];
  /**
   * Abre el modal del endpoint al montar (p. ej. `?endpoint=tenant-crear-global-reglas`).
   * Solo se aplica cuando cambia respecto al ciclo anterior (no reabre tras cerrar si la URL sigue igual).
   */
  initialEndpointId?: string | null;
  /** Si true, al cerrar el modal se invoca `onRouteEndpointClear` (p. ej. limpiar query). */
  syncRouteWithEndpoint?: boolean;
  onRouteEndpointClear?: () => void;
}

const SUPERADMIN_RULES_ENDPOINT_IDS = new Set([
  'tenant-crear-global-reglas',
  'tenant-listar-reglas',
  'tenant-crear-dios-reglas',
  'tenant-actualizar-dios-reglas',
]);

const RULES_ENDPOINT_IDS = new Set([
  'tenant-crear-global-reglas',
  'tenant-listar-reglas',
  'tenant-actualizar-global-reglas',
  'tenant-desactivar-global-reglas',
  'tenant-eliminar-global-reglas',
  'tenant-crear-dios-reglas',
  'tenant-actualizar-dios-reglas',
]);

/** Crear / actualizar regla DIOS: exige JWT solo tenantSuperAdmin (sin tenantGlobal ni tenantCorporativo en el token). */
const DIOS_REGLAS_ENDPOINT_IDS = new Set(['tenant-crear-dios-reglas', 'tenant-actualizar-dios-reglas']);

/**
 * Select de alcance (tenant global / opción DIOS): filtro por tenantJerarquiaCounter solo si el JWT trae tenantSuperAdmin.
 * No aplica a sesiones puramente tenantGlobal / tenantCorporativo.
 *
 * PUT actualizar herencia admin/global: misma ruta API; tarjetas separadas SA (DIOS) vs TG (ADMIN).
 */
const PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS = new Set([
  'perm-admin-tenant-global-actualizar-sa',
  'perm-admin-tenant-global-actualizar-tg',
]);

const ENDPOINT_IDS_OPCIONES_TG_JERARQUIA_SUPERADMIN = new Set([
  'perm-usuario-tenant-global',
  'perm-admin-tenant-global',
  'perm-admin-tenant-global-actualizar-sa',
  'perm-admin-tenant-global-actualizar-tg',
  'perm-admin-tenant-global-desactivar',
  'perm-admin-tenant-global-eliminar',
  'perm-listar-herencias',
]);

/** Un `__tsa_scope__` por cada SA del GET selects (alinear con listado de herencias por tenantSuperTenant). */
const ENDPOINT_IDS_SELECT_MULTI_SA_JERARQUIA = new Set([
  'perm-admin-tenant-global',
  'perm-admin-tenant-global-actualizar-sa',
  'perm-admin-tenant-global-desactivar',
  'perm-admin-tenant-global-eliminar',
]);

/** Regla de plataforma por tenantSuperAdmin en GET listar reglas: prioriza securityPlatform true (histórico), luego false. */
function findReglaPlataformaPorSuperAdmin(
  ruleCatalog: Record<string, any>,
  tenantSuperAdminId: string
): any | undefined {
  if (!tenantSuperAdminId) return undefined;
  const rows = Object.values(ruleCatalog || {});
  const matchSa = (r: any) => {
    const gens = Array.isArray(r?.generacionTenatGlobales) ? r.generacionTenatGlobales : [];
    return gens.some((g: any) => String(g?._id || g || '').trim() === tenantSuperAdminId);
  };
  return (
    rows.find((r: any) => r?.securityPlatform === true && matchSa(r)) ||
    rows.find((r: any) => r?.securityPlatform === false && matchSa(r))
  );
}

/** Reglas cuyo arreglo `generacionTenatGlobales` referencia el tenantSuperAdmin (listar en herencia asociada como respaldo). */
function findReglasPorTenantSuperAdmin(
  ruleCatalog: Record<string, any>,
  tenantSuperAdminId: string
): any[] {
  if (!tenantSuperAdminId) return [];
  const sa = String(tenantSuperAdminId).trim();
  return Object.values(ruleCatalog || {}).filter((r: any) => {
    const gens = Array.isArray(r?.generacionTenatGlobales) ? r.generacionTenatGlobales : [];
    return gens.some((g: any) => String(g?._id || g || '').trim() === sa);
  });
}

/** Opción de herencia sintética desde regla (no es documento Mongo de herencia; solo catálogo / vista previa). */
const REGLA_SA_SYNTH_PREFIX = '__regla_sa__:';

// IDs que pertenecen exclusivamente a componentes con allowedEndpointIds.
// Se mantienen en RULES_ENDPOINT_IDS para excluirlos del modo "full" sin allowedSet.

type Vista = { id: string; label: string; path: string };
type Accion = { id: string; label: string; method: string };
type TenantGlobal = {
  id: string;
  label: string;
  corporativo: string;
  correo?: string;
  tenantSuperAdmin?: string;
  tenantGlobalAdmin?: string;
};
type PermisoItem = { vistaId: string; accionId: string[] };
type ReglaOption = { id: string; label: string };
/** tipoContexto: `view` = interfaz tenant global; `api` = contexto API (excluido en reglas globales). */
type ContextOption = { id: string; label: string; tipoContexto?: string };
type HeredaGlobalOption = { id: string; label: string };
type CatalogSelection = { vistas: string[]; acciones: string[] };
type NodoRuta = { _id: string; name: string; path: string; tipoNodo?: string; tipoNodoId?: { codigo: string; nombre: string; order: number }; acciones?: Accion[]; children?: NodoRuta[] };
type TenantCorporativoOption = { id: string; label: string; tenantGlobalId: string };
type GenericSelectOption = { id: string; label: string; rol?: string; meta?: Record<string, string | number | undefined> };
type HeredaScope = 'tenantSuperAdmin' | 'tenantGlobal' | 'unknown';
const TENANT_SUPERADMIN_SCOPE_PREFIX = '__tsa_scope__:';
type VistaLoc = { suiteId: string; suiteName: string; moduloId: string; moduloName: string };
type VistaItem = { id: string; label: string; path: string };

const getTipoNodoLabel = (node: any): string =>
  String(node?.tipoNodoId?.codigo || node?.tipoNodo || '').trim().toUpperCase();

const esNodoFormularioLike = (node: any): boolean => {
  const tipo = getTipoNodoLabel(node);
  return tipo === 'FORMULARIO' || tipo === 'SUBFORMULARIO';
};

const hasChildNodes = (node: any): boolean =>
  Array.isArray(node?.children) && node.children.length > 0;

const collectFormularioLikeNodes = (nodes: any[] = []): any[] => {
  const collected: any[] = [];
  const walk = (items: any[] = []) => {
    items.forEach((item) => {
      if (!item) return;
      if (esNodoFormularioLike(item)) {
        collected.push(item);
      }
      if (Array.isArray(item.children) && item.children.length > 0) {
        walk(item.children);
      }
    });
  };
  walk(nodes);
  return collected;
};

const getModuloNodes = (suite: any): any[] =>
  (suite?.children || []).filter((n: any) => !esNodoFormularioLike(n) || hasChildNodes(n));

// Recorre TODOS los descendientes del nodo (sin filtrar por tipoNodo)
const collectAllNodes = (nodes: any[] = []): any[] => {
  const collected: any[] = [];
  const walk = (items: any[] = []) => {
    items.forEach((item) => {
      if (!item) return;
      collected.push(item);
      if (Array.isArray(item.children) && item.children.length > 0) {
        walk(item.children);
      }
    });
  };
  walk(nodes);
  return collected;
};

const getEntityId = (value: any): string =>
  String(value?._id || value?.iud || value?.id || value || '').trim();

const getEntityLabel = (value: any): string =>
  String(
    value?.label ||
    value?.nombre ||
    value?.name ||
    value?.razon_social ||
    value?.titulo ||
    value?.correo ||
    ''
  ).trim();

const buildVistaLocationMap = (
  rutasJerarquia: NodoRuta[] = []
): { byId: Map<string, VistaLoc>; byPath: Map<string, VistaLoc> } => {
  const byId = new Map<string, VistaLoc>();
  const byPath = new Map<string, VistaLoc>();

  const reg = (id: string, path: string, loc: VistaLoc) => {
    if (id) byId.set(id, loc);
    if (path) byPath.set(path, loc);
  };

  rutasJerarquia.forEach((suite) => {
    const suiteId = getEntityId(suite);
    const suiteName = String(suite?.name || '').trim();
    const suitePath = String((suite as any)?.path || '').trim();

    // La suite misma puede ser una vista heredada (p. ej. "Inicio" en raÃ­z)
    reg(suiteId, suitePath, { suiteId, suiteName, moduloId: '', moduloName: '' });

    (suite.children || []).forEach((child: any) => {
      const childId = getEntityId(child);
      const childName = String(child?.name || '').trim();
      const childPath = String(child?.path || '').trim();

      if (!hasChildNodes(child)) {
        reg(childId, childPath, { suiteId, suiteName, moduloId: '', moduloName: '' });
        return;
      }

      // MÃ³dulo con hijos â†’ mapear cada descendiente y el mÃ³dulo mismo
      collectAllNodes(child.children || []).forEach((node: any) => {
        const nodeId = getEntityId(node);
        const nodePath = String(node?.path || '').trim();
        reg(nodeId, nodePath, { suiteId, suiteName, moduloId: childId, moduloName: childName });
      });
      reg(childId, childPath, { suiteId, suiteName, moduloId: childId, moduloName: childName });
    });
  });

  return { byId, byPath };
};

const buildGroupedVistas = (
  vistasDetalle: VistaItem[],
  byId: Map<string, VistaLoc>,
  byPath?: Map<string, VistaLoc>
) => {
  type ModuloGroup = { moduloName: string; vistas: VistaItem[] };
  type SuiteGroup = { suiteName: string; modulos: Map<string, ModuloGroup> };
  const suiteGroups = new Map<string, SuiteGroup>();
  const sinSuite: VistaItem[] = [];

  vistasDetalle.forEach((vista) => {
    const loc =
      byId.get(vista.id) ||
      (byPath && vista.path ? byPath.get(vista.path) : undefined);
    if (!loc) {
      sinSuite.push(vista);
      return;
    }
    if (!suiteGroups.has(loc.suiteId)) {
      suiteGroups.set(loc.suiteId, { suiteName: loc.suiteName, modulos: new Map() });
    }
    const sg = suiteGroups.get(loc.suiteId)!;
    const mKey = loc.moduloId || '__direct__';
    if (!sg.modulos.has(mKey)) {
      sg.modulos.set(mKey, { moduloName: loc.moduloName || 'Directo', vistas: [] });
    }
    sg.modulos.get(mKey)!.vistas.push(vista);
  });

  return { suiteGroups, sinSuite };
};

const buildSuiteSummaryLabel = (suiteGroups: Map<string, { suiteName: string }>, sinSuiteCount = 0): string => {
  const suiteNames = Array.from(suiteGroups.values())
    .map((suite) => String(suite.suiteName || '').trim())
    .filter(Boolean);
  if (!suiteNames.length) {
    return sinSuiteCount > 0 ? `Sin suite (${sinSuiteCount})` : 'Sin suites';
  }
  const top = suiteNames.slice(0, 2).join(', ');
  const restantes = suiteNames.length - 2;
  const suiteText = restantes > 0 ? `${top} (+${restantes})` : top;
  return sinSuiteCount > 0 ? `${suiteText} | Sin suite:${sinSuiteCount}` : suiteText;
};

const METHOD_STYLE: Record<HttpMethod, string> = {
  GET: 'bg-blue-100 text-blue-700 border-blue-200',
  POST: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  PUT: 'bg-amber-100 text-amber-700 border-amber-200',
  DELETE: 'bg-red-100 text-red-700 border-red-200',
};

const SECTION_META: Record<
  EndpointSection,
  { label: string; description: string; icon: React.ElementType }
> = {
  tenant: {
    label: 'Gobernanza Tenant',
    description: 'Tenants, reglas y jerarquia visible.',
    icon: ShieldCheck,
  },
  permisos: {
    label: 'Gobernanza Permisos',
    description: 'Herencias, vistas y acciones por alcance.',
    icon: KeyRound,
  },
  corporativo: {
    label: 'Gobernanza Corporativo',
    description: 'Catalogos, roles y niveles corporativos.',
    icon: Building2,
  },
};

const HIDDEN_ENDPOINT_IDS = new Set([
  'tenant-crear-global-usuario',
  'tenant-crear-global-admin',
  'tenant-listar-libres',
  // Trasladados a PermisosTenant (flujo acotado tenant global)
  'perm-usuario-tenant-global',
  'perm-admin-tenant-global-listar',
  // PUT tenant global (ADMIN) solo en `PermisosTenant` vía allowedEndpointIds
  'perm-admin-tenant-global-actualizar-tg',
  'perm-admin-tenant-global-desactivar',
  // `perm-admin-tenant-global-actualizar-sa` no se oculta: debe verse junto a POST/DELETE en panel permisos (DIOS).
]);

const ENDPOINTS: EndpointSpec[] = [
  { id: 'tenant-listar-libres', section: 'tenant', actor: 'ambos', method: 'GET', path: '/api/config/global/creacion/usu/tenant/libres', title: 'Listar tenantSuperAdmin visibles', description: 'Solo registros tenantSuperAdmin (sin tenantGlobal). Alcance según JWT.', fields: [] },
  {
    id: 'tenant-listar-libres-superadmin',
    section: 'tenant',
    actor: 'tenantSuperAdmin',
    method: 'GET',
    path: '/api/config/global/creacion/usu/tenant/libres',
    title: 'Listar tenantSuperAdmin (rama JWT)',
    description: 'tenantSuperAdmin visibles para tu sesión (jerarquía DIOS / SA). No incluye tenantGlobal.',
    fields: [],
  },
  {
    id: 'tenant-listar-libres-tenantglobal',
    section: 'tenant',
    actor: 'tenantGlobal',
    method: 'GET',
    path: '/api/config/global/creacion/usu/tenant/libres',
    title: 'Listar tenantGlobal',
    description: 'Misma API: lista tenantSuperAdmin alcanzables desde el tenantGlobal del JWT.',
    fields: [],
  },
  {
    id: 'tenant-crear-global-usuario',
    section: 'tenant',
    actor: 'tenantGlobal',
    method: 'POST',
    path: '/api/config/global/creacion/usu/tenant/global',
    title: 'Crear tenant global desde tenantGlobal',
    description:
      'Flujo puro tenantGlobal sobre su propia rama descendente. NVL de generación se resuelve en servidor desde tu tenant (generacionGlobalNvlRolesConfig).',
    fields: [
      { name: 'coporativo', label: 'Corporativo (empresa)', type: 'id' },
      { name: 'tenantGlobalRef', label: 'Tenant global ref', type: 'id' },
      { name: 'apisDominios', label: 'Apis dominios', type: 'id', required: true },
      { name: 'accionesUsu', label: 'Accion usuario', type: 'id', required: true },
      { name: 'rolesMabs', label: 'Rol mabs', type: 'id', required: true },
    ],
  },
  {
    id: 'tenant-crear-global-admin',
    section: 'tenant',
    actor: 'tenantSuperAdmin',
    method: 'POST',
    path: '/api/config/global/creacion/superAdmin/tenant/global',
    title: 'Crear tenant Administrador del sistema',
    description:
      'Contrato exclusivo con tenantSuperAdmin (JWT): sin rol tenantGlobal en este flujo. El servidor valida alcance de tu rama SA y corporativo frente a tenantjerarquiacounters cuando aplica.',
    fields: [
      { name: 'nvlGeneracionTenant', label: 'Nivel generacion tenant', type: 'id', required: true },
      { name: 'tipo_tenant', label: 'Tipo tenant', type: 'id', required: true },
      { name: 'coporativo', label: 'Corporativo (empresa)', type: 'id' },
      { name: 'tenantGlobalRef', label: 'Tenant global ref', type: 'id' },
      { name: 'apisDominios', label: 'Apis dominios', type: 'id', required: true },
      { name: 'accionesUsu', label: 'Accion usuario', type: 'id', required: true },
      { name: 'rolesMabs', label: 'Rol mabs', type: 'id', required: true },
    ],
  },
  {
    id: 'tenant-actualizar-global',
    section: 'tenant',
    actor: 'tenantSuperAdmin',
    method: 'PUT',
    path: '/api/config/global/actualizar/tenant/global/:id',
    title: 'Actualizar tenant global',
    description: 'Actualiza tenant global por id.',
    fields: [
      { name: 'id', label: 'ID tenant global', type: 'id', required: true, pathParam: true },
      { name: 'tipo_tenant', label: 'Tipo tenant', type: 'id' },
      { name: 'ownerType', label: 'Owner type', type: 'id' },
      { name: 'apisDominios', label: 'Apis dominios', type: 'id' },
      { name: 'accionesUsu', label: 'Accion usuario', type: 'id' },
      { name: 'rolesMabs', label: 'Rol mabs', type: 'id' },
    ],
  },
  {
    id: 'tenant-desactivar-global',
    section: 'tenant',
    actor: 'tenantSuperAdmin',
    method: 'DELETE',
    path: '/api/config/global/desactivar/tenant/global/:id',
    title: 'Desactivar tenant global',
    description: 'Desactiva tenant global sin eliminar.',
    fields: [{ name: 'id', label: 'ID tenant global', type: 'id', required: true, pathParam: true }],
  },
  {
    id: 'tenant-eliminar-global',
    section: 'tenant',
    actor: 'tenantSuperAdmin',
    method: 'DELETE',
    path: '/api/config/global/eliminar/tenant/global/:id',
    title: 'Eliminar tenant global',
    description: 'Elimina tenant global de forma definitiva.',
    fields: [{ name: 'id', label: 'ID tenant global', type: 'id', required: true, pathParam: true }],
  },
  {
    id: 'tenant-crear-global-reglas',
    section: 'tenant',
    actor: 'ambos',
    method: 'POST',
    path: '/api/config/tenant/tipo/crear/globales/reglas/jerarquia/roles',
    title: 'Crear reglas globales',
    description: 'Formulario principal para crear reglas de jerarquia.',
    primary: true,
    fields: [
      { name: 'tenantGlobal', label: 'Tenant global', type: 'id', required: true },
      { name: 'contextoDefi', label: 'Contexto', type: 'context', required: true },
      { name: 'permisos', label: 'Permisos por vista/accion', type: 'permisos', required: true },
    ],
  },
  { id: 'tenant-listar-reglas', section: 'tenant', actor: 'ambos', method: 'GET', path: '/api/config/tenant/listar/reglas', title: 'Listar reglas tenant', description: 'Consulta de reglas creadas.', fields: [] },
  {
    id: 'tenant-actualizar-global-reglas',
    section: 'tenant',
    actor: 'ambos',
    method: 'PUT',
    path: '/api/config/tenant/tipo/actualizar/globales/reglas/jerarquia',
    title: 'Actualizar reglas globales',
    description: 'Actualiza regla global usando header x-regla-id.',
    fields: [
      { name: 'x-regla-id', label: 'x-regla-id', type: 'id', required: true, header: true },
      { name: 'contextoDefi', label: 'Contexto', type: 'context', required: true },
      { name: 'permisos', label: 'Permisos por vista/accion', type: 'permisos', required: true },
    ],
  },
  {
    id: 'tenant-desactivar-global-reglas',
    section: 'tenant',
    actor: 'ambos',
    method: 'DELETE',
    path: '/api/config/tenant/tipo/desactivar/globales/reglas/jerarquia',
    title: 'Desactivar regla global',
    description: 'Desactiva una regla global usando header x-regla-id.',
    fields: [
      { name: 'x-regla-id', label: 'x-regla-id', type: 'id', required: true, header: true },
    ],
  },
  {
    id: 'tenant-eliminar-global-reglas',
    section: 'tenant',
    actor: 'ambos',
    method: 'DELETE',
    path: '/api/config/tenant/tipo/eliminar/globales/reglas/jerarquia',
    title: 'Eliminar regla global',
    description: 'Elimina una regla global usando header x-regla-id.',
    fields: [
      { name: 'x-regla-id', label: 'x-regla-id', type: 'id', required: true, header: true },
    ],
  },
  {
    id: 'tenant-crear-dios-reglas',
    section: 'tenant',
    actor: 'tenantSuperAdmin',
    method: 'POST',
    path: '/api/config/tenant/tipo/crear/dios/reglas/jerarquia/roles',
    title: 'Crear regla DIOS',
    description:
      'Crea la regla de plataforma para el rol DIOS. Elige recursos (vistas/rutas) y acciones en los catálogos (selección múltiple; por defecto todos). tenantSuperAdmin y securityPlatform los fija el servidor desde JWT/body (securityPlatform por defecto false). Contexto opcional.',
    fields: [
      { name: 'tenantSuperAdmin', label: 'Tenant SuperAdmin', type: 'id', required: true },
      { name: 'contexto', label: 'Contexto', type: 'text', required: false },
    ],
  },
  {
    id: 'tenant-actualizar-dios-reglas',
    section: 'tenant',
    actor: 'tenantSuperAdmin',
    method: 'PUT',
    path: '/api/config/tenant/tipo/actualizar/dios/reglas/jerarquia/roles',
    title: 'Actualizar regla DIOS',
    description:
      'Sincroniza la regla plataforma (colección reglas) del Tenant SuperAdmin elegido con todas las vistas y acciones activas. El body envía tenantSuperAdmin; sin combo, el servidor usa el del rol DIOS.',
    fields: [
      { name: 'tenantSuperAdmin', label: 'Tenant SuperAdmin', type: 'id', required: false },
      { name: 'contexto', label: 'Contexto', type: 'text', required: false },
    ],
  },
  { id: 'perm-listar-herencias', section: 'permisos', actor: 'ambos', method: 'GET', path: '/api/config/permisos/listar/usu/tenant/libres', title: 'Listar herencias', description: 'Lista permisos heredados del usuario autenticado.', fields: [] },
  {
    id: 'perm-usuario-tenant-global',
    section: 'permisos',
    actor: 'ambos',
    method: 'POST',
    path: '/api/config/permisos/usu/tenant/global',
    title: 'Asignar parametrizacion global',
    description: 'Asigna parametrizacion al usuario autenticado con seleccion de vistas y acciones.',
    fields: [],
  },
  {
    id: 'perm-admin-tenant-global',
    section: 'permisos',
    actor: 'tenantSuperAdmin',
    method: 'POST',
    path: '/api/config/permisos/creacion/admin/superadmin/global',
    title: 'Permisos heredados (solo tenantSuperAdmin)',
    description:
      'Solo sesión SuperAdmin (DIOS). El desplegable de alcance respeta tenantJerarquiaCounter: sin corporativo ves todos los TG; con corporativo asociado, solo la rama de tu SA.',
    fields: [
      { name: 'tenantGlobal', label: 'tenantSuperAdmin', type: 'id', required: true },
      { name: 'tenantCorporativo', label: 'Tenant corporativo', type: 'id' },
      { name: 'permisos', label: 'Permisos por vista/accion', type: 'permisos', required: true },
    ],
  },
  {
    id: 'perm-admin-tenant-global-listar',
    section: 'permisos',
    actor: 'tenantSuperAdmin',
    method: 'GET',
    path: '/api/config/permisos/creacion/admin/tenant/global?incluirSuperAdmin=false',
    title: 'Listar herencias admin/global',
    description: 'Lista registros creados en flujo admin/tenant/global.',
    fields: [],
  },
  {
    id: 'perm-admin-tenant-global-actualizar-sa',
    section: 'permisos',
    actor: 'tenantSuperAdmin',
    method: 'PUT',
    path: '/api/config/permisos/creacion/admin/tenant/global/:id',
    title: 'Actualizar herencia admin/global (SuperAdmin)',
    description:
      'Actualiza una herencia por id. Sesión tenantSuperAdmin (DIOS): alcance y selects alineados con «Permisos heredados» (POST).',
    fields: [
      { name: 'tenantGlobal', label: 'Tenant global', type: 'id' },
      { name: 'herenciaAsociada', label: 'Herencia asociada', type: 'id', required: true, pathParam: true },
      { name: 'permisos', label: 'Permisos por vista/accion', type: 'permisos' },
    ],
  },
  {
    id: 'perm-admin-tenant-global-actualizar-tg',
    section: 'permisos',
    actor: 'tenantGlobal',
    method: 'PUT',
    path: '/api/config/permisos/creacion/admin/tenant/global/:id',
    title: 'Actualizar herencia admin/global (Tenant global)',
    description:
      'Actualiza una herencia por id. Sesión tenantGlobal (ADMIN): solo herencias de tu TG.',
    fields: [
      { name: 'tenantGlobal', label: 'Tenant global', type: 'id' },
      { name: 'herenciaAsociada', label: 'Herencia asociada', type: 'id', required: true, pathParam: true },
      { name: 'permisos', label: 'Permisos por vista/accion', type: 'permisos' },
    ],
  },
  {
    id: 'perm-admin-tenant-global-desactivar',
    section: 'permisos',
    actor: 'tenantSuperAdmin',
    method: 'DELETE',
    path: '/api/config/permisos/creacion/admin/tenant/global/:id',
    title: 'Desactivar herencia admin/global',
    description: 'Desactiva registro sin eliminar fÃ­sicamente.',
    fields: [
      { name: 'tenantGlobal', label: 'Tenant global', type: 'id' },
      { name: 'herenciaAsociada', label: 'Herencia asociada', type: 'id', required: true, pathParam: true },
      { name: 'id', label: 'ID herencia', type: 'id', required: true, pathParam: true },
    ],
  },
  {
    id: 'perm-admin-tenant-global-eliminar',
    section: 'permisos',
    actor: 'tenantSuperAdmin',
    method: 'DELETE',
    path: '/api/config/permisos/creacion/admin/tenant/global/:id/force',
    title: 'Eliminar herencia admin/global',
    description: 'EliminaciÃ³n definitiva (requiere estar desactivada).',
    fields: [
      { name: 'tenantGlobal', label: 'Tenant global', type: 'id' },
      { name: 'herenciaAsociada', label: 'Herencia asociada', type: 'id', required: true, pathParam: true },
      { name: 'id', label: 'ID herencia', type: 'id', required: true, pathParam: true },
    ],
  },
  // â”€â”€ CORPORATIVO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: 'corp-listar-tenant', section: 'corporativo', actor: 'ambos', method: 'GET', path: '/api/config/permisos/corporativo/listar/tenant', title: 'Listar tenant corporativos', description: 'Lista los tenantCorporativos visibles para el usuario autenticado.', fields: [] },
  {
    id: 'corp-crear-tenant',
    section: 'corporativo',
    actor: 'ambos',
    method: 'POST',
    path: '/api/config/permisos/corporativo/crear/tenant',
    title: 'Crear tenant corporativo',
    description: 'Crea un nuevo tenantCorporativo asociado al tenantGlobal del JWT.',
    fields: [
      { name: 'nvlGeneracionCoporativoTenant', label: 'Nivel corporativo (nvlGeneracionCoporativoTenant)', type: 'id', required: true },
    ],
  },
  {
    id: 'corp-actualizar-tenant',
    section: 'corporativo',
    actor: 'ambos',
    method: 'PUT',
    path: '/api/config/permisos/corporativo/actualizar/tenant/:id',
    title: 'Actualizar tenant corporativo',
    description: 'Actualiza coporativo y/o nvlGeneracionCoporativoTenant de un tenantCorporativo.',
    fields: [
      { name: 'id', label: 'ID tenant corporativo', type: 'id', required: true, pathParam: true },
      { name: 'coporativo', label: 'Corporativo (id perfilCorporativo)', type: 'id' },
      { name: 'nvlGeneracionCoporativoTenant', label: 'Nivel corporativo', type: 'id' },
    ],
  },
  {
    id: 'corp-desactivar-tenant',
    section: 'corporativo',
    actor: 'ambos',
    method: 'DELETE',
    path: '/api/config/permisos/corporativo/desactivar/tenant/:id',
    title: 'Desactivar tenant corporativo',
    description: 'Soft-delete: marca el tenantCorporativo como inactivo.',
    fields: [{ name: 'id', label: 'ID tenant corporativo', type: 'id', required: true, pathParam: true }],
  },
  {
    id: 'corp-eliminar-tenant',
    section: 'corporativo',
    actor: 'tenantSuperAdmin',
    method: 'DELETE',
    path: '/api/config/permisos/corporativo/eliminar/tenant/:id',
    title: 'Eliminar tenant corporativo',
    description: 'EliminaciÃ³n fÃ­sica definitiva de un tenantCorporativo.',
    fields: [{ name: 'id', label: 'ID tenant corporativo', type: 'id', required: true, pathParam: true }],
  },
  // CatÃ¡logo (tipo comprador)
  { id: 'corp-listar-catalogo', section: 'corporativo', actor: 'ambos', method: 'GET', path: '/api/config/permisos/corporativo/listar/catalogo', title: 'Listar catÃ¡logo tipos comprador', description: 'Lista los tipos de comprador corporativo activos.', fields: [] },
  {
    id: 'corp-crear-catalogo',
    section: 'corporativo',
    actor: 'ambos',
    method: 'POST',
    path: '/api/config/permisos/corporativo/guardar/catologo/tenant/corporativo',
    title: 'Crear tipo comprador corporativo',
    description: 'Crea un nuevo tipo de comprador (categoria de rol) corporativo.',
    fields: [
      { name: 'tipo_comprador', label: 'Tipo comprador', type: 'text', required: true },
      { name: 'sigla', label: 'Sigla', type: 'text', required: true },
    ],
  },
  {
    id: 'corp-modificar-catalogo',
    section: 'corporativo',
    actor: 'ambos',
    method: 'PUT',
    path: '/api/config/permisos/corporativo/modificar/catalogo/:id',
    title: 'Modificar tipo comprador',
    description: 'Actualiza tipo_comprador y/o sigla de una categorÃ­a de comprador.',
    fields: [
      { name: 'id', label: 'ID tipo comprador', type: 'id', required: true, pathParam: true },
      { name: 'tipo_comprador', label: 'Tipo comprador', type: 'text' },
      { name: 'sigla', label: 'Sigla', type: 'text' },
    ],
  },
  {
    id: 'corp-desactivar-catalogo',
    section: 'corporativo',
    actor: 'ambos',
    method: 'DELETE',
    path: '/api/config/permisos/corporativo/desactivar/catalogo/:id',
    title: 'Desactivar tipo comprador',
    description: 'Soft-delete del tipo de comprador corporativo.',
    fields: [{ name: 'id', label: 'ID tipo comprador', type: 'id', required: true, pathParam: true }],
  },
  // Roles corporativos
  {
    id: 'corp-crear-rol',
    section: 'corporativo',
    actor: 'ambos',
    method: 'POST',
    path: '/api/config/permisos/corporativo/guardar/roles/tenant/corporativo',
    title: 'Crear rol base corporativo',
    description: 'Crea un rol base para el contexto corporativo.',
    fields: [
      { name: 'rol', label: 'Nombre del rol', type: 'text', required: true },
    ],
  },
  // Niveles globales
  { id: 'corp-listar-nvl-global', section: 'corporativo', actor: 'ambos', method: 'GET', path: '/api/config/permisos/corporativo/listar/nvl/global', title: 'Listar niveles scope global', description: 'Lista los nvlPermisosCor de scope global (sin tenantCorporativo asignado).', fields: [] },
  {
    id: 'corp-crear-nvl-global',
    section: 'corporativo',
    actor: 'ambos',
    method: 'POST',
    path: '/api/config/permisos/corporativo/crear/tenant/nvl/corporativo',
    title: 'Crear nivel scope global',
    description: 'Crea un nivel jerÃ¡rquico corporativo de scope global.',
    fields: [
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'accionesPermitidas', label: 'Acciones permitidas (IDs, JSON array)', type: 'json', required: true },
      { name: 'heredarPermisos', label: 'Heredar permisos (true/false)', type: 'text' },
    ],
  },
  {
    id: 'corp-modificar-nvl-global',
    section: 'corporativo',
    actor: 'ambos',
    method: 'PUT',
    path: '/api/config/permisos/corporativo/modificar/nvl/global/:id',
    title: 'Modificar nivel scope global',
    description: 'Actualiza nombre, heredarPermisos, accionesPermitidas de un nivel global.',
    fields: [
      { name: 'id', label: 'ID nivel', type: 'id', required: true, pathParam: true },
      { name: 'nombre', label: 'Nombre', type: 'text' },
      { name: 'heredarPermisos', label: 'Heredar permisos (true/false)', type: 'text' },
      { name: 'accionesPermitidas', label: 'Acciones permitidas (IDs, JSON array)', type: 'json' },
    ],
  },
  {
    id: 'corp-desactivar-nvl-global',
    section: 'corporativo',
    actor: 'ambos',
    method: 'DELETE',
    path: '/api/config/permisos/corporativo/desactivar/nvl/global/:id',
    title: 'Desactivar nivel scope global',
    description: 'Soft-delete del nivel corporativo global.',
    fields: [{ name: 'id', label: 'ID nivel', type: 'id', required: true, pathParam: true }],
  },
  // Niveles scope corporativo
  { id: 'corp-listar-nvl-corp', section: 'corporativo', actor: 'ambos', method: 'GET', path: '/api/config/permisos/corporativo/listar/nvl/corporativo', title: 'Listar niveles scope corporativo', description: 'Lista los nvlPermisosCor con tenantCorporativo asignado.', fields: [] },
  {
    id: 'corp-crear-nvl-corp',
    section: 'corporativo',
    actor: 'ambos',
    method: 'POST',
    path: '/api/config/permisos/corporativo/guardar/nvl/corporativo',
    title: 'Crear nivel scope corporativo',
    description: 'Crea un nivel jerÃ¡rquico vinculado a un tenantCorporativo especÃ­fico.',
    fields: [
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'tenantGlobalId', label: 'Tenant global (si ejecutor es DIOS)', type: 'id' },
    ],
  },
  {
    id: 'corp-modificar-nvl-corp',
    section: 'corporativo',
    actor: 'ambos',
    method: 'PUT',
    path: '/api/config/permisos/corporativo/modificar/nvl/corp/:id',
    title: 'Modificar nivel scope corporativo',
    description: 'Actualiza campos de un nvlPermisosCor de scope corporativo.',
    fields: [
      { name: 'id', label: 'ID nivel', type: 'id', required: true, pathParam: true },
      { name: 'nombre', label: 'Nombre', type: 'text' },
      { name: 'heredarPermisos', label: 'Heredar permisos (true/false)', type: 'text' },
    ],
  },
  {
    id: 'corp-desactivar-nvl-corp',
    section: 'corporativo',
    actor: 'ambos',
    method: 'DELETE',
    path: '/api/config/permisos/corporativo/desactivar/nvl/corp/:id',
    title: 'Desactivar nivel scope corporativo',
    description: 'Soft-delete del nivel corporativo especÃ­fico.',
    fields: [{ name: 'id', label: 'ID nivel', type: 'id', required: true, pathParam: true }],
  },
  // Parametrizacion SA â†’ TG
  { id: 'corp-listar-parametrizacion', section: 'corporativo', actor: 'ambos', method: 'GET', path: '/api/config/permisos/corporativo/listar/parametrizacion', title: 'Listar parametrizacion SAâ†’TG', description: 'Lista las parametrizaciones que controlan cuÃ¡ntos corporativos puede crear cada tenantGlobal.', fields: [] },
  {
    id: 'corp-guardar-parametrizacion',
    section: 'corporativo',
    actor: 'tenantSuperAdmin',
    method: 'POST',
    path: '/api/config/permisos/corporativo/guardar/parametrizacion',
    title: 'Crear parametrizacion SAâ†’TG',
    description: 'Solo SUPER_ADMIN. Define si el tenantGlobal puede crear corporativos y cuÃ¡ntos.',
    fields: [
      { name: 'tenantGlobalId', label: 'Tenant global ID', type: 'id', required: true },
      { name: 'canCreateCorporativos', label: 'Puede crear corporativos (true/false)', type: 'text', required: true },
      { name: 'maxCorporativos', label: 'Max corporativos (nÃºmero, opcional)', type: 'text' },
    ],
  },
  {
    id: 'corp-modificar-parametrizacion',
    section: 'corporativo',
    actor: 'tenantSuperAdmin',
    method: 'PUT',
    path: '/api/config/permisos/corporativo/modificar/parametrizacion/:id',
    title: 'Modificar parametrizacion SAâ†’TG',
    description: 'Actualiza canCreateCorporativos y/o maxCorporativos de una parametrizaciÃ³n.',
    fields: [
      { name: 'id', label: 'ID parametrizacion', type: 'id', required: true, pathParam: true },
      { name: 'canCreateCorporativos', label: 'Puede crear corporativos (true/false)', type: 'text' },
      { name: 'maxCorporativos', label: 'Max corporativos', type: 'text' },
    ],
  },
  {
    id: 'corp-desactivar-parametrizacion',
    section: 'corporativo',
    actor: 'tenantSuperAdmin',
    method: 'DELETE',
    path: '/api/config/permisos/corporativo/desactivar/parametrizacion/:id',
    title: 'Desactivar parametrizacion SAâ†’TG',
    description: 'Marca la parametrizaciÃ³n como inactiva (el TG pierde permiso de crear corporativos).',
    fields: [{ name: 'id', label: 'ID parametrizacion', type: 'id', required: true, pathParam: true }],
  },
  // Herencia de permisos corporativos
  {
    id: 'corp-crear-herencia',
    section: 'corporativo',
    actor: 'ambos',
    method: 'POST',
    path: '/api/config/permisos/corporativo/crear/herencia/permisos/tenant',
    title: 'Crear herencia permisos corporativo',
    description: 'Asigna acciones y vistas a un usuario dentro de un tenantCorporativo.',
    fields: [
      { name: 'usuarioId', label: 'Usuario ID', type: 'id', required: true },
      { name: 'rolId', label: 'Rol corporativo ID', type: 'id', required: true },
      { name: 'tenantCorporativoId', label: 'Tenant corporativo ID', type: 'id', required: true },
      { name: 'acciones', label: 'Acciones (IDs, JSON array)', type: 'json', required: true },
      { name: 'vistas', label: 'Vistas (IDs, JSON array)', type: 'json' },
      { name: 'tenantGlobal', label: 'Tenant global (si ejecutor es DIOS)', type: 'id' },
    ],
  },
];

const parseMaybeJson = (value: string): unknown => {
  const raw = value.trim();
  if (!raw) return '';
  if (raw.startsWith('[') || raw.startsWith('{')) return JSON.parse(raw);
  return raw;
};

const pickArray = (payload: any, keys: string[]): any[] => {
  for (const key of keys) {
    const value = payload?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

const pickTenantCorporate = (row: any): string => {
  return String(
    row?.coporativo?.razon_social ||
    row?.coporativo?.titulo ||
    row?.coporativo?.nombre ||
    row?.coporativo?.label ||
    row?.coporativo?.nit_ruc_rtn ||
    (typeof row?.coporativo === 'string' ? row?.coporativo : '') ||
    row?.razonSocial ||
    row?.label ||
    'Sin corporativo'
  );
};

const buildTenantGlobalContextLabel = (row: any, id: string): string => {
  const usuariosAsociados = Array.isArray(row?.usuariosAsociados) ? row.usuariosAsociados : [];
  const nombres = usuariosAsociados
    .map((usuario: any) => {
      const nombre = String(usuario?.perfil?.nombre_cliente || '').trim();
      const apellido = String(usuario?.perfil?.apellido || '').trim();
      const nombreCompleto = `${nombre} ${apellido}`.trim();
      return nombreCompleto || String(usuario?.correo || '').trim();
    })
    .filter(Boolean);

  if (String(row?.label || '').trim() && nombres.length) {
    return String(row.label).trim();
  }

  if (nombres.length === 1) {
    return `${nombres[0]} | ${id}`;
  }

  if (nombres.length > 1) {
    return `${nombres[0]} +${nombres.length - 1} | ${id}`;
  }

  const rolName = String(row?.rol || row?.rolesMabs?.rol || '').trim();
  return String(
    row?.label ||
    (rolName ? `${rolName} | ${id}` : '') ||
    row?.name ||
    row?.nombre ||
    row?.titulo ||
    id
  );
};

const pickTenantCorreo = (row: any): string => {
  const usuariosAsociados = Array.isArray(row?.usuariosAsociados) ? row.usuariosAsociados : [];
  return String(
    row?.correo ||
    row?.email ||
    row?.usuarioId?.correo ||
    row?.usuarioId?.email ||
    row?.rolesMabs?.usuarioId?.correo ||
    row?.rolesMabs?.usuarioId?.email ||
    usuariosAsociados.find((usuario: any) => usuario?.correo || usuario?.email)?.correo ||
    usuariosAsociados.find((usuario: any) => usuario?.correo || usuario?.email)?.email ||
    ''
  ).trim();
};
const isTenantSuperAdminScopeOption = (value: string): boolean =>
  String(value || '').trim().startsWith(TENANT_SUPERADMIN_SCOPE_PREFIX);

/**
 * SuperAdmin (Mongo) asociado al valor del select "tenant global": opción __tsa_scope__ (SA explícito)
 * o tenant global real vía `tenantGlobales` (y padre tenantGlobalAdmin si hace falta), con respaldo al JWT.
 */
const resolveTenantSuperAdminIdForHerenciaSelect = (
  tenantGlobalFieldValue: string,
  globales: Array<{ id: string; tenantSuperAdmin?: string; tenantGlobalAdmin?: string; label?: string }>,
  jwtTenantSuperAdminId: string
): string => {
  const raw = String(tenantGlobalFieldValue || '').trim();
  if (!raw) return String(jwtTenantSuperAdminId || '').trim();
  if (isTenantSuperAdminScopeOption(raw)) {
    return raw.slice(TENANT_SUPERADMIN_SCOPE_PREFIX.length).trim();
  }
  const tenantSel = globales.find((t) => String(t.id) === raw);
  let sa = String(tenantSel?.tenantSuperAdmin || '').trim();
  if (!sa && tenantSel) {
    const parentId = String(tenantSel?.tenantGlobalAdmin || '').trim();
    if (parentId) {
      const padre = globales.find((t) => t.id === parentId);
      sa = String(padre?.tenantSuperAdmin || '').trim();
    }
  }
  return sa || String(jwtTenantSuperAdminId || '').trim();
};

const ParametrosGobernanza: React.FC<ParametrosGobernanzaProps> = ({
  mode = 'full',
  initialSection = 'tenant',
  lockedSection = null,
  allowedEndpointIds,
  initialEndpointId = null,
  syncRouteWithEndpoint = false,
  onRouteEndpointClear,
}) => {
  const isRulesMode = mode === 'rules' || mode === 'superAdminRules';
  const initialResolvedSection = lockedSection ?? initialSection;
  const [activeSection, setActiveSection] = useState<EndpointSection>(initialResolvedSection);
  const [endpointModal, setEndpointModal] = useState<EndpointSpec | null>(null);
  const [endpointSearch, setEndpointSearch] = useState('');
  const [reglasSearch, setReglasSearch] = useState('');
  const [vistaSearchByEndpoint, setVistaSearchByEndpoint] = useState<Record<string, string>>({});
  const [reglasTenantFilter, setReglasTenantFilter] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<Record<string, string>>({});
  const [resultData, setResultData] = useState<Record<string, any>>({});
  const [formData, setFormData] = useState<Record<string, Record<string, string>>>({});
  const formDataRef = useRef<Record<string, Record<string, string>>>({});
  formDataRef.current = formData;
  const [permisoData, setPermisoData] = useState<Record<string, PermisoItem[]>>({});
  const [tenantGlobales, setTenantGlobales] = useState<TenantGlobal[]>([]);
  /** Desde GET selects: tenantSuperAdmin con filas en tenantjerarquiacounters (+ corporativo) */
  const [tenantSuperAdminsJerarquiaCounters, setTenantSuperAdminsJerarquiaCounters] = useState<
    {
      id: string;
      label: string;
      coporativoNombre?: string | null;
      codigoJerarquia?: string | null;
      usuarioNombre?: string | null;
      usuarioCorreo?: string | null;
    }[]
  >([]);
  const [vistas, setVistas] = useState<Vista[]>([]);
  const [acciones, setAcciones] = useState<Accion[]>([]);
  const [reglas, setReglas] = useState<ReglaOption[]>([]);
  const [contextos, setContextos] = useState<ContextOption[]>([]);
  const [ruleCatalog, setRuleCatalog] = useState<Record<string, any>>({});
  const ruleCatalogPermisosDigest = useMemo(
    () => computeRuleCatalogPermisosDigest(ruleCatalog),
    [ruleCatalog]
  );
  const [heredaGlobalOptions, setHeredaGlobalOptions] = useState<HeredaGlobalOption[]>([]);
  const [heredaGlobalScopeById, setHeredaGlobalScopeById] = useState<Record<string, HeredaScope>>({});
  const [catalogSelection, setCatalogSelection] = useState<Record<string, CatalogSelection>>({});
  /** IDs de acciones elegidas para POST crear regla DIOS (`tenant-crear-dios-reglas`). */
  const [diosReglaAccionesSeleccion, setDiosReglaAccionesSeleccion] = useState<Record<string, string[]>>({});
  /** IDs de recursos (vistas/rutas) elegidos para POST crear regla DIOS. */
  const [diosReglaRecursosSeleccion, setDiosReglaRecursosSeleccion] = useState<Record<string, string[]>>({});
  const [bulkAllMode, setBulkAllMode] = useState<Record<string, boolean>>({});
  const [tenantCorporativos, setTenantCorporativos] = useState<TenantCorporativoOption[]>([]);
  const [tenantGlobalSelects, setTenantGlobalSelects] = useState<Record<string, GenericSelectOption[]>>({});
  const [tenantGlobalActor, setTenantGlobalActor] = useState<{
    rol?: string;
    tenantGlobalId?: string | null;
    tenantSuperAdminId?: string | null;
    tenantCorporativoId?: string | null;
    /** Alineado con listarSelects: counters con corporativo para este SA */
    saJerarquiaTieneCorporativoEnCounters?: boolean;
    /** Un solo corporativo en tenantJerarquiaCounter para el SA → autollenar combo */
    corporativoJerarquiaAutoId?: string | null;
    corporativoIdsJerarquia?: string[];
  }>({});
  const [tenantGlobalSelectsDebug, setTenantGlobalSelectsDebug] = useState<string>('');
  const [tenantCorpLoadingByEndpoint, setTenantCorpLoadingByEndpoint] = useState<Record<string, boolean>>({});
  const [tenantCorpErrorByEndpoint, setTenantCorpErrorByEndpoint] = useState<Record<string, string>>({});
  const [herenciasUsuario, setHerenciasUsuario] = useState<any[]>([]);
  const [herenciasExistentesPorTG, setHerenciasExistentesPorTG] = useState<Record<string, any[]>>({});
  const [herenciasPorUsuario, setHerenciasPorUsuario] = useState<Record<string, any[]>>({});
  const [loadingHerenciasPorUsuario, setLoadingHerenciasPorUsuario] = useState<Record<string, boolean>>({});
  const [herenciaAsociadaOptionsByEndpoint, setHerenciaAsociadaOptionsByEndpoint] = useState<Record<string, GenericSelectOption[]>>({});
  const [herenciaAsociadaDataByEndpoint, setHerenciaAsociadaDataByEndpoint] = useState<Record<string, Record<string, any>>>({});
  /** Vistas a quitar con PATCH (desactivar / eliminar parcial): payload vistaIds en un solo envío. */
  const [vistasDesactivarSeleccion, setVistasDesactivarSeleccion] = useState<Record<string, string[]>>({});
  const [syncInfoByEndpoint, setSyncInfoByEndpoint] = useState<Record<string, any>>({});
  const [syncRunningByEndpoint, setSyncRunningByEndpoint] = useState<Record<string, boolean>>({});
  const [herenciaDetalle, setHerenciaDetalle] = useState<any | null>(null);
  /** Modal resumen tras «Actualizar catálogo de reglas y herencia» en modal admin/global. */
  const [reglasHerenciaSyncReport, setReglasHerenciaSyncReport] = useState<{ lineas: string[] } | null>(null);
  const [reglasHerenciaSyncBusy, setReglasHerenciaSyncBusy] = useState(false);
  const [rutasJerarquia, setRutasJerarquia] = useState<NodoRuta[]>([]);
  const [suiteSelByEndpoint, setSuiteSelByEndpoint] = useState<Record<string, string>>({});
  const [expandedModulos, setExpandedModulos] = useState<Set<string>>(new Set());
  const [usuariosDestinoSel, setUsuariosDestinoSel] = useState<Record<string, string[]>>({});
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<Record<string, { id: string; label: string }[]>>({});
  const [loadingUsuarios, setLoadingUsuarios] = useState<Record<string, boolean>>({});
  /** Misma respuesta que usa hydrateData (Usuarios tenant); evita segundo GET bloqueante al poblar reglas globales. */
  const jerarquiaUsuariosRef = useRef<JerarquiaResponse | null>(null);
  /** Detecta fin de `hydrateData` para volver a cargar herencias asociadas y alinear checkboxes con el servidor. */
  const hydrateLoadingPrevRef = useRef<boolean | null>(null);
  const [catalogSeedRunning, setCatalogSeedRunning] = useState(false);
  const [catalogItems, setCatalogItems] = useState<{ iud: string; tipo_comprador: string; sigla: string; esDefault: boolean }[]>([]);
  const [catalogItemsLoaded, setCatalogItemsLoaded] = useState(false);
  const [deltaByEndpoint, setDeltaByEndpoint] = useState<Record<string, any>>({});
  const [loadingDeltaByEndpoint, setLoadingDeltaByEndpoint] = useState<Record<string, boolean>>({});
  const [tenantFilterByEndpoint, setTenantFilterByEndpoint] = useState<Record<string, string>>({});

  const loadCatalogItems = async () => {
    try {
      const res = await apiFetch('/api/config/permisos/corporativo/listar/catalogo/tenant/corporativo', { method: 'GET' });
      setCatalogItems(Array.isArray(res?.data) ? res.data : []);
    } catch {
      // ignore
    } finally {
      setCatalogItemsLoaded(true);
    }
  };

  const handleCatalogSeedDefaults = async () => {
    setCatalogSeedRunning(true);
    try {
      const res = await apiFetch('/api/config/permisos/corporativo/inicializar/catalogo', { method: 'POST' });
      if (res?.sembrados?.length) {
        toast.success(`${res.sembrados.length} catÃ¡logo(s) por defecto creados`);
      } else {
        toast.info(res?.msg || 'Los catÃ¡logos por defecto ya existen');
      }
      await loadCatalogItems();
    } catch (err: any) {
      toast.error(err?.message || 'Error al inicializar');
    } finally {
      setCatalogSeedRunning(false);
    }
  };

  const tenantPrimaryForms = useMemo(() => {
    if (mode === 'superAdminRules') {
      return { rules: null, superAdmin: null, tenantGlobal: null };
    }
    if (mode === 'rules') {
      return {
        rules: ENDPOINTS.find((e) => e.id === 'tenant-crear-global-reglas') || null,
        superAdmin: null,
        tenantGlobal: null
      };
    }

    return {
      rules: null,
      superAdmin: ENDPOINTS.find((e) => e.id === 'tenant-crear-global-admin') || null,
      tenantGlobal: ENDPOINTS.find((e) => e.id === 'tenant-crear-global-usuario') || null
    };
  }, [mode]);

  const visibleTenantPrimaryForms = useMemo(() => {
    if (mode === 'superAdminRules') return [];
    if (allowedEndpointIds) return [];
    if (isRulesMode) return tenantPrimaryForms.rules ? [tenantPrimaryForms.rules] : [];

    // modo superAdmin: flujo tenantSuperAdmin -> tenantGlobal y listados SA (pantalla TenantSuperAdmin)
    if (mode === 'superAdmin') {
      return tenantPrimaryForms.superAdmin ? [tenantPrimaryForms.superAdmin] : [];
    }

    // modo full: flujo puro tenantGlobal (Descendencia) en ParametrosGobernanza
    const items = [];
    if (tenantPrimaryForms.tenantGlobal) items.push(tenantPrimaryForms.tenantGlobal);
    return items;
  }, [allowedEndpointIds, isRulesMode, mode, tenantPrimaryForms]);

  const actorTieneScopeTenantSuperAdmin = Boolean(String(tenantGlobalActor?.tenantSuperAdminId || '').trim());
  const actorTieneGlobal = Boolean(String(tenantGlobalActor?.tenantGlobalId || '').trim());
  const actorTieneScopeTenantGlobal = actorTieneGlobal && !actorTieneScopeTenantSuperAdmin;
  const tenantGlobalSelectsLoaded = useMemo(
    () => Object.keys(tenantGlobalSelects || {}).length > 0,
    [tenantGlobalSelects]
  );
  const tenantUpdateTargets = useMemo(() => {
    const actorTenantGlobalId = String(tenantGlobalActor?.tenantGlobalId || '').trim();
    const actorTenantSuperAdminId = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
    const esSuperAdmin = !!actorTenantSuperAdminId;
    const esTenantGlobal = !!actorTenantGlobalId && !esSuperAdmin;

    const classifyScope = (tenant: TenantGlobal): 'tenantSuperAdmin' | 'tenantGlobal' | 'tenantCorporativo' => {
      const parentTenantGlobalId = String(tenant?.tenantGlobalAdmin || '').trim();
      const superAdminRef = String(tenant?.tenantSuperAdmin || '').trim();

      if (actorTenantGlobalId && tenant.id === actorTenantGlobalId) return 'tenantGlobal';
      if (parentTenantGlobalId) return 'tenantCorporativo';
      if (superAdminRef) return 'tenantSuperAdmin';
      return 'tenantGlobal';
    };

    return tenantGlobales
      .filter((tenant) => {
        if (esSuperAdmin) return true;
        if (!esTenantGlobal) return false;
        const parentTenantGlobalId = String(tenant?.tenantGlobalAdmin || '').trim();
        return tenant.id === actorTenantGlobalId || parentTenantGlobalId === actorTenantGlobalId;
      })
      .map((tenant) => {
        const scope = classifyScope(tenant);
        const scopeLabel =
          scope === 'tenantSuperAdmin'
            ? 'tenantSuperAdmin'
            : scope === 'tenantCorporativo'
            ? 'tenantCorporativo'
            : 'tenantGlobal';
        const corporativo = String(tenant?.corporativo || '').trim();
        return {
          id: tenant.id,
          label: `${scopeLabel} | ${tenant.label}${corporativo ? ` | ${corporativo}` : ''}`,
          meta: { scope },
        };
      });
  }, [tenantGlobalActor, tenantGlobales]);

  const endpointDisponibleParaScope = (endpoint: EndpointSpec) => {
    if (endpoint.actor === 'ambos') return true;
    if (endpoint.actor === 'tenantSuperAdmin') {
      // Crear tenant Administrador del sistema: solo ejecutable con scope tenantSuperAdmin (alineado al POST .../superAdmin/tenant/global)
      return actorTieneScopeTenantSuperAdmin;
    }
    if (endpoint.actor === 'tenantGlobal') {
      // en modo superAdmin este flujo lo ejecuta solo el DIOS (SA sin global)
      if (mode === 'superAdmin') return actorTieneScopeTenantSuperAdmin && !actorTieneGlobal;
      // Alineado a crearGlobalTenantService.resolverRolEjecutorAdminGlobal: POST .../usu/tenant/global admite SA o TG.
      return actorTieneScopeTenantSuperAdmin || actorTieneScopeTenantGlobal;
    }
    return false;
  };

  const esJwtSoloTenantSuperAdmin = useMemo(() => {
    const tsa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
    const tg = String(tenantGlobalActor?.tenantGlobalId || '').trim();
    const tc = String(tenantGlobalActor?.tenantCorporativoId || '').trim();
    return Boolean(tsa && !tg && !tc);
  }, [tenantGlobalActor]);

  const saJerarquiaConCorporativo = tenantGlobalActor?.saJerarquiaTieneCorporativoEnCounters === true;

  const diosReglasDisponibleModal = (endpoint: EndpointSpec) => {
    if (!DIOS_REGLAS_ENDPOINT_IDS.has(endpoint.id)) return endpointDisponibleParaScope(endpoint);
    return endpointDisponibleParaScope(endpoint) && esJwtSoloTenantSuperAdmin;
  };

  const modoSoloLecturaReglasDios = (endpoint: EndpointSpec) =>
    DIOS_REGLAS_ENDPOINT_IDS.has(endpoint.id) && esJwtSoloTenantSuperAdmin && saJerarquiaConCorporativo;

  const puedeToolbarSincronizarDios = (endpoint: EndpointSpec) =>
    endpoint.id === 'tenant-crear-dios-reglas' &&
    diosReglasDisponibleModal(endpoint) &&
    esJwtSoloTenantSuperAdmin &&
    !saJerarquiaConCorporativo;

  const allowedSet = useMemo(
    () => (allowedEndpointIds ? new Set(allowedEndpointIds) : null),
    [allowedEndpointIds]
  );
  const availableEndpoints = useMemo(() => {
    // allowedEndpointIds overrides everything: muestra exactamente esos IDs sin filtros de ocultación
    if (allowedSet) return ENDPOINTS.filter((e) => allowedSet.has(e.id));
    return mode === 'rules'
      ? ENDPOINTS.filter((endpoint) => RULES_ENDPOINT_IDS.has(endpoint.id))
      : mode === 'superAdminRules'
        ? ENDPOINTS.filter((endpoint) => SUPERADMIN_RULES_ENDPOINT_IDS.has(endpoint.id))
        : mode === 'superAdmin'
          ? ENDPOINTS.filter((endpoint) => endpoint.actor === 'tenantSuperAdmin' && !RULES_ENDPOINT_IDS.has(endpoint.id) && !HIDDEN_ENDPOINT_IDS.has(endpoint.id))
          : ENDPOINTS.filter((endpoint) => !RULES_ENDPOINT_IDS.has(endpoint.id) && !HIDDEN_ENDPOINT_IDS.has(endpoint.id));
  }, [mode, allowedSet]);
  const sectionCounts = useMemo(
    () =>
      availableEndpoints.reduce(
        (acc, endpoint) => {
          acc[endpoint.section] += 1;
          return acc;
        },
        { tenant: 0, permisos: 0, corporativo: 0 } as Record<EndpointSection, number>
      ),
    [availableEndpoints]
  );
  const endpointsBySection = useMemo(() => {
    const esSA = Boolean(String(tenantGlobalActor?.tenantSuperAdminId || '').trim());
    const esTG = Boolean(String(tenantGlobalActor?.tenantGlobalId || '').trim()) && !esSA;
    const esCorp = Boolean(String(tenantGlobalActor?.tenantCorporativoId || '').trim()) && !esSA && !esTG;
    return availableEndpoints.filter((e) => e.section === activeSection && (!e.primary || !!allowedEndpointIds))
      .filter((e) => {
        // El GET «Listar tenantSuperAdmin (rama JWT)» vive en la pagina TenantSuperAdmin, no en el panel full
        if (e.id === 'tenant-listar-libres-superadmin' && mode === 'full') return false;
        if (activeSection === 'tenant' && (e.id === 'tenant-listar-libres-superadmin' || e.id === 'tenant-listar-libres-tenantglobal')) {
          return true;
        }
        if (e.actor === 'tenantSuperAdmin' && !esSA) return false;
        // Misma regla que endpointDisponibleParaScope (TG): visible para SA o TG, no solo corporativo.
        if (e.actor === 'tenantGlobal' && !esTG && !esSA) return false;
        // parametrizacion: solo SA y TG pueden asignar, no corporativo
        if (e.id === 'perm-usuario-tenant-global' && esCorp) return false;
        return true;
      })
      .filter((e) => {
        const q = endpointSearch.trim().toLowerCase();
        if (!q) return true;
        return (
          e.title.toLowerCase().includes(q) ||
          e.path.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.method.toLowerCase().includes(q)
        );
      });
  }, [activeSection, endpointSearch, tenantGlobalActor, availableEndpoints, mode]);

  const lastOpenedRouteEndpointRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const raw = initialEndpointId != null ? String(initialEndpointId).trim() : '';
    if (!raw) {
      lastOpenedRouteEndpointRef.current = undefined;
      return;
    }
    if (lastOpenedRouteEndpointRef.current === raw) return;
    const ep = availableEndpoints.find((e) => e.id === raw);
    if (!ep) return;
    lastOpenedRouteEndpointRef.current = raw;
    setActiveSection(ep.section);
    setEndpointModal(ep);
  }, [initialEndpointId, availableEndpoints]);

  const hydrateData = async () => {
    setLoadingData(true);
    try {
      let actorTenantSuperAdminId = '';
      let actorTenantGlobalId = '';
      let vistasResolved: Vista[] = [];
      let accionesResolved: Accion[] = [];

      const [selectsRes, rutasRes, accionesRes, herenciasRes, reglasRes, tenantsDestinoRes, contextosRes, tenantCorpRes, jerarquiaRes, jerarquiaUsuariosRes] = await Promise.allSettled([
        apiFetch('/api/config/global/creacion/usu/tenant/global/selects', { method: 'GET' }),
        apiFetch('/api/config/tenant/tipo/listar/vistas/contexto/roles', { method: 'GET' }),
        apiFetch('/api/config/parametrizacion/widget/branding/acciones', { method: 'GET' }),
        apiFetch('/api/config/permisos/listar/usu/tenant/libres', { method: 'GET' }),
        apiFetch('/api/config/tenant/listar/reglas', { method: 'GET' }),
        apiFetch('/api/config/tenant/tipo/listar/globales/contexto/roles', { method: 'GET' }),
        apiFetch('/api/config/tenant/tipo/api/contexto', { method: 'GET' }),
        apiFetch('/api/config/permisos/creacion/admin/tenant/corporativos', { method: 'GET' }),
        apiFetch('/api/seguridad/rutas/listarRutas/arbol/admin', { method: 'GET' }),
        getJerarquiaUsuarios(),
      ]);
      const heredaOptionsMap = new Map<string, HeredaGlobalOption>();
      const heredaScopeMap: Record<string, HeredaScope> = {};

      if (selectsRes.status === 'fulfilled') {
        const data = (selectsRes.value as any)?.data || {};
        actorTenantSuperAdminId = String(data?.actor?.tenantSuperAdminId || '').trim();
        actorTenantGlobalId = String(data?.actor?.tenantGlobalId || '').trim();
        setTenantGlobalActor({
          rol: String(data?.actor?.rol || '').trim(),
          tenantGlobalId: data?.actor?.tenantGlobalId ? String(data.actor.tenantGlobalId) : null,
          tenantSuperAdminId: data?.actor?.tenantSuperAdminId ? String(data.actor.tenantSuperAdminId) : null,
          tenantCorporativoId: data?.actor?.tenantCorporativoId ? String(data.actor.tenantCorporativoId) : null,
          saJerarquiaTieneCorporativoEnCounters:
            typeof data?.actor?.saJerarquiaTieneCorporativoEnCounters === 'boolean'
              ? data.actor.saJerarquiaTieneCorporativoEnCounters
              : undefined,
          corporativoJerarquiaAutoId: data?.actor?.corporativoJerarquiaAutoId
            ? String(data.actor.corporativoJerarquiaAutoId)
            : null,
          corporativoIdsJerarquia: Array.isArray(data?.actor?.corporativoIdsJerarquia)
            ? data.actor.corporativoIdsJerarquia.map((x: unknown) => String(x)).filter(Boolean)
            : undefined,
        });
        const mapOptions = (rows: any[] | undefined, fallbackKey: string): GenericSelectOption[] =>
          (Array.isArray(rows) ? rows : [])
            .map((row: any) => {
              const id = String(row?.id || row?._id || '').trim();
              if (!id) return null;
              const label = String(row?.label || row?.[fallbackKey] || id);
              return { id, label };
            })
            .filter(Boolean) as GenericSelectOption[];

        const rawRolesMabs = Array.isArray(data.rolesMabs)
          ? data.rolesMabs
          : Array.isArray(data.roles)
          ? data.roles
          : [];
        setTenantGlobalSelects({
          tipo_tenant: mapOptions(data.tiposTenant, 'tipo_acceso_apis'),
          ownerType: mapOptions(data.ownerTypes, 'tipo_comprador'),
          nvlGeneracionTenant: (Array.isArray(data.nivelesGlobales) ? data.nivelesGlobales : [])
            .map((row: any) => {
              const id = String(row?.id || row?._id || '').trim();
              if (!id) return null;
              const nvl = String(row?.nvl ?? '').trim();
              const generationTenant = String(row?.generation_tenant || '').trim();
              const secuencia = Number(row?.secuencia ?? row?.orden ?? 0);
              const securityPlatform = row?.securityPlatform === true;
              return {
                id,
                label: String(
                  row?.label ||
                  `Secuencia ${secuencia || '-'} Â· NVL ${nvl || '-'} Â· ${generationTenant || id}${securityPlatform ? ' Â· Acceso libre' : ''}`
                ),
                meta: {
                  nvl,
                  generationTenant,
                  secuencia,
                  securityPlatform: securityPlatform ? 'true' : 'false',
                },
              };
            })
            .filter(Boolean) as GenericSelectOption[],
          apisDominios: mapOptions(data.dominios, 'dominio'),
          apis: mapOptions(data.dominios, 'dominio'),
          accionesUsu: mapOptions(data.acciones, 'method'),
          rolesMabs: rawRolesMabs
            .map((row: any) => {
              const id = String(row?.id || row?._id || '').trim();
              if (!id) return null;
              const rol = String(row?.rol || '').trim();
              const label = String(row?.label || rol || id);
              return { id, label, rol };
            })
            .filter(Boolean) as GenericSelectOption[],
          coporativo: mapOptions(data.corporativosDisponibles, 'razon_social'),
          tenantGlobalRef: (() => {
            const jerRaw = Array.isArray(data.tenantGlobalesDesdeJerarquiaCounters)
              ? data.tenantGlobalesDesdeJerarquiaCounters
              : [];
            const jer = jerRaw
              .map((row: any) => {
                const id = String(row?.id || '').trim();
                if (!id) return null;
                return { id, label: String(row?.label || id) };
              })
              .filter(Boolean) as GenericSelectOption[];

            if (jer.length > 0) {
              return jer;
            }

            return (Array.isArray(data.tenantGlobalesRegistrados) ? data.tenantGlobalesRegistrados : [])
              .map((row: any) => {
                const id = String(row?.id || row?._id || '').trim();
                if (!id) return null;
                const rol = String(row?.rol || 'TENANT').trim();
                const corp = String(row?.coporativoNombre || '').trim();
                const suffix = corp ? ` | ${corp}` : '';
                return { id, label: `${rol} | ${id}${suffix}` };
              })
              .filter(Boolean) as GenericSelectOption[];
          })(),
        });
        setTenantGlobalSelectsDebug(
          `Selects: niveles-config=${Array.isArray(data.nivelesGlobales) ? data.nivelesGlobales.length : 0}, tipos=${Array.isArray(data.tiposTenant) ? data.tiposTenant.length : 0}, dominios=${Array.isArray(data.dominios) ? data.dominios.length : 0}, acciones=${Array.isArray(data.acciones) ? data.acciones.length : 0}, roles=${rawRolesMabs.length}, corporativos=${Array.isArray(data.corporativosDisponibles) ? data.corporativosDisponibles.length : 0}`
        );
        setTenantSuperAdminsJerarquiaCounters(
          Array.isArray(data.tenantSuperAdminsDesdeJerarquiaCounters) ? data.tenantSuperAdminsDesdeJerarquiaCounters : []
        );
      } else {
        const reason = (selectsRes as PromiseRejectedResult)?.reason as any;
        const msg = String(
          reason?.message ||
          reason?.msg ||
          'No se pudieron cargar los selects de creacion tenant global'
        );
        toast.error(`Selects tenant global: ${msg}`);
        setTenantGlobalSelects({});
        setTenantGlobalActor({});
        setTenantSuperAdminsJerarquiaCounters([]);
        setTenantGlobalSelectsDebug(`Error selects: ${msg}`);
      }

      {
        const allById = new Map<string, TenantGlobal>();
        const selectsDataJer = selectsRes.status === 'fulfilled' ? ((selectsRes.value as any)?.data || {}) : {};
        const jerarquiaTgMerge = Array.isArray(selectsDataJer.tenantGlobalesDesdeJerarquiaCounters)
          ? selectsDataJer.tenantGlobalesDesdeJerarquiaCounters
          : [];

        // Fuente principal para select JWT-driven (scope por rol/contexto).
        if (tenantsDestinoRes.status === 'fulfilled') {
          const destinoPayload: any = tenantsDestinoRes.value;
          const actorDesdeContexto =
            destinoPayload?.data?.actor ||
            destinoPayload?.actor ||
            null;
          if (actorDesdeContexto) {
            setTenantGlobalActor({
              rol: String(actorDesdeContexto?.rol || '').trim() || undefined,
              tenantGlobalId: actorDesdeContexto?.tenantGlobalId ? String(actorDesdeContexto.tenantGlobalId) : null,
              tenantSuperAdminId: actorDesdeContexto?.tenantSuperAdminId ? String(actorDesdeContexto.tenantSuperAdminId) : null,
              tenantCorporativoId: actorDesdeContexto?.tenantCorporativoId ? String(actorDesdeContexto.tenantCorporativoId) : null,
            });
          }

          const destinoRows = Array.isArray(destinoPayload?.data)
            ? destinoPayload.data
            : pickArray(destinoPayload, ['items']).length > 0
              ? pickArray(destinoPayload, ['items'])
              : pickArray(destinoPayload?.data, ['items']);
          destinoRows.forEach((row: any) => {
            const id = String(row?.tenantGlobalId || row?.id || row?._id || row?.iud || '').trim();
            if (!id) return;
            const label = buildTenantGlobalContextLabel(row, id);
            allById.set(id, {
              id,
              label,
              corporativo: pickTenantCorporate(row),
              correo: pickTenantCorreo(row),
              tenantSuperAdmin: String(row?.tenantSuperAdmin || '').trim() || undefined,
              tenantGlobalAdmin: String(row?.tenantGlobalAdmin || '').trim() || undefined,
            });
          });
        }

        /** GET tenant/libres devuelve solo tenantSuperAdmin; no mezclar aquí (tenantGlobal viene de contexto + selects). */

        jerarquiaTgMerge.forEach((row: any) => {
          const id = String(row?.id || '').trim();
          if (!id) return;
          if (!allById.has(id)) {
            allById.set(id, {
              id,
              label: String(row?.label || id),
              corporativo: row?.coporativoNombre || undefined,
              correo: undefined,
              tenantSuperAdmin: row?.tenantSuperAdminId ? String(row.tenantSuperAdminId) : undefined,
              tenantGlobalAdmin: undefined,
            });
          }
        });

        let listaTenants: TenantGlobal[];

        /** Fuente autorizada para gobernanza: coincide con GET selects (counters + corporativo). */
        if (jerarquiaTgMerge.length > 0) {
          listaTenants = jerarquiaTgMerge
            .map((row: any) => {
              const id = String(row?.id || '').trim();
              if (!id) return null;
              const rich = allById.get(id);
              return {
                id,
                label: rich?.label || String(row?.label || id),
                corporativo: rich?.corporativo || row?.coporativoNombre || undefined,
                correo: rich?.correo,
                /** Preferir SA del GET selects (jerarquía JWT); el TG en Mongo puede tener otro tenantSuperAdmin (sub-SA). */
                tenantSuperAdmin:
                  (row?.tenantSuperAdminId ? String(row.tenantSuperAdminId) : '').trim() ||
                  rich?.tenantSuperAdmin ||
                  undefined,
                tenantGlobalAdmin: rich?.tenantGlobalAdmin,
              } as TenantGlobal;
            })
            .filter(Boolean) as TenantGlobal[];
        } else {
          listaTenants = Array.from(allById.values());
          const idsJerarquiaConCorp = new Set(
            jerarquiaTgMerge.map((row: any) => String(row?.id || '').trim()).filter(Boolean)
          );
          if (idsJerarquiaConCorp.size > 0) {
            listaTenants = listaTenants.filter((t) =>
              idsJerarquiaConCorp.has(String(t.id || '').trim())
            );
          }
        }

        /** Mismo universo TG que el organigrama «Usuarios tenant» (JWT + counters global / árbol). */
        if (jerarquiaUsuariosRes.status === 'fulfilled') {
          const jr = jerarquiaUsuariosRes.value as JerarquiaResponse;
          jerarquiaUsuariosRef.current = jr;
          const desdeOrg = tenantGlobalOptionsFromJerarquiaUsuarios(jr);
          const byId = new Map(listaTenants.map((t) => [String(t.id || '').trim(), t]));
          desdeOrg.forEach((row) => {
            const id = String(row.id || '').trim();
            if (!id) return;
            const prev = byId.get(id);
            if (!prev) {
              byId.set(id, {
                id,
                label: row.label,
                corporativo: row.corporativo,
                tenantSuperAdmin: row.tenantSuperAdmin,
                tenantGlobalAdmin: row.tenantGlobalAdmin,
              });
            } else {
              byId.set(id, {
                ...prev,
                label: prev.label && prev.label.length >= row.label.length ? prev.label : row.label,
                tenantSuperAdmin: prev.tenantSuperAdmin || row.tenantSuperAdmin,
                tenantGlobalAdmin: prev.tenantGlobalAdmin || row.tenantGlobalAdmin,
              });
            }
          });
          listaTenants = Array.from(byId.values());
        }

        /** Respaldo: registrados del GET selects cuando el árbol API no devolvió filas pero sí hay docs en BD filtrados por JWT. */
        const registradosRaw = Array.isArray(selectsDataJer.tenantGlobalesRegistrados)
          ? selectsDataJer.tenantGlobalesRegistrados
          : [];
        if (listaTenants.length === 0 && registradosRaw.length > 0) {
          listaTenants = registradosRaw
            .map((row: any) => {
              const id = String(row?.id || row?._id || '').trim();
              if (!id) return null;
              const rol = String(row?.rol || 'TENANT').trim();
              const corp = String(row?.coporativoNombre || '').trim();
              return {
                id,
                label: `${rol}${corp ? ` · ${corp}` : ''} · …${id.slice(-8)}`,
                corporativo: corp || undefined,
              };
            })
            .filter(Boolean) as TenantGlobal[];
        }

        setTenantGlobales(listaTenants);
      }

      if (tenantCorpRes.status === 'fulfilled') {
        const rowsCorp = pickArray(tenantCorpRes.value, ['data', 'items']);
        const corporativosDetectados = rowsCorp
          .map((row: any) => {
            const id = String(row?.id || row?._id || row?.iud || '').trim();
            const tenantGlobalId = String(
              row?.tenantGlobalId ||
              row?.tenantGlobal?._id ||
              row?.tenantGlobal ||
              ''
            ).trim();
            if (!id || !tenantGlobalId) return null;
            const label = String(row?.label || row?.name || row?.nombre || id).trim();
            return { id, tenantGlobalId, label: `${label} | ${id}` };
          })
          .filter(Boolean) as TenantCorporativoOption[];
        setTenantCorporativos(corporativosDetectados);
      }

      if (rutasRes.status === 'fulfilled') {
        const rows = pickArray(rutasRes.value, ['data', 'rutas', 'items']);
        vistasResolved = rows
          .filter((r: any) => r?.estadoRuta !== false)
          .map((r: any) => ({ id: String(r?._id || r?.id || ''), label: String(r?.label || r?.name || r?.path || r?._id || ''), path: String(r?.path || '') }))
          .filter((v: Vista) => v.id);
      }

      if (accionesRes.status === 'fulfilled') {
        const source = Array.isArray(accionesRes.value?.accionesSistema) ? accionesRes.value.accionesSistema : [];
        accionesResolved = source
          .filter((a: any) => a?.estadoAccion !== false)
          .map((a: any) => ({ id: String(a?._id || a?.id || ''), label: String(a?.etiquetas || a?.method || a?._id || ''), method: String(a?.method || '') }))
          .filter((a: Accion) => a.id);
      }

      if (herenciasRes.status === 'fulfilled' && (!accionesResolved.length || accionesRes.status !== 'fulfilled')) {
        const herencias = Array.isArray(herenciasRes.value?.herencias) ? herenciasRes.value.herencias : [];
        const map = new Map<string, Accion>();
        herencias.forEach((h: any) => {
          const arr = Array.isArray(h?.acciones) ? h.acciones : [];
          arr.forEach((a: any) => {
            const id = String(a?._id || a || '');
            if (!id || map.has(id)) return;
            map.set(id, { id, label: String(a?.etiquetas || a?.method || id), method: String(a?.method || '') });
          });
        });
        const fromHerencia = Array.from(map.values());
        if (fromHerencia.length) accionesResolved = fromHerencia;
      }

      // Fallback: usar acciones del endpoint de selects (accesible para todos los roles)
      if (!accionesResolved.length && selectsRes.status === 'fulfilled') {
        const selectsData = (selectsRes.value as any)?.data || {};
        const rawAcciones = Array.isArray(selectsData.acciones) ? selectsData.acciones : [];
        const mapped = rawAcciones
          .filter((a: any) => a?.estadoAccion !== false)
          .map((a: any) => ({ id: String(a?._id || a?.id || ''), label: String(a?.etiquetas || a?.method || a?._id || ''), method: String(a?.method || '') }))
          .filter((a: Accion) => a.id);
        if (mapped.length) accionesResolved = mapped;
      }

      if (herenciasRes.status === 'fulfilled' && (!vistasResolved.length || rutasRes.status !== 'fulfilled')) {
        const herencias = pickArray(herenciasRes.value, ['herencias', 'data']);
        const map = new Map<string, Vista>();
        herencias.forEach((h: any) => {
          const arr = Array.isArray(h?.vistas) ? h.vistas : [];
          arr.forEach((v: any) => {
            const id = String(v?._id || v || '');
            if (!id || map.has(id)) return;
            map.set(id, {
              id,
              label: String(v?.label || v?.name || v?.path || id),
              path: String(v?.path || ''),
            });
          });
        });
        if (map.size) vistasResolved = Array.from(map.values());
      }

      // Fallback SOLO para tenantSuperAdmin sin herencia dinÃ¡mica:
      // usar rutas de seguridad y acciones del sistema.
      const actorEsSoloSuperAdmin = !!actorTenantSuperAdminId && !actorTenantGlobalId;
      if (actorEsSoloSuperAdmin && !vistasResolved.length) {
        try {
          const fallbackRutas: any = await apiFetch('/api/seguridad/rutas/listarRutas/admin', { method: 'GET' });
          const rowsFallback = pickArray(fallbackRutas, ['data', 'items', 'rutas']);
          const mapped = rowsFallback
            .filter((r: any) => r?.estadoRuta !== false)
            .map((r: any) => ({ id: String(r?._id || r?.iud || r?.id || ''), label: String(r?.label || r?.name || r?.path || r?._id || ''), path: String(r?.path || '') }))
            .filter((v: Vista) => v.id);
          if (mapped.length) vistasResolved = mapped;
        } catch (_error) {
          // noop
        }
      }

      if (actorEsSoloSuperAdmin && !accionesResolved.length) {
        try {
          const fallbackAcciones: any = await apiFetch('/api/config/parametrizacion/widget/branding/acciones/publico', { method: 'GET' });
          const rowsFallback = Array.isArray(fallbackAcciones?.acciones) ? fallbackAcciones.acciones : [];
          const mapped = rowsFallback
            .filter((a: any) => a?.estadoAccion !== false)
            .map((a: any) => ({ id: String(a?._id || a?.id || ''), label: String(a?.etiquetas || a?.method || a?._id || ''), method: String(a?.method || '') }))
            .filter((a: Accion) => a.id);
          if (mapped.length) accionesResolved = mapped;
        } catch (_error) {
          // noop
        }
      }

      setVistas(vistasResolved);
      setAcciones(accionesResolved);

      if (herenciasRes.status === 'fulfilled') {
        const herencias = pickArray(herenciasRes.value, ['herencias', 'data', 'items']);
        setHerenciasUsuario(herencias);
        herencias.forEach((h: any) => {
          const heredaId = String(h?.heredaGlobal?._id || h?.heredaGlobal || '').trim();
          if (!heredaId || heredaOptionsMap.has(heredaId)) return;
          const vCount = Array.isArray(h?.vistas) ? h.vistas.length : 0;
          const aCount = Array.isArray(h?.acciones) ? h.acciones.length : 0;
          const tenantGlobalId = String(
            h?.tenantGlobal?._id ||
            h?.tenantGlobal?.id ||
            h?.tenantGlobal ||
            ''
          ).trim();
          const tenantCorporativoId = String(
            h?.tenantCorporativo?._id ||
            h?.tenantCorporativo?.id ||
            h?.tenantCorporativo ||
            ''
          ).trim();
          const tenantLabel = tenantGlobalId
            ? `TG:${tenantGlobalId}${tenantCorporativoId ? ` | TC:${tenantCorporativoId}` : ''}`
            : 'TG:-';
          const fuente = String(h?.fuenteHerencia || h?.fuente || '').toLowerCase();
          const tenantSuperRef = String(
            h?.tenantSuperTenant?._id ||
            h?.tenantSuperTenant ||
            h?.tenantSuperAdmin?._id ||
            h?.tenantSuperAdmin ||
            ''
          ).trim();
          const esScopeSuperAdmin =
            fuente.includes('superadmin') ||
            fuente.includes('dios') ||
            !!tenantSuperRef;
          heredaScopeMap[heredaId] = esScopeSuperAdmin ? 'tenantSuperAdmin' : 'tenantGlobal';
          const rolLabel = String(h?.rolId?.rol || '').trim();
          const heredaLabel = rolLabel
            ? `${rolLabel} | ${tenantLabel} | Vistas:${vCount} | Acciones:${aCount}`
            : `${heredaId.slice(0, 8)}... | ${tenantLabel} | Vistas:${vCount} | Acciones:${aCount}`;
          heredaOptionsMap.set(heredaId, {
            id: heredaId,
            label: heredaLabel,
          });
        });
      }

      if (reglasRes.status === 'fulfilled') {
        const rows = pickArray(reglasRes.value, ['data', 'reglas', 'items']);
        const contextoMap = new Map<string, ContextOption>();
        const rulesMap: Record<string, any> = {};
        setReglas(
          rows
            .map((r: any) => {
              const ridEncrypted = String(r?.['x-regla-id'] || r?.reglaIdEncrypted || r?.iud || '').trim();
              const ridRaw = String(r?.rid || r?._id || '').trim();
              const rid = ridEncrypted || ridRaw;
              if (rid) rulesMap[rid] = r;
              // Also index by ridRaw so lookups by raw _id work even when ridEncrypted differs
              if (ridRaw && ridRaw !== rid) rulesMap[ridRaw] = r;
              const tenantRef =
                (Array.isArray(r?.generacionGlovallNvlRoles) && r.generacionGlovallNvlRoles[0]) ||
                (Array.isArray(r?.generacionTenatGlobales) && r.generacionTenatGlobales[0]) ||
                '';
              const platformFlag = r?.securityPlatform === true ? 'DIOS' : 'TENANT';
              const rolMabs = String(
                tenantRef?.rolesMabs?.rol ||
                (Array.isArray(tenantRef?.rolesMabs) ? tenantRef.rolesMabs[0]?.rol : '') ||
                ''
              ).trim();
              const tenantLabel =
                rolMabs ||
                String(tenantRef?._id || tenantRef || '').trim() ||
                `Regla ${ridRaw.slice(0, 8) || rid.slice(0, 8)}`;
              const base = r?.nombre || r?.name || r?.titulo || `Tenant ${tenantLabel}`;
                const ctx = Array.isArray(r?.contextoDefi) ? r.contextoDefi : [];
                ctx.forEach((c: any) => {
                  const cid = String(c?._id || c || '').trim();
                  if (!cid || contextoMap.has(cid)) return;
                  const cname = String(c?.contexto || c?.name || c?.nombre || cid);
                  const tipoCtx = String(c?.contexto || c?.tipoContexto || '').trim();
                  contextoMap.set(cid, { id: cid, label: `${cname} | ${cid}`, tipoContexto: tipoCtx });
                });
                if (ridRaw && !heredaOptionsMap.has(ridRaw)) {
                  heredaOptionsMap.set(ridRaw, { id: ridRaw, label: `[REGLA] ${base} | ${ridRaw}` });
                  heredaScopeMap[ridRaw] = r?.securityPlatform === true ? 'tenantSuperAdmin' : 'tenantGlobal';
                }
                return rid ? { id: rid, label: `[${platformFlag}] ${base}` } : null;
              })
            .filter(Boolean) as ReglaOption[]
        );
        setRuleCatalog(rulesMap);
        setContextos(Array.from(contextoMap.values()));
      }

      setHeredaGlobalOptions(Array.from(heredaOptionsMap.values()));
      setHeredaGlobalScopeById(heredaScopeMap);

      if (contextosRes.status === 'fulfilled') {
        const rows = pickArray(contextosRes.value, ['data', 'contextos', 'items']);
        const fromApi = rows
          .filter((c: any) => c?.estado !== false)
          .map((c: any) => {
            const id = String(c?._id || c?.iud || '').trim();
            const nombre = String(c?.contexto || c?.name || c?.nombre || id);
            const tipoCtx = String(c?.contexto || '').trim();
            return id ? { id, label: `${nombre} | ${id}`, tipoContexto: tipoCtx } : null;
          })
          .filter(Boolean) as ContextOption[];
        if (fromApi.length) setContextos(fromApi);
      }
      if (jerarquiaRes.status === 'fulfilled') {
        const rows = pickArray(jerarquiaRes.value, ['data', 'rutas', 'items']);
        setRutasJerarquia(rows as NodoRuta[]);
      }
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo cargar contexto de gobernanza');
    } finally {
      setLoadingData(false);
    }
  };

  /** Firma estable de vistas+acciones de una fila herencia (validar si el servidor devolvió otra asignación). */
  const snapshotHerenciaPermisos = (row: any): string => {
    if (!row) return '';
    const v = (Array.isArray(row?.vistas) ? row.vistas : [])
      .map((x: any) => String(x?._id || x || '').trim())
      .filter(Boolean)
      .sort()
      .join(',');
    const a = (Array.isArray(row?.acciones) ? row.acciones : [])
      .map((x: any) => String(x?._id || x || '').trim())
      .filter(Boolean)
      .sort()
      .join(',');
    return `${v}::${a}`;
  };

  useEffect(() => { hydrateData(); }, []);

  useEffect(() => {
    if (isRulesMode && activeSection !== 'tenant') {
      setActiveSection('tenant');
    }
  }, [isRulesMode, activeSection]);
  useEffect(() => {
    if (isRulesMode) return;
    if (lockedSection) {
      setActiveSection(lockedSection);
      return;
    }
    setActiveSection(initialSection);
  }, [initialSection, isRulesMode, lockedSection]);

  useEffect(() => {
    if (endpointModal?.id === 'corp-crear-catalogo') {
      setCatalogItemsLoaded(false);
      void loadCatalogItems();
    }
  }, [endpointModal?.id]);

  const getFieldValue = (endpointId: string, key: string): string => formData[endpointId]?.[key] ?? '';
  const setFieldValue = (endpointId: string, key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [endpointId]: { ...(prev[endpointId] || {}), [key]: value } }));
  };
  useEffect(() => {
    const actorEsSoloTenantGlobal =
      !!String(tenantGlobalActor?.tenantGlobalId || '').trim() &&
      !String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
    const saConJerarquiaCorporativa =
      tenantGlobalActor?.saJerarquiaTieneCorporativoEnCounters === true;
    const unicaOpcionCorporativa = tenantGlobalSelects.coporativo?.length === 1
      ? tenantGlobalSelects.coporativo[0]
      : null;
    const corporativoAuto =
      unicaOpcionCorporativa ||
      (String(tenantGlobalActor?.corporativoJerarquiaAutoId || '').trim()
        ? {
            id: String(tenantGlobalActor.corporativoJerarquiaAutoId).trim(),
          }
        : null);

    const debeAutollenarCorporativo =
      !!corporativoAuto &&
      (actorEsSoloTenantGlobal || (saConJerarquiaCorporativa && !!tenantGlobalActor?.tenantSuperAdminId));

    if (!debeAutollenarCorporativo) return;

    const endpointIds = [
      'tenant-crear-global-usuario',
      'tenant-crear-global-admin',
      'tenant-actualizar-global',
    ];

    setFormData((prev) => {
      let changed = false;
      const next = { ...prev };

      endpointIds.forEach((endpointId) => {
        const current = next[endpointId] || {};
        const selectedNvl = String(current.nvlGeneracionTenant || '').trim();
        if (!selectedNvl) return;

        const nvlLabel = (tenantGlobalSelects.nvlGeneracionTenant || []).find((opt) => opt.id === selectedNvl)?.label || '';
        const nvlEsTenantGlobal = /tenant-global|nvl 1/i.test(String(nvlLabel));
        const nvlEsTenantCorporativo = /tenant-(co?rporativo)|nvl 2/i.test(String(nvlLabel));
        if (!nvlEsTenantGlobal && !nvlEsTenantCorporativo) return;

        const targetId = corporativoAuto.id;
        if (String(current.coporativo || '').trim() === targetId) return;

        next[endpointId] = {
          ...current,
          coporativo: targetId,
        };
        changed = true;
      });

      return changed ? next : prev;
    });
  }, [
    tenantGlobalActor,
    tenantGlobalSelects.coporativo,
    tenantGlobalSelects.nvlGeneracionTenant,
  ]);
  useEffect(() => {
    const endpointId = 'tenant-actualizar-global';
    const selectedId = String(formData?.[endpointId]?.id || '').trim();
    if (!selectedId) return;
    if (tenantUpdateTargets.some((opt) => opt.id === selectedId)) return;
    setFieldValue(endpointId, 'id', '');
  }, [formData, tenantUpdateTargets]);

  /**
   * Alineado al select Contexto en crear/actualizar reglas globales: solo reglas con contexto `view`
   * (tenant / interfaz). Excluye DIOS y reglas cuyos contextos resueltos son solo `api`.
   */
  const reglaEsGlobalesTenantContextoView = (rule: any): boolean => {
    if (!rule) return false;
    if (rule.securityPlatform === true) return false;
    if (
      rule.securityPlatform === false &&
      Array.isArray(rule.generacionTenatGlobales) &&
      rule.generacionTenatGlobales.length > 0
    ) {
      return false;
    }
    const ctxArr = Array.isArray(rule.contextoDefi) ? rule.contextoDefi : [];
    const ids = ctxArr.map((c: any) => String(c?._id || c || '').trim()).filter(Boolean);
    if (ids.length === 0) return true;

    const tipos = ids.map((id) => {
      const meta = contextos.find((x) => x.id === id);
      return String(meta?.tipoContexto || '').trim().toLowerCase();
    });

    if (tipos.some((t) => t === 'view')) return true;

    const soloApi = tipos.length > 0 && tipos.every((t) => t === 'api');
    return !soloApi;
  };

  /** TG asociado al documento regla (misma semántica que listar reglas). */
  const resolveTenantGlobalIdFromRule = (rule: any): string => {
    if (!rule) return '';
    const g1 = Array.isArray(rule.generacionGlovallNvlRoles) ? rule.generacionGlovallNvlRoles[0] : null;
    const g2 = Array.isArray(rule.generacionTenatGlobales) ? rule.generacionTenatGlobales[0] : null;
    const ref = g1 || g2;
    return String(ref?._id || ref || '').trim();
  };

  /** Selección de checkboxes al cargar una regla global (vistas/recursos + acciones). */
  const buildCatalogSelectionFromReglaGlobal = (rule: any): CatalogSelection => {
    const vistas = new Set<string>();
    const accs = new Set<string>();
    if (!rule) return { vistas: [], acciones: [] };
    (Array.isArray(rule.recurso) ? rule.recurso : []).forEach((v: any) => {
      const id = String(v?._id || v || '').trim();
      if (id) vistas.add(id);
    });
    (Array.isArray(rule.accionesUsu) ? rule.accionesUsu : []).forEach((a: any) => {
      const id = String(a?._id || a || '').trim();
      if (id) accs.add(id);
    });
    (Array.isArray(rule.permisos) ? rule.permisos : []).forEach((p: any) => {
      const vid = String(p?.vistaId?._id || p?.vistaId || '').trim();
      if (vid) vistas.add(vid);
      (Array.isArray(p?.accionId) ? p.accionId : []).forEach((a: any) => {
        const aid = String(a?._id || a || '').trim();
        if (aid) accs.add(aid);
      });
    });
    return { vistas: Array.from(vistas), acciones: Array.from(accs) };
  };

  const getCatalogSelection = (endpointId: string): CatalogSelection =>
    catalogSelection[endpointId] ?? { vistas: [], acciones: [] };
  const setCatalogSelectionFor = (endpointId: string, next: CatalogSelection) => {
    setCatalogSelection((prev) => ({ ...prev, [endpointId]: next }));
  };
  const getReglasFiltradasPorTenant = (endpointId: string): ReglaOption[] => {
    const filtroReglasGlobalesView =
      endpointId === 'tenant-actualizar-global-reglas' ||
      endpointId === 'tenant-desactivar-global-reglas' ||
      endpointId === 'tenant-eliminar-global-reglas';

    let base = reglas;
    if (filtroReglasGlobalesView) {
      base = reglas.filter((r) => reglaEsGlobalesTenantContextoView(ruleCatalog[r.id]));
    }

    const tenantFiltro = tenantFilterByEndpoint[endpointId] || '';
    if (!tenantFiltro) return base;

    return base.filter((r) => {
      const rule = ruleCatalog[r.id];
      const tenantId = resolveTenantGlobalIdFromRule(rule);
      return tenantId === tenantFiltro;
    });
  };
  const ensureReglaSeleccionadaParaVista = (endpointId: string): void => {
    if (
      endpointId !== 'tenant-actualizar-global-reglas' &&
      endpointId !== 'tenant-desactivar-global-reglas' &&
      endpointId !== 'tenant-eliminar-global-reglas'
    )
      return;
    if (getFieldValue(endpointId, 'x-regla-id').trim()) return;

    const firstRule = getReglasFiltradasPorTenant(endpointId)[0];
    if (!firstRule?.id) return;

    setFieldValue(endpointId, 'x-regla-id', firstRule.id);
    if (endpointId === 'tenant-actualizar-global-reglas') {
      applyRuleToForm(endpointId, firstRule.id);
    }
  };
  const toggleCatalogItem = (endpointId: string, key: 'vistas' | 'acciones', id: string, checked: boolean) => {
    if (checked && key === 'vistas') {
      ensureReglaSeleccionadaParaVista(endpointId);
    }

    const current = getCatalogSelection(endpointId);
    const set = new Set(current[key]);
    if (checked) set.add(id); else set.delete(id);
    setCatalogSelectionFor(endpointId, { ...current, [key]: Array.from(set) });
  };
  const getBulkAllMode = (endpointId: string): boolean => !!bulkAllMode[endpointId];
  const setBulkAllFor = (endpointId: string, enabled: boolean) => {
    setBulkAllMode((prev) => ({ ...prev, [endpointId]: enabled }));
  };
  const actorEsTenantSuperAdmin = (): boolean =>
    Boolean(String(tenantGlobalActor?.tenantSuperAdminId || '').trim());
  const actorEsTenantGlobalScope = (): boolean =>
    Boolean(String(tenantGlobalActor?.tenantGlobalId || '').trim()) &&
    !Boolean(String(tenantGlobalActor?.tenantSuperAdminId || '').trim());
  const actorEsTenantCorporativoScope = (): boolean =>
    Boolean(String(tenantGlobalActor?.tenantCorporativoId || '').trim()) &&
    !actorEsTenantSuperAdmin() &&
    !actorEsTenantGlobalScope();
  /** Regla seleccionada en ruleCatalog: heredaGlobal / herenciaAsociada o x-regla-id (tenant globales). */
  const getSelectedRuleCatalogKey = (endpointId: string): string => {
    const usaXReglaId =
      endpointId === 'tenant-actualizar-global-reglas' ||
      endpointId === 'tenant-desactivar-global-reglas' ||
      endpointId === 'tenant-eliminar-global-reglas';
    if (usaXReglaId) {
      const rid = getFieldValue(endpointId, 'x-regla-id').trim();
      return rid && ruleCatalog[rid] ? rid : '';
    }
    const heredaSelVal =
      getFieldValue(endpointId, 'heredaGlobal').trim() ||
      getFieldValue(endpointId, 'herenciaAsociada').trim();
    return heredaSelVal && ruleCatalog[heredaSelVal] ? heredaSelVal : '';
  };

  const getCatalogoVistaIdsRelacionadas = (endpointId: string, suiteId = ''): string[] => {
    const { vistasCatalogo } = getPermisosCatalog(endpointId);
    const esReglaSeleccionada = !!getSelectedRuleCatalogKey(endpointId);
    const esSA = actorEsTenantSuperAdmin();
    const forzarTechoCatalogo = endpointId === 'perm-usuario-tenant-global';
    const allowedVistaIds: Set<string> = esSA
      ? (forzarTechoCatalogo ? new Set(vistasCatalogo.map((v) => v.id)) : new Set<string>())
      : new Set(vistasCatalogo.map((v) => v.id));
    const catalogIds = new Set(vistasCatalogo.map((v) => v.id));
    const hasCatalogFilter = catalogIds.size > 0;
    const vistaIdsActivos = new Set(vistas.map((v) => v.id));
    const suitesFuente = suiteId
      ? rutasJerarquia.filter((suite) => String(getEntityId(suite)) === String(suiteId))
      : rutasJerarquia.filter((suite) => Array.isArray(suite.children) && suite.children.length > 0);
    const relacionadas = new Set<string>();

    const getFormulariosDeModulo = (modulo: any) =>
      collectAllNodes(modulo.children || []).filter((f) => {
        const fid = String(f._id || '');
        if (!fid) return false;
        if (allowedVistaIds.size > 0 && !allowedVistaIds.has(fid)) return false;
        if (esReglaSeleccionada) {
          return vistaIdsActivos.has(fid) || esNodoFormularioLike(f);
        }
        return esNodoFormularioLike(f) || (hasCatalogFilter && catalogIds.has(fid));
      });

    suitesFuente.forEach((suite) => {
      getModuloNodes(suite).forEach((modulo) => {
        getFormulariosDeModulo(modulo).forEach((form) => {
          const fid = String(form?._id || '');
          if (!fid) return;
          relacionadas.add(fid);
        });
      });
    });

    if (!relacionadas.size && !suiteId) {
      vistasCatalogo.forEach((vista) => {
        const fid = String(vista?.id || '').trim();
        if (fid) relacionadas.add(fid);
      });
    }

    return Array.from(relacionadas);
  };
  const applySuiteCatalogSelection = (endpointId: string, suiteId: string) => {
    setSuiteSelByEndpoint((prev) => ({ ...prev, [endpointId]: suiteId }));
    setExpandedModulos(new Set());
  };
  const syncCatalogSelection = (endpointId: string, suiteId = '') => {
    const { accionesCatalogo } = getPermisosCatalog(endpointId);
    const current = getCatalogSelection(endpointId);
    const vistasRelacionadas = getCatalogoVistaIdsRelacionadas(endpointId, suiteId);
    const accionesValidas = current.acciones.filter((id) => accionesCatalogo.some((accion) => accion.id === id));

    setCatalogSelectionFor(endpointId, {
      vistas: vistasRelacionadas,
      acciones: accionesValidas.length ? accionesValidas : accionesCatalogo.map((accion) => accion.id),
    });
  };

  const getTenantGlobalOptionsForPermUsuario = (): HeredaGlobalOption[] => {
    const actorTg = String(tenantGlobalActor?.tenantGlobalId || '').trim();
    if (!actorTg) return [];
    const tg = tenantGlobales.find((t) => String(t?.id || '').trim() === actorTg);
    return [{ id: actorTg, label: tg ? tg.label : `tenantGlobal | ${actorTg}` }];
  };
  const getHeredaOptionsPermitidasPorTenantGlobal = (tenantGlobalId: string): HeredaGlobalOption[] => {
    const tg = String(tenantGlobalId || '').trim();
    if (!tg) return [];

    if (actorEsTenantSuperAdmin()) {
      // 1. Buscar herenciaGlobal directa del tenant seleccionado.
      //    Combina herenciasUsuario + herenciasExistentesPorTG[tg] (cargadas dinÃ¡micamente al seleccionar TG).
      const herenciasDelTG: any[] = [
        ...herenciasUsuario,
        ...(herenciasExistentesPorTG[tg] || []),
      ];

      const herenciaDirecta = herenciasDelTG.filter((h: any) => {
        const hTg = String(h?.tenantGlobal?._id || h?.tenantGlobal || '').trim();
        const tieneVistas = Array.isArray(h?.vistas) && h.vistas.length > 0;
        const tieneAcciones = Array.isArray(h?.acciones) && h.acciones.length > 0;
        const esDirecta = !String(h?.heredaGlobal?._id || h?.heredaGlobal || '').trim();
        return hTg === tg && tieneVistas && tieneAcciones && esDirecta;
      });

      if (herenciaDirecta.length > 0) {
        // El tenant ya tiene herencia parametrizada - mostrar esa (y solo esa)
        const tgInfo = tenantGlobales.find((t) => String(t?.id || '').trim() === tg);
        const tgNombre = tgInfo ? String(tgInfo.label).split('|')[0].trim() : tg.slice(-6);
        const seen = new Set<string>();
        const opts: HeredaGlobalOption[] = [];
        herenciaDirecta.forEach((h: any) => {
          const hId = String(h?.iud || h?._id || '').trim();
          if (!hId || seen.has(hId)) return;
          seen.add(hId);
          const vCount = Array.isArray(h?.vistas) ? h.vistas.length : 0;
          const aCount = Array.isArray(h?.acciones) ? h.acciones.length : 0;
          opts.push({ id: hId, label: `${tgNombre} | Vistas:${vCount} | Acciones:${aCount}` });
        });
        return opts;
      }

      // 2. El tenant NO tiene herencia â†’ mostrar reglas parametrizadas sobre su rol.
      //    Coincidencia primaria: rolesMabs.rol del TG. Secundaria: _id del TG en generacionGlovallNvlRoles.
      const tgInfo = tenantGlobales.find((t) => String(t?.id || '').trim() === tg);
      const tgRolNombre = tgInfo ? String(tgInfo.label).split('|')[0].trim().toUpperCase() : '';

      const reglasParaTg: HeredaGlobalOption[] = [];
      const seenReglas = new Set<string>();
      Object.entries(ruleCatalog).forEach(([reglaId, rule]: [string, any]) => {
        const nvlRoles = Array.isArray(rule?.generacionGlovallNvlRoles) ? rule.generacionGlovallNvlRoles : [];
        const coincide = nvlRoles.some((x: any) => {
          const xId = String(x?._id || x || '').trim();
          const xRol = String(x?.rolesMabs?.rol || (Array.isArray(x?.rolesMabs) ? x.rolesMabs[0]?.rol : '') || '').trim().toUpperCase();
          // Coincide si el ID del TG coincide, O si el rol del TG coincide
          return xId === tg || (tgRolNombre && xRol === tgRolNombre);
        });
        if (coincide && !seenReglas.has(reglaId)) {
          seenReglas.add(reglaId);
          const vCount = Array.isArray(rule?.recurso) ? rule.recurso.length : 0;
          const aCount = Array.isArray(rule?.accionesUsu) ? rule.accionesUsu.length : 0;
          // El modelo reglas no tiene campo nombre - se deriva del rolesMabs.rol del primer tenantGlobal asignado
          const tenantRef = Array.isArray(rule?.generacionGlovallNvlRoles) ? rule.generacionGlovallNvlRoles[0] : null;
          const rolNombre = String(
            tenantRef?.rolesMabs?.rol ||
            (Array.isArray(tenantRef?.rolesMabs) ? tenantRef.rolesMabs[0]?.rol : '') ||
            rule?.nombre || rule?.name || rule?.titulo || ''
          ).trim();
          const label = rolNombre
            ? `${rolNombre} | Vistas:${vCount} | Acciones:${aCount}`
            : `Regla | Vistas:${vCount} | Acciones:${aCount}`;
          reglasParaTg.push({ id: reglaId, label });
        }
      });
      if (reglasParaTg.length > 0) return reglasParaTg;

      // 3. Sin herencia directa ni reglas para este TG → retornar [] para que el catalogo
      //    caiga al "last resort" y muestre todas las rutasSeguridad disponibles.
      return [];
    }

    // TenantGlobal branch: filtrar por tenantGlobal ID
    const ids = new Set<string>();
    herenciasUsuario.forEach((h: any) => {
      const tgH = String(h?.tenantGlobal?._id || h?.tenantGlobal || '').trim();
      if (tgH === tg) {
        // Herencia directa (sin heredaGlobal): usar su propio _id
        const hId = String(h?.iud || h?._id || '').trim();
        if (hId) ids.add(hId);
      }
    });
    const byTg = herenciasUsuario
      .filter((h: any) => ids.has(String(h?.iud || h?._id || '').trim()))
      .map((h: any) => {
        const hId = String(h?.iud || h?._id || '').trim();
        const vCount = Array.isArray(h?.vistas) ? h.vistas.length : 0;
        const aCount = Array.isArray(h?.acciones) ? h.acciones.length : 0;
        return { id: hId, label: `Herencia TG | Vistas:${vCount} | Acciones:${aCount}` };
      });
    if (byTg.length) return byTg;
    return heredaGlobalOptions.filter((opt) => heredaGlobalScopeById[opt.id] === 'tenantGlobal');
  };
  // Retorna las herenciaGlobal del TG (las asignadas al TG por el SA) como opciones de dropdown.
  // Estas sirven como techo de vistas/acciones cuando el TG asigna permisos corporativos.
  const getHerenciaGlobalOpcionesParaTG = (): HeredaGlobalOption[] => {
    const tgId = String(tenantGlobalActor?.tenantGlobalId || '').trim();
    if (!tgId) return [];
    const seen = new Set<string>();
    const opts: HeredaGlobalOption[] = [];
    herenciasUsuario.forEach((h: any) => {
      const hTg = String(h?.tenantGlobal?._id || h?.tenantGlobal || '').trim();
      if (hTg !== tgId) return;
      // herenciaGlobal records del TG no tienen heredaGlobal - usar su propio _id
      const hId = String(h?.iud || h?._id || '').trim();
      if (!hId || seen.has(hId)) return;
      seen.add(hId);
      const vCount = Array.isArray(h?.vistas) ? h.vistas.length : 0;
      const aCount = Array.isArray(h?.acciones) ? h.acciones.length : 0;
      const label = `Herencia TG | Vistas:${vCount} | Acciones:${aCount}`;
      opts.push({ id: hId, label });
    });
    return opts;
  };

  // Retorna los tenantCorporativos del TG autenticado filtrados desde tenantCorporativos state
  const getCorporativosDelTG = (): TenantCorporativoOption[] => {
    const tgId = String(tenantGlobalActor?.tenantGlobalId || '').trim();
    if (!tgId) return [];
    return tenantCorporativos.filter((tc) => String(tc.tenantGlobalId || '').trim() === tgId);
  };

  const getCorporativoByHerencia = (heredaId: string): string | null => {
    const h = herenciasUsuario.find((h: any) =>
      String(h?.heredaGlobal?._id || h?.heredaGlobal || '').trim() === heredaId
    );
    if (!h) return null;
    const tc = String(h?.tenantCorporativo?._id || h?.tenantCorporativo || '').trim();
    const tcNombre = String(h?.tenantCorporativo?.razon_social || h?.tenantCorporativo?.titulo || '').trim();
    return tc ? (tcNombre ? `${tcNombre} | ${tc}` : tc) : null;
  };

  /** Etiqueta visible: nombre/apellidos desde perfil (perfilGlobal unificado en API jerarquía) si existen; si no, correo. */
  const labelUsuarioDesdeJerarquia = (u: any): string => {
    const perfil = u?.perfil ?? u?.perfilGlobal ?? null;
    const nombre = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(' ').trim();
    const correo = String(u?.correo || '').trim();
    const rol = String(u?.rol || '').trim();
    const base = nombre || correo || String(u?.iud || u?._id || '').trim();
    return rol ? `${base} · ${rol}` : base;
  };

  const buscarNodoTenantGlobalEnArbol = (nodos: any[], tgId: string): any | null => {
    const idBuscado = String(tgId || '').trim();
    if (!idBuscado || !Array.isArray(nodos)) return null;
    for (const n of nodos) {
      const id = String(n?.tenantGlobal?.iud || n?.tenantGlobal?._id || '').trim();
      if (id === idBuscado) return n;
      const subs = Array.isArray(n?.subTenantGlobales) ? n.subTenantGlobales : [];
      const found = buscarNodoTenantGlobalEnArbol(subs, idBuscado);
      if (found) return found;
    }
    return null;
  };

  const endpointEsReglasGlobalesJerarquia = (endpointId: string) =>
    endpointId === 'tenant-crear-global-reglas' || endpointId === 'tenant-actualizar-global-reglas';

  /** Reglas globales: excluye rol DIOS/SuperAdmin y la rama usuariosTenantSuperAdmin del organigrama. */
  const rolExcluirReglasGlobales = (rolRaw: unknown): boolean => {
    const r = String(rolRaw || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/\s+/g, ' ');
    if (!r) return false;
    if (r === 'DIOS' || r === 'SUPERADMIN') return true;
    if (r.includes('SUPERADMIN') && !r.includes('ADMINISTRAD')) return true;
    return false;
  };

  /** Lista deduplicada de usuarios bajo el nodo TG en la jerarquía (perfil → etiqueta; si no, correo). */
  const collectUsuariosListaParaTenantGlobal = (
    jerarquia: any,
    tenantGlobalId: string,
    opts?: { globalesReglas?: boolean }
  ): { id: string; label: string }[] => {
    const globalesReglas = opts?.globalesReglas === true;
    const tgId = String(tenantGlobalId || '').trim();
    const lista: { id: string; label: string }[] = [];

    const extraerUsuario = (u: any) => {
      if (globalesReglas && rolExcluirReglasGlobales(u?.rol)) return;
      const id = String(u?.iud || u?._id || '').trim();
      if (!id) return;
      lista.push({ id, label: labelUsuarioDesdeJerarquia(u) });
    };

    const extraerDeNodo = (nodo: any) => {
      const uArr = Array.isArray(nodo?.usuarios) ? nodo.usuarios : [];
      uArr.forEach(extraerUsuario);
      if (!globalesReglas) {
        const saRama = Array.isArray(nodo?.usuariosTenantSuperAdmin) ? nodo.usuariosTenantSuperAdmin : [];
        saRama.forEach(extraerUsuario);
      }

      const hijos = Array.isArray(nodo?.hijos) ? nodo.hijos : [];
      hijos.forEach(extraerDeNodo);
      const corps = Array.isArray(nodo?.corporativos) ? nodo.corporativos : [];
      corps.forEach(extraerDeNodo);

      const subs = Array.isArray(nodo?.subTenantGlobales) ? nodo.subTenantGlobales : [];
      subs.forEach(extraerDeNodo);
    };

    const tgRows: any[] = Array.isArray(jerarquia?.tenantsGlobales) ? jerarquia.tenantsGlobales : [];
    if (tgId) {
      const tgMatch =
        buscarNodoTenantGlobalEnArbol(tgRows, tgId) ||
        tgRows.find((tg: any) => String(tg?.tenantGlobal?.iud || tg?.tenantGlobal?._id || '').trim() === tgId);
      if (tgMatch) extraerDeNodo(tgMatch);
    } else {
      tgRows.forEach(extraerDeNodo);
    }

    return Array.from(new Map(lista.map((u) => [u.id, u])).values());
  };

  const aplicarUsuariosDesdeJerarquiaRef = (endpointId: string, tgId: string) => {
    const snap = jerarquiaUsuariosRef.current;
    const id = String(tgId || '').trim();
    if (!snap || !id) return;
    const lista = collectUsuariosListaParaTenantGlobal(snap, id, {
      globalesReglas: endpointEsReglasGlobalesJerarquia(endpointId),
    });
    setUsuariosDisponibles((prev) => ({ ...prev, [endpointId]: lista }));
  };

  const cargarUsuariosParaEndpoint = async (endpointId: string, tenantGlobalId: string) => {
    const tgId = String(tenantGlobalId || '').trim();
    const globalesReglas = endpointEsReglasGlobalesJerarquia(endpointId);
    const snapPrev = jerarquiaUsuariosRef.current;
    if (snapPrev) {
      const listaSync = collectUsuariosListaParaTenantGlobal(snapPrev, tgId, { globalesReglas });
      setUsuariosDisponibles((prev) => ({ ...prev, [endpointId]: listaSync }));
    }

    const debeSpinner = !snapPrev;
    if (debeSpinner) {
      setLoadingUsuarios((prev) => ({ ...prev, [endpointId]: true }));
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), JERARQUIA_USUARIOS_FETCH_MS);
    const limpiarTimer = () => {
      window.clearTimeout(timer);
    };

    try {
      const jerarquia: any = await apiFetch('/api/registro/jerarquia/usuarios', {
        method: 'GET',
        signal: controller.signal,
      });
      limpiarTimer();
      jerarquiaUsuariosRef.current = jerarquia;
      const unicos = collectUsuariosListaParaTenantGlobal(jerarquia, tgId, { globalesReglas });
      setUsuariosDisponibles((prev) => ({ ...prev, [endpointId]: unicos }));
    } catch (_e) {
      limpiarTimer();
      if (!jerarquiaUsuariosRef.current) {
        setUsuariosDisponibles((prev) => ({ ...prev, [endpointId]: [] }));
      }
    } finally {
      if (debeSpinner) {
        setLoadingUsuarios((prev) => ({ ...prev, [endpointId]: false }));
      }
    }
  };

  const cargarHerenciasExistentesTG = async (tgId: string) => {
    if (!tgId) return;
    try {
      const res: any = await apiFetch(
        `/api/config/permisos/listar/usu/tenant/libres?soloMios=false&tenantGlobal=${tgId}`,
        { method: 'GET' }
      );
      const lista = Array.isArray(res?.data) ? res.data : [];
      setHerenciasExistentesPorTG((prev) => ({ ...prev, [tgId]: lista }));
    } catch {
      setHerenciasExistentesPorTG((prev) => ({ ...prev, [tgId]: [] }));
    }
  };

  const cargarHerenciasPorUsuario = async (usuarioId: string) => {
    if (!usuarioId || herenciasPorUsuario[usuarioId] !== undefined) return;
    setLoadingHerenciasPorUsuario((prev) => ({ ...prev, [usuarioId]: true }));
    try {
      const res: any = await apiFetch(
        '/api/config/permisos/listar/usu/tenant/libres?usuarioId=' + usuarioId + '&soloMios=false',
        { method: 'GET' }
      );
      const lista = Array.isArray(res?.data) ? res.data : [];
      setHerenciasPorUsuario((prev) => ({ ...prev, [usuarioId]: lista }));
    } catch {
      setHerenciasPorUsuario((prev) => ({ ...prev, [usuarioId]: [] }));
    } finally {
      setLoadingHerenciasPorUsuario((prev) => ({ ...prev, [usuarioId]: false }));
    }
  };

  const getTenantCorporativoOptions = (endpointId: string): TenantCorporativoOption[] => {
    const tenantGlobalId = getFieldValue(endpointId, 'tenantGlobal').trim();
    if (!tenantGlobalId || isTenantSuperAdminScopeOption(tenantGlobalId)) return [];
    const unique = new Map<string, TenantCorporativoOption>();
    tenantCorporativos
      .filter((c) => c.tenantGlobalId === tenantGlobalId)
      .forEach((c) => unique.set(c.id, c));

    herenciasUsuario.forEach((h: any) => {
      const tg = String(h?.tenantGlobal?._id || h?.tenantGlobal || '').trim();
      const tc = String(h?.tenantCorporativo?._id || h?.tenantCorporativo || '').trim();
      if (!tc || tg !== tenantGlobalId || unique.has(tc)) return;
      unique.set(tc, { id: tc, tenantGlobalId, label: `${tc}` });
    });

    return Array.from(unique.values());
  };
  const getTenantGlobalOptions = (endpointId: string): TenantGlobal[] => {
    const actorTenantGlobal = String(tenantGlobalActor.tenantGlobalId || '').trim();
    const actorTenantSuper = String(tenantGlobalActor.tenantSuperAdminId || '').trim();
    const actorTenantCorporativo = String(tenantGlobalActor.tenantCorporativoId || '').trim();
    const isHerenciaEndpoint =
      endpointId === 'perm-admin-tenant-global' ||
      PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpointId) ||
      endpointId === 'perm-admin-tenant-global-desactivar' ||
      endpointId === 'perm-admin-tenant-global-eliminar' ||
      endpointId === 'perm-listar-herencias';

    const expandByTree = (seedIds: string[]): Set<string> =>
      expandTenantGlobalDescendants(tenantGlobales, seedIds);

    const scopeOptionDios = (): TenantGlobal => ({
      id: `${TENANT_SUPERADMIN_SCOPE_PREFIX}${actorTenantSuper}`,
      label: `tenantSuperAdmin (DIOS) | ${actorTenantSuper}`,
      corporativo: 'SCOPE_DIOS',
      tenantSuperAdmin: actorTenantSuper,
    });

    if (
      actorTenantSuper &&
      ENDPOINT_IDS_OPCIONES_TG_JERARQUIA_SUPERADMIN.has(endpointId)
    ) {
      const baseLista = filtrarTenantGlobalesPorJerarquiaSuperAdmin(
        tenantGlobales,
        actorTenantSuper,
        tenantGlobalActor?.saJerarquiaTieneCorporativoEnCounters === true
      );
      /** Permisos heredados / actualizar / desactivar / eliminar: una opción por SA del jerarquía counter (misma herencia que GET). */
      if (ENDPOINT_IDS_SELECT_MULTI_SA_JERARQUIA.has(endpointId) && tenantSuperAdminsJerarquiaCounters.length > 0) {
        const saScopeOptions: TenantGlobal[] = tenantSuperAdminsJerarquiaCounters
          .map((s: any) => {
            const sid = String(s?.id || '').trim();
            if (!sid) return null;
            return {
              id: `${TENANT_SUPERADMIN_SCOPE_PREFIX}${sid}`,
              label: String(s?.label || `tenantSuperAdmin · ${sid}`).trim(),
              corporativo: 'SCOPE_DIOS',
              tenantSuperAdmin: sid,
            };
          })
          .filter(Boolean) as TenantGlobal[];
        const byKey = new Map<string, TenantGlobal>();
        saScopeOptions.forEach((o) => byKey.set(o.id, o));
        const mergedSa = Array.from(byKey.values()).sort((a, b) =>
          String(a.tenantSuperAdmin || '').localeCompare(String(b.tenantSuperAdmin || ''))
        );
        return [...mergedSa, ...baseLista];
      }
      return [scopeOptionDios(), ...baseLista];
    }

    if (!isHerenciaEndpoint) {
      const esReglasGlobales =
        endpointId === 'tenant-crear-global-reglas' ||
        endpointId === 'tenant-actualizar-global-reglas' ||
        endpointId === 'tenant-desactivar-global-reglas' ||
        endpointId === 'tenant-eliminar-global-reglas';

      if (
        esReglasGlobales &&
        tenantGlobales.length === 0 &&
        Array.isArray(tenantGlobalSelects.tenantGlobalRef) &&
        tenantGlobalSelects.tenantGlobalRef.length > 0
      ) {
        /** Solo refs de selects (jerarquía): son MongoIds de TG; no anteponer opción sintética DIOS. */
        return tenantGlobalSelects.tenantGlobalRef.map((o) => ({
          id: o.id,
          label: o.label,
        })) as TenantGlobal[];
      }

      /**
       * Reglas globales: el destino del POST/PUT es siempre un documento tenantGlobal (MongoId).
       * Nunca listar la opción sintética «tenantSuperAdmin (DIOS)» — la jerarquía viene de
       * tenantGlobalesDesdeJerarquiaCounters / corporativo (mismo criterio que el backend).
       */
      if (esReglasGlobales && actorTenantSuper) {
        const roots = tenantGlobales
          .filter((t) => String(t.tenantSuperAdmin || '').trim() === actorTenantSuper)
          .map((t) => String(t.id || '').trim())
          .filter(Boolean);
        const allowed = expandByTree(roots);
        let base = tenantGlobales.filter((t) => allowed.has(String(t.id || '').trim()));
        if (!base.length) {
          base = tenantGlobales;
        }
        if (tenantGlobalActor?.saJerarquiaTieneCorporativoEnCounters === true) {
          base = filtrarTenantGlobalesPorJerarquiaSuperAdmin(base, actorTenantSuper, true);
        }
        base = base.filter((t) => !isTenantSuperAdminScopeOption(String(t.id || '')));
        return base.length ? base : [];
      }

      return tenantGlobales;
    }

    if (actorTenantGlobal) {
      // Para actualizar: TG solo puede gestionar herencias de su propio TG
      if (PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpointId)) {
        const ownTg = tenantGlobales.find((t) => String(t.id || '').trim() === actorTenantGlobal);
        return ownTg ? [ownTg] : [];
      }
      const allowed = expandByTree([actorTenantGlobal]);
      const visibles = tenantGlobales.filter((t) => allowed.has(String(t.id || '').trim()));
      return visibles.length ? visibles : tenantGlobales;
    }

    if (actorTenantCorporativo) {
      if (actorTenantGlobal) {
        const visibles = tenantGlobales.filter((t) => String(t.id || '').trim() === actorTenantGlobal);
        if (visibles.length) return visibles;
      }
      const tgFromHerencias = new Set(
        herenciasUsuario
          .filter((h: any) => String(h?.tenantCorporativo?._id || h?.tenantCorporativo || '').trim() === actorTenantCorporativo)
          .map((h: any) => String(h?.tenantGlobal?._id || h?.tenantGlobal || '').trim())
          .filter(Boolean)
      );
      const visibles = tenantGlobales.filter((t) => tgFromHerencias.has(String(t.id || '').trim()));
      return visibles.length ? visibles : tenantGlobales;
    }

    return [];
  };
  const runHerenciaSyncCheck = async (endpointId: string, sincronizar: boolean) => {
    try {
      let tenantGlobalSelection = getFieldValue(endpointId, 'tenantGlobal').trim();
      const tenantCorporativoId = getFieldValue(endpointId, 'tenantCorporativo').trim();
      const esTenantSuperAdmin = !!String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
      if (!tenantGlobalSelection && esTenantSuperAdmin) {
        const options = getTenantGlobalOptions(endpointId);
        const firstTenantId = String(options?.[0]?.id || '').trim();
        if (firstTenantId) {
          tenantGlobalSelection = firstTenantId;
          setFieldValue(endpointId, 'tenantGlobal', firstTenantId);
          await fetchHerenciasAsociadasByTenantGlobal(endpointId, firstTenantId);
        }
      }
      if (!tenantGlobalSelection && !esTenantSuperAdmin) {
        toast.error('Selecciona tenant global antes de validar sincronizacion');
        return;
      }
      const tenantGlobalId = isTenantSuperAdminScopeOption(tenantGlobalSelection) ? '' : tenantGlobalSelection;

      setSyncRunningByEndpoint((prev) => ({ ...prev, [endpointId]: true }));

      const qs = new URLSearchParams();
      if (tenantGlobalId) qs.set('tenantGlobal', tenantGlobalId);
      if (tenantCorporativoId) qs.set('tenantCorporativo', tenantCorporativoId);
      if (sincronizar) qs.set('sincronizar', 'true');

      const payload = await apiFetch(`/api/config/permisos/creacion/admin/tenant/global?${qs.toString()}`, {
        method: 'GET',
      });

      setSyncInfoByEndpoint((prev) => ({ ...prev, [endpointId]: payload }));
      if (tenantGlobalSelection) {
        await fetchHerenciasAsociadasByTenantGlobal(endpointId, tenantGlobalSelection);
      }
      if (sincronizar) {
        const syncResumen = (payload as any)?.sincronizacionResumen || {};
        const sincronizados = Number(syncResumen?.contextosSincronizados || 0);
        if (sincronizados > 0) toast.success(`Sincronizacion aplicada en ${sincronizados} contexto(s)`);
        else toast.success('Sincronizacion ejecutada (sin cambios pendientes)');

        // Para el endpoint actualizar: despuÃ©s del sync, re-ejecutar el PUT con todas las vistas de la herencia recargada
        if (PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpointId)) {
          const herenciaId = getFieldValue(endpointId, 'herenciaAsociada').trim();
          if (herenciaId) {
            const { vistasCatalogo, accionesCatalogo } = getPermisosCatalog(endpointId);
            const todasVistas = vistasCatalogo.map((v) => v.id);
            const todasAcciones = accionesCatalogo.map((a) => a.id);
            setCatalogSelectionFor(endpointId, { vistas: todasVistas, acciones: todasAcciones });
            const endpointSpec = ENDPOINTS.find((e) => e.id === endpointId);
            if (endpointSpec) {
              setTimeout(() => { void runEndpoint(endpointSpec); }, 300);
            }
          }
        }
      }
    } catch (error: any) {
      toast.error(String(error?.message || 'No se pudo ejecutar la sincronizacion'));
    } finally {
      setSyncRunningByEndpoint((prev) => ({ ...prev, [endpointId]: false }));
    }
  };
  const applyHerenciaAsociadaSelection = (
    endpointId: string,
    herenciaId: string,
    /** Mapa recién obtenido del GET (evita leer state obsoleto justo después de setHerenciaAsociadaDataByEndpoint). */
    byIdOverride?: Record<string, any>
  ) => {
    const byId = byIdOverride || herenciaAsociadaDataByEndpoint[endpointId] || {};
    const row = byId[herenciaId];
    if (!row) {
      setCatalogSelectionFor(endpointId, { vistas: [], acciones: [] });
      setPermisos(endpointId, [{ vistaId: '', accionId: [] }]);
      return;
    }

    const vistasIds = Array.isArray(row?.vistas)
      ? row.vistas.map((v: any) => String(v?._id || v || '').trim()).filter(Boolean)
      : [];
    const accionesIds = Array.isArray(row?.acciones)
      ? row.acciones.map((a: any) => String(a?._id || a || '').trim()).filter(Boolean)
      : [];

    setCatalogSelectionFor(endpointId, {
      vistas: vistasIds,
      acciones: accionesIds,
    });

    const permisos = vistasIds.map((vistaId: string) => ({
      vistaId,
      accionId: accionesIds,
    }));
    setPermisos(endpointId, permisos.length ? permisos : [{ vistaId: '', accionId: [] }]);
  };
  const fetchHerenciasAsociadasByTenantGlobal = async (
    endpointId: string,
    tenantGlobalId: string,
    ruleCatalogSnapshot?: Record<string, any> | null
  ): Promise<string> => {
    try {
      const catalogForRules = ruleCatalogSnapshot ?? ruleCatalog;
      const tgSelection = String(tenantGlobalId || '').trim();
      if (!tgSelection) {
        setHerenciaAsociadaOptionsByEndpoint((prev) => ({ ...prev, [endpointId]: [] }));
        setHerenciaAsociadaDataByEndpoint((prev) => ({ ...prev, [endpointId]: {} }));
        setFieldValue(endpointId, 'herenciaAsociada', '');
        return '';
      }
      const isTsaScope = isTenantSuperAdminScopeOption(tgSelection);
      const tg = isTsaScope ? '' : tgSelection;

      const qs = new URLSearchParams();
      if (tg) qs.set('tenantGlobal', tg);
      if (tg) qs.set('incluirSuperAdmin', 'false');
      qs.set('soloActivos', 'true');
      const res: any = await apiFetch(
        `/api/config/permisos/creacion/admin/tenant/global?${qs.toString()}`,
        { method: 'GET' }
      );
      let rows = pickArray(res, ['data', 'items', 'herencias']).filter((row: any) => {
        if (!tg) return true;
        const rowTg = getEntityId(row?.tenantGlobal);
        return rowTg === tg;
      });
      if (isTsaScope) {
        const saPicked = tgSelection.slice(TENANT_SUPERADMIN_SCOPE_PREFIX.length).trim();
        if (saPicked) {
          rows = rows.filter((row: any) => {
            const tsa = String(row?.tenantSuperTenant?._id || row?.tenantSuperTenant || '').trim();
            return tsa === saPicked;
          });
        }
      }
      const byId: Record<string, any> = {};
      const actorTgScope = String(tenantGlobalActor?.tenantGlobalId || '').trim();
      const esTgScope = !isTsaScope && !!actorTgScope;
      const { byId: vistaLocationMap, byPath: vistaByPath } = buildVistaLocationMap(rutasJerarquia);
      const options = rows
        .map((row: any) => {
          const id = getEntityId(row);
          if (!id) return null;
          byId[id] = row;
          const vCount = Array.isArray(row?.vistas) ? row.vistas.length : 0;
          const aCount = Array.isArray(row?.acciones) ? row.acciones.length : 0;
          // Omitir herencias sin vistas parametrizadas
          if (vCount === 0) return null;
          const tc = getEntityId(row?.tenantCorporativo);
          const tcLabel = getEntityLabel(row?.tenantCorporativo);
          const tgId = getEntityId(row?.tenantGlobal);
          const tgFromState = tenantGlobales.find((t) => String(t.id || '').trim() === tgId);
          const tgLabelBase = tgFromState
            ? String(tgFromState.label || '').trim().split('|')[0].trim()
            : getEntityLabel(row?.tenantGlobal);
          const tgDisplay = tgLabelBase || tgId.slice(-8) || id.slice(-8);
          const vistasDetalle: VistaItem[] = (Array.isArray(row?.vistas) ? row.vistas : [])
            .map((vista: any) => ({
              id: getEntityId(vista),
              label: String(vista?.name || vista?.path || getEntityId(vista)).trim(),
              path: String(vista?.path || '').trim(),
            }))
            .filter((vista: VistaItem) => vista.id);
          const { suiteGroups, sinSuite } = buildGroupedVistas(vistasDetalle, vistaLocationMap, vistaByPath);
          const suiteSummary = buildSuiteSummaryLabel(suiteGroups, sinSuite.length);
          const tcDisplay = tcLabel || (tc ? tc.slice(-6) : '');
          if (esTgScope) {
            return {
              id,
              label: `${tgDisplay}${tcDisplay ? ` | TC:${tcDisplay}` : ''} | Suites:${suiteSummary} | V:${vCount} A:${aCount}`,
              meta: {
                suiteSummary,
                tenantGlobalLabel: tgDisplay,
                tenantCorporativoLabel: tcDisplay,
              },
            };
          }
          const fuente = String(row?.fuenteHerencia || 'tenantGlobal').trim();
          if (endpointId === 'perm-admin-tenant-global-desactivar' && fuente !== 'tenantGlobal') return null;
          const rol = String(row?.rolId?.rol || row?.rolId?._id || row?.rolId || 'SIN_ROL').trim();
          const usuario = String(row?.usuarioId?.nombre || row?.usuarioId?.name || row?.usuarioId?._id || '-').trim();
          const fuenteTxt = fuente === 'tenantSuperAdmin' ? '[SUPERADMIN]' : fuente === 'regla' ? '[REGLA PARAM]' : '[TENANT]';
          return {
            id,
            label: `${fuenteTxt} ${tgDisplay}${tcDisplay ? ` | TC:${tcDisplay}` : ''} | Suites:${suiteSummary} | Rol:${rol} | V:${vCount} A:${aCount}`,
            meta: {
              suiteSummary,
              tenantGlobalLabel: tgDisplay,
              tenantCorporativoLabel: tcDisplay,
              fuenteHerencia: fuenteTxt,
              usuario,
            },
          };
        })
        .filter(Boolean) as GenericSelectOption[];

      const mergedOptions: GenericSelectOption[] = [...options];
      // Sin herencias Mongo con vistas para el tenant seleccionado: listar reglas del SuperAdmin de ESE tenant.
      // Incluye POST «Permisos heredados» (`perm-admin-tenant-global`): el segundo select lee el mismo estado que actualizar.
      const esHerenciaAdminGlobal =
        endpointId === 'perm-admin-tenant-global' || PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpointId);
      if (esHerenciaAdminGlobal && mergedOptions.length === 0) {
        const jwtSa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
        const effectiveSa = resolveTenantSuperAdminIdForHerenciaSelect(tgSelection, tenantGlobales, jwtSa);
        if (effectiveSa && Object.keys(catalogForRules || {}).length > 0) {
          let reglas = findReglasPorTenantSuperAdmin(catalogForRules, effectiveSa).sort((a: any, b: any) => {
            const pa = a?.securityPlatform === true ? 0 : a?.securityPlatform === false ? 1 : 2;
            const pb = b?.securityPlatform === true ? 0 : b?.securityPlatform === false ? 1 : 2;
            return pa - pb;
          });
          if (!reglas.length) {
            const plataforma = findReglaPlataformaPorSuperAdmin(catalogForRules, effectiveSa);
            if (plataforma) reglas = [plataforma];
          }
          const tgDisplay = (() => {
            if (isTsaScope) return `SA:${effectiveSa.slice(-8)}`;
            const tSel = tenantGlobales.find((t) => String(t.id) === tgSelection);
            if (tSel) return String(tSel.label || '').trim().split('|')[0].trim() || tgSelection.slice(-8);
            return effectiveSa.slice(-8);
          })();
          for (const regla of reglas) {
            const rid = String(regla?._id || '').trim();
            if (!rid) continue;
            const recursos = Array.isArray(regla?.recurso) ? regla.recurso : [];
            const accs = Array.isArray(regla?.accionesUsu) ? regla.accionesUsu : [];
            if (!recursos.length && !accs.length) continue;
            const syntheticId = `${REGLA_SA_SYNTH_PREFIX}${rid}`;
            const vistasDetalle: VistaItem[] = recursos
              .map((vista: any) => ({
                id: getEntityId(vista),
                label: String(vista?.name || vista?.path || getEntityId(vista)).trim(),
                path: String(vista?.path || '').trim(),
              }))
              .filter((vista: VistaItem) => vista.id);
            const vCount = vistasDetalle.length;
            const aCount = accs.length;
            const { suiteGroups, sinSuite } = buildGroupedVistas(vistasDetalle, vistaLocationMap, vistaByPath);
            const suiteSummary = buildSuiteSummaryLabel(suiteGroups, sinSuite.length);
            const ruleLabel = String(regla?.nombre || regla?.name || rid.slice(-8)).trim();
            byId[syntheticId] = {
              _id: syntheticId,
              fuenteHerencia: 'regla',
              vistas: recursos,
              acciones: accs,
            };
            mergedOptions.push({
              id: syntheticId,
              label: `[REGLA CAT] ${ruleLabel} | ${tgDisplay} | Suites:${suiteSummary} | V:${vCount} A:${aCount}`,
              meta: {
                suiteSummary,
                tenantGlobalLabel: tgDisplay,
                tenantCorporativoLabel: '',
                fuenteHerencia: '[REGLA CAT]',
                usuario: '',
              },
            });
          }
        }
      }

      const current = getFieldValue(endpointId, 'herenciaAsociada').trim();
      const nextId =
        !current || !mergedOptions.some((o) => o.id === current) ? mergedOptions[0]?.id || '' : current;

      const prevMapHerencia = herenciaAsociadaDataByEndpoint[endpointId] || {};
      const oldSnap = nextId ? snapshotHerenciaPermisos(prevMapHerencia[nextId]) : '';
      const newSnap = nextId ? snapshotHerenciaPermisos(byId[nextId]) : '';
      const permisosCambiaronEnServidor =
        Boolean(nextId && oldSnap && newSnap && oldSnap !== newSnap);

      setHerenciaAsociadaOptionsByEndpoint((prev) => ({ ...prev, [endpointId]: mergedOptions }));
      setHerenciaAsociadaDataByEndpoint((prev) => ({ ...prev, [endpointId]: byId }));

      setFieldValue(endpointId, 'herenciaAsociada', nextId);
      if (nextId) applyHerenciaAsociadaSelection(endpointId, nextId, byId);
      if (permisosCambiaronEnServidor) {
        toast.success('La herencia cambió en servidor; se aplicó la asignación nueva en vistas y acciones.');
      }
      return nextId;
    } catch (error: any) {
      const msg = String(error?.message || 'No se pudieron cargar herencias asociadas').trim();
      toast.error(msg);
      setHerenciaAsociadaOptionsByEndpoint((prev) => ({ ...prev, [endpointId]: [] }));
      setHerenciaAsociadaDataByEndpoint((prev) => ({ ...prev, [endpointId]: {} }));
      setFieldValue(endpointId, 'herenciaAsociada', '');
      return '';
    }
  };

  /** Lista reglas desde API, actualiza catálogo y vuelve a GET herencias para alinear vistas/acciones (sin marcar checks a mano). */
  const sincronizarCatalogoReglasYHerencia = async (endpointId: string) => {
    const tgSel = String(getFieldValue(endpointId, 'tenantGlobal') || '').trim();
    if (!tgSel) {
      toast.warning('Selecciona el tenant global (o alcance SuperAdmin) antes de sincronizar.');
      return;
    }
    const countAntes = Object.keys(ruleCatalog || {}).length;
    const digestAntes = ruleCatalogPermisosDigest;
    setReglasHerenciaSyncBusy(true);
    try {
      const res: any = await apiFetch('/api/config/tenant/listar/reglas', { method: 'GET' });
      const rows = pickArray(res, ['data', 'reglas', 'items']);
      const rulesMap: Record<string, any> = {};
      rows.forEach((r: any) => {
        const ridEncrypted = String(r?.['x-regla-id'] || r?.reglaIdEncrypted || r?.iud || '').trim();
        const ridRaw = String(r?.rid || r?._id || '').trim();
        const rid = ridEncrypted || ridRaw;
        if (rid) rulesMap[rid] = r;
        if (ridRaw && ridRaw !== rid) rulesMap[ridRaw] = r;
      });
      const digestDespues = computeRuleCatalogPermisosDigest(rulesMap);
      const countDespues = Object.keys(rulesMap).length;
      const catalogoCambio = digestAntes !== digestDespues;

      setRuleCatalog(rulesMap);
      const herenciaAplicada = await fetchHerenciasAsociadasByTenantGlobal(endpointId, tgSel, rulesMap);

      const lineas: string[] = [
        `Documentos en catálogo de reglas: ${countAntes} → ${countDespues}.`,
        catalogoCambio
          ? 'Hay cambios en el catálogo (reglas nuevas o permisos/recursos actualizados).'
          : 'La firma del catálogo coincide con la anterior (mismo contenido efectivo de permisos).',
        herenciaAplicada
          ? `Herencia aplicada al formulario (id): ${herenciaAplicada}`
          : 'No quedó herencia seleccionada (sin opciones o sin datos).',
        'Las listas Vistas / Acciones reflejan la herencia devuelta por el servidor.',
      ];
      setReglasHerenciaSyncReport({ lineas });
      toast.success('Catálogo de reglas y herencia actualizados.');
    } catch (e: any) {
      toast.error(String(e?.message || 'No se pudo listar reglas'));
    } finally {
      setReglasHerenciaSyncBusy(false);
    }
  };

  /** Tras «Recargar datos API»: volver a GET herencias para alinear checkboxes con el servidor. */
  useEffect(() => {
    const prev = hydrateLoadingPrevRef.current;
    hydrateLoadingPrevRef.current = loadingData;
    if (prev !== true || loadingData !== false) return;
    const epModal = endpointModal?.id;
    if (!epModal) return;
    const esModalHerenciasAdmin =
      epModal === 'perm-admin-tenant-global' ||
      PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(epModal) ||
      epModal === 'perm-admin-tenant-global-desactivar' ||
      epModal === 'perm-admin-tenant-global-eliminar';
    if (!esModalHerenciasAdmin) return;
    const tgSel = getFieldValue(epModal, 'tenantGlobal').trim();
    if (!tgSel) return;
    void fetchHerenciasAsociadasByTenantGlobal(epModal, tgSel);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo fin de hidratación
  }, [loadingData, endpointModal?.id]);

  /** Select compuesto tenantSuperAdmin vs tenant global (perm-admin-*): un solo campo `tenantGlobal` en el formulario. */
  const applyPermAdminTenantGlobalSelection = (endpointId: string, fieldName: string, nextValue: string) => {
    setFieldValue(endpointId, fieldName, nextValue);
    if (endpointId === 'perm-admin-tenant-global' || PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpointId)) {
      setPermisos(endpointId, [{ vistaId: '', accionId: [] }]);
      setCatalogSelectionFor(endpointId, { vistas: [], acciones: [] });
      setBulkAllFor(endpointId, false);
      setSyncInfoByEndpoint((prev) => ({ ...prev, [endpointId]: null }));
      if (PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpointId)) {
        setHerenciaAsociadaOptionsByEndpoint((prev) => ({ ...prev, [endpointId]: [] }));
        setHerenciaAsociadaDataByEndpoint((prev) => ({ ...prev, [endpointId]: {} }));
        setFieldValue(endpointId, 'herenciaAsociada', '');
        if (nextValue) void fetchHerenciasAsociadasByTenantGlobal(endpointId, nextValue);
      }
      if (endpointId === 'perm-admin-tenant-global') {
        setHerenciaAsociadaOptionsByEndpoint((prev) => ({ ...prev, [endpointId]: [] }));
        setHerenciaAsociadaDataByEndpoint((prev) => ({ ...prev, [endpointId]: {} }));
        setFieldValue(endpointId, 'herenciaAsociada', '');
        if (nextValue) void fetchHerenciasAsociadasByTenantGlobal(endpointId, nextValue);
      }
      setTenantCorpErrorByEndpoint((prev) => ({ ...prev, [endpointId]: '' }));
      if (endpointId === 'perm-admin-tenant-global' && nextValue) {
        setFieldValue(endpointId, 'tenantCorporativo', '');
        if (!isTenantSuperAdminScopeOption(nextValue)) {
          void fetchTenantCorporativosByGlobal(endpointId, nextValue);
        }
      }
    }
  };

  const fetchTenantGlobalesFromHerenciasJwt = async (): Promise<TenantGlobal[]> => {
    try {
      const res: any = await apiFetch('/api/config/permisos/creacion/admin/tenant/global?soloActivos=true', {
        method: 'GET',
      });
      const rows = pickArray(res, ['data', 'items', 'herencias']);
      const byId = new Map<string, TenantGlobal>();
      rows.forEach((row: any) => {
        const tgId = String(row?.tenantGlobal?._id || row?.tenantGlobal || '').trim();
        if (!tgId) return;
        if (byId.has(tgId)) return;
        const tgLabel = String(row?.tenantGlobal?.label || row?.tenantGlobal?.nombre || row?.tenantGlobal?.name || '').trim();
        byId.set(tgId, {
          id: tgId,
          label: tgLabel ? `${tgLabel} | ${tgId}` : tgId,
          corporativo: String(row?.tenantGlobal?.corporativo || '').trim(),
          tenantSuperAdmin: String(row?.tenantGlobal?.tenantSuperAdmin || '').trim() || undefined,
          tenantGlobalAdmin: String(row?.tenantGlobal?.tenantGlobalAdmin || '').trim() || undefined,
        });
      });
      return Array.from(byId.values());
    } catch {
      return [];
    }
  };
  const renderHerenciaAsociadaDetalle = (endpointId: string): React.ReactElement | null => {
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
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700">{titulo}</p>
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
        className={`flex items-start gap-2 rounded border px-2 py-1.5 text-xs ${puedeSeleccionarVista ? 'cursor-pointer' : ''} ${puedeSeleccionarVista && seleccionSet.has(vista.id) ? 'border-rose-300 bg-rose-100' : 'border-border/80 bg-muted/50'}`}
      >
        {puedeSeleccionarVista && (
          <input
            type="checkbox"
            className="mt-0.5 shrink-0 accent-rose-600"
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
      <div className="md:col-span-2 rounded-lg border border-rose-100 bg-rose-50/50 p-3">
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
        <div className="mb-3 grid gap-3 rounded-md border border-violet-200 bg-violet-50/50 p-3 text-xs md:grid-cols-2">
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
                    <p className="mb-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">Sin suite asignada</p>
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
                    className="text-xs text-rose-700 underline"
                    onClick={seleccionarTodasVistasDesactivar}
                  >
                    Seleccionar todas
                  </button>
                  <button type="button" className="text-xs text-muted-foreground underline" onClick={limpiarVistasDesactivar}>
                    Limpiar selección
                  </button>
                </div>
                {seleccionadas.length > 0 ? (
                  <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5">
                    <p className="text-xs font-medium text-amber-800">
                      {endpointId === 'perm-admin-tenant-global-eliminar'
                        ? `Se enviará PATCH para quitar ${seleccionadas.length} vista${seleccionadas.length === 1 ? '' : 's'} de la herencia (no borra el documento completo).`
                        : `Se enviará PATCH con vistaIds (${seleccionadas.length} vista${seleccionadas.length === 1 ? '' : 's'}).`}
                    </p>
                  </div>
                ) : endpointId === 'perm-admin-tenant-global-eliminar' ? (
                  <p className="text-xs font-medium text-rose-600">
                    Sin vistas marcadas: eliminación definitiva del registro (DELETE …/force).
                  </p>
                ) : (
                  <p className="text-xs font-medium text-rose-600">
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
  const getPermisosCatalog = (endpointId: string): { vistasCatalogo: Vista[]; accionesCatalogo: Accion[] } => {
    const resolveVistaCatalogByIds = (ids: string[]): Vista[] => {
      const vistaById = new Map(vistas.map((v) => [v.id, v]));
      const hierarchyById = new Map<string, Vista>();

      rutasJerarquia.forEach((suite) => {
        const suiteId = getEntityId(suite);
        if (suiteId && !hierarchyById.has(suiteId)) {
          hierarchyById.set(suiteId, {
            id: suiteId,
            label: String(suite?.name || suite?.path || suiteId),
            path: String((suite as any)?.path || ''),
          });
        }

        collectAllNodes(suite.children || []).forEach((node: any) => {
          const nodeId = getEntityId(node);
          if (!nodeId || hierarchyById.has(nodeId)) return;
          hierarchyById.set(nodeId, {
            id: nodeId,
            label: String(node?.name || node?.path || nodeId),
            path: String(node?.path || ''),
          });
        });
      });

      return ids
        .map((id) => vistaById.get(id) || hierarchyById.get(id) || { id, label: id, path: '' })
        .filter(Boolean) as Vista[];
    };

    if (endpointId === 'perm-usuario-tenant-global') {
      const selectedHeredaGlobal = getFieldValue(endpointId, 'heredaGlobal').trim();
      const getId = (value: any): string => String(value?._id || value || '').trim();
      const sourceIds = selectedHeredaGlobal
        ? [selectedHeredaGlobal]
        : actorEsTenantGlobalScope()
        ? getHerenciaGlobalOpcionesParaTG().map((opt) => String(opt.id || '').trim()).filter(Boolean)
        : getHeredaOptionsPermitidasPorTenantGlobal(getFieldValue(endpointId, 'tenantGlobalScope').trim())
            .map((opt) => String(opt.id || '').trim())
            .filter(Boolean);
      const vistasMap = new Map<string, Vista>();
      const accionesMap = new Map<string, Accion>();
      const accionById = new Map(acciones.map((a) => [a.id, a]));
      const addVista = (vista: Vista | null | undefined) => {
        if (vista?.id && !vistasMap.has(vista.id)) vistasMap.set(vista.id, vista);
      };
      const addAccion = (accion: Accion | null | undefined) => {
        if (accion?.id && !accionesMap.has(accion.id)) accionesMap.set(accion.id, accion);
      };
      if (!selectedHeredaGlobal && actorEsTenantGlobalScope()) {
        sourceIds.forEach((sourceId) => {
          const herencia = herenciasUsuario.find((h: any) =>
            String(h?.iud || h?._id || '').trim() === sourceId
          );
          if (!herencia) return;
          (Array.isArray(herencia?.vistas) ? herencia.vistas : []).forEach((v: any) => {
            const id = getId(v);
            if (!id) return;
            addVista({ id, label: String(v?.name || v?.path || id), path: String(v?.path || '') });
          });
          (Array.isArray(herencia?.acciones) ? herencia.acciones : []).forEach((a: any) => {
            const id = getId(a);
            if (!id) return;
            addAccion({ id, label: String(a?.etiquetas || a?.method || id), method: String(a?.method || '') });
          });
        });
        // Si hay vistas de herencias propias del TG, retornarlas; sino caer al last resort
        if (vistasMap.size > 0) {
          return { vistasCatalogo: Array.from(vistasMap.values()), accionesCatalogo: Array.from(accionesMap.values()) };
        }
      }
      if (!selectedHeredaGlobal && !actorEsTenantGlobalScope()) {
        sourceIds.forEach((sourceId) => {
          const herenciaDirectaSA = herenciasUsuario.find((h: any) =>
            String(h?.iud || h?._id || '').trim() === sourceId
          );
          const herenciaConDatos = herenciaDirectaSA || herenciasUsuario.find((h: any) => {
            const heredaId = String(h?.heredaGlobal?._id || h?.heredaGlobal || '').trim();
            return heredaId === sourceId && Array.isArray(h?.vistas) && h.vistas.length > 0;
          });
          if (herenciaConDatos) {
            (Array.isArray(herenciaConDatos?.vistas) ? herenciaConDatos.vistas : []).forEach((v: any) => {
              const id = getId(v);
              if (!id) return;
              addVista({ id, label: String(v?.name || v?.path || id), path: String(v?.path || '') });
            });
            (Array.isArray(herenciaConDatos?.acciones) ? herenciaConDatos.acciones : []).forEach((a: any) => {
              const id = getId(a);
              if (!id) return;
              addAccion({ id, label: String(a?.etiquetas || a?.method || id), method: String(a?.method || '') });
            });
            return;
          }
          const rule = ruleCatalog[sourceId];
          if (!rule) return;
          const recursoIds = (Array.isArray(rule?.recurso) ? rule.recurso : [])
            .map((v: any) => getId(v))
            .filter(Boolean);
          const accionIds = (Array.isArray(rule?.accionesUsu) ? rule.accionesUsu : [])
            .map((a: any) => getId(a))
            .filter(Boolean);
          resolveVistaCatalogByIds(recursoIds).forEach(addVista);
          accionIds
            .map((id: string) => accionById.get(id) || { id, label: id, method: '' })
            .forEach(addAccion);
        });
        if (vistasMap.size || accionesMap.size) {
          return { vistasCatalogo: Array.from(vistasMap.values()), accionesCatalogo: Array.from(accionesMap.values()) };
        }
      }

      // TG scope: la herencia seleccionada ES el _id del registro herenciaGlobal (no tiene campo heredaGlobal)
      if (actorEsTenantGlobalScope()) {
        const herencia = herenciasUsuario.find((h: any) =>
          String(h?.iud || h?._id || '').trim() === selectedHeredaGlobal
        );
        if (herencia) {
          const vistasCatalogo = (Array.isArray(herencia?.vistas) ? herencia.vistas : [])
            .map((v: any) => {
              const id = getId(v);
              if (!id) return null;
              return { id, label: String(v?.name || v?.path || id), path: String(v?.path || '') };
            })
            .filter(Boolean) as Vista[];
          const accionesCatalogo = (Array.isArray(herencia?.acciones) ? herencia.acciones : [])
            .map((a: any) => {
              const id = getId(a);
              if (!id) return null;
              return { id, label: String(a?.etiquetas || a?.method || id), method: String(a?.method || '') };
            })
            .filter(Boolean) as Accion[];
          if (vistasCatalogo.length && accionesCatalogo.length) {
            return { vistasCatalogo, accionesCatalogo };
          }
        }
        // Sin herencia con datos: caer al last resort para mostrar todas las rutasSeguridad
      }

      // SA scope: buscar primero por _id directo (herenciaGlobal directa del tenant)
      // y como fallback por campo h.heredaGlobal (referencia a regla - estilo antiguo)
      const herenciaDirectaSA = herenciasUsuario.find((h: any) =>
        String(h?.iud || h?._id || '').trim() === selectedHeredaGlobal
      );
      const herenciaConDatos = herenciaDirectaSA || herenciasUsuario.find((h: any) => {
        const heredaId = String(h?.heredaGlobal?._id || h?.heredaGlobal || '').trim();
        return heredaId === selectedHeredaGlobal && Array.isArray(h?.vistas) && h.vistas.length > 0;
      });

      if (herenciaConDatos) {
        // Para SA: el techo del catálogo es la REGLA padre (66 vistas), no la herencia (45).
        // La herencia es un subconjunto de la regla — mostrar todas las vistas de la regla
        // para que el SA pueda ampliar/modificar la asignación de la herencia.
        const ruleRef = String(herenciaConDatos?.heredaGlobal?._id || herenciaConDatos?.heredaGlobal || '').trim();
        const parentRule = ruleRef ? ruleCatalog[ruleRef] : null;

        if (parentRule) {
          const recursoIds = (Array.isArray(parentRule?.recurso) ? parentRule.recurso : [])
            .map((v: any) => getId(v))
            .filter(Boolean);
          const accionIds = (Array.isArray(parentRule?.accionesUsu) ? parentRule.accionesUsu : [])
            .map((a: any) => getId(a))
            .filter(Boolean);
          const accionByIdMap = new Map(acciones.map((a) => [a.id, a]));
          const vistasDesdeRegla = resolveVistaCatalogByIds(recursoIds);
          const accionesDesdeRegla = accionIds.length
            ? accionIds.map((id: string) => accionByIdMap.get(id) || { id, label: id, method: '' })
            : acciones;
          if (vistasDesdeRegla.length) {
            return { vistasCatalogo: vistasDesdeRegla, accionesCatalogo: accionesDesdeRegla };
          }
        }

        // Sin regla padre resolvible: usar vistas de la herencia directamente como catálogo
        const vistasCatalogo = (Array.isArray(herenciaConDatos?.vistas) ? herenciaConDatos.vistas : [])
          .map((v: any) => {
            const id = getId(v);
            if (!id) return null;
            return {
              id,
              label: String(v?.name || v?.path || id),
              path: String(v?.path || ''),
            };
          })
          .filter(Boolean) as Vista[];

        const accionesCatalogo = (Array.isArray(herenciaConDatos?.acciones) ? herenciaConDatos.acciones : [])
          .map((a: any) => {
            const id = getId(a);
            if (!id) return null;
            return {
              id,
              label: String(a?.etiquetas || a?.method || id),
              method: String(a?.method || ''),
            };
          })
          .filter(Boolean) as Accion[];

        if (vistasCatalogo.length && accionesCatalogo.length) {
          return { vistasCatalogo, accionesCatalogo };
        }
      }

      // Fallback: si la herencia no trae datos, usar recurso/acciones de la regla.
      const rule = ruleCatalog[selectedHeredaGlobal];
      if (rule) {
        const recursoIds = (Array.isArray(rule?.recurso) ? rule.recurso : [])
          .map((v: any) => getId(v))
          .filter(Boolean);
        const accionIds = (Array.isArray(rule?.accionesUsu) ? rule.accionesUsu : [])
          .map((a: any) => getId(a))
          .filter(Boolean);

        const accionById = new Map(acciones.map((a) => [a.id, a]));

        const vistasCatalogo = resolveVistaCatalogByIds(recursoIds);
        const accionesCatalogo = accionIds.length
          ? accionIds.map((id: string) => accionById.get(id) || { id, label: id, method: '' })
          : [];

        if (vistasCatalogo.length) {
          return { vistasCatalogo, accionesCatalogo };
        }

        // La regla tiene vistas pero todas estÃ¡n inactivas â†’ informar sin catÃ¡logo
        if (recursoIds.length > 0) {
          return { vistasCatalogo: [], accionesCatalogo: [] };
        }
      }

      // Last resort: solo para SA puro sin tenantGlobal ni tenantCorporativo en el JWT.
      // Si el JWT trae tenant, no se debe exponer el catalogo completo.
      const esSaPuro = actorEsTenantSuperAdmin()
        && !String(tenantGlobalActor?.tenantGlobalId || '').trim()
        && !String(tenantGlobalActor?.tenantCorporativoId || '').trim();
      if (esSaPuro) {
        // Derivar vistas desde rutasJerarquia (incluye rutas nuevas no enlazadas a contextos aun)
        const seenIds = new Set<string>();
        const allFromTree: Vista[] = [];
        const traverseTree = (nodes: NodoRuta[]) => {
          nodes.forEach((node) => {
            const id = String(node._id || '').trim();
            if (id && !seenIds.has(id)) {
              seenIds.add(id);
              allFromTree.push({ id, label: String(node.name || node.path || id), path: String(node.path || '') });
            }
            if (Array.isArray(node.children)) traverseTree(node.children);
          });
        };
        traverseTree(rutasJerarquia);
        const sourceVistas = allFromTree.length ? allFromTree : vistas;
        if (sourceVistas.length) return { vistasCatalogo: sourceVistas, accionesCatalogo: acciones };
      }

      return { vistasCatalogo: [], accionesCatalogo: [] };
    }

    /** Si hay fila de «Herencia asociada», el catálogo sale de esa herencia; si no, sigue el flujo (regla plataforma / herencias usuario). */
    if (endpointId === 'perm-admin-tenant-global') {
      const byId = herenciaAsociadaDataByEndpoint[endpointId] || {};
      const selectedHerenciaId = getFieldValue(endpointId, 'herenciaAsociada').trim();
      const row = byId[selectedHerenciaId] || (Object.keys(byId).length ? byId[Object.keys(byId)[0]] : null);

      if (row) {
        const vistasCatalogo = (Array.isArray(row?.vistas) ? row.vistas : [])
          .map((v: any) => {
            const id = String(v?._id || v || '').trim();
            if (!id) return null;
            return {
              id,
              label: String(v?.name || v?.path || id),
              path: String(v?.path || ''),
            };
          })
          .filter(Boolean) as Vista[];

        const accionesCatalogo = (Array.isArray(row?.acciones) ? row.acciones : [])
          .map((a: any) => {
            const id = String(a?._id || a || '').trim();
            if (!id) return null;
            return {
              id,
              label: String(a?.etiquetas || a?.method || id),
              method: String(a?.method || ''),
            };
          })
          .filter(Boolean) as Accion[];

        return { vistasCatalogo, accionesCatalogo };
      }
    }

    // Actualizar herencia admin/global: priorizar catalogo de la herencia seleccionada
    // (contexto resuelto desde JWT + tenant + herencia asociada).
    if (PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpointId)) {
      const selectedHerenciaId = getFieldValue(endpointId, 'herenciaAsociada').trim();
      if (!selectedHerenciaId) {
        return { vistasCatalogo: [], accionesCatalogo: [] };
      }
      const byId = herenciaAsociadaDataByEndpoint[endpointId] || {};
      const row = byId[selectedHerenciaId];
      if (row) {
        const vistasCatalogo = (Array.isArray(row?.vistas) ? row.vistas : [])
          .map((v: any) => {
            const id = String(v?._id || v || '').trim();
            if (!id) return null;
            return {
              id,
              label: String(v?.name || v?.path || id),
              path: String(v?.path || ''),
            };
          })
          .filter(Boolean) as Vista[];

        const accionesCatalogo = (Array.isArray(row?.acciones) ? row.acciones : [])
          .map((a: any) => {
            const id = String(a?._id || a || '').trim();
            if (!id) return null;
            return {
              id,
              label: String(a?.etiquetas || a?.method || id),
              method: String(a?.method || ''),
            };
          })
          .filter(Boolean) as Accion[];

        return { vistasCatalogo, accionesCatalogo };
      }
    }

    if (endpointId === 'tenant-actualizar-global-reglas') {
      const ruleId = getFieldValue(endpointId, 'x-regla-id').trim();
      const rule = ruleId ? ruleCatalog[ruleId] : null;
      const recursoIdsRule =
        rule && Array.isArray(rule.recurso)
          ? rule.recurso.map((v: any) => String(v?._id || v || '').trim()).filter(Boolean)
          : [];
      const accionByIdMap = new Map(acciones.map((a) => [a.id, a]));
      const accionIdsRule =
        rule && Array.isArray(rule.accionesUsu)
          ? rule.accionesUsu.map((a: any) => String(a?._id || a || '').trim()).filter(Boolean)
          : [];
      const vistasDesdeReglaDoc = recursoIdsRule.length ? resolveVistaCatalogByIds(recursoIdsRule) : [];
      const accionesDesdeReglaDoc = accionIdsRule.length
        ? accionIdsRule.map((id: string) => accionByIdMap.get(id) || { id, label: id, method: '' })
        : [];

      const delta = deltaByEndpoint[endpointId];
      if (delta) {
        const vistasDelta: Vista[] = (Array.isArray(delta.vistasFaltantes) ? delta.vistasFaltantes : [])
          .map((v: any) => ({
            id: String(v?._id || v || ''),
            label: String(v?.name || v?.path || v?._id || v || ''),
            path: String(v?.path || ''),
          }));
        const accionesDelta: Accion[] = (Array.isArray(delta.accionesFaltantes) ? delta.accionesFaltantes : [])
          .map((a: any) => ({
            id: String(a?._id || a || ''),
            label: String(a?.etiquetas || a?.method || a?._id || a || ''),
            method: String(a?.method || ''),
          }));
        const vistaMer = new Map<string, Vista>();
        vistasDesdeReglaDoc.forEach((v) => vistaMer.set(v.id, v));
        vistasDelta.forEach((v) => {
          if (v.id && !vistaMer.has(v.id)) vistaMer.set(v.id, v);
        });
        const accMer = new Map<string, Accion>();
        accionesDesdeReglaDoc.forEach((a) => accMer.set(a.id, a));
        accionesDelta.forEach((a) => {
          if (a.id && !accMer.has(a.id)) accMer.set(a.id, a);
        });
        const vistasMerged = Array.from(vistaMer.values());
        const accionesMerged = Array.from(accMer.values());
        return {
          vistasCatalogo: vistasMerged,
          accionesCatalogo: accionesMerged.length ? accionesMerged : acciones,
        };
      }

      if (loadingDeltaByEndpoint[endpointId] && ruleId) {
        if (vistasDesdeReglaDoc.length) {
          return {
            vistasCatalogo: vistasDesdeReglaDoc,
            accionesCatalogo: accionesDesdeReglaDoc.length ? accionesDesdeReglaDoc : acciones,
          };
        }
        return { vistasCatalogo: [], accionesCatalogo: acciones };
      }

      if (rule && vistasDesdeReglaDoc.length) {
        return {
          vistasCatalogo: vistasDesdeReglaDoc,
          accionesCatalogo: accionesDesdeReglaDoc.length ? accionesDesdeReglaDoc : acciones,
        };
      }
    }

    if (endpointId === 'tenant-crear-global-reglas' || endpointId === 'tenant-actualizar-global-reglas') {
      // Derivar vistas desde rutasJerarquia para incluir rutas nuevas no sincronizadas aún en `vistas`
      const seenTreeIds = new Set<string>();
      const allVistasFromTree: Vista[] = [];
      const traverseForReglas = (nodes: NodoRuta[]) => {
        nodes.forEach((node) => {
          const id = String(node._id || '').trim();
          if (id && !seenTreeIds.has(id)) {
            seenTreeIds.add(id);
            allVistasFromTree.push({ id, label: String(node.name || node.path || id), path: String(node.path || '') });
          }
          if (Array.isArray(node.children)) traverseForReglas(node.children);
        });
      };
      traverseForReglas(rutasJerarquia);
      const vistasFallback = allVistasFromTree.length ? allVistasFromTree : vistas;

      let tenantGlobalRaw = getFieldValue(endpointId, 'tenantGlobal').trim();
      if (endpointId === 'tenant-actualizar-global-reglas' && !tenantGlobalRaw) {
        tenantGlobalRaw = String(tenantFilterByEndpoint[endpointId] || '').trim();
      }
      if (!tenantGlobalRaw) return { vistasCatalogo: vistasFallback, accionesCatalogo: acciones };

      let superAdminRef = '';
      if (isTenantSuperAdminScopeOption(tenantGlobalRaw)) {
        superAdminRef = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
      } else {
        const tenantSel = tenantGlobales.find((t) => t.id === tenantGlobalRaw);
        superAdminRef = String(tenantSel?.tenantSuperAdmin || '').trim();
        if (!superAdminRef) {
          const parentTenantId = String(tenantSel?.tenantGlobalAdmin || '').trim();
          if (parentTenantId) {
            const tenantPadre = tenantGlobales.find((t) => t.id === parentTenantId);
            superAdminRef = String(tenantPadre?.tenantSuperAdmin || '').trim();
          }
        }
      }
      if (!superAdminRef) return { vistasCatalogo: vistasFallback, accionesCatalogo: acciones };

      const reglaDios = findReglaPlataformaPorSuperAdmin(ruleCatalog, superAdminRef) as any;

      if (!reglaDios) return { vistasCatalogo: vistasFallback, accionesCatalogo: acciones };

      const recursoIds = Array.isArray(reglaDios?.recurso)
        ? reglaDios.recurso.map((v: any) => String(v?._id || v || '').trim()).filter(Boolean)
        : [];
      const accionIds = Array.isArray(reglaDios?.accionesUsu)
        ? reglaDios.accionesUsu.map((a: any) => String(a?._id || a || '').trim()).filter(Boolean)
        : [];

      if (!recursoIds.length) return { vistasCatalogo: vistasFallback, accionesCatalogo: acciones };

      const accionById = new Map(acciones.map((a) => [a.id, a]));

      const vistasDesdeRegla = resolveVistaCatalogByIds(recursoIds);
      const accionesDesdeRegla = accionIds.length
        ? accionIds.map((id: string) => accionById.get(id) || { id, label: id, method: '' })
        : acciones;

      return { vistasCatalogo: vistasDesdeRegla, accionesCatalogo: accionesDesdeRegla };
    }

    if (endpointId !== 'perm-admin-tenant-global' && !PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpointId)) {
      return { vistasCatalogo: vistas, accionesCatalogo: acciones };
    }

    const tenantGlobalRaw = getFieldValue(endpointId, 'tenantGlobal').trim();
    if (!tenantGlobalRaw) return { vistasCatalogo: vistas, accionesCatalogo: acciones };

    const vistaPermitida = new Set<string>();
    const accionPermitida = new Set<string>();
    const actorTenantGlobal = String(tenantGlobalActor.tenantGlobalId || '').trim();
    const actorTenantSuper = String(tenantGlobalActor.tenantSuperAdminId || '').trim();
    let effectiveSuperAdmin = actorTenantSuper;
    if (isTenantSuperAdminScopeOption(tenantGlobalRaw)) {
      const sid = tenantGlobalRaw.slice(TENANT_SUPERADMIN_SCOPE_PREFIX.length).trim();
      if (sid) effectiveSuperAdmin = sid;
    }

    const getId = (value: any): string => String(value?._id || value || '').trim();
    const matchesSuperAdminContext = (h: any): boolean => {
      if (!effectiveSuperAdmin) return false;
      const tenantSuperH = String(h?.tenantSuperTenant?._id || h?.tenantSuperTenant || '').trim();
      return tenantSuperH === effectiveSuperAdmin;
    };
    const matchesGlobalContext = (h: any): boolean => {
      if (!actorTenantGlobal) return false;
      const tgH = getId(h?.tenantGlobal);
      return tgH === actorTenantGlobal;
    };
    const matchesTargetTenant = (h: any): boolean => {
      const tgH = getId(h?.tenantGlobal);
      return tgH === tenantGlobalRaw;
    };

    herenciasUsuario.forEach((h: any) => {
      // SUPERADMIN: acepta herencias del superadmin, priorizando las que apunten al tenantGlobal objetivo.
      // TENANTGLOBAL: solo herencias del tenantGlobal autenticado y del tenant objetivo.
      const inSuperCtx = matchesSuperAdminContext(h);
      const inGlobalCtx = matchesGlobalContext(h);
      const inTarget = matchesTargetTenant(h);
      if (!((inSuperCtx && (inTarget || !getId(h?.tenantGlobal))) || (inGlobalCtx && inTarget))) return;

      const vs = Array.isArray(h?.vistas) ? h.vistas : [];
      const ac = Array.isArray(h?.acciones) ? h.acciones : [];
      vs.forEach((v: any) => {
        const id = getId(v);
        if (id) vistaPermitida.add(id);
      });
      ac.forEach((a: any) => {
        const id = getId(a);
        if (id) accionPermitida.add(id);
      });
    });

    // Sin herencia de usuario parametrizada: mismo criterio que reglas globales — regla de plataforma del SA (efectivo).
    if (!vistaPermitida.size || !accionPermitida.size) {
      if (endpointId === 'perm-admin-tenant-global') {
        const superAdminRefForRegla = (() => {
          if (isTenantSuperAdminScopeOption(tenantGlobalRaw)) return effectiveSuperAdmin;
          const tenantSel = tenantGlobales.find((t) => String(t.id) === tenantGlobalRaw);
          let sa = String(tenantSel?.tenantSuperAdmin || '').trim();
          if (!sa && tenantSel) {
            const parentId = String(tenantSel?.tenantGlobalAdmin || '').trim();
            if (parentId) {
              const padre = tenantGlobales.find((t) => t.id === parentId);
              sa = String(padre?.tenantSuperAdmin || '').trim();
            }
          }
          return sa || effectiveSuperAdmin;
        })();

        if (superAdminRefForRegla) {
          const seenTreeIds = new Set<string>();
          const allVistasFromTree: Vista[] = [];
          const traversePermAdminFallback = (nodes: NodoRuta[]) => {
            nodes.forEach((node) => {
              const id = String(node._id || '').trim();
              if (id && !seenTreeIds.has(id)) {
                seenTreeIds.add(id);
                allVistasFromTree.push({ id, label: String(node.name || node.path || id), path: String(node.path || '') });
              }
              if (Array.isArray(node.children)) traversePermAdminFallback(node.children);
            });
          };
          traversePermAdminFallback(rutasJerarquia);
          const vistasFallback = allVistasFromTree.length ? allVistasFromTree : vistas;

          const reglaDios = findReglaPlataformaPorSuperAdmin(ruleCatalog, superAdminRefForRegla) as any;
          if (reglaDios) {
            const recursoIds = Array.isArray(reglaDios?.recurso)
              ? reglaDios.recurso.map((v: any) => String(v?._id || v || '').trim()).filter(Boolean)
              : [];
            const accionIds = Array.isArray(reglaDios?.accionesUsu)
              ? reglaDios.accionesUsu.map((a: any) => String(a?._id || a || '').trim()).filter(Boolean)
              : [];
            if (recursoIds.length) {
              const accionById = new Map(acciones.map((a) => [a.id, a]));
              const vistasDesdeRegla = resolveVistaCatalogByIds(recursoIds);
              const accionesDesdeRegla = accionIds.length
                ? accionIds.map((id: string) => accionById.get(id) || { id, label: id, method: '' })
                : acciones;
              return { vistasCatalogo: vistasDesdeRegla, accionesCatalogo: accionesDesdeRegla };
            }
          }
          return { vistasCatalogo: vistasFallback, accionesCatalogo: acciones };
        }
      }
      return { vistasCatalogo: [], accionesCatalogo: [] };
    }

    return {
      vistasCatalogo: vistas.filter((v) => vistaPermitida.has(v.id)),
      accionesCatalogo: acciones.filter((a) => accionPermitida.has(a.id)),
    };
  };

  const getPermisos = (endpointId: string): PermisoItem[] => permisoData[endpointId] || [{ vistaId: '', accionId: [] }];
  const setPermisos = (endpointId: string, value: PermisoItem[]) => setPermisoData((prev) => ({ ...prev, [endpointId]: value }));
  const fetchTenantCorporativosByGlobal = async (endpointId: string, tenantGlobalId: string) => {
    const tg = tenantGlobalId.trim();
    if (!tg) return;
    try {
      setTenantCorpLoadingByEndpoint((prev) => ({ ...prev, [endpointId]: true }));
      setTenantCorpErrorByEndpoint((prev) => ({ ...prev, [endpointId]: '' }));
      const response = await apiFetch(`/api/config/permisos/creacion/admin/tenant/corporativos?tenantGlobal=${encodeURIComponent(tg)}`, {
        method: 'GET'
      });
      const rows = pickArray(response, ['data', 'items']);
      const mapped = rows
        .map((row: any) => {
          const id = String(row?.id || row?._id || row?.iud || '').trim();
          const tenantGlobalRow = String(
            row?.tenantGlobalId ||
            row?.tenantGlobal?._id ||
            row?.tenantGlobal ||
            tg
          ).trim();
          if (!id || !tenantGlobalRow) return null;
          const label = String(row?.label || row?.name || row?.nombre || id).trim();
          return { id, tenantGlobalId: tenantGlobalRow, label: `${label} | ${id}` };
        })
        .filter(Boolean) as TenantCorporativoOption[];

      setTenantCorporativos((prev) => {
        const keep = prev.filter((x) => x.tenantGlobalId !== tg);
        const unique = new Map<string, TenantCorporativoOption>();
        [...keep, ...mapped].forEach((item) => unique.set(`${item.tenantGlobalId}:${item.id}`, item));
        return Array.from(unique.values());
      });
    } catch (error: any) {
      const message = String(error?.message || 'No se pudo cargar tenant corporativo').trim();
      setTenantCorpErrorByEndpoint((prev) => ({ ...prev, [endpointId]: message }));
      toast.error(message);
    } finally {
      setTenantCorpLoadingByEndpoint((prev) => ({ ...prev, [endpointId]: false }));
    }
  };
  const getAccionesPorVistaDesdeRegla = (endpointId: string): Map<string, string[]> => {
    const ruleId = getFieldValue(endpointId, 'x-regla-id').trim();
    const rule = ruleCatalog[ruleId];
    const map = new Map<string, string[]>();
    if (!rule) return map;

    const global = (Array.isArray(rule?.accionesUsu) ? rule.accionesUsu : [])
      .map((a: any) => String(a?._id || a || '').trim())
      .filter(Boolean);

    const permisosDetalle = Array.isArray((rule as any)?.permisos) ? (rule as any).permisos : [];
    permisosDetalle.forEach((p: any) => {
      const vistaId = String(p?.vistaId?._id || p?.vistaId || '').trim();
      const accionIds = (Array.isArray(p?.accionId) ? p.accionId : [])
        .map((a: any) => String(a?._id || a || '').trim())
        .filter(Boolean);
      if (vistaId) map.set(vistaId, accionIds.length ? accionIds : global);
    });

    if (!permisosDetalle.length) {
      const recursos = Array.isArray(rule?.recurso) ? rule.recurso : [];
      recursos.forEach((r: any) => {
        const vistaId = String(r?._id || r || '').trim();
        if (vistaId) map.set(vistaId, global);
      });
    }

    return map;
  };

  const loadDeltaForRule = async (endpointId: string, ruleId: string) => {
    setLoadingDeltaByEndpoint((prev) => ({ ...prev, [endpointId]: true }));
    try {
      const res = await apiFetch('/api/config/tenant/reglas/globales/delta', {
        method: 'GET',
        headers: { 'x-regla-id': ruleId },
      });
      if (res?.ok && res?.data) {
        setDeltaByEndpoint((prev) => ({ ...prev, [endpointId]: res.data }));
        // Auto-resolver contexto desde el servidor
        const ctxArr = Array.isArray(res.data.contextoResuelto) ? res.data.contextoResuelto : [];
        const ctxId = String(ctxArr[0]?._id || ctxArr[0] || '').trim();
        if (ctxId) setFieldValue(endpointId, 'contextoDefi', ctxId);
        // Limpiar permisos previos: las vistas del catalogo ahora son solo las faltantes
        setPermisos(endpointId, []);
      }
    } catch {
      // Si falla, el catalogo de vistas cae al fallback de 68
    } finally {
      setLoadingDeltaByEndpoint((prev) => ({ ...prev, [endpointId]: false }));
    }
  };

  const applyRuleToForm = (endpointId: string, ruleId: string) => {
    const rule = ruleCatalog[ruleId];
    if (!rule) return;

    // Para el flujo de actualizar: contexto inmediato desde el catálogo local +
    // dispara carga del delta (vistas faltantes) desde el servidor.
    if (endpointId === 'tenant-actualizar-global-reglas') {
      const ctxArr = Array.isArray(rule?.contextoDefi) ? rule.contextoDefi : [];
      const ctxId = String(ctxArr[0]?._id || ctxArr[0] || '').trim();
      if (ctxId) setFieldValue(endpointId, 'contextoDefi', ctxId);
      setCatalogSelectionFor(endpointId, buildCatalogSelectionFromReglaGlobal(rule));
      // Limpiar delta previo para que el catalogo vuelva al fallback mientras carga
      setDeltaByEndpoint((prev) => { const next = { ...prev }; delete next[endpointId]; return next; });
      loadDeltaForRule(endpointId, ruleId);
      return;
    }

    const ctxArr = Array.isArray(rule?.contextoDefi) ? rule.contextoDefi : [];
    const ctxId = String(ctxArr[0]?._id || ctxArr[0] || '').trim();
    if (ctxId) setFieldValue(endpointId, 'contextoDefi', ctxId);

    const recursos = Array.isArray(rule?.recurso) ? rule.recurso : [];
    const accionesIdsGlobal = (Array.isArray(rule?.accionesUsu) ? rule.accionesUsu : [])
      .map((a: any) => String(a?._id || a || '').trim())
      .filter(Boolean);

    const accionesPorVista = new Map<string, string[]>();
    const permisosDetalle = Array.isArray((rule as any)?.permisos) ? (rule as any).permisos : [];
    permisosDetalle.forEach((p: any) => {
      const vistaId = String(p?.vistaId?._id || p?.vistaId || '').trim();
      const accionIds = (Array.isArray(p?.accionId) ? p.accionId : [])
        .map((a: any) => String(a?._id || a || '').trim())
        .filter(Boolean);
      if (vistaId && accionIds.length) accionesPorVista.set(vistaId, accionIds);
    });

    const nextPermisos: PermisoItem[] = recursos
      .map((recurso: any) => {
        const vistaId = String(recurso?._id || recurso || '').trim();
        if (!vistaId) return null;
        const accionesVista = accionesPorVista.get(vistaId) || accionesIdsGlobal;
        return {
          vistaId,
          accionId: accionesVista
        };
      })
      .filter(Boolean) as PermisoItem[];

    if (nextPermisos.length) {
      setPermisos(endpointId, nextPermisos);
    }
  };

  useEffect(() => {
    if (!endpointModal || endpointModal.id !== 'tenant-actualizar-global-reglas') return;
    const current = getFieldValue(endpointModal.id, 'x-regla-id');
    const filtradas = getReglasFiltradasPorTenant('tenant-actualizar-global-reglas');
    if (!current && filtradas.length > 0) {
      const firstId = filtradas[0].id;
      setFieldValue(endpointModal.id, 'x-regla-id', firstId);
      applyRuleToForm(endpointModal.id, firstId);
    }
  }, [endpointModal, reglas.length, tenantFilterByEndpoint, contextos.length, ruleCatalog]);

  useEffect(() => {
    if (!endpointModal) return;
    const ep = endpointModal.id;
    if (ep !== 'tenant-crear-dios-reglas' && ep !== 'tenant-actualizar-dios-reglas') return;
    const jwtSa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
    if (jwtSa && !getFieldValue(ep, 'tenantSuperAdmin').trim()) {
      setFieldValue(ep, 'tenantSuperAdmin', jwtSa);
    }
  }, [endpointModal?.id, tenantGlobalActor?.tenantSuperAdminId]);

  useEffect(() => {
    if (!acciones.length) return;
    setDiosReglaAccionesSeleccion((prev) => {
      const k = 'tenant-crear-dios-reglas';
      if (prev[k]?.length) return prev;
      return { ...prev, [k]: acciones.map((a) => a.id) };
    });
  }, [acciones]);

  useEffect(() => {
    const fromVistas = vistas.map((v) => String(v.id || '').trim()).filter(Boolean);
    const fromTree =
      !fromVistas.length && rutasJerarquia.length
        ? collectAllNodes(rutasJerarquia)
            .map((n: any) => String(n?._id || '').trim())
            .filter(Boolean)
        : [];
    const seed = fromVistas.length ? fromVistas : fromTree;
    if (!seed.length) return;
    setDiosReglaRecursosSeleccion((prev) => {
      const k = 'tenant-crear-dios-reglas';
      if (prev[k]?.length) return prev;
      return { ...prev, [k]: seed };
    });
  }, [vistas, rutasJerarquia]);

  useEffect(() => {
    if (!endpointModal) return;
    const needsTenantGlobal =
      endpointModal.fields.some((f) => f.name === 'tenantGlobal' || f.name === 'tenantGlobalId');
    const needsTenantGlobalSelects =
      endpointModal.id === 'tenant-crear-global-usuario' ||
      endpointModal.id === 'tenant-crear-global-admin' ||
      endpointModal.id === 'tenant-actualizar-global';
    if (needsTenantGlobalSelects && !loadingData) {
      const needsBootstrap =
        !tenantGlobalSelectsLoaded ||
        (endpointModal.id === 'tenant-actualizar-global' && tenantUpdateTargets.length === 0);
      if (needsBootstrap) {
        hydrateData();
      }
      return;
    }
    const reglasEndpointsConTenantGlobal = new Set([
      'tenant-crear-global-reglas',
      'tenant-actualizar-global-reglas',
      'tenant-desactivar-global-reglas',
      'tenant-eliminar-global-reglas',
    ]);
    if (reglasEndpointsConTenantGlobal.has(endpointModal.id) && !loadingData && tenantGlobales.length === 0) {
      hydrateData();
      return;
    }
    if (!needsTenantGlobal) return;
  }, [endpointModal, tenantGlobales.length, loadingData, tenantGlobalSelectsLoaded, tenantUpdateTargets.length]);

  useEffect(() => {
    if (!endpointModal) return;
    const modalPrecargaTenantGlobalHerencia =
      endpointModal.id === 'perm-admin-tenant-global' ||
      PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpointModal.id) ||
      endpointModal.id === 'perm-admin-tenant-global-desactivar' ||
      endpointModal.id === 'perm-admin-tenant-global-eliminar' ||
      endpointModal.id === 'perm-listar-herencias' ||
      endpointModal.id === 'perm-usuario-tenant-global';
    if (!modalPrecargaTenantGlobalHerencia) return;
    if (loadingData) return;
    if (tenantGlobales.length > 0) return;

    let cancelled = false;
    (async () => {
      const fallback = await fetchTenantGlobalesFromHerenciasJwt();
      if (cancelled || !fallback.length) return;
      setTenantGlobales((prev) => {
        if (prev.length) return prev;
        return fallback;
      });
      if (PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpointModal.id) && fallback.length === 1) {
        const onlyId = String(fallback[0]?.id || '').trim();
        if (onlyId) {
          setFieldValue(endpointModal.id, 'tenantGlobal', onlyId);
          fetchHerenciasAsociadasByTenantGlobal(endpointModal.id, onlyId);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [endpointModal, loadingData, tenantGlobales.length]);

  useEffect(() => {
    if (!endpointModal) return;
    const endpointId = endpointModal.id;
    const precargaTenantGlobalHerencia =
      endpointId === 'perm-admin-tenant-global' ||
      PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpointId) ||
      endpointId === 'perm-admin-tenant-global-desactivar' ||
      endpointId === 'perm-admin-tenant-global-eliminar' ||
      endpointId === 'perm-listar-herencias' ||
      endpointId === 'perm-usuario-tenant-global';
    if (!precargaTenantGlobalHerencia || loadingData) return;

    const currentTenantGlobal = getFieldValue(endpointId, 'tenantGlobal').trim();
    // Si ya hay TG en el formulario (persistido al reabrir el modal), igual hay que cargar herencias.
    // Antes se hacía `return` aquí y el combo «Herencia asociada» quedaba vacío sin llamar al GET.
    if (currentTenantGlobal) {
      void fetchHerenciasAsociadasByTenantGlobal(endpointId, currentTenantGlobal);
      return;
    }

    const options = getTenantGlobalOptions(endpointId);
    const firstTenantGlobalId = String(options?.[0]?.id || '').trim();
    if (!firstTenantGlobalId) return;

    setFieldValue(endpointId, 'tenantGlobal', firstTenantGlobalId);
    fetchHerenciasAsociadasByTenantGlobal(endpointId, firstTenantGlobalId);
  }, [
    endpointModal,
    loadingData,
    tenantGlobales.length,
    herenciasUsuario.length,
    tenantGlobalActor?.tenantSuperAdminId,
    tenantGlobalActor?.tenantGlobalId,
    tenantGlobalActor?.tenantCorporativoId,
    tenantGlobalActor?.saJerarquiaTieneCorporativoEnCounters,
  ]);

  /** Catálogo de reglas ([REGLA CAT]): cualquier cambio en recurso/acciones de una regla vuelve a armar opciones y checkboxes. */
  useEffect(() => {
    if (loadingData) return;
    const epModal = endpointModal?.id;
    if (!epModal || (epModal !== 'perm-admin-tenant-global' && !PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(epModal))) return;
    const tgSel = getFieldValue(epModal, 'tenantGlobal').trim();
    if (!tgSel) return;
    void fetchHerenciasAsociadasByTenantGlobal(epModal, tgSel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleCatalogPermisosDigest, loadingData, endpointModal?.id]);

  /** Volver a la pestaña: sincronizar herencia/vistas con servidor sin interacción manual. */
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (loadingData) return;
      const epModal = endpointModal?.id;
      if (!epModal) return;
      const modalHerencia =
        epModal === 'perm-admin-tenant-global' ||
        PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(epModal) ||
        epModal === 'perm-admin-tenant-global-desactivar' ||
        epModal === 'perm-admin-tenant-global-eliminar';
      if (!modalHerencia) return;
      const tgSel = String(formDataRef.current[epModal]?.tenantGlobal || '').trim();
      if (!tgSel) return;
      void fetchHerenciasAsociadasByTenantGlobal(epModal, tgSel);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingData, endpointModal?.id]);

  /** Modo lectura / supervisión: mismo modal abierto → polling ligero para reflejar cambios de regla o herencia en vistas. */
  useEffect(() => {
    const epModal = endpointModal?.id;
    if (!epModal || !PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(epModal)) return;
    const tick = () => {
      if (document.visibilityState !== 'visible' || loadingData) return;
      const tgSel = String(formDataRef.current[epModal]?.tenantGlobal || '').trim();
      if (!tgSel) return;
      void fetchHerenciasAsociadasByTenantGlobal(epModal, tgSel);
    };
    const id = window.setInterval(tick, POLL_HERENCIA_ADMIN_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpointModal?.id, loadingData]);

  // TG: cargar corporativos y auto-poblar campos al abrir el modal
  useEffect(() => {
    const endpointId = 'perm-usuario-tenant-global';
    if (!endpointModal || endpointModal.id !== endpointId) return;
    if (!actorEsTenantGlobalScope()) return;

    const tgId = String(tenantGlobalActor?.tenantGlobalId || '').trim();
    if (!tgId) return;

    // Cargar corporativos del TG si no estÃ¡n aÃºn
    const corpDelTG = getCorporativosDelTG();
    if (!corpDelTG.length) {
      fetchTenantCorporativosByGlobal(endpointId, tgId);
    }

    const herenciasTG = getHerenciaGlobalOpcionesParaTG();
    const currentHereda = getFieldValue(endpointId, 'heredaGlobal').trim();
    if (currentHereda && !herenciasTG.some((h) => h.id === currentHereda)) {
      setFieldValue(endpointId, 'heredaGlobal', '');
    }

  }, [
    endpointModal,
    tenantGlobalActor?.tenantGlobalId,
    herenciasUsuario.length,
    tenantCorporativos.length,
  ]);

  useEffect(() => {
    if (!endpointModal) return;
    const modalId = endpointModal.id;
    if (modalId !== 'tenant-crear-global-reglas' && modalId !== 'tenant-actualizar-global-reglas') return;
    const tgSel = String((formData[modalId] || {}).tenantGlobal ?? '').trim();
    if (!tgSel || isTenantSuperAdminScopeOption(tgSel)) return;
    aplicarUsuariosDesdeJerarquiaRef(modalId, tgSel);
    void cargarUsuariosParaEndpoint(modalId, tgSel);
  }, [
    endpointModal?.id,
    formData['tenant-crear-global-reglas']?.tenantGlobal,
    formData['tenant-actualizar-global-reglas']?.tenantGlobal,
  ]);

  useEffect(() => {
    const endpointId = 'perm-usuario-tenant-global';
    const currentHereda = getFieldValue(endpointId, 'heredaGlobal').trim();
    const currentTsa = getFieldValue(endpointId, 'tenantSuperAdminScope').trim();
    const currentRegla = getFieldValue(endpointId, 'reglaGlobalFallback').trim();

    if (actorEsTenantGlobalScope()) {
      const tgId = String(tenantGlobalActor?.tenantGlobalId || '').trim();
      const currentTg = getFieldValue(endpointId, 'tenantGlobalScope').trim();
      if (tgId && currentTg !== tgId) {
        setFieldValue(endpointId, 'tenantGlobalScope', tgId);
        cargarUsuariosParaEndpoint(endpointId, tgId);
      }
      const herenciasDisponibles = getHeredaOptionsPermitidasPorTenantGlobal(tgId);
      if (currentHereda && !herenciasDisponibles.some((h) => h.id === currentHereda)) {
        setFieldValue(endpointId, 'heredaGlobal', '');
      }
      if (currentTsa) setFieldValue(endpointId, 'tenantSuperAdminScope', '');
      if (currentRegla) setFieldValue(endpointId, 'reglaGlobalFallback', '');
      return;
    }

    if (!actorEsTenantSuperAdmin()) {
      if (currentHereda) setFieldValue(endpointId, 'heredaGlobal', '');
      if (currentTsa) setFieldValue(endpointId, 'tenantGlobalScope', '');
      if (currentRegla) setFieldValue(endpointId, 'reglaGlobalFallback', '');
      return;
    }

    // SuperAdmin: auto-selecciona el primer tenantGlobal disponible
    const tgOptions = tenantGlobales.map((t) => ({ id: t.id, label: t.label }));
    const resolvedTg = tgOptions.some((opt) => opt.id === currentTsa)
      ? currentTsa
      : String(tgOptions[0]?.id || '').trim();
    if (!resolvedTg) return;
    if (resolvedTg !== currentTsa) {
      setFieldValue(endpointId, 'tenantGlobalScope', resolvedTg);
      cargarUsuariosParaEndpoint(endpointId, resolvedTg);
    }

    const herenciasDisponibles = getHeredaOptionsPermitidasPorTenantGlobal(resolvedTg);

    if (herenciasDisponibles.length > 0) {
      if (currentHereda && !herenciasDisponibles.some((h) => h.id === currentHereda)) {
        setFieldValue(endpointId, 'heredaGlobal', '');
      }
      if (currentRegla) setFieldValue(endpointId, 'reglaGlobalFallback', '');
    } else {
      if (currentHereda) setFieldValue(endpointId, 'heredaGlobal', '');
    }
  }, [
    heredaGlobalOptions.length,
    herenciasUsuario.length,
    tenantGlobales.length,
    tenantGlobalActor?.tenantSuperAdminId,
    Object.keys(ruleCatalog || {}).length,
  ]);

  // Auto-poblar seleccion cuando carguen las herencias del TG (scope SA)
  useEffect(() => {
    const endpointId = 'perm-usuario-tenant-global';
    if (!actorEsTenantSuperAdmin()) return;
    if (!endpointModal || endpointModal.id !== endpointId) return;
    const tgId = String((formData[endpointId] || {})['tenantGlobalScope'] || '').trim();
    if (!tgId) return;
    const herenciasDelTG = herenciasExistentesPorTG[tgId];
    if (herenciasDelTG === undefined) return;
    const current = catalogSelection[endpointId] || { vistas: [], acciones: [] };
    if (current.vistas.length > 0 || current.acciones.length > 0) return;
    const { vistasCatalogo, accionesCatalogo } = getPermisosCatalog(endpointId);
    if (herenciasDelTG.length > 0) {
      // TG tiene herencias existentes: pre-seleccionar esas vistas/acciones, constrenidas al catalogo
      const catalogVistaIds = new Set(vistasCatalogo.map((v) => v.id));
      const vistasSet = new Set<string>();
      const accionesSet = new Set<string>();
      herenciasDelTG.forEach((h) => {
        (Array.isArray(h?.vistas) ? h.vistas : []).forEach((v) => {
          const id = String(v?._id || v || '').trim();
          if (id && (!catalogVistaIds.size || catalogVistaIds.has(id))) vistasSet.add(id);
        });
        (Array.isArray(h?.acciones) ? h.acciones : []).forEach((a) => {
          const id = String(a?._id || a || '').trim();
          if (id) accionesSet.add(id);
        });
      });
      setCatalogSelectionFor(endpointId, {
        vistas: Array.from(vistasSet),
        acciones: Array.from(accionesSet),
      });
    } else {
      // TG sin herencias: pre-seleccionar todo el catalogo de reglas parametrizadas
      if (vistasCatalogo.length > 0) {
        setCatalogSelectionFor(endpointId, {
          vistas: vistasCatalogo.map((v) => v.id),
          acciones: accionesCatalogo.map((a) => a.id),
        });
      }
    }
  }, [
    herenciasExistentesPorTG,
    endpointModal?.id,
    tenantGlobalActor?.tenantSuperAdminId,
  ]);

  const runEndpoint = async (endpoint: EndpointSpec) => {
    try {
      setRunning((prev) => ({ ...prev, [endpoint.id]: true }));
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
      const body: Record<string, unknown> = {};
      const headers: Record<string, string> = {};
      let resolvedPath = endpoint.path;

      endpoint.fields.forEach((field) => {
        if (
          (endpoint.id === 'tenant-crear-dios-reglas' || endpoint.id === 'tenant-actualizar-dios-reglas') &&
          field.name === 'contexto'
        ) {
          const selected = getFieldValue(endpoint.id, field.name).trim();
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
            endpoint.id === 'tenant-crear-global-admin' ||
            endpoint.id === 'tenant-actualizar-global'
          ) &&
          !!getFieldValue(endpoint.id, 'coporativo').trim();
        const isAccionUsuarioMulti =
          field.name === 'accionesUsu' &&
          (
            endpoint.id === 'tenant-crear-global-usuario' ||
            endpoint.id === 'tenant-crear-global-admin' ||
            endpoint.id === 'tenant-actualizar-global'
          );
        const value = isAccionUsuarioMulti
          ? raw.split(',').map((v) => v.trim()).filter(Boolean)
          : field.type === 'json'
          ? parseMaybeJson(raw)
          : raw.trim();
        if (!isOwnerTypeDisabledByCorporativo && field.required && (value === '' || (Array.isArray(value) && !value.length))) {
          throw new Error(`Completa: ${field.label}`);
        }
        if (field.pathParam) {
          if (value) {
            resolvedPath = resolvedPath
              .replace(`:${field.name}`, encodeURIComponent(String(value)))
              .replace(`{${field.name}}`, encodeURIComponent(String(value)));
          }
          return;
        }
        if (field.header) {
          if (value) headers[field.name] = String(value);
          return;
        }
        if (value !== '') body[field.name] = value;
      });

      if (endpoint.id === 'tenant-crear-dios-reglas') {
        const seleccionado = getFieldValue(endpoint.id, 'tenantSuperAdmin').trim();
        const jwtSa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
        const saDestino = seleccionado || jwtSa;
        if (saDestino) (body as Record<string, unknown>).tenantSuperAdmin = saDestino;
        (body as Record<string, unknown>).securityPlatform = false;
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
      }

      if (endpoint.id === 'tenant-actualizar-dios-reglas') {
        const seleccionado = getFieldValue(endpoint.id, 'tenantSuperAdmin').trim();
        const jwtSa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
        const saDestino = seleccionado || jwtSa;
        if (saDestino) (body as Record<string, unknown>).tenantSuperAdmin = saDestino;
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
        resolvedPath = resolvedPath
          .replace(':id', encodeURIComponent(herenciaId))
          .replace('{id}', encodeURIComponent(herenciaId));
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
        resolvedPath = resolvedPath
          .replace(':id', encodeURIComponent(herenciaId))
          .replace('{id}', encodeURIComponent(herenciaId));
        setFieldValue(endpoint.id, 'id', herenciaId);
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
          resolvedPath = `/api/config/permisos/creacion/admin/tenant/global/${encodeURIComponent(herenciaId)}/vista`;
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
        body.vistasSeleccionadas = selected.vistas.length ? selected.vistas : vistasCatalogo.map((v) => v.id);
        body.accionesSeleccionadas = selected.acciones.length ? selected.acciones : accionesCatalogo.map((a) => a.id);

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
        const permisosReglas = vistasBase
          .map((vistaId) => ({ vistaId, accionId: accionesBase }))
          .filter((p) => p.vistaId && p.accionId.length > 0);
        if (!permisosReglas.length) throw new Error('Debes seleccionar al menos una vista con acciones');
        body.permisos = permisosReglas;
      }
      if (
        endpoint.id === 'tenant-crear-global-usuario' ||
        endpoint.id === 'tenant-crear-global-admin' ||
        endpoint.id === 'tenant-actualizar-global'
      ) {
        const ownerTypeDisabled = !!String(body.coporativo || '').trim();
        if (ownerTypeDisabled) {
          delete body.ownerType;
        }
        if (endpoint.id === 'tenant-crear-global-usuario') {
          delete body.nvlGeneracionTenant;
        }
        if (endpoint.id === 'tenant-crear-global-admin' || endpoint.id === 'tenant-actualizar-global') {
          const selectedNvlId = String(body.nvlGeneracionTenant || '').trim();
          const selectedNvlOptRun = (tenantGlobalSelects.nvlGeneracionTenant || []).find((opt) => opt.id === selectedNvlId);
          const selectedNvlLabel = selectedNvlOptRun?.label || '';
          const runMeta = (selectedNvlOptRun as GenericSelectOption & { meta?: Record<string, string> })?.meta;
          const nvlMetaEsCeroRun = String(runMeta?.nvl ?? '').trim() === '0';
          const nvlEsLibre =
            nvlMetaEsCeroRun ||
            /libre|nvl 0/i.test(String(selectedNvlLabel)) ||
            String(runMeta?.securityPlatform || '').toLowerCase() === 'true';
          const nvlPermiteCorporativo =
            /tenant-global|nvl 1/i.test(String(selectedNvlLabel)) ||
            /tenant-(co?rporativo)|nvl 2/i.test(String(selectedNvlLabel));
          const nvlEsTenantCorporativo = /tenant-(co?rporativo)|nvl 2/i.test(String(selectedNvlLabel));
          const esSuperAdmin = Boolean(String(tenantGlobalActor?.tenantSuperAdminId || '').trim());
          const esTenantGlobal = Boolean(String(tenantGlobalActor?.tenantGlobalId || '').trim()) && !esSuperAdmin;
          if (esTenantGlobal && nvlEsLibre && String(body.coporativo || '').trim()) {
            throw new Error(
              'NVL 0 / LIBRE con scope solo tenantGlobal: no envíes corporativo aquí; jerarquía sin tenantSuperAdmin en JWT se valida por otro flujo (código de jerarquía).',
            );
          }
          if (esTenantGlobal && !nvlEsLibre && nvlPermiteCorporativo && !String(body.coporativo || '').trim()) {
            throw new Error('Completa: Corporativo (empresa)');
          }
          if (!nvlEsTenantCorporativo && 'tenantGlobalRef' in body) {
            delete body.tenantGlobalRef;
          }
          if (esTenantGlobal && nvlEsTenantCorporativo) {
            const autoRef = String(tenantGlobalActor?.tenantGlobalId || '').trim();
            if (autoRef) {
              body.tenantGlobalRef = autoRef;
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
          if (saPick) qs.set('tenantSuperTenant', saPick);
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

      const response = await apiFetch(resolvedPath, payload);
      const serialized =
        response === undefined
          ? JSON.stringify({ ok: true, note: 'Sin cuerpo en respuesta' }, null, 2)
          : JSON.stringify(response, null, 2);
      setResultData((prev) => ({ ...prev, [endpoint.id]: response }));
      setResult((prev) => ({ ...prev, [endpoint.id]: serialized }));
      toast.success(`${endpoint.title} ejecutado`);
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
          await hydrateData();
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
      setResult((prev) => ({ ...prev, [endpoint.id]: JSON.stringify({ ok: false, error: msg }, null, 2) }));
      toast.error(msg);
    } finally {
      setRunning((prev) => ({ ...prev, [endpoint.id]: false }));
    }
  };

  const renderReglasTable = () => {
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
        rows.map((row: any) => {
          const tenant = Array.isArray(row?.generacionGlovallNvlRoles) ? row.generacionGlovallNvlRoles[0] : null;
          const tenantId = String(tenant?._id || tenant || '').trim();
          const corp = tenant?.coporativo;
          const tenantLabel = String(
            resolveRuleUserLabel(row) !== '-' ? resolveRuleUserLabel(row) : (
              corp?.razon_social ||
              corp?.titulo ||
              tenantId ||
              '-'
            )
          ).trim();
          return [tenantId, { id: tenantId, label: tenantLabel }];
        }).filter(([id]) => Boolean(id))
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
              const reglaId = String(row?.['x-regla-id'] || row?.reglaIdEncrypted || row?.iud || row?.rid || row?._id || '');
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

  const renderActualizarReglaDiosResultado = () => {
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
          <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">{respuestaMsg}</div>
        ) : null}
        <div className="grid gap-2 text-xs md:grid-cols-2">
          <div className="rounded border border-emerald-200 bg-emerald-50 p-2">
            Vistas faltantes detectadas: <span className="font-semibold">{Number(sync?.vistasFaltantesTotal || 0)}</span>
          </div>
          <div className="rounded border border-emerald-200 bg-emerald-50 p-2">
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

  const renderHerenciasAdminTable = () => {
    const raw = resultData['perm-admin-tenant-global-listar'] as any;
    const grupos = Array.isArray(raw?.grupos) ? raw.grupos : [];
    const rows = pickArray(raw, ['data', 'items', 'herencias']);
    const rowsFromGrupos = grupos.flatMap((g: any) => (Array.isArray(g?.items) ? g.items : []));
    const dataRows = rows.length ? rows : rowsFromGrupos;
    const formatDate = (value: any): string => {
      const txt = String(value || '').trim();
      if (!txt) return '-';
      const date = new Date(txt);
      if (Number.isNaN(date.getTime())) return txt;
      return date.toLocaleString();
    };
    if (!dataRows.length) {
      return <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-muted/50 p-3 text-xs text-foreground">{result['perm-admin-tenant-global-listar'] || 'Aun sin respuesta'}</pre>;
    }

    return (
      <div className="overflow-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[1400px] text-left text-xs">
          <thead className="bg-muted text-foreground">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Rol</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Tenant Global</th>
              <th className="px-3 py-2">Tenant Corporativo</th>
              <th className="px-3 py-2">Usuario</th>
              <th className="px-3 py-2">Vistas</th>
              <th className="px-3 py-2">Acciones</th>
              <th className="px-3 py-2">Fecha asignaciÃ³n</th>
              <th className="px-3 py-2">Creado</th>
              <th className="px-3 py-2">Actualizado</th>
              <th className="px-3 py-2">Fuente</th>
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row: any, idx: number) => {
              const vistasArr = Array.isArray(row?.vistas) ? row.vistas : [];
              const accionesArr = Array.isArray(row?.acciones) ? row.acciones : [];
              const vistasPreview = vistasArr
                .slice(0, 2)
                .map((v: any) => String(v?.name || v?.path || v?._id || '').trim())
                .filter(Boolean)
                .join(', ');
              const accionesPreview = accionesArr
                .slice(0, 3)
                .map((a: any) => String(a?.etiquetas || a?.method || a?._id || '').trim())
                .filter(Boolean)
                .join(', ');
              return (
              <tr key={String(row?._id || row?.iud || idx)} className="border-t border-border/80">
                <td className="px-3 py-2 font-mono">{String(row?._id || row?.iud || '-')}</td>
                <td className="px-3 py-2">{String(row?.rolId?.rol || row?.rol || '-')}</td>
                <td className="px-3 py-2">{row?.estado === false ? 'Inactivo' : 'Activo'}</td>
                <td className="px-3 py-2">{String(row?.tenantGlobal?._id || row?.tenantGlobal || '-')}</td>
                <td className="px-3 py-2">{String(row?.tenantCorporativo?._id || row?.tenantCorporativo || '-')}</td>
                <td className="px-3 py-2">{String(row?.usuarioId?.nombre || row?.usuarioId?.name || row?.usuarioId?._id || row?.usuarioId || '-')}</td>
                <td className="px-3 py-2">{vistasArr.length}{vistasPreview ? ` | ${vistasPreview}` : ''}</td>
                <td className="px-3 py-2">{accionesArr.length}{accionesPreview ? ` | ${accionesPreview}` : ''}</td>
                <td className="px-3 py-2">{formatDate(row?.fechaAsignacion)}</td>
                <td className="px-3 py-2">{formatDate(row?.createdAt)}</td>
                <td className="px-3 py-2">{formatDate(row?.updatedAt)}</td>
                <td className="px-3 py-2">{String(row?.fuenteHerencia || 'tenantGlobal')}</td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTenantLibresTable = (endpointId: string) => {
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

  const renderHerenciasUsuarioTable = () => {
    const raw = resultData['perm-listar-herencias'] as any;
    let rows = pickArray(raw, ['herencias', 'data', 'items']);
    const herenciaListarId = getFieldValue('perm-listar-herencias', 'herenciaAsociada').trim();
    if (herenciaListarId) {
      rows = rows.filter((row: any) => String(row?._id || row?.iud || '').trim() === herenciaListarId);
    }
    const gruposRaw = Array.isArray(raw?.grupos) ? raw.grupos : [];
    const contexto = raw?.contexto || {};
    const jerarquia = raw?.jerarquia || {};
    const soloMios = Boolean(contexto?.soloMios);

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

    const tgPermitidos = Array.isArray(jerarquia?.tenantGlobalesPermitidos) ? jerarquia.tenantGlobalesPermitidos.length : 0;
    const tcPermitidos = Array.isArray(jerarquia?.tenantCorporativosPermitidos) ? jerarquia.tenantCorporativosPermitidos.length : 0;

    return (
      <div className="space-y-3">
        <div className="grid gap-2 text-xs md:grid-cols-3">
          <div className="rounded border border-border bg-muted/50 p-2">
            Usuario JWT: <span className="font-semibold">{String(raw?.usuarioId || '-')}</span>
          </div>
          <div className="rounded border border-border bg-muted/50 p-2">
            Scope: <span className="font-semibold">{String(contexto?.scope || '-')}</span>
          </div>
          <div className="rounded border border-border bg-muted/50 p-2">
            Rol JWT: <span className="font-semibold">{String(contexto?.rolJWT || '-')}</span>
          </div>
          <div className="rounded border border-border bg-muted/50 p-2">
            Total herencias: <span className="font-semibold">{Number(raw?.total || rows.length || 0)}</span>
          </div>
          <div className="rounded border border-border bg-muted/50 p-2">
            TenantSuperAdmin: <span className="font-semibold">{String(contexto?.tenantSuperTenant || '-')}</span>
          </div>
          <div className="rounded border border-border bg-muted/50 p-2">
            TenantGlobal JWT: <span className="font-semibold">{String(contexto?.tenantGlobal || '-')}</span>
          </div>
          <div className="rounded border border-border bg-muted/50 p-2">
            TenantCorporativo JWT: <span className="font-semibold">{String(contexto?.tenantCorporativo || '-')}</span>
          </div>
        </div>

        <div className="rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
          Jerarquia visible - TenantGlobal: <span className="font-semibold">{tgPermitidos}</span> | TenantCorporativo: <span className="font-semibold">{tcPermitidos}</span>
        </div>
        <div className="rounded border border-border bg-muted/50 p-2 text-xs text-foreground">
          Modo consulta: <span className="font-semibold">{soloMios ? 'solo mis herencias (JWT)' : 'todas las herencias del alcance JWT'}</span>
        </div>

        <div className="overflow-auto rounded-lg border border-border bg-card">
          <div className="border-b border-border bg-muted/50 px-3 py-2 text-xs font-semibold text-foreground">
            Vistas heredadas (filtro actual)
          </div>
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-muted text-foreground">
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

        <div className="overflow-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="bg-muted text-foreground">
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

  const actorBadge = (actor: EndpointActor): string =>
    actor === 'tenantSuperAdmin' ? 'tenantSuperAdmin (DIOS)' : actor === 'tenantGlobal' ? 'tenantGlobal (ADMIN)' : 'Ambos';

  const renderPermisosBuilder = (endpoint: EndpointSpec) => {
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
      <div className="rounded-xl border border-rose-100 bg-card/80 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-rose-600">Vistas activas + acciones activas</p>
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
          <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin shrink-0" />
            Calculando vistas faltantes para esta regla…
          </div>
        ) : !vistasCatalogo.length && endpoint.id === 'tenant-actualizar-global-reglas' && !getFieldValue(endpoint.id, 'x-regla-id') ? (
          <div className="rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
            Selecciona una regla para ver las vistas disponibles.
          </div>
        ) : !vistasCatalogo.length && endpoint.id === 'tenant-actualizar-global-reglas' && deltaByEndpoint[endpoint.id] ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            Esta regla ya tiene todas las vistas disponibles registradas.
          </div>
        ) : !vistasCatalogo.length ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Faltan datos para construir permisos.
            <Button className="ml-2 h-7 px-2 text-xs" type="button" variant="outline" onClick={hydrateData} disabled={loadingData}>
              Recargar datos
            </Button>
          </div>
        ) : null}
        {isTenantReglasEndpoint && allViewsWithAllActionsSelected ? (
          <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
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

  const renderHerenciaSelectionBuilder = (endpoint: EndpointSpec) => {
    const selected = getCatalogSelection(endpoint.id);
    const { vistasCatalogo, accionesCatalogo } = getPermisosCatalog(endpoint.id);
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
          <p className="text-xs font-medium text-emerald-700">Elige la vista que quieres cambiarle los permisos</p>
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
              disabled={actorEsTenantCorporativoScope()}
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
              variant="secondary"
              disabled={reglasHerenciaSyncBusy || actorEsTenantCorporativoScope()}
              title={
                actorEsTenantCorporativoScope()
                  ? 'Sin permisos para esta acción'
                  : 'Vuelve a leer reglas del servidor y aplica la herencia al formulario'
              }
              onClick={() => void sincronizarCatalogoReglasYHerencia(endpoint.id)}
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
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            No hay vistas resueltas para este tenant en el catalogo actual.
            <Button className="ml-2 h-7 px-2 text-xs" type="button" variant="outline" onClick={hydrateData} disabled={loadingData}>
              Recargar datos
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              {(() => {
                const suiteId = suiteSelByEndpoint[endpoint.id] || '';
                const suiteNodo = suiteId ? rutasJerarquia.find((s) => s._id === suiteId) : null;

                const esSA = actorEsTenantSuperAdmin();
                const forzarTechoCatalogo = endpoint.id === 'perm-usuario-tenant-global';
                const allowedVistaIds: Set<string> = esSA
                  ? (forzarTechoCatalogo ? new Set(vistasCatalogo.map((v) => v.id)) : new Set<string>())
                  : new Set(vistasCatalogo.map((v) => v.id));

                const catalogIds = new Set(vistasCatalogo.map((v) => v.id));
                const hasCatalogFilter = catalogIds.size > 0;
                // IDs de rutas activas (fuente de verdad del frontend)
                const vistaIdsActivos = new Set(vistas.map((v) => v.id));

                // Nodos visibles en el mÃ³dulo:
                // - Si hay regla: todos los nodos activos del Ã¡rbol (habilitados si estÃ¡n en catÃ¡logo)
                // - Si hay catÃ¡logo sin regla: nodos en catÃ¡logo o FORMULARIO/SUBFORMULARIO
                // - Sin catÃ¡logo: solo FORMULARIO/SUBFORMULARIO
                const getFormulariosDeModulo = (modulo: any) =>
                  collectAllNodes(modulo.children || []).filter((f) => {
                    const fid = String(f._id);
                    if (allowedVistaIds.size > 0 && !allowedVistaIds.has(fid)) return false;
                    if (!matchesVistaSearch(f)) return false;
                    if (esReglaSeleccionada) {
                      // Mostrar cualquier nodo que estÃ© activo en el Ã¡rbol de rutas
                      return vistaIdsActivos.has(fid) || esNodoFormularioLike(f);
                    }
                    return esNodoFormularioLike(f) || (hasCatalogFilter && catalogIds.has(fid));
                  });

                // Renderiza la jerarquÃ­a mÃ³dulo â†’ formularios de una suite
                const renderSuiteTree = (suite: any) => {
                  const modulos = getModuloNodes(suite);
                  const totalCatalogEnSuite = modulos.reduce(
                    (acc, m) => acc + getFormulariosDeModulo(m).length,
                    0
                  );
                  if (modulos.length === 0) return null;
                  return (
                    <div key={suite._id} className="mb-2">
                      {!suiteNodo && (
                        <div className="mb-2 flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-800">{suite.name}</span>
                          <span className="ml-auto rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">{totalCatalogEnSuite}</span>
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
                          const selectedCount = formularios.filter((f) => selected.vistas.includes(String(f._id))).length;
                          return (
                            <div key={modulo._id} className="rounded-md border border-emerald-200 bg-card">
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
                                <span className="text-muted-foreground/90 font-normal">{selectedCount}/{formularios.length} {isExpanded ? '▲' : '▼'}</span>
                              </button>
                              {isExpanded && (
                                <div className="border-t border-emerald-100 p-1.5 space-y-0.5">
                                  {(() => {
                                    const formularioIds = new Set(formularios.map((f) => String(f._id)));
                                    const hasVisibleDescendant = (node: any): boolean => {
                                      const nid = String(node._id || '');
                                      if (formularioIds.has(nid)) return true;
                                      return (Array.isArray(node.children) ? node.children : []).some(hasVisibleDescendant);
                                    };
                                    const renderNodo = (nodo: any, depth: number): React.ReactNode => {
                                      if (!hasVisibleDescendant(nodo)) return null;
                                      const nid = String(nodo._id || '');
                                      const tipo = getTipoNodoLabel(nodo);
                                      const esSelec = formularioIds.has(nid);
                                      const hijos = Array.isArray(nodo.children) ? nodo.children : [];
                                      const enCatalogo = esReglaSeleccionada
                                        ? (catalogIds.size === 0 || catalogIds.has(nid))
                                        : (!hasCatalogFilter || catalogIds.has(nid));
                                      const isSubForm = tipo === 'SUBFORMULARIO';
                                      return (
                                        <div key={nid} style={{ paddingLeft: depth * 12 }}>
                                          {esSelec ? (
                                            <label className={`flex cursor-pointer items-start gap-2 rounded px-1.5 py-1 text-xs hover:bg-muted/50 border-l-2 ${isSubForm ? 'border-border' : 'border-input'}`}>
                                              <input
                                                type="checkbox"
                                                className="mt-0.5 shrink-0 accent-emerald-600"
                                                checked={selected.vistas.includes(nid)}
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
                        Vistas ({selected.vistas.length}/{totalFormularios}) - {suiteNodo.name}
                      </p>
                      <div className="max-h-64 overflow-auto space-y-1">
                        {renderSuiteTree(suiteNodo) || <p className="text-xs text-muted-foreground px-2">Esta suite no tiene mÃ³dulos disponibles.</p>}
                      </div>
                    </>
                  );
                }

                // Regla seleccionada sin suite - mostrar TODAS las suites con jerarquia completa
                if (esReglaSeleccionada || endpoint.id === 'perm-usuario-tenant-global' || endpoint.id === 'perm-admin-tenant-global' || endpoint.id === 'tenant-crear-global-reglas') {
                  const suitesConNodos = rutasJerarquia.filter((s) => Array.isArray(s.children) && s.children.length > 0);
                  const totalCatalog = getCatalogoVistaIdsRelacionadas(endpoint.id).length;
                  return (
                    <>
                      <p className="mb-2 text-xs font-semibold text-foreground">
                        Vistas ({selected.vistas.length}/{totalCatalog}) - Todas las suites
                      </p>
                      <div className="max-h-72 overflow-auto space-y-2">
                        {suitesConNodos.map((suite) => renderSuiteTree(suite))}
                      </div>
                    </>
                  );
                }

                // Sin suite y sin regla: lista plana del catÃ¡logo
                return (
                  <>
                    <p className="mb-2 text-xs font-semibold text-foreground">Vistas ({selected.vistas.length}/{vistasCatalogo.length})</p>
                    <div className="max-h-40 overflow-auto rounded-md border border-input bg-card p-2">
                      {vistasCatalogo.filter(matchesVistaSearch).map((vista) => (
                        <label key={vista.id} className="mb-1 flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selected.vistas.includes(vista.id)}
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
                  <label key={accion.id} className="mb-1 flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.acciones.includes(accion.id)}
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
  };

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
    if (endpoint.id === 'tenant-crear-dios-reglas') {
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
    }
  };

  const renderFormResultSlot = (endpoint: EndpointSpec) =>
    endpoint.id === 'tenant-listar-reglas'
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
              : (
                  <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-muted/50 p-3 text-xs text-foreground">
                    {result[endpoint.id] || 'Aun sin respuesta'}
                  </pre>
                );

  const renderFormFieldsInner = (endpoint: EndpointSpec) => (
    <>
      {(PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpoint.id) || endpoint.id === 'perm-admin-tenant-global') ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!!syncRunningByEndpoint[endpoint.id]}
              onClick={() => runHerenciaSyncCheck(endpoint.id, false)}
            >
              Validar rutas nuevas
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!!syncRunningByEndpoint[endpoint.id]}
              onClick={() => runHerenciaSyncCheck(endpoint.id, true)}
            >
              Sincronizar ahora
            </Button>
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
                  <div className="max-h-36 overflow-auto rounded border border-blue-200 bg-card p-2 text-[11px] text-foreground">
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
                  if (nextValue) fetchHerenciasAsociadasByTenantGlobal(endpoint.id, nextValue);
                }}
              >
                <option value="">Todos los tenant globales del alcance JWT</option>
                {tenantOptions.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              {(actorRolJwt || actorTsaJwt || actorTgJwt || actorTcJwt) ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {`JWT: ${actorRolJwt || 'SIN_ROL'} | TSA:${actorTsaJwt || '-'} | TG:${actorTgJwt || '-'} | TC:${actorTcJwt || '-'}`}
                </p>
              ) : null}
            </div>
            <div>
              <Label>Herencia asociada</Label>
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
                    ? 'Todas las herencias del tenant global'
                    : 'Sin herencias asociadas'}
                </option>
                {herenciaOptions.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
              </select>
              {tenantCorpError ? (
                <p className="mt-1 text-xs text-rose-700">
                  Error cargando herencias: {tenantCorpError}
                </p>
              ) : null}
            </div>
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
                  if (nextValue) fetchHerenciasAsociadasByTenantGlobal(endpoint.id, nextValue);
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
                  if (nextValue) fetchHerenciasAsociadasByTenantGlobal(endpoint.id, nextValue);
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
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 space-y-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <p className="text-emerald-800 font-medium">
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
      {endpoint.fields.map((field) => {
        if ((endpoint.id === 'tenant-crear-dios-reglas' || endpoint.id === 'tenant-actualizar-dios-reglas') && field.name === 'tenantSuperAdmin') {
          const diosOpts: { id: string; label: string }[] = (() => {
            const m = new Map<string, string>();
            tenantSuperAdminsJerarquiaCounters.forEach((s: any) => {
              const id = String(s?.id || '').trim();
              if (id) m.set(id, String(s?.label || id));
            });
            const jwtSa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
            if (jwtSa && !m.has(jwtSa)) m.set(jwtSa, `Sesion JWT · ${jwtSa.slice(-8)}`);
            return Array.from(m.entries()).map(([id, label]) => ({ id, label }));
          })();
          return (
            <div key={field.name}>
              <Label>{field.label} {field.required ? '*' : ''}</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                disabled={modoSoloLecturaReglasDios(endpoint)}
                value={getFieldValue(endpoint.id, field.name)}
                onChange={(e) => setFieldValue(endpoint.id, field.name, e.target.value)}
              >
                <option value="">{diosOpts.length ? 'Selecciona tenant SuperAdmin' : 'Sin opciones (Recargar datos API)'}</option>
                {diosOpts.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
              {(() => {
                const v = getFieldValue(endpoint.id, 'tenantSuperAdmin').trim();
                const meta = tenantSuperAdminsJerarquiaCounters.find((x) => String(x.id) === v);
                if (!meta?.usuarioNombre && !meta?.usuarioCorreo) return null;
                return (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Usuario vinculado (RegisUsu · perfilSuperAdmin):{' '}
                    <span className="font-medium text-foreground">
                      {[meta.usuarioNombre, meta.usuarioCorreo].filter(Boolean).join(' · ')}
                    </span>
                  </p>
                );
              })()}
              {String(tenantGlobalActor?.tenantSuperAdminId || '').trim() ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  El servidor usa el tenant SuperAdmin elegido aquí (validado contra tu usuario); si está vacío, aplica el del JWT.
                </p>
              ) : null}
            </div>
          );
        }
        if ((endpoint.id === 'tenant-crear-dios-reglas' || endpoint.id === 'tenant-actualizar-dios-reglas') && field.name === 'contexto') {
          return (
            <div key={field.name}>
              <Label>{field.label} {field.required ? '*' : ''}</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                disabled={modoSoloLecturaReglasDios(endpoint)}
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
                    if (nextTg) cargarUsuariosParaEndpoint(endpoint.id, nextTg);
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
                  const nextTsa = e.target.value;
                  setFieldValue(endpoint.id, 'tenantGlobalScope', nextTsa);
                  setFieldValue(endpoint.id, 'heredaGlobal', '');
                  setFieldValue(endpoint.id, 'reglaGlobalFallback', '');
                  setUsuariosDestinoSel((prev) => ({ ...prev, [endpoint.id]: [] }));
                  if (nextTsa) cargarUsuariosParaEndpoint(endpoint.id, nextTsa);
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
                const vistaIdsEnHerencia = new Set(vcSuite.map((v) => v.id));
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
                        <option key={suite._id} value={suite._id}>{suite.name}</option>
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
            return (
              <div key={field.name} className="space-y-4">
                {scopeOpts.length > 0 ? (
                  <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 p-3">
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
                <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/50 p-3">
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
                  <p className="text-xs text-amber-700">
                    No hay opciones de tenant cargadas. Pulsa Recargar datos API.
                  </p>
                ) : null}
              </div>
            );
          }
          const tenantOptions = getTenantGlobalOptions(endpoint.id);
          const actorRolJwt = String(tenantGlobalActor?.rol || '').trim();
          const actorTsaJwt = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
          const actorTgJwt = String(tenantGlobalActor?.tenantGlobalId || '').trim();
          const actorTcJwt = String(tenantGlobalActor?.tenantCorporativoId || '').trim();
          return (
            <div key={field.name}>
              <Label>{field.label} {field.required ? '*' : ''}</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                disabled={
                  (endpoint.id === 'tenant-crear-global-reglas' ||
                    endpoint.id === 'tenant-actualizar-global-reglas') &&
                  !endpointDisponibleParaScope(endpoint)
                }
                value={getFieldValue(endpoint.id, field.name)}
                onChange={(e) => {
                  const v = e.target.value;
                  setFieldValue(endpoint.id, field.name, v);
                  const trimmed = v.trim();
                  if (
                    (endpoint.id === 'tenant-crear-global-reglas' ||
                      endpoint.id === 'tenant-actualizar-global-reglas') &&
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
              {(actorRolJwt || actorTsaJwt || actorTgJwt || actorTcJwt) ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {`JWT: ${actorRolJwt || 'SIN_ROL'} | TSA:${actorTsaJwt || '-'} | TG:${actorTgJwt || '-'} | TC:${actorTcJwt || '-'}`}
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
              {(endpoint.id === 'tenant-crear-global-reglas' || endpoint.id === 'tenant-actualizar-global-reglas')
                ? (() => {
                  const tgSelLoc = getFieldValue(endpoint.id, field.name).trim();
                  const esTgReal = tgSelLoc && !isTenantSuperAdminScopeOption(tgSelLoc);
                  const listaLoc = usuariosDisponibles[endpoint.id] || [];
                  const cargandoLoc = !!loadingUsuarios[endpoint.id];
                  const soloConsulta = !endpointDisponibleParaScope(endpoint);
                  if (esTgReal) {
                    return (
                      <div className="mt-2 space-y-1 rounded-md border border-violet-100 bg-violet-50/70 px-2 py-1.5">
                        <p className="text-[11px] font-semibold text-violet-900">
                          Usuarios en la rama de este tenant global
                          {soloConsulta ? (
                            <span className="ml-1 font-normal text-muted-foreground">(solo consulta)</span>
                          ) : null}
                        </p>
                        <p className="text-[11px] text-violet-950/90">
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
              {!loadingData && tenantOptions.length === 0 ? (
                <p className="mt-1 text-xs text-amber-700">
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
                    if (tg) void fetchHerenciasAsociadasByTenantGlobal(endpoint.id, tg);
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
                <p className="mt-1 text-xs text-rose-700">
                  Error cargando corporativos: {tenantCorpError}
                </p>
              ) : null}
            </div>
          );
        }
        if (field.name === 'contextoDefi') {
          const soloContextoViewTenant =
            endpoint.id === 'tenant-crear-global-reglas' || endpoint.id === 'tenant-actualizar-global-reglas';
          const opcionesCtx = soloContextoViewTenant
            ? contextos.filter((c) => String(c.tipoContexto || '').toLowerCase() === 'view')
            : contextos;
          return (
            <div key={field.name}>
              <Label>{field.label} {field.required ? '*' : ''}</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                value={getFieldValue(endpoint.id, field.name)}
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
                <p className="mt-1 text-xs text-amber-700">
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
                onChange={(e) => setFieldValue(endpoint.id, field.name, e.target.value)}
              >
                <option value="">
                  {loadingData ? 'Cargando opciones...' : 'Selecciona tenant a actualizar'}
                </option>
                {tenantUpdateTargets.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                {actorEsTenantSuperAdminScope
                  ? 'Scope tenantSuperAdmin: puedes seleccionar nodos tenantSuperAdmin, tenantGlobal y tenantCorporativo visibles.'
                  : actorEsTenantGlobal
                  ? 'Scope tenantGlobal: solo puedes seleccionar tu tenantGlobal y sus nodos corporativos descendientes.'
                  : 'El listado se resuelve desde tu scope actual.'}
              </p>
              {!loadingData && !tenantUpdateTargets.length ? (
                <p className="mt-1 text-xs text-amber-700">
                  No hay tenants disponibles para actualizar con tu scope actual.
                </p>
              ) : null}
            </div>
          );
        }
        const usesTenantGlobalSelects =
          (
            endpoint.id === 'tenant-crear-global-usuario' ||
            endpoint.id === 'tenant-crear-global-admin' ||
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
          const nvlMetaNum = String(nvlMeta?.nvl ?? '').trim();
          const nvlTexto = String(nvlLabel).toLowerCase();
          const nvlMetaEsCero = nvlMetaNum === '0';
          const nvlEsLibre =
            nvlMetaEsCero ||
            nvlTexto.includes('libre') ||
            nvlTexto.includes('nvl 0') ||
            String(nvlMeta?.securityPlatform || '').toLowerCase() === 'true';
          const nvlEsTenantGlobal = nvlTexto.includes('tenant-global') || nvlTexto.includes('nvl 1');
          const nvlEsTenantCorporativo = /tenant-(co?rporativo)|nvl 2/i.test(String(nvlLabel));
          /**
           * NVL 0 (LIBRE/DIOS): corporativo solo si scope tenantSuperAdmin — jerarquía/secuencia las resuelve el backend.
           * Sin tenantSuperAdmin en JWT (flujo puro tenantGlobal): no aplica corporativo en LIBRE (coincide con listarSelects que oculta LIBRE a TG).
           */
          const nvlPermiteCorporativo =
            nvlEsTenantGlobal ||
            nvlEsTenantCorporativo ||
            (nvlMetaEsCero && actorEsTenantSuperAdmin());
          const nvlBloqueaRolDios =
            endpoint.id === 'tenant-crear-global-usuario' ||
            nvlEsTenantGlobal ||
            nvlEsTenantCorporativo;
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
          const saJerarquiaCorp =
            tenantGlobalActor?.saJerarquiaTieneCorporativoEnCounters === true;
          const optionsNivelPorScope = field.name === 'nvlGeneracionTenant'
            ? options.filter((opt) => {
                const nvl = String((opt as any)?.meta?.nvl || '').trim();
                const generationTenant = String((opt as any)?.meta?.generationTenant || '').toLowerCase();
                const esLibre = nvl === '0' || generationTenant.includes('libre') || String((opt as any)?.meta?.securityPlatform || '').toLowerCase() === 'true';
                const esCorporativoNvl =
                  nvl === '2' ||
                  generationTenant.includes('corporativo') ||
                  generationTenant.includes('tenant-corporativo');

                if (actorEsTenantSuperAdmin()) {
                  if (esLibre && saJerarquiaCorp) return false;
                  if (esCorporativoNvl && saJerarquiaCorp) return false;
                  return true;
                }
                if (actorEsTenantGlobal) return !esLibre;
                if (actorEsTenantCorporativo) return nvl === '2' || generationTenant.includes('corporativo');
                return !esLibre;
              })
            : options;
          const optionsFiltradas = field.name === 'coporativo'
            ? endpoint.id === 'tenant-crear-global-usuario'
              ? options
              : nvlPermiteCorporativo
                ? options
                : []
            : field.name === 'nvlGeneracionTenant'
            ? optionsNivelPorScope
            : field.name === 'tenantGlobalRef'
            ? (nvlEsTenantCorporativo ? options : [])
            : optionsRoles;
          const disabled =
            field.name === 'coporativo'
              ? endpoint.id === 'tenant-crear-global-usuario'
                ? false
                : !selectedNvl || !nvlPermiteCorporativo
              : field.name === 'tenantGlobalRef'
              ? !selectedNvl || !nvlEsTenantCorporativo || actorEsTenantGlobalPuro
              : ownerTypeBloqueadoPorScope
              ? true
              : false;
          const isAccionUsuarioMulti =
            field.name === 'accionesUsu' &&
            (
              endpoint.id === 'tenant-crear-global-usuario' ||
              endpoint.id === 'tenant-crear-global-admin' ||
              endpoint.id === 'tenant-actualizar-global'
            );
          const selectedMultiValues = isAccionUsuarioMulti
            ? getFieldValue(endpoint.id, field.name).split(',').map((v) => v.trim()).filter(Boolean)
            : [];
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
                      onClick={() => setFieldValue(endpoint.id, field.name, optionsFiltradas.map((opt) => opt.id).join(','))}
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
                    {optionsFiltradas.map((opt) => {
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
                      ? 'border-rose-300 bg-rose-50/60 font-medium text-foreground focus:border-rose-400'
                      : 'border-input bg-card'
                  }`}
                  value={getFieldValue(endpoint.id, field.name)}
                  onChange={(e) => {
                    setFieldValue(endpoint.id, field.name, e.target.value);
                    if (field.name === 'nvlGeneracionTenant') {
                      // Cambio de nivel: limpiar dependencias
                      const nextOpt = (tenantGlobalSelects.nvlGeneracionTenant || []).find((opt) => opt.id === e.target.value);
                      const nextNvlLabel = nextOpt?.label || '';
                      const nextMeta = (nextOpt as GenericSelectOption & { meta?: Record<string, string> })?.meta;
                      const nextNvlEsLibre =
                        String(nextMeta?.nvl ?? '').trim() === '0' ||
                        String(nextNvlLabel).toLowerCase().includes('libre') ||
                        String(nextNvlLabel).toLowerCase().includes('nvl 0') ||
                        String(nextMeta?.securityPlatform || '').toLowerCase() === 'true';
                      const nextNvlEsTenantCorporativo = /tenant-(co?rporativo)|nvl 2/i.test(String(nextNvlLabel));
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
                    {loadingData ? 'Cargando opciones...' : `Selecciona ${field.label.toLowerCase()}`}
                  </option>
                  {optionsFiltradas.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              )}
              {field.name === 'nvlGeneracionTenant' ? (
                <p className="mt-1 text-xs text-rose-700">
                  Este nivel sale del select parametrizado sobre <span className="font-semibold">generacionglobalnvlrolesconfigs</span>.
                </p>
              ) : null}
              {isAccionUsuarioMulti ? <p className="mt-1 text-xs text-muted-foreground">Selecciona una o varias acciones.</p> : null}
              {!loadingData && optionsFiltradas.length === 0 ? (
                <p className="mt-1 text-xs text-amber-700">
                  {field.name === 'coporativo' && nvlEsLibre && !actorEsTenantSuperAdminScope
                    ? 'NVL 0 / LIBRE: con scope solo tenantGlobal no se asocia corporativo aquí; sube a tenantSuperAdmin o usa la ruta con código de jerarquía.'
                    : field.name === 'coporativo' && nvlEsLibre && actorEsTenantSuperAdminScope
                      ? 'NVL 0 / LIBRE con tenantSuperAdmin: puedes asociar corporativo; jerarquía y secuencia se resuelven del scope JWT.'
                      : field.name === 'coporativo' && nvlEsLibre
                        ? 'Para NVL LIBRE no se requiere corporativo.'
                        : 'Sin opciones para este campo. Verifica rol `tenantSuperAdmin` o la configuracion del nivel.'}
                </p>
              ) : null}
              {field.name === 'coporativo' && nvlMetaEsCero && actorEsTenantSuperAdminScope && optionsFiltradas.length > 0 ? (
                <p className="mt-1 text-xs text-emerald-800">
                  NVL 0: corporativo opcional. Si eliges uno, debe ser coherente con tu rama; el alta sigue validando codigo de jerarquia en backend según scope.
                </p>
              ) : null}
              {ownerTypeBloqueadoPorScope ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  `ownerType` solo puede ajustarlo un usuario con scope `tenantSuperAdmin`.
                </p>
              ) : null}
              {field.name === 'tenantGlobalRef' && actorEsTenantGlobalPuro ? (
                <p className="mt-1 text-xs text-sky-700">
                  Flujo puro <span className="font-semibold">tenantGlobal</span>: la referencia queda amarrada a tu propio tenantGlobal y solo afecta tu rama descendente.
                </p>
              ) : null}
              {field.name === 'tenantGlobalRef' && actorEsTenantSuperAdminScope ? (
                <p className="mt-1 text-xs text-fuchsia-700">
                  Flujo <span className="font-semibold">tenantSuperAdmin -&gt; tenantGlobal</span>: puedes parametrizar sobre tenantGlobales visibles dentro de tu jerarquÃ­a.
                </p>
              ) : null}
            </div>
          );
        }
        if (field.name === 'x-regla-id') {
          const tenantFiltro = tenantFilterByEndpoint[endpoint.id] || '';
          const reglasFiltradas = getReglasFiltradasPorTenant(endpoint.id);
          const opcionesTenantGlobal =
            endpoint.id === 'tenant-actualizar-global-reglas' ||
            endpoint.id === 'tenant-desactivar-global-reglas' ||
            endpoint.id === 'tenant-eliminar-global-reglas'
              ? getTenantGlobalOptions(endpoint.id)
              : [];
          return (
            <div key={field.name} className="space-y-3">
              {/* Misma fuente que POST crear reglas globales (jerarquía JWT / tenantGlobales) */}
              <div>
                <Label>Tenant global *</Label>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                  value={tenantFiltro}
                  onChange={(e) => {
                    const nextTenant = e.target.value;
                    setTenantFilterByEndpoint((prev) => ({ ...prev, [endpoint.id]: nextTenant }));
                    // Limpiar regla seleccionada y delta al cambiar de tenant
                    setFieldValue(endpoint.id, field.name, '');
                    setDeltaByEndpoint((prev) => { const next = { ...prev }; delete next[endpoint.id]; return next; });
                    setCatalogSelectionFor(endpoint.id, { vistas: [], acciones: [] });
                  }}
                >
                  <option value="">Selecciona tenant global</option>
                  {opcionesTenantGlobal.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Mismo alcance que en «Crear reglas globales»: tenants globales visibles para tu JWT (árbol / counters).
                </p>
              </div>
              {/* Selector de Regla (filtrado por tenant) */}
              <div>
                <Label>{field.label} {field.required ? '*' : ''}</Label>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                  value={getFieldValue(endpoint.id, field.name)}
                  disabled={!tenantFiltro}
                  onChange={(e) => {
                    const selected = e.target.value;
                    setFieldValue(endpoint.id, field.name, selected);
                    if (selected && endpoint.id === 'tenant-actualizar-global-reglas') {
                      applyRuleToForm(endpoint.id, selected);
                    }
                  }}
                >
                  <option value="">
                    {tenantFiltro
                      ? endpoint.id === 'tenant-actualizar-global-reglas'
                        ? 'Selecciona regla a actualizar'
                        : endpoint.id === 'tenant-desactivar-global-reglas'
                          ? 'Selecciona regla a desactivar'
                          : endpoint.id === 'tenant-eliminar-global-reglas'
                            ? 'Selecciona regla a eliminar'
                            : 'Selecciona regla'
                      : 'Primero selecciona un tenant'}
                  </option>
                  {reglasFiltradas.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  ID encriptado según listar reglas. Solo reglas con contexto{' '}
                  <span className="font-medium text-foreground">view</span> (tenant global), igual que en crear/actualizar — sin DIOS ni solo contexto{' '}
                  <span className="font-medium text-foreground">api</span>.
                </p>
              </div>
            </div>
          );
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
      })}
      {/* â”€â”€ Selectores segÃºn scope: SA ve TenantGlobal, TG ve Herencia + Corporativo â”€â”€ */}
      {endpoint.id === 'perm-usuario-tenant-global' ? (() => {
        const esSA = actorEsTenantSuperAdmin();
        const esTG = actorEsTenantGlobalScope();

        if (esSA) {
          const tgOptionsAll: HeredaGlobalOption[] = tenantGlobales.map((t) => ({ id: t.id, label: t.label }));
          const tsaSelected = getFieldValue(endpoint.id, 'tenantGlobalScope').trim() || String(tgOptionsAll[0]?.id || '');
          const { vistasCatalogo: vcSuite } = tsaSelected ? getPermisosCatalog(endpoint.id) : { vistasCatalogo: [] };
          const vistaIdsEnHerencia = new Set(vcSuite.map((v) => v.id));
          const suitesConJerarquia = rutasJerarquia.filter((s) => {
            if (!Array.isArray(s.children) || s.children.length === 0) return false;
            if (vistaIdsEnHerencia.size === 0) return false;
            return collectAllNodes(s.children).some((node) => vistaIdsEnHerencia.has(String(node._id)));
          });
          const suiteDisabled = !tsaSelected || vcSuite.length === 0;
          return (
            <div className="space-y-2">
              <div>
                <Label>TenantGlobal *</Label>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                  value={tsaSelected}
                  onChange={(e) => {
                    const nextTg = e.target.value;
                    setFieldValue(endpoint.id, 'tenantGlobalScope', nextTg);
                    setFieldValue(endpoint.id, 'heredaGlobal', '');
                    setSuiteSelByEndpoint((prev) => ({ ...prev, [endpoint.id]: '' }));
                    setUsuariosDestinoSel((prev) => ({ ...prev, [endpoint.id]: [] }));
                    setCatalogSelectionFor(endpoint.id, { vistas: [], acciones: [] });
                    if (nextTg) {
                      cargarUsuariosParaEndpoint(endpoint.id, nextTg);
                      cargarHerenciasExistentesTG(nextTg);
                    }
                  }}
                >
                  <option value="">Selecciona tenantGlobal</option>
                  {tgOptionsAll.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="mt-2 block">Suite</Label>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm"
                  value={suiteSelByEndpoint[endpoint.id] || ''}
                  disabled={suiteDisabled}
                  onChange={(e) => {
                    applySuiteCatalogSelection(endpoint.id, e.target.value);
                  }}
                >
                  <option value="">
                    {!tsaSelected
                      ? 'Selecciona tenantGlobal primero'
                      : suitesConJerarquia.length
                      ? 'Selecciona suite para filtrar vistas'
                      : vcSuite.length
                      ? 'Las vistas resueltas no aparecen en el árbol de rutas'
                      : 'Sin vistas resueltas para este tenantGlobal'}
                  </option>
                  {suitesConJerarquia.map((suite) => (
                    <option key={suite._id} value={suite._id}>{suite.name}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tsaSelected
                    ? 'El catálogo se resuelve automáticamente desde las reglas y herencias asociadas al tenantGlobal seleccionado.'
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
                      className="text-xs text-blue-600 hover:underline disabled:opacity-50"
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
                {corpError && <p className="mt-1 text-xs text-red-500">{corpError}</p>}
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
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-blue-700">
                Usuarios destino ({seleccionados.length}/{disponibles.length})
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded border border-blue-300 bg-card px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
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
                    cargarUsuariosParaEndpoint(endpointId, tgId);
                    cargarHerenciasExistentesTG(tgId);
                  }}
                  disabled={cargando}
                >{cargando ? '...' : 'Recargar'}</button>
              </div>
            </div>
            {cargando ? (
              <p className="text-xs text-blue-500">Cargando usuarios...</p>
            ) : disponibles.length === 0 ? (
              <p className="text-xs text-muted-foreground">No hay usuarios disponibles.</p>
            ) : (
              <div className="max-h-48 overflow-auto rounded-md border border-blue-200 bg-card p-2 space-y-2">
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
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
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
                          <div className="ml-5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 space-y-1">
                            <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">
                              Parametrizado en {tgsUsu.length} tenantGlobal{tgsUsu.length > 1 ? 'es' : ''}
                            </p>
                            {tgsUsu.map((tg) => (
                              <div key={tg.id} className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-emerald-800">
                                <span className="font-mono text-emerald-500">{tg.id.slice(-8)}</span>
                                <span className="flex-1 truncate">{tg.label !== tg.id ? tg.label : ''}</span>
                                <span>V:<strong>{tg.vistas}</strong></span>
                                <span>A:<strong>{tg.acciones}</strong></span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      {tieneHerencia && seleccionados.includes(u.id) && (
                        <div className="ml-5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 space-y-1">
                          <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Herencias existentes</p>
                          {herenciasUsu.map((h: any) => {
                            const hId = String(h?.iud || h?._id || '');
                            const vistas = Array.isArray(h?.vistas) ? h.vistas.length : 0;
                            const acciones = Array.isArray(h?.acciones) ? h.acciones.length : 0;
                            const tgRef = String(h?.tenantGlobal?.label || h?.tenantGlobal?.correo || h?.tenantGlobal || '');
                            const tcRef = String(h?.tenantCorporativo?.label || h?.tenantCorporativo?.correo || h?.tenantCorporativo || '');
                            return (
                              <div key={hId} className="text-[10px] text-amber-800 flex flex-wrap gap-x-3 gap-y-0.5">
                                <span>Vistas: <strong>{vistas}</strong></span>
                                <span>Acciones: <strong>{acciones}</strong></span>
                                {tgRef && <span>TG: <strong>{tgRef}</strong></span>}
                                {tcRef && <span>TC: <strong>{tcRef}</strong></span>}
                                <span className="text-amber-500 font-mono">{hId.slice(-6)}</span>
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
              <p className="text-xs text-blue-600 font-medium">
                Se crearan {seleccionados.length} documentos de herencia (uno por usuario).
              </p>
            )}
          </div>
        );
      })() : null}
      {endpoint.id === 'perm-usuario-tenant-global' ? renderHerenciaSelectionBuilder(endpoint) : null}
      {(endpoint.id === 'tenant-crear-dios-reglas' || endpoint.id === 'tenant-actualizar-dios-reglas') ? (() => {
        const jwtSa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
        const tenantSaField = getFieldValue(endpoint.id, 'tenantSuperAdmin').trim();
        const effectiveSaParaRegla = tenantSaField || jwtSa;
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
        let catalogRows: DiosRow[] = nodes.length
          ? nodes.map((n: any) => {
            const accionesText = (Array.isArray(n?.acciones) ? n.acciones : [])
              .map((a: any) => String(a?.etiquetas || a?.method || a?._id || '').trim())
              .filter(Boolean)
              .join(', ') || '—';
            return {
              _id: String(n?._id || ''),
              name: String(n?.name || '—'),
              path: String(n?.path || '—'),
              tipo: getTipoNodoLabel(n) || '—',
              accionesText,
            };
          })
          : vistas.map((v) => ({
            _id: v.id,
            name: v.label,
            path: v.path || '—',
            tipo: '—',
            accionesText: 'Ver catálogo global de acciones abajo',
          }));
        if (acotarPorRegla) {
          catalogRows = catalogRows.filter((row) => recursoIdSet.has(String(row._id || '').trim()));
        }
        catalogRows = [...catalogRows].sort((a, b) =>
          String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' })
        );
        const recursosReglaArr = Array.isArray(reglaDiosJerarquia?.recurso) ? reglaDiosJerarquia.recurso : [];
        const rowsFromGet: DiosRow[] = recursosReglaArr
          .map((v: any) => {
            const id = String(v?._id || v || '').trim();
            if (!id) return null;
            const n = nodeById.get(id);
            const accionesText =
              n && Array.isArray(n?.acciones)
                ? (n.acciones as any[])
                  .map((a: any) => String(a?.etiquetas || a?.method || a?._id || '').trim())
                  .filter(Boolean)
                  .join(', ') || '—'
                : '—';
            return {
              _id: id,
              name: n ? String(n?.name || '—') : String(v?.name || v?.label || '—'),
              path: n ? String(n?.path || '—') : String(v?.path || '—'),
              tipo: n ? getTipoNodoLabel(n) || '—' : '—',
              accionesText,
            };
          })
          .filter(Boolean) as DiosRow[];
        const rowsFromGetSorted = [...rowsFromGet].sort((a, b) =>
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
              tableRows = tableRows.filter((row) => selSet.has(String(row._id || '').trim()));
            }
          }
        } else if (soloLecturaDios) {
          tableRows = rowsFromGetSorted.length ? rowsFromGetSorted : catalogRows;
        } else {
          tableRows = catalogRows;
        }
        const recursosMostrar = catalogRows;
        const accionesMostrar = acotarPorRegla && accionReglaIdSet.size > 0
          ? acciones.filter((a) => accionReglaIdSet.has(a.id))
          : acciones;
        const mostrarBloqueTablaGrande = mostrarTablaRutasArbolDios;
        const mostrarBloqueTablaReferenciaCorp = soloLecturaDios && !mostrarTablaRutasArbolDios;
        return (
          <div className="space-y-2">
            {soloLecturaDios ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <span className="font-semibold">Modo referencia (jerarquía con corporativo): </span>
                vistas y acciones acotadas a la regla DIOS parametrizada para tu tenantSuperAdmin. Ejecutar está deshabilitado; el servidor también bloquea crear/sincronizar totales en este perfil.
              </div>
            ) : puedeToolbarSincronizarDios(endpoint) ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                Sin corporativo en <code className="rounded bg-white/80 px-1">tenantJerarquiaCounter</code>: puedes crear la regla DIOS y usar &quot;Sincronizar regla DIOS&quot; para alinear todas las vistas activas sin restricción de jerarquía corporativa.
              </div>
            ) : null}
            {reglaDiosJerarquia ? (
              <p className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">securityPlatform</span> en la regla (GET{' '}
                <code className="rounded bg-muted px-1">/api/config/tenant/listar/reglas</code>):{' '}
                <code className="rounded bg-muted px-1">{String(reglaDiosJerarquia.securityPlatform)}</code>
              </p>
            ) : null}
            {mostrarBloqueTablaGrande ? (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="border-b border-border bg-muted/50 px-3 py-2 text-xs font-semibold text-foreground">
                Rutas de seguridad y acciones por ruta ({tableRows.length} filas · {accionesMostrar.length} acciones
                {acotarPorRegla ? ' · techo regla DIOS' : ''}
                {tablaFuenteGet ? ' · fuente GET listar reglas (recurso)' : ' · árbol de rutas / selección'})
              </div>
              <div className="max-h-72 overflow-auto">
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead className="sticky top-0 bg-muted text-foreground">
                    <tr>
                      {mostrarTablaRutasArbolDios && !soloLecturaDios ? (
                        <th className="w-10 px-2 py-2 text-center" title="Filtrar vista en la tabla">
                          Sel.
                        </th>
                      ) : null}
                      <th className="px-3 py-2">Nombre</th>
                      <th className="px-3 py-2">Tipo nodo</th>
                      <th className="px-3 py-2">Acciones asociadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, idx) => (
                      <tr key={row._id || `row-${idx}`} className="border-t border-border/80">
                        {mostrarTablaRutasArbolDios && !soloLecturaDios ? (
                          <td className="px-2 py-2 align-top">
                            <input
                              type="checkbox"
                              className="accent-primary"
                              title="Incluir en el filtro de la tabla"
                              checked={(diosReglaRecursosSeleccion[endpoint.id] ?? []).includes(row._id)}
                              onChange={(e) => {
                                const on = e.target.checked;
                                setDiosReglaRecursosSeleccion((prev) => {
                                  const set = new Set(prev[endpoint.id] ?? []);
                                  if (on) set.add(row._id);
                                  else set.delete(row._id);
                                  return { ...prev, [endpoint.id]: Array.from(set) };
                                });
                              }}
                            />
                          </td>
                        ) : null}
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
            {mostrarBloqueTablaReferenciaCorp ? (
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="border-b border-border bg-muted/50 px-3 py-2 text-xs font-semibold text-foreground">
                  Regla DIOS — vista desde GET <code className="rounded bg-muted px-1">/api/config/tenant/listar/reglas</code> ({tableRows.length} filas
                  {rowsFromGetSorted.length ? ' · recurso de la regla' : ' · sin recurso en regla; árbol acotado'})
                </div>
                <div className="max-h-72 overflow-auto">
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
                        <tr key={row._id || `cre-${idx}`} className="border-t border-border/80">
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
                    {acotarPorRegla ? ' · techo regla' : ''})
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
                <div className="max-h-48 overflow-auto px-3 py-2">
                  {recursosMostrar.map((r) => {
                    const checked = (diosReglaRecursosSeleccion[endpoint.id] ?? []).includes(r._id);
                    return (
                      <label key={r._id || r.path} className="mb-1.5 flex cursor-pointer items-start gap-2 text-xs text-foreground">
                        <input
                          type="checkbox"
                          className="accent-primary mt-0.5"
                          checked={checked}
                          onChange={(e) => {
                            const on = e.target.checked;
                            setDiosReglaRecursosSeleccion((prev) => {
                              const k = endpoint.id;
                              const set = new Set(prev[k] ?? []);
                              if (on) set.add(r._id);
                              else set.delete(r._id);
                              return { ...prev, [k]: Array.from(set) };
                            });
                          }}
                        />
                        <span className="font-medium">{r.name}</span>
                      </label>
                    );
                  })}
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
                  <div className="max-h-48 overflow-auto px-3 py-2">
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
                  <div className="max-h-32 overflow-auto px-3 py-2 text-[11px] text-muted-foreground">
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
                  ? 'El POST envía tenantSuperAdmin (combo o JWT), más recursosSeleccionadas y accionesSeleccionadas. La tabla usa GET listar reglas si ya existe recurso en la regla; si no, el árbol de rutas; los checks filtran la tabla.'
                : mostrarTablaRutasArbolDios && endpoint.id === 'tenant-actualizar-dios-reglas' && !soloLecturaDios
                  ? 'Elige Tenant SuperAdmin: la vista previa muestra la regla plataforma de ese SA (catálogo GET listar reglas). El PUT envía ese mismo id al servidor y sincroniza todas las rutas y acciones activas para esa regla (los checks solo filtran la tabla en pantalla).'
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

  const renderForm = (endpoint: EndpointSpec) => {
    const endpointSyncDios = ENDPOINTS.find((e) => e.id === 'tenant-actualizar-dios-reglas');
    const disponibleModal = diosReglasDisponibleModal(endpoint);
    const ejecutarSoloLecturaDios = modoSoloLecturaReglasDios(endpoint);
    const runningSync = !!running['tenant-actualizar-dios-reglas'];
    const runningMain = !!running[endpoint.id];
    return (
      <ParametrosGobernanzaModalFormLayout
        path={endpoint.path}
        actorLabel={endpoint.actor}
        running={runningMain || (endpoint.id === 'tenant-crear-dios-reglas' && runningSync)}
        disponible={disponibleModal}
        executeDisabled={ejecutarSoloLecturaDios}
        executeDisabledReason={
          ejecutarSoloLecturaDios
            ? 'Jerarquía con corporativo en tenantJerarquiaCounter: solo referencia visual según la regla DIOS parametrizada (no crear ni sincronizar totales).'
            : undefined
        }
        extraToolbar={
          puedeToolbarSincronizarDios(endpoint) && endpointSyncDios ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={runningSync}
              onClick={() => void runEndpoint(endpointSyncDios)}
            >
              {runningSync ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sincronizar regla DIOS (todas las vistas activas)
            </Button>
          ) : null
        }
        onExecute={() => runEndpoint(endpoint)}
        onClearForm={() => clearEndpointModalForm(endpoint)}
        resultSlot={renderFormResultSlot(endpoint)}
      >
        {renderFormFieldsInner(endpoint)}
      </ParametrosGobernanzaModalFormLayout>
    );
  };

  const pageTitle = isRulesMode ? 'Reglas Tenant' : 'Parametros Gobernanza';
  const pageDescription = isRulesMode
    ? 'Gestiona reglas globales y sincronizacion de permisos desde un flujo enfocado.'
    : 'Administra tenants, permisos y parametros corporativos desde un panel guiado.';
  const activeSectionMeta = SECTION_META[activeSection];
  const ActiveSectionIcon = activeSectionMeta.icon;
  const stats = [
    { label: 'Vistas', value: vistas.length },
    { label: 'Acciones', value: acciones.length },
    { label: 'Tenants', value: tenantGlobales.length },
    { label: 'Contextos', value: contextos.length },
    ...(isRulesMode ? [{ label: 'Reglas', value: availableEndpoints.length }] : []),
  ];

  return (
    <div className="min-h-screen bg-muted/50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted/50 text-foreground">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Panel administrativo
                  </p>
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    {pageTitle}
                  </h1>
                </div>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{pageDescription}</p>
            </div>

            <div className="flex w-full flex-col gap-3 lg:max-w-xl">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {stats.map((item) => (
                  <div key={item.label} className="rounded-md border border-border bg-muted/50 px-3 py-2">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-lg font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={hydrateData}
                disabled={loadingData}
                className="w-full justify-center sm:w-auto sm:self-end"
              >
                {loadingData ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Recargar datos API
              </Button>
            </div>
          </div>
        </section>

        {!isRulesMode && !lockedSection && (
          <div className="grid gap-3 md:grid-cols-3">
            {(['tenant', 'permisos', 'corporativo'] as EndpointSection[]).map((section) => {
              const meta = SECTION_META[section];
              const Icon = meta.icon;
              const selected = activeSection === section;

              return (
                <button
                  key={section}
                  type="button"
                  onClick={() => setActiveSection(section)}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    selected
                      ? 'border-primary/35 bg-primary/5 text-foreground shadow-sm'
                      : 'border-border bg-card text-foreground hover:border-input hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 rounded-md border p-2 ${selected ? 'border-primary/20 bg-card text-primary' : 'border-border bg-muted/50 text-muted-foreground'}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <h2 className="text-sm font-semibold">{meta.label}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">{meta.description}</p>
                      </div>
                    </div>
                    <Badge variant={selected ? 'default' : 'outline'} className="shrink-0 rounded-md">
                      {sectionCounts[section]}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 text-muted-foreground">
                  <ActiveSectionIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {isRulesMode ? 'Flujo de reglas' : activeSectionMeta.label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isRulesMode
                      ? 'Flujo guiado solo para reglas de tenant'
                      : lockedSection === 'permisos'
                      ? 'Flujo guiado solo para gobernanza de permisos'
                      : `${activeSectionMeta.description} ${endpointsBySection.length} endpoints visibles.`}
                  </p>
                </div>
              </div>
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/90" />
                <Input
                  value={endpointSearch}
                  onChange={(e) => setEndpointSearch(e.target.value)}
                  placeholder="Buscar endpoint por nombre, ruta o metodo"
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {activeSection === 'tenant' && visibleTenantPrimaryForms.length > 0 && (
          <div className={`grid gap-6 ${visibleTenantPrimaryForms.length > 1 ? 'xl:grid-cols-2' : ''}`}>
            {visibleTenantPrimaryForms.map((tenantForm) => {
              const esFlujoSA = tenantForm.id === 'tenant-crear-global-admin';
              const disponible = endpointDisponibleParaScope(tenantForm);
              const badgeClass = esFlujoSA
                ? 'border-border bg-muted text-foreground'
                : 'border-sky-200 bg-sky-50 text-sky-700';

              return (
                <Card key={tenantForm.id} className={`border-border bg-card shadow-sm ${disponible ? '' : 'opacity-75'}`}>
                  <CardHeader className="border-b border-border/80 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg font-semibold text-foreground">
                        {isRulesMode ? 'Formulario principal recomendado' : tenantForm.title}
                      </CardTitle>
                      <Badge className={`border ${METHOD_STYLE[tenantForm.method]}`}>{tenantForm.method}</Badge>
                      {!isRulesMode ? <Badge className={`border ${badgeClass}`}>{esFlujoSA ? 'tenantSuperAdmin' : 'Descendencia'}</Badge> : null}
                      {!disponible ? <Badge variant="outline">Solo visible</Badge> : null}
                    </div>
                    <CardDescription>{isRulesMode ? tenantForm.title : tenantForm.description}</CardDescription>
                    {!isRulesMode && !disponible ? (
                      <p className="text-xs font-medium text-amber-600">
                        {esFlujoSA
                          ? 'Ejecutable solo con sesi\u00f3n tenantSuperAdmin en el JWT. El API valida scope y reglas de corporativo (tenantjerarquiacounters).'
                          : 'Tu sesi\u00f3n actual no ejecuta este formulario; el endpoint admite JWT tenantSuperAdmin o tenantGlobal.'}
                      </p>
                    ) : null}
                    <p className="rounded-md border border-border bg-muted/50 p-2 font-mono text-xs text-muted-foreground">{tenantForm.path}</p>
                  </CardHeader>
                  <CardContent className="space-y-4 p-5 pt-0">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button variant="outline" onClick={() => setEndpointModal(tenantForm)}>
                        <Settings2 className="mr-2 h-4 w-4" />
                        Configurar
                      </Button>
                      <Button
                        type="button"
                        onClick={() =>
                          tenantForm.fields.length === 0 ? runEndpoint(tenantForm) : setEndpointModal(tenantForm)
                        }
                        disabled={!!running[tenantForm.id] || !disponible}
                      >
                        {running[tenantForm.id] ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="mr-2 h-4 w-4" />
                        )}
                        Ejecutar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {endpointsBySection.length === 0 ? (
          <Card className="border-dashed border-input bg-card shadow-sm">
            <CardContent className="flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center">
              <Search className="h-5 w-5 text-muted-foreground/90" />
              <p className="text-sm font-medium text-foreground">Sin endpoints para mostrar</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Ajusta la busqueda o cambia de seccion para ver mas opciones.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {endpointsBySection.map((endpoint) => {
              const disponible = endpointDisponibleParaScope(endpoint);

              return (
                <Card
                  key={endpoint.id}
                  className={`border-border bg-card shadow-sm transition-colors hover:border-primary/30 ${endpoint.method === 'GET' ? 'md:col-span-2 xl:col-span-3' : ''} ${disponible ? '' : 'opacity-75'}`}
                >
                  <CardHeader className="space-y-3 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <Badge className={`border ${METHOD_STYLE[endpoint.method]}`}>{endpoint.method}</Badge>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Badge variant="outline" className="rounded-md">{actorBadge(endpoint.actor)}</Badge>
                        {!disponible ? <Badge variant="outline" className="rounded-md">Solo visible</Badge> : null}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-base leading-snug text-foreground">{endpoint.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{endpoint.description}</CardDescription>
                    </div>
                    {!disponible ? (
                      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                        Este bloque pertenece a otro scope y queda disponible solo como referencia.
                      </p>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-4 p-5 pt-0">
                    <p className={`rounded-md border border-border bg-muted/50 p-2 font-mono text-xs text-muted-foreground ${endpoint.method === 'GET' ? '' : 'line-clamp-2'}`}>{endpoint.path}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button variant="outline" onClick={() => setEndpointModal(endpoint)}>
                        <Settings2 className="mr-2 h-4 w-4" />
                        Configurar
                      </Button>
                      <Button onClick={() => endpoint.fields.length === 0 ? runEndpoint(endpoint) : setEndpointModal(endpoint)} disabled={!!running[endpoint.id] || !disponible}>
                        {running[endpoint.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                        Ejecutar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!herenciaDetalle} onOpenChange={(open) => !open && setHerenciaDetalle(null)}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 sm:max-w-5xl">
          <DialogHeader className="border-b border-border px-6 py-4 pr-12">
            <DialogTitle className="text-base text-foreground">Detalle de herencias por usuario/tenant</DialogTitle>
          </DialogHeader>
          {herenciaDetalle ? (
            <div className="max-h-[calc(92vh-72px)] space-y-3 overflow-auto px-6 py-5 text-xs">
              <div className="grid gap-2 md:grid-cols-3">
                <div className="rounded border border-border bg-muted/50 p-2">Usuario: <span className="font-semibold">{String(herenciaDetalle?.usuario || herenciaDetalle?.usuarioId || '-')}</span></div>
                <div className="rounded border border-border bg-muted/50 p-2">Total herencias: <span className="font-semibold">{Number(herenciaDetalle?.totalHerencias || herenciaDetalle?.total || 0)}</span></div>
                <div className="rounded border border-border bg-muted/50 p-2">Tenant globales: <span className="font-semibold">{Array.isArray(herenciaDetalle?.tenantGlobales) ? herenciaDetalle.tenantGlobales.length : 0}</span></div>
              </div>

              <div className="overflow-auto rounded-lg border border-border bg-card">
                <table className="w-full min-w-[980px] text-left text-xs">
                  <thead className="bg-muted text-foreground">
                    <tr>
                      <th className="px-3 py-2">ID</th>
                      <th className="px-3 py-2">TenantGlobal</th>
                      <th className="px-3 py-2">TenantCorporativo</th>
                      <th className="px-3 py-2">Rol</th>
                      <th className="px-3 py-2">Vista(s)</th>
                      <th className="px-3 py-2">Nodo/Formulario</th>
                      <th className="px-3 py-2">Acciones (populate)</th>
                      <th className="px-3 py-2">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(herenciaDetalle?.items) ? herenciaDetalle.items : []).map((row: any, idx: number) => (
                      <tr key={String(row?._id || row?.iud || idx)} className="border-t border-border/80">
                        <td className="px-3 py-2 font-mono">{String(row?._id || row?.iud || '-')}</td>
                        <td className="px-3 py-2">{String(row?.tenantGlobal?._id || row?.tenantGlobal || '-')}</td>
                        <td className="px-3 py-2">{String(row?.tenantCorporativo?._id || row?.tenantCorporativo || '-')}</td>
                        <td className="px-3 py-2">{String(row?.rolId?.rol || row?.rolId?._id || row?.rolId || '-')}</td>
                        <td className="px-3 py-2">
                          {Array.isArray(row?.vistas) && row.vistas.length
                            ? row.vistas.map((v: any) => String(v?.name || v?.path || v?._id || '-')).join(', ')
                            : '-'}
                        </td>
                        <td className="px-3 py-2">
                          {Array.isArray(row?.vistas) && row.vistas.length
                            ? row.vistas
                                .map((v: any) => {
                                  const nodo = String(v?.tipoNodo || '').trim();
                                  const form = String(v?.formulariosConfig || '').trim();
                                  if (nodo && form) return `${nodo}/${form}`;
                                  return nodo || form || '-';
                                })
                                .join(', ')
                            : '-'}
                        </td>
                        <td className="px-3 py-2">
                          {Array.isArray(row?.acciones) && row.acciones.length
                            ? row.acciones.map((a: any) => String(a?.etiquetas || a?.method || a?._id || '-')).join(', ')
                            : '-'}
                        </td>
                        <td className="px-3 py-2">{String(row?.fechaAsignacion || row?.createdAt || '-')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!reglasHerenciaSyncReport} onOpenChange={(open) => !open && setReglasHerenciaSyncReport(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Sincronización reglas y herencia</DialogTitle>
          </DialogHeader>
          {reglasHerenciaSyncReport ? (
            <ul className="list-inside list-disc space-y-2 text-xs text-muted-foreground">
              {reglasHerenciaSyncReport.lineas.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          ) : null}
          <div className="flex justify-end pt-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setReglasHerenciaSyncReport(null)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!endpointModal} onOpenChange={(open) => {
        if (!open) {
          if (endpointModal?.id === 'tenant-actualizar-global-reglas') {
            setTenantFilterByEndpoint((prev) => { const next = { ...prev }; delete next['tenant-actualizar-global-reglas']; return next; });
            setDeltaByEndpoint((prev) => { const next = { ...prev }; delete next['tenant-actualizar-global-reglas']; return next; });
          }
          setEndpointModal(null);
          if (syncRouteWithEndpoint) {
            lastOpenedRouteEndpointRef.current = undefined;
            onRouteEndpointClear?.();
          }
        }
      }}>
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-4xl">
          {endpointModal && (
            <>
              <DialogHeader className="border-b border-border px-6 py-4 pr-12">
                <DialogTitle className="flex items-center gap-2 text-base text-foreground">
                  <Shield className="h-5 w-5 text-muted-foreground" /> {endpointModal.title}
                </DialogTitle>
                <p className="font-mono text-xs text-muted-foreground">{endpointModal.path}</p>
              </DialogHeader>
              <div className="max-h-[calc(92vh-92px)] overflow-auto px-6 py-5">
                {renderForm(endpointModal)}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ParametrosGobernanza;






