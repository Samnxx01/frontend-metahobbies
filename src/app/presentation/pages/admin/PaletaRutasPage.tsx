import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { HelpCircle, ImageIcon, Loader2, Palette, Upload, X } from 'lucide-react';
import { socketListeners, socketCleanup } from '@/app/socket/socketEvents';
import { aplicarPaletaEnApp } from '@/app/utils/ColorUtils';
import type { ColoresPaleta } from '@/app/utils/ColorUtils';
import {
    obtenerColoresPublico,
    guardarColoresApp,
    fusionarColoresApp,
} from '@/app/services/coloresAppService';
import type { ColoresApp } from '@/app/services/coloresAppService';
import {
    guardarBrandingPrivado,
    eliminarImagenFondo,
    listarImagenesFondo,
    obtenerBrandingPrivado,
    reemplazarImagenFondo,
    subirImagenFondoLogin,
    normalizeConfiguredHomeImageUrl,
    type ImagenFondo,
    type BrandingConfig,
} from '@/app/services/brandingWidget';
import { normalizeImageRenderUrl } from '@/app/utils/normalizeImageRenderUrl';
import { apiFetch } from '@/app/services/api';
import { fetchSplashLogo, resolveSplashLogoUrl, invalidateSplashLogoCache } from '@/app/services/splashLogoService';

type PaletaColores = ColoresApp;

// ─── Metadatos de cada color ──────────────────────────────────────────────────

const COLOR_META: Array<{
    key: keyof PaletaColores;
    label: string;
    cssVar: string;
    afecta: string;
    elementos: string[];
}> = [
    {
        key: 'COLOR_PRIMARY',
        label: 'Color principal',
        cssVar: '--primary',
        afecta: 'Define el tono dominante de toda la marca.',
        elementos: [
            'Íconos activos del menú lateral',
            'Texto de títulos y enlaces de marca',
            'Anillo de foco al hacer clic en inputs',
            'Color de encabezado del navbar',
            'Texto sobre botones (contraste)',
        ],
    },
    {
        key: 'COLOR_ACCENT',
        label: 'Color de acento',
        cssVar: '--accent',
        afecta: 'Complementa al principal en elementos interactivos secundarios.',
        elementos: [
            'Fondo de badges y etiquetas de estado',
            'Hover de ítems del menú lateral',
            'Fondo de chips y selects al pasar el cursor',
            'Foreground del color principal (contraste)',
        ],
    },
    {
        key: 'COLOR_LIGHT',
        label: 'Color claro (muted)',
        cssVar: '--muted',
        afecta: 'Controla todos los elementos sutiles y de soporte.',
        elementos: [
            'Bordes de tarjetas, inputs y separadores',
            'Fondo de secciones atenuadas (muted)',
            'Color de placeholders y texto secundario',
            'Fondo de filas de tabla al hacer hover',
        ],
    },
    {
        key: 'COLOR_BG',
        label: 'Fondo general',
        cssVar: '--background',
        afecta: 'El fondo base de TODA la aplicación, público y admin.',
        elementos: [
            'Fondo de las vistas públicas (home, productos, landing)',
            'Fondo del panel admin',
            'Fondo del layout principal que envuelve todo',
        ],
    },
    {
        key: 'COLOR_CHAMPAGNE',
        label: 'Color champagne (tarjetas)',
        cssVar: '--card',
        afecta: 'Superficie de todos los contenedores flotantes.',
        elementos: [
            'Fondo de las Cards y paneles',
            'Fondo de modales y Dialogs',
            'Fondo de Popovers y Dropdowns',
            'Header y footer de emails de la plataforma',
        ],
    },
    {
        key: 'COLOR_SUNSET',
        label: 'Color sunset (botones)',
        cssVar: '--button',
        afecta: 'Color estándar de TODOS los botones de acción de la aplicación.',
        elementos: [
            'Botones primarios ("Ingresar", "Guardar", "Configurar")',
            'Botones de formularios, modales y confirmaciones (SweetAlert)',
            'CTAs del home, footer y landing',
            'Bordes internos de bloques y separadores cálidos',
            'Fondo de badges de estado "secondary"',
        ],
    },
    {
        key: 'COLOR_TEXT',
        label: 'Color de texto',
        cssVar: '--foreground',
        afecta: 'Color de todas las letras de la aplicación, público y admin.',
        elementos: [
            'Texto del body y párrafos en toda la app',
            'Texto dentro de tarjetas, modales y popovers',
            'Texto de títulos h1–h6 en vistas públicas y admin',
            'Labels de formularios e inputs',
            'Texto en componentes shadcn/ui (Dialog, Sheet, etc.)',
        ],
    },
];

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PaletaRutasPage() {
    const [paletaModalOpen, setPaletaModalOpen] = useState(false);
    const [ayudaPaletaOpen, setAyudaPaletaOpen] = useState(false);
    const [paletaColores, setPaletaColores] = useState<PaletaColores>(() => fusionarColoresApp());
    const [paletaLoading, setPaletaLoading] = useState(false);
    const [paletaSaving, setPaletaSaving] = useState(false);
    const [branding, setBranding] = useState<BrandingConfig | null>(null);
    const [loginBackgroundUrl, setLoginBackgroundUrl] = useState('');
    const [loginBackgroundEnabled, setLoginBackgroundEnabled] = useState(true);
    const [loadingBackgroundUrl, setLoadingBackgroundUrl] = useState('');
    const [loadingBackgroundEnabled, setLoadingBackgroundEnabled] = useState(true);
    const [backgroundTarget, setBackgroundTarget] = useState<'login' | 'loading' | 'home'>('login');
    const [imagenesFondo, setImagenesFondo] = useState<ImagenFondo[]>([]);
    const [imagenesLoading, setImagenesLoading] = useState(false);
    const [loginBackgroundUploading, setLoginBackgroundUploading] = useState(false);
    const [loginBackgroundSaving, setLoginBackgroundSaving] = useState(false);
    const [homeImageUrl, setHomeImageUrl] = useState('');
    const [homeImageEnabled, setHomeImageEnabled] = useState(false);
    const [homeImagePickerOpen, setHomeImagePickerOpen] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoFetchDone, setLogoFetchDone] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);

    // ── Socket: actualización de paleta en tiempo real ────────────────────────
    useEffect(() => {
        const handler = (data: { colores?: Partial<ColoresPaleta> }): void => {
            if (!data?.colores) return;
            const nuevos = fusionarColoresApp(data.colores as Partial<ColoresApp>);
            setPaletaColores(nuevos);
            aplicarPaletaEnApp(nuevos as ColoresPaleta);
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        socketListeners.onPaletaColoresActualizada(handler as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return () => { socketCleanup.offPaletaColoresActualizada(handler as any); };
    }, []);

    useEffect(() => {
        void (async () => {
            try {
                const res = await obtenerColoresPublico();
                setPaletaColores(fusionarColoresApp(res?.colores));
            } catch {
                /* mantiene fuente inicial alineada a DEFAULT_COLORES_APP */
            }
        })();
    }, []);

    useEffect(() => {
        const cargarFondoLogin = async (): Promise<void> => {
            try {
                const brandingData = await obtenerBrandingPrivado();
                const loginBackground = brandingData?.widgets?.loginBackground;
                const loadingBackground = brandingData?.widgets?.loadingBackground;
                const homeImage = brandingData?.widgets?.homeImage;

                setBranding(brandingData || {});
                setLoginBackgroundUrl(normalizeImageRenderUrl(loginBackground?.imageUrl));
                setLoginBackgroundEnabled(loginBackground?.enabled !== false);
                setLoadingBackgroundUrl(normalizeImageRenderUrl(loadingBackground?.imageUrl));
                setLoadingBackgroundEnabled(loadingBackground?.enabled !== false);
                const configuredHomeImageUrl = normalizeConfiguredHomeImageUrl(homeImage?.imageUrl);
                setHomeImageUrl(configuredHomeImageUrl);
                setHomeImageEnabled(homeImage?.enabled !== false && Boolean(configuredHomeImageUrl));
            } catch (error) {
                console.error(error);
                toast.error('No se pudo cargar la configuracion del fondo de login.');
            }
        };

        void cargarFondoLogin();
    }, []);

    const cargarImagenesFondo = async (): Promise<void> => {
        setImagenesLoading(true);
        try {
            setImagenesFondo(await listarImagenesFondo());
        } catch (error) {
            console.error(error);
            toast.error('No se pudo listar las imagenes de fondo.');
        } finally {
            setImagenesLoading(false);
        }
    };

    useEffect(() => {
        void cargarImagenesFondo();
    }, []);

    useEffect(() => {
        void cargarLogo();
    }, []);

    // ── Abrir modal y cargar colores actuales ─────────────────────────────────
    const abrirModalPaleta = async (): Promise<void> => {
        setPaletaModalOpen(true);
        setPaletaLoading(true);
        try {
            const res = await obtenerColoresPublico();
            setPaletaColores(fusionarColoresApp(res?.colores));
        } catch { toast.error('No se pudo cargar los colores actuales.'); }
        finally { setPaletaLoading(false); }
    };

    const cerrarModalPaleta = (): void => { setPaletaModalOpen(false); };

    // ── Preview en vivo sin guardar ───────────────────────────────────────────
    const handleColorChange = (key: keyof PaletaColores, value: string): void => {
        const nuevos = { ...paletaColores, [key]: value };
        setPaletaColores(nuevos);
        aplicarPaletaEnApp(nuevos as ColoresPaleta);
    };

    // ── Guardar y aplicar ─────────────────────────────────────────────────────
    const guardarYActivarPaleta = async (): Promise<void> => {
        setPaletaSaving(true);
        try {
            await guardarColoresApp(paletaColores);
            aplicarPaletaEnApp(fusionarColoresApp(paletaColores) as ColoresPaleta);
            toast.success('Colores guardados y aplicados en toda la app.');
            cerrarModalPaleta();
        } catch (error: any) { toast.error(error?.message || 'No se pudo guardar los colores.'); }
        finally { setPaletaSaving(false); }
    };

    const cargarLogo = async (): Promise<void> => {
        setLogoFetchDone(false);
        try {
            const tieneToken = typeof window !== 'undefined' && Boolean(String(localStorage.getItem('token') || '').trim());
            const res = await fetchSplashLogo(tieneToken, { forceRefresh: true });
            setLogoUrl(resolveSplashLogoUrl(res?.logo));
        } catch {
            setLogoUrl(null);
        } finally {
            setLogoFetchDone(true);
        }
    };

    const subirLogo = async (file?: File): Promise<void> => {
        if (!file) return;
        setLogoUploading(true);
        try {
            const formData = new FormData();
            formData.append('archivo', file);
            const res = await apiFetch('/api/config/parametrizacion/guardar/logos/coporativa', {
                method: 'POST',
                body: formData
            }) as { ok?: boolean; msg?: string } | null;
            if (!res?.ok) throw new Error(res?.msg || 'No se pudo subir el logo');
            invalidateSplashLogoCache();
            await cargarLogo();
            toast.success('Logo subido correctamente.');
        } catch (error: any) {
            toast.error(error?.message || 'No se pudo subir el logo.');
        } finally {
            setLogoUploading(false);
        }
    };

    const subirFondoLogin = async (file?: File): Promise<void> => {
        if (!file) return;

        setLoginBackgroundUploading(true);
        try {
            const uploaded = await subirImagenFondoLogin(file);
            if (!uploaded?.url) {
                throw new Error('No se recibio la URL de la imagen subida.');
            }

            if (backgroundTarget === 'loading') {
                setLoadingBackgroundUrl(uploaded.url);
                setLoadingBackgroundEnabled(true);
            } else if (backgroundTarget === 'home') {
                setHomeImageUrl(uploaded.url);
                setHomeImageEnabled(true);
            } else {
                setLoginBackgroundUrl(uploaded.url);
                setLoginBackgroundEnabled(true);
            }
            await cargarImagenesFondo();
            toast.success('Imagen subida. Guarda los fondos para publicarla.');
        } catch (error: any) {
            toast.error(error?.message || 'No se pudo subir la imagen de fondo.');
        } finally {
            setLoginBackgroundUploading(false);
        }
    };

    const guardarFondoLogin = async (): Promise<void> => {
        setLoginBackgroundSaving(true);
        try {
            const normalizedHomeImageUrl = normalizeConfiguredHomeImageUrl(homeImageUrl.trim());
            const payload: BrandingConfig = {
                ...(branding || {}),
                widgets: {
                    ...(branding?.widgets || {}),
                    loginBackground: {
                        imageUrl: normalizeImageRenderUrl(loginBackgroundUrl.trim()),
                        enabled: loginBackgroundEnabled,
                    },
                    loadingBackground: {
                        imageUrl: normalizeImageRenderUrl(loadingBackgroundUrl.trim()),
                        enabled: loadingBackgroundEnabled,
                    },
                    homeImage: {
                        imageUrl: normalizedHomeImageUrl,
                        enabled: homeImageEnabled && Boolean(normalizedHomeImageUrl),
                    },
                },
            };

            const saved = await guardarBrandingPrivado(payload);
            setBranding(saved || payload);
            toast.success('Fondos guardados correctamente.');
        } catch (error: any) {
            toast.error(error?.message || 'No se pudieron guardar los fondos.');
        } finally {
            setLoginBackgroundSaving(false);
        }
    };

    const seleccionarImagenFondo = (url: string): void => {
        if (backgroundTarget === 'loading') {
            setLoadingBackgroundUrl(url);
            setLoadingBackgroundEnabled(true);
            return;
        }
        if (backgroundTarget === 'home') {
            setHomeImageUrl(url);
            setHomeImageEnabled(true);
            return;
        }

        setLoginBackgroundUrl(url);
        setLoginBackgroundEnabled(true);
    };

    const eliminarFondo = async (imagen: ImagenFondo): Promise<void> => {
        try {
            await eliminarImagenFondo(imagen.id);
            if (loginBackgroundUrl === imagen.url) setLoginBackgroundUrl('');
            if (loadingBackgroundUrl === imagen.url) setLoadingBackgroundUrl('');
            if (homeImageUrl === imagen.url) {
                setHomeImageUrl('');
                setHomeImageEnabled(false);
            }
            await cargarImagenesFondo();
            toast.success('Imagen eliminada correctamente.');
        } catch (error: any) {
            toast.error(error?.message || 'No se pudo eliminar la imagen.');
        }
    };

    const reemplazarFondo = async (imagen: ImagenFondo, file?: File): Promise<void> => {
        if (!file) return;

        try {
            const updated = await reemplazarImagenFondo(imagen.id, file);
            if (!updated?.url) {
                throw new Error('No se recibio la URL de la imagen actualizada.');
            }

            if (loginBackgroundUrl === imagen.url) setLoginBackgroundUrl(updated.url);
            if (loadingBackgroundUrl === imagen.url) setLoadingBackgroundUrl(updated.url);
            if (homeImageUrl === imagen.url) setHomeImageUrl(updated.url);
            await cargarImagenesFondo();
            toast.success('Imagen reemplazada correctamente.');
        } catch (error: any) {
            toast.error(error?.message || 'No se pudo reemplazar la imagen.');
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="p-4 md:p-6 lg:p-8 flex-1 space-y-8">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Diseño de Vistas</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Configura la apariencia visual de la aplicación.
                </p>
            </div>

            {/* ── Paleta de colores ──────────────────────────────────────────── */}
            <Card className="shadow-lg border-border">
                <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-2">
                            <Palette className="h-5 w-5 text-primary" />
                            <CardTitle>Paleta de colores de la aplicacion</CardTitle>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setAyudaPaletaOpen(true)}>
                                <HelpCircle className="h-4 w-4 mr-1.5" />
                                ¿Que cambia cada color?
                            </Button>
                            <Button size="sm" onClick={() => void abrirModalPaleta()}>
                                <Palette className="h-4 w-4 mr-2" />
                                Configurar colores
                            </Button>
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Define los 6 colores que controlan toda la apariencia visual — vistas publicas y admin.
                        Los cambios se propagan en tiempo real a todos los usuarios conectados via Socket.
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {COLOR_META.map(({ key, label, cssVar }) => (
                            <div key={key} className="flex flex-col items-center gap-1.5">
                                <div
                                    className="w-10 h-10 rounded-full border-2 border-border"
                                    style={{ backgroundColor: `hsl(var(${cssVar}))` }}
                                />
                                <p className="text-xs font-medium text-center leading-tight">{label}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* ── Logo corporativo ───────────────────────────────────────────── */}
            <Card className="shadow-lg border-border">
                <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-2">
                            <ImageIcon className="h-5 w-5 text-primary" />
                            <CardTitle>Logo corporativo</CardTitle>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void cargarLogo()}
                                disabled={!logoFetchDone}
                            >
                                {!logoFetchDone && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Recargar
                            </Button>
                            <Button asChild type="button" size="sm" disabled={logoUploading}>
                                <label className="cursor-pointer">
                                    {logoUploading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Upload className="mr-2 h-4 w-4" />
                                    )}
                                    {logoUploading ? 'Subiendo...' : 'Subir logo'}
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                                        className="hidden"
                                        onChange={(event) => {
                                            const file = event.target.files?.[0];
                                            event.target.value = '';
                                            void subirLogo(file);
                                        }}
                                    />
                                </label>
                            </Button>
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Logo que aparece en la pantalla de carga y el sidebar de administracion.
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <div className="flex h-36 w-36 shrink-0 items-center justify-center rounded-xl border border-border bg-muted p-3">
                            {!logoFetchDone ? (
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            ) : logoUrl ? (
                                <img
                                    src={logoUrl}
                                    alt="Logo corporativo"
                                    className="h-full w-full object-contain drop-shadow-sm"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
                                    <ImageIcon className="h-8 w-8" />
                                    Sin logo
                                </div>
                            )}
                        </div>
                        <div className="space-y-1.5 text-sm text-muted-foreground">
                            <p>El logo activo se muestra en la <strong className="text-foreground">pantalla de carga</strong> y en el <strong className="text-foreground">sidebar</strong> de administracion.</p>
                            <p>Sube un nuevo archivo con <strong className="text-foreground">Subir logo</strong> para reemplazarlo. Formatos: PNG, JPG, SVG, WEBP.</p>
                            <p className="text-xs">Para gestion avanzada (historial, activar versiones anteriores), usa <strong className="text-foreground">Logos Corporativos</strong>.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════════════
                MODAL: Configurar colores
            ════════════════════════════════════════════════════════════════ */}
            <Card className="shadow-lg border-border">
                <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-2">
                            <ImageIcon className="h-5 w-5 text-primary" />
                            <CardTitle>Fondos parametrizables</CardTitle>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant={backgroundTarget === 'login' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setBackgroundTarget('login')}
                            >
                                Login
                            </Button>
                            <Button
                                type="button"
                                variant={backgroundTarget === 'loading' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setBackgroundTarget('loading')}
                            >
                                Pantalla de carga
                            </Button>
                            <Button
                                type="button"
                                variant={backgroundTarget === 'home' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setBackgroundTarget('home')}
                            >
                                Home
                            </Button>
                            <Button asChild type="button" variant="outline" size="sm" disabled={loginBackgroundUploading}>
                                <label className="cursor-pointer">
                                    {loginBackgroundUploading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Upload className="mr-2 h-4 w-4" />
                                    )}
                                    {loginBackgroundUploading ? 'Subiendo...' : 'Subir imagen'}
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/jpg"
                                        className="hidden"
                                        onChange={(event) => {
                                            const file = event.target.files?.[0];
                                            event.target.value = '';
                                            void subirFondoLogin(file);
                                        }}
                                    />
                                </label>
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => void guardarFondoLogin()}
                                disabled={loginBackgroundSaving}
                            >
                                {loginBackgroundSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Guardar fondos
                            </Button>
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Parametriza imagenes para el login, la pantalla de carga y el Home. Si el Home no tiene imagen habilitada, esa seccion no se renderiza.
                    </p>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        {[
                            {
                                title: 'Login',
                                target: 'login' as const,
                                url: loginBackgroundUrl,
                                enabled: loginBackgroundEnabled,
                                setUrl: setLoginBackgroundUrl,
                                setEnabled: setLoginBackgroundEnabled,
                                seed: undefined as string | undefined,
                            },
                            {
                                title: 'Pantalla de carga',
                                target: 'loading' as const,
                                url: loadingBackgroundUrl,
                                enabled: loadingBackgroundEnabled,
                                setUrl: setLoadingBackgroundUrl,
                                setEnabled: setLoadingBackgroundEnabled,
                                seed: undefined as string | undefined,
                            },
                            {
                                title: 'Imagen del Home',
                                target: 'home' as const,
                                url: homeImageUrl,
                                enabled: homeImageEnabled,
                                setUrl: setHomeImageUrl,
                                setEnabled: setHomeImageEnabled,
                                seed: undefined as string | undefined,
                            },
                        ].map((item) => (
                            <div key={item.title} className="rounded-lg border border-border p-3 space-y-3">
                                <div
                                    className="flex h-44 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-border bg-muted transition-opacity hover:opacity-90"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => {
                                        setBackgroundTarget(item.target);
                                        setHomeImagePickerOpen(true);
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key !== 'Enter' && event.key !== ' ') return;
                                        event.preventDefault();
                                        setBackgroundTarget(item.target);
                                        setHomeImagePickerOpen(true);
                                    }}
                                    aria-label={`Seleccionar imagen para ${item.title}`}
                                    style={{
                                        backgroundImage: item.url
                                            ? `url("${normalizeImageRenderUrl(item.url)}")`
                                            : undefined,
                                        backgroundPosition: 'center',
                                        backgroundSize: 'cover',
                                    }}
                                >
                                    {!item.url && (
                                        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                                            <ImageIcon className="h-8 w-8" />
                                            Sin imagen configurada
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">{item.title}</p>
                                    <Input
                                        value={item.url}
                                        onChange={(event) => item.setUrl(event.target.value)}
                                        placeholder="/api/front/imgFondo/ver/id"
                                    />
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <label className="flex items-center gap-2 text-sm text-foreground">
                                        <input
                                            type="checkbox"
                                            checked={item.enabled}
                                            onChange={(event) => item.setEnabled(event.target.checked)}
                                        />
                                        Habilitado
                                    </label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            item.setUrl('');
                                            item.setEnabled(false);
                                        }}
                                        disabled={!item.url || (!!item.seed && item.url === item.seed)}
                                    >
                                        <X className="mr-2 h-4 w-4" />
                                        Quitar
                                    </Button>
                                    {item.title === 'Imagen del Home' && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => void guardarFondoLogin()}
                                            disabled={loginBackgroundSaving}
                                        >
                                            {loginBackgroundSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Guardar imagen
                                        </Button>
                                    )}
                                    {item.seed && item.url !== item.seed && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => item.setUrl(item.seed!)}
                                        >
                                            Restaurar semilla
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold">Imagenes guardadas</p>
                            <Button type="button" variant="outline" size="sm" onClick={() => void cargarImagenesFondo()}>
                                {imagenesLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Recargar
                            </Button>
                        </div>

                        {imagenesFondo.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No hay imagenes subidas todavia.</p>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {imagenesFondo.map((imagen) => (
                                    <div key={imagen.id} className="rounded-lg border border-border p-3 space-y-3">
                                        <button
                                            type="button"
                                            className="h-28 w-full rounded-md border border-border bg-muted bg-cover bg-center"
                                            style={{
                                                backgroundImage: `url("${normalizeImageRenderUrl(imagen.url)}")`,
                                            }}
                                            onClick={() =>
                                                seleccionarImagenFondo(
                                                    normalizeImageRenderUrl(imagen.url)
                                                )
                                            }
                                            aria-label={`Seleccionar ${imagen.nombre}`}
                                        />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">{imagen.nombre}</p>
                                            <p className="text-xs text-muted-foreground">{Math.round((imagen.size || 0) / 1024)} KB</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={() =>
                                                    seleccionarImagenFondo(
                                                        normalizeImageRenderUrl(imagen.url)
                                                    )
                                                }
                                            >
                                                Usar en {backgroundTarget === 'login'
                                                    ? 'login'
                                                    : backgroundTarget === 'loading'
                                                        ? 'carga'
                                                        : 'Home'}
                                            </Button>
                                            <Button asChild type="button" variant="outline" size="sm">
                                                <label className="cursor-pointer">
                                                    Reemplazar
                                                    <input
                                                        type="file"
                                                        accept="image/png,image/jpeg,image/jpg"
                                                        className="hidden"
                                                        onChange={(event) => {
                                                            const file = event.target.files?.[0];
                                                            event.target.value = '';
                                                            void reemplazarFondo(imagen, file);
                                                        }}
                                                    />
                                                </label>
                                            </Button>
                                            <Button type="button" variant="destructive" size="sm" onClick={() => void eliminarFondo(imagen)}>
                                                Eliminar
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Dialog open={homeImagePickerOpen} onOpenChange={setHomeImagePickerOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            Seleccionar imagen para {backgroundTarget === 'login'
                                ? 'Login'
                                : backgroundTarget === 'loading'
                                    ? 'Pantalla de carga'
                                    : 'Home'}
                        </DialogTitle>
                        <DialogDescription>
                            Elige una imagen existente de la base de datos o sube una nueva.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Button asChild type="button" disabled={loginBackgroundUploading}>
                            <label className="cursor-pointer">
                                {loginBackgroundUploading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Upload className="mr-2 h-4 w-4" />
                                )}
                                {loginBackgroundUploading ? 'Subiendo...' : 'Subir nueva imagen'}
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg"
                                    className="hidden"
                                    onChange={(event) => {
                                        const file = event.target.files?.[0];
                                        event.target.value = '';
                                        void subirFondoLogin(file);
                                    }}
                                />
                            </label>
                        </Button>
                        <Button type="button" variant="outline" onClick={() => void cargarImagenesFondo()} disabled={imagenesLoading}>
                            {imagenesLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Recargar
                        </Button>
                    </div>

                    {imagenesLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-7 w-7 animate-spin text-primary" />
                        </div>
                    ) : imagenesFondo.length === 0 ? (
                        <div className="rounded-md border border-dashed p-10 text-center text-muted-foreground">
                            No hay imágenes guardadas. Puedes subir una nueva.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {imagenesFondo.map((imagen) => (
                                <button
                                    key={imagen.id}
                                    type="button"
                                    className="space-y-2 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-muted/50"
                                    onClick={() => {
                                        seleccionarImagenFondo(normalizeImageRenderUrl(imagen.url));
                                        setHomeImagePickerOpen(false);
                                    }}
                                >
                                    <span
                                        className="block h-36 w-full rounded-md border border-border bg-muted bg-cover bg-center"
                                        style={{ backgroundImage: `url("${normalizeImageRenderUrl(imagen.url)}")` }}
                                    />
                                    <span className="block truncate text-sm font-medium">{imagen.nombre}</span>
                                    <span className="block text-xs text-muted-foreground">
                                        {Math.round((imagen.size || 0) / 1024)} KB
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setHomeImagePickerOpen(false)}>
                            Cerrar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={paletaModalOpen} onOpenChange={(open) => { if (!open) cerrarModalPaleta(); }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Palette className="h-5 w-5 text-primary" />
                            Paleta de colores de la aplicacion
                        </DialogTitle>
                        <DialogDescription>
                            Cada color controla variables CSS especificas que afectan toda la interfaz.
                            El preview es en vivo — la pagina se actualiza mientras eliges.
                            Al guardar, los colores se propagan a todos los usuarios via Socket.
                        </DialogDescription>
                    </DialogHeader>

                    {paletaLoading ? (
                        <div className="flex justify-center items-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="space-y-5 py-2">
                            <div className="border-t border-border" />
                            <div className="space-y-4">
                                {COLOR_META.map(({ key, label, afecta }) => (
                                    <div key={key} className="flex items-start gap-4 p-3 rounded-lg border border-border bg-card">
                                        <div className="flex flex-col items-center gap-2 shrink-0">
                                            <div
                                                className="w-12 h-12 rounded-lg border-2 border-border shadow-sm"
                                                style={{ backgroundColor: paletaColores[key] }}
                                            />
                                            <input
                                                type="color"
                                                value={paletaColores[key]}
                                                onChange={(e) => handleColorChange(key, e.target.value)}
                                                className="w-10 h-7 cursor-pointer rounded border border-border"
                                                title={`Seleccionar ${label}`}
                                            />
                                        </div>
                                        <div className="flex-1 space-y-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-semibold">{label}</p>
                                                <Badge variant="outline" className="text-xs font-mono">{key}</Badge>
                                                <code className="text-xs text-muted-foreground font-mono">{paletaColores[key]}</code>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed">{afecta}</p>
                                            <Input
                                                value={paletaColores[key]}
                                                onChange={(e) => handleColorChange(key, e.target.value)}
                                                className="h-7 text-xs font-mono mt-1"
                                                placeholder="#000000"
                                                maxLength={7}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex gap-2 pt-2 border-t border-border">
                        <Button variant="outline" onClick={cerrarModalPaleta} disabled={paletaSaving}>
                            Cancelar
                        </Button>
                        <Button onClick={() => void guardarYActivarPaleta()} disabled={paletaSaving || paletaLoading}>
                            {paletaSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Palette className="mr-2 h-4 w-4" />}
                            Guardar y aplicar paleta
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══════════════════════════════════════════════════════════════
                MODAL: Ayuda de colores
            ════════════════════════════════════════════════════════════════ */}
            <Dialog open={ayudaPaletaOpen} onOpenChange={setAyudaPaletaOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <HelpCircle className="h-5 w-5 text-primary" />
                            Guia de colores — ¿que cambia cada uno?
                        </DialogTitle>
                        <DialogDescription>
                            Cada color de la paleta controla variables CSS especificas (<code className="font-mono text-xs">--primary</code>, <code className="font-mono text-xs">--accent</code>, etc.)
                            que Tailwind aplica en toda la interfaz. Los swatches muestran el color activo en este momento.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="rounded-lg border border-border overflow-hidden text-xs">
                            <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: `hsl(var(--card))` }}>
                                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: `hsl(var(--primary))` }} />
                                <span className="font-semibold" style={{ color: `hsl(var(--primary))` }}>Navbar / Logo</span>
                                <div className="ml-auto flex gap-1.5">
                                    <div className="px-2 py-0.5 rounded text-[10px] flex items-center" style={{ backgroundColor: `hsl(var(--button))`, color: `hsl(var(--button-foreground))` }}>Boton</div>
                                    <div className="px-2 py-0.5 rounded text-[10px]" style={{ backgroundColor: `hsl(var(--accent))`, color: `hsl(var(--primary))` }}>Badge</div>
                                </div>
                            </div>
                            <div className="flex gap-2 p-3" style={{ backgroundColor: `hsl(var(--background))` }}>
                                <div className="w-28 rounded p-2 space-y-1 shrink-0" style={{ backgroundColor: `hsl(var(--card))`, border: `1px solid hsl(var(--muted))` }}>
                                    <div className="h-2 rounded w-3/4" style={{ backgroundColor: `hsl(var(--primary))` }} />
                                    <div className="h-1.5 rounded w-full" style={{ backgroundColor: `hsl(var(--muted))` }} />
                                    <div className="h-1.5 rounded w-5/6" style={{ backgroundColor: `hsl(var(--muted))` }} />
                                    <div className="h-1.5 rounded w-2/3" style={{ backgroundColor: `hsl(var(--accent))` }} />
                                </div>
                                <div className="flex-1 rounded p-2" style={{ backgroundColor: `hsl(var(--card))`, border: `1px solid hsl(var(--muted))` }}>
                                    <div className="h-1.5 rounded w-1/3 mb-2" style={{ backgroundColor: `hsl(var(--primary))` }} />
                                    <div className="h-5 rounded mb-1.5 w-full" style={{ backgroundColor: `hsl(var(--muted))`, border: `1px solid hsl(var(--muted))` }} />
                                    <div className="flex gap-1 mt-2">
                                        <div className="h-4 px-2 rounded text-[9px] flex items-center" style={{ backgroundColor: `hsl(var(--button))`, color: `hsl(var(--button-foreground))` }}>Guardar</div>
                                        <div className="h-4 px-2 rounded text-[9px] flex items-center border" style={{ borderColor: `hsl(var(--primary) / 0.2)`, color: `hsl(var(--primary))` }}>Cancelar</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground text-center">
                            Preview generado con los colores activos en este momento
                        </p>

                        <div className="border-t border-border" />

                        {COLOR_META.map(({ key, label, cssVar, afecta, elementos }) => (
                            <div key={key} className="flex gap-3 p-3 rounded-lg border border-border">
                                <div className="shrink-0 flex flex-col items-center gap-1">
                                    <div
                                        className="w-10 h-10 rounded-lg border border-border shadow-sm"
                                        style={{ backgroundColor: `hsl(var(${cssVar}))` }}
                                    />
                                    <code className="text-[9px] text-muted-foreground font-mono">{cssVar}</code>
                                </div>
                                <div className="flex-1 space-y-1.5 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-semibold">{label}</p>
                                        <Badge variant="outline" className="text-[10px] font-mono">{key}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{afecta}</p>
                                    <ul className="space-y-0.5">
                                        {elementos.map((el) => (
                                            <li key={el} className="text-xs flex items-start gap-1.5">
                                                <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: `hsl(var(${cssVar}))` }} />
                                                {el}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>

                    <DialogFooter className="border-t border-border pt-3">
                        <Button variant="outline" onClick={() => setAyudaPaletaOpen(false)}>Cerrar</Button>
                        <Button onClick={() => { setAyudaPaletaOpen(false); void abrirModalPaleta(); }}>
                            <Palette className="h-4 w-4 mr-2" />
                            Ir a configurar colores
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
