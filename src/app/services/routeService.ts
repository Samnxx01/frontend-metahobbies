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
        accessType: {
            _id: string;
            accessType: string;
        };
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
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://server-mabs-xo9s.onrender.com/api';
        const response = await fetch(`${API_BASE_URL}/seguridad/rutas/listarRutas/admin`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error('Error al obtener las rutas');
        }

        const result: RouteResponse = await response.json();

        if (!result.success || !result.data) {
            return { publicRoutes: [], adminRoutes: [], authRoutes: [] };
        }

        // Filtrar y organizar rutas por layout/accessType
        const publicRoutes = result.data
            .filter(route => {
                const normalizedLayout = route.layout?.replace('/', '').trim();
                return route.estadoRuta && 
                    normalizedLayout === 'PublicLayout' &&
                    route.accessType.accessType === 'PUBLIC';
            })
            .sort((a, b) => a.order - b.order)
            .map(route => ({
                path: route.path.startsWith('/') ? route.path.substring(1) : route.path,
                component: route.component.replace('.jsx', '').replace('.tsx', '')
            }));

        const authRoutes = result.data
            .filter(route => {
                const normalizedLayout = route.layout?.replace('/', '').trim();
                return route.estadoRuta && normalizedLayout === 'AuthLayout';
            })
            .sort((a, b) => a.order - b.order)
            .map(route => ({
                path: route.path.startsWith('/') ? route.path.substring(1) : route.path,
                component: route.component.replace('.jsx', '').replace('.tsx', '')
            }));

        const adminRoutes = result.data
            .filter(route => {
                const normalizedLayout = route.layout?.replace('/', '').trim();
                return route.estadoRuta && normalizedLayout === 'AdminLayout';
            })
            .sort((a, b) => a.order - b.order)
            .map(route => ({
                path: route.path.startsWith('/admin/') ? route.path.replace('/admin/', '') : route.path.startsWith('/') ? route.path.substring(1) : route.path,
                component: route.component.replace('.jsx', '').replace('.tsx', '')
            }));

        return {
            publicRoutes,
            adminRoutes,
            authRoutes
        };
    } catch (error) {
        console.error('Error al obtener rutas autorizadas:', error);
        return { publicRoutes: [], adminRoutes: [], authRoutes: [] };
    }
};