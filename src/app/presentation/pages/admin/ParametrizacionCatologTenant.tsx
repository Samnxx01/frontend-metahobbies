import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { apiFetch } from '@/app/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Play, Settings2 } from 'lucide-react';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type EndpointSection = 'catalogos';
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
  method: HttpMethod;
  path: string;
  title: string;
  description: string;
  fields: FieldSpec[];
};

const METHOD_STYLE: Record<HttpMethod, string> = {
  GET: 'bg-blue-100 text-blue-700 border-blue-200',
  POST: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  PUT: 'bg-amber-100 text-amber-700 border-amber-200',
  DELETE: 'bg-red-100 text-red-700 border-red-200',
};

const ENDPOINTS: EndpointSpec[] = [
  {
    id: 'cat-tipo-comprador-crear',
    section: 'catalogos',
    method: 'POST',
    path: '/api/config/tenant/tipo/acceso/globales/roles',
    title: 'Crear catalogo tipo comprador',
    description: 'Crea registro en tenantCompraRoles.',
    fields: [
      { name: 'tipo_comprador', label: 'Tipo comprador', type: 'text', required: true },
      { name: 'sigla', label: 'Sigla', type: 'text', required: true },
    ],
  },
  {
    id: 'cat-tipo-tenant-crear',
    section: 'catalogos',
    method: 'POST',
    path: '/api/config/tenant/tipo/acceso/usu/coporativa',
    title: 'Crear catalogo tipo tenant',
    description: 'Crea registro en tipoAccesoTenant.',
    fields: [
      { name: 'tipo_acceso_apis', label: 'Tipo acceso APIs', type: 'text', required: true },
      { name: 'sigla', label: 'Sigla', type: 'text', required: true },
    ],
  },
  {
    id: 'cat-nivel-global-crear',
    section: 'catalogos',
    method: 'POST',
    path: '/api/config/tenant/tipo/acceso/globales/jerarquia/roles',
    title: 'Crear nivel global',
    description: 'Crea registro en generacionGlobalNvlRoles.',
    fields: [
      { name: 'nvl', label: 'Nivel', type: 'text', required: true },
      { name: 'generation_tenant', label: 'Generacion tenant', type: 'text', required: true },
    ],
  },
  {
    id: 'cat-nivel-corp-crear',
    section: 'catalogos',
    method: 'POST',
    path: '/api/config/tenant/tipo/acceso/corporativo/jerarquia/roles',
    title: 'Crear nivel corporativo',
    description: 'Crea registro en generacionCoporativolNvlRoles.',
    fields: [{ name: 'generation_tenant', label: 'Generacion tenant', type: 'text', required: true }],
  },
  {
    id: 'cat-contexto-crear',
    section: 'catalogos',
    method: 'POST',
    path: '/api/config/tenant/tipo/api/contexto',
    title: 'Crear contexto',
    description: 'Crea contexto para reglas.',
    fields: [{ name: 'contexto', label: 'Contexto', type: 'text', required: true }],
  },
  {
    id: 'cat-contexto-listar',
    section: 'catalogos',
    method: 'GET',
    path: '/api/config/tenant/tipo/api/contexto',
    title: 'Listar contextos',
    description: 'Lista catalogo de contextos.',
    fields: [],
  },
  {
    id: 'cat-globales-contexto-roles-listar',
    section: 'catalogos',
    method: 'GET',
    path: '/api/config/tenant/tipo/listar/globales/contexto/roles',
    title: 'Listar globales/contexto/roles',
    description: 'Lista selects principales del flujo tenant global.',
    fields: [],
  },
  {
    id: 'cat-vistas-contexto-roles-listar',
    section: 'catalogos',
    method: 'GET',
    path: '/api/config/tenant/tipo/listar/vistas/contexto/roles',
    title: 'Listar vistas/contexto/roles',
    description: 'Lista vistas y acciones disponibles para reglas.',
    fields: [],
  },
];

const sectionLabel: Record<EndpointSection, string> = {
  catalogos: 'Catalogos',
};

const parseMaybeJson = (rawValue: string): unknown => {
  const value = rawValue.trim();
  if (!value) return '';
  if (value.startsWith('[') || value.startsWith('{') || value === 'true' || value === 'false') {
    return JSON.parse(value);
  }
  return value;
};

const ParametrizacionCatologTenant: React.FC = () => {
  const [endpointModal, setEndpointModal] = useState<EndpointSpec | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, Record<string, string>>>({});
  const [result, setResult] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');

  const endpointsFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ENDPOINTS;
    return ENDPOINTS.filter((e) =>
      [e.title, e.path, e.description, e.method, e.section].join(' ').toLowerCase().includes(q)
    );
  }, [search]);

  const endpointGroups = useMemo(() => ({
    catalogos: endpointsFiltered.filter((e) => e.section === 'catalogos'),
  }), [endpointsFiltered]);

  const getField = (endpointId: string, name: string): string => fieldValues?.[endpointId]?.[name] ?? '';
  const setField = (endpointId: string, name: string, value: string): void => {
    setFieldValues((prev) => ({
      ...prev,
      [endpointId]: {
        ...(prev[endpointId] || {}),
        [name]: value,
      },
    }));
  };

  const buildRequest = (endpoint: EndpointSpec): { path: string; body: any; headers: Record<string, string> } => {
    let resolvedPath = endpoint.path;
    const body: Record<string, unknown> = {};
    const headers: Record<string, string> = {};

    endpoint.fields.forEach((field) => {
      const rawValue = getField(endpoint.id, field.name);
      const value = rawValue.trim();

      if (field.required && !value) {
        throw new Error(`Completa: ${field.label}`);
      }
      if (!value) return;

      if (field.pathParam) {
        resolvedPath = resolvedPath.replace(`:${field.name}`, encodeURIComponent(value));
        return;
      }
      if (field.header) {
        headers[field.name] = value;
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
      const text = JSON.stringify(response, null, 2);
      setResult((prev) => ({ ...prev, [endpoint.id]: text }));
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

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Card className="border-rose-100">
        <CardHeader>
          <CardTitle className="text-slate-900">Parametrizacion Catalog Tenant</CardTitle>
          <CardDescription>Consola CRUD de catalogos tenant. Ejecuta con JWT actual.</CardDescription>
          <div className="pt-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar endpoint por titulo, ruta o metodo..."
            />
          </div>
        </CardHeader>
      </Card>

      {(Object.keys(endpointGroups) as EndpointSection[]).map((section) => (
        <Card key={section} className="border-rose-100">
          <CardHeader>
            <CardTitle className="text-xl">{sectionLabel[section]}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {endpointGroups[section].map((endpoint) => (
              <div key={endpoint.id} className="rounded-xl border border-rose-100 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <Badge className={METHOD_STYLE[endpoint.method]}>{endpoint.method}</Badge>
                  <Badge variant="outline">{sectionLabel[endpoint.section]}</Badge>
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
      ))}

      <Dialog open={!!endpointModal} onOpenChange={(open) => !open && setEndpointModal(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[980px]">
          {endpointModal && (
            <>
              <DialogHeader>
                <DialogTitle>{endpointModal.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={METHOD_STYLE[endpointModal.method]}>{endpointModal.method}</Badge>
                  <code className="rounded bg-slate-100 px-2 py-1 text-xs">{endpointModal.path}</code>
                </div>

                <div className="grid gap-3">
                  {endpointModal.fields.length === 0 && (
                    <p className="text-sm text-slate-500">Este endpoint no requiere body adicional.</p>
                  )}

                  {endpointModal.fields.map((field) => (
                    <div key={field.name} className="space-y-1">
                      <Label>{field.label}{field.required ? ' *' : ''}</Label>
                      {field.type === 'textarea' ? (
                        <Textarea
                          value={getField(endpointModal.id, field.name)}
                          placeholder={field.placeholder || ''}
                          onChange={(e) => setField(endpointModal.id, field.name, e.target.value)}
                        />
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

export default ParametrizacionCatologTenant;
