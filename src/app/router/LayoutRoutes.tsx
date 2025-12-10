import { Routes, Route, useLocation } from 'react-router-dom';
import { useState, useEffect, ReactElement } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { getAuthorizedRoutes } from '@/app/services/routeService';
import { useLoading } from '@/app/providers/LoadingProvider';

import PublicLayout from '@/app/presentation/layouts/PublicLayout';
import AuthLayout from '@/app/presentation/layouts/AuthLayout';
import Home from '@/app/presentation/pages/home/Home';
import Productos from '@/app/presentation/pages/productos/Productos';
import DetalleProducto from '@/app/presentation/pages/producto/DetalleProducto';
import Carrito from '@/app/presentation/pages/carrito/Carrito';
import Checkout from '@/app/presentation/pages/checkout/Checkout';
import Perfil from '@/app/presentation/pages/perfil/Perfil';
import AdminLayout from '@/app/presentation/layouts/AdminLayout';
import DashboardAdmin from '@/app/presentation/pages/admin/Dashboard';
import GestionUsuarios from '@/app/presentation/pages/admin/GestionUsuarios';
import PedidosAdmin from '@/app/presentation/pages/admin/Pedidos';
import ConfiguracionAdmin from '@/app/presentation/pages/admin/Configuracion';
import GestionCategorias from '@/app/presentation/pages/admin/GestionCategorias';
import Login from '@/app/presentation/pages/login/Login';
import Registro from '@/app/presentation/pages/registro/Registro';
import RecuperarContrasena from '@/app/presentation/pages/recuperar-contrasena/RecuperarContrasena';
import Contacto from '@/app/presentation/pages/contacto/Contacto';
import { MembershipRoutes } from './MembershipRoutes';
import GestionProductos from '../presentation/pages/admin/GestionProductos';
import Posts from '@/app/presentation/pages/posts/Posts';
import SobreNosotros from '@/app/presentation/pages/sobre-nosotros/SobreNosotros';
import ModeloNegocio from '@/app/presentation/pages/modelo-negocio/ModeloNegocio';

// Types for route system
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

type ComponentMapType = {
    [key: string]: React.ComponentType<any>;
};

const componentMap: ComponentMapType = {
    Home,
    Productos,
    DetalleProducto,
    Carrito,
    Checkout,
    Perfil,
    Login,
    Registro,
    RecuperarContrasena,
    DashboardAdmin,
    GestionProductos,
    GestionUsuarios,
    PedidosAdmin,
    ConfiguracionAdmin,
    GestionCategorias,
    Contacto,
    Posts,
    SobreNosotros,
    ModeloNegocio
};

export default function LayoutRoutes(): ReactElement {
    const [authorizedRoutes, setAuthorizedRoutes] = useState<AuthorizedRoutes | null>(null);
    const { user } = useAuth();
    const { showLoading, hideLoading } = useLoading();
    const location = useLocation();

    useEffect(() => {
        showLoading();
        const timer = setTimeout(() => hideLoading(), 500); // Simula tiempo de carga
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
        return routes.map((route) => {
            const Component = componentMap[route.component];
            if (!Component) {
                console.warn(`Componente no encontrado: ${route.component}`);
                return null;
            }

            if (route.children) {
                return (
                    <Route key={route.path} path={route.path} element={<Component />}>
                        {renderRoutes(route.children)}
                    </Route>
                );
            }

            return (
                <Route
                    key={route.path}
                    path={route.path}
                    element={<Component />}
                />
            );
        }).filter(Boolean) as ReactElement[];
    };

    return (
        <Routes>
            <Route element={<PublicLayout />}>
                {/* Rutas dinámicas públicas */}
                {authorizedRoutes.publicRoutes && renderRoutes(authorizedRoutes.publicRoutes)}
                
                {/* Rutas especiales que no vienen del backend */}
                <Route path="membresia/*" element={<MembershipRoutes />} />
                {user && <Route path="perfil" element={<Perfil />} />}
            </Route>

            <Route element={<AuthLayout />}>
                {/* Rutas dinámicas de autenticación */}
                {authorizedRoutes.authRoutes && renderRoutes(authorizedRoutes.authRoutes)}
            </Route>

            {user && authorizedRoutes?.adminRoutes && authorizedRoutes.adminRoutes.length > 0 && (
                <Route path="/admin" element={<AdminLayout />}>
                    {renderRoutes(authorizedRoutes.adminRoutes)}
                </Route>
            )}
        </Routes>
    );
}