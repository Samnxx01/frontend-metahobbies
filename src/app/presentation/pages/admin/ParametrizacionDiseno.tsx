import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ImageIcon, Upload, X } from 'lucide-react';
import { getRouteCatalog, RouteCatalogItem, readCachedPrivateHomeRoute } from '@/app/services/routeService';
import {
  AccionBackend,
  BrandingConfig,
  guardarBrandingPrivado,
  obtenerAccionesWidgetPrivado,
  obtenerBrandingPrivado,
  subirImagenFondoLogin
} from '@/app/services/brandingWidget';
import { normalizeImageRenderUrl } from '@/app/utils/normalizeImageRenderUrl';

interface ParametrizacionDisenoProps {
  initialRoute?: string;
  hideRouteSelector?: boolean;
}

interface DesignFormState {
  fontFamilyBase: string;
  fontFamilyHeading: string;
  lightPrimary: string;
  darkPrimary: string;
  lightBackground: string;
  darkBackground: string;
  buttonRadius: string;
  buttonWeight: string;
  buttonHeight: string;
  buttonShadow: string;
  cardRadius: string;
  cardShadow: string;
  cardBorder: string;
  inputRadius: string;
  inputBorder: string;
  inputBackground: string;
  tokensJson: string;
  loginPath: string;
  loginEnabled: boolean;
  postLoginPath: string;
  postLoginEnabled: boolean;
  logoutPath: string;
  logoutEnabled: boolean;
  registerPath: string;
  registerEnabled: boolean;
  forgotPasswordPath: string;
  forgotPasswordEnabled: boolean;
  publicHomePath: string;
  publicHomeEnabled: boolean;
  loginBackgroundUrl: string;
  loginBackgroundEnabled: boolean;
  allowedPathsJson: string;
}

const getDefaultPrivatePath = (): string => readCachedPrivateHomeRoute() || '/public/render/home';

const DEFAULT_FORM: DesignFormState = {
  fontFamilyBase: '',
  fontFamilyHeading: '',
  lightPrimary: '',
  darkPrimary: '',
  lightBackground: '',
  darkBackground: '',
  buttonRadius: '',
  buttonWeight: '',
  buttonHeight: '',
  buttonShadow: '',
  cardRadius: '',
  cardShadow: '',
  cardBorder: '',
  inputRadius: '',
  inputBorder: '',
  inputBackground: '',
  tokensJson: '{}',
  loginPath: '/public/render/login',
  loginEnabled: true,
  postLoginPath: getDefaultPrivatePath(),
  postLoginEnabled: true,
  logoutPath: getDefaultPrivatePath(),
  logoutEnabled: true,
  registerPath: '/public/render/registro-cliente',
  registerEnabled: true,
  forgotPasswordPath: '/recuperar-contrasena',
  forgotPasswordEnabled: true,
  publicHomePath: '/public/render/home',
  publicHomeEnabled: true,
  loginBackgroundUrl: '',
  loginBackgroundEnabled: true,
  allowedPathsJson: JSON.stringify([
    '/public/render/login',
    '/public/render/view/login',
    getDefaultPrivatePath(),
    '/public/render/registro-cliente',
    '/recuperar-contrasena',
    '/public/render/home'
  ].filter((value, index, array) => value && array.indexOf(value) === index), null, 2)
};

const parseJsonTokens = (value: string): Record<string, string> => {
  try {
    const parsed = JSON.parse(value || '{}') as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    throw new Error('El JSON de tokens no es válido');
  }
};

const parseAllowedPaths = (value: string): string[] => {
  try {
    const parsed = JSON.parse(value || '[]');
    if (!Array.isArray(parsed)) {
      throw new Error('La whitelist de rutas debe ser un arreglo JSON');
    }

    return parsed
      .map((item) => String(item || '').trim())
      .filter((item) => item.startsWith('/'));
  } catch {
    throw new Error('El JSON de rutas permitidas no es valido');
  }
};

export default function ParametrizacionDiseno({
  initialRoute,
  hideRouteSelector = false
}: ParametrizacionDisenoProps): React.ReactElement {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  const [routes, setRoutes] = useState<RouteCatalogItem[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>(initialRoute || '*');
  const [form, setForm] = useState<DesignFormState>(DEFAULT_FORM);
  const [accionesTenant, setAccionesTenant] = useState<AccionBackend[]>([]);
  const [accionesSistema, setAccionesSistema] = useState<AccionBackend[]>([]);
  const [uploadingLoginBackground, setUploadingLoginBackground] = useState<boolean>(false);

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        setLoading(true);
        const [catalog, brandingData] = await Promise.all([
          getRouteCatalog(),
          obtenerBrandingPrivado()
        ]);
        setRoutes(catalog);
        setBranding(brandingData || {});
        const acciones = await obtenerAccionesWidgetPrivado();
        setAccionesTenant(acciones.accionesTenant);
        setAccionesSistema(acciones.accionesSistema);
      } catch (error) {
        console.error(error);
        toast.error('No se pudo cargar la parametrización de diseño');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const routeOptions = useMemo(() => {
    const dynamicRoutes = routes.map((route) => ({
      key: route.path,
      label: `${route.path} (${route.layout})`
    }));
    return [{ key: '*', label: 'Todas las rutas' }, ...dynamicRoutes];
  }, [routes]);

  useEffect(() => {
    if (initialRoute) {
      setSelectedRoute(initialRoute);
    }
  }, [initialRoute]);

  useEffect(() => {
    const routeConfigs = Array.isArray(branding?.widgets?.routes)
      ? (branding?.widgets?.routes as Array<Record<string, unknown>>)
      : [];

    const activeRouteConfig = routeConfigs.find((item) => String(item.route) === selectedRoute);
    const overrides = (activeRouteConfig?.overrides || {}) as Record<string, any>;
    const tokens = (overrides?.tokens || {}) as Record<string, string>;
    const navigation = (branding?.widgets?.navigation || {}) as Record<string, any>;
    const loginBackground = (branding?.widgets?.loginBackground || {}) as Record<string, any>;
    const allowedPaths = Array.isArray(navigation.allowedPaths) ? navigation.allowedPaths : [];

    setForm({
      fontFamilyBase: String(overrides?.tipografia?.fontFamilyBase || ''),
      fontFamilyHeading: String(overrides?.tipografia?.fontFamilyHeading || ''),
      lightPrimary: String(overrides?.paleta?.light?.primary || ''),
      darkPrimary: String(overrides?.paleta?.dark?.primary || ''),
      lightBackground: String(overrides?.paleta?.light?.background || ''),
      darkBackground: String(overrides?.paleta?.dark?.background || ''),
      buttonRadius: String(overrides?.botones?.radius || ''),
      buttonWeight: String(overrides?.botones?.fontWeight || ''),
      buttonHeight: String(tokens['button-height'] || ''),
      buttonShadow: String(tokens['button-shadow'] || ''),
      cardRadius: String(tokens['card-radius'] || ''),
      cardShadow: String(tokens['card-shadow'] || ''),
      cardBorder: String(tokens['card-border'] || ''),
      inputRadius: String(tokens['input-radius'] || ''),
      inputBorder: String(tokens['input-border'] || ''),
      inputBackground: String(tokens['input-bg'] || ''),
      tokensJson: JSON.stringify(tokens, null, 2),
      loginPath: String(navigation.login?.path || DEFAULT_FORM.loginPath),
      loginEnabled: navigation.login?.enabled !== false,
      postLoginPath: String(navigation.postLogin?.path || DEFAULT_FORM.postLoginPath),
      postLoginEnabled: navigation.postLogin?.enabled !== false,
      logoutPath: String(navigation.logout?.path || DEFAULT_FORM.logoutPath),
      logoutEnabled: navigation.logout?.enabled !== false,
      registerPath: String(navigation.register?.path || DEFAULT_FORM.registerPath),
      registerEnabled: navigation.register?.enabled !== false,
      forgotPasswordPath: String(navigation.forgotPassword?.path || DEFAULT_FORM.forgotPasswordPath),
      forgotPasswordEnabled: navigation.forgotPassword?.enabled !== false,
      publicHomePath: String(navigation.publicHome?.path || DEFAULT_FORM.publicHomePath),
      publicHomeEnabled: navigation.publicHome?.enabled !== false,
      loginBackgroundUrl: normalizeImageRenderUrl(loginBackground.imageUrl),
      loginBackgroundEnabled: loginBackground.enabled !== false,
      allowedPathsJson: JSON.stringify(
        allowedPaths.length > 0 ? allowedPaths : JSON.parse(DEFAULT_FORM.allowedPathsJson),
        null,
        2
      )
    });
  }, [branding, selectedRoute]);

  const updateForm = (key: keyof DesignFormState, value: string): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateToggle = (key: keyof DesignFormState, value: boolean): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleUploadLoginBackground = async (file?: File): Promise<void> => {
    if (!file) return;

    try {
      setUploadingLoginBackground(true);
      const uploaded = await subirImagenFondoLogin(file);
      if (!uploaded?.url) {
        throw new Error('No se recibio la URL de la imagen subida');
      }

      setForm((prev) => ({
        ...prev,
        loginBackgroundUrl: normalizeImageRenderUrl(uploaded.url),
        loginBackgroundEnabled: true
      }));
      toast.success('Imagen de fondo subida. Guarda el diseno para publicarla en login.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo subir la imagen de fondo';
      toast.error(message);
    } finally {
      setUploadingLoginBackground(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!branding) return;

    try {
      setSaving(true);
      const tokens = parseJsonTokens(form.tokensJson);
      const allowedPaths = parseAllowedPaths(form.allowedPathsJson);

      const routeConfigs = Array.isArray(branding.widgets?.routes)
        ? ([...branding.widgets?.routes] as Array<Record<string, unknown>>)
        : [];

      const tokensFusionados: Record<string, string> = {
        ...tokens,
        ...(form.buttonHeight ? { 'button-height': form.buttonHeight } : {}),
        ...(form.buttonShadow ? { 'button-shadow': form.buttonShadow } : {}),
        ...(form.cardRadius ? { 'card-radius': form.cardRadius } : {}),
        ...(form.cardShadow ? { 'card-shadow': form.cardShadow } : {}),
        ...(form.cardBorder ? { 'card-border': form.cardBorder } : {}),
        ...(form.inputRadius ? { 'input-radius': form.inputRadius } : {}),
        ...(form.inputBorder ? { 'input-border': form.inputBorder } : {}),
        ...(form.inputBackground ? { 'input-bg': form.inputBackground } : {})
      };

      const nextRouteConfig = {
        route: selectedRoute,
        overrides: {
          tipografia: {
            fontFamilyBase: form.fontFamilyBase || undefined,
            fontFamilyHeading: form.fontFamilyHeading || undefined
          },
          paleta: {
            light: {
              primary: form.lightPrimary || undefined,
              background: form.lightBackground || undefined
            },
            dark: {
              primary: form.darkPrimary || undefined,
              background: form.darkBackground || undefined
            }
          },
          botones: {
            radius: form.buttonRadius || undefined,
            fontWeight: form.buttonWeight || undefined
          },
          tokens: tokensFusionados
        }
      };

      const index = routeConfigs.findIndex((item) => String(item.route) === selectedRoute);
      if (index >= 0) {
        routeConfigs[index] = nextRouteConfig;
      } else {
        routeConfigs.push(nextRouteConfig);
      }

      const payload: BrandingConfig = {
        ...branding,
        widgets: {
          ...(branding.widgets || {}),
          routes: routeConfigs,
          loginBackground: {
            imageUrl: normalizeImageRenderUrl(form.loginBackgroundUrl.trim()),
            enabled: form.loginBackgroundEnabled
          },
          navigation: {
            login: {
              path: form.loginPath.trim(),
              enabled: form.loginEnabled
            },
            postLogin: {
              path: form.postLoginPath.trim(),
              enabled: form.postLoginEnabled
            },
            logout: {
              path: form.logoutPath.trim(),
              enabled: form.logoutEnabled
            },
            register: {
              path: form.registerPath.trim(),
              enabled: form.registerEnabled
            },
            forgotPassword: {
              path: form.forgotPasswordPath.trim(),
              enabled: form.forgotPasswordEnabled
            },
            publicHome: {
              path: form.publicHomePath.trim(),
              enabled: form.publicHomeEnabled
            },
            allowedPaths
          }
        }
      };

      const saved = await guardarBrandingPrivado(payload);
      setBranding(saved || payload);
      toast.success('Parametrización de diseño guardada correctamente');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar diseño';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Cargando parametrización de diseño...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Parametrización de Diseño por Ruta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!hideRouteSelector && (
            <div className="space-y-2">
              <Label>Ruta a configurar (dinámica desde backend)</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={selectedRoute}
                onChange={(event) => setSelectedRoute(event.target.value)}
              >
                {routeOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tipografía</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Fuente base</Label>
                <Input value={form.fontFamilyBase} onChange={(e) => updateForm('fontFamilyBase', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fuente heading</Label>
                <Input value={form.fontFamilyHeading} onChange={(e) => updateForm('fontFamilyHeading', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Colores Base</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Primary (Light)</Label>
                <Input placeholder="328 78% 54%" value={form.lightPrimary} onChange={(e) => updateForm('lightPrimary', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Primary (Dark)</Label>
                <Input placeholder="328 78% 54%" value={form.darkPrimary} onChange={(e) => updateForm('darkPrimary', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Background (Light)</Label>
                <Input placeholder="0 0% 100%" value={form.lightBackground} onChange={(e) => updateForm('lightBackground', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Background (Dark)</Label>
                <Input placeholder="328 35% 12%" value={form.darkBackground} onChange={(e) => updateForm('darkBackground', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Botones</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Radio</Label>
                <Input placeholder="0.5rem" value={form.buttonRadius} onChange={(e) => updateForm('buttonRadius', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Peso fuente</Label>
                <Input placeholder="600" value={form.buttonWeight} onChange={(e) => updateForm('buttonWeight', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Altura</Label>
                <Input placeholder="40px" value={form.buttonHeight} onChange={(e) => updateForm('buttonHeight', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Sombra</Label>
                <Input placeholder="0 2px 8px rgba(0,0,0,.15)" value={form.buttonShadow} onChange={(e) => updateForm('buttonShadow', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cards</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Radio card</Label>
                <Input placeholder="0.75rem" value={form.cardRadius} onChange={(e) => updateForm('cardRadius', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Sombra card</Label>
                <Input placeholder="0 1px 2px rgba(0,0,0,.06)" value={form.cardShadow} onChange={(e) => updateForm('cardShadow', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Borde card</Label>
                <Input placeholder="345 100% 95%" value={form.cardBorder} onChange={(e) => updateForm('cardBorder', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inputs</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Radio input</Label>
                <Input placeholder="0.5rem" value={form.inputRadius} onChange={(e) => updateForm('inputRadius', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Borde input</Label>
                <Input placeholder="345 100% 95%" value={form.inputBorder} onChange={(e) => updateForm('inputBorder', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fondo input</Label>
                <Input placeholder="0 0% 100%" value={form.inputBackground} onChange={(e) => updateForm('inputBackground', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fondo del Login</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
                <div
                  className="flex h-40 items-center justify-center overflow-hidden rounded-md border bg-muted"
                  style={{
                    backgroundImage: form.loginBackgroundUrl
                      ? `url("${normalizeImageRenderUrl(form.loginBackgroundUrl)}")`
                      : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  {!form.loginBackgroundUrl && (
                    <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                      Sin imagen
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>URL publica de la imagen</Label>
                    <Input
                      value={form.loginBackgroundUrl}
                      onChange={(e) => updateForm('loginBackgroundUrl', e.target.value)}
                      placeholder="/api/front/imgFondo/ver/id"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild type="button" variant="outline" disabled={uploadingLoginBackground}>
                      <label className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        {uploadingLoginBackground ? 'Subiendo...' : 'Subir imagen'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = '';
                            handleUploadLoginBackground(file);
                          }}
                        />
                      </label>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => updateForm('loginBackgroundUrl', '')}
                      disabled={!form.loginBackgroundUrl}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Quitar
                    </Button>

                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={form.loginBackgroundEnabled}
                        onChange={(e) => updateToggle('loginBackgroundEnabled', e.target.checked)}
                      />
                      Habilitada
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Avanzado (tokens adicionales)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label>Tokens adicionales (JSON)</Label>
              <Textarea
                rows={8}
                value={form.tokensJson}
                onChange={(e) => updateForm('tokensJson', e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gobernanza de Navegacion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Aqui parametrizas el helper gobernado que usa login, logout y redirecciones base del frontend.
              </p>

              {[
                ['loginPath', 'loginEnabled', 'Ruta Login'],
                ['postLoginPath', 'postLoginEnabled', 'Ruta Post Login'],
                ['logoutPath', 'logoutEnabled', 'Ruta Logout'],
                ['registerPath', 'registerEnabled', 'Ruta Registro'],
                ['forgotPasswordPath', 'forgotPasswordEnabled', 'Ruta Recuperar Contrasena'],
                ['publicHomePath', 'publicHomeEnabled', 'Ruta Home Publica']
              ].map(([pathKey, enabledKey, label]) => (
                <div key={pathKey} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <div className="space-y-2">
                    <Label>{label}</Label>
                    <Input
                      value={String(form[pathKey as keyof DesignFormState] || '')}
                      onChange={(e) => updateForm(pathKey as keyof DesignFormState, e.target.value)}
                      placeholder="/mi/ruta"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={Boolean(form[enabledKey as keyof DesignFormState])}
                      onChange={(e) => updateToggle(enabledKey as keyof DesignFormState, e.target.checked)}
                    />
                    Habilitada
                  </label>
                </div>
              ))}

              <div className="space-y-2">
                <Label>Whitelist de rutas permitidas (JSON)</Label>
                <Textarea
                  rows={8}
                  value={form.allowedPathsJson}
                  onChange={(e) => updateForm('allowedPathsJson', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Solo se aplican rutas internas presentes en esta whitelist; lo demas cae al fallback seguro.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar diseño de ruta'}
            </Button>
            <Badge variant="secondary">Se aplica a pública/privada según la ruta seleccionada del backend</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vista previa por componente</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="rounded-xl p-6 border space-y-4"
            style={{
              backgroundColor: form.lightBackground ? `hsl(${form.lightBackground})` : 'hsl(var(--background))',
              color: 'hsl(var(--foreground))',
              fontFamily: form.fontFamilyBase || 'var(--font-family-base)'
            }}
          >
            <h3
              style={{ fontFamily: form.fontFamilyHeading || 'var(--font-family-heading)' }}
              className="text-xl font-bold"
            >
              Preview del diseño para {selectedRoute}
            </h3>

            <div
              className="p-4 border"
              style={{
                borderRadius: form.cardRadius || '0.75rem',
                boxShadow: form.cardShadow || '0 1px 2px rgba(0,0,0,.06)',
                borderColor: form.cardBorder ? `hsl(${form.cardBorder})` : 'hsl(var(--border))'
              }}
            >
              <p className="text-sm mb-3">Componente Card de muestra</p>
              <Input
                placeholder="Input de muestra"
                style={{
                  borderRadius: form.inputRadius || '0.5rem',
                  borderColor: form.inputBorder ? `hsl(${form.inputBorder})` : 'hsl(var(--input))',
                  backgroundColor: form.inputBackground ? `hsl(${form.inputBackground})` : undefined
                }}
              />
            </div>

            <button
              type="button"
              style={{
                backgroundColor: form.lightPrimary ? `hsl(${form.lightPrimary})` : 'hsl(var(--button))',
                color: 'hsl(var(--button-foreground))',
                borderRadius: form.buttonRadius || 'var(--radius)',
                fontWeight: Number(form.buttonWeight || '600'),
                height: form.buttonHeight || '40px',
                boxShadow: form.buttonShadow || undefined,
                paddingInline: '1rem'
              }}
            >
              Botón de muestra
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acciones desde Backend</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Acciones permitidas en tu tenant/herencia</h4>
            <div className="flex flex-wrap gap-2">
              {accionesTenant.length > 0 ? accionesTenant.map((accion) => (
                <Badge key={accion._id || accion.iud || accion.method} variant="secondary">
                  {accion.etiquetas || accion.method}
                </Badge>
              )) : <span className="text-sm text-muted-foreground">Sin acciones permitidas</span>}
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Catálogo global de acciones</h4>
            <div className="flex flex-wrap gap-2">
              {accionesSistema.length > 0 ? accionesSistema.map((accion) => (
                <Badge key={accion._id || accion.iud || `${accion.method}-${accion.etiquetas}`} variant="outline">
                  {accion.etiquetas || accion.method}
                </Badge>
              )) : <span className="text-sm text-muted-foreground">Sin acciones activas en sistema</span>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
