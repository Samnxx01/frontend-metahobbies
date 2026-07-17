import { useEffect, useState } from 'react';
import { adminEntityId } from '@/app/utils/adminEntityId';
import { toast } from 'react-toastify';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, RefreshCw, Route, Link2 } from 'lucide-react';
import {
  BrandingConfig,
  guardarBrandingPrivadoConRespuesta,
  obtenerBrandingPrivado,
  type BrandingScopeParams,
} from '@/app/services/brandingWidget';
import { getRouteCatalog, type RouteCatalogItem } from '@/app/services/routeService';
import { useAuth } from '@/app/providers/AuthProvider';
import { getJerarquiaUsuarios, type TenantGlobalNode } from '@/app/services/tenantUsuariosService';

interface RedirectEntryState {
  path: string;
  enabled: boolean;
  rutaSeguridadId?: string | null;
}

interface RedirectFormState {
  login: RedirectEntryState;
  postLogin: RedirectEntryState;
  logout: RedirectEntryState;
  register: RedirectEntryState;
  forgotPassword: RedirectEntryState;
  publicHome: RedirectEntryState;
  reglasContablesCompleta: RedirectEntryState;
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

// Estado vacío — los paths se cargan exclusivamente desde branding (backend) o se seleccionan del catálogo
const EMPTY_FORM: RedirectFormState = {
  login: { path: '', enabled: true },
  postLogin: { path: '', enabled: true },
  logout: { path: '', enabled: true },
  register: { path: '', enabled: true },
  forgotPassword: { path: '', enabled: true },
  publicHome: { path: '', enabled: true },
  reglasContablesCompleta: { path: '', enabled: true },
  allowedPathsJson: '[]',
};

const REDIRECT_FIELDS: Array<{
  key: keyof Omit<RedirectFormState, 'allowedPathsJson'>;
  label: string;
  description: string;
}> = [
  { key: 'login',          label: 'Login',           description: 'Destino base para autenticacion y sesiones expiradas.' },
  { key: 'postLogin',      label: 'Post Login',       description: 'Destino por defecto al entrar al modulo privado.' },
  { key: 'logout',         label: 'Logout',           description: 'Destino al cerrar sesion o perder autenticacion.' },
  { key: 'register',       label: 'Registro',         description: 'Destino usado por pantallas que envian al registro.' },
  { key: 'forgotPassword', label: 'Recuperar clave',  description: 'Destino para flujos de recuperacion de contrasena.' },
  { key: 'publicHome',     label: 'Home publica',     description: 'Fallback seguro cuando una ruta privada no aplica.' },
  { key: 'reglasContablesCompleta', label: 'Reglas contables (completa)', description: 'Destino del boton «Parametrizacion completa» del modal de reglas contables en Inventario.' },
];

const parseAllowedPaths = (value: string): string[] => {
  const parsed = JSON.parse(value || '[]');
  if (!Array.isArray(parsed)) {
    throw new Error('La whitelist debe ser un arreglo JSON');
  }
  return parsed
    .map((item) => String(item || '').trim())
    .filter((item) => item.startsWith('/'));
};

const getRedirectRouteId = (entry?: { rutaSeguridadId?: string | null }): string | null =>
  String(entry?.rutaSeguridadId || '').trim() || null;

const collectTenantGlobalOptions = (nodes: TenantGlobalNode[] = [], acc: ScopeOption[] = []): ScopeOption[] => {
  nodes.forEach((node) => {
    const tenant = node?.tenantGlobal;
    const id = adminEntityId(tenant);
    if (id) {
      acc.push({ value: id, label: tenant?.razon_social || tenant?.titulo || `Tenant ${id.slice(0, 8)}` });
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
  const [form, setForm] = useState<RedirectFormState>(EMPTY_FORM);
  const [routeCatalog, setRouteCatalog] = useState<RouteCatalogItem[]>([]);
  const [scopeOptions, setScopeOptions] = useState<ScopeOption[]>([{ value: GLOBAL_SCOPE_VALUE, label: 'Global del sistema' }]);
  const [selectedScopeValue, setSelectedScopeValue] = useState<string>(GLOBAL_SCOPE_VALUE);

  const getBrandingScopeParams = (): BrandingScopeParams => ({
    tenantGlobalId: selectedScopeValue !== GLOBAL_SCOPE_VALUE
      ? adminEntityId(selectedScopeValue)
      : undefined,
  });

  // Hidrata el form desde la config guardada en backend — sin fallbacks hardcodeados
  const hydrateForm = (brandingData: BrandingConfig | null): void => {
    const navigation = brandingData?.widgets?.navigation;
    const allowedPaths = Array.isArray(navigation?.allowedPaths) ? navigation.allowedPaths : [];

    setForm({
      login:          { path: String(navigation?.login?.path          || ''), enabled: navigation?.login?.enabled          !== false, rutaSeguridadId: getRedirectRouteId(navigation?.login) },
      postLogin:      { path: String(navigation?.postLogin?.path      || ''), enabled: navigation?.postLogin?.enabled      !== false, rutaSeguridadId: getRedirectRouteId(navigation?.postLogin) },
      logout:         { path: String(navigation?.logout?.path         || ''), enabled: navigation?.logout?.enabled         !== false, rutaSeguridadId: getRedirectRouteId(navigation?.logout) },
      register:       { path: String(navigation?.register?.path       || ''), enabled: navigation?.register?.enabled       !== false, rutaSeguridadId: getRedirectRouteId(navigation?.register) },
      forgotPassword: { path: String(navigation?.forgotPassword?.path || ''), enabled: navigation?.forgotPassword?.enabled !== false, rutaSeguridadId: getRedirectRouteId(navigation?.forgotPassword) },
      publicHome:     { path: String(navigation?.publicHome?.path     || ''), enabled: navigation?.publicHome?.enabled     !== false, rutaSeguridadId: getRedirectRouteId(navigation?.publicHome) },
      reglasContablesCompleta: { path: String(navigation?.reglasContablesCompleta?.path || ''), enabled: navigation?.reglasContablesCompleta?.enabled !== false, rutaSeguridadId: getRedirectRouteId(navigation?.reglasContablesCompleta) },
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
          [{ value: GLOBAL_SCOPE_VALUE, label: 'Global del sistema' }, ...tenantOptions].map((o) => [o.value, o])
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

  useEffect(() => {
    void loadData();
  }, [selectedScopeValue]);

  // Paths únicos del catálogo de rutasSeguridad — la fuente dinámica de verdad
  const routePaths = Array.from(
    new Set(
      routeCatalog
        .map((route) => String(route.path || '').trim())
        .filter((path) => path.startsWith('/'))
    )
  ).sort((a, b) => a.localeCompare(b));

  const resolveRutaSeguridadIdByPath = (path: string): string | null => {
    const normalizedPath = String(path || '').trim();
    if (!normalizedPath) return null;
    const route = routeCatalog.find((row) => String(row.path || '').trim() === normalizedPath);
    return route?.iud ? String(route.iud) : null;
  };

  // Incluye el path actual del campo (si existe) para que el Select lo muestre aunque no esté en el catálogo
  const getPathOptions = (currentPath: string): string[] => {
    const current = String(currentPath || '').trim();
    const base = current.startsWith('/') ? [current] : [];
    return Array.from(new Set([...base, ...routePaths])).sort((a, b) => a.localeCompare(b));
  };

  // Fusiona los paths actualmente configurados en los 6 campos de redirect con la whitelist existente.
  // Elimina el drift entre lo que está configurado y lo que está permitido.
  const buildAllowedPathsForSave = (formData: RedirectFormState = form): string[] => {
    const configuredPaths = REDIRECT_FIELDS
      .map((field) => String(formData[field.key].path || '').trim())
      .filter((path) => path.startsWith('/') && path !== '/');

    const existingPaths: string[] = (() => {
      try { return parseAllowedPaths(formData.allowedPathsJson); } catch { return []; }
    })();

    return Array.from(new Set([...existingPaths, ...configuredPaths])).sort((a, b) => a.localeCompare(b));
  };

  const updateField = (
    key: keyof Omit<RedirectFormState, 'allowedPathsJson'>,
    patch: Partial<RedirectEntryState>
  ): void => {
    setForm((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    if (typeof patch.enabled === 'boolean') {
      const label = REDIRECT_FIELDS.find((f) => f.key === key)?.label || key;
      toast.info(`${label} ${patch.enabled ? 'activado' : 'desactivado'}.`);
    }
  };

  const handleSave = async (formData: RedirectFormState = form): Promise<void> => {
    if (!branding) return;

    try {
      setSaving(true);
      const allowedPaths = buildAllowedPathsForSave(formData);

      // Ningún redirect puede apuntar a "/" (raíz), ya que rompe el flujo de navegación
      const invalidField = REDIRECT_FIELDS.find((field) => formData[field.key].path.trim() === '/');
      if (invalidField) {
        throw new Error(`La accion ${invalidField.label} no puede apuntar a "/". Usa una ruta especifica del modulo.`);
      }

      const payload: BrandingConfig = {
        ...branding,
        widgets: {
          ...(branding.widgets || {}),
          navigation: {
            login:          formData.login,
            postLogin:      formData.postLogin,
            logout:         formData.logout,
            register:       formData.register,
            forgotPassword: formData.forgotPassword,
            publicHome:     formData.publicHome,
            reglasContablesCompleta: formData.reglasContablesCompleta,
            etiqueta: 'navegacion',
            allowedPaths,
          },
        },
      };

      const result = await guardarBrandingPrivadoConRespuesta(payload, getBrandingScopeParams());
      if (!result.branding) {
        throw new Error('El backend no retorno la configuracion guardada.');
      }

      setBranding(result.branding);
      hydrateForm(result.branding);
      const txEstado = String(result.transaccion?.estado || 'commit').toUpperCase();
      const txSession = result.transaccion?.conSession ? 'con session' : 'sin session reportada';
      toast.success(`${result.msg || 'Redirects gobernados actualizados.'} Transaccion ${txEstado} (${txSession}).`);
    } catch (error) {
      console.error(error);
      toast.error(`Transaccion fallida: ${error instanceof Error ? error.message : 'No se pudo guardar la configuracion.'}`);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Re-vincula cada redirect guardado con su rutaSeguridadId vigente (documentos legacy
   * guardados antes de la normalización, o rutas recreadas con nuevo id). Valida contra
   * el catálogo activo y persiste; el backend re-valida existencia en la transacción.
   */
  const handleSincronizarIds = async (): Promise<void> => {
    const faltantes: string[] = [];
    let vinculados = 0;
    const synced: RedirectFormState = { ...form };

    REDIRECT_FIELDS.forEach((field) => {
      const entry = form[field.key];
      const path = String(entry.path || '').trim();
      if (!path) return;

      const rutaId = resolveRutaSeguridadIdByPath(path);
      if (!rutaId) {
        faltantes.push(`${field.label} (${path})`);
        return;
      }
      if (entry.rutaSeguridadId !== rutaId) vinculados += 1;
      synced[field.key] = { ...entry, rutaSeguridadId: rutaId };
    });

    if (faltantes.length > 0) {
      toast.error(`Sin rutaSeguridad activa para: ${faltantes.join(', ')}. Corrige esos paths antes de sincronizar.`);
      return;
    }

    setForm(synced);
    toast.info(`${vinculados} redirect(s) re-vinculados al id de rutasSeguridad. Guardando...`);
    await handleSave(synced);
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
                Elige si la configuracion se guarda global o para un tenantGlobal visible desde tu jerarquia.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Scope tenantSuperAdmin</Label>
              <Select
                value={selectedScopeValue}
                onValueChange={(value) => {
                  setSelectedScopeValue(value);
                  const label = scopeOptions.find((o) => o.value === value)?.label || value;
                  toast.info(`Scope seleccionado: ${label}.`);
                }}
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
                Puedes dejarlo global o apuntarlo a un tenantGlobal visible desde tu jerarquia. Al seleccionar uno, editas los redirects que aplican a ese tenant y su contexto corporativo.
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
                  value={form[field.key].path || undefined}
                  onValueChange={(value) => updateField(field.key, {
                    path: value,
                    rutaSeguridadId: resolveRutaSeguridadIdByPath(value),
                  })}
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

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? 'Guardando...' : 'Guardar redirects'}
          </Button>
          <Button
            variant="outline"
            onClick={() => void handleSincronizarIds()}
            disabled={saving}
          >
            <Link2 className="h-4 w-4 mr-2" />
            Sincronizar IDs rutasSeguridad
          </Button>
          <Button
            variant="outline"
            onClick={() => void loadData()}
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
