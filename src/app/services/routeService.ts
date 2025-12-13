import { apiFetch } from './api';

interface RouteResponse {
    success: boolean;
    message: string;
    total: number;
    data: Array<{
        _id: string;
        name: string;
        path: string;
        component: string;
        layout: string;
        icon: string | null;
        allowedRoles: Array<{ iud: string }>;
        estadoRuta: boolean;
        accessType: { _id: string; accessType: string };
        order: number;
    }>;
}

interface AuthorizedRoutes {
    publicRoutes?: Array<{ path: string; component: string }>;
    adminRoutes?: Array<{ path: string; component: string }>;
    authRoutes?: Array<{ path: string; component: string }>;
}

export const getAuthorizedRoutes = async (): Promise<AuthorizedRoutes> => {
    try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

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
        const adminRoutes = result.data
            .filter(r => r.estadoRuta && r.layout.replace("/", "").trim() === "AdminLayout")
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
