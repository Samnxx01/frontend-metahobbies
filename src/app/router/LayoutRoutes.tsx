import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
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

    const renderRoutes = (routes: RouteConfig[]): ReactElement[] => {
        return routes.map(route => {
            const LazyComponent = componentMap[route.component];

            if (!LazyComponent) {
                console.warn('Componente no encontrado:', route.component);
                return (
                    <Route
                        key={route.path}
                        path={route.path}
                        element={
                            <div className="p-6 text-sm text-muted-foreground">
                                Componente no registrado: {route.component}
                            </div>
                        }
                    />
                );
            }

            return (
                <Route
                    key={route.path}
                    path={route.path}
                    element={
                        <Suspense fallback={<div>Cargando...</div>}>
                            <LazyComponent />
                        </Suspense>
                    }
                />
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
                {user && <Route path="perfil" element={<Perfil />} />}
            </Route>

            <Route element={<AuthLayout />}>
                {authorizedRoutes.authRoutes && renderRoutes(authorizedRoutes.authRoutes)}
            </Route>

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
