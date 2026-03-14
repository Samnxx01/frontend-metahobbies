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
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react';
import { getRouteCatalog, RouteCatalogItem } from '@/app/services/routeService';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  createRouteMenuTag,
  deleteRouteMenuTag,
  getRouteMenuTags,
  RouteMenuTag,
  updateRoute,
  updateRouteMenuTag,
} from '@/app/services/routesService';

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
  scopeMode: 'GENERAL' | 'GLOBAL_Y_SUPER' | 'GLOBAL_Y_CORPORATIVO' | 'SOLO_SUPER_ADMIN';
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
  scopeMode: 'GENERAL',
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
  const [routeCatalog, setRouteCatalog] = useState<RouteCatalogItem[]>([]);
  const [menuTags, setMenuTags] = useState<RouteMenuTag[]>([]);
  const [tagForm, setTagForm] = useState<MenuTagFormState>(EMPTY_TAG_FORM);

  const tenantScope = user?.auth?.tenantScope || {};
  const actorScope = {
    tenantSuperAdminId: String(user?.tenantSuperAdminId || tenantScope?.tenantSuperAdminId || '').trim() || null,
    tenantGlobalId: String(user?.tenantGlobalId || tenantScope?.tenantGlobalId || '').trim() || null,
    tenantCorporativoId: String(user?.tenantCorporativoId || tenantScope?.tenantCorporativoId || '').trim() || null,
  };

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

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const [catalog, menuTagsResponse] = await Promise.all([
        getRouteCatalog(),
        getRouteMenuTags({ menuTipo: 'USER_DROPDOWN' }),
      ]);

      setRouteCatalog(catalog);
      setMenuTags(Array.isArray(menuTagsResponse?.data) ? menuTagsResponse.data : []);

      const nextSlots = { ...slots };
      for (const slot of USER_MENU_SLOTS) {
        const route = catalog.find((r) => r.menuUsuarioKey === slot.key) ?? null;
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
        .filter((r) => r.mostrarEnNavbarPublico !== undefined)
        .map((r) => ({ route: r, enabled: r.mostrarEnNavbarPublico === true, saving: false }));
      setNavbarItems(nextNavbarItems);
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

  const resetTagForm = () => {
    setTagForm(EMPTY_TAG_FORM);
  };

  const populateTagForm = (tag: RouteMenuTag) => {
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
      scopeMode: (() => {
        const hasSuper = !!(tag.tenantSuperAdminId || tag.scope?.tenantSuperAdminId);
        const hasGlobal = !!(tag.tenantGlobalId || tag.scope?.tenantGlobalId);
        const hasCorp = !!(tag.tenantCorporativoId || tag.scope?.tenantCorporativoId);
        if (hasSuper && !hasGlobal && !hasCorp) return 'SOLO_SUPER_ADMIN';
        if (hasSuper && hasGlobal && !hasCorp) return 'GLOBAL_Y_SUPER';
        if (hasGlobal && hasCorp) return 'GLOBAL_Y_CORPORATIVO';
        return 'GENERAL';
      })(),
    });
  };

  const saveSlot = async (key: MenuKey) => {
    const slot = slots[key];
    if (!slot.route) return;

    setSlots((prev) => ({ ...prev, [key]: { ...prev[key], saving: true, saved: false } }));
    try {
      await updateRoute(slot.route.iud, {
        mostrarEnMenuUsuario: slot.enabled,
        menuUsuarioKey: slot.enabled ? key : null,
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
    setNavbarItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, enabled, saving: true } : it))
    );
    try {
      await updateRoute(item.route.iud, { mostrarEnNavbarPublico: enabled } as any);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo guardar el navbar publico.');
    } finally {
      setNavbarItems((prev) =>
        prev.map((it, i) => (i === index ? { ...it, enabled, saving: false } : it))
      );
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
      // Validaciones mínimas por alcance
      if (tagForm.scopeMode === 'SOLO_SUPER_ADMIN' && !actorScope.tenantSuperAdminId) {
        toast.error('El usuario actual no tiene tenantSuperAdmin en su scope.');
        setSavingTag(false);
        return;
      }
      if (tagForm.scopeMode === 'GLOBAL_Y_CORPORATIVO' && !actorScope.tenantGlobalId) {
        toast.error('El usuario actual no tiene tenantGlobal en su scope.');
        setSavingTag(false);
        return;
      }
      if (tagForm.scopeMode === 'GLOBAL_Y_CORPORATIVO' && !actorScope.tenantCorporativoId) {
        toast.error('El usuario actual no tiene tenantCorporativo en su scope.');
        setSavingTag(false);
        return;
      }
      if (tagForm.scopeMode === 'GLOBAL_Y_SUPER' && !actorScope.tenantSuperAdminId && !actorScope.tenantGlobalId) {
        toast.error('El usuario actual no tiene tenantSuperAdmin ni tenantGlobal en su scope.');
        setSavingTag(false);
        return;
      }

      // Construir el scope con lo que el actor tenga disponible
      const scopePayload = (() => {
        switch (tagForm.scopeMode) {
          case 'SOLO_SUPER_ADMIN':
            return { tenantSuperAdminId: actorScope.tenantSuperAdminId, tenantGlobalId: null, tenantCorporativoId: null };
          case 'GLOBAL_Y_SUPER':
            // Usa lo que el actor tenga: puede ser solo superAdmin, solo global, o ambos
            return { tenantSuperAdminId: actorScope.tenantSuperAdminId || null, tenantGlobalId: actorScope.tenantGlobalId || null, tenantCorporativoId: null };
          case 'GLOBAL_Y_CORPORATIVO':
            return { tenantSuperAdminId: null, tenantGlobalId: actorScope.tenantGlobalId, tenantCorporativoId: actorScope.tenantCorporativoId };
          default: // GENERAL
            return { tenantSuperAdminId: null, tenantGlobalId: null, tenantCorporativoId: null };
        }
      })();

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
        ...scopePayload,
      };

      if (tagForm.id) {
        const res = await updateRouteMenuTag(tagForm.id, payload);
        if (res?.success === false) throw new Error(res?.message || 'Error al actualizar el tag.');
        toast.success('Tag de menu actualizado.');
      } else {
        const res = await createRouteMenuTag(payload);
        if (res?.success === false) throw new Error(res?.message || 'Error al crear el tag.');
        toast.success('Tag de menu creado.');
      }

      resetTagForm();
      await loadCatalog();
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
      await loadCatalog();
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

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Aplicacion por alcance</Label>
                  <Select
                    value={tagForm.scopeMode}
                    onValueChange={(value) =>
                      setTagForm((prev) => ({ ...prev, scopeMode: value as MenuTagFormState['scopeMode'] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona alcance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GENERAL">General — todos los usuarios</SelectItem>
                      <SelectItem value="GLOBAL_Y_SUPER">Global + SuperAdmin</SelectItem>
                      <SelectItem value="GLOBAL_Y_CORPORATIVO">Global + Corporativo</SelectItem>
                      <SelectItem value="SOLO_SUPER_ADMIN">Solo SuperAdmin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-md border p-3 text-sm text-muted-foreground">
                  {tagForm.scopeMode === 'GENERAL' && 'Visible para todos los usuarios (fallback global).'}
                  {tagForm.scopeMode === 'GLOBAL_Y_SUPER' && 'Visible para tenantGlobal y tenantSuperAdmin. No corporativo.'}
                  {tagForm.scopeMode === 'GLOBAL_Y_CORPORATIVO' && 'Visible para tenantGlobal y tenantCorporativo. No superAdmin.'}
                  {tagForm.scopeMode === 'SOLO_SUPER_ADMIN' && 'Visible unicamente para el tenantSuperAdmin.'}
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
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Navbar publico</h2>
          </div>
          <p className="text-sm text-muted-foreground -mt-2">
            Rutas visibles en la barra de navegacion publica.
          </p>

          <Card>
            <CardContent className="pt-4 divide-y">
              {navbarItems.map((item, index) => (
                <div key={item.route.iud} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{item.route.name}</p>
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
    </div>
  );
}
