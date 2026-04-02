import { apiFetch, apiFetchPublic } from './api';
import { normalizeRoutePath, toRelativeRoutePath } from './routePathNormalizer';

interface RouteResponse {
    success: boolean;
    message: string;
    total: number;
    data: Array<{
        _id: string;
        iud?: string;
        name: string;
        path: string;
        component: string;
        layout: string;
        icon: string | null;
        tipoNodo?: string | null;
        padreId?: string | { _id?: string; iud?: string } | null;
        allowedRoles: Array<{ iud: string }>;
        estadoRuta: boolean;
        mostrarEnSidebar?: boolean;
        mostrarEnNavbarPublico?: boolean;
        mostrarEnMenuUsuario?: boolean;
        tiquetaNavb?: string | null;
        menuUsuarioLabel?: string | null;
        menuUsuarioOrder?: number;
        renderTag?: string | null;
        accessType: { _id: string; accessType: string; layout?: string } | Array<{ _id: string; accessType: string; layout?: string }>;
        order: number;
    }>;
}

interface RouteTreeResponse {
    success: boolean;
    message: string;
    total?: number;
    actorTipo?: string;
    sourceCollection?: string | null;
    data: Array<{
        _id?: string;
        iud?: string;
        name: string;
        path: string;
        component: string;
        layout: string;
        icon?: string | null;
        estadoRuta?: boolean;
        order?: number;
        tipoNodo?: string | null;
        children?: any[];
    }>;
}

interface HerenciaVista {
    _id?: string;
    iud?: string;
    path?: string;
    layout?: string;
    estadoRuta?: boolean;
}

interface HerenciaUsuarioResponse {
    ok?: boolean;
    herencias?: Array<{
        vistas?: HerenciaVista[];
    }>;
}

export interface AdminRouteConfig {
    path: string;
    component: string;
    children?: AdminRouteConfig[];
}

interface AuthorizedRoutes {
    publicRoutes?: Array<{ path: string; component: string }>;
    adminRoutes?: AdminRouteConfig[];
    authRoutes?: Array<{ path: string; component: string }>;
    hybridRoutes?: Array<{ path: string; component: string }>;
}

const normalizeLayout = (layout: string): string =>
    (layout || "").replace(/\//g, "").trim().toLowerCase();

const isAdminLayout = (layout: string): boolean => {
    const nl = normalizeLayout(layout);
    return nl === "adminlayout" || nl === "privatelayout";
};

const flattenAdminRoutes = (routes: AdminRouteConfig[] = []): AdminRouteConfig[] => {
    const flat: AdminRouteConfig[] = [];
    const walk = (items: AdminRouteConfig[] = []): void => {
        items.forEach((item) => {
            flat.push({ path: item.path, component: item.component });
            if (Array.isArray(item.children) && item.children.length > 0) {
                walk(item.children);
            }
        });
    };
    walk(routes);
    return flat;
};

const getHerenciaAdminPermitida = async (): Promise<{
    idsPermitidos: Set<string>;
    pathsPermitidos: Set<string>;
}> => {
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            return { idsPermitidos: new Set(), pathsPermitidos: new Set() };
        }

        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
        const result = await apiFetch(`${API_BASE_URL}/config/permisos/listar/usu/tenant/libres`, {
            method: "GET",
            useAuth: true
        }) as HerenciaUsuarioResponse | null;

        const idsPermitidos = new Set<string>();
        const pathsPermitidos = new Set<string>();

        const herencias = Array.isArray(result?.herencias) ? result.herencias : [];
        herencias.forEach((h) => {
            const vistas = Array.isArray(h.vistas) ? h.vistas : [];
            vistas.forEach((vista) => {
                if (!vista) return;
                if (vista.estadoRuta === false) return;
                if (vista.layout && !isAdminLayout(vista.layout)) return;

                const vistaId = String(vista._id || vista.iud || "").trim();
                if (vistaId) idsPermitidos.add(vistaId);

                const vistaPath = String(vista.path || "").trim();
                if (vistaPath) pathsPermitidos.add(normalizeRoutePath(vistaPath));
            });
        });

        return { idsPermitidos, pathsPermitidos };
    } catch (error) {
        console.error("Error al resolver herencias de vistas admin:", error);
        return { idsPermitidos: new Set(), pathsPermitidos: new Set() };
    }
};

export interface RouteCatalogItem {
    iud: string;
    path: string;
    layout: string;
    component: string;
    name: string;
    icon?: string | null;
    mostrarEnNavbarPublico?: boolean;
    mostrarEnSidebar?: boolean;
    mostrarEnMenuUsuario?: boolean;
    tiquetaNavb?: string | null;
    menuUsuarioLabel?: string | null;
    menuUsuarioOrder?: number;
    formulariosConfig?: {
        habilitado: boolean;
        modoAsignacion: 'TENANT' | 'USUARIO' | 'NINGUNO';
        soloDios?: boolean;
    };
}

export interface MenuUsuarioItem {
    key: string | null;
    label: string;
    path: string;
    icon: string | null;
    order: number;
}

export interface UserShortcutRoutes {
    admin: string;
    perfil: string;
    membresia: string;
}

export interface PublicNavItem {
    path: string;
    label: string;
    order: number;
}

export interface FooterNavItem {
    path: string;
    label: string;
    order: number;
}

export interface AdminNavItem {
    path: string;
    label: string;
    component: string;
    order: number;
}

export interface AdminNavTreeItem extends AdminNavItem {
    id: string;
    tipoNodo: string;
    children: AdminNavTreeItem[];
}

export type AdminActorTipo = 'SUPERADMIN' | 'GLOBAL' | 'CORPORATIVO' | 'UNKNOWN';

export interface AdminSidebarTreeContext {
    actorTipo: AdminActorTipo;
    sourceCollection: string | null;
    tree: AdminNavTreeItem[];
}

const isFormularioNode = (node: { tipoNodo?: string | null; children?: any[] }): boolean =>
    String(node?.tipoNodo || '').trim().toUpperCase() === 'FORMULARIO';

const filterRootsByActorTipo = (roots: AdminNavTreeItem[], actorTipo: AdminActorTipo): AdminNavTreeItem[] => {
    if (actorTipo === 'SUPERADMIN') return roots;
    return roots.filter((node) => !isFormularioNode(node) || (Array.isArray(node.children) && node.children.length > 0));
};

const resolveSidebarSourceCollection = (actorTipo: AdminActorTipo): string | null => {
    if (actorTipo === 'SUPERADMIN') return 'rutasSeguridad';
    if (actorTipo === 'GLOBAL') return 'herenciaGlobal';
    if (actorTipo === 'CORPORATIVO') return 'herenciaCorporativa';
    return null;
};

const resolveEffectiveAdminActorTipo = (actorTipo?: string | null): AdminActorTipo => {
    const validActorTipos: string[] = ['SUPERADMIN', 'GLOBAL', 'CORPORATIVO'];
    const actorNormalizado = String(actorTipo || '').trim().toUpperCase();
    if (actorNormalizado && actorNormalizado !== 'UNKNOWN' && validActorTipos.includes(actorNormalizado)) {
        return actorNormalizado as AdminActorTipo;
    }
    return resolveAdminActorTipoFromToken();
};

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
    try {
        const parts = String(token || '').split('.');
        if (parts.length < 2) return null;
        const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        const decoded = globalThis.atob(padded);
        return JSON.parse(decoded) as Record<string, unknown>;
    } catch {
        return null;
    }
};

const resolveAdminActorTipoFromToken = (): AdminActorTipo => {
    try {
        const token = localStorage.getItem('token');
        if (!token) return 'UNKNOWN';

        const payload = decodeJwtPayload(token) as any;
        const tenantScope = payload?.auth?.tenantScope || payload?.tenantScope || {};
        const rol = String(payload?.rol?.rol || payload?.rol || '').trim().toUpperCase();

        if (String(tenantScope?.tenantCorporativoId || '').trim()) return 'CORPORATIVO';
        if (String(tenantScope?.tenantGlobalId || '').trim()) return 'GLOBAL';
        if (String(tenantScope?.tenantSuperAdminId || '').trim()) return 'SUPERADMIN';
        if (['DIOS', 'DESAROLLADOR'].includes(rol)) return 'SUPERADMIN';
        return 'UNKNOWN';
    } catch {
        return 'UNKNOWN';
    }
};

const fetchAllSecurityRoutes = async (useAuth: boolean): Promise<RouteResponse | null> => {
    try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
        const endpoint = useAuth
            ? `${API_BASE_URL}/seguridad/rutas/listarRutas/admin`
            : `${API_BASE_URL}/seguridad/rutas/listarRutas/public`;

        const result: RouteResponse = useAuth
            ? await apiFetch(endpoint, {
                method: "GET",
                useAuth: true,
                logoutOn401: true
            })
            : await apiFetchPublic(endpoint, {
                method: "GET"
            });
        return result;
    } catch (error) {
        console.error("Error al obtener rutas de seguridad:", error);
        return null;
    }
};

export const getRouteCatalog = async (): Promise<RouteCatalogItem[]> => {
    try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

        const result: RouteResponse = await apiFetch(`${API_BASE_URL}/seguridad/rutas/listarRutas/admin`, {
            method: "GET",
            headers: {
                "x-token": localStorage.getItem("token") || ""
            }
        });

        if (!result.success || !result.data) {
            return [];
        }

        return result.data
            .filter((r) => r.estadoRuta)
            .map((r) => ({
                iud: String(r.iud || r._id || ''),
                path: normalizeRoutePath(r.path),
                layout: r.layout.replace("/", "").trim(),
                component: r.component.replace(/\.(jsx|tsx|js|ts)$/i, ""),
                name: r.name,
                icon: r.icon ?? null,
                mostrarEnNavbarPublico: r.mostrarEnNavbarPublico === true,
                mostrarEnSidebar: r.mostrarEnSidebar === true,
                mostrarEnMenuUsuario: r.mostrarEnMenuUsuario === true,
                tiquetaNavb: String(r.tiquetaNavb || '').trim() || null,
                menuUsuarioLabel: String(r.menuUsuarioLabel || '').trim() || null,
                menuUsuarioOrder: Number(r.menuUsuarioOrder ?? 0),
            }));
    } catch (error) {
        console.error("Error al obtener catalogo de rutas:", error);
        return [];
    }
};

const normalizeText = (value: string): string =>
    String(value || '').trim().toLowerCase();

const toAppRoutePath = (route: RouteCatalogItem): string => {
    const normalizedPath = normalizeRoutePath(route.path);
    if (isAdminLayout(route.layout)) {
        return normalizedPath.startsWith('/admin')
            ? normalizedPath
            : `/admin/${toRelativeRoutePath(normalizedPath)}`;
    }
    return normalizedPath;
};

const findCatalogRoute = (
    catalog: RouteCatalogItem[],
    options: {
        paths?: string[];
        components?: string[];
        names?: string[];
    }
): RouteCatalogItem | undefined => {
    const expectedPaths = new Set((options.paths || []).map((value) => normalizeRoutePath(value)));
    const expectedComponents = new Set((options.components || []).map(normalizeText));
    const expectedNames = new Set((options.names || []).map(normalizeText));

    return catalog.find((route) => {
        const routePath = normalizeRoutePath(route.path);
        const routeComponent = normalizeText(route.component);
        const routeName = normalizeText(route.name);

        return expectedPaths.has(routePath)
            || expectedComponents.has(routeComponent)
            || expectedNames.has(routeName);
    });
};

export const getUserShortcutRoutes = async (): Promise<UserShortcutRoutes> => {
    try {
        const catalog = await getRouteCatalog();

        const adminByMenu = catalog.find((route) => route.mostrarEnMenuUsuario && route.tiquetaNavb === 'PANEL_ADMIN');
        const perfilByMenu = catalog.find((route) => route.mostrarEnMenuUsuario && route.tiquetaNavb === 'MI_PERFIL');
        const membresiaByMenu = catalog.find((route) => route.mostrarEnMenuUsuario && route.tiquetaNavb === 'MI_MEMBRESIA');

        const adminRoute = adminByMenu || findCatalogRoute(catalog, {
            paths: ['/admin/gestor-rutas/administracion/dashboardadmin', '/admin/dashboardadmin', '/admin/dashboard'],
            components: ['DashboardAdmin'],
            names: ['DashboardAdmin', 'Panel Admin', 'Dashboard'],
        });

        const perfilRoute = perfilByMenu || findCatalogRoute(catalog, {
            paths: ['/perfil', '/mi-perfil', '/perfil/usuario'],
            components: ['Perfil', 'ConfiguracionPerfil'],
            names: ['Perfil', 'Mi Perfil'],
        });

        const membresiaRoute = membresiaByMenu || findCatalogRoute(catalog, {
            paths: ['/membresia/dashboard', '/mi-membresia'],
            components: ['MembershipDashboard'],
            names: ['Mi Membresía', 'Mi Membresia', 'Membresía', 'Membresia'],
        });

        return {
            admin: adminRoute ? toAppRoutePath(adminRoute) : '/admin/gestor-rutas/administracion/dashboardadmin',
            perfil: perfilRoute ? toAppRoutePath(perfilRoute) : '/perfil',
            membresia: membresiaRoute ? toAppRoutePath(membresiaRoute) : '/membresia/dashboard',
        };
    } catch (error) {
        console.error('Error al resolver shortcuts de usuario:', error);
        return {
            admin: '/admin/gestor-rutas/administracion/dashboardadmin',
            perfil: '/perfil',
            membresia: '/membresia/dashboard',
        };
    }
};

export const getAuthorizedRoutes = async (): Promise<AuthorizedRoutes> => {
    try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
        const token = localStorage.getItem("token");
        const hasToken = Boolean(token);
        const actorTipo = resolveAdminActorTipoFromToken();
        const endpoint = hasToken
            ? `${API_BASE_URL}/seguridad/rutas/listarRutas/admin`
            : `${API_BASE_URL}/seguridad/rutas/listarRutas/public`;

        const result: RouteResponse = hasToken
            ? await apiFetch(endpoint, {
                method: "GET",
                useAuth: true,
                logoutOn401: true
            })
            : await apiFetchPublic(endpoint, {
                method: "GET"
            });

        if (!result.success || !result.data) {
            return { publicRoutes: [], adminRoutes: [], authRoutes: [] };
        }

        // Normaliza nombres de componentes (strip extensiones y puntos trailing de la BD)
        const normalizeComponent = (name: string) =>
            name.replace(/\.(jsx|tsx|js|ts)$/i, "").replace(/\.+$/, "").trim();

        // Helpers para detectar rutas híbridas (múltiples accessType que cruzan contextos)
        const getAccessTypeEntries = (r: typeof result.data[number]) => {
            if (!r.accessType) return [];
            return Array.isArray(r.accessType) ? r.accessType : [r.accessType];
        };
        const hasPublicEntry = (r: typeof result.data[number]) =>
            getAccessTypeEntries(r).some(t => String(t.accessType || '').toUpperCase().includes('PUBLIC'));
        const hasPrivateEntry = (r: typeof result.data[number]) =>
            getAccessTypeEntries(r).some(t => {
                const v = String(t.accessType || '').toUpperCase();
                return v.includes('PRIVATE') || v.includes('AUTH') || v.includes('ADMIN');
            });
        const isHybrid = (r: typeof result.data[number]) =>
            r.estadoRuta && getAccessTypeEntries(r).length > 1 && hasPublicEntry(r) && hasPrivateEntry(r);

        // HYBRID: accesible tanto sin sesión (PublicLayout) como con sesión (AdminLayout)
        const hybridRoutes = result.data
            .filter(isHybrid)
            .map(r => ({
                path: toRelativeRoutePath(r.path),
                component: normalizeComponent(r.component),
            }));

        const hybridPaths = new Set(hybridRoutes.map(r => r.path));

        // PUBLIC
        const publicRoutes = result.data
            .filter(r => r.estadoRuta && normalizeLayout(r.layout) === "publiclayout" && !isHybrid(r))
            .map(r => ({
                path: toRelativeRoutePath(r.path),
                component: normalizeComponent(r.component),
            }));

        // AUTH
        const authRoutes = result.data
            .filter(r => r.estadoRuta && normalizeLayout(r.layout) === "authlayout" && !hybridPaths.has(toRelativeRoutePath(r.path)))
            .map(r => ({
                path: toRelativeRoutePath(r.path),
                component: normalizeComponent(r.component),
            }));

        // ADMIN: priorizar el arbol autorizado backend para evitar desalineacion
        // entre sidebar y rutas registradas en React Router.
        let adminRoutes: AdminRouteConfig[] = [];
        if (hasToken) {
            const { tree } = await getAdminSidebarTreeWithContext();
            const [resultTreeFallback, herencia] = await Promise.all([
                fetchAllSecurityRoutes(true),
                getHerenciaAdminPermitida()
            ]);

            const mapNode = (node: AdminNavTreeItem): AdminRouteConfig => ({
                path: toRelativeRoutePath(node.path.replace(/^\/admin\/?/i, '')),
                component: normalizeComponent(node.component),
                ...(node.children?.length ? { children: node.children.map(mapNode) } : {}),
            });

            if (tree.length > 0) {
                adminRoutes = tree.map(mapNode);
            }

            const adminSource = (resultTreeFallback?.success && Array.isArray(resultTreeFallback?.data))
                ? resultTreeFallback.data.filter((r) => r.estadoRuta && isAdminLayout(r.layout))
                : result.data.filter((r) => r.estadoRuta && isAdminLayout(r.layout));
            const hasHerenciaAdmin = herencia.idsPermitidos.size > 0 || herencia.pathsPermitidos.size > 0;
            const adminFiltrado = hasHerenciaAdmin
                ? adminSource.filter((r) => {
                    const routeId = String(r._id || r.iud || "");
                    const routePath = normalizeRoutePath(r.path);
                    return herencia.idsPermitidos.has(routeId) || herencia.pathsPermitidos.has(routePath);
                })
                : (actorTipo === 'SUPERADMIN' ? adminSource : []);

            if (tree.length === 0) {
                adminRoutes = adminFiltrado.map((r) => ({
                    path: toRelativeRoutePath(String(r.path || '').replace(/^\/admin\/?/i, '')),
                    component: normalizeComponent(r.component),
                }));
            } else {
                const existingPaths = new Set(
                    flattenAdminRoutes(adminRoutes).map((route) => normalizeRoutePath(`/admin/${route.path.replace(/^\//, '')}`))
                );

                const rutasFaltantes = adminFiltrado
                    .map((r) => ({
                        path: toRelativeRoutePath(String(r.path || '').replace(/^\/admin\/?/i, '')),
                        component: normalizeComponent(r.component),
                    }))
                    .filter((r) => {
                        const normalized = normalizeRoutePath(`/admin/${String(r.path || '').replace(/^\//, '')}`);
                        return r.path && !existingPaths.has(normalized);
                    });

                if (rutasFaltantes.length) {
                    adminRoutes = [...adminRoutes, ...rutasFaltantes];
                }
            }
        }

        return { publicRoutes, authRoutes, adminRoutes, hybridRoutes };

    } catch (error) {
        console.error("Error al obtener rutas autorizadas:", error);
        return { publicRoutes: [], adminRoutes: [], authRoutes: [] };
    }
};

// export const getPublicNavigationRoutes = async (): Promise<PublicNavItem[]> => {
//     try {
//         const result = await fetchAllSecurityRoutes(false);

//         if (!result?.success || !result?.data) {
//             return [];
//         }

//         return result.data
//             .filter((route) =>
//                 route.estadoRuta &&
//                 normalizeLayout(route.layout) === "publiclayout" &&
//                 route.mostrarEnNavbarPublico === true
//             )
//             .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
//             .map((route) => ({
//                 path: normalizeRoutePath(route.path),
//                 label: route.name,
//                 order: route.order ?? 0
//             }));
//     } catch (error) {
//         console.error("Error al obtener rutas de navegacion publica:", error);
//         return [];
//     }
// };

export const getPublicNavigationRoutes = async (
    isAuthenticated: boolean = false
): Promise<PublicNavItem[]> => {
    try {
        const result = await fetchAllSecurityRoutes(false);

        if (!result?.success || !result?.data) {
            return [];
        }

        const targetAccessType = isAuthenticated ? 'PRIVATE' : 'PUBLIC';

        return result.data
            .filter((route) => {
                // Debe estar activa
                if (!route.estadoRuta) return false;

                // Debe tener accessType definido
                const accessTypes = Array.isArray(route.accessType)
                    ? route.accessType.map((a: any) =>
                        typeof a === 'string' ? a : a?.accessType
                    )
                    : [];

                if (accessTypes.length === 0) return false;

                // Filtrar por PUBLIC cuando no hay sesión, PRIVATE cuando sí hay
                if (!accessTypes.includes(targetAccessType)) return false;

                // Solo rutas marcadas para el navbar
                // Se usa renderTag o mostrarEnNavbarPublico como criterio secundario
                const tieneRenderTag = route.renderTag === 'publico-view' || route.renderTag === 'private-view';
                const tieneNavbarFlag = route.mostrarEnNavbarPublico === true || route.mostrarEnSidebar === true;

                return tieneRenderTag || tieneNavbarFlag;
            })
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((route) => ({
                path: normalizeRoutePath(route.path),
                label: route.name,
                order: route.order ?? 0,
            }));
    } catch (error) {
        console.error("Error al obtener rutas de navegacion publica:", error);
        return [];
    }
};

export const getFooterPublicRoutes = async (): Promise<FooterNavItem[]> => {
    try {
        const result = await fetchAllSecurityRoutes(false);
        if (!result?.success || !Array.isArray(result.data)) return [];

        return result.data
            .filter((route) =>
                route.estadoRuta &&
                normalizeLayout(route.layout) === "publiclayout" &&
                String(route.path || "").trim() !== "/"
            )
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((route) => ({
                path: normalizeRoutePath(route.path),
                label: route.name,
                order: route.order ?? 0
            }));
    } catch (error) {
        console.error("Error al obtener rutas para footer:", error);
        return [];
    }
};

export const getAdminSidebarRoutes = async (): Promise<AdminNavItem[]> => {
    try {
        const token = localStorage.getItem("token");
        if (!token) return [];
        const actorTipo = resolveAdminActorTipoFromToken();

        const [result, herencia] = await Promise.all([
            fetchAllSecurityRoutes(true),
            getHerenciaAdminPermitida()
        ]);

        if (!result?.success || !Array.isArray(result?.data)) return [];

        const adminSource = result.data.filter((r) => r.estadoRuta && isAdminLayout(r.layout));
        const hasHerenciaAdmin = herencia.idsPermitidos.size > 0 || herencia.pathsPermitidos.size > 0;
        const adminFiltrado = hasHerenciaAdmin
            ? adminSource.filter((r) => {
                const routeId = String(r._id || r.iud || "");
                const routePath = normalizeRoutePath(r.path);
                return herencia.idsPermitidos.has(routeId) || herencia.pathsPermitidos.has(routePath);
            }) : [];

        const isSuperadmin = actorTipo === 'SUPERADMIN';
        const fallbackResult = isSuperadmin ? adminSource : [];
        const resultado = adminFiltrado.length > 0 ? adminFiltrado : fallbackResult;

        return resultado
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((r) => ({
                path: normalizeRoutePath(r.path),
                label: r.name,
                component: r.component.replace(/\.(jsx|tsx|js|ts)$/i, ""),
                order: r.order ?? 0
            }));
    } catch (error) {
        console.error("Error al obtener menu Admin por herencia:", error);
        return [];
    }
};

const mapTreeNodes = (nodes: RouteTreeResponse['data']): AdminNavTreeItem[] => {
    const mapper = (node: any): AdminNavTreeItem => ({
        id: String(node?._id || node?.iud || ''),
        path: normalizeRoutePath(node?.path || ''),
        label: String(node?.name || ''),
        component: String(node?.component || '').replace(/\.(jsx|tsx|js|ts)$/i, ''),
        order: Number(node?.order ?? 0),
        tipoNodo: String(node?.tipoNodoId?.codigo || node?.tipoNodo || '').toUpperCase(),
        children: Array.isArray(node?.children) ? node.children.map(mapper) : []
    });

    return Array.isArray(nodes)
        ? nodes.map(mapper).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        : [];
};

export const getAdminSidebarTree = async (): Promise<AdminNavTreeItem[]> => {
    const context = await getAdminSidebarTreeWithContext();
    return context.tree;
};

export const getAdminSidebarFallbackTree = async (actorTipo: AdminActorTipo): Promise<AdminNavTreeItem[]> => {
    try {
        const token = localStorage.getItem("token");
        if (!token) return [];
        const effectiveActorTipo = resolveEffectiveAdminActorTipo(actorTipo);

        const [result, herencia] = await Promise.all([
            fetchAllSecurityRoutes(true),
            getHerenciaAdminPermitida()
        ]);

        if (!result?.success || !Array.isArray(result?.data)) return [];

        const adminSource = result.data.filter((r) =>
            r.estadoRuta &&
            isAdminLayout(r.layout) &&
            r.mostrarEnSidebar !== false
        );

        const hasHerenciaAdmin = herencia.idsPermitidos.size > 0 || herencia.pathsPermitidos.size > 0;
        const filterEdByHerencia = hasHerenciaAdmin
            ? adminSource.filter((r) => {
                const routeId = String(r._id || r.iud || "");
                const routePath = normalizeRoutePath(r.path);
                return herencia.idsPermitidos.has(routeId) || herencia.pathsPermitidos.has(routePath);
            })
            : [];

        const isSuperAdminEff = effectiveActorTipo === 'SUPERADMIN';
        const visibleFallback = isSuperAdminEff ? adminSource : [];
        const visibles = filterEdByHerencia.length > 0 ? filterEdByHerencia : visibleFallback;

        if (!visibles.length) return [];

        const nodesById = new Map<string, AdminNavTreeItem>();
        visibles.forEach((route) => {
            const id = String(route._id || route.iud || '').trim();
            if (!id) return;
            nodesById.set(id, {
                id,
                path: normalizeRoutePath(route.path),
                label: String(route.name || '').trim(),
                component: String(route.component || '').replace(/\.(jsx|tsx|js|ts)$/i, ''),
                order: Number(route.order ?? 0),
                tipoNodo: String(route.tipoNodo || 'FORMULARIO').toUpperCase(),
                children: []
            });
        });

        const roots: AdminNavTreeItem[] = [];
        visibles.forEach((route) => {
            const id = String(route._id || route.iud || '').trim();
            const currentNode = nodesById.get(id);
            if (!currentNode) return;

            const parentRaw = route.padreId;
            const parentId = typeof parentRaw === 'string'
                ? String(parentRaw).trim()
                : String(parentRaw?._id || parentRaw?.iud || '').trim();

            if (parentId && nodesById.has(parentId)) {
                nodesById.get(parentId)?.children.push(currentNode);
            } else if (parentId && effectiveActorTipo === 'SUPERADMIN') {
                roots.push(currentNode);
            } else if (!parentId) {
                roots.push(currentNode);
            }
        });

        const sortTree = (items: AdminNavTreeItem[]): void => {
            items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            items.forEach((item) => sortTree(item.children || []));
        };
        sortTree(roots);

        return filterRootsByActorTipo(roots, effectiveActorTipo);
    } catch (error) {
        console.error("Error al construir arbol fallback admin dinamico:", error);
        return [];
    }
};

export const getAdminSidebarTreeWithContext = async (): Promise<AdminSidebarTreeContext> => {
    try {
        const token = localStorage.getItem('token');
        if (!token) return { actorTipo: 'UNKNOWN', sourceCollection: null, tree: [] };
        const actorTipoJwt = resolveAdminActorTipoFromToken();

        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
        const treeResult: RouteTreeResponse = await apiFetch(`${API_BASE_URL}/seguridad/rutas/listarRutas/arbol/admin`, {
            method: 'GET',
            useAuth: true,
            logoutOn401: true
        });

        if (treeResult?.success && Array.isArray(treeResult?.data)) {
            const actorTipoBackend = String(treeResult?.actorTipo || '').trim().toUpperCase() as AdminActorTipo;
            const actorTipo = actorTipoJwt === 'UNKNOWN' ? resolveEffectiveAdminActorTipo(actorTipoBackend) : actorTipoJwt;
            const sourceCollection = resolveSidebarSourceCollection(actorTipo);
            return {
                actorTipo,
                sourceCollection,
                tree: filterRootsByActorTipo(mapTreeNodes(treeResult.data), actorTipo)
            };
        }
        const actorTipo = actorTipoJwt;
        return {
            actorTipo,
            sourceCollection: resolveSidebarSourceCollection(actorTipo),
            tree: []
        };
    } catch (error) {
        console.error('Error al obtener arbol admin por contexto:', error);
        const actorTipo = resolveAdminActorTipoFromToken();
        return {
            actorTipo,
            sourceCollection: resolveSidebarSourceCollection(actorTipo),
            tree: []
        };
    }
};

export const getPrivateHomeRoute = async (): Promise<string> => {
    try {
        const shortcuts = await getUserShortcutRoutes();
        if (shortcuts.admin?.trim()) {
            return shortcuts.admin;
        }
        return "/admin/gestor-rutas/administracion/dashboardadmin";
    } catch (_error) {
        return "/admin/gestor-rutas/administracion/dashboardadmin";
    }
};

/**
 * Retorna la ruta home del panel admin si el catálogo del usuario incluye
 * al menos una ruta con layout admin; de lo contrario retorna null.
 * No depende de roles hardcodeados: la decisión la toma el backend según el JWT.
 */
export const getAdminHomeRoute = async (): Promise<string | null> => {
    try {
        const catalog = await getRouteCatalog();
        if (!catalog.length) return null;

        const adminEntry =
            catalog.find((r) => r.mostrarEnMenuUsuario && r.tiquetaNavb === 'PANEL_ADMIN') ||
            findCatalogRoute(catalog, {
                paths: ['/admin/gestor-rutas/administracion/dashboardadmin', '/admin/dashboardadmin', '/admin/dashboard'],
                components: ['DashboardAdmin'],
                names: ['DashboardAdmin', 'Panel Admin', 'Dashboard'],
            }) ||
            catalog.find((r) => isAdminLayout(r.layout));

        return adminEntry ? toAppRoutePath(adminEntry) : null;
    } catch {
        return null;
    }
};

/**
 * Retorna los ítems del menú de usuario desde el endpoint de menu-tags,
 * que aplica la lógica de alcance (SuperAdmin, TenantGlobal, TenantCorporativo, General).
 */
export const getMenuUsuarioRoutes = async (): Promise<MenuUsuarioItem[]> => {
    try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
        const result = await apiFetch(
            `${API_BASE_URL}/seguridad/rutas/menu-tags/resolver/actual?menuTipo=USER_DROPDOWN`,
            { method: 'GET', useAuth: true, logoutOn401: false }
        );

        if (!result?.success || !Array.isArray(result?.data)) return [];

        return result.data
            .filter((t: any) => t?.estado !== false)
            .map((t: any) => ({
                key: String(t.codigo || t.iud || ''),
                label: String(t.label || t.nombreTag || ''),
                path: String(t.routePath || t.ruta?.path || '/'),
                icon: t.iconKey ?? null,
                order: Number(t.order ?? 0),
            }));
    } catch {
        return [];
    }
};
