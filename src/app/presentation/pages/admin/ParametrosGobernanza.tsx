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
type TenantGlobal = { id: string; label: string; corporativo: string };
type PermisoItem = { vistaId: string; accionId: string[] };
type ReglaOption = { id: string; label: string };
type ContextOption = { id: string; label: string };
type RuleCatalog = { id: string; raw: any };
type HeredaGlobalOption = { id: string; label: string };
type CatalogSelection = { vistas: string[]; acciones: string[] };
type TenantCorporativoOption = { id: string; label: string; tenantGlobalId: string };

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
    actor: 'ambos',
    method: 'POST',
    path: '/api/config/global/creacion/usu/tenant/global',
    title: 'Crear tenant global (usuario)',
    description: 'Crea tenant global en flujo usuario.',
    fields: [
      { name: 'nvlGeneracionTenant', label: 'Nivel generacion tenant', type: 'id', required: true },
      { name: 'tipo_tenant', label: 'Tipo tenant', type: 'id', required: true },
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
    title: 'Crear tenant global (admin)',
    description: 'Crea tenant global para flujo administrador.',
    fields: [
      { name: 'nvlGeneracionTenant', label: 'Nivel generacion tenant', type: 'id', required: true },
      { name: 'tipo_tenant', label: 'Tipo tenant', type: 'id', required: true },
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
    path: '/api/config/permisos/creacion/admin/tenant/global',
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
      { name: 'id', label: 'ID herencia', type: 'id', required: true, pathParam: true },
      { name: 'tenantGlobal', label: 'Tenant global', type: 'id' },
      { name: 'tenantCorporativo', label: 'Tenant corporativo', type: 'id' },
      { name: 'heredaGlobal', label: 'Herencia global', type: 'id' },
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
    section: 'permisos',
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
    section: 'permisos',
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
    section: 'permisos',
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
    section: 'permisos',
    actor: 'tenantGlobal',
    method: 'DELETE',
    path: '/api/config/permisos/corporativo/desactivar/tenant/:id',
    title: 'Desactivar registro (opcional)',
    description: 'Desactiva herencia corporativa sin eliminar físicamente.',
    fields: [{ name: 'id', label: 'ID registro', type: 'id', required: true, pathParam: true }],
  },
  {
    id: 'perm-eliminar-corporativo',
    section: 'permisos',
    actor: 'tenantGlobal',
    method: 'DELETE',
    path: '/api/config/permisos/corporativo/eliminar/tenant/:id',
    title: 'Eliminar registro (opcional)',
    description: 'Elimina registro corporativo de forma definitiva.',
    fields: [{ name: 'id', label: 'ID registro', type: 'id', required: true, pathParam: true }],
  },
  {
    id: 'perm-corporativo-guardar-catalogo',
    section: 'permisos',
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
    section: 'permisos',
    actor: 'tenantGlobal',
    method: 'POST',
    path: '/api/config/permisos/corporativo/guardar/roles/tenant/corporativo',
    title: 'Guardar rol corporativo',
    description: 'Crea rol corporativo para tenant.',
    fields: [{ name: 'rol', label: 'Rol', type: 'text', required: true }],
  },
  {
    id: 'perm-corporativo-crear-tenant',
    section: 'permisos',
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
    section: 'permisos',
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
  const [catalogSelection, setCatalogSelection] = useState<Record<string, CatalogSelection>>({});
  const [bulkAllMode, setBulkAllMode] = useState<Record<string, boolean>>({});
  const [tenantCorporativos, setTenantCorporativos] = useState<TenantCorporativoOption[]>([]);
  const [herenciasUsuario, setHerenciasUsuario] = useState<any[]>([]);

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
      const [tenantsRes, rutasRes, accionesRes, herenciasRes, reglasRes, tenantsDestinoRes, contextosRes, tenantCorpRes] = await Promise.allSettled([
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

      if (tenantsRes.status === 'fulfilled') {
        const rows = Array.isArray(tenantsRes.value?.data) ? tenantsRes.value.data : [];
        const allById = new Map<string, TenantGlobal>();
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
          });
        });

        if (tenantsDestinoRes.status === 'fulfilled') {
          const destinoRows = pickArray(tenantsDestinoRes.value, ['data', 'items']);
          destinoRows.forEach((row: any) => {
            const id = String(row?.tenantGlobalId || row?.id || row?._id || row?.iud || '').trim();
            if (!id) return;
            const current = allById.get(id);
            const rolName = String(row?.rol || row?.rolesMabs?.rol || '').trim();
            const label = String(
              row?.label ||
              (rolName ? `${rolName} | ${id}` : '') ||
              row?.name ||
              row?.nombre ||
              row?.titulo ||
              current?.label ||
              id
            );
            const corporativo = pickTenantCorporate(row);
            allById.set(id, {
              id,
              label,
              corporativo: corporativo !== 'Sin corporativo' ? corporativo : (current?.corporativo || 'Sin corporativo'),
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
        setVistas(
          rows
            .filter((r: any) => r?.estadoRuta !== false)
            .map((r: any) => ({ id: String(r?._id || ''), label: String(r?.name || r?.path || r?._id || ''), path: String(r?.path || '') }))
            .filter((v: Vista) => v.id)
        );
      }

      if (accionesRes.status === 'fulfilled') {
        const source = Array.isArray(accionesRes.value?.accionesSistema) ? accionesRes.value.accionesSistema : [];
        setAcciones(
          source
            .filter((a: any) => a?.estadoAccion !== false)
            .map((a: any) => ({ id: String(a?._id || ''), label: String(a?.etiquetas || a?.method || a?._id || ''), method: String(a?.method || '') }))
            .filter((a: Accion) => a.id)
        );
      }

      if (herenciasRes.status === 'fulfilled' && accionesRes.status !== 'fulfilled') {
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
        setAcciones(Array.from(map.values()));
      }

      if (herenciasRes.status === 'fulfilled' && (!vistas.length || rutasRes.status !== 'fulfilled')) {
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
        if (map.size) setVistas(Array.from(map.values()));
      }

      if (herenciasRes.status === 'fulfilled') {
        const herencias = pickArray(herenciasRes.value, ['herencias', 'data', 'items']);
        setHerenciasUsuario(herencias);
        herencias.forEach((h: any) => {
          const heredaId = String(h?.heredaGlobal?._id || h?.heredaGlobal || '').trim();
          if (!heredaId || heredaOptionsMap.has(heredaId)) return;
          const vCount = Array.isArray(h?.vistas) ? h.vistas.length : 0;
          const aCount = Array.isArray(h?.acciones) ? h.acciones.length : 0;
          heredaOptionsMap.set(heredaId, {
            id: heredaId,
            label: `${heredaId} | Vistas:${vCount} | Acciones:${aCount}`,
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
                }
                return rid ? { id: rid, label: `[${platformFlag}] ${base} | ${ridEncrypted || ridRaw}` } : null;
              })
            .filter(Boolean) as ReglaOption[]
        );
        setRuleCatalog(rulesMap);
        setContextos(Array.from(contextoMap.values()));
      }

      setHeredaGlobalOptions(Array.from(heredaOptionsMap.values()));

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
  const getTenantCorporativoOptions = (endpointId: string): TenantCorporativoOption[] => {
    const tenantGlobalId = getFieldValue(endpointId, 'tenantGlobal').trim();
    if (!tenantGlobalId) return [];
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
  const getPermisosCatalog = (endpointId: string): { vistasCatalogo: Vista[]; accionesCatalogo: Accion[] } => {
    if (endpointId !== 'perm-admin-tenant-global' && endpointId !== 'perm-admin-tenant-global-actualizar') {
      return { vistasCatalogo: vistas, accionesCatalogo: acciones };
    }

    const tenantGlobalId = getFieldValue(endpointId, 'tenantGlobal').trim();
    if (!tenantGlobalId) return { vistasCatalogo: vistas, accionesCatalogo: acciones };

    const vistaPermitida = new Set<string>();
    const accionPermitida = new Set<string>();

    herenciasUsuario.forEach((h: any) => {
      const tg = String(h?.tenantGlobal?._id || h?.tenantGlobal || '').trim();
      if (tg !== tenantGlobalId) return;
      const vs = Array.isArray(h?.vistas) ? h.vistas : [];
      const ac = Array.isArray(h?.acciones) ? h.acciones : [];
      vs.forEach((v: any) => {
        const id = String(v?._id || v || '').trim();
        if (id) vistaPermitida.add(id);
      });
      ac.forEach((a: any) => {
        const id = String(a?._id || a || '').trim();
        if (id) accionPermitida.add(id);
      });
    });

    if (!vistaPermitida.size || !accionPermitida.size) {
      return { vistasCatalogo: vistas, accionesCatalogo: acciones };
    }

    return {
      vistasCatalogo: vistas.filter((v) => vistaPermitida.has(v.id)),
      accionesCatalogo: acciones.filter((a) => accionPermitida.has(a.id)),
    };
  };

  const getPermisos = (endpointId: string): PermisoItem[] => permisoData[endpointId] || [{ vistaId: '', accionId: [] }];
  const setPermisos = (endpointId: string, value: PermisoItem[]) => setPermisoData((prev) => ({ ...prev, [endpointId]: value }));
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
    const endpointId = 'perm-usuario-tenant-global';
    const current = getFieldValue(endpointId, 'heredaGlobal');
    if (!current && heredaGlobalOptions.length > 0) {
      setFieldValue(endpointId, 'heredaGlobal', heredaGlobalOptions[0].id);
    }
  }, [heredaGlobalOptions.length]);

  const runEndpoint = async (endpoint: EndpointSpec) => {
    try {
      setRunning((prev) => ({ ...prev, [endpoint.id]: true }));
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
        const value = field.type === 'json' ? parseMaybeJson(raw) : raw.trim();
        if (field.required && (value === '' || (Array.isArray(value) && !value.length))) throw new Error(`Completa: ${field.label}`);
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

      if (endpoint.id === 'perm-usuario-tenant-global') {
        const selectedHeredaGlobal = String(body.heredaGlobal || '').trim();
        if (!selectedHeredaGlobal) throw new Error('Completa: Herencia global');

        if (!vistas.length || !acciones.length) {
          throw new Error('No hay catalogo de vistas/acciones disponible para seleccionar');
        }

        const selected = getCatalogSelection(endpoint.id);
        body.vistasSeleccionadas = selected.vistas.length ? selected.vistas : vistas.map((v) => v.id);
        body.accionesSeleccionadas = selected.acciones.length ? selected.acciones : acciones.map((a) => a.id);
      }

      if (endpoint.id === 'perm-admin-tenant-global' || endpoint.id === 'perm-admin-tenant-global-actualizar') {
        const tg = String(body.tenantGlobal || '').trim();
        const tc = String(body.tenantCorporativo || '').trim();
        if (tc && !tg) {
          throw new Error('tenantGlobal es obligatorio cuando seleccionas tenantCorporativo');
        }

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

  const renderHerenciasAdminTable = () => {
    const rows = pickArray(resultData['perm-admin-tenant-global-listar'], ['data', 'items', 'herencias']);
    if (!rows.length) {
      return <pre className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">{result['perm-admin-tenant-global-listar'] || 'Aun sin respuesta'}</pre>;
    }

    return (
      <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[920px] text-left text-xs">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Tenant Global</th>
              <th className="px-3 py-2">Tenant Corporativo</th>
              <th className="px-3 py-2">Usuario</th>
              <th className="px-3 py-2">Vistas</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, idx: number) => (
              <tr key={String(row?._id || row?.iud || idx)} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono">{String(row?._id || row?.iud || '-')}</td>
                <td className="px-3 py-2">{row?.estado === false ? 'Inactivo' : 'Activo'}</td>
                <td className="px-3 py-2">{String(row?.tenantGlobal?._id || row?.tenantGlobal || '-')}</td>
                <td className="px-3 py-2">{String(row?.tenantCorporativo?._id || row?.tenantCorporativo || '-')}</td>
                <td className="px-3 py-2">{String(row?.usuarioId?.nombre || row?.usuarioId?.name || row?.usuarioId?._id || row?.usuarioId || '-')}</td>
                <td className="px-3 py-2">{Array.isArray(row?.vistas) ? row.vistas.length : 0}</td>
                <td className="px-3 py-2">{Array.isArray(row?.acciones) ? row.acciones.length : 0}</td>
              </tr>
            ))}
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
                <td className="px-3 py-2">{String(row?.name || row?.nombre || row?.titulo || '-')}</td>
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
    const rows = pickArray(resultData['perm-listar-herencias'], ['herencias', 'data', 'items']);
    if (!rows.length) {
      return <pre className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">{result['perm-listar-herencias'] || 'Aun sin respuesta'}</pre>;
    }

    return (
      <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[980px] text-left text-xs">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Tenant Global</th>
              <th className="px-3 py-2">Tenant Corporativo</th>
              <th className="px-3 py-2">Rol</th>
              <th className="px-3 py-2">Vistas</th>
              <th className="px-3 py-2">Acciones</th>
              <th className="px-3 py-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, idx: number) => (
              <tr key={String(row?._id || row?.iud || idx)} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono">{String(row?._id || row?.iud || '-')}</td>
                <td className="px-3 py-2">{String(row?.tenantGlobal?._id || row?.tenantGlobal || '-')}</td>
                <td className="px-3 py-2">{String(row?.tenantCorporativo?._id || row?.tenantCorporativo || '-')}</td>
                <td className="px-3 py-2">{String(row?.rolId?.rol || row?.rolId?._id || row?.rolId || '-')}</td>
                <td className="px-3 py-2">{Array.isArray(row?.vistas) ? row.vistas.length : 0}</td>
                <td className="px-3 py-2">{Array.isArray(row?.acciones) ? row.acciones.length : 0}</td>
                <td className="px-3 py-2">{String(row?.fechaAsignacion || row?.createdAt || '-')}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
          <p className="text-xs font-medium text-emerald-700">Selecciona vistas y acciones (o usa Todas)</p>
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
            Faltan datos para construir checks de vistas/acciones.
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
      {endpoint.fields.map((field) => {
        if (field.type === 'permisos') {
          if (endpoint.id === 'perm-admin-tenant-global' || endpoint.id === 'perm-admin-tenant-global-actualizar') {
            return <div key={field.name}>{renderHerenciaSelectionBuilder(endpoint)}</div>;
          }
          return <div key={field.name}>{renderPermisosBuilder(endpoint)}</div>;
        }
        if (endpoint.id === 'perm-usuario-tenant-global' && field.name === 'heredaGlobal') {
          return (
            <div key={field.name}>
              <Label>{field.label} {field.required ? '*' : ''}</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                value={getFieldValue(endpoint.id, field.name)}
                onChange={(e) => setFieldValue(endpoint.id, field.name, e.target.value)}
              >
                <option value="">Selecciona herencia global</option>
                {heredaGlobalOptions.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
              </select>
              <p className="mt-1 text-xs text-slate-500">Opciones tomadas del contexto existente de herencias/reglas.</p>
            </div>
          );
        }
        if (field.name === 'tenantGlobal' || field.name === 'tenantGlobalId') {
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
                    setFieldValue(endpoint.id, 'tenantCorporativo', '');
                    setPermisos(endpoint.id, [{ vistaId: '', accionId: [] }]);
                    setCatalogSelectionFor(endpoint.id, { vistas: [], acciones: [] });
                    setBulkAllFor(endpoint.id, false);
                  }
                }}
              >
                <option value="">Selecciona tenant global</option>
                {tenantGlobales.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          );
        }
        if (field.name === 'tenantCorporativo' && (endpoint.id === 'perm-admin-tenant-global' || endpoint.id === 'perm-admin-tenant-global-actualizar')) {
          const options = getTenantCorporativoOptions(endpoint.id);
          const tenantGlobalSelected = getFieldValue(endpoint.id, 'tenantGlobal').trim();
          return (
            <div key={field.name}>
              <Label>{field.label} {field.required ? '*' : ''}</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                value={getFieldValue(endpoint.id, field.name)}
                onChange={(e) => setFieldValue(endpoint.id, field.name, e.target.value)}
                disabled={!tenantGlobalSelected}
              >
                <option value="">Sin tenant corporativo</option>
                {options.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Opcional. Si seleccionas tenant corporativo, se usa bajo el tenant global elegido.
              </p>
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
                  {endpoint.fields.length === 0 ? (
                    <Button className="flex-1" onClick={() => runEndpoint(endpoint)} disabled={!!running[endpoint.id]}>
                      {running[endpoint.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                      Ejecutar
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

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
