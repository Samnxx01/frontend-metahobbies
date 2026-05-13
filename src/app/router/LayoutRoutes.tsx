import { Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom';
import { useState, useEffect, ReactElement, lazy, Suspense } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { getAuthorizedRoutes, getPrivateHomeRoute, readCachedPrivateHomeRoute } from '@/app/services/routeService';
import { resolveCurrentRouteMenuTags } from '@/app/services/routesService';
import { useLoading } from '@/app/providers/LoadingProvider';
import { getGovernedPublicHomePath } from '@/app/services/governedNavigation';

import PublicLayout from '@/app/presentation/layouts/PublicLayout';
import AuthLayout from '@/app/presentation/layouts/AuthLayout';
import AdminLayout from '@/app/presentation/layouts/AdminLayout';
import { MembershipRoutes } from './MembershipRoutes';
import LoadingScreen from '@/app/presentation/components/common/LoadingScreen';

// Imports directos para rutas especiales fuera del componentMap dinámico
import CambiarContrasenaProvisional from '@/app/presentation/pages/cambiar-contrasena/CambiarContrasenaProvisional';
import ActivacionCuenta from '../presentation/pages/activar-cuenta/ActivaciónCuenta';
import Perfil from '@/app/presentation/pages/perfil/Perfil';
import RecuperarContrasena from '@/app/presentation/pages/recuperar-contrasena/RecuperarContrasena';
import RecuperarContrasenaToken from '@/app/presentation/pages/recuperar-contrasena/RecuperarContrasenaToken';
import NotFound from '@/app/presentation/pages/not-found/NotFound';
import Home from '@/app/presentation/pages/home/Home';
import Carrito from '@/app/presentation/pages/carrito/Carrito';
import DynamicRouteFallback from '@/app/presentation/pages/admin/DynamicRouteFallback';

// —— Dynamic component map via Vite glob —————————————————————
// Escanea TODOS los .tsx de pages/ y components/admin/ automáticamente.
// Al agregar un nuevo componente, se registra solo con el nombre del archivo.
const _pageModules = import.meta.glob<{ default: React.ComponentType<any> }>(
    [
        '../presentation/pages/**/*.tsx',
        '../presentation/components/admin/**/*.tsx',
    ],
    { eager: false } // Cambiado a false para lazy loading
);

type ComponentMapType = Record<string, React.LazyExoticComponent<any>>;

const buildComponentMap = (): ComponentMapType => {
    const map: ComponentMapType = {};

    // 1. Registro automático por nombre de archivo con lazy loading
    for (const [filePath, mod] of Object.entries(_pageModules)) {
        const match = filePath.match(/\/([^/]+)\.tsx$/);
        if (match?.[1]) {
            const baseName = match[1];
            map[baseName] = lazy(() =>
                mod().then((m: Record<string, React.ComponentType<any> | undefined>) => {
                    const Comp = m.default ?? m[baseName];
                    if (!Comp) {
                        console.warn(
                            `[componentMap] "${baseName}" no tiene default ni export nombrado — ${filePath}`,
                        );
                        const Fallback = (): ReactElement => (
                            <div className="p-4 text-sm text-destructive">
                                Componente no disponible: {baseName}
                            </div>
                        );
                        return { default: Fallback };
                    }
                    return { default: Comp };
                }),
            );
        }
    }

    // 2. Aliases: nombres alternativos usados en la BD de rutas
    //    Solo agregar cuando el nombre en BD difiere del nombre del archivo.
    const aliases: Record<string, string> = {
        // Typos históricos en BD
        ParametrizacionCatalogTenant:  'ParametrizacionCatologTenant',
        TenantCorportativo:            'TenantCorporativo',
        tenantCorportativo:            'TenantCorporativo',
        tenantCorporativo:             'TenantCorporativo',
        parametrizacionMenu:           'ParametrizacionMenu',
        RouteUserMenuSettings:         'ParametrizacionMenu',
        envioCorreos:                  'EnvioCorreos',
        // Alias semántico
        ConfiguracionPerfil:           'Perfil',
        // Dashboard: el archivo se llama Dashboard pero la BD puede enviar DashboardAdmin
        DashboardAdmin:                'Dashboard',
        // Suite/Módulo "Usuarios" y "Administracion" usan GestionUsuarios como componente base
        Usuarios:                      'GestionUsuarios',
        Administracion:                'GestionUsuarios',
        // Productos: wrappers explícitos para público/privado
        ProductosAdmin:                'ProductosPrivado',
        ProductosPrivate:              'ProductosPrivado',
        ProductosPrivados:             'ProductosPrivado',
        GestionProductosAdmin:         'ProductosPrivado',
        ProductosPublic:               'ProductosPublico',
        ProductosPublicos:             'ProductosPublico',
        CatalogoProductos:             'ProductosPublico',
        InventarioAdmin:               'Inventario',
        GestionInventario:             'Inventario',
        KardexInventario:              'Inventario',
        InventarioKardex:              'Inventario',
    };

    for (const [alias, target] of Object.entries(aliases)) {
        if (map[target] && !map[alias]) {
            map[alias] = map[target];
        }
    }

    // Compatibilidad dirigida: algunas rutas viejas en BD siguen apuntando
    // a RouteUserMenuSettings aunque la pantalla real ahora es ParametrizacionMenu.
    if (map.ParametrizacionMenu) {
        map.RouteUserMenuSettings = map.ParametrizacionMenu;
    }

    // Rutas en BD que apuntan al archivo del modal: sin props el Dialog queda cerrado (pantalla vacía).
    const modalRouteOverrides: Record<string, string> = {
        UsuarioSuperAdminModal: 'UsuarioSuperAdminModalPage',
        UsuarioGlobalModal: 'UsuarioGlobalModalPage',
    };
    for (const [routeName, pageName] of Object.entries(modalRouteOverrides)) {
        if (map[pageName]) {
            map[routeName] = map[pageName];
        }
    }

    return map;
};

const componentMap = buildComponentMap();

// —— Types ———————————————————————————————————————————————————————————————————————

interface RouteConfig {
    path: string;
    component: string;
    children?: RouteConfig[];
}

interface AuthorizedRoutes {
    publicRoutes?: RouteConfig[];
    adminRoutes?: RouteConfig[];
    authRoutes?: RouteConfig[];
    hybridRoutes?: RouteConfig[];
}

// ── Hybrid layout ──────────────────────────────────────────────────────────────
// Rutas accesibles sin importar el estado de autenticación.
// Usa AdminLayout cuando hay sesión activa, PublicLayout en caso contrario.
function HybridLayout(): ReactElement {
    const { user } = useAuth();
    return user ? <AdminLayout /> : <PublicLayout />;
}

// ── Root redirect ──────────────────────────────────────────────────────────────

function RootRedirect({ user }: { user: any }): ReactElement {
    const [targetPath, setTargetPath] = useState<string | null>(user ? null : getGovernedPublicHomePath());

    useEffect(() => {
        if (!user) {
            setTargetPath(getGovernedPublicHomePath());
            return;
        }

        let active = true;
        const resolveTarget = async (): Promise<void> => {
            try {
                const nextPath = await getPrivateHomeRoute();
                if (!active) return;
                setTargetPath(nextPath?.trim() || readCachedPrivateHomeRoute() || getGovernedPublicHomePath());
            } catch {
                if (!active) return;
                setTargetPath(readCachedPrivateHomeRoute() || getGovernedPublicHomePath());
            }
        };

        void resolveTarget();
        return () => { active = false; };
    }, [user]);

    if (!targetPath) {
        return <div>Cargando redireccion...</div>;
    }

    return <Navigate to={targetPath} replace />;
}

// —— Admin redirect ———————————————————————————————————————————————————————————————

function AdminEntryRedirect(): ReactElement {
    const [targetPath, setTargetPath] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        const resolveTarget = async (): Promise<void> => {
            try {
                const nextPath = await getPrivateHomeRoute();
                if (!active) return;
                setTargetPath(nextPath?.trim() || readCachedPrivateHomeRoute() || getGovernedPublicHomePath());
            } catch (_error) {
                if (!active) return;
                setTargetPath(readCachedPrivateHomeRoute() || getGovernedPublicHomePath());
            }
        };

        resolveTarget();
        return () => { active = false; };
    }, []);

    if (!targetPath) {
        return <div>Cargando redireccion...</div>;
    }

    return <Navigate to={targetPath} replace />;
}

// —— Layout routes ————————————————————————————————————————————————————————————————

interface RouteLoadError {
    status?: number;
    message: string;
}

export default function LayoutRoutes(): ReactElement {
    const [authorizedRoutes, setAuthorizedRoutes] = useState<AuthorizedRoutes | null>(null);
    const [menuTagRoutes, setMenuTagRoutes] = useState<RouteConfig[]>([]);
    const [routeLoadError, setRouteLoadError] = useState<RouteLoadError | null>(null);
    const { user } = useAuth();
    const { showLoading, hideLoading } = useLoading();
    const location = useLocation();

    useEffect(() => {
        showLoading();
        const timer = setTimeout(() => hideLoading(), 500);
        return () => clearTimeout(timer);
    }, [location.pathname, showLoading, hideLoading]);

    useEffect(() => {
        setRouteLoadError(null);
        setAuthorizedRoutes(null);

        const loadRoutes = async (): Promise<void> => {
            try {
                const [routes, tagsRes] = await Promise.all([
                    getAuthorizedRoutes(),
                    user ? resolveCurrentRouteMenuTags({ menuTipo: 'USER_DROPDOWN' }) : Promise.resolve({ data: [] }),
                ]);
                setAuthorizedRoutes(routes as AuthorizedRoutes);

                // Extraer rutas únicas de los menu tags que tengan componente definido
                const tagRoutes: RouteConfig[] = (tagsRes?.data ?? [])
                    .filter(tag => tag.ruta?.component && (tag.routePath || tag.ruta?.path))
                    .map(tag => ({
                        path: (tag.routePath || tag.ruta?.path || '')
                            .replace(/^\/admin\//, '')
                            .replace(/^\//, ''),
                        component: tag.ruta!.component!,
                    }))
                    .filter(r => r.path);

                setMenuTagRoutes(tagRoutes);
            } catch (error: any) {
                console.error('Error cargando rutas:', error);
                const status = error?.status ?? error?.response?.status ?? null;
                setRouteLoadError({
                    status,
                    message: error?.message || 'Error al cargar las rutas de la aplicacion',
                });
                setAuthorizedRoutes({ publicRoutes: [], adminRoutes: [], authRoutes: [] });
            }
        };

        const handleRoutesUpdated = (): void => {
            void loadRoutes();
        };

        void loadRoutes();
        window.addEventListener('admin-routes-updated', handleRoutesUpdated);

        return () => {
            window.removeEventListener('admin-routes-updated', handleRoutesUpdated);
        };
    }, [user]);

    if (routeLoadError) {
        const is403 = routeLoadError.status === 403;
        const is401 = routeLoadError.status === 401;
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-background gap-4 px-6 text-center">
                <div className={`rounded-full p-4 ${is403 || is401 ? 'bg-destructive/10' : 'bg-muted'}`}>
                    <svg className={`h-10 w-10 ${is403 || is401 ? 'text-destructive' : 'text-muted-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                </div>
                <div className="space-y-1">
                    <p className="text-base font-semibold text-foreground">
                        {is403 ? 'Sin permisos de acceso' : is401 ? 'Sesión no válida' : 'Error al cargar la sesión'}
                    </p>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        {is403
                            ? 'Tu cuenta no tiene permisos para acceder a este módulo. Contacta al administrador.'
                            : is401
                            ? 'Tu sesión expiró o no es válida. Vuelve a iniciar sesión.'
                            : routeLoadError.message}
                    </p>
                    {routeLoadError.status && (
                        <p className="text-xs text-muted-foreground/60 mt-1">Código: {routeLoadError.status}</p>
                    )}
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-2 text-sm text-primary underline underline-offset-4 hover:opacity-80 transition-opacity"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    if (!authorizedRoutes) {
        return <LoadingScreen />;
    }

    const renderFallbackElement = (route: RouteConfig): ReactElement => (
        <DynamicRouteFallback routePath={route.path} componentName={route.component} />
    );

    const renderRoutes = (routes: RouteConfig[], parentPath = ''): ReactElement[] => {
        return routes.map(route => {
            const LazyComponent = componentMap[route.component];
            const hasChildren = Array.isArray(route.children) && route.children.length > 0;

            // Ruta relativa al padre: quitar el prefijo del padre si viene con path completo
            const relativePath = parentPath && route.path.startsWith(parentPath)
                ? route.path.slice(parentPath.length).replace(/^\//, '')
                : route.path;

            const leafElement = LazyComponent
                ? <Suspense fallback={<div>Cargando...</div>}><LazyComponent /></Suspense>
                : renderFallbackElement(route);

            if (!hasChildren) {
                return (
                    <Route key={route.path} path={relativePath} element={leafElement} />
                );
            }

            // Ruta padre: usa <Outlet /> como contenedor para que los hijos
            // no se apilen sobre el componente padre. El componente del padre
            // se monta como index route, respetando la sincronización con componentMap.
            return (
                <Route key={route.path} path={relativePath} element={<Outlet />}>
                    <Route index element={leafElement} />
                    {renderRoutes(route.children!, route.path)}
                </Route>
            );
        }).filter(Boolean) as ReactElement[];
    };

    return (
        <Routes>
            <Route path="/" element={<RootRedirect user={user} />} />

            <Route element={<PublicLayout />}>
                <Route path="public/render" element={<Navigate to={getGovernedPublicHomePath()} replace />} />
                <Route path="public/render/home" element={<Home />} />
                <Route path="carrito" element={<Carrito />} />
                <Route path="public/render/carrito" element={<Carrito />} />
                <Route path="public/render/carrito-compras" element={<Carrito />} />
                <Route path="public/render/carrrto-compras" element={<Carrito />} />
                {authorizedRoutes.publicRoutes && renderRoutes(authorizedRoutes.publicRoutes)}
                <Route path="membresia/*" element={<MembershipRoutes />} />
                <Route path="cambiar-contrasena-provisional" element={<CambiarContrasenaProvisional />} />
                <Route path="activar-cuenta" element={<ActivacionCuenta />} />
                <Route path="recuperar-contrasena" element={<RecuperarContrasena />} />
                <Route path="recuperar/:token" element={<RecuperarContrasenaToken />} />
                {user && <Route path="perfil" element={<Perfil />} />}
            </Route>

            <Route element={<AuthLayout />}>
                {authorizedRoutes.authRoutes && renderRoutes(authorizedRoutes.authRoutes)}
            </Route>

            {authorizedRoutes.hybridRoutes && authorizedRoutes.hybridRoutes.length > 0 && (
                <Route element={<HybridLayout />}>
                    {renderRoutes(authorizedRoutes.hybridRoutes)}
                </Route>
            )}

            {user && authorizedRoutes?.adminRoutes && authorizedRoutes.adminRoutes.length > 0 && (
                <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminEntryRedirect />} />
                    {renderRoutes(authorizedRoutes.adminRoutes)}
                    {renderRoutes(menuTagRoutes)}
                    <Route path="*" element={<AdminEntryRedirect />} />
                </Route>
            )}

            <Route path="*" element={user ? <NotFound /> : <Navigate to={getGovernedPublicHomePath()} replace />} />
        </Routes>
    );
}

// PR hecho por Gustavo Pereira el 13-02-2026
