import { Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom';
import { useState, useEffect, ReactElement, lazy, Suspense } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { getAuthorizedRoutes, getPrivateHomeRoute } from '@/app/services/routeService';
import { useLoading } from '@/app/providers/LoadingProvider';

import PublicLayout from '@/app/presentation/layouts/PublicLayout';
import AuthLayout from '@/app/presentation/layouts/AuthLayout';
import AdminLayout from '@/app/presentation/layouts/AdminLayout';
import { MembershipRoutes } from './MembershipRoutes';

// Imports directos para rutas especiales fuera del componentMap dinámico
import CambiarContrasenaProvisional from '@/app/presentation/pages/cambiar-contrasena/CambiarContrasenaProvisional';
import ActivacionCuenta from '../presentation/pages/activar-cuenta/ActivaciónCuenta';
import Perfil from '@/app/presentation/pages/perfil/Perfil';
import RecuperarContrasena from '@/app/presentation/pages/recuperar-contrasena/RecuperarContrasena';
import RecuperarContrasenaToken from '@/app/presentation/pages/recuperar-contrasena/RecuperarContrasenaToken';

// ── Dynamic component map via Vite glob ───────────────────────────────────────
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
            map[match[1]] = lazy(() => mod().then(m => ({ default: m.default })));
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

    return map;
};

const componentMap = buildComponentMap();

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Admin redirect ─────────────────────────────────────────────────────────────

function AdminEntryRedirect(): ReactElement {
    const [targetPath, setTargetPath] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        const resolveTarget = async (): Promise<void> => {
            try {
                const nextPath = await getPrivateHomeRoute();
                if (!active) return;
                setTargetPath(nextPath?.trim() || '/');
            } catch (_error) {
                if (!active) return;
                setTargetPath('/');
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

// ── Layout routes ──────────────────────────────────────────────────────────────

export default function LayoutRoutes(): ReactElement {
    const [authorizedRoutes, setAuthorizedRoutes] = useState<AuthorizedRoutes | null>(null);
    const { user } = useAuth();
    const { showLoading, hideLoading } = useLoading();
    const location = useLocation();

    useEffect(() => {
        showLoading();
        const timer = setTimeout(() => hideLoading(), 500);
        return () => clearTimeout(timer);
    }, [location.pathname, showLoading, hideLoading]);

    useEffect(() => {
        const loadRoutes = async (): Promise<void> => {
            try {
                const routes = await getAuthorizedRoutes();
                setAuthorizedRoutes(routes as AuthorizedRoutes);
            } catch (error) {
                console.error('Error cargando rutas:', error);
                setAuthorizedRoutes({ publicRoutes: [], adminRoutes: [], authRoutes: [] });
            }
        };

        loadRoutes();
    }, [user]);

    if (!authorizedRoutes) {
        return <div>Cargando rutas...</div>;
    }

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
                : (() => {
                    console.warn('Componente no encontrado:', route.component);
                    return (
                        <div className="p-6 text-sm text-muted-foreground">
                            Componente no registrado: {route.component}
                        </div>
                    );
                })();

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
            <Route element={<PublicLayout />}>
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
                    <Route path="*" element={<AdminEntryRedirect />} />
                </Route>
            )}
        </Routes>
    );
}

// PR hecho por Gustavo Pereira el 13-02-2026
