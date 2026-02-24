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
import GestionReferidos from '@/app/presentation/pages/admin/GestionReferidos';
import PedidosAdmin from '@/app/presentation/pages/admin/Pedidos';
import ConfiguracionAdmin from '@/app/presentation/pages/admin/Configuracion';
import Parametrizacion from '@/app/presentation/pages/admin/Parametrizacion';
import ModalInicio from '@/app/presentation/pages/admin/ModalInicio';
import GestionCategorias from '@/app/presentation/pages/admin/GestionCategorias';
import GestionRutas from '@/app/presentation/pages/admin/GestionRutas';
import Login from '@/app/presentation/pages/login/Login';
import Registro from '@/app/presentation/pages/registro/Registro';
import RecuperarContrasena from '@/app/presentation/pages/recuperar-contrasena/RecuperarContrasena';
import CambiarContrasenaProvisional from '@/app/presentation/pages/cambiar-contrasena/CambiarContrasenaProvisional';
import Contacto from '@/app/presentation/pages/contacto/Contacto';
import { MembershipRoutes } from './MembershipRoutes';
import GestionProductos from '../presentation/pages/admin/GestionProductos';
import Posts from '@/app/presentation/pages/posts/Posts';
import SobreNosotros from '@/app/presentation/pages/sobre-nosotros/SobreNosotros';
import ModeloNegocio from '@/app/presentation/pages/modelo-negocio/ModeloNegocio';
import ParametrizacionCorporativa from '@/app/presentation/pages/admin/ParametrizacionCorporativa';
import RepresentanteEmpresarial from '@/app/presentation/pages/admin/RepresentanteEmpresarial';
import SociedadesCorporativas from '@/app/presentation/pages/admin/SociedadesCorporativas';
import DireccionCorporativa from '@/app/presentation/pages/admin/DireccionCorporativa';
import DocumentosCorporativos from '@/app/presentation/pages/admin/DocumentosCorporativos';
import LogosCorporativos from '@/app/presentation/pages/admin/LogosCorporativos';
import SectorIndustriaEmpresa from '@/app/presentation/pages/admin/SectorIndustriaEmpresa';
import EstadoUsuarios from '@/app/presentation/pages/admin/EstadoUsuarios';
import PublicidadPanel from '@/app/presentation/pages/admin/PublicidadPanel';
import PostsParametrizables from '@/app/presentation/pages/admin/PostsParametrizables';
import PerfilCorporativo from '../presentation/pages/admin/PerfilCorporativo';
import DesactivarRepresentante from '../presentation/pages/admin/DesactivarRepresentante';
import ParametrosGobernanza from '@/app/presentation/pages/admin/ParametrosGobernanza';
import ParametrizacionCatologTenant from '@/app/presentation/pages/admin/ParametrizacionCatologTenant';

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
    GestionReferidos,
    PedidosAdmin,
    ConfiguracionAdmin,
    Parametrizacion,
    ModalInicio,
    GestionCategorias,
    GestionRutas,
    Contacto,
    Posts,
    SobreNosotros,
    ModeloNegocio,
    ParametrizacionCorporativa,
    RepresentanteEmpresarial,
    SociedadesCorporativas,
    DireccionCorporativa,
    DocumentosCorporativos,
    LogosCorporativos,
    SectorIndustriaEmpresa,
    EstadoUsuarios,
    PublicidadPanel,
    PostsParametrizables,
    PerfilCorporativo,
    DesactivarRepresentante,
    ParametrosGobernanza,
    ParametrizacionCatologTenant,
    ParametrizacionCatalogTenant: ParametrizacionCatologTenant,
    // Alias dinamico para rutas parametrizadas de perfil
    ConfiguracionPerfil: Perfil,
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
        return routes.map(route => {
            const Component = componentMap[route.component];

            if (!Component) {
                console.warn("Componente no encontrado:", route.component);
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
                <Route path="cambiar-contrasena-provisional" element={<CambiarContrasenaProvisional />} />
                {user && <Route path="perfil" element={<Perfil />} />}
            </Route>

            <Route element={<AuthLayout />}>
                {authorizedRoutes.authRoutes && renderRoutes(authorizedRoutes.authRoutes)}
            </Route>

            {user && authorizedRoutes?.adminRoutes && authorizedRoutes.adminRoutes.length > 0 && (
                <Route path="/admin" element={<AdminLayout />}>
                    {renderRoutes(authorizedRoutes.adminRoutes)}
                    <Route path="*" element={<DashboardAdmin />} />
                </Route>
            )}
        </Routes>
    );
}

// PR hecho por Gustavo Pereira el 13-02-2026
