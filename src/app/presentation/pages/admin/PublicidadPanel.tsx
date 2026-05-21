import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, apiFetchPublic } from '@/app/services/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getRouteCatalog, type RouteCatalogItem } from '@/app/services/routeService';
import inventarioService, {
  type InventarioTenantGlobalOpcion,
  type InventarioTenantSuperAdminOpcion,
} from '@/app/services/inventarioService';
import {
  getEmpleadoGlobalContext,
  getTenantCorporativos,
  type TenantCorporativoOption,
  type TenantGlobalOption,
} from '@/app/services/empleadoGlobalService';
import {
  AlertCircle,
  CheckCircle2,
  ImageUp,
  Link as LinkIcon,
  Loader2,
  Megaphone,
  Plus,
  Power,
  RefreshCw,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const LIST_URL = `${API_BASE_URL}/configuration/listar/todas/publicidad`;
const SAVE_URL = `${API_BASE_URL}/configuration/guardar/publicidad/modal`;
const UPDATE_URL = (id: string) => `${API_BASE_URL}/configuration/actualizar/contenido/publicitario/${id}`;
const NONE_VALUE = '__none__';

type PublicidadScopeTipo = 'GENERAL' | 'TENANT_RUTA';

type Publicidad = {
  id?: string;
  iud?: string;
  _id?: string;
  tittle?: string;
  subtittle?: string;
  body?: string;
  price?: string;
  buttonText?: string;
  buttonLink?: string;
  estado?: boolean;
  prioridad?: number;
  scope?: {
    tipo?: PublicidadScopeTipo;
    tenantGlobal?: any;
    tenantCorporativo?: any;
    rutasSeguridad?: any[];
    rutasPaths?: string[];
  };
};

type PublicidadForm = {
  tittle: string;
  subtittle: string;
  body: string;
  price: string;
  buttonText: string;
  buttonLink: string;
  estado: boolean;
  scopeTipo: PublicidadScopeTipo;
  tenantSuperAdminId: string;
  tenantGlobalId: string;
  tenantCorporativoId: string;
  routeIds: string[];
  routePaths: string[];
  img: File | null;
};

const emptyForm: PublicidadForm = {
  tittle: '',
  subtittle: '',
  body: '',
  price: '',
  buttonText: '',
  buttonLink: '',
  estado: true,
  scopeTipo: 'TENANT_RUTA',
  tenantSuperAdminId: '',
  tenantGlobalId: '',
  tenantCorporativoId: '',
  routeIds: [],
  routePaths: [],
  img: null,
};

const getPublicidadId = (pub: Publicidad): string => pub.iud || pub.id || pub._id || '';

const normalizeRoutePath = (path: string): string => {
  const raw = String(path || '').trim();
  if (!raw) return '/';
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  return withSlash.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
};

const mapPublicRouteCatalog = (rows: any[]): RouteCatalogItem[] => rows
  .map((route: any) => {
    const iud = String(route?.iud || route?._id || '').trim();
    if (!iud) return null;
    return {
      iud,
      path: normalizeRoutePath(route?.path || ''),
      layout: String(route?.layout || 'PublicLayout').replace('/', '').trim(),
      component: String(route?.component || '').replace(/\.(jsx|tsx|js|ts)$/i, ''),
      name: String(route?.name || route?.tiquetaNavb || route?.path || 'Ruta publica'),
      icon: route?.icon ?? null,
      tipoNodo: route?.tipoNodo ?? null,
      tipoNodoId: route?.tipoNodoId ?? null,
      accessType: Array.isArray(route?.accessType) ? route.accessType : (route?.accessType ? [route.accessType] : []),
      mostrarEnNavbarPublico: route?.mostrarEnNavbarPublico === true,
      mostrarEnSidebar: route?.mostrarEnSidebar === true,
      mostrarEnMenuUsuario: route?.mostrarEnMenuUsuario === true,
      tiquetaNavb: String(route?.tiquetaNavb || '').trim() || null,
      menuUsuarioLabel: String(route?.menuUsuarioLabel || '').trim() || null,
      menuUsuarioOrder: Number(route?.menuUsuarioOrder ?? 0),
    } as RouteCatalogItem;
  })
  .filter((route): route is RouteCatalogItem => route !== null);

const getRouteTipoCodigo = (route: RouteCatalogItem): string => {
  const tipoRef = route.tipoNodoId;
  const fromRef = typeof tipoRef === 'object' && tipoRef !== null
    ? String(tipoRef.codigo || '').trim()
    : '';
  return (fromRef || String(route.tipoNodo || '').trim()).toUpperCase();
};

const esFormularioOSubformulario = (route: RouteCatalogItem): boolean => {
  const codigo = getRouteTipoCodigo(route);
  return codigo === 'FORMULARIO' || codigo === 'SUBFORMULARIO' || /^SUB[\s_-]*FORMULARIO$/i.test(codigo);
};

const normalizeSearch = (value: string): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const routeMatchesSearch = (route: RouteCatalogItem, search: string): boolean => {
  const query = normalizeSearch(search);
  if (!query) return true;
  return normalizeSearch(`${route.name} ${route.path} ${route.component || ''}`).includes(query);
};

const optionMatchesSearch = (label: string, search: string): boolean => {
  const query = normalizeSearch(search);
  return !query || normalizeSearch(label).includes(query);
};

const appendPublicidadFields = (formData: FormData, pub: PublicidadForm | Publicidad, estado?: boolean): void => {
  formData.append('tittle', pub.tittle || '');
  formData.append('subtittle', pub.subtittle || '');
  formData.append('body', pub.body || '');
  formData.append('price', pub.price || '');
  formData.append('buttonText', pub.buttonText || '');
  formData.append('buttonLink', pub.buttonLink || '');
  formData.append('estado', String(estado ?? pub.estado ?? true));

  const formScope = pub as PublicidadForm;
  const currentScope = (pub as Publicidad).scope;
  const scopeTipo = formScope.scopeTipo || currentScope?.tipo || 'GENERAL';
  const tenantSuperAdminId = formScope.tenantSuperAdminId || '';
  const tenantGlobalId = formScope.tenantGlobalId || String(currentScope?.tenantGlobal?._id || currentScope?.tenantGlobal?.iud || currentScope?.tenantGlobal || '');
  const tenantCorporativoId = formScope.tenantCorporativoId || String(currentScope?.tenantCorporativo?._id || currentScope?.tenantCorporativo?.iud || currentScope?.tenantCorporativo || '');
  const routeIds = formScope.routeIds || (currentScope?.rutasSeguridad || []).map((route: any) => String(route?._id || route?.iud || route || '')).filter(Boolean);
  const routePaths = formScope.routePaths || currentScope?.rutasPaths || [];

  formData.append('scopeTipo', scopeTipo);
  formData.append('tenantSuperAdminId', tenantSuperAdminId);
  formData.append('tenantGlobalId', tenantGlobalId);
  formData.append('tenantCorporativoId', tenantCorporativoId);
  formData.append('routeIds', JSON.stringify(routeIds));
  formData.append('rutasPaths', JSON.stringify(routePaths));
  formData.append('prioridad', String((pub as Publicidad).prioridad ?? 0));
};

export default function PublicidadPanel(): React.ReactElement {
  const [data, setData] = useState<Publicidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<PublicidadForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [routes, setRoutes] = useState<RouteCatalogItem[]>([]);
  const [tenantScopedRoutes, setTenantScopedRoutes] = useState<RouteCatalogItem[] | null>(null);
  const [securityRoutes, setSecurityRoutes] = useState<RouteCatalogItem[]>([]);
  const [tenantSuperAdmins, setTenantSuperAdmins] = useState<InventarioTenantSuperAdminOpcion[]>([]);
  const [tenantGlobalesAutorizacion, setTenantGlobalesAutorizacion] = useState<InventarioTenantGlobalOpcion[]>([]);
  const [tenantGlobales, setTenantGlobales] = useState<TenantGlobalOption[]>([]);
  const [tenantCorporativos, setTenantCorporativos] = useState<TenantCorporativoOption[]>([]);
  const [buttonRouteSearch, setButtonRouteSearch] = useState('');
  const [tenantGlobalSearch, setTenantGlobalSearch] = useState('');
  const [formRouteSearch, setFormRouteSearch] = useState('');

  const activeCount = useMemo(() => data.filter((pub) => pub.estado === true).length, [data]);
  const tenantGlobalOptions = useMemo(() => {
    const byId = new Map<string, TenantGlobalOption>();
    tenantGlobales
      .filter((tenant) => !form.tenantSuperAdminId || tenant.tenantSuperAdminId === form.tenantSuperAdminId)
      .forEach((tenant) => {
        byId.set(tenant.id, tenant);
      });
    tenantGlobalesAutorizacion.forEach((tenant) => {
      byId.set(tenant.iud, {
        id: tenant.iud,
        label: tenant.codigoJerarquia ? `${tenant.codigoJerarquia} - ${tenant.label}` : tenant.label,
        tenantSuperAdminId: form.tenantSuperAdminId || undefined,
      });
    });
    return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [form.tenantSuperAdminId, tenantGlobales, tenantGlobalesAutorizacion]);
  const currentFormRoutes = useMemo(
    () => (form.tenantSuperAdminId ? tenantScopedRoutes ?? [] : routes),
    [form.tenantSuperAdminId, routes, tenantScopedRoutes]
  );
  const filteredSecurityRoutes = useMemo(
    () => securityRoutes.filter((route) => routeMatchesSearch(route, buttonRouteSearch)),
    [buttonRouteSearch, securityRoutes]
  );
  const filteredTenantGlobalOptions = useMemo(
    () => tenantGlobalOptions.filter((tenant) => optionMatchesSearch(tenant.label, tenantGlobalSearch)),
    [tenantGlobalOptions, tenantGlobalSearch]
  );
  const filteredFormRoutes = useMemo(
    () => currentFormRoutes.filter((route) => routeMatchesSearch(route, formRouteSearch)),
    [currentFormRoutes, formRouteSearch]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const res = await apiFetch(LIST_URL, { method: 'GET' });
      setData(res?.publicidades || res?.publicidad || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    let mounted = true;

    const loadOptions = async (): Promise<void> => {
      try {
        const [routeRows, publicRoutesRes, tenantCtx, autorizacionCtx] = await Promise.all([
          getRouteCatalog(),
          apiFetchPublic(`${API_BASE_URL}/seguridad/rutas/listarRutas/public`, { method: 'GET' }),
          getEmpleadoGlobalContext(),
          inventarioService.obtenerFormulariosAutorizacionOpciones(undefined),
        ]);
        if (!mounted) return;
        const publicPayload: any = publicRoutesRes;
        const publicRoutes = mapPublicRouteCatalog(Array.isArray(publicPayload?.data) ? publicPayload.data : []);
        const byId = new Map<string, RouteCatalogItem>();
        [...routeRows, ...publicRoutes].filter((route) => route.iud && route.path).forEach((route) => {
          byId.set(route.iud, route);
        });
        const allRoutes = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
        const formRoutes = allRoutes.filter(esFormularioOSubformulario);
        const rutasAutorizacion = (autorizacionCtx.formularios || []).map((route) => ({
          iud: route.id,
          path: normalizeRoutePath(route.path),
          layout: 'AdminLayout',
          component: String(route.component || ''),
          name: route.name || route.path,
          icon: null,
          tipoNodo: route.tipoNodo,
          tipoNodoId: null,
          accessType: [],
        } as RouteCatalogItem));
        const formById = new Map<string, RouteCatalogItem>();
        [...formRoutes, ...rutasAutorizacion].filter((route) => route.iud && route.path).forEach((route) => {
          formById.set(route.iud, route);
        });
        setSecurityRoutes(allRoutes);
        setRoutes([...formById.values()].sort((a, b) => a.name.localeCompare(b.name)));
        setTenantScopedRoutes(null);
        setTenantSuperAdmins(autorizacionCtx.tenantSuperAdmins || []);
        setTenantGlobalesAutorizacion(autorizacionCtx.tenantGlobales || []);
        setTenantGlobales(tenantCtx.tenantGlobales);
      } catch {
        if (!mounted) return;
        setRoutes([]);
        setTenantScopedRoutes(null);
        setSecurityRoutes([]);
        setTenantSuperAdmins([]);
        setTenantGlobalesAutorizacion([]);
        setTenantGlobales([]);
      }
    };

    void loadOptions();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadCorporativos = async (): Promise<void> => {
      try {
        const rows = await getTenantCorporativos(form.tenantGlobalId ? { tenantGlobal: form.tenantGlobalId } : undefined);
        if (!mounted) return;
        setTenantCorporativos(rows);
      } catch {
        if (!mounted) return;
        setTenantCorporativos([]);
      }
    };

    void loadCorporativos();

    return () => {
      mounted = false;
    };
  }, [form.tenantGlobalId]);

  useEffect(() => {
    if (!form.tenantSuperAdminId) {
      setTenantScopedRoutes(null);
      return;
    }
    let mounted = true;

    const loadTenantSuperAdminOptions = async (): Promise<void> => {
      try {
        const data = await inventarioService.obtenerFormulariosAutorizacionOpciones(form.tenantSuperAdminId);
        if (!mounted) return;
        const rutasAutorizacion = (data.formularios || []).map((route) => ({
          iud: route.id,
          path: normalizeRoutePath(route.path),
          layout: 'AdminLayout',
          component: String(route.component || ''),
          name: route.name || route.path,
          icon: null,
          tipoNodo: route.tipoNodo,
          tipoNodoId: null,
          accessType: [],
        } as RouteCatalogItem));
        setTenantScopedRoutes(rutasAutorizacion.sort((a, b) => a.name.localeCompare(b.name)));
        setTenantGlobalesAutorizacion(data.tenantGlobales || []);
      } catch {
        if (!mounted) return;
        setTenantScopedRoutes([]);
        setTenantGlobalesAutorizacion([]);
      }
    };

    void loadTenantSuperAdminOptions();

    return () => {
      mounted = false;
    };
  }, [form.tenantSuperAdminId]);

  useEffect(() => {
    if (!form.tenantGlobalId) return;
    const tenantStillAllowed = tenantGlobalOptions.some((tenant) => tenant.id === form.tenantGlobalId);
    if (!tenantStillAllowed) {
      setForm((prev) => ({
        ...prev,
        tenantGlobalId: '',
        tenantCorporativoId: '',
      }));
    }
  }, [form.tenantGlobalId, tenantGlobalOptions]);

  useEffect(() => {
    const selectedRouteId = form.routeIds[0];
    if (!selectedRouteId) return;
    const routeStillAllowed = currentFormRoutes.some((route) => route.iud === selectedRouteId);
    if (!routeStillAllowed) {
      setForm((prev) => ({
        ...prev,
        routeIds: [],
        routePaths: [],
      }));
    }
  }, [currentFormRoutes, form.routeIds]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSuccess('');
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSuccess('');
    setForm((prev) => ({ ...prev, img: file }));
  };

  const selectedRouteValue = form.routeIds[0] || NONE_VALUE;

  const selectRoute = (routeId: string): void => {
    setSuccess('');
    const route = currentFormRoutes.find((item) => item.iud === routeId);
    setForm((prev) => ({
      ...prev,
      routeIds: route ? [route.iud] : [],
      routePaths: route ? [route.path] : [],
    }));
  };

  const selectButtonLinkRoute = (routeId: string): void => {
    setSuccess('');
    const route = securityRoutes.find((item) => item.iud === routeId);
    setForm((prev) => ({
      ...prev,
      buttonLink: route ? route.path : '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (!form.img) {
        throw new Error('Selecciona una imagen para el modal.');
      }
      if (form.scopeTipo === 'TENANT_RUTA' && form.routePaths.length === 0) {
        throw new Error('Selecciona al menos una ruta de seguridad.');
      }

      const body = new FormData();
      appendPublicidadFields(body, form);
      body.append('img', form.img);

      await apiFetch(SAVE_URL, {
        method: 'POST',
        body,
      });

      setForm(emptyForm);
      setSuccess('Publicidad guardada correctamente.');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleEstado = async (pub: Publicidad) => {
    const id = getPublicidadId(pub);
    if (!id) return;

    setUpdatingId(id);
    setError('');
    setSuccess('');

    try {
      const body = new FormData();
      appendPublicidadFields(body, pub, pub.estado !== true);
      await apiFetch(UPDATE_URL(id), {
        method: 'PUT',
        body,
      });
      setSuccess(pub.estado ? 'Publicidad desactivada.' : 'Publicidad activada.');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar estado');
    } finally {
      setUpdatingId('');
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Megaphone className="h-4 w-4" />
            Panel administrativo
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Publicidad</h1>
          <p className="text-sm text-muted-foreground">
            Crea y activa el contenido que se mostrara en el modal publico.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void fetchData()}
          disabled={loading || submitting}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          Actualizar
        </Button>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {success ? (
        <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardHeader className="flex-row items-start justify-between space-y-0 border-b p-5">
            <div className="space-y-1">
              <CardTitle className="text-base">Publicidades actuales</CardTitle>
              <CardDescription>
                {data.length} registros encontrados, {activeCount} activos
              </CardDescription>
            </div>
            <Badge variant="secondary" className="rounded-md">
              {activeCount} activas
            </Badge>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando publicidades...
              </div>
            ) : data.length === 0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center gap-2 px-6 text-center">
                <div className="rounded-full bg-muted p-3 text-muted-foreground">
                  <Megaphone className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-foreground">No hay publicidades registradas</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Agrega la primera desde el formulario lateral.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.map((pub, idx) => {
                  const id = getPublicidadId(pub);
                  const isActive = pub.estado === true;
                  return (
                    <article key={id || `${pub.tittle || 'publicidad'}-${idx}`} className="space-y-3 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 space-y-1">
                          <h2 className="truncate text-sm font-semibold text-foreground">
                            {pub.tittle || 'Sin titulo'}
                          </h2>
                          {pub.subtittle ? (
                            <p className="text-sm text-muted-foreground">{pub.subtittle}</p>
                          ) : null}
                        </div>

                        <Badge variant={isActive ? 'default' : 'outline'} className="shrink-0 rounded-md">
                          {isActive ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>

                      {pub.body ? (
                        <p className="text-sm leading-6 text-muted-foreground">{pub.body}</p>
                      ) : null}

                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline" className="rounded-md">
                          {pub.scope?.tipo || 'GENERAL'}
                        </Badge>
                        {pub.scope?.tenantGlobal ? (
                          <Badge variant="secondary" className="rounded-md">
                            Global: {pub.scope.tenantGlobal.razon_social || pub.scope.tenantGlobal.titulo || pub.scope.tenantGlobal.nombre || pub.scope.tenantGlobal.iud || pub.scope.tenantGlobal._id}
                          </Badge>
                        ) : null}
                        {pub.scope?.tenantCorporativo ? (
                          <Badge variant="secondary" className="rounded-md">
                            Corp: {pub.scope.tenantCorporativo.razon_social || pub.scope.tenantCorporativo.titulo || pub.scope.tenantCorporativo.nombre || pub.scope.tenantCorporativo.iud || pub.scope.tenantCorporativo._id}
                          </Badge>
                        ) : null}
                        {pub.scope?.rutasPaths?.length ? (
                          <Badge variant="secondary" className="rounded-md">
                            {pub.scope.rutasPaths.length} rutas
                          </Badge>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {(pub.buttonText || pub.buttonLink) ? (
                          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                            <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">
                              {pub.buttonText || 'Boton'}
                              {pub.buttonLink ? ` - ${pub.buttonLink}` : ''}
                            </span>
                          </div>
                        ) : <span />}

                        <Button
                          type="button"
                          variant={isActive ? 'outline' : 'default'}
                          size="sm"
                          onClick={() => void handleToggleEstado(pub)}
                          disabled={!id || updatingId === id}
                          className="w-full sm:w-auto"
                        >
                          {updatingId === id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                          {isActive ? 'Desactivar' : 'Activar'}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="border-b p-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" />
              Nueva publicidad
            </CardTitle>
            <CardDescription>Completa los campos principales del mensaje.</CardDescription>
          </CardHeader>

          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="img">Imagen *</Label>
                <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-4 py-5 text-center text-sm text-muted-foreground transition hover:border-primary/50">
                  <ImageUp className="h-5 w-5" />
                  <span>{form.img ? form.img.name : 'Seleccionar imagen JPG o PNG'}</span>
                  <Input id="img" type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleFileChange} />
                </label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tittle">Titulo *</Label>
                <Input
                  id="tittle"
                  name="tittle"
                  value={form.tittle}
                  onChange={handleChange}
                  placeholder="Ej. Oferta de temporada"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtittle">Subtitulo *</Label>
                <Input
                  id="subtittle"
                  name="subtittle"
                  value={form.subtittle}
                  onChange={handleChange}
                  placeholder="Mensaje corto para destacar"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Descripcion *</Label>
                <Textarea
                  id="body"
                  name="body"
                  value={form.body}
                  onChange={handleChange}
                  placeholder="Detalle de la publicidad"
                  rows={4}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Precio</Label>
                  <Input
                    id="price"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="$0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buttonText">Texto boton</Label>
                  <Input
                    id="buttonText"
                    name="buttonText"
                    value={form.buttonText}
                    onChange={handleChange}
                    placeholder="Comprar ahora"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Link boton</Label>
                <Select
                  value={securityRoutes.find((route) => route.path === form.buttonLink)?.iud || NONE_VALUE}
                  onValueChange={selectButtonLinkRoute}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona ruta de seguridad" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <div className="p-2">
                      <Input
                        value={buttonRouteSearch}
                        onChange={(event) => setButtonRouteSearch(event.target.value)}
                        onKeyDown={(event) => event.stopPropagation()}
                        placeholder="Buscar ruta por nombre..."
                        className="h-8"
                      />
                    </div>
                    <SelectItem value={NONE_VALUE}>Sin asignar</SelectItem>
                    {filteredSecurityRoutes.map((route) => (
                      <SelectItem key={route.iud} value={route.iud}>
                        {route.name} - {route.path}
                      </SelectItem>
                    ))}
                    {securityRoutes.length > 0 && !filteredSecurityRoutes.length ? (
                      <SelectItem value="__no_security_route_match__" disabled>
                        No hay rutas con ese nombre
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
                {!securityRoutes.length ? (
                  <p className="text-sm text-muted-foreground">No hay rutas de seguridad disponibles.</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Alcance</Label>
                <Select
                  value={form.scopeTipo}
                  onValueChange={(value) => setForm((prev) => ({
                    ...prev,
                    scopeTipo: value as PublicidadScopeTipo,
                    tenantSuperAdminId: value === 'GENERAL' ? '' : prev.tenantSuperAdminId,
                    tenantGlobalId: value === 'GENERAL' ? '' : prev.tenantGlobalId,
                    tenantCorporativoId: value === 'GENERAL' ? '' : prev.tenantCorporativoId,
                    routeIds: value === 'GENERAL' ? [] : prev.routeIds,
                    routePaths: value === 'GENERAL' ? [] : prev.routePaths,
                  }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">General</SelectItem>
                    <SelectItem value="TENANT_RUTA">Tenant + rutas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.scopeTipo === 'TENANT_RUTA' ? (
                <div className="space-y-2">
                  <Label>Tenant SuperAdmin</Label>
                  <Select
                    value={form.tenantSuperAdminId || NONE_VALUE}
                    onValueChange={(value) => {
                      setTenantGlobalSearch('');
                      setFormRouteSearch('');
                      setForm((prev) => ({
                        ...prev,
                        tenantSuperAdminId: value === NONE_VALUE ? '' : value,
                        tenantGlobalId: '',
                        tenantCorporativoId: '',
                        routeIds: [],
                        routePaths: [],
                      }));
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecciona tenant SuperAdmin" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Sin asignar</SelectItem>
                      {tenantSuperAdmins.map((tenant) => (
                        <SelectItem key={tenant.iud} value={tenant.iud}>
                          {tenant.codigoJerarquia ? `${tenant.codigoJerarquia} - ${tenant.label}` : tenant.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {form.scopeTipo === 'TENANT_RUTA' ? (
                <div className="space-y-2">
                  <Label>Tenant global</Label>
                  <Select
                    value={form.tenantGlobalId || NONE_VALUE}
                    onValueChange={(value) => setForm((prev) => ({
                      ...prev,
                      tenantGlobalId: value === NONE_VALUE ? '' : value,
                      tenantCorporativoId: '',
                    }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecciona tenant global" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      <div className="p-2">
                        <Input
                          value={tenantGlobalSearch}
                          onChange={(event) => setTenantGlobalSearch(event.target.value)}
                          onKeyDown={(event) => event.stopPropagation()}
                          placeholder="Buscar tenant global..."
                          className="h-8"
                        />
                      </div>
                      <SelectItem value={NONE_VALUE}>Sin asignar</SelectItem>
                      {filteredTenantGlobalOptions.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.label}
                        </SelectItem>
                      ))}
                      {tenantGlobalOptions.length > 0 && !filteredTenantGlobalOptions.length ? (
                        <SelectItem value="__no_tenant_global_match__" disabled>
                          No hay tenant global con ese nombre
                        </SelectItem>
                      ) : null}
                      {form.tenantSuperAdminId && !tenantGlobalOptions.length ? (
                        <SelectItem value="__no_tenant_global_for_sa__" disabled>
                          Este Tenant SuperAdmin no tiene tenant global disponible
                        </SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {form.scopeTipo === 'TENANT_RUTA' ? (
                <div className="space-y-2">
                  <Label>Tenant corporativo</Label>
                  <Select
                    value={form.tenantCorporativoId || NONE_VALUE}
                    onValueChange={(value) => setForm((prev) => ({
                      ...prev,
                      tenantCorporativoId: value === NONE_VALUE ? '' : value,
                    }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecciona corporativo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Sin asignar</SelectItem>
                      {tenantCorporativos.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {form.scopeTipo === 'TENANT_RUTA' ? (
                <div className="space-y-2">
                  <Label>Formularios y subformularios</Label>
                  <Select value={selectedRouteValue} onValueChange={selectRoute}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona formulario o subformulario" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <div className="p-2">
                        <Input
                          value={formRouteSearch}
                          onChange={(event) => setFormRouteSearch(event.target.value)}
                          onKeyDown={(event) => event.stopPropagation()}
                          placeholder="Buscar formulario por nombre..."
                          className="h-8"
                        />
                      </div>
                      <SelectItem value={NONE_VALUE}>Sin asignar</SelectItem>
                      {filteredFormRoutes.map((route) => (
                        <SelectItem key={route.iud} value={route.iud}>
                          {route.name} - {route.path}
                        </SelectItem>
                      ))}
                      {currentFormRoutes.length > 0 && !filteredFormRoutes.length ? (
                        <SelectItem value="__no_form_route_match__" disabled>
                          No hay formularios con ese nombre
                        </SelectItem>
                      ) : null}
                      {form.tenantSuperAdminId && !currentFormRoutes.length ? (
                        <SelectItem value="__no_form_route_for_sa__" disabled>
                          Este Tenant SuperAdmin no tiene formularios disponibles
                        </SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                  {!currentFormRoutes.length ? (
                    <p className="text-sm text-muted-foreground">No hay formularios o subformularios disponibles.</p>
                  ) : null}
                </div>
              ) : null}

              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <Label htmlFor="estado" className="text-sm">
                  Publicar como activa
                </Label>
                <Switch
                  id="estado"
                  checked={form.estado}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, estado: checked }))}
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Agregar publicidad
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
