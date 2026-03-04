import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { apiFetch } from '@/app/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Play, RefreshCw, Settings2, Shield, ShieldCheck, Sparkles, Wand2, X } from 'lucide-react';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type EndpointSection = 'tenant' | 'permisos';
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
type RuleCatalog = { id: string; raw: any };
type HeredaGlobalOption = { id: string; label: string };
type CatalogSelection = { vistas: string[]; acciones: string[] };
type TenantCorporativoOption = { id: string; label: string; tenantGlobalId: string };
type GenericSelectOption = { id: string; label: string; rol?: string };
type HeredaScope = 'tenantSuperAdmin' | 'tenantGlobal' | 'unknown';
const TENANT_SUPERADMIN_SCOPE_PREFIX = '__tsa_scope__:';

const METHOD_STYLE: Record<HttpMethod, string> = {
  GET: 'bg-blue-100 text-blue-700 border-blue-200',
  POST: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  PUT: 'bg-amber-100 text-amber-700 border-amber-200',
  DELETE: 'bg-red-100 text-red-700 border-red-200',
};

const ENDPOINTS: EndpointSpec[] = [
  { id: 'tenant-listar-libres', section: 'tenant', actor: 'ambos', method: 'GET', path: '/api/config/global/creacion/usu/tenant/libres', title: 'Listar tenants visibles', description: 'Listado de tenants visibles para el usuario autenticado.', fields: [] },
  {
    id: 'tenant-crear-global-usuario',
    section: 'tenant',
    actor: 'tenantSuperAdmin',
    method: 'POST',
    path: '/api/config/global/creacion/usu/tenant/global',
    title: 'Crear tenant global (usuario)',
    description: 'Crea tenant global en flujo usuario.',
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
    actor: 'ambos',
    method: 'POST',
    path: '/api/config/global/creacion/admin/tenant/global',
    title: 'Crear tenant global (admin)',
    description: 'Crea tenant global para flujo administrador.',
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
    id: 'tenant-crear-corporativo-global',
    section: 'tenant',
    actor: 'tenantGlobal',
    method: 'POST',
    path: '/api/config/global/creacion/usu/tenant/corporativo',
    title: 'Crear tenant corporativo (global)',
    description: 'Crea tenant corporativo desde flujo de tenant global.',
    fields: [
      { name: 'nvlGeneracionCoporativoTenant', label: 'Nivel generacion corporativo', type: 'id', required: true },
      { name: 'tipo_tenant', label: 'Tipo tenant', type: 'id', required: true },
      { name: 'ownerType', label: 'Owner type', type: 'id', required: true },
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
    id: 'tenant-crear-regla-dios',
    section: 'tenant',
    actor: 'tenantSuperAdmin',
    method: 'POST',
    path: '/api/config/tenant/tipo/crear/dios/reglas/jerarquia/roles',
    title: 'Crear regla DIOS',
    description: 'Crea la regla DIOS usando el contexto del JWT (sin payload manual).',
    fields: [],
  },
  {
    id: 'tenant-actualizar-regla-dios',
    section: 'tenant',
    actor: 'tenantSuperAdmin',
    method: 'PUT',
    path: '/api/config/tenant/tipo/actualizar/dios/reglas/jerarquia/roles',
    title: 'Actualizar regla DIOS',
    description: 'Sincroniza la regla DIOS vigente usando el contexto del JWT.',
    fields: [],
  },
  { id: 'perm-listar-herencias', section: 'permisos', actor: 'ambos', method: 'GET', path: '/api/config/permisos/listar/usu/tenant/libres', title: 'Listar herencias', description: 'Lista permisos heredados del usuario autenticado.', fields: [] },
  {
    id: 'perm-usuario-tenant-global',
    section: 'permisos',
    actor: 'tenantSuperAdmin',
    method: 'POST',
    path: '/api/config/permisos/usu/tenant/global',
    title: 'Asignar parametrizacion global',
    description: 'Asigna parametrizacion al usuario autenticado con seleccion de vistas y acciones.',
    fields: [{ name: 'heredaGlobal', label: 'Herencia global', type: 'id', required: true }],
  },
  {
    id: 'perm-admin-tenant-global',
    section: 'permisos',
    actor: 'tenantSuperAdmin',
    method: 'POST',
    path: '/api/config/permisos/creacion/admin/tenant/global',
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
    actor: 'tenantSuperAdmin',
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
    description: 'Desactiva registro sin eliminar físicamente.',
    fields: [{ name: 'id', label: 'ID herencia', type: 'id', required: true, pathParam: true }],
  },
  {
    id: 'perm-admin-tenant-global-eliminar',
    section: 'permisos',
    actor: 'tenantSuperAdmin',
    method: 'DELETE',
    path: '/api/config/permisos/creacion/admin/tenant/global/:id/force',
    title: 'Eliminar herencia admin/global',
    description: 'Eliminación definitiva (requiere estar desactivada).',
    fields: [{ name: 'id', label: 'ID herencia', type: 'id', required: true, pathParam: true }],
  },
  {
    id: 'perm-crear-coporativo',
    section: 'tenant',
    actor: 'tenantGlobal',
    method: 'POST',
    path: '/api/config/permisos/creacion/usu/tenant/coporativo',
    title: 'Crear tenant corporativo',
    description: 'Flujo tenantGlobal (ADMIN).',
    fields: [
      { name: 'nvlGeneracionCoporativoTenant', label: 'Nivel generacion corporativo', type: 'id', required: true },
      { name: 'tipo_tenant', label: 'Tipo tenant', type: 'id', required: true },
      { name: 'ownerType', label: 'Owner type', type: 'id', required: true },
      { name: 'apisDominios', label: 'Apis dominios', type: 'id', required: true },
      { name: 'accionesUsu', label: 'Accion usuario', type: 'id', required: true },
      { name: 'rolesMabs', label: 'Rol mabs', type: 'id', required: true },
    ],
  },
  {
    id: 'perm-crear-corporativo-alias',
    section: 'tenant',
    actor: 'tenantGlobal',
    method: 'POST',
    path: '/api/config/permisos/creacion/usu/tenant/corporativo',
    title: 'Crear tenant corporativo (alias)',
    description: 'Alias canónico del endpoint corporativo.',
    fields: [
      { name: 'nvlGeneracionCoporativoTenant', label: 'Nivel generacion corporativo', type: 'id', required: true },
      { name: 'tipo_tenant', label: 'Tipo tenant', type: 'id', required: true },
      { name: 'ownerType', label: 'Owner type', type: 'id', required: true },
      { name: 'apisDominios', label: 'Apis dominios', type: 'id', required: true },
      { name: 'accionesUsu', label: 'Accion usuario', type: 'id', required: true },
      { name: 'rolesMabs', label: 'Rol mabs', type: 'id', required: true },
    ],
  },
  {
    id: 'perm-actualizar-corporativo',
    section: 'tenant',
    actor: 'tenantGlobal',
    method: 'PUT',
    path: '/api/config/permisos/corporativo/actualizar/tenant/:id',
    title: 'Actualizar herencia corporativa',
    description: 'Actualiza datos del tenant corporativo por id.',
    fields: [
      { name: 'id', label: 'ID registro', type: 'id', required: true, pathParam: true },
      { name: 'nvlGeneracionCoporativoTenant', label: 'Nivel generacion corporativo', type: 'id' },
      { name: 'tipo_tenant', label: 'Tipo tenant', type: 'id' },
      { name: 'ownerType', label: 'Owner type', type: 'id' },
      { name: 'apisDominios', label: 'Apis dominios', type: 'id' },
      { name: 'accionesUsu', label: 'Accion usuario', type: 'id' },
      { name: 'rolesMabs', label: 'Rol mabs', type: 'id' },
    ],
  },
  {
    id: 'perm-desactivar-corporativo',
    section: 'tenant',
    actor: 'tenantGlobal',
    method: 'DELETE',
    path: '/api/config/permisos/corporativo/desactivar/tenant/:id',
    title: 'Desactivar registro (opcional)',
    description: 'Desactiva herencia corporativa sin eliminar físicamente.',
    fields: [{ name: 'id', label: 'ID registro', type: 'id', required: true, pathParam: true }],
  },
  {
    id: 'perm-eliminar-corporativo',
    section: 'tenant',
    actor: 'tenantGlobal',
    method: 'DELETE',
    path: '/api/config/permisos/corporativo/eliminar/tenant/:id',
    title: 'Eliminar registro (opcional)',
    description: 'Elimina registro corporativo de forma definitiva.',
    fields: [{ name: 'id', label: 'ID registro', type: 'id', required: true, pathParam: true }],
  },
  {
    id: 'perm-corporativo-guardar-catalogo',
    section: 'tenant',
    actor: 'tenantGlobal',
    method: 'POST',
    path: '/api/config/permisos/corporativo/guardar/catologo/tenant/corporativo',
    title: 'Guardar catalogo corporativo',
    description: 'Crea catalogo de tipo comprador corporativo.',
    fields: [
      { name: 'tipo_comprador', label: 'Tipo comprador', type: 'text', required: true },
      { name: 'sigla', label: 'Sigla', type: 'text', required: true },
    ],
  },
  {
    id: 'perm-corporativo-guardar-rol',
    section: 'tenant',
    actor: 'tenantGlobal',
    method: 'POST',
    path: '/api/config/permisos/corporativo/guardar/roles/tenant/corporativo',
    title: 'Guardar rol corporativo',
    description: 'Crea rol corporativo para tenant.',
    fields: [{ name: 'rol', label: 'Rol', type: 'text', required: true }],
  },
  {
    id: 'perm-corporativo-crear-tenant',
    section: 'tenant',
    actor: 'tenantGlobal',
    method: 'POST',
    path: '/api/config/permisos/corporativo/crear/tenant',
    title: 'Crear tenant corporativo (modulo corporativo)',
    description: 'Crea tenant corporativo desde modulo corporativo.',
    fields: [
      { name: 'coporativo', label: 'Corporativo (ID o valor)', type: 'text' },
      { name: 'nvlGeneracionCoporativoTenant', label: 'Nivel generacion corporativo', type: 'id', required: true },
      { name: 'tenantGlobalId', label: 'Tenant global destino', type: 'id' },
    ],
  },
  {
    id: 'perm-corporativo-crear-herencia',
    section: 'permisos',
    actor: 'tenantGlobal',
    method: 'POST',
    path: '/api/config/permisos/corporativo/crear/herencia/permisos/tenant',
    title: 'Crear herencia permisos corporativos',
    description: 'Asigna herencia de vistas y acciones a tenant corporativo.',
    fields: [
      { name: 'usuarioId', label: 'Usuario destino', type: 'id' },
      { name: 'rolId', label: 'Rol ID', type: 'id', required: true },
      { name: 'tenantCorporativoId', label: 'Tenant corporativo ID', type: 'id', required: true },
      { name: 'tenantGlobal', label: 'Tenant global ID', type: 'id' },
      { name: 'acciones', label: 'Acciones (array JSON)', type: 'json', required: true, placeholder: '["id_accion_1","id_accion_2"]' },
      { name: 'vistas', label: 'Vistas (array JSON)', type: 'json', placeholder: '["id_vista_1","id_vista_2"]' },
    ],
  },
  {
    id: 'perm-corporativo-crear-nivel',
    section: 'tenant',
    actor: 'tenantGlobal',
    method: 'POST',
    path: '/api/config/permisos/corporativo/crear/tenant/nvl/corporativo',
    title: 'Crear nivel corporativo',
    description: 'Crea nivel corporativo con acciones permitidas.',
    fields: [
      { name: 'nombre', label: 'Nombre del nivel', type: 'text', required: true },
      { name: 'accionesPermitidas', label: 'Acciones permitidas (array JSON)', type: 'json', required: true, placeholder: '["crear","editar","ver"]' },
      { name: 'heredarPermisos', label: 'Heredar permisos (true/false)', type: 'json', placeholder: 'true' },
      { name: 'tenantGlobalId', label: 'Tenant global ID', type: 'id' },
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
const isTenantSuperAdminScopeOption = (value: string): boolean =>
  String(value || '').trim().startsWith(TENANT_SUPERADMIN_SCOPE_PREFIX);

const ParametrosGobernanza: React.FC = () => {
  const [activeSection, setActiveSection] = useState<EndpointSection>('tenant');
  const [endpointModal, setEndpointModal] = useState<EndpointSpec | null>(null);
  const [endpointSearch, setEndpointSearch] = useState('');
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
  const [herenciaAsociadaOptionsByEndpoint, setHerenciaAsociadaOptionsByEndpoint] = useState<Record<string, GenericSelectOption[]>>({});
  const [herenciaAsociadaDataByEndpoint, setHerenciaAsociadaDataByEndpoint] = useState<Record<string, Record<string, any>>>({});
  const [syncInfoByEndpoint, setSyncInfoByEndpoint] = useState<Record<string, any>>({});
  const [syncRunningByEndpoint, setSyncRunningByEndpoint] = useState<Record<string, boolean>>({});
  const [herenciaDetalle, setHerenciaDetalle] = useState<any | null>(null);

  const primaryTenantForm = useMemo(() => ENDPOINTS.find((e) => e.primary), []);
  const endpointsBySection = useMemo(
    () =>
      ENDPOINTS.filter((e) => e.section === activeSection && !e.primary).filter((e) => {
        const q = endpointSearch.trim().toLowerCase();
        if (!q) return true;
        return (
          e.title.toLowerCase().includes(q) ||
          e.path.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.method.toLowerCase().includes(q)
        );
      }),
    [activeSection, endpointSearch]
  );

  const hydrateData = async () => {
    setLoadingData(true);
    try {
      let actorTenantSuperAdminId = '';
      let actorTenantGlobalId = '';
      let vistasResolved: Vista[] = [];
      let accionesResolved: Accion[] = [];

      const [selectsRes, tenantsRes, rutasRes, accionesRes, herenciasRes, reglasRes, tenantsDestinoRes, contextosRes, tenantCorpRes] = await Promise.allSettled([
        apiFetch('/api/config/global/creacion/usu/tenant/global/selects', { method: 'GET' }),
        apiFetch('/api/config/global/creacion/usu/tenant/libres', { method: 'GET' }),
        apiFetch('/api/config/tenant/tipo/listar/vistas/contexto/roles', { method: 'GET' }),
        apiFetch('/api/config/parametrizacion/widget/branding/acciones', { method: 'GET' }),
        apiFetch('/api/config/permisos/listar/usu/tenant/libres', { method: 'GET' }),
        apiFetch('/api/config/tenant/listar/reglas', { method: 'GET' }),
        apiFetch('/api/config/tenant/tipo/listar/globales/contexto/roles', { method: 'GET' }),
        apiFetch('/api/config/tenant/tipo/api/contexto', { method: 'GET' }),
        apiFetch('/api/config/permisos/creacion/admin/tenant/corporativos', { method: 'GET' }),
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
          nvlGeneracionTenant: mapOptions(data.nivelesGlobales, 'generation_tenant'),
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
          `Selects: niveles=${Array.isArray(data.nivelesGlobales) ? data.nivelesGlobales.length : 0}, tipos=${Array.isArray(data.tiposTenant) ? data.tiposTenant.length : 0}, dominios=${Array.isArray(data.dominios) ? data.dominios.length : 0}, acciones=${Array.isArray(data.acciones) ? data.acciones.length : 0}, roles=${rawRolesMabs.length}, corporativos=${Array.isArray(data.corporativosDisponibles) ? data.corporativosDisponibles.length : 0}`
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

          const destinoRows =
            pickArray(destinoPayload, ['data', 'items']).length > 0
              ? pickArray(destinoPayload, ['data', 'items'])
              : pickArray(destinoPayload?.data, ['items', 'data']);
          destinoRows.forEach((row: any) => {
            const id = String(row?.tenantGlobalId || row?.id || row?._id || row?.iud || '').trim();
            if (!id) return;
            const rolName = String(row?.rol || row?.rolesMabs?.rol || '').trim();
            const label = String(
              row?.label ||
              (rolName ? `${rolName} | ${id}` : '') ||
              row?.name ||
              row?.nombre ||
              row?.titulo ||
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
          .map((r: any) => ({ id: String(r?._id || r?.id || ''), label: String(r?.name || r?.path || r?._id || ''), path: String(r?.path || '') }))
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
              label: String(v?.name || v?.path || id),
              path: String(v?.path || ''),
            });
          });
        });
        if (map.size) vistasResolved = Array.from(map.values());
      }

      // Fallback SOLO para tenantSuperAdmin sin herencia dinámica:
      // usar rutas de seguridad y acciones del sistema.
      const actorEsSoloSuperAdmin = !!actorTenantSuperAdminId && !actorTenantGlobalId;
      if (actorEsSoloSuperAdmin && !vistasResolved.length) {
        try {
          const fallbackRutas: any = await apiFetch('/api/seguridad/rutas/listarRutas/admin', { method: 'GET' });
          const rowsFallback = pickArray(fallbackRutas, ['data', 'items', 'rutas']);
          const mapped = rowsFallback
            .filter((r: any) => r?.estadoRuta !== false)
            .map((r: any) => ({ id: String(r?._id || r?.iud || r?.id || ''), label: String(r?.name || r?.path || r?._id || ''), path: String(r?.path || '') }))
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
          heredaOptionsMap.set(heredaId, {
            id: heredaId,
            label: `${heredaId} | ${tenantLabel} | Vistas:${vCount} | Acciones:${aCount}`,
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
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo cargar contexto de gobernanza');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { hydrateData(); }, []);

  const getFieldValue = (endpointId: string, key: string): string => formData[endpointId]?.[key] ?? '';
  const setFieldValue = (endpointId: string, key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [endpointId]: { ...(prev[endpointId] || {}), [key]: value } }));
  };
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
  const getHeredaGlobalOptionsPermitidas = (): HeredaGlobalOption[] => {
    if (!actorEsTenantSuperAdmin()) return [];
    return heredaGlobalOptions;
  };
  const getTenantSuperAdminOptionsForPermUsuario = (): HeredaGlobalOption[] => {
    const unique = new Map<string, HeredaGlobalOption>();
    const actorTsa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
    if (actorTsa) {
      unique.set(actorTsa, {
        id: actorTsa,
        label: `tenantSuperAdmin (DIOS) | ${actorTsa}`,
      });
    }
    tenantGlobales.forEach((t) => {
      const tsa = String(t?.tenantSuperAdmin || '').trim();
      if (!tsa || unique.has(tsa)) return;
      unique.set(tsa, {
        id: tsa,
        label: `tenantSuperAdmin (DIOS) | ${tsa}`,
      });
    });
    return Array.from(unique.values());
  };
  const getHeredaOptionsPermitidasPorTenantSuperAdmin = (tenantSuperAdminId: string): HeredaGlobalOption[] => {
    const tsa = String(tenantSuperAdminId || '').trim();
    if (!tsa) return [];
    const ids = new Set<string>();
    const tenantGlobalById = new Map<string, any>(
      (Array.isArray(tenantGlobales) ? tenantGlobales : []).map((t: any) => [String(t?.id || '').trim(), t])
    );
    herenciasUsuario.forEach((h: any) => {
      const tenantSuperH = String(
        h?.tenantSuperTenant?._id ||
        h?.tenantSuperTenant ||
        h?.tenantSuperAdmin?._id ||
        h?.tenantSuperAdmin ||
        ''
      ).trim();
      const tenantGlobalH = String(
        h?.tenantGlobal?._id ||
        h?.tenantGlobal?.id ||
        h?.tenantGlobal ||
        ''
      ).trim();
      const tenantGlobalDoc = tenantGlobalById.get(tenantGlobalH);
      const tenantSuperDesdeGlobal = String(tenantGlobalDoc?.tenantSuperAdmin || '').trim();
      const perteneceASuperAdmin = tenantSuperH === tsa || tenantSuperDesdeGlobal === tsa;
      if (!perteneceASuperAdmin) return;
      const heredaId = String(h?.heredaGlobal?._id || h?.heredaGlobal || '').trim();
      if (heredaId) ids.add(heredaId);
    });
    return getHeredaGlobalOptionsPermitidas().filter((opt) => ids.has(opt.id));
  };
  const getReglaDiosOptionsByTenantSuperAdmin = (tenantSuperAdminId: string): HeredaGlobalOption[] => {
    const tsa = String(tenantSuperAdminId || '').trim();
    if (!tsa) return [];
    return Object.entries(ruleCatalog || {})
      .map(([ruleId, raw]) => ({ ruleId, raw }))
      .filter(({ raw }) => raw?.securityPlatform === true)
      .filter(({ raw }) => {
        const gens = Array.isArray(raw?.generacionTenatGlobales) ? raw.generacionTenatGlobales : [];
        if (!gens.length) return true;
        return gens.some((g: any) => String(g?._id || g || '').trim() === tsa);
      })
      .map(({ ruleId, raw }) => {
        const base = String(raw?.nombre || raw?.name || raw?.titulo || 'Regla DIOS').trim();
        return { id: ruleId, label: `[REGLA] ${base} | ${ruleId}` };
      });
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
      qs.set('soloActivos', 'true');
      const res: any = await apiFetch(
        `/api/config/permisos/creacion/admin/tenant/global?${qs.toString()}`,
        { method: 'GET' }
      );
      const rows = pickArray(res, ['data', 'items', 'herencias']);
      const byId: Record<string, any> = {};
      const options = rows
        .map((row: any) => {
          const id = String(row?._id || row?.iud || '').trim();
          if (!id) return null;
          byId[id] = row;
          const fuente = String(row?.fuenteHerencia || 'tenantGlobal').trim();
          const rol = String(row?.rolId?.rol || row?.rolId?._id || row?.rolId || 'SIN_ROL').trim();
          const tc = String(row?.tenantCorporativo?._id || row?.tenantCorporativo || '').trim();
          const usuario = String(row?.usuarioId?.nombre || row?.usuarioId?.name || row?.usuarioId?._id || '-').trim();
          const rutasPreview = (Array.isArray(row?.vistas) ? row.vistas : [])
            .slice(0, 2)
            .map((v: any) => String(v?.name || v?.path || v?._id || '').trim())
            .filter(Boolean)
            .join(', ');
          const vCount = Array.isArray(row?.vistas) ? row.vistas.length : 0;
          const aCount = Array.isArray(row?.acciones) ? row.acciones.length : 0;
          const suffix = tc ? ` | TC:${tc}` : '';
          const rutasTxt = rutasPreview ? ` | Rutas:${rutasPreview}` : '';
          const fuenteTxt = fuente === 'tenantSuperAdmin' ? '[SUPERADMIN]' : '[TENANT]';
          return { id, label: `${fuenteTxt} ${id}${suffix} | Rol:${rol} | Usu:${usuario} | V:${vCount} A:${aCount}${rutasTxt}` };
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
  const getPermisosCatalog = (endpointId: string): { vistasCatalogo: Vista[]; accionesCatalogo: Accion[] } => {
    if (endpointId === 'perm-usuario-tenant-global') {
      const selectedHeredaGlobal = getFieldValue(endpointId, 'heredaGlobal').trim();
      if (!selectedHeredaGlobal) return { vistasCatalogo: [], accionesCatalogo: [] };

      const getId = (value: any): string => String(value?._id || value || '').trim();
      const herenciasMatch = herenciasUsuario.filter((h: any) => {
        const heredaId = String(h?.heredaGlobal?._id || h?.heredaGlobal || '').trim();
        return heredaId === selectedHeredaGlobal;
      });
      const herenciaConDatos = herenciasMatch.find((h: any) => {
        const vs = Array.isArray(h?.vistas) ? h.vistas : [];
        const ac = Array.isArray(h?.acciones) ? h.acciones : [];
        return vs.length > 0 && ac.length > 0;
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

        const vistaById = new Map(vistas.map((v) => [v.id, v]));
        const accionById = new Map(acciones.map((a) => [a.id, a]));

        const vistasCatalogo = recursoIds.map((id: string) => vistaById.get(id) || { id, label: id, path: '' });
        const accionesCatalogo = accionIds.length
          ? accionIds.map((id: string) => accionById.get(id) || { id, label: id, method: '' })
          : [];

        if (vistasCatalogo.length && accionesCatalogo.length) {
          return { vistasCatalogo, accionesCatalogo };
        }
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

      const vistaById = new Map(vistas.map((v) => [v.id, v]));
      const accionById = new Map(acciones.map((a) => [a.id, a]));

      const vistasDesdeRegla = recursoIds.map((id) => {
        const vista = vistaById.get(id);
        return vista || { id, label: id, path: '' };
      });
      const accionesDesdeRegla = accionIds.length
        ? accionIds.map((id) => accionById.get(id) || { id, label: id, method: '' })
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
      hydrateData();
      return;
    }
    if (!needsTenantGlobal) return;
    if (tenantGlobales.length === 0 && !loadingData) {
      hydrateData();
    }
  }, [endpointModal, tenantGlobales.length, loadingData]);

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

  useEffect(() => {
    const endpointId = 'perm-usuario-tenant-global';
    const currentHereda = getFieldValue(endpointId, 'heredaGlobal').trim();
    const currentTsa = getFieldValue(endpointId, 'tenantSuperAdminScope').trim();
    const currentRegla = getFieldValue(endpointId, 'reglaGlobalFallback').trim();

    if (!actorEsTenantSuperAdmin()) {
      if (currentHereda) setFieldValue(endpointId, 'heredaGlobal', '');
      if (currentTsa) setFieldValue(endpointId, 'tenantSuperAdminScope', '');
      if (currentRegla) setFieldValue(endpointId, 'reglaGlobalFallback', '');
      return;
    }

    const tsaOptions = getTenantSuperAdminOptionsForPermUsuario();
    const resolvedTsa = tsaOptions.some((opt) => opt.id === currentTsa)
      ? currentTsa
      : String(tsaOptions[0]?.id || '').trim();
    if (!resolvedTsa) return;
    if (resolvedTsa !== currentTsa) {
      setFieldValue(endpointId, 'tenantSuperAdminScope', resolvedTsa);
    }

    const herenciasDisponibles = getHeredaOptionsPermitidasPorTenantSuperAdmin(resolvedTsa);
    const reglasDisponibles = getReglaDiosOptionsByTenantSuperAdmin(resolvedTsa);

    if (herenciasDisponibles.length > 0) {
      if (!herenciasDisponibles.some((h) => h.id === currentHereda)) {
        const nextHereda = String(herenciasDisponibles[0]?.id || '').trim();
        if (nextHereda) setFieldValue(endpointId, 'heredaGlobal', nextHereda);
      }
      if (currentRegla) setFieldValue(endpointId, 'reglaGlobalFallback', '');
      return;
    }

    const resolvedRegla = reglasDisponibles.some((r) => r.id === currentRegla)
      ? currentRegla
      : String(reglasDisponibles[0]?.id || '').trim();
    if (resolvedRegla && resolvedRegla !== currentRegla) {
      setFieldValue(endpointId, 'reglaGlobalFallback', resolvedRegla);
    }
    if (resolvedRegla && resolvedRegla !== currentHereda) {
      setFieldValue(endpointId, 'heredaGlobal', resolvedRegla);
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
        const raw = getFieldValue(endpoint.id, field.name);
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

      if (endpoint.id === 'perm-usuario-tenant-global') {
        if (!actorEsTenantSuperAdmin()) {
          throw new Error('Solo tenantSuperAdmin (DIOS) puede ejecutar esta operacion');
        }
        const tenantSuperAdminScope = getFieldValue(endpoint.id, 'tenantSuperAdminScope').trim();
        if (!tenantSuperAdminScope) {
          throw new Error('Selecciona tenantSuperAdmin');
        }
        const selectedHeredaGlobal = String(body.heredaGlobal || '').trim();
        if (!selectedHeredaGlobal) throw new Error('Completa: Herencia global');
        const herenciasDisponibles = getHeredaOptionsPermitidasPorTenantSuperAdmin(tenantSuperAdminScope);
        const reglasDisponibles = getReglaDiosOptionsByTenantSuperAdmin(tenantSuperAdminScope);

        if (herenciasDisponibles.length > 0) {
          if (!herenciasDisponibles.some((opt) => opt.id === selectedHeredaGlobal)) {
            throw new Error('La herencia seleccionada no pertenece al tenantSuperAdmin');
          }
        } else {
          if (!reglasDisponibles.some((opt) => opt.id === selectedHeredaGlobal)) {
            throw new Error('No hay herencias; debes seleccionar una regla DIOS parametrizada');
          }
        }

        const { vistasCatalogo, accionesCatalogo } = getPermisosCatalog(endpoint.id);
        if (!vistasCatalogo.length || !accionesCatalogo.length) {
          throw new Error('La herencia no tiene datos y tampoco hay regla con acciones/vistas para fallback');
        }

        const selected = getCatalogSelection(endpoint.id);
        body.vistasSeleccionadas = selected.vistas.length ? selected.vistas : vistasCatalogo.map((v) => v.id);
        body.accionesSeleccionadas = selected.acciones.length ? selected.acciones : accionesCatalogo.map((a) => a.id);
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
          throw new Error('Debes seleccionar al menos un permiso válido para el tenantGlobal');
        }
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
        const nvlEsTenantCorporativo = /tenant-(co?rporativo)|nvl 2/i.test(String(selectedNvlLabel));
        if (!nvlEsTenantCorporativo && 'tenantGlobalRef' in body) {
          delete body.tenantGlobalRef;
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

      const payload: any = { method: endpoint.method, headers };
      if (endpoint.method !== 'GET' && endpoint.method !== 'DELETE') payload.body = body;
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

    return (
      <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[980px] text-left text-xs">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-3 py-2">x-regla-id</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Dominio</th>
              <th className="px-3 py-2">Tenant Global</th>
              <th className="px-3 py-2">Corporativo</th>
              <th className="px-3 py-2">Contexto</th>
              <th className="px-3 py-2">Vistas</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, idx: number) => {
              const reglaId = String(row?.['x-regla-id'] || row?.reglaIdEncrypted || row?.iud || row?.rid || row?._id || '');
              const tenant = Array.isArray(row?.generacionGlovallNvlRoles) ? row.generacionGlovallNvlRoles[0] : null;
              const corp = tenant?.coporativo;
              const contexto = Array.isArray(row?.contextoDefi) ? row.contextoDefi.map((c: any) => c?.contexto || c?._id || c).join(', ') : '-';
              const vistas = Array.isArray(row?.recurso) ? row.recurso.map((v: any) => v?.name || v?.path || v?._id || v).join(', ') : '-';
              const acciones = Array.isArray(row?.accionesUsu) ? row.accionesUsu.map((a: any) => a?.etiquetas || a?.method || a?._id || a).join(', ') : '-';
              return (
                <tr key={reglaId || idx} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-mono">{reglaId || '-'}</td>
                  <td className="px-3 py-2">{row?.securityPlatform === true ? 'DIOS' : 'TENANT'}</td>
                  <td className="px-3 py-2">{row?.dominioTenatGlobales || '-'}</td>
                  <td className="px-3 py-2">{String(tenant?._id || tenant || '-')}</td>
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
              <th className="px-3 py-2">Fecha asignación</th>
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

  const renderTenantLibresTable = () => {
    const rows = pickArray(resultData['tenant-listar-libres'], ['data', 'items', 'tenants']);
    if (!rows.length) {
      return <pre className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">{result['tenant-listar-libres'] || 'Aun sin respuesta'}</pre>;
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
        {!vistasCatalogo.length || !accionesCatalogo.length ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Faltan datos para construir permisos.
            <Button className="ml-2 h-7 px-2 text-xs" type="button" variant="outline" onClick={hydrateData} disabled={loadingData}>
              Recargar datos
            </Button>
          </div>
        ) : null}
        {isTenantReglasEndpoint && allViewsWithAllActionsSelected ? (
          <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
            Modo masivo activo. Se insertarán todas las vistas con todas las acciones.
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
    return (
      <div className="rounded-xl border border-emerald-100 bg-white/80 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-emerald-700">Elige la vista que quieres cambiarle los permisos</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setCatalogSelectionFor(endpoint.id, {
                  vistas: vistasCatalogo.map((v) => v.id),
                  acciones: accionesCatalogo.map((a) => a.id),
                })
              }
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
        {!vistasCatalogo.length || !accionesCatalogo.length ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Primero elige una herencia y luego marca la vista a la que le quieres cambiar permisos.
            <Button className="ml-2 h-7 px-2 text-xs" type="button" variant="outline" onClick={hydrateData} disabled={loadingData}>
              Recargar datos
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
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
      {(
        endpoint.id === 'tenant-crear-global-usuario' ||
        endpoint.id === 'tenant-crear-global-admin' ||
        endpoint.id === 'tenant-actualizar-global'
      ) ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          {tenantGlobalSelectsDebug || 'Selects aun no cargados.'}
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
              <select
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                value={herenciaSelected}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setFieldValue(endpoint.id, 'herenciaAsociada', nextId);
                  setFieldValue(endpoint.id, 'id', nextId);
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
          </div>
        );
      })() : null}
      {endpoint.fields.map((field) => {
        if (
          (endpoint.id === 'perm-admin-tenant-global-desactivar' || endpoint.id === 'perm-admin-tenant-global-eliminar') &&
          field.name === 'id'
        ) {
          return null;
        }
        if (field.type === 'permisos') {
          if (endpoint.id === 'perm-admin-tenant-global' || endpoint.id === 'perm-admin-tenant-global-actualizar') {
            return <div key={field.name}>{renderHerenciaSelectionBuilder(endpoint)}</div>;
          }
          return <div key={field.name}>{renderPermisosBuilder(endpoint)}</div>;
        }
        if (endpoint.id === 'perm-usuario-tenant-global' && field.name === 'heredaGlobal') {
          const esSuperAdmin = actorEsTenantSuperAdmin();
          const tsaOptions = getTenantSuperAdminOptionsForPermUsuario();
          const tsaSelected = getFieldValue(endpoint.id, 'tenantSuperAdminScope').trim();
          const herenciasDisponibles = getHeredaOptionsPermitidasPorTenantSuperAdmin(tsaSelected);
          const reglasDisponibles = getReglaDiosOptionsByTenantSuperAdmin(tsaSelected);
          const hayHerencias = herenciasDisponibles.length > 0;
          const reglaFallback = getFieldValue(endpoint.id, 'reglaGlobalFallback').trim();
          return (
            <div key={field.name}>
              <Label>TenantSuperAdmin *</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                value={tsaSelected}
                onChange={(e) => {
                  const nextTsa = e.target.value;
                  setFieldValue(endpoint.id, 'tenantSuperAdminScope', nextTsa);
                  setFieldValue(endpoint.id, 'heredaGlobal', '');
                  setFieldValue(endpoint.id, 'reglaGlobalFallback', '');
                }}
                disabled={!esSuperAdmin}
              >
                <option value="">{esSuperAdmin ? 'Selecciona tenantSuperAdmin' : 'Solo tenantSuperAdmin puede asignar'}</option>
                {tsaOptions.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
              </select>

              <Label className="mt-2 block">{field.label} {field.required ? '*' : ''}</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                value={getFieldValue(endpoint.id, field.name)}
                onChange={(e) => setFieldValue(endpoint.id, field.name, e.target.value)}
                disabled={!esSuperAdmin || !hayHerencias}
              >
                <option value="">
                  {!esSuperAdmin
                    ? 'Solo tenantSuperAdmin puede asignar'
                    : !tsaSelected
                    ? 'Selecciona tenantSuperAdmin primero'
                    : hayHerencias
                    ? 'Selecciona herencia'
                    : 'Sin herencias para este tenantSuperAdmin'}
                </option>
                {herenciasDisponibles.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
              </select>

              <Label className="mt-2 block">Regla parametrizada</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                value={reglaFallback}
                onChange={(e) => {
                  const nextRegla = e.target.value;
                  setFieldValue(endpoint.id, 'reglaGlobalFallback', nextRegla);
                  setFieldValue(endpoint.id, field.name, nextRegla);
                }}
                disabled={!esSuperAdmin || !tsaSelected || hayHerencias}
              >
                <option value="">
                  {!esSuperAdmin
                    ? 'Solo tenantSuperAdmin puede asignar'
                    : !tsaSelected
                    ? 'Selecciona tenantSuperAdmin primero'
                    : hayHerencias
                    ? 'Bloqueada: existe herencia'
                    : 'Selecciona regla DIOS parametrizada'}
                </option>
                {reglasDisponibles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                {esSuperAdmin
                  ? (hayHerencias
                    ? 'Existe herencia: se habilitan herencias y se bloquea regla.'
                    : 'Sin herencia: se habilita regla parametrizada para fallback.')
                  : 'Flujo bloqueado para tenantGlobal.'}
              </p>
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
        const usesTenantGlobalSelects =
          (
            endpoint.id === 'tenant-crear-global-usuario' ||
            endpoint.id === 'tenant-crear-global-admin' ||
            endpoint.id === 'tenant-actualizar-global'
          ) &&
          ['tipo_tenant', 'ownerType', 'nvlGeneracionTenant', 'apisDominios', 'accionesUsu', 'rolesMabs', 'coporativo', 'tenantGlobalRef'].includes(field.name);
        if (usesTenantGlobalSelects) {
          const options = tenantGlobalSelects[field.name] || [];
          const actorEsTenantGlobal = !!String(tenantGlobalActor.tenantGlobalId || '').trim();
          const selectedNvl = getFieldValue(endpoint.id, 'nvlGeneracionTenant').trim();
          const nvlLabel = (tenantGlobalSelects.nvlGeneracionTenant || []).find((opt) => opt.id === selectedNvl)?.label || '';
          const nvlTexto = String(nvlLabel).toLowerCase();
          const nvlEsLibre = nvlTexto.includes('libre') || nvlTexto.includes('nvl 0');
          const nvlEsTenantGlobal = nvlTexto.includes('tenant-global') || nvlTexto.includes('nvl 1');
          const nvlEsTenantCorporativo = /tenant-(co?rporativo)|nvl 2/i.test(String(nvlLabel));
          const nvlPermiteCorporativo = nvlEsTenantGlobal || nvlEsTenantCorporativo;
          const nvlBloqueaRolDios = nvlEsTenantGlobal || nvlEsTenantCorporativo;
          const opcionesRolesPorNivel = field.name === 'rolesMabs'
            ? (tenantGlobalSelects.rolesMabs || [])
            : options;
          const optionsRoles = field.name === 'rolesMabs'
            ? opcionesRolesPorNivel.filter((opt) => !nvlBloqueaRolDios || String(opt.rol || '').toUpperCase() !== 'DIOS')
            : opcionesRolesPorNivel;
          const optionsFiltradas = field.name === 'coporativo'
            ? (nvlPermiteCorporativo ? options : [])
            : field.name === 'nvlGeneracionTenant'
            ? (actorEsTenantGlobal
              ? options.filter((opt) => {
                  const txt = String(opt.label || '').toLowerCase();
                  const esNvl1 = txt.includes('tenant-global') || txt.includes('nvl 1');
                  const esNvl2 = /tenant-(co?rporativo)|nvl 2/i.test(String(opt.label || ''));
                  return esNvl1 || esNvl2;
                })
              : options)
            : field.name === 'tenantGlobalRef'
            ? (nvlEsTenantCorporativo ? options : [])
            : optionsRoles;
          const disabled =
            field.name === 'coporativo'
              ? !selectedNvl || !nvlPermiteCorporativo
              : field.name === 'tenantGlobalRef'
              ? !selectedNvl || !nvlEsTenantCorporativo
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
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                  value={getFieldValue(endpoint.id, field.name)}
                  onChange={(e) => {
                    setFieldValue(endpoint.id, field.name, e.target.value);
                    if (field.name === 'nvlGeneracionTenant') {
                      // Cambio de nivel: limpiar dependencias
                      const nextNvlLabel = (tenantGlobalSelects.nvlGeneracionTenant || []).find((opt) => opt.id === e.target.value)?.label || '';
                      const nextNvlEsLibre = String(nextNvlLabel).toLowerCase().includes('libre') || String(nextNvlLabel).toLowerCase().includes('nvl 0');
                      setFieldValue(endpoint.id, 'coporativo', '');
                      setFieldValue(endpoint.id, 'tenantGlobalRef', '');
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
              {isAccionUsuarioMulti ? <p className="mt-1 text-xs text-slate-500">Selecciona una o varias acciones.</p> : null}
              {!loadingData && optionsFiltradas.length === 0 ? (
                <p className="mt-1 text-xs text-amber-700">
                  {field.name === 'coporativo' && nvlEsLibre
                    ? 'Para NVL LIBRE no se requiere corporativo.'
                    : 'Sin opciones para este campo. Verifica rol `tenantSuperAdmin` o la configuracion del nivel.'}
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
      {endpoint.id === 'perm-usuario-tenant-global' ? renderHerenciaSelectionBuilder(endpoint) : null}
      <div className="flex items-center gap-3">
        <Button onClick={() => runEndpoint(endpoint)} disabled={!!running[endpoint.id]}>
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
      {endpoint.id === 'tenant-listar-reglas'
        ? renderReglasTable()
        : endpoint.id === 'tenant-actualizar-regla-dios'
        ? renderActualizarReglaDiosResultado()
        : endpoint.id === 'tenant-listar-libres'
        ? renderTenantLibresTable()
        : endpoint.id === 'perm-listar-herencias'
        ? renderHerenciasUsuarioTable()
        : endpoint.id === 'perm-admin-tenant-global-listar'
        ? renderHerenciasAdminTable()
        : <pre className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">{result[endpoint.id] || 'Aun sin respuesta'}</pre>}
    </div>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffe4f2,transparent_40%),radial-gradient(circle_at_bottom_right,#dbfff0,transparent_45%),#f8fafc] p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <Card className="border-rose-200 bg-white/90 shadow-md backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-3xl font-black tracking-tight text-slate-900">
              <ShieldCheck className="h-8 w-8 text-rose-500" /> Parametros Gobernanza
            </CardTitle>
            <p className="flex items-center gap-2 text-rose-600"><Sparkles className="h-4 w-4" /> Formularios guiados con datos reales de tus endpoints.</p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Badge variant="outline">Vistas activas: {vistas.length}</Badge>
            <Badge variant="outline">Acciones activas: {acciones.length}</Badge>
            <Badge variant="outline">TenantGlobal + corporativo: {tenantGlobales.length}</Badge>
            <Badge variant="outline">Contextos: {contextos.length}</Badge>
            <Button variant="outline" onClick={hydrateData} disabled={loadingData}>{loadingData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Recargar datos API</Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <button type="button" onClick={() => setActiveSection('tenant')} className={`rounded-2xl border p-5 text-left transition-all duration-300 ${activeSection === 'tenant' ? 'border-rose-400 bg-rose-50 shadow-lg' : 'border-slate-200 bg-white/70 hover:-translate-y-0.5 hover:shadow-md'}`}>
            <h3 className="text-2xl font-bold text-slate-900">Gobernanza Tenant</h3>
            <p className="text-rose-600">{ENDPOINTS.filter((e) => e.section === 'tenant').length} endpoints</p>
          </button>
          <button type="button" onClick={() => setActiveSection('permisos')} className={`rounded-2xl border p-5 text-left transition-all duration-300 ${activeSection === 'permisos' ? 'border-emerald-400 bg-emerald-50 shadow-lg' : 'border-slate-200 bg-white/70 hover:-translate-y-0.5 hover:shadow-md'}`}>
            <h3 className="text-2xl font-bold text-slate-900">Gobernanza Permisos</h3>
            <p className="text-emerald-700">{ENDPOINTS.filter((e) => e.section === 'permisos').length} endpoints</p>
          </button>
        </div>

        <Card className="border-slate-200 bg-white/90">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 text-slate-700">
                <Wand2 className="h-4 w-4 text-rose-500" />
                <span className="text-sm">Flujo guiado por endpoint con datos reales de API</span>
              </div>
              <div className="w-full md:max-w-md">
                <Input
                  value={endpointSearch}
                  onChange={(e) => setEndpointSearch(e.target.value)}
                  placeholder="Buscar endpoint por nombre, ruta o metodo"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {activeSection === 'tenant' && primaryTenantForm && (
          <Card className="border-rose-200 bg-white/90 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-900">Formulario principal recomendado</CardTitle>
              <p className="text-rose-600">{primaryTenantForm.title}</p>
            </CardHeader>
            <CardContent>{renderForm(primaryTenantForm)}</CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {endpointsBySection.map((endpoint) => (
            <Card
              key={endpoint.id}
              className={`group border-slate-200 bg-white/90 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${endpoint.method === 'GET' ? 'md:col-span-2 xl:col-span-3' : ''}`}
            >
              <CardHeader>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <Badge className={`border ${METHOD_STYLE[endpoint.method]}`}>{endpoint.method}</Badge>
                  <Badge variant="outline">{actorBadge(endpoint.actor)}</Badge>
                </div>
                <CardTitle className="text-lg text-slate-900">{endpoint.title}</CardTitle>
                <p className="text-sm text-slate-600">{endpoint.description}</p>
              </CardHeader>
              <CardContent>
                <p className={`mb-3 rounded bg-slate-100 p-2 font-mono text-xs ${endpoint.method === 'GET' ? '' : 'line-clamp-2'}`}>{endpoint.path}</p>
                <div className="flex gap-2">
                  <Button className="flex-1" variant="outline" onClick={() => setEndpointModal(endpoint)}>
                    <Settings2 className="mr-2 h-4 w-4" />
                    Configurar
                  </Button>
                  <Button className="flex-1" onClick={() => endpoint.fields.length === 0 ? runEndpoint(endpoint) : setEndpointModal(endpoint)} disabled={!!running[endpoint.id]}>
                    {running[endpoint.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Ejecutar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!herenciaDetalle} onOpenChange={(open) => !open && setHerenciaDetalle(null)}>
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Detalle de herencias por usuario/tenant</DialogTitle>
          </DialogHeader>
          {herenciaDetalle ? (
            <div className="space-y-3 text-xs">
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
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-4xl">
          {endpointModal && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-rose-500" /> {endpointModal.title}
                </DialogTitle>
              </DialogHeader>
              {renderForm(endpointModal)}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ParametrosGobernanza;





