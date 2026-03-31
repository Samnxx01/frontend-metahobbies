import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, RefreshCw, Route, ListTree, UserCog } from 'lucide-react';
import {
  BrandingConfig,
  guardarBrandingPrivado,
  obtenerBrandingPrivado,
  type BrandingScopeParams,
} from '@/app/services/brandingWidget';
import { getRouteCatalog, type RouteCatalogItem } from '@/app/services/routeService';
import { useAuth } from '@/app/providers/AuthProvider';
import { getJerarquiaUsuarios, type TenantGlobalNode } from '@/app/services/tenantUsuariosService';

interface RedirectEntryState {
  path: string;
  enabled: boolean;
}

interface RedirectFormState {
  login: RedirectEntryState;
  postLogin: RedirectEntryState;
  logout: RedirectEntryState;
  register: RedirectEntryState;
  forgotPassword: RedirectEntryState;
  publicHome: RedirectEntryState;
  allowedPathsJson: string;
}

interface ParametrizacionRedirectsProps {
  compact?: boolean;
  embeddedInUsuariosTenant?: boolean;
}

interface ScopeOption {
  value: string;
  label: string;
}

const GLOBAL_SCOPE_VALUE = '__global__';

const DEFAULT_ALLOWED_PATHS = [
  '/public/render/login',
  '/public/render/view/login',
  '/admin/gestor-rutas/administracion/dashboardadmin',
  '/registro',
  '/recuperar-contrasena',
  '/public/render/home',
];

const DEFAULT_FORM: RedirectFormState = {
  login: { path: '/public/render/login', enabled: true },
  postLogin: { path: '/admin/gestor-rutas/administracion/dashboardadmin', enabled: true },
  logout: { path: '/public/render/login', enabled: true },
  register: { path: '/registro', enabled: true },
  forgotPassword: { path: '/recuperar-contrasena', enabled: true },
  publicHome: { path: '/public/render/home', enabled: true },
  allowedPathsJson: JSON.stringify(DEFAULT_ALLOWED_PATHS, null, 2),
};

const REDIRECT_FIELDS: Array<{
  key: keyof Omit<RedirectFormState, 'allowedPathsJson'>;
  label: string;
  description: string;
}> = [
  { key: 'login', label: 'Login', description: 'Destino base para autenticacion y sesiones expiradas.' },
  { key: 'postLogin', label: 'Post Login', description: 'Destino por defecto al entrar al modulo privado.' },
  { key: 'logout', label: 'Logout', description: 'Destino al cerrar sesion o perder autenticacion.' },
  { key: 'register', label: 'Registro', description: 'Destino usado por pantallas que envian al registro.' },
  { key: 'forgotPassword', label: 'Recuperar clave', description: 'Destino para flujos de recuperacion de contrasena.' },
  { key: 'publicHome', label: 'Home publica', description: 'Fallback seguro cuando una ruta privada no aplica.' },
];

const ROOT_RESTRICTED_FIELDS = new Set<keyof Omit<RedirectFormState, 'allowedPathsJson'>>([
  'login',
  'postLogin',
  'logout',
  'register',
  'forgotPassword',
  'publicHome',
]);

const parseAllowedPaths = (value: string): string[] => {
  const parsed = JSON.parse(value || '[]');
  if (!Array.isArray(parsed)) {
    throw new Error('La whitelist debe ser un arreglo JSON');
  }

  return parsed
    .map((item) => String(item || '').trim())
    .filter((item) => item.startsWith('/'));
};

const collectTenantGlobalOptions = (nodes: TenantGlobalNode[] = [], acc: ScopeOption[] = []): ScopeOption[] => {
  nodes.forEach((node) => {
    const tenant = node?.tenantGlobal;
    const id = String(tenant?.iud || '').trim();

    if (id) {
      const label = tenant?.razon_social || tenant?.titulo || `Tenant ${id.slice(0, 8)}`;
      acc.push({ value: id, label });
    }

    if (Array.isArray(node?.subTenantGlobales) && node.subTenantGlobales.length > 0) {
      collectTenantGlobalOptions(node.subTenantGlobales, acc);
    }
  });

  return acc;
};

export default function ParametrizacionRedirects({
  compact = false,
  embeddedInUsuariosTenant = false,
}: ParametrizacionRedirectsProps): React.ReactElement {
  const { user } = useAuth();
  const tenantScope = user?.auth?.tenantScope || {};
  const actorTenantSuperAdminId = String(user?.tenantSuperAdminId || tenantScope?.tenantSuperAdminId || '').trim();
  const isTenantSuperAdmin = Boolean(actorTenantSuperAdminId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  const [form, setForm] = useState<RedirectFormState>(DEFAULT_FORM);
  const [routeCatalog, setRouteCatalog] = useState<RouteCatalogItem[]>([]);
  const [scopeOptions, setScopeOptions] = useState<ScopeOption[]>([{ value: GLOBAL_SCOPE_VALUE, label: 'Global del sistema' }]);
  const [selectedScopeValue, setSelectedScopeValue] = useState<string>(GLOBAL_SCOPE_VALUE);
  const [guardarEnRegisUsu, setGuardarEnRegisUsu] = useState(false);

  const getBrandingScopeParams = (): BrandingScopeParams => ({
    tenantGlobalId: !guardarEnRegisUsu && selectedScopeValue !== GLOBAL_SCOPE_VALUE ? selectedScopeValue : undefined,
    guardarEnRegisUsu,
  });

  const hydrateForm = (brandingData: BrandingConfig | null): void => {
    const navigation = brandingData?.widgets?.navigation;
    const allowedPaths = Array.isArray(navigation?.allowedPaths) && navigation.allowedPaths.length > 0
      ? navigation.allowedPaths
      : DEFAULT_ALLOWED_PATHS;

    setForm({
      login: {
        path: String(navigation?.login?.path || DEFAULT_FORM.login.path),
        enabled: navigation?.login?.enabled !== false,
      },
      postLogin: {
        path: String(navigation?.postLogin?.path || DEFAULT_FORM.postLogin.path),
        enabled: navigation?.postLogin?.enabled !== false,
      },
      logout: {
        path: String(navigation?.logout?.path || DEFAULT_FORM.logout.path),
        enabled: navigation?.logout?.enabled !== false,
      },
      register: {
        path: String(navigation?.register?.path || DEFAULT_FORM.register.path),
        enabled: navigation?.register?.enabled !== false,
      },
      forgotPassword: {
        path: String(navigation?.forgotPassword?.path || DEFAULT_FORM.forgotPassword.path),
        enabled: navigation?.forgotPassword?.enabled !== false,
      },
      publicHome: {
        path: String(navigation?.publicHome?.path || DEFAULT_FORM.publicHome.path),
        enabled: navigation?.publicHome?.enabled !== false,
      },
      allowedPathsJson: JSON.stringify(allowedPaths, null, 2),
    });
  };

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true);
      const [brandingData, catalog, jerarquia] = await Promise.all([
        obtenerBrandingPrivado(getBrandingScopeParams()),
        getRouteCatalog(),
        isTenantSuperAdmin ? getJerarquiaUsuarios() : Promise.resolve(null),
      ]);

      const tenantOptions = collectTenantGlobalOptions(jerarquia?.tenantsGlobales || []);
      const uniqueOptions = Array.from(
        new Map(
          [{ value: GLOBAL_SCOPE_VALUE, label: 'Global del sistema' }, ...tenantOptions].map((option) => [option.value, option])
        ).values()
      );

      setScopeOptions(uniqueOptions);
      setBranding(brandingData || {});
      setRouteCatalog(Array.isArray(catalog) ? catalog : []);
      hydrateForm(brandingData || {});
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar la parametrizacion de redirects.');
    } finally {
      setLoading(false);
    }
  };

  const routePaths = Array.from(
    new Set(
      routeCatalog
        .map((route) => String(route.path || '').trim())
        .filter((path) => path.startsWith('/'))
    )
  ).sort((a, b) => a.localeCompare(b));

  const getPathOptions = (currentPath: string): string[] => {
    const normalizedCurrent = String(currentPath || '').trim();
    return Array.from(
      new Set([normalizedCurrent, ...routePaths].filter((path) => path.startsWith('/')))
    ).sort((a, b) => a.localeCompare(b));
  };

  const loadWhitelistFromSecurityRoutes = (): void => {
    setForm((prev) => ({
      ...prev,
      allowedPathsJson: JSON.stringify(routePaths, null, 2),
    }));
    toast.info('Se cargaron los paths de rutasSeguridad en la whitelist.');
  };

  useEffect(() => {
    void loadData();
  }, [selectedScopeValue, guardarEnRegisUsu]);

  const updateField = (
    key: keyof Omit<RedirectFormState, 'allowedPathsJson'>,
    patch: Partial<RedirectEntryState>
  ): void => {
    setForm((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...patch,
      },
    }));

    if (typeof patch.enabled === 'boolean') {
      toast.info(`${REDIRECT_FIELDS.find((field) => field.key === key)?.label || key} ${patch.enabled ? 'activado' : 'desactivado'}.`);
    }

    if (typeof patch.path === 'string' && patch.path.trim()) {
      toast.info(`Path seleccionado para ${REDIRECT_FIELDS.find((field) => field.key === key)?.label || key}.`);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!branding) return;

    try {
      setSaving(true);
      const allowedPaths = parseAllowedPaths(form.allowedPathsJson);

      const invalidRootField = REDIRECT_FIELDS.find((field) =>
        ROOT_RESTRICTED_FIELDS.has(field.key) && form[field.key].path.trim() === '/'
      );

      if (invalidRootField) {
        throw new Error(`La accion ${invalidRootField.label} no puede apuntar a "/". Usa una ruta especifica del modulo.`);
      }

      const payload: BrandingConfig & { guardarEnRegisUsu?: boolean } = {
        ...branding,
        widgets: {
          ...(branding.widgets || {}),
          navigation: {
            login: form.login,
            postLogin: form.postLogin,
            logout: form.logout,
            register: form.register,
            forgotPassword: form.forgotPassword,
            publicHome: form.publicHome,
            allowedPaths,
          },
        },
        guardarEnRegisUsu,
      };

      const saved = await guardarBrandingPrivado(payload, getBrandingScopeParams());
      setBranding(saved || payload);
      hydrateForm(saved || payload);
      toast.success('Redirects gobernados actualizados.');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la configuracion.');
    } finally {
      setSaving(false);
    }
  };

  if (!isTenantSuperAdmin) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Este panel solo esta disponible para tenantSuperAdmin.
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Cargando parametrizacion de redirects...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-border">
      <CardHeader className={compact ? 'pb-4' : undefined}>
        <div className="flex items-center gap-2">
          <Route className="h-5 w-5 text-primary" />
          <CardTitle>Redirects del modulo</CardTitle>
          <Badge variant="secondary">Gobernanza</Badge>
          {embeddedInUsuariosTenant && <Badge variant="outline">Usuarios Tenant</Badge>}
        </div>
        <CardDescription>
          Parametriza los `navigate` y `redirect` base del frontend solo desde tenantSuperAdmin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className={`grid gap-4 ${compact ? 'xl:grid-cols-2' : 'lg:grid-cols-2'}`}>
          <div className="rounded-lg border p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold">Scope de configuracion</p>
              <p className="text-xs text-muted-foreground">
                Elige si la configuracion se guarda global, por tenantGlobal o en tu regisUsu.
              </p>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-md bg-muted/40 p-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <UserCog className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">Guardar en regisUsu</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Si lo activas, esta parametrizacion queda asociada a tu usuario autenticado.
                </p>
              </div>
              <Switch
                checked={guardarEnRegisUsu}
                onCheckedChange={(checked) => {
                  setGuardarEnRegisUsu(checked);
                  toast.info(checked
                    ? 'Scope cambiado: la configuracion se guardara en regisUsu.'
                    : 'Scope cambiado: la configuracion vuelve al alcance global o tenantGlobal.');
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Scope tenantSuperAdmin</Label>
              <Select
                value={selectedScopeValue}
                onValueChange={(value) => {
                  setSelectedScopeValue(value);
                  const label = scopeOptions.find((option) => option.value === value)?.label || value;
                  toast.info(`Scope seleccionado: ${label}.`);
                }}
                disabled={guardarEnRegisUsu}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el scope a parametrizar" />
                </SelectTrigger>
                <SelectContent>
                  {scopeOptions.map((option) => (
                    <SelectItem key={`scope-${option.value}`} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {guardarEnRegisUsu
                  ? 'El selector se bloquea porque el scope activo es tu regisUsu.'
                  : 'Puedes dejarlo global o apuntarlo a un tenantGlobal visible desde tu jerarquia.'}
              </p>
            </div>
          </div>
        </div>

        <div className={`grid gap-4 ${compact ? 'xl:grid-cols-2' : 'lg:grid-cols-2'}`}>
          {REDIRECT_FIELDS.map((field) => (
            <div key={field.key} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">{field.label}</p>
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Activo</span>
                  <Switch
                    checked={form[field.key].enabled}
                    onCheckedChange={(checked) => updateField(field.key, { enabled: checked })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Path</Label>
                <Select
                  value={form[field.key].path}
                  onValueChange={(value) => updateField(field.key, { path: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un path de rutasSeguridad" />
                  </SelectTrigger>
                  <SelectContent>
                    {getPathOptions(form[field.key].path).map((path) => (
                      <SelectItem key={`${field.key}-${path}`} value={path}>
                        {path}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Label>Whitelist de rutas permitidas (JSON)</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadWhitelistFromSecurityRoutes}
              disabled={routePaths.length === 0}
            >
              <ListTree className="h-4 w-4 mr-2" />
              Cargar paths de rutasSeguridad
            </Button>
          </div>
          <Textarea
            rows={compact ? 6 : 8}
            value={form.allowedPathsJson}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, allowedPathsJson: e.target.value }));
              toast.info('Whitelist actualizada manualmente.');
            }}
          />
          <p className="text-xs text-muted-foreground">
            El helper solo aceptara rutas internas incluidas aqui. Si un destino sale de esta whitelist, se usa fallback seguro.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? 'Guardando...' : 'Guardar redirects'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              toast.info('Recargando configuracion de redirects...');
              void loadData();
            }}
            disabled={saving}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Recargar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
