import React, { useEffect, useMemo, useState } from 'react';
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

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type EndpointSection = 'tenant' | 'permisos' | 'corporativo';
type EndpointActor = 'tenantSuperAdmin' | 'tenantGlobal' | 'ambos';
type FieldType = 'text' | 'textarea' | 'json' | 'id' | 'permisos' | 'context';

type FieldSpec = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  header?: boolean;
  pathParam?: boolean;
};

type EndpointSpec = {
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

interface ParametrosGobernanzaProps {
  mode?: 'full' | 'rules' | 'superAdmin' | 'superAdminRules';
  initialSection?: EndpointSection;
  lockedSection?: EndpointSection | null;
}

const SUPERADMIN_RULES_ENDPOINT_IDS = new Set([
  'tenant-crear-global-reglas',
  'tenant-listar-reglas',
  'tenant-actualizar-global-reglas',
  'tenant-desactivar-global-reglas',
  'tenant-eliminar-global-reglas',
]);

const RULES_ENDPOINT_IDS = new Set([
  'tenant-crear-global-reglas',
  'tenant-listar-reglas',
  'tenant-actualizar-global-reglas',
  'tenant-desactivar-global-reglas',
  'tenant-eliminar-global-reglas',
]);

type Vista = { id: string; label: string; path: string };
type Accion = { id: string; label: string; method: string };
type TenantGlobal = {
  id: string;
  label: string;
  corporativo: string;
  tenantSuperAdmin?: string;
  tenantGlobalAdmin?: string;
};
type PermisoItem = { vistaId: string; accionId: string[] };
type ReglaOption = { id: string; label: string };
type ContextOption = { id: string; label: string };
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
]);

const ENDPOINTS: EndpointSpec[] = [
  { id: 'tenant-listar-libres', section: 'tenant', actor: 'ambos', method: 'GET', path: '/api/config/global/creacion/usu/tenant/libres', title: 'Listar tenants visibles', description: 'Listado de tenants visibles para el usuario autenticado.', fields: [] },
  {
    id: 'tenant-listar-libres-superadmin',
    section: 'tenant',
    actor: 'tenantSuperAdmin',
    method: 'GET',
    path: '/api/config/global/creacion/usu/tenant/libres',
    title: 'Listar tenantGlobales desde tenantSuperAdmin',
    description: 'Consulta los tenantGlobales visibles dentro de la jerarquÃ­a del tenantSuperAdmin autenticado.',
    fields: [],
  },
  {
    id: 'tenant-listar-libres-tenantglobal',
    section: 'tenant',
    actor: 'tenantGlobal',
    method: 'GET',
    path: '/api/config/global/creacion/usu/tenant/libres',
    title: 'Listar rama visible desde tenantGlobal',
    description: 'Consulta tu tenantGlobal y su rama descendente visible segÃºn el JWT autenticado.',
    fields: [],
  },
  {
    id: 'tenant-crear-global-usuario',
    section: 'tenant',
    actor: 'tenantGlobal',
    method: 'POST',
    path: '/api/config/global/creacion/usu/tenant/global',
    title: 'Crear tenant global desde tenantGlobal',
    description: 'Flujo puro tenantGlobal sobre su propia rama descendente.',
    fields: [
      { name: 'nvlGeneracionTenant', label: 'Nivel generacion tenant', type: 'id', required: true },
      { name: 'tipo_tenant', label: 'Tipo tenant', type: 'id', required: true },
      { name: 'coporativo', label: 'Corporativo (empresa)', type: 'id' },
      { name: 'tenantGlobalRef', label: 'Tenant global ref', type: 'id' },
      { name: 'ownerType', label: 'Owner type', type: 'id', required: true },
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
    path: '/api/config/global/creacion/admin/tenant/global',
    title: 'Crear tenant global desde tenantSuperAdmin',
    description: 'Flujo tenantSuperAdmin -> tenantGlobal dentro de su jerarquÃ­a.',
    fields: [
      { name: 'nvlGeneracionTenant', label: 'Nivel generacion tenant', type: 'id', required: true },
      { name: 'tipo_tenant', label: 'Tipo tenant', type: 'id', required: true },
      { name: 'coporativo', label: 'Corporativo (empresa)', type: 'id' },
      { name: 'tenantGlobalRef', label: 'Tenant global ref', type: 'id' },
      { name: 'apis', label: 'Apis dominios', type: 'id', required: true },
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
    title: 'Asignar permisos heredados',
    description: 'Flujo para tenantSuperAdmin (DIOS).',
    fields: [
      { name: 'tenantGlobal', label: 'Tenant global', type: 'id', required: true },
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
    id: 'perm-admin-tenant-global-actualizar',
    section: 'permisos',
    actor: 'ambos',
    method: 'PUT',
    path: '/api/config/permisos/creacion/admin/tenant/global/:id',
    title: 'Actualizar herencia admin/global',
    description: 'Actualiza una herencia por id.',
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
const isTenantSuperAdminScopeOption = (value: string): boolean =>
  String(value || '').trim().startsWith(TENANT_SUPERADMIN_SCOPE_PREFIX);

const ParametrosGobernanza: React.FC<ParametrosGobernanzaProps> = ({
  mode = 'full',
  initialSection = 'tenant',
  lockedSection = null,
}) => {
  const isRulesMode = mode === 'rules' || mode === 'superAdminRules';
  const initialResolvedSection = lockedSection ?? initialSection;
  const [activeSection, setActiveSection] = useState<EndpointSection>(initialResolvedSection);
  const [endpointModal, setEndpointModal] = useState<EndpointSpec | null>(null);
  const [endpointSearch, setEndpointSearch] = useState('');
  const [reglasSearch, setReglasSearch] = useState('');
  const [reglasTenantFilter, setReglasTenantFilter] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<Record<string, string>>({});
  const [resultData, setResultData] = useState<Record<string, any>>({});
  const [formData, setFormData] = useState<Record<string, Record<string, string>>>({});
  const [permisoData, setPermisoData] = useState<Record<string, PermisoItem[]>>({});
  const [tenantGlobales, setTenantGlobales] = useState<TenantGlobal[]>([]);
  const [vistas, setVistas] = useState<Vista[]>([]);
  const [acciones, setAcciones] = useState<Accion[]>([]);
  const [reglas, setReglas] = useState<ReglaOption[]>([]);
  const [contextos, setContextos] = useState<ContextOption[]>([]);
  const [ruleCatalog, setRuleCatalog] = useState<Record<string, any>>({});
  const [heredaGlobalOptions, setHeredaGlobalOptions] = useState<HeredaGlobalOption[]>([]);
  const [heredaGlobalScopeById, setHeredaGlobalScopeById] = useState<Record<string, HeredaScope>>({});
  const [catalogSelection, setCatalogSelection] = useState<Record<string, CatalogSelection>>({});
  const [bulkAllMode, setBulkAllMode] = useState<Record<string, boolean>>({});
  const [tenantCorporativos, setTenantCorporativos] = useState<TenantCorporativoOption[]>([]);
  const [tenantGlobalSelects, setTenantGlobalSelects] = useState<Record<string, GenericSelectOption[]>>({});
  const [tenantGlobalActor, setTenantGlobalActor] = useState<{ rol?: string; tenantGlobalId?: string | null; tenantSuperAdminId?: string | null; tenantCorporativoId?: string | null }>({});
  const [tenantGlobalSelectsDebug, setTenantGlobalSelectsDebug] = useState<string>('');
  const [tenantCorpLoadingByEndpoint, setTenantCorpLoadingByEndpoint] = useState<Record<string, boolean>>({});
  const [tenantCorpErrorByEndpoint, setTenantCorpErrorByEndpoint] = useState<Record<string, string>>({});
  const [herenciasUsuario, setHerenciasUsuario] = useState<any[]>([]);
  const [herenciasExistentesPorTG, setHerenciasExistentesPorTG] = useState<Record<string, any[]>>({});
  const [herenciaAsociadaOptionsByEndpoint, setHerenciaAsociadaOptionsByEndpoint] = useState<Record<string, GenericSelectOption[]>>({});
  const [herenciaAsociadaDataByEndpoint, setHerenciaAsociadaDataByEndpoint] = useState<Record<string, Record<string, any>>>({});
  const [syncInfoByEndpoint, setSyncInfoByEndpoint] = useState<Record<string, any>>({});
  const [syncRunningByEndpoint, setSyncRunningByEndpoint] = useState<Record<string, boolean>>({});
  const [herenciaDetalle, setHerenciaDetalle] = useState<any | null>(null);
  const [rutasJerarquia, setRutasJerarquia] = useState<NodoRuta[]>([]);
  const [suiteSelByEndpoint, setSuiteSelByEndpoint] = useState<Record<string, string>>({});
  const [expandedModulos, setExpandedModulos] = useState<Set<string>>(new Set());
  const [usuariosDestinoSel, setUsuariosDestinoSel] = useState<Record<string, string[]>>({});
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<Record<string, { id: string; label: string }[]>>({});
  const [loadingUsuarios, setLoadingUsuarios] = useState<Record<string, boolean>>({});
  const [catalogSeedRunning, setCatalogSeedRunning] = useState(false);
  const [catalogItems, setCatalogItems] = useState<{ iud: string; tipo_comprador: string; sigla: string; esDefault: boolean }[]>([]);
  const [catalogItemsLoaded, setCatalogItemsLoaded] = useState(false);

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
    if (isRulesMode) return tenantPrimaryForms.rules ? [tenantPrimaryForms.rules] : [];

    // modo superAdmin: solo muestra el flujo puro tenantGlobal (trasladado desde Gobernanza)
    if (mode === 'superAdmin') {
      return tenantPrimaryForms.tenantGlobal ? [tenantPrimaryForms.tenantGlobal] : [];
    }

    // modo full: solo muestra el flujo tenantSuperAdmin -> tenantGlobal
    const items = [];
    if (tenantPrimaryForms.superAdmin) items.push(tenantPrimaryForms.superAdmin);
    return items;
  }, [isRulesMode, mode, tenantPrimaryForms]);

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
      // flujo SA->TG en modo full: también ejecutable por tenantGlobal
      if (mode === 'full' && endpoint.id === 'tenant-crear-global-admin') {
        return actorTieneScopeTenantSuperAdmin || actorTieneGlobal;
      }
      return actorTieneScopeTenantSuperAdmin;
    }
    if (endpoint.actor === 'tenantGlobal') {
      // en modo superAdmin este flujo lo ejecuta solo el DIOS (SA sin global)
      if (mode === 'superAdmin') return actorTieneScopeTenantSuperAdmin && !actorTieneGlobal;
      return actorTieneScopeTenantGlobal;
    }
    return false;
  };
  const availableEndpoints = useMemo(
    () =>
      mode === 'rules'
        ? ENDPOINTS.filter((endpoint) => RULES_ENDPOINT_IDS.has(endpoint.id))
        : mode === 'superAdminRules'
          ? ENDPOINTS.filter((endpoint) => SUPERADMIN_RULES_ENDPOINT_IDS.has(endpoint.id))
          : mode === 'superAdmin'
            ? ENDPOINTS.filter((endpoint) => endpoint.actor === 'tenantSuperAdmin' && !RULES_ENDPOINT_IDS.has(endpoint.id) && !HIDDEN_ENDPOINT_IDS.has(endpoint.id))
            : ENDPOINTS.filter((endpoint) => !RULES_ENDPOINT_IDS.has(endpoint.id) && !HIDDEN_ENDPOINT_IDS.has(endpoint.id)),
    [mode]
  );
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
    return availableEndpoints.filter((e) => e.section === activeSection && !e.primary)
      .filter((e) => {
        if (activeSection === 'tenant' && (e.id === 'tenant-listar-libres-superadmin' || e.id === 'tenant-listar-libres-tenantglobal')) {
          return true;
        }
        if (e.actor === 'tenantSuperAdmin' && !esSA) return false;
        if (e.actor === 'tenantGlobal' && !esTG) return false;
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
  }, [activeSection, endpointSearch, tenantGlobalActor, availableEndpoints]);

  const hydrateData = async () => {
    setLoadingData(true);
    try {
      let actorTenantSuperAdminId = '';
      let actorTenantGlobalId = '';
      let vistasResolved: Vista[] = [];
      let accionesResolved: Accion[] = [];

      const [selectsRes, tenantsRes, rutasRes, accionesRes, herenciasRes, reglasRes, tenantsDestinoRes, contextosRes, tenantCorpRes, jerarquiaRes] = await Promise.allSettled([
        apiFetch('/api/config/global/creacion/usu/tenant/global/selects', { method: 'GET' }),
        apiFetch('/api/config/global/creacion/usu/tenant/libres', { method: 'GET' }),
        apiFetch('/api/config/tenant/tipo/listar/vistas/contexto/roles', { method: 'GET' }),
        apiFetch('/api/config/parametrizacion/widget/branding/acciones', { method: 'GET' }),
        apiFetch('/api/config/permisos/listar/usu/tenant/libres', { method: 'GET' }),
        apiFetch('/api/config/tenant/listar/reglas', { method: 'GET' }),
        apiFetch('/api/config/tenant/tipo/listar/globales/contexto/roles', { method: 'GET' }),
        apiFetch('/api/config/tenant/tipo/api/contexto', { method: 'GET' }),
        apiFetch('/api/config/permisos/creacion/admin/tenant/corporativos', { method: 'GET' }),
        apiFetch('/api/seguridad/rutas/listarRutas/arbol/admin', { method: 'GET' }),
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
          tenantGlobalRef: (Array.isArray(data.tenantGlobalesRegistrados) ? data.tenantGlobalesRegistrados : [])
            .map((row: any) => {
              const id = String(row?.id || row?._id || '').trim();
              if (!id) return null;
              const rol = String(row?.rol || 'TENANT').trim();
              const corp = String(row?.coporativoNombre || '').trim();
              const suffix = corp ? ` | ${corp}` : '';
              return { id, label: `${rol} | ${id}${suffix}` };
            })
            .filter(Boolean) as GenericSelectOption[],
        });
        setTenantGlobalSelectsDebug(
          `Selects: niveles-config=${Array.isArray(data.nivelesGlobales) ? data.nivelesGlobales.length : 0}, tipos=${Array.isArray(data.tiposTenant) ? data.tiposTenant.length : 0}, dominios=${Array.isArray(data.dominios) ? data.dominios.length : 0}, acciones=${Array.isArray(data.acciones) ? data.acciones.length : 0}, roles=${rawRolesMabs.length}, corporativos=${Array.isArray(data.corporativosDisponibles) ? data.corporativosDisponibles.length : 0}`
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
        setTenantGlobalSelectsDebug(`Error selects: ${msg}`);
      }

      {
        const allById = new Map<string, TenantGlobal>();

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
              tenantSuperAdmin: String(row?.tenantSuperAdmin || '').trim() || undefined,
              tenantGlobalAdmin: String(row?.tenantGlobalAdmin || '').trim() || undefined,
            });
          });
        }

        // Fallback solo si el endpoint de contexto no trae data.
        if (!allById.size && tenantsRes.status === 'fulfilled') {
          const rows = pickArray(tenantsRes.value, ['data', 'items', 'tenants']);
          rows.forEach((row: any) => {
            const id = String(row?._id || row?.iud || row?.tenantGlobalId || row?.id || '').trim();
            if (!id) return;
            const label = String(
              row?.name ||
              row?.nombre ||
              row?.titulo ||
              row?.coporativo?.razon_social ||
              row?.coporativo?.titulo ||
              id
            );
            allById.set(id, {
              id,
              label,
              corporativo: pickTenantCorporate(row),
              tenantSuperAdmin: String(row?.tenantSuperAdmin || '').trim() || undefined,
              tenantGlobalAdmin: String(row?.tenantGlobalAdmin || '').trim() || undefined,
            });
          });
        }

        setTenantGlobales(Array.from(allById.values()));
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
                  contextoMap.set(cid, { id: cid, label: `${cname} | ${cid}` });
                });
                if (ridRaw && !heredaOptionsMap.has(ridRaw)) {
                  heredaOptionsMap.set(ridRaw, { id: ridRaw, label: `[REGLA] ${base} | ${ridRaw}` });
                  heredaScopeMap[ridRaw] = r?.securityPlatform === true ? 'tenantSuperAdmin' : 'tenantGlobal';
                }
                return rid ? { id: rid, label: `[${platformFlag}] ${base} | ${ridEncrypted || ridRaw}` } : null;
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
            return id ? { id, label: `${nombre} | ${id}` } : null;
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
    const unicaOpcionCorporativa = tenantGlobalSelects.coporativo?.length === 1
      ? tenantGlobalSelects.coporativo[0]
      : null;

    if (!actorEsSoloTenantGlobal || !unicaOpcionCorporativa) return;

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

        if (String(current.coporativo || '').trim() === unicaOpcionCorporativa.id) return;

        next[endpointId] = {
          ...current,
          coporativo: unicaOpcionCorporativa.id,
        };
        changed = true;
      });

      return changed ? next : prev;
    });
  }, [tenantGlobalActor, tenantGlobalSelects.coporativo, tenantGlobalSelects.nvlGeneracionTenant]);
  useEffect(() => {
    const endpointId = 'tenant-actualizar-global';
    const selectedId = String(formData?.[endpointId]?.id || '').trim();
    if (!selectedId) return;
    if (tenantUpdateTargets.some((opt) => opt.id === selectedId)) return;
    setFieldValue(endpointId, 'id', '');
  }, [formData, tenantUpdateTargets]);
  const getCatalogSelection = (endpointId: string): CatalogSelection =>
    catalogSelection[endpointId] ?? { vistas: [], acciones: [] };
  const setCatalogSelectionFor = (endpointId: string, next: CatalogSelection) => {
    setCatalogSelection((prev) => ({ ...prev, [endpointId]: next }));
  };
  const toggleCatalogItem = (endpointId: string, key: 'vistas' | 'acciones', id: string, checked: boolean) => {
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
  const getCatalogoVistaIdsRelacionadas = (endpointId: string, suiteId = ''): string[] => {
    const { vistasCatalogo } = getPermisosCatalog(endpointId);
    const heredaSelVal =
      getFieldValue(endpointId, 'heredaGlobal').trim() ||
      getFieldValue(endpointId, 'herenciaAsociada').trim();
    const esReglaSeleccionada = !!heredaSelVal && !!ruleCatalog[heredaSelVal];
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
        // El tenant ya tiene herencia parametrizada â€” mostrar esa (y solo esa)
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
          // El modelo reglas no tiene campo nombre â€” se deriva del rolesMabs.rol del primer tenantGlobal asignado
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

      // 3. Sin herencia directa ni reglas â†’ usar herencias del JWT (scope SA sin tenantGlobal asignado)
      const seen = new Set<string>();
      const herenciasJWT: HeredaGlobalOption[] = [];
      herenciasUsuario.forEach((h: any) => {
        const hTg = String(h?.tenantGlobal?._id || h?.tenantGlobal || '').trim();
        if (hTg) return; // solo las del SA (sin TG asignado)
        const hId = String(h?.iud || h?._id || '').trim();
        if (!hId || seen.has(hId)) return;
        seen.add(hId);
        const vCount = Array.isArray(h?.vistas) ? h.vistas.length : 0;
        const aCount = Array.isArray(h?.acciones) ? h.acciones.length : 0;
        herenciasJWT.push({ id: hId, label: `Herencia JWT | Vistas:${vCount} | Acciones:${aCount}` });
      });
      return herenciasJWT;
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
      // herenciaGlobal records del TG no tienen heredaGlobal â€” usar su propio _id
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

  const cargarUsuariosParaEndpoint = async (endpointId: string, tenantGlobalId: string) => {
    setLoadingUsuarios((prev) => ({ ...prev, [endpointId]: true }));
    try {
      const jerarquia: any = await apiFetch('/api/registro/jerarquia/usuarios', { method: 'GET' });
      const tgId = String(tenantGlobalId || '').trim();
      const lista: { id: string; label: string }[] = [];

      const extraerDeNodo = (nodo: any) => {
        const uArr = Array.isArray(nodo?.usuarios) ? nodo.usuarios : [];
        uArr.forEach((u: any) => {
          const id = String(u?.iud || u?._id || '').trim();
          if (!id) return;
          const correo = String(u?.correo || '').trim();
          const rol = String(u?.rol || '').trim();
          lista.push({ id, label: correo ? `${correo}${rol ? ` | ${rol}` : ''}` : id });
        });
        const hijos = Array.isArray(nodo?.hijos) ? nodo.hijos : [];
        hijos.forEach(extraerDeNodo);
        const corps = Array.isArray(nodo?.corporativos) ? nodo.corporativos : [];
        corps.forEach(extraerDeNodo);
      };

      const tgRows: any[] = Array.isArray(jerarquia?.tenantsGlobales) ? jerarquia.tenantsGlobales : [];
      if (tgId) {
        const tgMatch = tgRows.find((tg: any) => String(tg?.tenantGlobal?.iud || tg?.tenantGlobal?._id || '').trim() === tgId);
        if (tgMatch) extraerDeNodo(tgMatch);
      } else {
        tgRows.forEach(extraerDeNodo);
      }

      // Deduplicar por id
      const unicos = Array.from(new Map(lista.map((u) => [u.id, u])).values());
      setUsuariosDisponibles((prev) => ({ ...prev, [endpointId]: unicos }));
    } catch (_e) {
      setUsuariosDisponibles((prev) => ({ ...prev, [endpointId]: [] }));
    } finally {
      setLoadingUsuarios((prev) => ({ ...prev, [endpointId]: false }));
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
      endpointId === 'perm-admin-tenant-global-actualizar' ||
      endpointId === 'perm-admin-tenant-global-desactivar' ||
      endpointId === 'perm-admin-tenant-global-eliminar' ||
      endpointId === 'perm-listar-herencias';

    if (!isHerenciaEndpoint) return tenantGlobales;

    const expandByTree = (seedIds: string[]): Set<string> => {
      const allowed = new Set(seedIds.filter(Boolean));
      let changed = true;
      while (changed) {
        changed = false;
        tenantGlobales.forEach((t) => {
          const id = String(t.id || '').trim();
          const parent = String(t.tenantGlobalAdmin || '').trim();
          if (!id || !parent) return;
          if (allowed.has(parent) && !allowed.has(id)) {
            allowed.add(id);
            changed = true;
          }
        });
      }
      return allowed;
    };

    // Condicion principal: rol DIOS (tenantSuperAdmin) controla su arbol de tenantGlobal.
    if (actorTenantSuper) {
      const roots = tenantGlobales
        .filter((t) => String(t.tenantSuperAdmin || '').trim() === actorTenantSuper)
        .map((t) => String(t.id || '').trim())
        .filter(Boolean);
      const allowed = expandByTree(roots);
      const visibles = tenantGlobales.filter((t) => allowed.has(String(t.id || '').trim()));
      const scopeOption: TenantGlobal = {
        id: `${TENANT_SUPERADMIN_SCOPE_PREFIX}${actorTenantSuper}`,
        label: `tenantSuperAdmin (DIOS) | ${actorTenantSuper}`,
        corporativo: 'SCOPE_DIOS',
        tenantSuperAdmin: actorTenantSuper,
      };
      const base = visibles.length ? visibles : tenantGlobales;
      return [scopeOption, ...base];
    }

    if (actorTenantGlobal) {
      // Para actualizar: TG solo puede gestionar herencias de su propio TG
      if (endpointId === 'perm-admin-tenant-global-actualizar') {
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
        if (endpointId === 'perm-admin-tenant-global-actualizar') {
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
  const applyHerenciaAsociadaSelection = (endpointId: string, herenciaId: string) => {
    const byId = herenciaAsociadaDataByEndpoint[endpointId] || {};
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
  const fetchHerenciasAsociadasByTenantGlobal = async (endpointId: string, tenantGlobalId: string) => {
    try {
      const tgSelection = String(tenantGlobalId || '').trim();
      if (!tgSelection) {
        setHerenciaAsociadaOptionsByEndpoint((prev) => ({ ...prev, [endpointId]: [] }));
        setHerenciaAsociadaDataByEndpoint((prev) => ({ ...prev, [endpointId]: {} }));
        setFieldValue(endpointId, 'herenciaAsociada', '');
        return;
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
      const rows = pickArray(res, ['data', 'items', 'herencias']).filter((row: any) => {
        if (!tg) return true;
        const rowTg = getEntityId(row?.tenantGlobal);
        return rowTg === tg;
      });
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

      setHerenciaAsociadaOptionsByEndpoint((prev) => ({ ...prev, [endpointId]: options }));
      setHerenciaAsociadaDataByEndpoint((prev) => ({ ...prev, [endpointId]: byId }));

      const current = getFieldValue(endpointId, 'herenciaAsociada').trim();
      const nextId = (!current || !options.some((o) => o.id === current)) ? (options[0]?.id || '') : current;
      setFieldValue(endpointId, 'herenciaAsociada', nextId);
      if (nextId) applyHerenciaAsociadaSelection(endpointId, nextId);
    } catch (error: any) {
      const msg = String(error?.message || 'No se pudieron cargar herencias asociadas').trim();
      toast.error(msg);
      setHerenciaAsociadaOptionsByEndpoint((prev) => ({ ...prev, [endpointId]: [] }));
      setHerenciaAsociadaDataByEndpoint((prev) => ({ ...prev, [endpointId]: {} }));
      setFieldValue(endpointId, 'herenciaAsociada', '');
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

    const puedeSeleccionarVista = endpointId === 'perm-admin-tenant-global-desactivar';
    const vistaObjetivoId = getFieldValue(endpointId, 'vistaObjetivoId').trim();

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
    const usuarioHerencia = String(
      row?.usuarioId?.nombre || row?.usuarioId?.name || row?.usuarioId?.correo || row?.usuarioId?._id || '-'
    ).trim();

    const renderVistaItem = (vista: VistaItem) => (
      <label
        key={vista.id}
        className={`flex items-start gap-2 rounded border px-2 py-1.5 text-xs ${puedeSeleccionarVista ? 'cursor-pointer' : ''} ${puedeSeleccionarVista && vistaObjetivoId === vista.id ? 'border-rose-300 bg-rose-100' : 'border-slate-100 bg-slate-50'}`}
      >
        {puedeSeleccionarVista && (
          <input
            type="radio"
            className="mt-0.5 shrink-0"
            name={`${endpointId}-vista-objetivo`}
            checked={vistaObjetivoId === vista.id}
            onChange={() => setFieldValue(endpointId, 'vistaObjetivoId', vista.id)}
            onClick={() => { if (vistaObjetivoId === vista.id) setFieldValue(endpointId, 'vistaObjetivoId', ''); }}
          />
        )}
        <div>
          <p className="font-medium text-slate-800">{vista.label}</p>
          {vista.path && <p className="text-slate-400">{vista.path}</p>}
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
        <div className="mb-3 grid gap-2 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-600 md:grid-cols-2">
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
            <span className="font-medium text-slate-700">Jerarquia:</span> {suiteSummary}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {/* â”€â”€ Panel Vistas agrupadas por Suite â†’ MÃ³dulo â”€â”€ */}
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Vistas parametrizadas</p>
            {vistasDetalle.length === 0 ? (
              <p className="text-xs text-slate-500">Sin vistas parametrizadas.</p>
            ) : (
              <div className="max-h-64 overflow-auto space-y-3 pr-1">
                {/* Vistas agrupadas por suite */}
                {Array.from(suiteGroups.entries()).map(([suiteId, sg]) => (
                  <div key={suiteId}>
                    <p className="mb-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">{sg.suiteName}</p>
                    {Array.from(sg.modulos.entries()).map(([mKey, mg]) => (
                      <div key={mKey} className="ml-2 mb-1">
                        {mg.moduloName && mKey !== '__direct__' && (
                          <p className="mb-0.5 text-xs font-semibold text-slate-500 pl-1">{mg.moduloName}</p>
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
            {puedeSeleccionarVista && (
              <div className="mt-2 space-y-1">
                {vistaObjetivoId ? (
                  <div className="flex items-center justify-between gap-2 rounded bg-amber-50 border border-amber-200 px-2 py-1">
                    <p className="text-xs text-amber-700 font-medium">Modo: quitar solo esa vista</p>
                    <button type="button" className="text-xs text-amber-700 underline shrink-0" onClick={() => setFieldValue(endpointId, 'vistaObjetivoId', '')}>
                      Desactivar herencia completa
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-rose-600 font-medium">Modo: desactivar herencia completa (DELETE)</p>
                )}
                <p className="text-xs text-slate-400">Clic en el radio seleccionado para deseleccionar.</p>
              </div>
            )}
          </div>
          {/* â”€â”€ Panel Acciones â”€â”€ */}
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Acciones parametrizadas</p>
            {accionesDetalle.length ? (
              <div className="max-h-64 space-y-1 overflow-auto pr-1">
                {accionesDetalle.map((accion: { id: string; label: string; method: string }) => (
                  <div key={accion.id} className="rounded border border-slate-100 bg-slate-50 px-2 py-1.5">
                    <p className="text-sm font-medium text-slate-800">{accion.label}</p>
                    {accion.method && <p className="text-xs text-slate-500">{accion.method}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Sin acciones parametrizadas.</p>
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
        return { vistasCatalogo: Array.from(vistasMap.values()), accionesCatalogo: Array.from(accionesMap.values()) };
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
        // Sin herencia con datos: catÃ¡logo vacÃ­o (TG no puede usar catÃ¡logo SA)
        return { vistasCatalogo: [], accionesCatalogo: [] };
      }

      // SA scope: buscar primero por _id directo (herenciaGlobal directa del tenant)
      // y como fallback por campo h.heredaGlobal (referencia a regla â€” estilo antiguo)
      const herenciaDirectaSA = herenciasUsuario.find((h: any) =>
        String(h?.iud || h?._id || '').trim() === selectedHeredaGlobal
      );
      const herenciaConDatos = herenciaDirectaSA || herenciasUsuario.find((h: any) => {
        const heredaId = String(h?.heredaGlobal?._id || h?.heredaGlobal || '').trim();
        return heredaId === selectedHeredaGlobal && Array.isArray(h?.vistas) && h.vistas.length > 0;
      });

      if (herenciaConDatos) {
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

      // Last resort: if vistas state is populated, expose all vistas so the admin can select
      if (vistas.length) {
        return { vistasCatalogo: vistas, accionesCatalogo: acciones };
      }

      return { vistasCatalogo: [], accionesCatalogo: [] };
    }

    if (endpointId === 'perm-admin-tenant-global') {
      const byId = herenciaAsociadaDataByEndpoint[endpointId] || {};
      const selectedHerenciaId = getFieldValue(endpointId, 'herenciaAsociada').trim();
      const row = byId[selectedHerenciaId] || (Object.keys(byId).length ? byId[Object.keys(byId)[0]] : null);

      if (!row) return { vistasCatalogo: [], accionesCatalogo: [] };

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

    // Actualizar herencia admin/global: priorizar catalogo de la herencia seleccionada
    // (contexto resuelto desde JWT + tenant + herencia asociada).
    if (endpointId === 'perm-admin-tenant-global-actualizar') {
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

    if (endpointId === 'tenant-crear-global-reglas' || endpointId === 'tenant-actualizar-global-reglas') {
      const tenantGlobalId = getFieldValue(endpointId, 'tenantGlobal').trim();
      if (!tenantGlobalId) return { vistasCatalogo: vistas, accionesCatalogo: acciones };

      const tenantSel = tenantGlobales.find((t) => t.id === tenantGlobalId);
      let superAdminRef = String(tenantSel?.tenantSuperAdmin || '').trim();
      if (!superAdminRef) {
        const parentTenantId = String(tenantSel?.tenantGlobalAdmin || '').trim();
        if (parentTenantId) {
          const tenantPadre = tenantGlobales.find((t) => t.id === parentTenantId);
          superAdminRef = String(tenantPadre?.tenantSuperAdmin || '').trim();
        }
      }
      if (!superAdminRef) return { vistasCatalogo: vistas, accionesCatalogo: acciones };

      const reglasRows = Object.values(ruleCatalog || {});
      const reglaDios = reglasRows.find((r: any) => {
        if (r?.securityPlatform !== true) return false;
        const gens = Array.isArray(r?.generacionTenatGlobales) ? r.generacionTenatGlobales : [];
        return gens.some((g: any) => String(g?._id || g || '').trim() === superAdminRef);
      }) as any;

      if (!reglaDios) return { vistasCatalogo: vistas, accionesCatalogo: acciones };

      const recursoIds = Array.isArray(reglaDios?.recurso)
        ? reglaDios.recurso.map((v: any) => String(v?._id || v || '').trim()).filter(Boolean)
        : [];
      const accionIds = Array.isArray(reglaDios?.accionesUsu)
        ? reglaDios.accionesUsu.map((a: any) => String(a?._id || a || '').trim()).filter(Boolean)
        : [];

      if (!recursoIds.length) return { vistasCatalogo: vistas, accionesCatalogo: acciones };

      const accionById = new Map(acciones.map((a) => [a.id, a]));

      const vistasDesdeRegla = resolveVistaCatalogByIds(recursoIds);
      const accionesDesdeRegla = accionIds.length
        ? accionIds.map((id: string) => accionById.get(id) || { id, label: id, method: '' })
        : acciones;

      return { vistasCatalogo: vistasDesdeRegla, accionesCatalogo: accionesDesdeRegla };
    }

    if (endpointId !== 'perm-admin-tenant-global' && endpointId !== 'perm-admin-tenant-global-actualizar') {
      return { vistasCatalogo: vistas, accionesCatalogo: acciones };
    }

    const tenantGlobalId = getFieldValue(endpointId, 'tenantGlobal').trim();
    if (!tenantGlobalId) return { vistasCatalogo: vistas, accionesCatalogo: acciones };

    const vistaPermitida = new Set<string>();
    const accionPermitida = new Set<string>();
    const actorTenantGlobal = String(tenantGlobalActor.tenantGlobalId || '').trim();
    const actorTenantSuper = String(tenantGlobalActor.tenantSuperAdminId || '').trim();

    const getId = (value: any): string => String(value?._id || value || '').trim();
    const matchesSuperAdminContext = (h: any): boolean => {
      if (!actorTenantSuper) return false;
      const tenantSuperH = String(h?.tenantSuperTenant?._id || h?.tenantSuperTenant || '').trim();
      return tenantSuperH === actorTenantSuper;
    };
    const matchesGlobalContext = (h: any): boolean => {
      if (!actorTenantGlobal) return false;
      const tgH = getId(h?.tenantGlobal);
      return tgH === actorTenantGlobal;
    };
    const matchesTargetTenant = (h: any): boolean => {
      const tgH = getId(h?.tenantGlobal);
      return tgH === tenantGlobalId;
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

    // Para flujo de herencia admin/global: sin herencia efectiva en ese tenant, no se expone catalogo.
    if (!vistaPermitida.size || !accionPermitida.size) {
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

  const applyRuleToForm = (endpointId: string, ruleId: string) => {
    const rule = ruleCatalog[ruleId];
    if (!rule) return;

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
    if (!current && reglas.length > 0) {
      const firstId = reglas[0].id;
      setFieldValue(endpointModal.id, 'x-regla-id', firstId);
      applyRuleToForm(endpointModal.id, firstId);
    }
  }, [endpointModal, reglas.length]);

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
        tenantGlobales.length === 0 ||
        (endpointModal.id === 'tenant-actualizar-global' && tenantUpdateTargets.length === 0);
      if (needsBootstrap) {
        hydrateData();
      }
      return;
    }
    if (!needsTenantGlobal) return;
    if (tenantGlobales.length === 0 && !loadingData) {
      hydrateData();
    }
  }, [endpointModal, tenantGlobales.length, loadingData, tenantGlobalSelectsLoaded, tenantUpdateTargets.length]);

  useEffect(() => {
    if (!endpointModal) return;
    const isHerenciaEndpoint =
      endpointModal.id === 'perm-admin-tenant-global' ||
      endpointModal.id === 'perm-admin-tenant-global-actualizar' ||
      endpointModal.id === 'perm-admin-tenant-global-desactivar' ||
      endpointModal.id === 'perm-admin-tenant-global-eliminar' ||
      endpointModal.id === 'perm-listar-herencias';
    if (!isHerenciaEndpoint) return;
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
      if (endpointModal.id === 'perm-admin-tenant-global-actualizar' && fallback.length === 1) {
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
    const isHerenciaEndpoint =
      endpointId === 'perm-admin-tenant-global' ||
      endpointId === 'perm-admin-tenant-global-actualizar' ||
      endpointId === 'perm-admin-tenant-global-desactivar' ||
      endpointId === 'perm-admin-tenant-global-eliminar' ||
      endpointId === 'perm-listar-herencias';
    if (!isHerenciaEndpoint || loadingData) return;

    const currentTenantGlobal = getFieldValue(endpointId, 'tenantGlobal').trim();
    if (currentTenantGlobal) return;

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
  ]);

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

      if (endpoint.id === 'perm-admin-tenant-global-actualizar') {
        const herenciaId = getFieldValue(endpoint.id, 'herenciaAsociada').trim();
        if (!herenciaId) throw new Error('Completa: Herencia asociada');
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

      // ── Modo "quitar solo esa vista": cambia DELETE /:id → PATCH /:id/vista
      if (endpoint.id === 'perm-admin-tenant-global-desactivar') {
        const vistaObjetivo = getFieldValue(endpoint.id, 'vistaObjetivoId').trim();
        const herenciaId = getFieldValue(endpoint.id, 'herenciaAsociada').trim() || getFieldValue(endpoint.id, 'id').trim();
        if (vistaObjetivo && herenciaId) {
          resolvedPath = `/api/config/permisos/creacion/admin/tenant/global/${encodeURIComponent(herenciaId)}/vista`;
          payload = { method: 'PATCH', headers, body: { vistaId: vistaObjetivo } };
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

      if (endpoint.id === 'perm-admin-tenant-global' || endpoint.id === 'perm-admin-tenant-global-actualizar') {
        const tgRaw = String(body.tenantGlobal || '').trim();
        const tg = isTenantSuperAdminScopeOption(tgRaw) ? '' : tgRaw;
        const tc = String(body.tenantCorporativo || '').trim();
        if (tc && !tg) {
          throw new Error('tenantGlobal es obligatorio cuando seleccionas tenantCorporativo');
        }
        if (tg) body.tenantGlobal = tg;
        else delete body.tenantGlobal;

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
        const selectedNvlId = String(body.nvlGeneracionTenant || '').trim();
        const selectedNvlLabel = (tenantGlobalSelects.nvlGeneracionTenant || [])
          .find((opt) => opt.id === selectedNvlId)?.label || '';
        const nvlEsLibre = /libre|nvl 0/i.test(String(selectedNvlLabel));
        const nvlPermiteCorporativo =
          /tenant-global|nvl 1/i.test(String(selectedNvlLabel)) ||
          /tenant-(co?rporativo)|nvl 2/i.test(String(selectedNvlLabel));
        const nvlEsTenantCorporativo = /tenant-(co?rporativo)|nvl 2/i.test(String(selectedNvlLabel));
        const esSuperAdmin = Boolean(String(tenantGlobalActor?.tenantSuperAdminId || '').trim());
        const esTenantGlobal = Boolean(String(tenantGlobalActor?.tenantGlobalId || '').trim()) && !esSuperAdmin;
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
        const tenantGlobalSel = isTenantSuperAdminScopeOption(tenantGlobalRaw) ? '' : tenantGlobalRaw;
        const tenantCorporativoSel = getFieldValue(endpoint.id, 'tenantCorporativo').trim();
        if (tenantGlobalSel) qs.set('tenantGlobal', tenantGlobalSel);
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

      const response = await apiFetch(resolvedPath, payload);
      setResultData((prev) => ({ ...prev, [endpoint.id]: response }));
      setResult((prev) => ({ ...prev, [endpoint.id]: JSON.stringify(response, null, 2) }));
      toast.success(`${endpoint.title} ejecutado`);
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
      return <pre className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">{result['tenant-listar-reglas'] || 'Aun sin respuesta'}</pre>;
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
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 md:w-[320px]"
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
          <p className="text-xs text-slate-500">Resultados: {filteredRows.length}</p>
        </div>
        <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[980px] text-left text-xs">
          <thead className="bg-slate-100 text-slate-700">
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
                <tr key={reglaId || idx} className="border-t border-slate-100">
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
    const raw = resultData['tenant-actualizar-regla-dios'];
    const payload = (raw as any)?.data ? (raw as any).data : raw;
    const sync = (payload as any)?.sincronizacion;
    const regla = (payload as any)?.regla;

    if (!sync) {
      return <pre className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">{result['tenant-actualizar-regla-dios'] || 'Aun sin respuesta'}</pre>;
    }

    const vistasFaltantes = Array.isArray(sync?.vistasFaltantes) ? sync.vistasFaltantes : [];
    const accionesFaltantes = Array.isArray(sync?.accionesFaltantes) ? sync.accionesFaltantes : [];
    const vistasRegla = Array.isArray(regla?.recurso) ? regla.recurso : [];
    const accionesRegla = Array.isArray(regla?.accionesUsu) ? regla.accionesUsu : [];

    return (
      <div className="space-y-3">
        <div className="grid gap-2 text-xs md:grid-cols-2">
          <div className="rounded border border-emerald-200 bg-emerald-50 p-2">
            Vistas faltantes detectadas: <span className="font-semibold">{Number(sync?.vistasFaltantesTotal || 0)}</span>
          </div>
          <div className="rounded border border-emerald-200 bg-emerald-50 p-2">
            Acciones faltantes detectadas: <span className="font-semibold">{Number(sync?.accionesFaltantesTotal || 0)}</span>
          </div>
          <div className="rounded border border-slate-200 bg-slate-50 p-2">
            Vistas extra detectadas: <span className="font-semibold">{Number(sync?.vistasExtraTotal || 0)}</span>
          </div>
          <div className="rounded border border-slate-200 bg-slate-50 p-2">
            Acciones extra detectadas: <span className="font-semibold">{Number(sync?.accionesExtraTotal || 0)}</span>
          </div>
        </div>

        <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
            DataTable - Vistas faltantes detectadas
          </div>
          {!vistasFaltantes.length ? (
            <p className="p-3 text-xs text-slate-500">No hay vistas faltantes.</p>
          ) : (
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Path</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {vistasFaltantes.map((v: any, idx: number) => (
                  <tr key={String(v?.id || idx)} className="border-t border-slate-100">
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

        <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
            DataTable - Acciones faltantes detectadas
          </div>
          {!accionesFaltantes.length ? (
            <p className="p-3 text-xs text-slate-500">No hay acciones faltantes.</p>
          ) : (
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Etiqueta</th>
                  <th className="px-3 py-2">Metodo</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {accionesFaltantes.map((a: any, idx: number) => (
                  <tr key={String(a?.id || idx)} className="border-t border-slate-100">
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

        <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
            Regla DIOS actualizada (populate de vistas y acciones)
          </div>
          <div className="grid gap-3 p-3 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-700">Vistas en regla ({vistasRegla.length})</p>
              <div className="max-h-36 overflow-auto rounded border border-slate-200">
                <table className="w-full min-w-[320px] text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-2 py-1.5">Nombre</th>
                      <th className="px-2 py-1.5">Path</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vistasRegla.map((v: any, idx: number) => (
                      <tr key={String(v?._id || idx)} className="border-t border-slate-100">
                        <td className="px-2 py-1.5">{String(v?.name || v?._id || '-')}</td>
                        <td className="px-2 py-1.5">{String(v?.path || '-')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-700">Acciones en regla ({accionesRegla.length})</p>
              <div className="max-h-36 overflow-auto rounded border border-slate-200">
                <table className="w-full min-w-[320px] text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-2 py-1.5">Etiqueta</th>
                      <th className="px-2 py-1.5">Metodo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accionesRegla.map((a: any, idx: number) => (
                      <tr key={String(a?._id || idx)} className="border-t border-slate-100">
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

        <pre className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
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
      return <pre className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">{result['perm-admin-tenant-global-listar'] || 'Aun sin respuesta'}</pre>;
    }

    return (
      <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[1400px] text-left text-xs">
          <thead className="bg-slate-100 text-slate-700">
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
              <tr key={String(row?._id || row?.iud || idx)} className="border-t border-slate-100">
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
      return <pre className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">{result[endpointId] || 'Aun sin respuesta'}</pre>;
    }

    return (
      <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[920px] text-left text-xs">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Corporativo</th>
              <th className="px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, idx: number) => (
              <tr key={String(row?._id || row?.iud || idx)} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono">{String(row?._id || row?.iud || '-')}</td>
                <td className="px-3 py-2">
                  {(() => {
                    const id = String(row?._id || row?.iud || '').trim();
                    const rolDirecto = String(
                      row?.rolNombre ||
                      row?.nombre ||
                      row?.rolesMabs?.rol ||
                      (Array.isArray(row?.rolesMabs) ? row.rolesMabs[0]?.rol : '') ||
                      row?.name ||
                      row?.titulo ||
                      ''
                    ).trim();
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
    const rows = pickArray(raw, ['herencias', 'data', 'items']);
    const gruposRaw = Array.isArray(raw?.grupos) ? raw.grupos : [];
    const contexto = raw?.contexto || {};
    const jerarquia = raw?.jerarquia || {};
    const soloMios = Boolean(contexto?.soloMios);

    const grupos = gruposRaw.length
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
          <div className="rounded border border-slate-200 bg-slate-50 p-2">
            Usuario JWT: <span className="font-semibold">{String(raw?.usuarioId || '-')}</span>
          </div>
          <div className="rounded border border-slate-200 bg-slate-50 p-2">
            Scope: <span className="font-semibold">{String(contexto?.scope || '-')}</span>
          </div>
          <div className="rounded border border-slate-200 bg-slate-50 p-2">
            Rol JWT: <span className="font-semibold">{String(contexto?.rolJWT || '-')}</span>
          </div>
          <div className="rounded border border-slate-200 bg-slate-50 p-2">
            Total herencias: <span className="font-semibold">{Number(raw?.total || rows.length || 0)}</span>
          </div>
          <div className="rounded border border-slate-200 bg-slate-50 p-2">
            TenantSuperAdmin: <span className="font-semibold">{String(contexto?.tenantSuperTenant || '-')}</span>
          </div>
          <div className="rounded border border-slate-200 bg-slate-50 p-2">
            TenantGlobal JWT: <span className="font-semibold">{String(contexto?.tenantGlobal || '-')}</span>
          </div>
          <div className="rounded border border-slate-200 bg-slate-50 p-2">
            TenantCorporativo JWT: <span className="font-semibold">{String(contexto?.tenantCorporativo || '-')}</span>
          </div>
        </div>

        <div className="rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
          Jerarquia visible - TenantGlobal: <span className="font-semibold">{tgPermitidos}</span> | TenantCorporativo: <span className="font-semibold">{tcPermitidos}</span>
        </div>
        <div className="rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
          Modo consulta: <span className="font-semibold">{soloMios ? 'solo mis herencias (JWT)' : 'todas las herencias del alcance JWT'}</span>
        </div>

        <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
            Vistas heredadas (filtro actual)
          </div>
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2">ID herencia</th>
                <th className="px-3 py-2">Vista</th>
                <th className="px-3 py-2">TenantGlobal</th>
                <th className="px-3 py-2">TenantCorporativo</th>
                <th className="px-3 py-2">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.flatMap((row: any, idx: number) => {
                  const vistasRow = Array.isArray(row?.vistas) && row.vistas.length ? row.vistas : [null];
                  return vistasRow.map((v: any, vIdx: number) => {
                    const vistaTxt = v ? String(v?.name || v?.path || v?._id || '-') : '-';
                    const tg = String(row?.tenantGlobal?._id || row?.tenantGlobal || '-');
                    const tc = String(row?.tenantCorporativo?._id || row?.tenantCorporativo || '-');
                    const usuario = String(row?.usuarioId?.nombre || row?.usuarioId?.correo || row?.usuarioId?._id || row?.usuarioId || '-');
                    return (
                      <tr key={`${String(row?._id || idx)}-${vIdx}`} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-mono">{String(row?._id || row?.iud || '-')}</td>
                        <td className="px-3 py-2">{vistaTxt}</td>
                        <td className="px-3 py-2 font-mono">{tg}</td>
                        <td className="px-3 py-2 font-mono">{tc}</td>
                        <td className="px-3 py-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setHerenciaDetalle({
                                usuarioId: row?.usuarioId?._id || row?.usuarioId || null,
                                usuario,
                                totalHerencias: 1,
                                tenantGlobales: tg !== '-' ? [tg] : [],
                                tenantCorporativos: tc !== '-' ? [tc] : [],
                                items: [row],
                              })
                            }
                          >
                            Ver detalle
                          </Button>
                        </td>
                      </tr>
                    );
                  });
                })
              ) : (
                <tr className="border-t border-slate-100">
                  <td className="px-3 py-3 text-slate-500" colSpan={5}>
                    Sin vistas/herencias para el filtro actual.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="bg-slate-100 text-slate-700">
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
                  <tr key={String(g?.usuarioId || g?.usuario || idx)} className="border-t border-slate-100">
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
                <tr className="border-t border-slate-100">
                  <td className="px-3 py-3 text-slate-500" colSpan={7}>
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
      <div className="rounded-xl border border-rose-100 bg-white/80 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-rose-600">Vistas activas + acciones activas</p>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700">
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
        {!vistasCatalogo.length ? (
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
          <div key={`${endpoint.id}-${idx}`} className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
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
            <select className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" value={item.vistaId} onChange={(e) => {
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
            <div className="mt-1 max-h-24 overflow-auto rounded-md border border-slate-300 bg-white p-2">
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
            <p className="mt-2 text-xs text-slate-600">
              Seleccionadas: <span className="font-semibold">{item.accionId.length}</span>
            </p>
          </div>
        ))}
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          Resumen: vistas <span className="font-semibold">{vistasInsertarCount}</span> | acciones a insertar <span className="font-semibold">{accionesInsertarCount}</span> | combinaciones <span className="font-semibold">{combinacionesInsertarCount}</span>
        </div>
      </div>
    );
  };

  const renderHerenciaSelectionBuilder = (endpoint: EndpointSpec) => {
    const selected = getCatalogSelection(endpoint.id);
    const { vistasCatalogo, accionesCatalogo } = getPermisosCatalog(endpoint.id);
    const heredaSelVal = getFieldValue(endpoint.id, 'heredaGlobal').trim();
    const esReglaSeleccionada = !!heredaSelVal && !!ruleCatalog[heredaSelVal];
    return (
      <div className="rounded-xl border border-emerald-100 bg-white/80 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-emerald-700">Elige la vista que quieres cambiarle los permisos</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                // "Todas" selecciona TODO el catÃ¡logo de la regla/herencia sin importar suite activa
                setCatalogSelectionFor(endpoint.id, {
                  vistas: getCatalogoVistaIdsRelacionadas(endpoint.id),
                  acciones: accionesCatalogo.map((a) => a.id),
                });
              }}
            >
              Todas
            </Button>
            <Button
              type="button"
              size="sm"
              variant="default"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => {
                // Sincronizar: recorre TODO el Ã¡rbol y selecciona vistas que estÃ©n en el catÃ¡logo (sin filtro de tipoNodo)
                const suiteId = suiteSelByEndpoint[endpoint.id] || '';
                syncCatalogSelection(endpoint.id, suiteId);
              }}
            >
              Sincronizar
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
        {!vistasCatalogo.length ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            No hay vistas resueltas para este tenant en el catalogo actual.
            <Button className="ml-2 h-7 px-2 text-xs" type="button" variant="outline" onClick={hydrateData} disabled={loadingData}>
              Recargar datos
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
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
                        <p className="mb-1 text-xs font-bold text-slate-600 bg-slate-100 rounded px-2 py-1">
                          {suite.name} ({totalCatalogEnSuite})
                        </p>
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
                            <div key={modulo._id} className="rounded-md border border-slate-200 bg-white">
                              <button
                                type="button"
                                className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
                                <span className="text-slate-400 font-normal">{selectedCount}/{formularios.length} {isExpanded ? '▲' : '▼'}</span>
                              </button>
                              {isExpanded && (
                                <div className="border-t border-slate-100 p-2 space-y-1">
                                  {formularios.map((form) => {
                                    const fid = String(form._id);
                                    // En regla: habilitado si catÃ¡logo vacÃ­o (sin restricciÃ³n) O si el nodo estÃ¡ en el catÃ¡logo
                                    const enCatalogo = esReglaSeleccionada
                                      ? (catalogIds.size === 0 || catalogIds.has(fid))
                                      : (!hasCatalogFilter || catalogIds.has(fid));
                                    return (
                                      <label
                                        key={fid}
                                        className="flex cursor-pointer items-center gap-2 text-xs"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={selected.vistas.includes(fid)}
                                          onChange={(e) => toggleCatalogItem(endpoint.id, 'vistas', fid, e.target.checked)}
                                        />
                                        <span>
                                          {form.name}
                                          {getTipoNodoLabel(form) === 'SUBFORMULARIO' ? ' [Sub]' : ''}
                                          {form.path ? <span className="text-slate-400"> ({form.path})</span> : ''}
                                          {!enCatalogo && <span className="ml-1 text-amber-500">[fuera de regla]</span>}
                                        </span>
                                      </label>
                                    );
                                  })}
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
                      <p className="mb-2 text-xs font-semibold text-slate-700">
                        Vistas ({selected.vistas.length}/{totalFormularios}) â€” {suiteNodo.name}
                      </p>
                      <div className="max-h-64 overflow-auto space-y-1">
                        {renderSuiteTree(suiteNodo) || <p className="text-xs text-slate-500 px-2">Esta suite no tiene mÃ³dulos disponibles.</p>}
                      </div>
                    </>
                  );
                }

                // Regla seleccionada sin suite â†’ mostrar TODAS las suites con jerarquÃ­a completa
                if (esReglaSeleccionada || endpoint.id === 'perm-usuario-tenant-global') {
                  const suitesConNodos = rutasJerarquia.filter((s) => Array.isArray(s.children) && s.children.length > 0);
                  const totalCatalog = getCatalogoVistaIdsRelacionadas(endpoint.id).length;
                  return (
                    <>
                      <p className="mb-2 text-xs font-semibold text-slate-700">
                        Vistas ({selected.vistas.length}/{totalCatalog}) â€” Todas las suites
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
                    <p className="mb-2 text-xs font-semibold text-slate-700">Vistas ({selected.vistas.length}/{vistasCatalogo.length})</p>
                    <div className="max-h-40 overflow-auto rounded-md border border-slate-300 bg-white p-2">
                      {vistasCatalogo.map((vista) => (
                        <label key={vista.id} className="mb-1 flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selected.vistas.includes(vista.id)}
                            onChange={(e) => toggleCatalogItem(endpoint.id, 'vistas', vista.id, e.target.checked)}
                          />
                          <span>{vista.label} {vista.path ? `(${vista.path})` : ''}</span>
                        </label>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-semibold text-slate-700">Acciones ({selected.acciones.length}/{accionesCatalogo.length})</p>
              <div className="max-h-40 overflow-auto rounded-md border border-slate-300 bg-white p-2">
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

  const renderForm = (endpoint: EndpointSpec) => (
    <div className="space-y-3">
      {endpoint.id === 'tenant-actualizar-regla-dios' ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          UI Sync Marker: tabla de faltantes habilitada.
        </div>
      ) : null}
      {(endpoint.id === 'perm-admin-tenant-global-actualizar' || endpoint.id === 'perm-admin-tenant-global') ? (
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
                  <div className="max-h-36 overflow-auto rounded border border-blue-200 bg-white p-2 text-[11px] text-slate-700">
                    {rows.map((r: any, idx: number) => (
                      <div key={`${r?.tenantGlobal || 'tg'}-${r?.tenantCorporativo || 'tc'}-${idx}`} className="mb-2 border-b border-slate-100 pb-1 last:mb-0 last:border-b-0">
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
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
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
                <p className="mt-1 text-xs text-slate-500">
                  {`JWT: ${actorRolJwt || 'SIN_ROL'} | TSA:${actorTsaJwt || '-'} | TG:${actorTgJwt || '-'} | TC:${actorTcJwt || '-'}`}
                </p>
              ) : null}
            </div>
            <div>
              <Label>Herencia asociada</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
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
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
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
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
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
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
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
                <div className="mt-1 max-h-48 overflow-y-auto rounded-md border border-slate-300 divide-y">
                  {herenciaOptions.map((h) => (
                    <label
                      key={h.id}
                      className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${herenciaSelected === h.id ? 'bg-slate-100' : ''}`}
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
                    <span key={c.iud} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-slate-600 font-mono">
                      ðŸ”’ {c.tipo_comprador} <span className="text-slate-400">({c.sigla})</span>
                    </span>
                  ))}
                </div>
              )}
              {catalogItems.filter((c) => !c.esDefault).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {catalogItems.filter((c) => !c.esDefault).map((c) => (
                    <span key={c.iud} className="inline-flex items-center gap-1 rounded bg-white border border-slate-200 px-2 py-0.5 text-slate-700 font-mono">
                      {c.tipo_comprador} <span className="text-slate-400">({c.sigla})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
      {endpoint.fields.map((field) => {
        if (
          (endpoint.id === 'perm-admin-tenant-global-desactivar' || endpoint.id === 'perm-admin-tenant-global-eliminar') &&
          (field.name === 'id' || field.name === 'tenantGlobal' || field.name === 'herenciaAsociada')
        ) {
          return null;
        }
        if (field.type === 'permisos') {
          if (
            endpoint.id === 'perm-admin-tenant-global' ||
            endpoint.id === 'perm-admin-tenant-global-actualizar' ||
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
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
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
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
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
                    <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs font-medium text-slate-600">Corporativo asociado</p>
                      <p className="text-sm text-slate-800">{corporativo}</p>
                    </div>
                  );
                })()}

                <p className="mt-1 text-xs text-slate-500">
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
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
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
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
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
                      className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
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
                    <p className="mt-1 text-xs text-slate-500">
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
          const tenantOptions = getTenantGlobalOptions(endpoint.id);
          const actorRolJwt = String(tenantGlobalActor?.rol || '').trim();
          const actorTsaJwt = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
          const actorTgJwt = String(tenantGlobalActor?.tenantGlobalId || '').trim();
          const actorTcJwt = String(tenantGlobalActor?.tenantCorporativoId || '').trim();
          return (
            <div key={field.name}>
              <Label>{field.label} {field.required ? '*' : ''}</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                value={getFieldValue(endpoint.id, field.name)}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setFieldValue(endpoint.id, field.name, nextValue);
                  if (endpoint.id === 'perm-admin-tenant-global' || endpoint.id === 'perm-admin-tenant-global-actualizar') {
                    setPermisos(endpoint.id, [{ vistaId: '', accionId: [] }]);
                    setCatalogSelectionFor(endpoint.id, { vistas: [], acciones: [] });
                    setBulkAllFor(endpoint.id, false);
                    setSyncInfoByEndpoint((prev) => ({ ...prev, [endpoint.id]: null }));
                    if (endpoint.id === 'perm-admin-tenant-global-actualizar') {
                      setHerenciaAsociadaOptionsByEndpoint((prev) => ({ ...prev, [endpoint.id]: [] }));
                      setHerenciaAsociadaDataByEndpoint((prev) => ({ ...prev, [endpoint.id]: {} }));
                      setFieldValue(endpoint.id, 'herenciaAsociada', '');
                      if (nextValue) fetchHerenciasAsociadasByTenantGlobal(endpoint.id, nextValue);
                    }
                    if (endpoint.id === 'perm-admin-tenant-global') {
                      setHerenciaAsociadaOptionsByEndpoint((prev) => ({ ...prev, [endpoint.id]: [] }));
                      setHerenciaAsociadaDataByEndpoint((prev) => ({ ...prev, [endpoint.id]: {} }));
                      setFieldValue(endpoint.id, 'herenciaAsociada', '');
                      if (nextValue) fetchHerenciasAsociadasByTenantGlobal(endpoint.id, nextValue);
                    }
                    setTenantCorpErrorByEndpoint((prev) => ({ ...prev, [endpoint.id]: '' }));
                    if (endpoint.id === 'perm-admin-tenant-global' && nextValue) {
                      setFieldValue(endpoint.id, 'tenantCorporativo', '');
                      if (!isTenantSuperAdminScopeOption(nextValue)) {
                        fetchTenantCorporativosByGlobal(endpoint.id, nextValue);
                      }
                    }
                  }
                }}
              >
                <option value="">
                  {loadingData ? 'Cargando tenants...' : 'Selecciona tenant'}
                </option>
                {tenantOptions.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              {(actorRolJwt || actorTsaJwt || actorTgJwt || actorTcJwt) ? (
                <p className="mt-1 text-xs text-slate-500">
                  {`JWT: ${actorRolJwt || 'SIN_ROL'} | TSA:${actorTsaJwt || '-'} | TG:${actorTgJwt || '-'} | TC:${actorTcJwt || '-'}`}
                </p>
              ) : null}
              {!loadingData && tenantOptions.length === 0 ? (
                <p className="mt-1 text-xs text-amber-700">
                  No hay tenants globales cargados. Pulsa "Recargar datos API".
                </p>
              ) : null}
            </div>
          );
        }
        if (field.name === 'herenciaAsociada' && endpoint.id === 'perm-admin-tenant-global-actualizar') {
          const options = herenciaAsociadaOptionsByEndpoint[endpoint.id] || [];
          const tenantGlobalSelected = getFieldValue(endpoint.id, 'tenantGlobal').trim();
          const selectedId = getFieldValue(endpoint.id, field.name).trim();
          const selectedRow = (herenciaAsociadaDataByEndpoint[endpoint.id] || {})[selectedId];
          const selectedFuente = String(selectedRow?.fuenteHerencia || 'tenantGlobal').trim();
          return (
            <div key={field.name}>
              <Label>{field.label} {field.required ? '*' : ''}</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
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
                <p className="mt-1 text-xs text-slate-600">
                  Fuente heredada: <span className="font-semibold">{selectedFuente === 'tenantSuperAdmin' ? 'tenantSuperAdmin (DIOS)' : 'tenantGlobal'}</span>
                </p>
              ) : null}
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
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
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
              <p className="mt-1 text-xs text-slate-500">
                Se usa la herencia como base de vistas y acciones para parametrizar.
              </p>
              {renderHerenciaAsociadaDetalle(endpoint.id)}
            </div>
          );
        }
        if (field.name === 'tenantCorporativo' && endpoint.id === 'perm-admin-tenant-global-actualizar') {
          const options = getTenantCorporativoOptions(endpoint.id);
          const tenantGlobalSelected = getFieldValue(endpoint.id, 'tenantGlobal').trim();
          const loadingCorp = !!tenantCorpLoadingByEndpoint[endpoint.id];
          const tenantCorpError = String(tenantCorpErrorByEndpoint[endpoint.id] || '').trim();
          return (
            <div key={field.name}>
              <Label>{field.label} {field.required ? '*' : ''}</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
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
              <p className="mt-1 text-xs text-slate-500">
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
          return (
            <div key={field.name}>
              <Label>{field.label} {field.required ? '*' : ''}</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                value={getFieldValue(endpoint.id, field.name)}
                onChange={(e) => setFieldValue(endpoint.id, field.name, e.target.value)}
              >
                <option value="">Selecciona contexto</option>
                {contextos.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
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
                className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm shadow-sm"
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
              <p className="mt-1 text-xs text-slate-500">
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
          ['tipo_tenant', 'ownerType', 'nvlGeneracionTenant', 'apisDominios', 'accionesUsu', 'rolesMabs', 'coporativo', 'tenantGlobalRef'].includes(field.name);
        if (usesTenantGlobalSelects) {
          const options = tenantGlobalSelects[field.name] || [];
          const actorEsTenantGlobal = actorEsTenantGlobalScope();
          const actorEsTenantCorporativo = actorEsTenantCorporativoScope();
          const selectedNvl = getFieldValue(endpoint.id, 'nvlGeneracionTenant').trim();
          const nvlLabel = (tenantGlobalSelects.nvlGeneracionTenant || []).find((opt) => opt.id === selectedNvl)?.label || '';
          const nvlTexto = String(nvlLabel).toLowerCase();
          const nvlEsLibre = nvlTexto.includes('libre') || nvlTexto.includes('nvl 0');
          const nvlEsTenantGlobal = nvlTexto.includes('tenant-global') || nvlTexto.includes('nvl 1');
          const nvlEsTenantCorporativo = /tenant-(co?rporativo)|nvl 2/i.test(String(nvlLabel));
          const nvlPermiteCorporativo = nvlEsTenantGlobal || nvlEsTenantCorporativo;
          const nvlBloqueaRolDios = nvlEsTenantGlobal || nvlEsTenantCorporativo;
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
          const optionsNivelPorScope = field.name === 'nvlGeneracionTenant'
            ? options.filter((opt) => {
                const nvl = String((opt as any)?.meta?.nvl || '').trim();
                const generationTenant = String((opt as any)?.meta?.generationTenant || '').toLowerCase();
                const esLibre = nvl === '0' || generationTenant.includes('libre') || String((opt as any)?.meta?.securityPlatform || '').toLowerCase() === 'true';

                if (actorEsTenantSuperAdmin()) return true;
                if (actorEsTenantGlobal) return !esLibre;
                if (actorEsTenantCorporativo) return nvl === '2' || generationTenant.includes('corporativo');
                return !esLibre;
              })
            : options;
          const optionsFiltradas = field.name === 'coporativo'
            ? (nvlPermiteCorporativo ? options : [])
            : field.name === 'nvlGeneracionTenant'
            ? optionsNivelPorScope
            : field.name === 'tenantGlobalRef'
            ? (nvlEsTenantCorporativo ? options : [])
            : optionsRoles;
          const disabled =
            field.name === 'coporativo'
              ? !selectedNvl || !nvlPermiteCorporativo
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
                <div className="mt-1 rounded-lg border border-slate-300 bg-white p-2">
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
                    <span className="ml-auto rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      Seleccionadas: {selectedMultiValues.length}
                    </span>
                  </div>
                  <div className="max-h-40 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2">
                    {optionsFiltradas.map((opt) => {
                      const checked = selectedMultiValues.includes(opt.id);
                      return (
                        <label key={opt.id} className="mb-1 flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-white">
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
                      ? 'border-rose-300 bg-rose-50/60 font-medium text-slate-900 focus:border-rose-400'
                      : 'border-slate-300 bg-white'
                  }`}
                  value={getFieldValue(endpoint.id, field.name)}
                  onChange={(e) => {
                    setFieldValue(endpoint.id, field.name, e.target.value);
                    if (field.name === 'nvlGeneracionTenant') {
                      // Cambio de nivel: limpiar dependencias
                      const nextNvlLabel = (tenantGlobalSelects.nvlGeneracionTenant || []).find((opt) => opt.id === e.target.value)?.label || '';
                      const nextNvlEsLibre = String(nextNvlLabel).toLowerCase().includes('libre') || String(nextNvlLabel).toLowerCase().includes('nvl 0');
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
              {isAccionUsuarioMulti ? <p className="mt-1 text-xs text-slate-500">Selecciona una o varias acciones.</p> : null}
              {!loadingData && optionsFiltradas.length === 0 ? (
                <p className="mt-1 text-xs text-amber-700">
                  {field.name === 'coporativo' && nvlEsLibre
                    ? 'Para NVL LIBRE no se requiere corporativo.'
                    : 'Sin opciones para este campo. Verifica rol `tenantSuperAdmin` o la configuracion del nivel.'}
                </p>
              ) : null}
              {ownerTypeBloqueadoPorScope ? (
                <p className="mt-1 text-xs text-slate-500">
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
          return (
            <div key={field.name}>
              <Label>{field.label} {field.required ? '*' : ''}</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                value={getFieldValue(endpoint.id, field.name)}
                onChange={(e) => {
                  const selected = e.target.value;
                  setFieldValue(endpoint.id, field.name, selected);
                  applyRuleToForm(endpoint.id, selected);
                }}
              >
                <option value="">Selecciona regla a actualizar</option>
                {reglas.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <p className="mt-1 text-xs text-slate-500">Se usa el ID encriptado devuelto por listar reglas.</p>
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
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
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
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
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
                <p className="mt-1 text-xs text-slate-500">
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
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                  value={heredaSelVal}
                  onChange={(e) => setFieldValue(endpoint.id, 'heredaGlobal', e.target.value)}
                >
                  <option value="">{herenciasTG.length ? 'Selecciona herencia (opcional)' : 'Sin herencias asignadas'}</option>
                  {herenciasTG.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
                </select>
                <p className="mt-1 text-xs text-slate-500">Opcional: limita vistas/acciones al techo de tu herenciaGlobal.</p>
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
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
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
                  className="rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
                  onClick={() => setUsuariosDestinoSel((prev) => ({ ...prev, [endpointId]: disponibles.map((u) => u.id) }))}
                  disabled={cargando}
                >SincrÃ³nica</button>
                <button
                  type="button"
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  onClick={() => setUsuariosDestinoSel((prev) => ({ ...prev, [endpointId]: [] }))}
                  disabled={cargando}
                >Limpiar</button>
                <button
                  type="button"
                  className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
                  onClick={() => {
                    cargarUsuariosParaEndpoint(endpointId, tgId);
                    cargarHerenciasExistentesTG(tgId);
                  }}
                  disabled={cargando}
                >{cargando ? '...' : 'â†º'}</button>
              </div>
            </div>
            {cargando ? (
              <p className="text-xs text-blue-500">Cargando usuarios...</p>
            ) : disponibles.length === 0 ? (
              <p className="text-xs text-slate-500">No hay usuarios disponibles.</p>
            ) : (
              <div className="max-h-48 overflow-auto rounded-md border border-blue-200 bg-white p-2 space-y-2">
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
                            setUsuariosDestinoSel((prev) => {
                              const curr = prev[endpointId] || [];
                              return { ...prev, [endpointId]: e.target.checked ? [...curr, u.id] : curr.filter((id) => id !== u.id) };
                            });
                          }}
                        />
                        <span className="flex-1 text-slate-700">{u.label}</span>
                        {tieneHerencia && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                            {herenciasUsu.length} herencia{herenciasUsu.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </label>
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
                Se crearÃ¡n {seleccionados.length} documentos de herencia (uno por usuario).
              </p>
            )}
          </div>
        );
      })() : null}
      {endpoint.id === 'perm-usuario-tenant-global' ? renderHerenciaSelectionBuilder(endpoint) : null}
      <div className="flex items-center gap-3">
        <Button onClick={() => runEndpoint(endpoint)} disabled={!!running[endpoint.id] || !endpointDisponibleParaScope(endpoint)}>
          {running[endpoint.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Ejecutar
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
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
            }
            setResult((prev) => ({ ...prev, [endpoint.id]: '' }));
            setResultData((prev) => ({ ...prev, [endpoint.id]: null }));
          }}
        >
          Limpiar formulario
        </Button>
        <code className="rounded bg-slate-100 px-2 py-1 text-xs">{endpoint.path}</code>
      </div>
      {!endpointDisponibleParaScope(endpoint) ? (
        <p className="mt-2 text-xs font-medium text-amber-600">
          Visible solo como referencia. Este flujo se habilita cuando el JWT corresponda al scope `{endpoint.actor}`.
        </p>
      ) : null}
      {endpoint.id === 'tenant-listar-reglas'
        ? renderReglasTable()
        : endpoint.id === 'tenant-actualizar-regla-dios'
        ? renderActualizarReglaDiosResultado()
        : endpoint.id === 'tenant-listar-libres' ||
          endpoint.id === 'tenant-listar-libres-superadmin' ||
          endpoint.id === 'tenant-listar-libres-tenantglobal'
        ? renderTenantLibresTable(endpoint.id)
        : endpoint.id === 'perm-listar-herencias'
        ? renderHerenciasUsuarioTable()
        : endpoint.id === 'perm-admin-tenant-global-listar'
        ? renderHerenciasAdminTable()
        : <pre className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">{result[endpoint.id] || 'Aun sin respuesta'}</pre>}
    </div>
  );

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
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-700">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Panel administrativo
                  </p>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                    {pageTitle}
                  </h1>
                </div>
              </div>
              <p className="text-sm leading-6 text-slate-600">{pageDescription}</p>
            </div>

            <div className="flex w-full flex-col gap-3 lg:max-w-xl">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {stats.map((item) => (
                  <div key={item.label} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="text-lg font-semibold text-slate-950">{item.value}</p>
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
                      ? 'border-primary/35 bg-primary/5 text-slate-950 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 rounded-md border p-2 ${selected ? 'border-primary/20 bg-white text-primary' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <h2 className="text-sm font-semibold">{meta.label}</h2>
                        <p className="mt-1 text-xs text-slate-500">{meta.description}</p>
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

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600">
                  <ActiveSectionIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {isRulesMode ? 'Flujo de reglas' : activeSectionMeta.label}
                  </p>
                  <p className="text-sm text-slate-500">
                    {isRulesMode
                      ? 'Flujo guiado solo para reglas de tenant'
                      : lockedSection === 'permisos'
                      ? 'Flujo guiado solo para gobernanza de permisos'
                      : `${activeSectionMeta.description} ${endpointsBySection.length} endpoints visibles.`}
                  </p>
                </div>
              </div>
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
                ? 'border-slate-200 bg-slate-100 text-slate-700'
                : 'border-sky-200 bg-sky-50 text-sky-700';
              const helper = esFlujoSA
                ? 'Parametrizas de tenantSuperAdmin hacia tenantGlobales visibles dentro de tu arbol.'
                : 'Flujo puro tenantGlobal: el subnodo queda amarrado a tu propio tenantGlobal y solo afecta descendencia.';

              return (
                <Card key={tenantForm.id} className={`border-slate-200 bg-white shadow-sm ${disponible ? '' : 'opacity-75'}`}>
                  <CardHeader className="border-b border-slate-100 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg font-semibold text-slate-950">
                        {isRulesMode ? 'Formulario principal recomendado' : esFlujoSA ? 'Flujo tenantSuperAdmin -> tenantGlobal' : 'Flujo puro tenantGlobal'}
                      </CardTitle>
                      <Badge className={`border ${METHOD_STYLE[tenantForm.method]}`}>{tenantForm.method}</Badge>
                      {!isRulesMode ? <Badge className={`border ${badgeClass}`}>{esFlujoSA ? 'Owner' : 'Descendencia'}</Badge> : null}
                      {!disponible ? <Badge variant="outline">Solo visible</Badge> : null}
                    </div>
                    <CardDescription>{tenantForm.title}</CardDescription>
                    {!isRulesMode ? <p className="text-sm text-slate-600">{helper}</p> : null}
                    {!isRulesMode && !disponible ? (
                      <p className="text-xs font-medium text-amber-600">
                        Tu sesi&oacute;n actual no ejecuta este formulario, pero lo dejamos visible para separar claramente el flujo tenantSuperAdmin del flujo tenantGlobal.
                      </p>
                    ) : null}
                    <p className="rounded-md border border-slate-200 bg-slate-50 p-2 font-mono text-xs text-slate-600">{tenantForm.path}</p>
                  </CardHeader>
                  <CardContent className="p-5">{renderForm(tenantForm)}</CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {endpointsBySection.length === 0 ? (
          <Card className="border-dashed border-slate-300 bg-white shadow-sm">
            <CardContent className="flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center">
              <Search className="h-5 w-5 text-slate-400" />
              <p className="text-sm font-medium text-slate-900">Sin endpoints para mostrar</p>
              <p className="max-w-md text-sm text-slate-500">
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
                  className={`border-slate-200 bg-white shadow-sm transition-colors hover:border-primary/30 ${endpoint.method === 'GET' ? 'md:col-span-2 xl:col-span-3' : ''} ${disponible ? '' : 'opacity-75'}`}
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
                      <CardTitle className="text-base leading-snug text-slate-950">{endpoint.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{endpoint.description}</CardDescription>
                    </div>
                    {!disponible ? (
                      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                        Este bloque pertenece a otro scope y queda disponible solo como referencia.
                      </p>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-4 p-5 pt-0">
                    <p className={`rounded-md border border-slate-200 bg-slate-50 p-2 font-mono text-xs text-slate-600 ${endpoint.method === 'GET' ? '' : 'line-clamp-2'}`}>{endpoint.path}</p>
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
          <DialogHeader className="border-b border-slate-200 px-6 py-4 pr-12">
            <DialogTitle className="text-base text-slate-950">Detalle de herencias por usuario/tenant</DialogTitle>
          </DialogHeader>
          {herenciaDetalle ? (
            <div className="max-h-[calc(92vh-72px)] space-y-3 overflow-auto px-6 py-5 text-xs">
              <div className="grid gap-2 md:grid-cols-3">
                <div className="rounded border border-slate-200 bg-slate-50 p-2">Usuario: <span className="font-semibold">{String(herenciaDetalle?.usuario || herenciaDetalle?.usuarioId || '-')}</span></div>
                <div className="rounded border border-slate-200 bg-slate-50 p-2">Total herencias: <span className="font-semibold">{Number(herenciaDetalle?.totalHerencias || herenciaDetalle?.total || 0)}</span></div>
                <div className="rounded border border-slate-200 bg-slate-50 p-2">Tenant globales: <span className="font-semibold">{Array.isArray(herenciaDetalle?.tenantGlobales) ? herenciaDetalle.tenantGlobales.length : 0}</span></div>
              </div>

              <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full min-w-[980px] text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700">
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
                      <tr key={String(row?._id || row?.iud || idx)} className="border-t border-slate-100">
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
      <Dialog open={!!endpointModal} onOpenChange={(open) => !open && setEndpointModal(null)}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 sm:max-w-4xl">
          {endpointModal && (
            <>
              <DialogHeader className="border-b border-slate-200 px-6 py-4 pr-12">
                <DialogTitle className="flex items-center gap-2 text-base text-slate-950">
                  <Shield className="h-5 w-5 text-slate-600" /> {endpointModal.title}
                </DialogTitle>
                <p className="font-mono text-xs text-slate-500">{endpointModal.path}</p>
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






