import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'react-toastify';
import {
  Crown,
  Globe,
  Home,
  Landmark,
  LayoutDashboard,
  Lock,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { getRouteCatalog, RouteCatalogItem } from '@/app/services/routeService';
import { apiFetch } from '@/app/services/api';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  createRouteMenuTag,
  deleteRouteMenuTag,
  getRouteMenuTags,
  resolveCurrentRouteMenuTags,
  RouteMenuTag,
  updateRoute,
  updateRouteMenuTag,
} from '@/app/services/routesService';
import {
  getJerarquiaUsuarios,
  TenantGlobalInfo,
  TenantGlobalNode,
} from '@/app/services/tenantUsuariosService';

type MenuKey = 'PANEL_ADMIN' | 'MI_MEMBRESIA' | 'MI_PERFIL';

interface SlotState {
  route: RouteCatalogItem | null;
  enabled: boolean;
  label: string;
  order: number;
  saving: boolean;
  saved: boolean;
}

interface NavbarItemState {
  route: RouteCatalogItem;
  enabled: boolean;
  saving: boolean;
}

interface SidebarItemState {
  route: RouteCatalogItem;
  enabled: boolean;
  saving: boolean;
}

interface VisibilityModalState {
  open: boolean;
}

interface FormularioRutaOption {
  iud: string;
  name: string;
  path: string;
}

const mergeMenuTags = (...sources: Array<RouteMenuTag[] | undefined | null>): RouteMenuTag[] => {
  const byId = new Map<string, RouteMenuTag>();

  sources.forEach((rows) => {
    (Array.isArray(rows) ? rows : []).forEach((tag) => {
      const key = String(tag?.iud || tag?.codigo || '').trim();
      if (!key) return;
      byId.set(key, tag);
    });
  });

  return Array.from(byId.values()).sort(
    (a, b) => Number(a.order ?? 0) - Number(b.order ?? 0) || String(a.label || '').localeCompare(String(b.label || ''))
  );
};

interface MenuTagFormState {
  id: string | null;
  nombreTag: string;
  codigo: string;
  descripcion: string;
  rutaId: string;
  label: string;
  iconKey: string;
  order: string;
  estado: boolean;
  tagTenantSuperAdminId: string | null;
  tagTenantGlobalIds: string[];
  tagTenantCorporativoId: string | null;
  permitirSinTenant: boolean;
}

const USER_MENU_SLOTS: { key: MenuKey; title: string; description: string; Icon: React.ElementType }[] = [
  {
    key: 'PANEL_ADMIN',
    title: 'Panel Admin',
    description: 'Acceso legacy al panel de administracion.',
    Icon: ShieldCheck,
  },
  {
    key: 'MI_MEMBRESIA',
    title: 'Mi Membresia',
    description: 'Acceso legacy al dashboard de membresia.',
    Icon: Crown,
  },
  {
    key: 'MI_PERFIL',
    title: 'Mi Perfil',
    description: 'Acceso legacy al perfil del usuario.',
    Icon: User,
  },
];

const ICON_OPTIONS = [
  { value: 'USER', label: 'Usuario', Icon: User },
  { value: 'HOME', label: 'Inicio', Icon: Home },
  { value: 'CROWN', label: 'Membresia', Icon: Crown },
  { value: 'LAYOUT_DASHBOARD', label: 'Dashboard', Icon: LayoutDashboard },
  { value: 'SETTINGS', label: 'Configuracion', Icon: Settings },
  { value: 'LANDMARK', label: 'Banco', Icon: Landmark },
];

const EMPTY_TAG_FORM: MenuTagFormState = {
  id: null,
  nombreTag: '',
  codigo: '',
  descripcion: '',
  rutaId: '',
  label: '',
  iconKey: 'USER',
  order: '0',
  estado: true,
  tagTenantSuperAdminId: null,
  tagTenantGlobalIds: [],
  tagTenantCorporativoId: null,
  permitirSinTenant: false,
};

const normalizeCode = (value: string): string =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();

export default function ParametrizacionMenu() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingTag, setSavingTag] = useState(false);
  const [slots, setSlots] = useState<Record<MenuKey, SlotState>>({
    PANEL_ADMIN: { route: null, enabled: false, label: '', order: 0, saving: false, saved: false },
    MI_MEMBRESIA: { route: null, enabled: false, label: '', order: 0, saving: false, saved: false },
    MI_PERFIL: { route: null, enabled: false, label: '', order: 0, saving: false, saved: false },
  });
  const [navbarItems, setNavbarItems] = useState<NavbarItemState[]>([]);
  const [sidebarItems, setSidebarItems] = useState<SidebarItemState[]>([]);
  const [visibilityModal, setVisibilityModal] = useState<VisibilityModalState>({ open: false });
  const [selectedVisibilityRouteId, setSelectedVisibilityRouteId] = useState<string>('');
  const [formularioRoutes, setFormularioRoutes] = useState<FormularioRutaOption[]>([]);
  const [routeCatalog, setRouteCatalog] = useState<RouteCatalogItem[]>([]);
  const [menuTags, setMenuTags] = useState<RouteMenuTag[]>([]);
  const [savingAcciones, setSavingAcciones] = useState<Record<string, boolean>>({});
  const [tagForm, setTagForm] = useState<MenuTagFormState>(EMPTY_TAG_FORM);

  const [tenantsGlobales, setTenantsGlobales] = useState<TenantGlobalInfo[]>([]);
  const [jerarquiaGlobales, setJerarquiaGlobales] = useState<TenantGlobalNode[]>([]);

  const tenantScope = user?.auth?.tenantScope || {};
  const actorScope = {
    tenantSuperAdminId: String(user?.tenantSuperAdminId || tenantScope?.tenantSuperAdminId || '').trim() || null,
    tenantGlobalId: String(user?.tenantGlobalId || tenantScope?.tenantGlobalId || '').trim() || null,
    tenantCorporativoId: String(user?.tenantCorporativoId || tenantScope?.tenantCorporativoId || '').trim() || null,
  };

  // Roles con acceso total — DIOS y DESAROLLADOR pueden no tener tenantSuperAdminId
  // en el rol si son cuentas de sistema, pero igual tienen permisos de SuperAdmin

  // SA puro = tenantSuperAdminId presente SIN tenantGlobalId propio
  // TG lleva ambos (el tenantSuperAdminId del SA que lo gestiona + su propio tenantGlobalId)
  // DIOS/DESAROLLADOR: sin tenant ids pero son SA por nombre de rol

  // Carga la jerarquía de tenants para cualquier admin que gestione tags
  useEffect(() => {
    if (actorScope.tenantCorporativoId) return; // corporativo ya tiene sus IDs fijos
    getJerarquiaUsuarios()
      .then(res => {
        const nodos: TenantGlobalNode[] = res?.tenantsGlobales ?? [];
        setJerarquiaGlobales(nodos);
        const lista: TenantGlobalInfo[] = nodos
          .map((tg) => tg.tenantGlobal)
          .filter((tg): tg is TenantGlobalInfo => tg !== null);
        setTenantsGlobales(lista);
      })
      .catch(() => {/* silencioso */});
  }, []);
  const routeOptions = useMemo(
    () =>
      routeCatalog
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((route) => ({
          value: route.iud,
          label: `${route.name} - ${route.path}`,
        })),
    [routeCatalog]
  );

  // ── Datos para los 3 selectores de tenant ────────────────────────────────
  const allCorporativos = useMemo(() =>
    jerarquiaGlobales.flatMap(nodo =>
      (nodo.corporativos ?? []).map(c => ({
        iud: c.tenantCorporativo.iud,
        nombre: c.tenantCorporativo.razon_social ?? c.tenantCorporativo.titulo ?? c.tenantCorporativo.iud,
        parentGlobalId: nodo.tenantGlobal?.iud ?? null,
        parentGlobalNombre: nodo.tenantGlobal?.razon_social ?? nodo.tenantGlobal?.titulo ?? null,
      }))
    ),
    [jerarquiaGlobales]
  );

  const superAdminOptions = actorScope.tenantSuperAdminId
    ? [{ iud: actorScope.tenantSuperAdminId, nombre: 'Mi SuperAdmin' }]
    : [];

  const getAccessTypeCodes = (route: RouteCatalogItem): string[] =>
    Array.isArray((route as any)?.accessType)
      ? (route as any).accessType
          .map((item: any) => String(typeof item === 'string' ? item : item?.accessType || '').trim().toUpperCase())
          .filter(Boolean)
      : [];

  const isHybridPublicRoute = (route: RouteCatalogItem): boolean => {
    const codes = getAccessTypeCodes(route);
    return codes.includes('PUBLIC') && codes.includes('PRIVATE');
  };

  const isPublicRoute = (route: RouteCatalogItem): boolean => getAccessTypeCodes(route).includes('PUBLIC');

  const isPrivateRoute = (route: RouteCatalogItem): boolean => getAccessTypeCodes(route).includes('PRIVATE');

  const isFormularioRoute = (route: RouteCatalogItem): boolean => {
    const tipoCodigo = String(route.tipoNodoId?.codigo || route.tipoNodoId?.nombre || route.tipoNodo || '')
      .trim()
      .toUpperCase();

    return tipoCodigo === 'FORMULARIO' || route.formulariosConfig?.habilitado === true;
  };

  const rutasVisibilidadHibrida = useMemo(
    () => {
      const formularioIds = new Set(formularioRoutes.map((route) => route.iud));
      return routeCatalog
        .filter((route) => (formularioIds.size > 0 ? formularioIds.has(route.iud) : isFormularioRoute(route)))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    [routeCatalog, formularioRoutes]
  );

  const selectedVisibilityRoute =
    rutasVisibilidadHibrida.find((route) => route.iud === selectedVisibilityRouteId) || rutasVisibilidadHibrida[0] || null;

  // Rutas agrupadas por contexto de renderización
  const rutasNavbarPublico = useMemo(
    () =>
      routeCatalog.filter(
        (r) =>
          r.mostrarEnNavbarPublico === true &&
          isPublicRoute(r)
      ),
    [routeCatalog]
  );
  const rutasSidebar = useMemo(
    () =>
      routeCatalog.filter(
        (r) =>
          r.mostrarEnSidebar === true &&
          isPrivateRoute(r)
      ),
    [routeCatalog]
  );
  const rutasConConfig = useMemo(
    () => routeCatalog.filter((r) =>
      (r.accionesPublicas && r.accionesPublicas.length > 0) ||
      (r.accionesPrivadas && r.accionesPrivadas.length > 0) ||
      r.formulariosConfig?.habilitado === true
    ),
    [routeCatalog]
  );

  const derivedScope = (() => {
    const s = !!tagForm.tagTenantSuperAdminId;
    const g = tagForm.tagTenantGlobalIds.length > 0;
    const c = !!tagForm.tagTenantCorporativoId;
    const multi = tagForm.tagTenantGlobalIds.length > 1;
    if (!s && !g && !c) return { label: 'General', variant: 'secondary' as const, desc: 'Visible para todos los usuarios.' };
    if (s && !g && !c) return { label: 'Solo SuperAdmin', variant: 'outline' as const, desc: 'Solo para el SuperAdmin asignado.' };
    if (s && g && !c) return { label: 'Global + SuperAdmin', variant: 'outline' as const, desc: `Para ${multi ? 'varios Globals' : 'ese Global'} y SuperAdmin. No corporativos.` };
    if (!s && g && c) return { label: 'Global + Corporativo', variant: 'outline' as const, desc: 'Para ese corporativo y su global.' };
    if (!s && g && !c) return { label: multi ? 'Multi-Global' : 'Solo Global', variant: 'outline' as const, desc: multi ? `Aplica a ${tagForm.tagTenantGlobalIds.length} TenantGlobales.` : 'Solo para ese TenantGlobal.' };
    return { label: 'Personalizado', variant: 'outline' as const, desc: 'Combinacion de tenants.' };
  })();

  const corporativosFiltrados = tagForm.tagTenantGlobalIds.length > 0
    ? allCorporativos.filter(c => tagForm.tagTenantGlobalIds.includes(c.parentGlobalId ?? ''))
    : allCorporativos;

  const refreshMenuTags = async () => {
    try {
      const [listResponse, resolvedResponse] = await Promise.all([
        apiFetch(
          `${import.meta.env.VITE_API_BASE_URL ?? '/api'}/seguridad/rutas/menu-tags?menuTipo=USER_DROPDOWN&_t=${Date.now()}`,
          { method: 'GET', cache: 'no-store' as RequestCache }
        ),
        resolveCurrentRouteMenuTags({ menuTipo: 'USER_DROPDOWN' }).catch(() => null),
      ]);

      setMenuTags(
        mergeMenuTags(
          Array.isArray(listResponse?.data) ? listResponse.data : [],
          Array.isArray((resolvedResponse as any)?.data) ? (resolvedResponse as any).data : []
        )
      );
      window.dispatchEvent(new CustomEvent('user-menu-tags-updated'));
    } catch (error) {
      console.error('Error al refrescar tags:', error);
    }
  };

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const [catalog, menuTagsResponse, resolvedMenuTagsResponse, formulariosResponse] = await Promise.all([
        getRouteCatalog(),
        getRouteMenuTags({ menuTipo: 'USER_DROPDOWN', soloActivos: false }),
        resolveCurrentRouteMenuTags({ menuTipo: 'USER_DROPDOWN' }).catch(() => null),
        apiFetch(`${import.meta.env.VITE_API_BASE_URL ?? '/api'}/seguridad/rutas/formularios/opciones`, {
          method: 'GET',
        }).catch(() => null),
      ]);

      setRouteCatalog(catalog);
      setMenuTags(
        mergeMenuTags(
          Array.isArray(menuTagsResponse?.data) ? menuTagsResponse.data : [],
          Array.isArray((resolvedMenuTagsResponse as any)?.data) ? (resolvedMenuTagsResponse as any).data : []
        )
      );
      window.dispatchEvent(new CustomEvent('user-menu-tags-updated'));
      setFormularioRoutes(
        Array.isArray((formulariosResponse as any)?.data?.rutasAcciones)
          ? (formulariosResponse as any).data.rutasAcciones
              .map((route: any) => ({
                iud: String(route?.iud || '').trim(),
                name: String(route?.name || '').trim(),
                path: String(route?.path || '').trim(),
              }))
              .filter((route: FormularioRutaOption) => route.iud)
          : []
      );

      const nextSlots = { ...slots };
      for (const slot of USER_MENU_SLOTS) {
        const route = catalog.find((r) => r.tiquetaNavb === slot.key) ?? null;
        nextSlots[slot.key] = {
          route,
          enabled: route?.mostrarEnMenuUsuario === true,
          label: route?.menuUsuarioLabel ?? '',
          order: route?.menuUsuarioOrder ?? 0,
          saving: false,
          saved: false,
        };
      }
      setSlots(nextSlots);

      const nextNavbarItems = catalog
        .filter((r) => {
          if (!isPublicRoute(r)) return false;
          if (r.mostrarEnSidebar === true && !isHybridPublicRoute(r)) return false;
          return r.mostrarEnNavbarPublico !== undefined;
        })
        .map((r) => ({ route: r, enabled: r.mostrarEnNavbarPublico === true, saving: false }));
      setNavbarItems(nextNavbarItems);
      setSidebarItems(
        catalog
          .filter((r) => r.mostrarEnSidebar === true && isPrivateRoute(r))
          .map((route) => ({ route, enabled: route.mostrarEnSidebar === true, saving: false }))
      );
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar la parametrizacion del menu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    if (rutasVisibilidadHibrida.length === 0) {
      if (selectedVisibilityRouteId) setSelectedVisibilityRouteId('');
      return;
    }

    const exists = rutasVisibilidadHibrida.some((route) => route.iud === selectedVisibilityRouteId);
    if (!exists) {
      setSelectedVisibilityRouteId(rutasVisibilidadHibrida[0].iud);
    }
  }, [rutasVisibilidadHibrida, selectedVisibilityRouteId]);

  const resetTagForm = () => {
    setTagForm(EMPTY_TAG_FORM);
  };

  const populateTagForm = (tag: RouteMenuTag) => {
    const tSuperAdmin = tag.tenantSuperAdminId || tag.scope?.tenantSuperAdminId || null;
    const tCorp = tag.tenantCorporativoId || tag.scope?.tenantCorporativoId || null;
    // Prioridad: tenantGlobalIds array > scope.tenantGlobalIds > tenantGlobalId fallback
    const rawGlobalIds: string[] = Array.isArray((tag as any).tenantGlobalIds) && (tag as any).tenantGlobalIds.length > 0
      ? (tag as any).tenantGlobalIds
      : Array.isArray(tag.scope?.tenantGlobalIds) && (tag.scope as any).tenantGlobalIds.length > 0
        ? (tag.scope as any).tenantGlobalIds
        : (tag.tenantGlobalId || tag.scope?.tenantGlobalId)
          ? [tag.tenantGlobalId || tag.scope?.tenantGlobalId!]
          : [];
    setTagForm({
      id: tag.iud,
      nombreTag: tag.nombreTag || '',
      codigo: tag.codigo || '',
      descripcion: tag.descripcion || '',
      rutaId: tag.ruta?.iud || tag.rutaId || '',
      label: tag.label || '',
      iconKey: tag.iconKey || 'USER',
      order: String(tag.order ?? 0),
      estado: tag.estado !== false,
      tagTenantSuperAdminId: tSuperAdmin,
      tagTenantGlobalIds: rawGlobalIds.filter(Boolean) as string[],
      tagTenantCorporativoId: tCorp,
      permitirSinTenant: tag.permitirSinTenant === true,
    });
  };

  const saveSlot = async (key: MenuKey) => {
    const slot = slots[key];
    if (!slot.route) return;

    setSlots((prev) => ({ ...prev, [key]: { ...prev[key], saving: true, saved: false } }));
    try {
      await updateRoute(slot.route.iud, {
        mostrarEnMenuUsuario: slot.enabled,
        tiquetaNavb: slot.enabled ? key : null,
        menuUsuarioLabel: slot.enabled ? slot.label.trim() || null : null,
        menuUsuarioOrder: slot.enabled ? slot.order : 0,
      } as any);
      setSlots((prev) => ({ ...prev, [key]: { ...prev[key], saving: false, saved: true } }));
      setTimeout(() => {
        setSlots((prev) => ({ ...prev, [key]: { ...prev[key], saved: false } }));
      }, 2500);
    } catch (error) {
      console.error(error);
      setSlots((prev) => ({ ...prev, [key]: { ...prev[key], saving: false } }));
      toast.error('No se pudo guardar el slot legacy.');
    }
  };

  const saveNavbarItem = async (index: number, enabled: boolean) => {
    const item = navbarItems[index];
    if (!item) return;
    if (enabled && !isPublicRoute(item.route)) {
      toast.error('Para activar navbar publico la ruta debe tener access PUBLIC.');
      return;
    }
    if (enabled && item.route.mostrarEnSidebar === true && !isHybridPublicRoute(item.route)) {
      toast.error('Solo las rutas HYBRID pueden quedar activas a la vez en navbar publico y sidebar.');
      return;
    }
    setNavbarItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, enabled, saving: true } : it))
    );
    try {
      await updateRoute(item.route.iud, { mostrarEnNavbarPublico: enabled } as any);
      setRouteCatalog((prev) =>
        prev.map((route) =>
          route.iud === item.route.iud ? { ...route, mostrarEnNavbarPublico: enabled } : route
        )
      );
      setSidebarItems((prev) =>
        prev.map((itemState) =>
          itemState.route.iud === item.route.iud
            ? {
                ...itemState,
                route: { ...itemState.route, mostrarEnNavbarPublico: enabled },
              }
            : itemState
        )
      );
    } catch (error) {
      console.error(error);
      toast.error('No se pudo guardar el navbar publico.');
    } finally {
      setNavbarItems((prev) =>
        prev.map((it, i) => (i === index ? { ...it, enabled, saving: false } : it))
      );
    }
  };

  const saveSidebarItem = async (routeIud: string, enabled: boolean) => {
    const item = routeCatalog.find((route) => route.iud === routeIud);
    if (!item) return;
    if (enabled && !isPrivateRoute(item)) {
      toast.error('Para activar sidebar privado la ruta debe tener access PRIVATE.');
      return;
    }
    if (enabled && item.mostrarEnNavbarPublico === true && !isHybridPublicRoute(item)) {
      toast.error('Solo las rutas HYBRID pueden quedar activas a la vez en navbar publico y sidebar.');
      return;
    }

    setRouteCatalog((prev) =>
      prev.map((route) =>
        route.iud === routeIud ? { ...route, mostrarEnSidebar: enabled } : route
      )
    );

    try {
      await updateRoute(routeIud, { mostrarEnSidebar: enabled } as any);
      setSidebarItems((prev) => {
        const exists = prev.some((entry) => entry.route.iud === routeIud);
        if (enabled && !exists) {
          return [...prev, { route: { ...item, mostrarEnSidebar: true }, enabled: true, saving: false }];
        }
        return prev
          .map((entry) =>
            entry.route.iud === routeIud
              ? { ...entry, enabled, route: { ...entry.route, mostrarEnSidebar: enabled } }
              : entry
          )
          .filter((entry) => entry.enabled);
      });
    } catch (error) {
      console.error(error);
      setRouteCatalog((prev) =>
        prev.map((route) =>
          route.iud === routeIud ? { ...route, mostrarEnSidebar: item.mostrarEnSidebar === true } : route
        )
      );
      toast.error('No se pudo guardar el sidebar privado.');
    }
  };

  const removeAccion = async (
    routeIud: string,
    field: 'accionesPublicas' | 'accionesPrivadas',
    method: string
  ) => {
    const route = routeCatalog.find((r) => r.iud === routeIud);
    if (!route) return;
    const current: string[] = Array.isArray((route as any)[field]) ? [...(route as any)[field]] : [];
    const next = current.filter((m) => m !== method);
    setSavingAcciones((prev) => ({ ...prev, [`${routeIud}_${field}`]: true }));
    try {
      await updateRoute(routeIud, { [field]: next } as any);
      setRouteCatalog((prev) =>
        prev.map((r) => r.iud === routeIud ? { ...r, [field]: next } : r)
      );
    } catch (error) {
      console.error(error);
      toast.error('No se pudo eliminar la accion.');
    } finally {
      setSavingAcciones((prev) => ({ ...prev, [`${routeIud}_${field}`]: false }));
    }
  };

  const clearAcciones = async (
    routeIud: string,
    field: 'accionesPublicas' | 'accionesPrivadas'
  ) => {
    setSavingAcciones((prev) => ({ ...prev, [`${routeIud}_${field}`]: true }));
    try {
      await updateRoute(routeIud, { [field]: [] } as any);
      setRouteCatalog((prev) =>
        prev.map((r) => r.iud === routeIud ? { ...r, [field]: [] } : r)
      );
    } catch (error) {
      console.error(error);
      toast.error('No se pudo limpiar las acciones.');
    } finally {
      setSavingAcciones((prev) => ({ ...prev, [`${routeIud}_${field}`]: false }));
    }
  };

  const handleTagSubmit = async () => {
    if (!tagForm.nombreTag.trim()) {
      toast.error('Debes ingresar el nombre del tag.');
      return;
    }
    if (!tagForm.label.trim()) {
      toast.error('Debes ingresar el label visible.');
      return;
    }
    if (!tagForm.rutaId) {
      toast.error('Debes seleccionar una ruta.');
      return;
    }

    setSavingTag(true);
    try {
      const tenantSuperAdminId = tagForm.tagTenantSuperAdminId || null;
      const tenantGlobalIds = tagForm.tagTenantGlobalIds.filter(Boolean);
      const tenantCorporativoId = tagForm.tagTenantCorporativoId || null;

      // Validación: corporativo requiere al menos un global
      if (tenantCorporativoId && tenantGlobalIds.length === 0) {
        toast.error('Debes seleccionar al menos un TenantGlobal si asignas un Corporativo.');
        setSavingTag(false);
        return;
      }

      const payload = {
        nombreTag: tagForm.nombreTag.trim(),
        codigo: normalizeCode(tagForm.codigo || tagForm.nombreTag || tagForm.label),
        descripcion: tagForm.descripcion.trim() || null,
        menuTipo: 'USER_DROPDOWN',
        rutaId: tagForm.rutaId,
        label: tagForm.label.trim(),
        iconKey: tagForm.iconKey,
        order: Number(tagForm.order || 0),
        estado: tagForm.estado,
        tenantSuperAdminId,
        tenantGlobalIds,
        tenantCorporativoId,
        permitirSinTenant: tagForm.permitirSinTenant,
      };

      if (tagForm.id) {
        const res = await updateRouteMenuTag(tagForm.id, payload);
        if (res?.success === false) throw new Error(res?.message || 'Error al actualizar el tag.');
        // Actualizar el tag directamente en el estado local con los datos devueltos
        if (res?.data) {
          setMenuTags((prev) =>
            prev.map((t) => (t.iud === tagForm.id ? { ...t, ...res.data } : t))
          );
        }
        toast.success('Tag de menu actualizado.');
      } else {
        const res = await createRouteMenuTag(payload);
        if (res?.success === false) throw new Error(res?.message || 'Error al crear el tag.');
        toast.success('Tag de menu creado.');
      }

      resetTagForm();
      await refreshMenuTags();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'No se pudo guardar el tag de menu.');
    } finally {
      setSavingTag(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      const res = await deleteRouteMenuTag(tagId);
      if ((res as any)?.success === false) throw new Error((res as any)?.message || 'Error al eliminar.');
      toast.success('Tag eliminado.');
      if (tagForm.id === tagId) resetTagForm();
      await refreshMenuTags();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'No se pudo eliminar el tag.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Parametrizacion de navegacion</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Administra el menu del avatar y relaciona cada tag con una ruta principal por path.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadCatalog}>
          <RefreshCw className="h-4 w-4 mr-2" /> Recargar
        </Button>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Menu del avatar</h2>
          <Badge variant="secondary">Dinamico</Badge>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          Estos tags alimentan el dropdown del usuario autenticado, como Mi Perfil, Inicio o Membresia.
        </p>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>{tagForm.id ? 'Editar tag del menu' : 'Crear tag del menu'}</CardTitle>
              <CardDescription>
                El tag queda relacionado a una ruta del catalogo principal y usa su path real.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombreTag">Nombre interno</Label>
                  <Input
                    id="nombreTag"
                    value={tagForm.nombreTag}
                    onChange={(e) => setTagForm((prev) => ({ ...prev, nombreTag: e.target.value }))}
                    placeholder="Ej: Menu perfil"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigoTag">Codigo</Label>
                  <Input
                    id="codigoTag"
                    value={tagForm.codigo}
                    onChange={(e) => setTagForm((prev) => ({ ...prev, codigo: e.target.value }))}
                    placeholder="Ej: MI_PERFIL_ADMIN"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ruta relacionada</Label>
                  <Select
                    value={tagForm.rutaId}
                    onValueChange={(value) => setTagForm((prev) => ({ ...prev, rutaId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una ruta" />
                    </SelectTrigger>
                    <SelectContent>
                      {routeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="labelTag">Label visible</Label>
                  <Input
                    id="labelTag"
                    value={tagForm.label}
                    onChange={(e) => setTagForm((prev) => ({ ...prev, label: e.target.value }))}
                    placeholder="Ej: Mi Perfil"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Icono</Label>
                  <Select
                    value={tagForm.iconKey}
                    onValueChange={(value) => setTagForm((prev) => ({ ...prev, iconKey: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un icono" />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orderTag">Orden</Label>
                  <Input
                    id="orderTag"
                    type="number"
                    value={tagForm.order}
                    onChange={(e) => setTagForm((prev) => ({ ...prev, order: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Activo</Label>
                  <div className="h-10 px-3 border rounded-md flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Mostrar en menu</span>
                    <Switch
                      checked={tagForm.estado}
                      onCheckedChange={(checked) => setTagForm((prev) => ({ ...prev, estado: checked }))}
                    />
                  </div>
                </div>
              </div>

              {/* 3 selectores de tenant — el scope se deriva automáticamente */}
              <div className="space-y-3">
                <Label>Aplicacion por alcance</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* SuperAdmin */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">SuperAdmin</p>
                    <Select
                      value={tagForm.tagTenantSuperAdminId ?? '__none__'}
                      onValueChange={(v) => setTagForm(prev => ({ ...prev, tagTenantSuperAdminId: v === '__none__' ? null : v }))}
                      disabled={superAdminOptions.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sin asignar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Sin asignar —</SelectItem>
                        {superAdminOptions.map(opt => (
                          <SelectItem key={opt.iud} value={opt.iud}>{opt.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Global — multi-selección con checkboxes */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">TenantGlobal</p>
                    <div className="border rounded-md p-2 space-y-1 max-h-40 overflow-y-auto bg-background">
                      {actorScope.tenantGlobalId ? (
                        // TG propio: solo uno disponible
                        <label className="flex items-center gap-2 cursor-pointer text-sm py-0.5">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 accent-primary"
                            checked={tagForm.tagTenantGlobalIds.includes(actorScope.tenantGlobalId)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const id = actorScope.tenantGlobalId!;
                              setTagForm(prev => ({
                                ...prev,
                                tagTenantGlobalIds: checked
                                  ? [...prev.tagTenantGlobalIds.filter(x => x !== id), id]
                                  : prev.tagTenantGlobalIds.filter(x => x !== id),
                                tagTenantCorporativoId: checked ? prev.tagTenantCorporativoId : null,
                              }));
                            }}
                          />
                          {tenantsGlobales.find(t => t.iud === actorScope.tenantGlobalId)?.razon_social
                            ?? tenantsGlobales.find(t => t.iud === actorScope.tenantGlobalId)?.titulo
                            ?? 'Mi TenantGlobal'}
                        </label>
                      ) : tenantsGlobales.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-1">Sin tenants disponibles</p>
                      ) : (
                        tenantsGlobales.map(tg => (
                          <label key={tg.iud} className="flex items-center gap-2 cursor-pointer text-sm py-0.5">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 accent-primary"
                              checked={tagForm.tagTenantGlobalIds.includes(tg.iud)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setTagForm(prev => {
                                  const next = checked
                                    ? [...prev.tagTenantGlobalIds.filter(x => x !== tg.iud), tg.iud]
                                    : prev.tagTenantGlobalIds.filter(x => x !== tg.iud);
                                  return {
                                    ...prev,
                                    tagTenantGlobalIds: next,
                                    tagTenantCorporativoId: next.length === 0 ? null : prev.tagTenantCorporativoId,
                                  };
                                });
                              }}
                            />
                            {tg.razon_social ?? tg.titulo ?? tg.iud}
                          </label>
                        ))
                      )}
                    </div>
                    {tagForm.tagTenantGlobalIds.length > 0 && (
                      <p className="text-xs text-muted-foreground">{tagForm.tagTenantGlobalIds.length} seleccionado(s)</p>
                    )}
                  </div>

                  {/* Corporativo */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">TenantCorporativo</p>
                    <Select
                      value={tagForm.tagTenantCorporativoId ?? '__none__'}
                      onValueChange={(v) => setTagForm(prev => ({ ...prev, tagTenantCorporativoId: v === '__none__' ? null : v }))}
                      disabled={corporativosFiltrados.length === 0 && !actorScope.tenantCorporativoId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sin asignar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Sin asignar —</SelectItem>
                        {actorScope.tenantCorporativoId ? (
                          <SelectItem value={actorScope.tenantCorporativoId}>Mi Corporativo</SelectItem>
                        ) : corporativosFiltrados.map(c => (
                          <SelectItem key={c.iud} value={c.iud}>
                            {c.nombre}{tagForm.tagTenantGlobalIds.length === 0 && c.parentGlobalNombre ? ` (${c.parentGlobalNombre})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Scope derivado automáticamente */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Alcance resultante:</span>
                  <Badge variant={derivedScope.variant}>{derivedScope.label}</Badge>
                  <span className="text-xs text-muted-foreground">{derivedScope.desc}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcionTag">Descripcion</Label>
                <Input
                  id="descripcionTag"
                  value={tagForm.descripcion}
                  onChange={(e) => setTagForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Que hace este item dentro del menu"
                />
              </div>

              <div className="space-y-3">
                <Label>Acceso adicional</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="permitirSinTenant"
                    className="h-4 w-4 rounded border-gray-300 accent-primary"
                    checked={tagForm.permitirSinTenant}
                    onChange={(e) => setTagForm((prev) => ({ ...prev, permitirSinTenant: e.target.checked }))}
                  />
                  <Label htmlFor="permitirSinTenant" className="text-sm">
                    Permitir acceso sin tenant
                  </Label>
                </div>
                {tagForm.permitirSinTenant && (
                  <p className="text-xs text-muted-foreground pl-6">
                    Este tag será visible para usuarios que aún no tienen ningún tenant asignado.
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button onClick={handleTagSubmit} disabled={savingTag}>
                  {savingTag ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...
                    </>
                  ) : tagForm.id ? (
                    <>
                      <Save className="h-4 w-4 mr-2" /> Actualizar tag
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" /> Crear tag
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={resetTagForm}>
                  Limpiar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tags configurados</CardTitle>
              <CardDescription>
                Se listan en el orden que tendra el dropdown del avatar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {menuTags.length === 0 && (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  Aun no hay tags configurados para este menu.
                </div>
              )}

              {menuTags.map((tag) => (
                <div key={tag.iud} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{tag.label}</p>
                        <Badge variant={tag.estado ? 'default' : 'secondary'}>
                          {tag.estado ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{tag.nombreTag} - {tag.codigo}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="icon" onClick={() => populateTagForm(tag)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" size="icon" onClick={() => handleDeleteTag(tag.iud)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Separator />
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">Ruta:</span> {tag.routeName}</p>
                    <p className="font-mono text-xs text-muted-foreground break-all">{tag.routePath}</p>
                    <p><span className="font-medium">Icono:</span> {tag.iconKey}</p>
                    <p><span className="font-medium">Orden:</span> {tag.order}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {(() => {
                        const hasSuper = !!(tag.scope?.tenantSuperAdminId);
                        const hasGlobal = !!(tag.scope?.tenantGlobalId);
                        const hasCorp = !!(tag.scope?.tenantCorporativoId);
                        if (!hasSuper && !hasGlobal && !hasCorp) return <Badge variant="secondary">General</Badge>;
                        if (hasSuper && !hasGlobal && !hasCorp) return <Badge variant="outline">Solo SuperAdmin</Badge>;
                        if (hasSuper && hasGlobal && !hasCorp) return <Badge variant="outline">Global + SuperAdmin</Badge>;
                        if (hasGlobal && hasCorp) return <Badge variant="outline">Global + Corporativo</Badge>;
                        if (hasGlobal) return <Badge variant="outline">Solo Global</Badge>;
                        return null;
                      })()}
                      {tag.permitirSinTenant && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">
                          Sin tenant
                        </Badge>
                      )}
                    </div>
                    {tag.descripcion && (
                      <p className="text-muted-foreground">{tag.descripcion}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Slots legacy del menu de usuario</h2>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          Compatibilidad con la configuracion previa basada en una sola ruta por slot fijo.
        </p>

        <div className="grid gap-4">
          {USER_MENU_SLOTS.map(({ key, title, description, Icon }) => {
            const slot = slots[key];
            const hasRoute = slot.route !== null;

            return (
              <Card key={key} className={!hasRoute ? 'border-dashed opacity-70' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{title}</CardTitle>
                        <CardDescription className="text-xs">{description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {hasRoute ? (
                        <Badge variant="outline" className="text-xs font-mono">
                          {slot.route!.path}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Sin ruta asignada</Badge>
                      )}
                      <Switch
                        checked={slot.enabled}
                        disabled={!hasRoute}
                        onCheckedChange={(checked) =>
                          setSlots((prev) => ({ ...prev, [key]: { ...prev[key], enabled: checked } }))
                        }
                      />
                    </div>
                  </div>
                </CardHeader>

                {hasRoute && slot.enabled && (
                  <>
                    <Separator />
                    <CardContent className="pt-4 grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`label-${key}`}>Label personalizado</Label>
                        <Input
                          id={`label-${key}`}
                          value={slot.label}
                          onChange={(e) =>
                            setSlots((prev) => ({ ...prev, [key]: { ...prev[key], label: e.target.value } }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`order-${key}`}>Orden</Label>
                        <Input
                          id={`order-${key}`}
                          type="number"
                          value={slot.order}
                          onChange={(e) =>
                            setSlots((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], order: Number(e.target.value || 0) },
                            }))
                          }
                        />
                      </div>
                    </CardContent>
                  </>
                )}

                {hasRoute && (
                  <CardContent className="pt-0">
                    <Button
                      size="sm"
                      onClick={() => saveSlot(key)}
                      disabled={slot.saving}
                      variant={slot.saved ? 'outline' : 'default'}
                      className="w-full"
                    >
                      {slot.saving ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</>
                      ) : slot.saved ? (
                        'Guardado ok'
                      ) : (
                        <><Save className="h-4 w-4 mr-2" /> Guardar slot</>
                      )}
                    </Button>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {navbarItems.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Navbar publico</h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => setVisibilityModal({ open: true })}>
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Configurar estados
            </Button>
          </div>
          <p className="text-sm text-muted-foreground -mt-2">
            Esta configuracion se administra en privado desde aqui, pero el render del navbar se resuelve desde la API publica de rutas.
          </p>

          <Card>
            <CardContent className="pt-4 divide-y">
              {navbarItems.map((item, index) => (
                <div key={item.route.iud} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{item.route.name}</p>
                        {isHybridPublicRoute(item.route) && <Badge variant="outline">HYBRID</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{item.route.path}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                    <Switch
                      checked={item.enabled}
                      disabled={item.saving}
                      onCheckedChange={(checked) => saveNavbarItem(index, checked)}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {rutasSidebar.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Sidebar privado</h2>
          </div>
          <p className="text-sm text-muted-foreground -mt-2">
            Desde aqui controlas la visibilidad privada. Si una ruta tambien aparece en el navbar publico, debe ser HYBRID.
          </p>

          <Card>
            <CardContent className="pt-4 divide-y">
              {rutasSidebar.map((route) => (
                <div key={route.iud} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{route.name}</p>
                        {isHybridPublicRoute(route) && <Badge variant="outline">HYBRID</Badge>}
                        {route.mostrarEnNavbarPublico === true && (
                          <Badge variant="secondary">Navbar publico</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{route.path}</p>
                    </div>
                  </div>
                  <Switch
                    checked={route.mostrarEnSidebar === true}
                    onCheckedChange={(checked) => saveSidebarItem(route.iud, checked)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      <Dialog open={visibilityModal.open} onOpenChange={(open) => setVisibilityModal({ open })}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Estados de navbar publico y sidebar privado</DialogTitle>
            <DialogDescription>
              Desde este modal puedes activar rutas publicas en el navbar y, si la ruta es HYBRID, tambien dejar activa su visibilidad privada en sidebar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {rutasVisibilidadHibrida.length === 0 && (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No hay rutas de tipo FORMULARIO disponibles para configurar desde este modal.
              </div>
            )}

            {rutasVisibilidadHibrida.length > 0 && (
              <Card>
                <CardContent className="pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Ruta seguridad tipo formulario</Label>
                    <Select value={selectedVisibilityRoute?.iud || ''} onValueChange={setSelectedVisibilityRouteId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una ruta formulario" />
                      </SelectTrigger>
                      <SelectContent>
                        {rutasVisibilidadHibrida.map((route) => (
                          <SelectItem key={route.iud} value={route.iud}>
                            {route.name} - {route.path}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedVisibilityRoute && (
                    <>
                      <div className="rounded-lg border px-4 py-3 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{selectedVisibilityRoute.name}</p>
                          {isHybridPublicRoute(selectedVisibilityRoute) && <Badge variant="outline">HYBRID</Badge>}
                          {isPublicRoute(selectedVisibilityRoute) && !isHybridPublicRoute(selectedVisibilityRoute) && (
                            <Badge variant="secondary">PUBLIC</Badge>
                          )}
                          {selectedVisibilityRoute.mostrarEnNavbarPublico === true && (
                            <Badge variant="secondary">Navbar activo</Badge>
                          )}
                          {selectedVisibilityRoute.mostrarEnSidebar === true && (
                            <Badge variant="secondary">Sidebar activo</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono break-all">
                          {selectedVisibilityRoute.path}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Access actual: {getAccessTypeCodes(selectedVisibilityRoute).join(' + ') || 'Sin accessType'}
                        </p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between rounded-lg border px-3 py-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Navbar publico</p>
                            <p className="text-xs text-muted-foreground">
                              Activa la ruta en el retorno de la API publica.
                            </p>
                          </div>
                          <Switch
                            checked={selectedVisibilityRoute.mostrarEnNavbarPublico === true}
                            onCheckedChange={(checked) => {
                              const index = navbarItems.findIndex((item) => item.route.iud === selectedVisibilityRoute.iud);
                              if (index >= 0) {
                                void saveNavbarItem(index, checked);
                              } else if (checked) {
                                toast.error('Esta ruta no puede activarse en navbar publico con el catalogo actual.');
                              }
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between rounded-lg border px-3 py-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Sidebar privado</p>
                            <p className="text-xs text-muted-foreground">
                              Si ambos estados quedan activos, la ruta debe ser HYBRID.
                            </p>
                          </div>
                          <Switch
                            checked={selectedVisibilityRoute.mostrarEnSidebar === true}
                            onCheckedChange={(checked) => void saveSidebarItem(selectedVisibilityRoute.iud, checked)}
                          />
                        </div>
                      </div>

                      {!isHybridPublicRoute(selectedVisibilityRoute) && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                          Esta ruta no es HYBRID. Puedes activar solo uno de los dos estados al tiempo.
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

