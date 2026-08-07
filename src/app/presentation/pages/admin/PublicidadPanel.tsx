import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { abrirAlerta, cerrarAlerta } from '@/app/utils/alertasTransaccion';
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
  Eye,
  ImageUp,
  Link as LinkIcon,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Save,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import TiposPublicidadDialog from '@/app/presentation/components/admin/TiposPublicidadDialog';
import RichTextInput from '@/app/presentation/components/admin/RichTextInput';
import PublicidadPreviewDialog, {
  type PublicidadPreviewTarget,
} from '@/app/presentation/components/admin/PublicidadPreviewDialog';
import { getGovernedPublicHomePath } from '@/app/services/governedNavigation';
import { GovernedButton, PUBLICIDAD_ACTION_IDS } from '@/app/presentation/actions';
import {
  getPublicidadImageUrls,
  getDiapositivaImageUrl,
  obtenerTiposPublicidad,
  listarEtiquetasPublicidad,
  renombrarEtiquetaPublicidad,
  MAX_IMAGENES_PUBLICIDAD,
  MAX_DIAPOSITIVAS_PUBLICIDAD,
  type TrazabilidadColor,
  type TipoPublicidad,
  type PublicidadDiapositiva,
} from '@/app/services/contenidoDestacadoService';
import { TOKENS_PALETA_SEMANTICA, colorResueltoDeToken } from '@/app/utils/paletaSemanticaTokens';

const etiquetaDeToken = (token: string): string =>
  TOKENS_PALETA_SEMANTICA.find((item) => item.token === token)?.label || token;

const stripHtml = (value?: string): string => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const LIST_URL = `${API_BASE_URL}/configuration/listar/todas/publicidad`;
const SAVE_URL = `${API_BASE_URL}/configuration/guardar/publicidad/modal`;
const UPDATE_URL = (id: string) => `${API_BASE_URL}/configuration/actualizar/contenido/publicitario/${id}`;
const DELETE_URL = (id: string) => `${API_BASE_URL}/configuration/eliminar/contenido/${id}`;
const NONE_VALUE = '__none__';
const NUEVA_ETIQUETA_VALUE = '__nueva_etiqueta__';

type PublicidadScopeTipo = 'GENERAL' | 'TENANT_RUTA';

/** Código del tipo; el catálogo es parametrizable, no una lista fija. */
type PublicidadPresentacion = string;

type Publicidad = {
  id?: string;
  iud?: string;
  _id?: string;
  tittle?: string;
  subtittle?: string;
  body?: string;
  etiqueta?: string;
  presentacion?: PublicidadPresentacion;
  seccionRuta?: { _id?: string; iud?: string; name?: string; path?: string } | string | null;
  seccionPath?: string;
  puntosClave?: string[];
  diapositivas?: PublicidadDiapositiva[];
  img?: { _id?: string; iud?: string; id?: string } | string | null;
  imagenes?: Array<{ _id?: string; iud?: string; id?: string } | string>;
  tokensColor?: string[];
  trazabilidadColor?: TrazabilidadColor;
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
  etiqueta: string;
  presentacion: PublicidadPresentacion;
  /** Orden de aparición cuando varios registros comparten ruta: mayor va primero. */
  prioridad: string;
  seccionRutaId: string;
  seccionPath: string;
  puntosClave: string;
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
  /** Hasta MAX_IMAGENES_PUBLICIDAD archivos; en carrusel, una diapositiva cada uno. */
  imgs: File[];
  /** Diapositivas parametrizadas del carrusel. */
  diapositivas: DiapositivaForm[];
};

/** Diapositiva en edición: su imagen puede ser nueva (archivo) o la ya guardada. */
type DiapositivaForm = {
  tittle: string;
  subtittle: string;
  body: string;
  price: string;
  buttonText: string;
  buttonLink: string;
  /** Id de la imagen que ya tiene la diapositiva (se conserva si no se sube otra). */
  imgId: string;
  imgUrl: string;
  archivo: File | null;
};

const emptyDiapositiva: DiapositivaForm = {
  tittle: '',
  subtittle: '',
  body: '',
  price: '',
  buttonText: '',
  buttonLink: '',
  imgId: '',
  imgUrl: '',
  archivo: null,
};

const emptyForm: PublicidadForm = {
  tittle: '',
  subtittle: '',
  body: '',
  etiqueta: '',
  presentacion: 'SECCION',
  prioridad: '0',
  seccionRutaId: '',
  seccionPath: '',
  puntosClave: '',
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
  imgs: [],
  diapositivas: [],
};

const getPublicidadId = (pub: Publicidad): string => pub.iud || pub.id || pub._id || '';


/** Id de una referencia populada o cruda (iud público u ObjectId legacy). */
const refIdDe = (ref: any): string =>
  String((typeof ref === 'object' && ref !== null ? (ref.iud || ref._id || ref.id) : ref) || '');

/**
 * Diapositivas del registro para editarlas. Si es un carrusel que aún no las
 * tiene, se siembra la primera con el contenido principal: así lo que hoy se ve
 * como una diapositiva queda explícito y solo hay que agregar las siguientes.
 */
const diapositivasDeRegistro = (pub: Publicidad): DiapositivaForm[] => {
  const existentes = (pub.diapositivas || [])
    .slice()
    .sort((a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0))
    .map((diapo) => ({
      tittle: diapo.tittle || '',
      subtittle: diapo.subtittle || '',
      body: diapo.body || '',
      price: diapo.price || '',
      buttonText: diapo.buttonText || '',
      buttonLink: diapo.buttonLink || '',
      imgId: refIdDe(diapo.img),
      imgUrl: getDiapositivaImageUrl(diapo),
      archivo: null,
    }));

  if (existentes.length || pub.presentacion !== 'CARRUSEL') return existentes;

  return [{
    tittle: pub.tittle || '',
    subtittle: pub.subtittle || '',
    body: pub.body || '',
    price: pub.price || '',
    buttonText: pub.buttonText || '',
    buttonLink: pub.buttonLink || '',
    imgId: refIdDe(pub.img),
    imgUrl: getPublicidadImageUrls(pub)[0] || '',
    archivo: null,
  }];
};

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

const parsePuntosClave = (pub: PublicidadForm | Publicidad): string[] => {
  const raw = (pub as PublicidadForm).puntosClave;
  if (typeof raw === 'string') {
    return raw.split('\n').map((punto) => punto.trim()).filter(Boolean);
  }
  return ((pub as Publicidad).puntosClave || []).map((punto) => String(punto || '').trim()).filter(Boolean);
};

const appendPublicidadFields = (formData: FormData, pub: PublicidadForm | Publicidad, estado?: boolean): void => {
  formData.append('tittle', pub.tittle || '');
  formData.append('subtittle', pub.subtittle || '');
  formData.append('body', pub.body || '');
  formData.append('etiqueta', pub.etiqueta || '');
  formData.append('presentacion', pub.presentacion || 'SECCION');

  const formSeccion = pub as PublicidadForm;
  const currentSeccionRuta = (pub as Publicidad).seccionRuta;
  const seccionRutaId = formSeccion.seccionRutaId !== undefined
    ? formSeccion.seccionRutaId
    : String((typeof currentSeccionRuta === 'object' && currentSeccionRuta !== null
      ? currentSeccionRuta._id || currentSeccionRuta.iud
      : currentSeccionRuta) || '');
  const seccionPath = formSeccion.seccionPath !== undefined
    ? formSeccion.seccionPath
    : String((pub as Publicidad).seccionPath || '');
  formData.append('seccionRutaId', seccionRutaId);
  formData.append('seccionPath', seccionPath);
  formData.append('puntosClave', JSON.stringify(parsePuntosClave(pub)));
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
  // El formulario manda su propio orden; desde el listado se conserva el guardado.
  const prioridadForm = (pub as PublicidadForm).prioridad;
  formData.append(
    'prioridad',
    String(prioridadForm !== undefined ? (Number(prioridadForm) || 0) : ((pub as Publicidad).prioridad ?? 0))
  );
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
  const [seccionRouteSearch, setSeccionRouteSearch] = useState('');
  /** Busqueda del selector de ruta dentro de las diapositivas. */
  const [diapoRouteSearch, setDiapoRouteSearch] = useState('');
  const [previewTarget, setPreviewTarget] = useState<PublicidadPreviewTarget | null>(null);
  const [tiposPublicidad, setTiposPublicidad] = useState<TipoPublicidad[]>([]);
  const [etiquetasServidor, setEtiquetasServidor] = useState<string[]>([]);
  const [renombrandoEtiqueta, setRenombrandoEtiqueta] = useState(false);
  /** Evita sobrescribir el orden cuando el usuario lo escribe a mano. */
  const [prioridadTocada, setPrioridadTocada] = useState(false);
  const [tiposDialogAbierto, setTiposDialogAbierto] = useState(false);
  /** true cuando el usuario escribe una etiqueta nueva en vez de reutilizar una existente. */
  const [etiquetaNueva, setEtiquetaNueva] = useState(false);

  // Nombre visible del tipo; si el catálogo aún no cargó se muestra el código.
  const etiquetaDeTipo = useCallback(
    (codigo?: string): string =>
      tiposPublicidad.find((tipo) => tipo.codigo === codigo)?.nombre || codigo || 'Sin tipo',
    [tiposPublicidad]
  );
  /** Id del registro en edición: vacío significa alta nueva. */
  const [editandoId, setEditandoId] = useState('');
  const [eliminandoId, setEliminandoId] = useState('');
  /** Imágenes que ya tiene el registro en edición, para saber qué se reemplaza. */
  const [imagenesActuales, setImagenesActuales] = useState<string[]>([]);
  const [tenantGlobalSearch, setTenantGlobalSearch] = useState('');
  const [formRouteSearch, setFormRouteSearch] = useState('');

  const activeCount = useMemo(() => data.filter((pub) => pub.estado === true).length, [data]);
  /**
   * Siguiente orden libre: el mayor de los registros que comparten ruta más uno,
   * para que un contenido nuevo se ubique al frente sin escribir el número.
   */
  const siguientePrioridad = useMemo(() => {
    const mismaRuta = data.filter((pub) => String(pub.seccionPath || '') === String(form.seccionPath || ''));
    const base = mismaRuta.length ? mismaRuta : data;
    const mayor = base.reduce((max, pub) => Math.max(max, Number(pub.prioridad ?? 0)), 0);
    return mayor + 1;
  }, [data, form.seccionPath]);

  /**
   * Etiquetas disponibles: las del servidor más las de los registros cargados,
   * para que el selector refleje siempre todas las que existen.
   */
  const etiquetasExistentes = useMemo(() => {
    const delListado = data.map((pub) => String(pub.etiqueta || '').trim()).filter(Boolean);
    return [...new Set([...etiquetasServidor, ...delListado])].sort();
  }, [data, etiquetasServidor]);
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
  const filteredDiapoRoutes = useMemo(
    () => securityRoutes.filter((route) => routeMatchesSearch(route, diapoRouteSearch)),
    [diapoRouteSearch, securityRoutes]
  );
  const filteredSeccionRoutes = useMemo(
    () => securityRoutes.filter((route) => routeMatchesSearch(route, seccionRouteSearch)),
    [seccionRouteSearch, securityRoutes]
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

  // Al crear, el orden se sugiere solo; si el usuario lo escribe, se respeta.
  useEffect(() => {
    if (editandoId || prioridadTocada) return;
    setForm((prev) => (
      prev.prioridad === String(siguientePrioridad)
        ? prev
        : { ...prev, prioridad: String(siguientePrioridad) }
    ));
  }, [editandoId, prioridadTocada, siguientePrioridad]);

  // Catálogo parametrizable: las opciones del selector salen de la BD.
  useEffect(() => {
    let mounted = true;
    void obtenerTiposPublicidad().then((tipos) => {
      if (mounted) setTiposPublicidad(tipos);
    });
    void listarEtiquetasPublicidad().then((etiquetas) => {
      if (mounted) setEtiquetasServidor(etiquetas);
    });
    return () => {
      mounted = false;
    };
  }, []);

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
    // Escribir el orden a mano desactiva la sugerencia automática.
    if (name === 'prioridad') setPrioridadTocada(true);
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seleccionados = Array.from(e.target.files || []);
    setSuccess('');

    if (seleccionados.length > MAX_IMAGENES_PUBLICIDAD) {
      setError(`Se permiten maximo ${MAX_IMAGENES_PUBLICIDAD} imagenes por registro.`);
      setForm((prev) => ({ ...prev, imgs: seleccionados.slice(0, MAX_IMAGENES_PUBLICIDAD) }));
      return;
    }

    setError('');
    setForm((prev) => ({ ...prev, imgs: seleccionados }));
  };

  const quitarImagenSeleccionada = (indice: number): void => {
    setForm((prev) => ({ ...prev, imgs: prev.imgs.filter((_, i) => i !== indice) }));
  };

  // ── Diapositivas del carrusel ───────────────────────────────────────────────
  const agregarDiapositiva = (): void => {
    setSuccess('');
    setForm((prev) => (
      prev.diapositivas.length >= MAX_DIAPOSITIVAS_PUBLICIDAD
        ? prev
        : { ...prev, diapositivas: [...prev.diapositivas, { ...emptyDiapositiva }] }
    ));
  };

  const actualizarDiapositiva = (indice: number, cambios: Partial<DiapositivaForm>): void => {
    setSuccess('');
    setForm((prev) => ({
      ...prev,
      diapositivas: prev.diapositivas.map((diapo, i) => (i === indice ? { ...diapo, ...cambios } : diapo)),
    }));
  };

  const quitarDiapositiva = (indice: number): void => {
    setForm((prev) => ({ ...prev, diapositivas: prev.diapositivas.filter((_, i) => i !== indice) }));
  };

  /** Con diapositivas cargadas, la imagen la aporta cada una, no el registro. */
  const usaDiapositivas = form.presentacion === 'CARRUSEL' && form.diapositivas.length > 0;

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

  const selectSeccionRuta = (routeId: string): void => {
    setSuccess('');
    const route = securityRoutes.find((item) => item.iud === routeId);
    setForm((prev) => ({
      ...prev,
      seccionRutaId: route ? route.iud : '',
      seccionPath: route ? route.path : '',
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

  /** Id de una referencia populada o cruda (iud público u ObjectId legacy). */
  const refId = (ref: any): string =>
    String((typeof ref === 'object' && ref !== null ? (ref.iud || ref._id || ref.id) : ref) || '');

  /** Carga un registro existente en el formulario para editarlo. */
  const editarRegistro = (pub: Publicidad): void => {
    const id = getPublicidadId(pub);
    if (!id) return;

    setError('');
    setSuccess('');
    setEditandoId(id);
    setImagenesActuales(getPublicidadImageUrls(pub));
    // Si la etiqueta del registro ya no está en el listado, se edita como texto libre.
    setEtiquetaNueva(!etiquetasExistentes.includes(String(pub.etiqueta || '').trim()));
    setForm({
      tittle: pub.tittle || '',
      subtittle: pub.subtittle || '',
      body: pub.body || '',
      etiqueta: pub.etiqueta || '',
      presentacion: pub.presentacion || 'SECCION',
      prioridad: String(pub.prioridad ?? 0),
      seccionRutaId: refId(pub.seccionRuta),
      seccionPath: pub.seccionPath || '',
      puntosClave: (pub.puntosClave || []).join('\n'),
      price: pub.price || '',
      buttonText: pub.buttonText || '',
      buttonLink: pub.buttonLink || '',
      estado: pub.estado !== false,
      scopeTipo: pub.scope?.tipo || 'GENERAL',
      tenantSuperAdminId: '',
      tenantGlobalId: refId(pub.scope?.tenantGlobal),
      tenantCorporativoId: refId(pub.scope?.tenantCorporativo),
      routeIds: (pub.scope?.rutasSeguridad || []).map(refId).filter(Boolean),
      routePaths: pub.scope?.rutasPaths || [],
      // Las imagenes solo se reemplazan si se eligen nuevas.
      imgs: [],
      diapositivas: diapositivasDeRegistro(pub),
    });

    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = (): void => {
    setEditandoId('');
    setImagenesActuales([]);
    setEtiquetaNueva(false);
    setForm(emptyForm);
    setError('');
    setSuccess('');
  };

  /**
   * Renombra la etiqueta seleccionada. El nuevo valor reemplaza al anterior en
   * todos los registros que lo usaban, para que ninguno quede desactualizado.
   */
  const handleRenombrarEtiqueta = async (): Promise<void> => {
    const actual = form.etiqueta.trim();
    if (!actual) return;

    const nueva = typeof window !== 'undefined'
      ? window.prompt(`Nuevo nombre para la etiqueta "${actual}":`, actual)
      : null;
    if (nueva === null) return;

    const destino = nueva.trim();
    if (!destino || destino === actual) return;

    setRenombrandoEtiqueta(true);
    setError('');
    setSuccess('');
    const alerta = abrirAlerta('Renombrando etiqueta…');

    try {
      const respuesta = await renombrarEtiquetaPublicidad(actual, destino);
      setForm((prev) => ({ ...prev, etiqueta: destino }));
      setEtiquetasServidor(await listarEtiquetasPublicidad());
      const mensaje = respuesta?.msg || 'Etiqueta actualizada.';
      setSuccess(mensaje);
      cerrarAlerta(alerta, 'success', mensaje);
      await fetchData();
    } catch (err: any) {
      const mensaje = err?.message || 'No se pudo renombrar la etiqueta';
      setError(mensaje);
      cerrarAlerta(alerta, 'error', mensaje);
    } finally {
      setRenombrandoEtiqueta(false);
    }
  };

  const handleEliminar = async (pub: Publicidad): Promise<void> => {
    const id = getPublicidadId(pub);
    if (!id) return;

    const etiqueta = pub.etiqueta || stripHtml(pub.tittle) || 'este registro';
    if (typeof window !== 'undefined' && !window.confirm(`¿Eliminar "${etiqueta}"? Esta accion no se puede deshacer.`)) {
      return;
    }

    setEliminandoId(id);
    setError('');
    setSuccess('');
    const alerta = abrirAlerta('Eliminando publicidad…');

    try {
      await apiFetch(DELETE_URL(id), { method: 'DELETE' });
      if (editandoId === id) cancelarEdicion();
      setSuccess('Publicidad eliminada correctamente.');
      cerrarAlerta(alerta, 'success', 'Publicidad eliminada correctamente.');
      await fetchData();
    } catch (err: any) {
      const mensaje = err.message || 'Error al eliminar';
      setError(mensaje);
      cerrarAlerta(alerta, 'error', mensaje);
    } finally {
      setEliminandoId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    const alerta = abrirAlerta(editandoId ? 'Guardando cambios…' : 'Creando publicidad…');

    try {
      // Al editar, la imagen actual se conserva si no se elige una nueva.
      const totalImagenesNuevas = form.imgs.length + form.diapositivas.filter((d) => d.archivo).length;
      if (!totalImagenesNuevas && !editandoId) {
        throw new Error('Selecciona al menos una imagen.');
      }
      if (form.imgs.length > MAX_IMAGENES_PUBLICIDAD) {
        throw new Error(`Se permiten maximo ${MAX_IMAGENES_PUBLICIDAD} imagenes por registro.`);
      }
      if (!form.etiqueta.trim()) {
        throw new Error('Escribe una etiqueta para identificar el registro.');
      }
      // El editor enriquecido nunca entrega cadena vacia: se valida el texto sin formato.
      if (!stripHtml(form.tittle)) {
        throw new Error('Escribe el titulo.');
      }
      if (!stripHtml(form.body)) {
        throw new Error('Escribe la descripcion.');
      }
      if (form.scopeTipo === 'TENANT_RUTA' && form.routePaths.length === 0) {
        throw new Error('Selecciona al menos una ruta de seguridad.');
      }

      const body = new FormData();
      appendPublicidadFields(body, form);
      // Todas van con el mismo nombre: express-fileupload las entrega como arreglo.
      // Las imágenes de las diapositivas se anexan después, y cada diapositiva
      // guarda el índice que le corresponde dentro de ese arreglo.
      const archivos: File[] = [...form.imgs];
      const diapositivasPayload = form.diapositivas.map((diapo, orden) => {
        let imagenIndice = -1;
        if (diapo.archivo) {
          imagenIndice = archivos.length;
          archivos.push(diapo.archivo);
        }
        return {
          tittle: diapo.tittle,
          subtittle: diapo.subtittle,
          body: diapo.body,
          price: diapo.price,
          buttonText: diapo.buttonText,
          buttonLink: diapo.buttonLink,
          imgId: diapo.imgId,
          imagenIndice,
          orden,
        };
      });

      if (archivos.length > MAX_IMAGENES_PUBLICIDAD) {
        throw new Error(`Entre la galeria y las diapositivas se permiten maximo ${MAX_IMAGENES_PUBLICIDAD} imagenes.`);
      }

      body.append('diapositivas', JSON.stringify(diapositivasPayload));
      // Los primeros archivos son la galeria del registro; los siguientes
      // pertenecen a cada diapositiva y no deben tocar la imagen principal.
      body.append('galeriaCount', String(form.imgs.length));
      archivos.forEach((archivo) => body.append('img', archivo));

      if (editandoId) {
        await apiFetch(UPDATE_URL(editandoId), { method: 'PUT', body });
      } else {
        await apiFetch(SAVE_URL, { method: 'POST', body });
      }

      const mensaje = editandoId
        ? 'Publicidad actualizada correctamente.'
        : 'Publicidad guardada correctamente.';
      setSuccess(mensaje);
      cerrarAlerta(alerta, 'success', mensaje);
      setEditandoId('');
      setImagenesActuales([]);
      setForm(emptyForm);
      await fetchData();
    } catch (err: any) {
      const mensaje = err.message || 'Error al guardar';
      setError(mensaje);
      cerrarAlerta(alerta, 'error', mensaje);
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
    const alerta = abrirAlerta(pub.estado ? 'Desactivando publicidad…' : 'Activando publicidad…');

    try {
      const body = new FormData();
      appendPublicidadFields(body, pub, pub.estado !== true);
      await apiFetch(UPDATE_URL(id), {
        method: 'PUT',
        body,
      });
      const mensaje = pub.estado ? 'Publicidad desactivada.' : 'Publicidad activada.';
      setSuccess(mensaje);
      cerrarAlerta(alerta, 'success', mensaje);
      await fetchData();
    } catch (err: any) {
      const mensaje = err.message || 'Error al actualizar estado';
      setError(mensaje);
      cerrarAlerta(alerta, 'error', mensaje);
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

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <GovernedButton
          actionId={PUBLICIDAD_ACTION_IDS.MANAGE_TYPES}
          id="btn-parametrizar-tipos"
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setTiposDialogAbierto(true)}
          title="Administrar el catalogo de tipos de publicidad"
          className="w-full sm:w-auto"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Tipos de publicidad
        </GovernedButton>

        <GovernedButton
          actionId={PUBLICIDAD_ACTION_IDS.REFRESH_LIST}
          id="btn-refrescar-publicidades"
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void fetchData()}
          disabled={loading || submitting}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          Actualizar
        </GovernedButton>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {success ? (
        <div className="flex items-start gap-2 rounded-md border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
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
            <div className="flex items-center gap-2">
              <GovernedButton
                actionId={PUBLICIDAD_ACTION_IDS.PREVIEW_SECTION}
                id="btn-vista-previa-home"
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewTarget({ seccionPath: getGovernedPublicHomePath() })}
                title="Ver como queda la seccion en la pagina de inicio"
              >
                <Eye className="h-4 w-4" />
                Vista previa home
              </GovernedButton>
              <Badge variant="secondary" className="rounded-md">
                {activeCount} activas
              </Badge>
            </div>
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
                          {pub.etiqueta ? (
                            <p className="truncate text-xs font-semibold uppercase tracking-wide text-primary">
                              {pub.etiqueta}
                            </p>
                          ) : null}
                          <h2 className="truncate text-sm font-semibold text-foreground">
                            {stripHtml(pub.tittle) || 'Sin titulo'}
                          </h2>
                          {pub.subtittle ? (
                            <p className="text-sm text-muted-foreground">{stripHtml(pub.subtittle)}</p>
                          ) : null}
                        </div>

                        <Badge variant={isActive ? 'default' : 'outline'} className="shrink-0 rounded-md">
                          {isActive ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>

                      {stripHtml(pub.body) ? (
                        <p className="text-sm leading-6 text-muted-foreground">{stripHtml(pub.body)}</p>
                      ) : null}

                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline" className="rounded-md">
                          {etiquetaDeTipo(pub.presentacion)}
                        </Badge>
                        <Badge variant="secondary" className="rounded-md">
                          Orden: {pub.prioridad ?? 0}
                        </Badge>
                        <Badge variant="outline" className="rounded-md">
                          {pub.seccionPath ? `Ruta: ${pub.seccionPath}` : 'Modal de inicio'}
                        </Badge>
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

                      {/* Trazabilidad de color: qué paleta gobierna el contenido y qué colores usa */}
                      {(pub.tokensColor?.length || pub.trazabilidadColor?.personalizados?.length) ? (
                        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-muted/30 p-2 text-xs">
                          <span className="font-medium text-muted-foreground">
                            Paleta {pub.trazabilidadColor?.paletaTipo === 'RUTA'
                              ? `de ruta${typeof pub.trazabilidadColor?.paletaRuta === 'object' && pub.trazabilidadColor?.paletaRuta?.nombre
                                ? `: ${pub.trazabilidadColor.paletaRuta.nombre}`
                                : ''}`
                              : 'global'}
                          </span>

                          {pub.tokensColor?.map((token) => (
                            <Badge key={token} variant="outline" className="gap-1 rounded-md font-normal">
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full border border-border"
                                style={{ backgroundColor: colorResueltoDeToken(token) }}
                              />
                              {etiquetaDeToken(token)}
                            </Badge>
                          ))}

                          {pub.trazabilidadColor?.personalizados?.map((color) => (
                            <Badge
                              key={color.valor}
                              variant={color.tokenEquivalente ? 'outline' : 'secondary'}
                              className="gap-1 rounded-md font-normal"
                              title={color.tokenEquivalente
                                ? `Color fijo que coincide con ${etiquetaDeToken(color.tokenEquivalente)} de la paleta`
                                : 'Color fijo fuera de la paleta: no cambia si cambia la paleta'}
                            >
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full border border-border"
                                style={{ backgroundColor: color.valor }}
                              />
                              {color.valor}
                              {color.tokenEquivalente ? ` = ${etiquetaDeToken(color.tokenEquivalente)}` : ' (fuera de paleta)'}
                            </Badge>
                          ))}
                        </div>
                      ) : null}

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

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <GovernedButton
                            actionId={PUBLICIDAD_ACTION_IDS.PREVIEW_RECORD}
                            id={`btn-vista-previa-${id}`}
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewTarget({ etiqueta: pub.etiqueta || '' })}
                            disabled={!pub.etiqueta}
                            title={pub.etiqueta ? 'Ver vista previa' : 'El registro no tiene etiqueta'}
                            className="w-full sm:w-auto"
                          >
                            <Eye className="h-4 w-4" />
                            Vista previa
                          </GovernedButton>

                          <GovernedButton
                            actionId={PUBLICIDAD_ACTION_IDS.UPDATE_RECORD}
                            id={`btn-editar-${id}`}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => editarRegistro(pub)}
                            disabled={!id || submitting}
                            title="Editar este registro"
                            className="w-full sm:w-auto"
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </GovernedButton>

                          <GovernedButton
                            actionId={PUBLICIDAD_ACTION_IDS.TOGGLE_RECORD}
                            id={`btn-estado-${id}`}
                            type="button"
                            variant={isActive ? 'outline' : 'default'}
                            size="sm"
                            onClick={() => void handleToggleEstado(pub)}
                            disabled={!id || updatingId === id}
                            title={isActive ? 'Desactivar este registro' : 'Activar este registro'}
                            className="w-full sm:w-auto"
                          >
                            {updatingId === id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Power className="h-4 w-4" />
                            )}
                            {isActive ? 'Desactivar' : 'Activar'}
                          </GovernedButton>

                          <GovernedButton
                            actionId={PUBLICIDAD_ACTION_IDS.DELETE_RECORD}
                            id={`btn-eliminar-${id}`}
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleEliminar(pub)}
                            disabled={!id || eliminandoId === id}
                            title="Eliminar este registro"
                            className="w-full text-destructive hover:text-destructive sm:w-auto"
                          >
                            {eliminandoId === id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Eliminar
                          </GovernedButton>
                        </div>
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
              {editandoId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editandoId ? 'Editar publicidad' : 'Nueva publicidad'}
            </CardTitle>
            <CardDescription>
              {editandoId
                ? 'Estas modificando un registro existente. La imagen actual se conserva si no eliges otra.'
                : 'Completa los campos principales del mensaje.'}
            </CardDescription>
            {editandoId ? (
              <Button
                id="btn-cancelar-edicion"
                type="button"
                variant="ghost"
                size="sm"
                onClick={cancelarEdicion}
                className="mt-2 w-full"
              >
                <X className="h-4 w-4" />
                Cancelar edicion
              </Button>
            ) : null}
          </CardHeader>

          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Con diapositivas, cada una lleva su imagen: la galeria del registro sobra. */}
              {usaDiapositivas ? null : (
              <div className="space-y-2">
                <Label htmlFor="img">
                  Imagenes {editandoId ? '' : '*'} (maximo {MAX_IMAGENES_PUBLICIDAD})
                </Label>

                {editandoId && imagenesActuales.length ? (
                  <div className="space-y-2 rounded-md border border-border bg-muted/30 p-2">
                    <div className="flex flex-wrap gap-2">
                      {imagenesActuales.map((url, indice) => (
                        <img
                          key={url}
                          src={url}
                          alt={`Imagen ${indice + 1} del registro`}
                          className="h-16 w-16 rounded border border-border object-contain"
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {imagenesActuales.length === 1 ? 'Imagen actual.' : `${imagenesActuales.length} imagenes actuales.`}
                      {' '}Se conservan si no eliges otras.
                    </p>
                  </div>
                ) : null}

                {form.imgs.length ? (
                  <div className="flex flex-wrap gap-2">
                    {form.imgs.map((archivo, indice) => (
                      <span
                        key={`${archivo.name}-${indice}`}
                        className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs"
                      >
                        <span className="max-w-[10rem] truncate">{archivo.name}</span>
                        <button
                          type="button"
                          onClick={() => quitarImagenSeleccionada(indice)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={`Quitar ${archivo.name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}

                <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-4 py-5 text-center text-sm text-muted-foreground transition hover:border-primary/50">
                  <ImageUp className="h-5 w-5" />
                  <span>
                    {form.imgs.length
                      ? `${form.imgs.length} de ${MAX_IMAGENES_PUBLICIDAD} seleccionadas`
                      : editandoId
                        ? 'Seleccionar otras imagenes (opcional)'
                        : 'Seleccionar imagenes JPG o PNG'}
                  </span>
                  <Input
                    id="img"
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
                <p className="text-xs text-muted-foreground">
                  {form.presentacion === 'CARRUSEL'
                    ? 'En carrusel cada imagen es una diapositiva, con los mismos textos y boton.'
                    : 'La primera imagen es la principal del contenido.'}
                </p>
              </div>
              )}

              <div className="space-y-2">
                <Label>Seccion asociada (ruta de seguridad)</Label>
                <Select
                  value={form.seccionRutaId || NONE_VALUE}
                  onValueChange={(value) => selectSeccionRuta(value === NONE_VALUE ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Modal de inicio (sin ruta asociada)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <div className="p-2">
                      <Input
                        value={seccionRouteSearch}
                        onChange={(event) => setSeccionRouteSearch(event.target.value)}
                        onKeyDown={(event) => event.stopPropagation()}
                        placeholder="Buscar ruta por nombre..."
                        className="h-8"
                      />
                    </div>
                    <SelectItem value={NONE_VALUE}>Modal de inicio (sin ruta asociada)</SelectItem>
                    {filteredSeccionRoutes.map((route) => (
                      <SelectItem key={route.iud} value={route.iud}>
                        {route.name} - {route.path}
                      </SelectItem>
                    ))}
                    {securityRoutes.length > 0 && !filteredSeccionRoutes.length ? (
                      <SelectItem value="__no_seccion_route_match__" disabled>
                        No hay rutas con ese nombre
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {form.seccionRutaId
                    ? `El contenido alimentara la seccion "Nosotros" de la ruta ${form.seccionPath || 'seleccionada'}.`
                    : 'Sin ruta asociada: el contenido se mostrara en el modal publicitario de inicio.'}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Tipo de publicidad *</Label>
                <Select
                  value={form.presentacion}
                  onValueChange={(value) => {
                    setSuccess('');
                    setForm((prev) => ({ ...prev, presentacion: value }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {tiposPublicidad.map((tipo) => (
                      <SelectItem key={tipo.codigo} value={tipo.codigo}>
                        {tipo.nombre}
                      </SelectItem>
                    ))}
                    {!tiposPublicidad.length ? (
                      <SelectItem value="__sin_tipos__" disabled>
                        No hay tipos parametrizados
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {tiposPublicidad.find((tipo) => tipo.codigo === form.presentacion)?.descripcion
                    || 'Los tipos se administran en el catalogo de tipos de publicidad.'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="etiqueta">Etiqueta (identificador interno) *</Label>

                {!etiquetaNueva ? (
                  <div className="flex gap-2">
                  <Select
                    value={form.etiqueta || NONE_VALUE}
                    onValueChange={(value) => {
                      setSuccess('');
                      if (value === NUEVA_ETIQUETA_VALUE) {
                        setEtiquetaNueva(true);
                        setForm((prev) => ({ ...prev, etiqueta: '' }));
                        return;
                      }
                      setForm((prev) => ({ ...prev, etiqueta: value === NONE_VALUE ? '' : value }));
                    }}
                  >
                    <SelectTrigger id="etiqueta">
                      <SelectValue placeholder="Selecciona una etiqueta" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value={NUEVA_ETIQUETA_VALUE}>+ Crear etiqueta nueva</SelectItem>
                      {etiquetasExistentes.map((etiqueta) => (
                        <SelectItem key={etiqueta} value={etiqueta}>
                          {etiqueta}
                        </SelectItem>
                      ))}
                      {!etiquetasExistentes.length ? (
                        <SelectItem value={NONE_VALUE} disabled>
                          Aun no hay etiquetas registradas
                        </SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>

                  {form.etiqueta ? (
                    <Button
                      id="btn-renombrar-etiqueta"
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleRenombrarEtiqueta()}
                      disabled={renombrandoEtiqueta}
                      title="Renombrar esta etiqueta en todos los registros que la usan"
                    >
                      {renombrandoEtiqueta ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Pencil className="h-4 w-4" />
                      )}
                    </Button>
                  ) : null}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      id="etiqueta"
                      name="etiqueta"
                      value={form.etiqueta}
                      onChange={handleChange}
                      placeholder="Ej. Carrusel-home / Programa-de-Afiliados"
                      autoFocus
                    />
                    {etiquetasExistentes.length ? (
                      <Button
                        id="btn-usar-etiqueta-existente"
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEtiquetaNueva(false);
                          setForm((prev) => ({ ...prev, etiqueta: '' }));
                        }}
                        title="Elegir una etiqueta existente"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Identifica el registro en el listado y en la vista previa. Varios registros pueden
                  compartir etiqueta (por ejemplo, las diapositivas de un mismo carrusel).
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prioridad">Orden de aparicion</Label>
                <Input
                  id="prioridad"
                  name="prioridad"
                  type="number"
                  value={form.prioridad}
                  onChange={handleChange}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Cuando varios contenidos comparten ruta y tipo, el de mayor numero se muestra
                  primero. A igual numero manda el mas reciente.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tittle">Titulo *</Label>
                <RichTextInput
                  id="tittle"
                  value={form.tittle}
                  onChange={(html) => {
                    setSuccess('');
                    setForm((prev) => ({ ...prev, tittle: html }));
                  }}
                  placeholder="Ej. Oferta de temporada"
                  minHeight={72}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtittle">{form.seccionRutaId ? 'Texto del chip / badge *' : 'Subtitulo *'}</Label>
                <Input
                  id="subtittle"
                  name="subtittle"
                  value={form.subtittle}
                  onChange={handleChange}
                  placeholder={form.seccionRutaId ? 'Ej. Programa de Afiliados' : 'Mensaje corto para destacar'}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Descripcion *</Label>
                <RichTextInput
                  id="body"
                  value={form.body}
                  onChange={(html) => {
                    setSuccess('');
                    setForm((prev) => ({ ...prev, body: html }));
                  }}
                  placeholder="Detalle de la publicidad"
                  minHeight={130}
                />
              </div>

              {form.presentacion === 'CARRUSEL' ? (
                <div className="space-y-3 rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm">
                      Diapositivas ({form.diapositivas.length} de {MAX_DIAPOSITIVAS_PUBLICIDAD})
                    </Label>
                    <Button
                      id="btn-agregar-diapositiva"
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={agregarDiapositiva}
                      disabled={form.diapositivas.length >= MAX_DIAPOSITIVAS_PUBLICIDAD}
                    >
                      <Plus className="h-4 w-4" />
                      Agregar
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Cada diapositiva tiene su propio contenido e imagen. Si no agregas ninguna, el
                    carrusel usa los campos principales del registro.
                  </p>

                  {form.diapositivas.map((diapo, indice) => (
                    <div key={indice} className="space-y-2 rounded-md border border-border/70 bg-muted/20 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">
                          Diapositiva {indice + 1}
                        </span>
                        <Button
                          id={`btn-quitar-diapositiva-${indice}`}
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => quitarDiapositiva(indice)}
                          aria-label={`Quitar diapositiva ${indice + 1}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <Input
                        value={diapo.tittle}
                        onChange={(event) => actualizarDiapositiva(indice, { tittle: event.target.value })}
                        placeholder="Titulo"
                      />
                      <Input
                        value={diapo.subtittle}
                        onChange={(event) => actualizarDiapositiva(indice, { subtittle: event.target.value })}
                        placeholder="Chip / badge (ej. Top Ventas)"
                      />
                      <Textarea
                        value={diapo.body}
                        onChange={(event) => actualizarDiapositiva(indice, { body: event.target.value })}
                        placeholder="Texto de apoyo"
                        rows={2}
                      />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          value={diapo.price}
                          onChange={(event) => actualizarDiapositiva(indice, { price: event.target.value })}
                          placeholder="Descuento (ej. 30% OFF)"
                        />
                        <Input
                          value={diapo.buttonText}
                          onChange={(event) => actualizarDiapositiva(indice, { buttonText: event.target.value })}
                          placeholder="Texto del boton"
                        />
                      </div>

                      <Select
                        value={securityRoutes.find((route) => route.path === diapo.buttonLink)?.iud || NONE_VALUE}
                        onValueChange={(value) => {
                          const route = securityRoutes.find((item) => item.iud === value);
                          actualizarDiapositiva(indice, { buttonLink: route ? route.path : '' });
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Link del boton" /></SelectTrigger>
                        <SelectContent className="max-h-72">
                          <div className="p-2">
                            <Input
                              value={diapoRouteSearch}
                              onChange={(event) => setDiapoRouteSearch(event.target.value)}
                              onKeyDown={(event) => event.stopPropagation()}
                              placeholder="Buscar ruta por nombre..."
                              className="h-8"
                            />
                          </div>
                          <SelectItem value={NONE_VALUE}>Sin asignar</SelectItem>
                          {filteredDiapoRoutes.map((route) => (
                            <SelectItem key={route.iud} value={route.iud}>
                              {route.name} - {route.path}
                            </SelectItem>
                          ))}
                          {securityRoutes.length > 0 && !filteredDiapoRoutes.length ? (
                            <SelectItem value="__no_diapo_route_match__" disabled>
                              No hay rutas con ese nombre
                            </SelectItem>
                          ) : null}
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-2">
                        {diapo.imgUrl && !diapo.archivo ? (
                          <img
                            src={diapo.imgUrl}
                            alt={`Imagen de la diapositiva ${indice + 1}`}
                            className="h-12 w-12 rounded border border-border object-contain"
                          />
                        ) : null}
                        <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary/50">
                          <ImageUp className="h-4 w-4" />
                          {diapo.archivo ? diapo.archivo.name : diapo.imgUrl ? 'Cambiar imagen' : 'Imagen de la diapositiva'}
                          <Input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(event) => actualizarDiapositiva(indice, { archivo: event.target.files?.[0] || null })}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {form.seccionRutaId ? (
                <div className="space-y-2">
                  <Label htmlFor="puntosClave">Puntos clave (uno por linea)</Label>
                  <Textarea
                    id="puntosClave"
                    name="puntosClave"
                    value={form.puntosClave}
                    onChange={handleChange}
                    placeholder={'Maquillaje de alta calidad\nRealza tu belleza natural'}
                    rows={5}
                  />
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                {!form.seccionRutaId ? (
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
                ) : null}

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

              {/* Alta y edicion son operaciones distintas: cada una con su propio alcance. */}
              <GovernedButton
                actionId={editandoId ? PUBLICIDAD_ACTION_IDS.UPDATE_RECORD : PUBLICIDAD_ACTION_IDS.CREATE_RECORD}
                id={editandoId ? `btn-guardar-cambios-${editandoId}` : 'btn-agregar-publicidad'}
                type="submit"
                disabled={submitting}
                title={editandoId ? 'Guardar los cambios del registro' : 'Crear la publicidad'}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : editandoId ? (
                  <>
                    <Save className="h-4 w-4" />
                    Guardar cambios
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Agregar publicidad
                  </>
                )}
              </GovernedButton>
            </form>
          </CardContent>
        </Card>
      </div>

      <TiposPublicidadDialog
        open={tiposDialogAbierto}
        onOpenChange={setTiposDialogAbierto}
        onCatalogoActualizado={() => {
          void obtenerTiposPublicidad().then(setTiposPublicidad);
        }}
      />

      <PublicidadPreviewDialog
        open={Boolean(previewTarget)}
        onOpenChange={(abierto) => {
          if (!abierto) setPreviewTarget(null);
        }}
        target={previewTarget}
      />
    </section>
  );
}
