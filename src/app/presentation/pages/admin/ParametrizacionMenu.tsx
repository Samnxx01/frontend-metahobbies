import { useEffect, useState } from 'react';
import { ShieldCheck, Crown, User, Globe, LayoutDashboard, Save, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getRouteCatalog, RouteCatalogItem } from '@/app/services/routeService';
import { updateRoute } from '@/app/services/routesService';

// ── Tipos ────────────────────────────────────────────────────────────────────

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

// ── Config estática de slots ──────────────────────────────────────────────────

const USER_MENU_SLOTS: { key: MenuKey; title: string; description: string; Icon: React.ElementType }[] = [
  {
    key: 'PANEL_ADMIN',
    title: 'Panel Admin',
    description: 'Acceso al panel de administración',
    Icon: ShieldCheck,
  },
  {
    key: 'MI_MEMBRESIA',
    title: 'Mi Membresía',
    description: 'Acceso a la sección de membresía del usuario',
    Icon: Crown,
  },
  {
    key: 'MI_PERFIL',
    title: 'Mi Perfil',
    description: 'Acceso al perfil del usuario',
    Icon: User,
  },
];

// ── Componente ────────────────────────────────────────────────────────────────

export default function ParametrizacionMenu() {
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<Record<MenuKey, SlotState>>({
    PANEL_ADMIN: { route: null, enabled: false, label: '', order: 0, saving: false, saved: false },
    MI_MEMBRESIA: { route: null, enabled: false, label: '', order: 0, saving: false, saved: false },
    MI_PERFIL: { route: null, enabled: false, label: '', order: 0, saving: false, saved: false },
  });
  const [navbarItems, setNavbarItems] = useState<NavbarItemState[]>([]);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const catalog = await getRouteCatalog();

      // Poblar slots del menú de usuario
      const newSlots = { ...slots };
      for (const slot of USER_MENU_SLOTS) {
        const route = catalog.find((r) => r.menuUsuarioKey === slot.key) ?? null;
        newSlots[slot.key] = {
          route,
          enabled: route?.mostrarEnMenuUsuario === true,
          label: route?.menuUsuarioLabel ?? '',
          order: route?.menuUsuarioOrder ?? 0,
          saving: false,
          saved: false,
        };
      }
      setSlots(newSlots);

      // Poblar items del navbar público (rutas con mostrarEnNavbarPublico definido)
      const navItems = catalog
        .filter((r) => r.mostrarEnNavbarPublico !== undefined)
        .map((r) => ({ route: r, enabled: r.mostrarEnNavbarPublico === true, saving: false }));
      setNavbarItems(navItems);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCatalog(); }, []);

  // ── Guardar slot menú usuario ──────────────────────────────────────────────

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
      setTimeout(() => setSlots((prev) => ({ ...prev, [key]: { ...prev[key], saved: false } })), 2500);
    } catch {
      setSlots((prev) => ({ ...prev, [key]: { ...prev[key], saving: false } }));
    }
  };

  // ── Guardar item navbar público ────────────────────────────────────────────

  const saveNavbarItem = async (index: number, enabled: boolean) => {
    const item = navbarItems[index];
    setNavbarItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, enabled, saving: true } : it))
    );
    try {
      await updateRoute(item.route.iud, { mostrarEnNavbarPublico: enabled } as any);
    } finally {
      setNavbarItems((prev) =>
        prev.map((it, i) => (i === index ? { ...it, enabled, saving: false } : it))
      );
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Parametrización de Menús</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configura qué opciones aparecen en el menú de usuario y el navbar público.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadCatalog}>
          <RefreshCw className="h-4 w-4 mr-2" /> Recargar
        </Button>
      </div>

      {/* ── Sección: Menú de usuario ─────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Menú de usuario</h2>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          Estas opciones aparecen en el dropdown del avatar (esquina superior derecha).
        </p>

        <div className="grid gap-4 md:grid-cols-1">
          {USER_MENU_SLOTS.map(({ key, title, description, Icon }) => {
            const slot = slots[key];
            const hasRoute = slot.route !== null;

            return (
              <Card key={key} className={!hasRoute ? 'border-dashed opacity-70' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
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
                    <CardContent className="pt-4 grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`label-${key}`}>Label personalizado</Label>
                        <Input
                          id={`label-${key}`}
                          placeholder={`Ej: ${title}`}
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
                          placeholder="0"
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
                  <CardContent className={slot.enabled ? 'pt-0' : 'pt-0'}>
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
                        'Guardado ✓'
                      ) : (
                        <><Save className="h-4 w-4 mr-2" /> Guardar</>
                      )}
                    </Button>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Sección: Navbar público ──────────────────────────────────────── */}
      {navbarItems.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Navbar público</h2>
          </div>
          <p className="text-sm text-muted-foreground -mt-2">
            Rutas visibles en la barra de navegación pública (usuarios no autenticados).
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
