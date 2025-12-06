
import { apiFetch } from './api';

/**
 * Interfaz para la respuesta de rutas del backend
 */
interface RouteAccessType {
    _id: string;
    accessType: 'PUBLIC' | 'PRIVATE';
}

interface RouteAllowedRole {
    iud: string;
}

interface RouteCreatedBy {
    correo: string;
    iud: string;
}

export interface RouteData {
    _id: string;
    name: string;
    path: string;
    component: string;
    layout: string;
    icon: string | null;
    allowedRoles: RouteAllowedRole[];
    estadoRuta: boolean;
    accessType: RouteAccessType;
    order: number;
    creadoPorUsuario: RouteCreatedBy;
    creadoPorRol: RouteCreatedBy;
    fechaCreacionUsu: string;
    createdAt: string;
    updatedAt: string;
    __v: number;
}

interface RoutesApiResponse {
    success: boolean;
    message: string;
    total: number;
    data: RouteData[];
}

/**
 * Interfaz para el retorno de rutas separadas por tipo de acceso
 * 
 * Clasificación:
 * - publicRoutes: Accesibles sin autenticación (PUBLIC)
 *   Ejemplo: Home, Productos, DetalleProducto, Carrito, Contacto, Login, Registro, RecuperarContrasena
 * 
 * - privateRoutes: Requieren autenticación (PRIVATE)
 *   Ejemplo: Perfil, Checkout, CambiarContrasena, DashboardAdmin, GestionProductos, 
 *   GestionUsuarios, PedidosAdmin, ConfiguracionAdmin, GestionCategorias
 */
export interface CategorizedRoutes {
    publicRoutes: RouteData[];
    privateRoutes: RouteData[];
}

/**
 * Obtiene las rutas autorizadas para el usuario desde el backend
 * 
 * Endpoint: GET /api/seguridad/rutas/listarRutas/admin
 * 
 * El backend retorna las rutas filtradas según el rol del usuario autenticado.
 * Solo se incluyen rutas donde:
 * - estadoRuta es true (activas)
 * - El rol del usuario está en allowedRoles
 * 
 * @returns {Promise<RouteData[]>} Array de rutas autorizadas, ordenadas por el campo 'order'
 */
export const getAuthorizedRoutes = async (): Promise<RouteData[]> => {
    try {
        // Llamar al endpoint que retorna rutas filtradas por rol del usuario
        const response = await apiFetch('/api/seguridad/rutas/listarRutas/admin', {
            method: 'GET',
        }) as RoutesApiResponse;

        // Validar que la respuesta sea exitosa y contenga datos
        if (response && response.success && Array.isArray(response.data)) {
            // Filtrar solo rutas activas y ordenarlas según el campo 'order'
            return response.data
                .filter((route: RouteData) => route.estadoRuta === true)
                .sort((a: RouteData, b: RouteData) => a.order - b.order);
        }

        // Si no hay datos válidos, retornar array vacío
        return [];
    } catch (error) {
        console.error('Error al obtener rutas autorizadas:', error);
        // En caso de error, retornar array vacío para no romper la aplicación
        return [];
    }
};

/**
 * Obtiene y categoriza las rutas por tipo de acceso
 * 
 * Separa las rutas en dos categorías:
 * - publicRoutes: Rutas con accessType 'PUBLIC' (accesibles sin autenticación)
 *   Incluye: Home, Productos, DetalleProducto, Carrito, Contacto, Login, Registro, RecuperarContrasena
 * 
 * - privateRoutes: Rutas con accessType 'PRIVATE' (requieren autenticación)
 *   Incluye: Perfil, Checkout, CambiarContrasena, y todas las rutas de AdminLayout
 *   (DashboardAdmin, GestionProductos, GestionUsuarios, PedidosAdmin, ConfiguracionAdmin, GestionCategorias)
 * 
 * @returns {Promise<CategorizedRoutes>} Objeto con rutas categorizadas
 */
export const getCategorizedRoutes = async (): Promise<CategorizedRoutes> => {
    try {
        // Obtener todas las rutas autorizadas
        const allRoutes = await getAuthorizedRoutes();

        // Separar rutas por tipo de acceso
        // PUBLIC: Rutas públicas accesibles sin autenticación
        const publicRoutes = allRoutes.filter(
            (route: RouteData) => route.accessType.accessType === 'PUBLIC'
        );

        // PRIVATE: Rutas que requieren autenticación (incluye rutas de admin y usuario)
        const privateRoutes = allRoutes.filter(
            (route: RouteData) => route.accessType.accessType === 'PRIVATE'
        );

        return {
            publicRoutes,
            privateRoutes
        };
    } catch (error) {
        console.error('Error al categorizar rutas:', error);
        return {
            publicRoutes: [],
            privateRoutes: []
        };
    }
};