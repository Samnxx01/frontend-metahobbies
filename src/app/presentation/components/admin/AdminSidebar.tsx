import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../providers/AuthProvider'; // Asumiendo que esta ruta sigue siendo válida

// 1. Importar el componente Sheet de Shadcn
import {
    Sheet,
    SheetContent,
} from "@/components/ui/sheet";

// Importar Accordion de Shadcn
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

// 2. Importar los íconos de lucide-react
import {
    LayoutDashboard,
    Package,
    Tags,
    Users,
    ScrollText,
    Settings,
    LogOut,
    Network,
    Wrench,
    Palette,
    SquareStack
} from 'lucide-react';

import type { AdminSidebarProps } from '@/types/components';

const DRAWER_WIDTH = '260px'; // Usamos string para la propiedad de ancho CSS de Tailwind
// Usaremos la variable de CSS personalizada para el color primario si no está en Tailwind,
// o un color de Tailwind configurado. Aquí asumiré un color en Tailwind, por ejemplo, 'rose-600'
const PRIMARY_COLOR_CLASS = 'text-rose-600'; // Equivalente a #C43670 (Raspberry Rose)
const PRIMARY_BG_LIGHT_CLASS = 'bg-rose-50'; // Fondo muy claro para activo
const HOVER_BG_CLASS = 'hover:bg-gray-100';

interface MenuItem {
    label: string;
    icon: React.ReactNode;
    path: string;
}

interface MenuLinkProps {
    item: MenuItem;
}

export default function AdminSidebar({ mobileOpen, setMobileOpen }: AdminSidebarProps): React.ReactElement {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const location = useLocation();

    // 3. Reemplazamos los iconos de MUI por los de Lucide
    const menu: MenuItem[] = [
        { label: 'Dashboard', icon: <LayoutDashboard className='w-5 h-5' />, path: '/admin/dashboard' },
        { label: 'Productos', icon: <Package className='w-5 h-5' />, path: '/admin/productos' },
        { label: 'Categorías', icon: <Tags className='w-5 h-5' />, path: '/admin/categorias' },
        { label: 'Usuarios', icon: <Users className='w-5 h-5' />, path: '/admin/usuarios' },
        { label: 'Referidos', icon: <Network className='w-5 h-5' />, path: '/admin/referidos' },
        { label: 'Pedidos', icon: <ScrollText className='w-5 h-5' />, path: '/admin/pedidos' },
        { label: 'Parametrización', icon: <Wrench className='w-5 h-5' />, path: '/admin/parametrizacion' },
        { label: 'Configuración', icon: <Settings className='w-5 h-5' />, path: '/admin/configuracion' },
    ];

    // Menú de personalización (acordeón)
    const personalizacionMenu = [
        { label: 'Modal de Inicio', icon: <SquareStack className='w-5 h-5' />, path: '/admin/personalizacion/modal-inicio' },
    ];

    const MenuLink = ({ item }: MenuLinkProps): React.ReactElement => {
        const isActive = location.pathname.includes(item.path);

        const linkClasses = `
            flex items-center space-x-3 p-3 mb-1 rounded-md cursor-pointer transition-all duration-200
            ${isActive
                ? `${PRIMARY_BG_LIGHT_CLASS} ${PRIMARY_COLOR_CLASS} font-semibold` // Estilos Activo
                : `text-gray-600 ${HOVER_BG_CLASS} hover:${PRIMARY_COLOR_CLASS}` // Estilos Inactivo y Hover
            }
        `;

        const iconClasses = `
            flex-shrink-0 w-5 h-5 
            ${isActive ? PRIMARY_COLOR_CLASS : 'text-gray-500'}
        `;

        const handleClick = (): void => {
            navigate(item.path);
            if (setMobileOpen) {
                setMobileOpen(false); // Cierra el sidebar móvil al hacer clic
            }
        };

        return (
            <div
                key={item.label}
                className={linkClasses}
                onClick={handleClick}
            >
                <span className={iconClasses}>
                    {item.icon}
                </span>
                <span className="text-sm">
                    {item.label}
                </span>
            </div>
        );
    };

    const handleLogout = (): void => {
        logout();
        navigate('/');
    };

    const drawerContent = (
        // Reemplaza Box con display: flex, flexDirection: column, height: 100%
        <div className="overflow-y-auto flex flex-col h-full bg-white">

            {/* Encabezado / Toolbar */}
            <div style={{ minHeight: '70px' }} className="flex items-center justify-center mb-2 px-4 border-b border-gray-100"> {/* Reemplaza Toolbar */}
                <h1 className={`${PRIMARY_COLOR_CLASS} font-bold text-xl`}>
                    MABS Panel
                </h1>
            </div>

            {/* Lista de Navegación */}
            <nav className="px-2 space-y-1"> {/* Reemplaza List con px: 1 */}
                {menu.map((m) => (
                    <MenuLink key={m.label} item={m} />
                ))}

                {/* Acordeón de Personalización */}
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="personalizacion" className="border-none">
                        <AccordionTrigger className={`flex items-center space-x-3 p-3 rounded-md hover:no-underline transition-all duration-200 text-gray-600 ${HOVER_BG_CLASS} hover:${PRIMARY_COLOR_CLASS}`}>
                            <div className="flex items-center space-x-3">
                                <Palette className='w-5 h-5' />
                                <span className="text-sm">Personalización</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-0 pt-1">
                            {personalizacionMenu.map((item) => {
                                const isActive = location.pathname.includes(item.path);
                                return (
                                    <div
                                        key={item.label}
                                        className={`flex items-center space-x-3 p-3 mb-1 ml-6 rounded-md cursor-pointer transition-all duration-200
                                            ${isActive
                                                ? `${PRIMARY_BG_LIGHT_CLASS} ${PRIMARY_COLOR_CLASS} font-semibold`
                                                : `text-gray-600 ${HOVER_BG_CLASS} hover:${PRIMARY_COLOR_CLASS}`
                                            }`}
                                        onClick={() => {
                                            navigate(item.path);
                                            if (setMobileOpen) {
                                                setMobileOpen(false);
                                            }
                                        }}
                                    >
                                        <span className={`flex-shrink-0 w-5 h-5 ${isActive ? PRIMARY_COLOR_CLASS : 'text-gray-500'}`}>
                                            {item.icon}
                                        </span>
                                        <span className="text-sm">{item.label}</span>
                                    </div>
                                );
                            })}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </nav>

            {/* Spacer / Box sx={{ flexGrow: 1 }} */}
            <div className="flex-grow" />

            {/* Botón de Logout */}
            <div className="p-2 border-t border-gray-200"> {/* Reemplaza Box con p: 2 y borderTop */}
                <div
                    onClick={handleLogout}
                    className="flex items-center space-x-3 p-3 rounded-md cursor-pointer transition-all duration-200 text-gray-600 hover:bg-red-50 hover:text-red-600"
                >
                    <span className="flex-shrink-0 w-5 h-5 text-gray-500 group-hover:text-red-600">
                        <LogOut className='w-5 h-5' />
                    </span>
                    <span className="text-sm font-medium">
                        Cerrar Sesión
                    </span>
                </div>
            </div>
        </div>
    );

    const handleMobileToggle = (open: boolean): void => {
        if (setMobileOpen) {
            setMobileOpen(open);
        }
    };

    return (
        <>
            {/* 4. Sidebar Permanente (Desktop) */}
            <div
                className="hidden md:block border-r border-gray-200 bg-white"
                style={{ width: DRAWER_WIDTH, minWidth: DRAWER_WIDTH }} // Fija el ancho
            >
                {drawerContent}
            </div>

            {/* 5. Sidebar Temporal (Mobile) - Reemplaza Drawer variant="temporary" con Sheet */}
            <Sheet open={mobileOpen} onOpenChange={handleMobileToggle}>
                <SheetContent
                    side="left" // Abre desde la izquierda (como un Drawer)
                    className="p-0 border-r-0" // Remueve padding y borde por defecto
                    style={{ width: DRAWER_WIDTH, minWidth: DRAWER_WIDTH }} // Fija el ancho
                >
                    {/* El SheetContent puede usar el mismo drawerContent sin necesidad de SheetHeader */}
                    {drawerContent}
                </SheetContent>
            </Sheet>
        </>
    );
}