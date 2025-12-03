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
import CambiarContrasena from '@/app/presentation/pages/recuperar-contrasena/CambiarContrasena';
import Contacto from '@/app/presentation/pages/contacto/Contacto';
import { MembershipRoutes } from './MembershipRoutes';
import GestionProductos from '../presentation/pages/admin/GestionProductos';

// Types for route system
interface RouteConfig {
    path: string;
    component: string;
    children?: RouteConfig[];
}

interface AuthorizedRoutes {
    adminRoutes?: RouteConfig[];
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
    CambiarContrasena,
    DashboardAdmin,
    GestionProductos,
    GestionUsuarios,
    PedidosAdmin,
    ConfiguracionAdmin,
    GestionCategorias,
    Contacto
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
                setAuthorizedRoutes(null);
            }
        };

        if (user) {
            loadRoutes();
        } else {
            // Use setTimeout to avoid synchronous state update in effect
            setTimeout(() => setAuthorizedRoutes(null), 0);
        }
    }, [user]);

    if (!authorizedRoutes && user) {
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
                <Route index element={<Home />} />
                <Route path="productos" element={<Productos />} />
                <Route path="producto/:id" element={<DetalleProducto />} />
                <Route path="carrito" element={<Carrito />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="contacto" element={<Contacto />} />
                <Route path="membresia/*" element={<MembershipRoutes />} />
                {user && <Route path="perfil" element={<Perfil />} />}
            </Route>

            <Route element={<AuthLayout />}>
                <Route path="login" element={<Login />} />
                <Route path="registro" element={<Registro />} />
                <Route path="recuperar-contrasena" element={<RecuperarContrasena />} />
                <Route path="recuperar/:token" element={<CambiarContrasena />} />
            </Route>

            {user && authorizedRoutes?.adminRoutes && (
                <Route path="/admin" element={<AdminLayout />}>
                    {renderRoutes(authorizedRoutes.adminRoutes)}
                </Route>
            )}
        </Routes>
    );
}