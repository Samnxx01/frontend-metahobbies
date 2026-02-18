import { apiFetch } from './api';

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
        allowedRoles: Array<{ iud: string }>;
        estadoRuta: boolean;
        mostrarEnNavbarPublico?: boolean;
        accessType: { _id: string; accessType: string };
        order: number;
    }>;
}

interface RouteTreeResponse {
    success: boolean;
    message: string;
    total?: number;
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

const normalizeRoutePath = (path: string): string => {
    const clean = String(path || '').trim();
    if (!clean) return '/';
    return clean.startsWith('/') ? clean : `/${clean}`;
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
                if (vista.layout && normalizeLayout(vista.layout) !== "AdminLayout") return;

                const vistaId = String(vista._id || vista.iud || "").trim();
                if (vistaId) idsPermitidos.add(vistaId);

                const vistaPath = String(vista.path || "").trim();
                if (vistaPath) pathsPermitidos.add(vistaPath.startsWith("/") ? vistaPath : `/${vistaPath}`);
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

const fetchAllSecurityRoutes = async (useAuth: boolean): Promise<RouteResponse | null> => {
    try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
        const result: RouteResponse = await apiFetch(`${API_BASE_URL}/seguridad/rutas/listarRutas/admin`, {
            method: "GET",
            useAuth,
            logoutOn401: useAuth
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
                path: r.path.startsWith('/') ? r.path : `/${r.path}`,
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
        const herencia = token ? await getHerenciaAdminPermitida() : { idsPermitidos: new Set<string>(), pathsPermitidos: new Set<string>() };

        const result: RouteResponse = await apiFetch(`${API_BASE_URL}/seguridad/rutas/listarRutas/admin`, {
            method: "GET",
            headers: {
                "x-token": localStorage.getItem("token") || ""
            }
        });

        if (!result.success || !result.data) {
            return { publicRoutes: [], adminRoutes: [], authRoutes: [] };
        }

        // Normaliza nombres de componentes
        const normalizeComponent = (name: string) =>
            name.replace(/\.(jsx|tsx|js|ts)$/i, "");

        const normalizePath = (path: string) =>
            path.replace(/^\//, "");

        // PUBLIC
        const publicRoutes = result.data
            .filter(r => r.estadoRuta && r.layout.replace("/", "").trim() === "PublicLayout")
            .map(r => ({
                path: normalizePath(r.path),
                component: normalizeComponent(r.component),
            }));

        // AUTH
        const authRoutes = result.data
            .filter(r => r.estadoRuta && r.layout.replace("/", "").trim() === "AuthLayout")
            .map(r => ({
                path: normalizePath(r.path),
                component: normalizeComponent(r.component),
            }));

        // ADMIN
        const adminSource = result.data.filter((r) => r.estadoRuta && normalizeLayout(r.layout) === "AdminLayout");
        const hasHerenciaAdmin = herencia.idsPermitidos.size > 0 || herencia.pathsPermitidos.size > 0;
        const adminFiltrado = hasHerenciaAdmin
            ? adminSource.filter((r) => {
                const routeId = String(r._id || r.iud || "");
                const routePath = r.path.startsWith("/") ? r.path : `/${r.path}`;
                return herencia.idsPermitidos.has(routeId) || herencia.pathsPermitidos.has(routePath);
            })
            : adminSource;

        const adminRoutes = adminFiltrado
            .map(r => ({
                path: r.path.replace(/^\/admin\//i, "").replace(/^\//, ""),
                component: normalizeComponent(r.component),
            }));

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
                path: route.path.startsWith("/") ? route.path : `/${route.path}`,
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
                path: route.path.startsWith("/") ? route.path : `/${route.path}`,
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
                const routePath = r.path.startsWith("/") ? r.path : `/${r.path}`;
                return herencia.idsPermitidos.has(routeId) || herencia.pathsPermitidos.has(routePath);
            })
            : adminSource;

        return adminFiltrado
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((r) => ({
                path: r.path.startsWith("/") ? r.path : `/${r.path}`,
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
    try {
        const token = localStorage.getItem('token');
        if (!token) return [];

        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
        const treeResult: RouteTreeResponse = await apiFetch(`${API_BASE_URL}/seguridad/rutas/listarRutas/arbol/admin`, {
            method: 'GET',
            useAuth: true,
            logoutOn401: true
        });

        if (treeResult?.success && Array.isArray(treeResult?.data) && treeResult.data.length > 0) {
            return mapTreeNodes(treeResult.data);
        }

        const flat = await getAdminSidebarRoutes();
        return flat.map((item) => ({
            id: item.path,
            path: item.path,
            label: item.label,
            component: item.component,
            order: item.order,
            tipoNodo: 'FORMULARIO',
            children: []
        }));
    } catch (error) {
        console.error('Error al obtener arbol admin por contexto:', error);
        const flat = await getAdminSidebarRoutes();
        return flat.map((item) => ({
            id: item.path,
            path: item.path,
            label: item.label,
            component: item.component,
            order: item.order,
            tipoNodo: 'FORMULARIO',
            children: []
        }));
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
