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
        menuUsuarioKey?: string | null;
        menuUsuarioLabel?: string | null;
        menuUsuarioOrder?: number;
        accessType: { _id: string; accessType: string; layout?: string } | Array<{ _id: string; accessType: string; layout?: string }>;
        order: number;
    }>;
}

interface RouteTreeResponse {
    success: boolean;
    message: string;
    total?: number;
    actorTipo?: string;
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

interface AuthorizedRoutes {
    publicRoutes?: Array<{ path: string; component: string }>;
    adminRoutes?: Array<{ path: string; component: string }>;
    authRoutes?: Array<{ path: string; component: string }>;
}

const normalizeLayout = (layout: string): string =>
    (layout || "").replace(/\//g, "").trim().toLowerCase();

const isAdminLayout = (layout: string): boolean => {
    const nl = normalizeLayout(layout);
    return nl === "adminlayout" || nl === "privatelayout";
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
    path: string;
    layout: string;
    component: string;
    name: string;
    mostrarEnMenuUsuario?: boolean;
    menuUsuarioKey?: string | null;
    menuUsuarioLabel?: string | null;
    menuUsuarioOrder?: number;
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
    tree: AdminNavTreeItem[];
}

const isFormularioNode = (node: { tipoNodo?: string | null; children?: any[] }): boolean =>
    String(node?.tipoNodo || '').trim().toUpperCase() === 'FORMULARIO';

const filterRootsByActorTipo = (roots: AdminNavTreeItem[], actorTipo: AdminActorTipo): AdminNavTreeItem[] => {
    if (actorTipo === 'SUPERADMIN') return roots;
    return roots.filter((node) => !isFormularioNode(node) || (Array.isArray(node.children) && node.children.length > 0));
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
                path: normalizeRoutePath(r.path),
                layout: r.layout.replace("/", "").trim(),
                component: r.component.replace(/\.(jsx|tsx|js|ts)$/i, ""),
                name: r.name,
                mostrarEnMenuUsuario: r.mostrarEnMenuUsuario === true,
                menuUsuarioKey: String(r.menuUsuarioKey || '').trim() || null,
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
    const expectedPaths = (options.paths || []).map((value) => normalizeRoutePath(value));
    const expectedComponents = (options.components || []).map(normalizeText);
    const expectedNames = (options.names || []).map(normalizeText);

    return catalog.find((route) => {
        const routePath = normalizeRoutePath(route.path);
        const routeComponent = normalizeText(route.component);
        const routeName = normalizeText(route.name);

        return expectedPaths.includes(routePath)
            || expectedComponents.includes(routeComponent)
            || expectedNames.includes(routeName);
    });
};

export const getUserShortcutRoutes = async (): Promise<UserShortcutRoutes> => {
    try {
        const catalog = await getRouteCatalog();

        const adminByMenu = catalog.find((route) => route.mostrarEnMenuUsuario && route.menuUsuarioKey === 'PANEL_ADMIN');
        const perfilByMenu = catalog.find((route) => route.mostrarEnMenuUsuario && route.menuUsuarioKey === 'MI_PERFIL');
        const membresiaByMenu = catalog.find((route) => route.mostrarEnMenuUsuario && route.menuUsuarioKey === 'MI_MEMBRESIA');

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
            admin: adminRoute ? toAppRoutePath(adminRoute) : '/admin/dashboard',
            perfil: perfilRoute ? toAppRoutePath(perfilRoute) : '/perfil',
            membresia: membresiaRoute ? toAppRoutePath(membresiaRoute) : '/membresia/dashboard',
        };
    } catch (error) {
        console.error('Error al resolver shortcuts de usuario:', error);
        return {
            admin: '/admin/dashboard',
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
        const herencia = hasToken ? await getHerenciaAdminPermitida() : { idsPermitidos: new Set<string>(), pathsPermitidos: new Set<string>() };
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

        // Normaliza nombres de componentes
        const normalizeComponent = (name: string) =>
            name.replace(/\.(jsx|tsx|js|ts)$/i, "");

        // PUBLIC
        const publicRoutes = result.data
            .filter(r => r.estadoRuta && normalizeLayout(r.layout) === "publiclayout")
            .map(r => ({
                path: toRelativeRoutePath(r.path),
                component: normalizeComponent(r.component),
            }));

        // AUTH
        const authRoutes = result.data
            .filter(r => r.estadoRuta && normalizeLayout(r.layout) === "authlayout")
            .map(r => ({
                path: toRelativeRoutePath(r.path),
                component: normalizeComponent(r.component),
            }));

        // ADMIN: priorizar el arbol autorizado backend para evitar desalineacion
        // entre sidebar y rutas registradas en React Router.
        let adminRoutes: Array<{ path: string; component: string }> = [];
        if (hasToken) {
            const { tree, actorTipo } = await getAdminSidebarTreeWithContext();
            const flattenTree = (nodes: AdminNavTreeItem[]): AdminNavTreeItem[] =>
                nodes.flatMap((node) => [node, ...flattenTree(node.children || [])]);

            const flattened = flattenTree(tree);
            if (flattened.length > 0) {
                const dynamicRoutes = flattened.map((node) => ({
                    path: toRelativeRoutePath(node.path.replace(/^\/admin\//i, '')),
                    component: normalizeComponent(node.component),
                }));
                // SUPERADMIN: si ya hay herencia (rutas dinamicas), usar solo BD.
                adminRoutes = dynamicRoutes;
            } else {
                const adminSource = result.data.filter((r) => r.estadoRuta && isAdminLayout(r.layout));
                const hasHerenciaAdmin = herencia.idsPermitidos.size > 0 || herencia.pathsPermitidos.size > 0;
                const adminFiltrado = hasHerenciaAdmin
                    ? adminSource.filter((r) => {
                        const routeId = String(r._id || r.iud || "");
                        const routePath = normalizeRoutePath(r.path);
                        return herencia.idsPermitidos.has(routeId) || herencia.pathsPermitidos.has(routePath);
                    })
                    : adminSource;

                adminRoutes = adminFiltrado.map((r) => ({
                    path: toRelativeRoutePath(String(r.path || '').replace(/^\/admin\//i, '')),
                    component: normalizeComponent(r.component),
                }));
            }
        }

        return { publicRoutes, authRoutes, adminRoutes };

    } catch (error) {
        console.error("Error al obtener rutas autorizadas:", error);
        return { publicRoutes: [], adminRoutes: [], authRoutes: [] };
    }
};

export const getPublicNavigationRoutes = async (): Promise<PublicNavItem[]> => {
    try {
        const result = await fetchAllSecurityRoutes(false);

        if (!result?.success || !result?.data) {
            return [];
        }

        return result.data
            .filter((route) =>
                route.estadoRuta &&
                normalizeLayout(route.layout) === "publiclayout" &&
                route.mostrarEnNavbarPublico === true
            )
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((route) => ({
                path: normalizeRoutePath(route.path),
                label: route.name,
                order: route.order ?? 0
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
            })
            : adminSource;

        return adminFiltrado
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
        tipoNodo: String(node?.tipoNodo || '').toUpperCase(),
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
        const visibles = hasHerenciaAdmin
            ? adminSource.filter((r) => {
                const routeId = String(r._id || r.iud || "");
                const routePath = normalizeRoutePath(r.path);
                return herencia.idsPermitidos.has(routeId) || herencia.pathsPermitidos.has(routePath);
            })
            : (actorTipo === 'SUPERADMIN' ? adminSource : []);

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
            } else if (parentId && actorTipo === 'SUPERADMIN') {
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

        return filterRootsByActorTipo(roots, actorTipo);
    } catch (error) {
        console.error("Error al construir arbol fallback admin dinamico:", error);
        return [];
    }
};

export const getAdminSidebarTreeWithContext = async (): Promise<AdminSidebarTreeContext> => {
    try {
        const token = localStorage.getItem('token');
        if (!token) return { actorTipo: 'UNKNOWN', tree: [] };

        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
        const treeResult: RouteTreeResponse = await apiFetch(`${API_BASE_URL}/seguridad/rutas/listarRutas/arbol/admin`, {
            method: 'GET',
            useAuth: true,
            logoutOn401: true
        });

        if (treeResult?.success && Array.isArray(treeResult?.data)) {
            // Respetar exactamente lo que define backend por herencia/contexto.
            const actorTipo = String(treeResult?.actorTipo || '').trim().toUpperCase() as AdminActorTipo;
            return {
                actorTipo: actorTipo || 'UNKNOWN',
                tree: filterRootsByActorTipo(mapTreeNodes(treeResult.data), actorTipo || 'UNKNOWN')
            };
        }
        return { actorTipo: 'UNKNOWN', tree: [] };
    } catch (error) {
        console.error('Error al obtener arbol admin por contexto:', error);
        return { actorTipo: 'UNKNOWN', tree: [] };
    }
};

export const getPrivateHomeRoute = async (): Promise<string> => {
    try {
        const shortcuts = await getUserShortcutRoutes();
        if (shortcuts.admin && shortcuts.admin.trim()) {
            return shortcuts.admin;
        }
        return "/admin/dashboard";
    } catch (_error) {
        return "/admin/dashboard";
    }
};
