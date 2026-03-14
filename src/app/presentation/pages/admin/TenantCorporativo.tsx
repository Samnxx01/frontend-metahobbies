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
import { HelpCircle, Play, Settings2 } from 'lucide-react';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type EndpointSection = 'corporativo' | 'permisos' | 'catalogos';
type EndpointActor = 'tenantSuperAdmin' | 'tenantGlobal' | 'ambos';
type FieldType = 'text' | 'id' | 'json' | 'textarea';

type FieldSpec = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  pathParam?: boolean;
  header?: boolean;
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
};

type GenericSelectOption = {
  id: string;
  label: string;
  rol?: string;
};

const METHOD_STYLE: Record<HttpMethod, string> = {
  GET: 'bg-blue-100 text-blue-700 border-blue-200',
  POST: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  PUT: 'bg-amber-100 text-amber-700 border-amber-200',
  DELETE: 'bg-red-100 text-red-700 border-red-200',
};

const ACTOR_STYLE: Record<EndpointActor, string> = {
  tenantSuperAdmin: 'bg-purple-100 text-purple-700 border-purple-200',
  tenantGlobal: 'bg-rose-100 text-rose-700 border-rose-200',
  ambos: 'bg-slate-100 text-slate-700 border-slate-200',
};

const ENDPOINTS: EndpointSpec[] = [
  // ── SECCIÓN: corporativo ──────────────────────────────────────
  {
    id: 'tenant-crear-corporativo-global',
    section: 'corporativo',
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
    id: 'perm-crear-coporativo',
    section: 'corporativo',
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
    section: 'corporativo',
    actor: 'tenantGlobal',
    method: 'POST',
    path: '/api/config/permisos/creacion/usu/tenant/corporativo',
    title: 'Crear tenant corporativo (alias)',
    description: 'Alias canonico del endpoint corporativo.',
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
    section: 'corporativo',
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
    section: 'corporativo',
    actor: 'tenantGlobal',
    method: 'DELETE',
    path: '/api/config/permisos/corporativo/desactivar/tenant/:id',
    title: 'Desactivar registro corporativo',
    description: 'Desactiva herencia corporativa sin eliminar fisicamente.',
    fields: [{ name: 'id', label: 'ID registro', type: 'id', required: true, pathParam: true }],
  },
  {
    id: 'perm-eliminar-corporativo',
    section: 'corporativo',
    actor: 'tenantGlobal',
    method: 'DELETE',
    path: '/api/config/permisos/corporativo/eliminar/tenant/:id',
    title: 'Eliminar registro corporativo',
    description: 'Elimina registro corporativo de forma definitiva.',
    fields: [{ name: 'id', label: 'ID registro', type: 'id', required: true, pathParam: true }],
  },
  {
    id: 'perm-corporativo-crear-tenant',
    section: 'corporativo',
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
  // ── SECCIÓN: permisos ──────────────────────────────────────
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
  // ── SECCIÓN: catalogos ──────────────────────────────────────
  {
    id: 'perm-corporativo-guardar-catalogo',
    section: 'catalogos',
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
    section: 'catalogos',
    actor: 'tenantGlobal',
    method: 'POST',
    path: '/api/config/permisos/corporativo/guardar/roles/tenant/corporativo',
    title: 'Guardar rol corporativo',
    description: 'Crea rol corporativo para tenant.',
    fields: [{ name: 'rol', label: 'Rol', type: 'text', required: true }],
  },
  {
    id: 'cat-nivel-corp-crear',
    section: 'catalogos',
    actor: 'tenantGlobal',
    method: 'POST',
    path: '/api/config/tenant/tipo/acceso/corporativo/jerarquia/roles',
    title: 'Crear nivel corporativo (catalogo)',
    description: 'Crea registro en generacionCoporativolNvlRoles.',
    fields: [{ name: 'generation_tenant', label: 'Generacion tenant', type: 'text', required: true }],
  },
];

const SECTION_LABEL: Record<EndpointSection, string> = {
  corporativo: 'Gestion Tenant Corporativo',
  permisos: 'Permisos Corporativos',
  catalogos: 'Catalogos Corporativos',
};

const parseMaybeJson = (rawValue: string): unknown => {
  const value = rawValue.trim();
  if (!value) return '';
  if (value.startsWith('[') || value.startsWith('{') || value === 'true' || value === 'false') {
    return JSON.parse(value);
  }
  return value;
};

const mapSelectOptions = (rows: any[] | undefined, fallbackKeys: string[]): GenericSelectOption[] =>
  (Array.isArray(rows) ? rows : [])
    .map((row: any) => {
      const id = String(row?.id || row?._id || '').trim();
      if (!id) return null;
      const label =
        fallbackKeys
          .map((key) => String(row?.[key] || '').trim())
          .find(Boolean) || id;
      const rol = String(row?.rol || '').trim();
      return { id, label, rol: rol || undefined };
    })
    .filter(Boolean) as GenericSelectOption[];

const TenantCorporativo: React.FC = () => {
  const [endpointModal, setEndpointModal] = useState<EndpointSpec | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, Record<string, string>>>({});
  const [result, setResult] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [selectOptions, setSelectOptions] = useState<Record<string, GenericSelectOption[]>>({});
  const [loadingSelects, setLoadingSelects] = useState(false);

  const endpointsFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ENDPOINTS;
    return ENDPOINTS.filter((e) =>
      [e.title, e.path, e.description, e.method, e.section].join(' ').toLowerCase().includes(q)
    );
  }, [search]);

  const endpointGroups = useMemo(
    () => ({
      corporativo: endpointsFiltered.filter((e) => e.section === 'corporativo'),
      permisos: endpointsFiltered.filter((e) => e.section === 'permisos'),
      catalogos: endpointsFiltered.filter((e) => e.section === 'catalogos'),
    }),
    [endpointsFiltered]
  );

  useEffect(() => {
    const hydrateSelects = async () => {
      try {
        setLoadingSelects(true);
        const [globalSelectsRes, nivelesCorpRes] = await Promise.allSettled([
          apiFetch('/api/config/global/creacion/usu/tenant/global/selects', { method: 'GET' }),
          apiFetch('/api/config/permisos/corporativo/listar/nvl/global', { method: 'GET' }),
        ]);

        const nextOptions: Record<string, GenericSelectOption[]> = {};

        if (globalSelectsRes.status === 'fulfilled') {
          const data = (globalSelectsRes.value as any)?.data || {};
          nextOptions.tipo_tenant = mapSelectOptions(data.tiposTenant, ['label', 'tipo_acceso_apis']);
          nextOptions.ownerType = mapSelectOptions(data.ownerTypes, ['label', 'tipo_comprador']);
          nextOptions.apisDominios = mapSelectOptions(
            Array.isArray(data.dominiosScope) && data.dominiosScope.length > 0 ? data.dominiosScope : [],
            ['label', 'dominio']
          );
          nextOptions.accionesUsu = mapSelectOptions(data.acciones, ['label', 'method']);
          nextOptions.rolesMabs = mapSelectOptions(
            Array.isArray(data.rolesMabs) ? data.rolesMabs : Array.isArray(data.roles) ? data.roles : [],
            ['label', 'rol']
          );
        }

        if (nivelesCorpRes.status === 'fulfilled') {
          const payload = nivelesCorpRes.value as any;
          const niveles =
            payload?.niveles ||
            payload?.data?.niveles ||
            payload?.data ||
            [];
          nextOptions.nvlGeneracionCoporativoTenant = mapSelectOptions(niveles, ['label', 'nombre', 'nvlGeneracion']);
        }

        setSelectOptions(nextOptions);
      } catch (error: any) {
        toast.error(String(error?.message || 'No se pudieron cargar los selects corporativos'));
      } finally {
        setLoadingSelects(false);
      }
    };

    void hydrateSelects();
  }, []);

  const getField = (endpointId: string, name: string): string => fieldValues?.[endpointId]?.[name] ?? '';
  const setField = (endpointId: string, name: string, value: string): void => {
    setFieldValues((prev) => ({
      ...prev,
      [endpointId]: { ...(prev[endpointId] || {}), [name]: value },
    }));
  };

  const buildRequest = (endpoint: EndpointSpec): { path: string; body: any; headers: Record<string, string> } => {
    let resolvedPath = endpoint.path;
    const body: Record<string, unknown> = {};
    const headers: Record<string, string> = {};

    endpoint.fields.forEach((field) => {
      const rawValue = getField(endpoint.id, field.name);
      const value = rawValue.trim();

      if (field.required && !value) throw new Error(`Completa: ${field.label}`);
      if (!value) return;

      if (field.pathParam) {
        resolvedPath = resolvedPath.replace(`:${field.name}`, encodeURIComponent(value));
        return;
      }
      if (field.header) {
        headers[field.name] = value;
        return;
      }
      if (field.name === 'accionesUsu') {
        const selected = value.split(',').map((item) => item.trim()).filter(Boolean);
        body[field.name] = selected.length <= 1 ? (selected[0] || '') : selected;
        return;
      }
      body[field.name] = field.type === 'json' ? parseMaybeJson(value) : value;
    });

    return { path: resolvedPath, body, headers };
  };

  const handleRun = async (endpoint: EndpointSpec): Promise<void> => {
    try {
      setLoading((prev) => ({ ...prev, [endpoint.id]: true }));
      const { path, body, headers } = buildRequest(endpoint);
      const hasBody = endpoint.method !== 'GET' && endpoint.method !== 'DELETE';
      const response = await apiFetch(path, {
        method: endpoint.method,
        headers,
        ...(hasBody ? { body } : {}),
      });
      setResult((prev) => ({ ...prev, [endpoint.id]: JSON.stringify(response, null, 2) }));
      toast.success(`${endpoint.title} ejecutado`);
    } catch (error: any) {
      const msg = String(error?.message || 'Error ejecutando endpoint');
      setResult((prev) => ({ ...prev, [endpoint.id]: msg }));
      toast.error(msg);
    } finally {
      setLoading((prev) => ({ ...prev, [endpoint.id]: false }));
    }
  };

  const handleClean = (endpointId: string): void => {
    setFieldValues((prev) => ({ ...prev, [endpointId]: {} }));
    setResult((prev) => ({ ...prev, [endpointId]: '' }));
  };

  const getOptionsForField = (fieldName: string): GenericSelectOption[] => selectOptions[fieldName] || [];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Card className="border-rose-100">
        <CardHeader>
          <CardTitle className="text-slate-900">Tenant Corporativo</CardTitle>
          <CardDescription>
            Consola de gestion para tenants corporativos. Incluye creacion, permisos y catalogos. Ejecuta con JWT actual.
          </CardDescription>
          <div className="pt-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar endpoint por titulo, ruta o metodo..."
            />
          </div>
        </CardHeader>
      </Card>

      {(Object.keys(endpointGroups) as EndpointSection[]).map((section) => {
        const sectionEndpoints = endpointGroups[section];
        if (!sectionEndpoints.length) return null;
        return (
          <Card key={section} className="border-rose-100">
            <CardHeader>
              <CardTitle className="text-xl">{SECTION_LABEL[section]}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {sectionEndpoints.map((endpoint) => (
                <div key={endpoint.id} className="rounded-xl border border-rose-100 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
                    <Badge className={METHOD_STYLE[endpoint.method]}>{endpoint.method}</Badge>
                    <Badge className={ACTOR_STYLE[endpoint.actor]}>{endpoint.actor}</Badge>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">{endpoint.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{endpoint.description}</p>
                  <div className="mt-3 rounded bg-slate-100 px-3 py-2 text-xs text-slate-800">{endpoint.path}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => setEndpointModal(endpoint)}>
                      <Settings2 className="mr-2 h-4 w-4" />
                      Configurar
                    </Button>
                    <Button onClick={() => void handleRun(endpoint)} disabled={!!loading[endpoint.id]}>
                      <Play className="mr-2 h-4 w-4" />
                      {loading[endpoint.id] ? 'Ejecutando...' : 'Ejecutar'}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={!!endpointModal} onOpenChange={(open) => !open && setEndpointModal(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[980px]">
          {endpointModal && (
            <>
              <DialogHeader>
                <DialogTitle>{endpointModal.title}</DialogTitle>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge className={METHOD_STYLE[endpointModal.method]}>{endpointModal.method}</Badge>
                  <Badge className={ACTOR_STYLE[endpointModal.actor]}>{endpointModal.actor}</Badge>
                  <code className="rounded bg-slate-100 px-2 py-1 text-xs">{endpointModal.path}</code>
                </div>
                <div className="mt-2 flex items-start gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                  <span>{endpointModal.description}</span>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid gap-3">
                  {endpointModal.fields.length === 0 && (
                    <p className="text-sm text-slate-500">Este endpoint no requiere body adicional.</p>
                  )}
                  {endpointModal.fields.map((field) => (
                    <div key={field.name} className="space-y-1">
                      <Label>
                        {field.label}
                        {field.required ? ' *' : ''}
                        {field.pathParam ? ' (path)' : ''}
                        {field.header ? ' (header)' : ''}
                      </Label>
                      {field.type === 'textarea' || field.type === 'json' ? (
                        <Textarea
                          value={getField(endpointModal.id, field.name)}
                          placeholder={field.placeholder || `Ingresa ${field.label}`}
                          onChange={(e) => setField(endpointModal.id, field.name, e.target.value)}
                        />
                      ) : field.name === 'accionesUsu' && getOptionsForField(field.name).length > 0 ? (
                        <div className="rounded-lg border border-slate-300 bg-white p-2">
                          <div className="mb-2 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setField(endpointModal.id, field.name, getOptionsForField(field.name).map((option) => option.id).join(','))}
                            >
                              Seleccionar todas
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setField(endpointModal.id, field.name, '')}
                            >
                              Limpiar
                            </Button>
                            <span className="ml-auto rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                              Seleccionadas: {getField(endpointModal.id, field.name).split(',').map((item) => item.trim()).filter(Boolean).length}
                            </span>
                          </div>
                          <div className="max-h-40 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2">
                            {getOptionsForField(field.name).map((option) => {
                              const selected = new Set(
                                getField(endpointModal.id, field.name).split(',').map((item) => item.trim()).filter(Boolean)
                              );
                              return (
                                <label key={option.id} className="mb-1 flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-white">
                                  <input
                                    type="checkbox"
                                    checked={selected.has(option.id)}
                                    onChange={(e) => {
                                      const next = new Set(selected);
                                      if (e.target.checked) next.add(option.id);
                                      else next.delete(option.id);
                                      setField(endpointModal.id, field.name, Array.from(next).join(','));
                                    }}
                                  />
                                  <span>{option.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ) : field.type === 'id' && getOptionsForField(field.name).length > 0 ? (
                        <select
                          className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                          value={getField(endpointModal.id, field.name)}
                          onChange={(e) => setField(endpointModal.id, field.name, e.target.value)}
                        >
                          <option value="">
                            {loadingSelects ? 'Cargando opciones...' : `Selecciona ${field.label.toLowerCase()}`}
                          </option>
                          {getOptionsForField(field.name).map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          value={getField(endpointModal.id, field.name)}
                          placeholder={field.placeholder || `Ingresa ${field.label}`}
                          onChange={(e) => setField(endpointModal.id, field.name, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => void handleRun(endpointModal)} disabled={!!loading[endpointModal.id]}>
                    <Play className="mr-2 h-4 w-4" />
                    {loading[endpointModal.id] ? 'Ejecutando...' : 'Ejecutar'}
                  </Button>
                  <Button variant="outline" onClick={() => handleClean(endpointModal.id)}>
                    Limpiar formulario
                  </Button>
                </div>

                <Textarea
                  className="min-h-[180px] font-mono text-xs"
                  readOnly
                  value={result[endpointModal.id] || 'Aun sin respuesta'}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TenantCorporativo;
