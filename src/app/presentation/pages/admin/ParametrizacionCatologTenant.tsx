import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { apiFetch } from '@/app/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Play, Settings2, Search, Loader2, RotateCcw,
  ChevronRight, Terminal, Layers
} from 'lucide-react';

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

const METHOD_COLORS: Record<HttpMethod, { pill: string; dot: string; label: string }> = {
  GET: { pill: 'bg-sky-50 text-sky-700 border border-sky-200', dot: 'bg-sky-400', label: 'GET' },
  POST: { pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-400', label: 'POST' },
  PUT: { pill: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-400', label: 'PUT' },
  DELETE: { pill: 'bg-red-50 text-red-600 border border-red-200', dot: 'bg-red-400', label: 'DELETE' },
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

const sectionLabel: Record<EndpointSection, string> = { catalogos: 'Catálogos' };

const parseMaybeJson = (rawValue: string): unknown => {
  const value = rawValue.trim();
  if (!value) return '';
  if (value.startsWith('[') || value.startsWith('{') || value === 'true' || value === 'false') {
    return JSON.parse(value);
  }
  return value;
};

function MethodPill({ method }: { method: HttpMethod }) {
  const c = METHOD_COLORS[method];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide ${c.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

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
      if (field.pathParam) { resolvedPath = resolvedPath.replace(`:${field.name}`, encodeURIComponent(value)); return; }
      if (field.header) { headers[field.name] = value; return; }
      body[field.name] = field.type === 'json' ? parseMaybeJson(value) : value;
    });

    return { path: resolvedPath, body, headers };
  };

  const handleRun = async (endpoint: EndpointSpec): Promise<void> => {
    try {
      setLoading((prev) => ({ ...prev, [endpoint.id]: true }));
      const { path, body, headers } = buildRequest(endpoint);
      const hasBody = endpoint.method !== 'GET' && endpoint.method !== 'DELETE';
      const response = await apiFetch(path, { method: endpoint.method, headers, ...(hasBody ? { body } : {}) });
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

  const hasResult = (id: string) => !!result[id];
  const isSuccess = (id: string) => {
    try { const p = JSON.parse(result[id]); return p && typeof p === 'object'; }
    catch { return false; }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">Consola interna</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Catálogos Tenant</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Ejecuta endpoints con el JWT activo de la sesión</p>
          </div>

          {/* Buscador */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar endpoint..."
              className="pl-8 h-9 text-sm bg-muted/40 border-border/60 focus:bg-background"
            />
          </div>
        </div>

        {/* ── Grupos de endpoints ── */}
        {(Object.keys(endpointGroups) as EndpointSection[]).map((section) => {
          const group = endpointGroups[section];
          if (group.length === 0) return (
            <div key={section} className="text-center py-12 text-sm text-muted-foreground">
              Sin resultados para <span className="font-medium">"{search}"</span>
            </div>
          );

          return (
            <div key={section} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  {sectionLabel[section]}
                </span>
                <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {group.length}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {group.map((endpoint) => {
                  const isLoading = !!loading[endpoint.id];
                  const hasFields = endpoint.fields.length > 0;

                  return (
                    <div
                      key={endpoint.id}
                      className="group relative bg-card border border-border/50 rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all duration-150"
                    >
                      {/* Cabecera */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <MethodPill method={endpoint.method} />
                        </div>
                        {hasResult(endpoint.id) && (
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${isSuccess(endpoint.id) ? 'bg-emerald-400' : 'bg-red-400'}`} title={isSuccess(endpoint.id) ? 'Éxito' : 'Error'} />
                        )}
                      </div>

                      {/* Título y descripción */}
                      <h3 className="text-sm font-semibold text-foreground leading-snug">{endpoint.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{endpoint.description}</p>

                      {/* Ruta */}
                      <div className="mt-3 flex items-center gap-1.5 bg-muted/40 rounded-lg px-2.5 py-1.5 min-w-0">
                        <Terminal className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <code className="text-[10px] text-muted-foreground truncate font-mono">{endpoint.path}</code>
                      </div>

                      {/* Acciones */}
                      <div className="mt-3 flex items-center gap-2">
                        {hasFields && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3 text-xs gap-1.5 border-border/60"
                            onClick={() => setEndpointModal(endpoint)}
                          >
                            <Settings2 className="w-3 h-3" />
                            Params
                          </Button>
                        )}
                        <Button
                          size="sm"
                          className="h-7 px-3 text-xs gap-1.5 ml-auto"
                          onClick={() => void handleRun(endpoint)}
                          disabled={isLoading}
                        >
                          {isLoading
                            ? <><Loader2 className="w-3 h-3 animate-spin" /> Ejecutando</>
                            : <><Play className="w-3 h-3" /> Ejecutar</>
                          }
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de configuración */}
      <Dialog open={!!endpointModal} onOpenChange={(open) => !open && setEndpointModal(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
          {endpointModal && (
            <div className="space-y-5">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold">{endpointModal.title}</DialogTitle>
                <div className="flex items-center gap-2 pt-1">
                  <MethodPill method={endpointModal.method} />
                  <code className="text-[11px] text-muted-foreground font-mono bg-muted/50 px-2 py-0.5 rounded-md truncate max-w-xs">
                    {endpointModal.path}
                  </code>
                </div>
              </DialogHeader>

              {/* Separador */}
              <div className="h-px bg-border/50" />

              {/* Campos */}
              <div className="space-y-4">
                {endpointModal.fields.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Este endpoint no requiere parámetros.</p>
                  </div>
                ) : (
                  endpointModal.fields.map((field) => (
                    <div key={field.name} className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                        {field.label}
                        {field.required && <span className="text-primary">*</span>}
                        {field.pathParam && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">path</Badge>}
                        {field.header && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">header</Badge>}
                      </Label>
                      {field.type === 'textarea' ? (
                        <Textarea
                          value={getField(endpointModal.id, field.name)}
                          placeholder={field.placeholder || ''}
                          onChange={(e) => setField(endpointModal.id, field.name, e.target.value)}
                          className="text-sm min-h-[80px] bg-muted/30"
                        />
                      ) : (
                        <Input
                          value={getField(endpointModal.id, field.name)}
                          placeholder={field.placeholder || `Ingresa ${field.label.toLowerCase()}`}
                          onChange={(e) => setField(endpointModal.id, field.name, e.target.value)}
                          className="h-9 text-sm bg-muted/30"
                        />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Botones */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void handleRun(endpointModal)}
                  disabled={!!loading[endpointModal.id]}
                >
                  {loading[endpointModal.id]
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Ejecutando...</>
                    : <><Play className="w-3.5 h-3.5" /> Ejecutar</>
                  }
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => handleClean(endpointModal.id)}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Limpiar
                </Button>
              </div>

              {/* Respuesta */}
              {result[endpointModal.id] && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Terminal className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Respuesta</span>
                    <span className={`w-1.5 h-1.5 rounded-full ml-auto ${isSuccess(endpointModal.id) ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  </div>
                  <Textarea
                    className="min-h-[160px] font-mono text-[11px] bg-muted/30 border-border/50 resize-none"
                    readOnly
                    value={result[endpointModal.id]}
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ParametrizacionCatologTenant;