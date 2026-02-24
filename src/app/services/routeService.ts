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
        accessType: { _id: string; accessType: string };
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
    (layout || "").replace(/\//g, "").trim();

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
                if (vista.layout && normalizeLayout(vista.layout) !== "AdminLayout") return;

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

const STATIC_SUPERADMIN_ADMIN_ROUTES: Array<{ path: string; component: string }> = [
    { path: 'dashboard', component: 'DashboardAdmin' },
    { path: 'productos', component: 'GestionProductos' },
    { path: 'categorias', component: 'GestionCategorias' },
    { path: 'usuarios', component: 'GestionUsuarios' },
    { path: 'referidos', component: 'GestionReferidos' },
    { path: 'pedidos', component: 'PedidosAdmin' },
    { path: 'rutas', component: 'GestionRutas' },
    { path: 'parametrizacion', component: 'Parametrizacion' },
    { path: 'parametrizacion-corporativa', component: 'ParametrizacionCorporativa' },
    { path: 'personalizacion/modal-inicio', component: 'ModalInicio' },
    { path: 'configuracion', component: 'ConfiguracionAdmin' }
];

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
                name: r.name
            }));
    } catch (error) {
        console.error("Error al obtener catalogo de rutas:", error);
        return [];
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
            .filter(r => r.estadoRuta && r.layout.replace("/", "").trim() === "PublicLayout")
            .map(r => ({
                path: toRelativeRoutePath(r.path),
                component: normalizeComponent(r.component),
            }));

        // AUTH
        const authRoutes = result.data
            .filter(r => r.estadoRuta && r.layout.replace("/", "").trim() === "AuthLayout")
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
                const adminSource = result.data.filter((r) => r.estadoRuta && normalizeLayout(r.layout) === "AdminLayout");
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
                if (actorTipo === 'SUPERADMIN') {
                    // SUPERADMIN sin herencia: usar BD; si no hay datos, fallback quemado.
                    adminRoutes = adminRoutes.length > 0 ? adminRoutes : [...STATIC_SUPERADMIN_ADMIN_ROUTES];
                }
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
                route.layout.replace(/\//g, "").trim() === "PublicLayout" &&
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
                normalizeLayout(route.layout) === "PublicLayout" &&
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

        const adminSource = result.data.filter((r) => r.estadoRuta && normalizeLayout(r.layout) === "AdminLayout");
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
            normalizeLayout(r.layout) === "AdminLayout" &&
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
            } else {
                roots.push(currentNode);
            }
        });

        const sortTree = (items: AdminNavTreeItem[]): void => {
            items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            items.forEach((item) => sortTree(item.children || []));
        };
        sortTree(roots);

        return roots;
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
                tree: mapTreeNodes(treeResult.data)
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
        const adminRoutes = await getAdminSidebarRoutes();
        if (!adminRoutes.length) return "/admin/dashboard";

        const firstRoute = adminRoutes[0];
        return firstRoute.path.startsWith("/") ? firstRoute.path : `/${firstRoute.path}`;
    } catch (_error) {
        return "/admin/dashboard";
    }
};
