import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../providers/AuthProvider';

import { Sheet, SheetContent } from "@/components/ui/sheet";

import {
    LayoutDashboard, Package, Tags, Users, ScrollText, Settings,
    LogOut, Network, Wrench, Palette, SquareStack, Route, Building2,
    ChevronRight, CircleHelp, ShoppingCart, MapPin, Globe, Shield,
    Bell, FileText, BarChart2, Star, Layers, Link, Mail, Image,
    UserCheck, Database, Key, Sliders, BookOpen, Truck, CreditCard,
    MessageSquare, Calendar, Search, PieChart, HelpCircle, Boxes,
    Store, Percent, Award, Zap, Landmark, ClipboardList, Lock,
    RefreshCw, Code, Eye, Hash, Flag, Folder, UserCog, Handshake,
} from 'lucide-react';

import { getAdminSidebarFallbackTree, getAdminSidebarTreeWithContext, invalidateSidebarCache, type AdminNavTreeItem } from '@/app/services/routeService';
import { normalizeRoutePath } from '@/app/services/routePathNormalizer';
import type { AdminSidebarProps } from '@/types/components';
import { fetchSplashLogo, resolveSplashLogoUrl } from '@/app/services/splashLogoService';

const DRAWER_WIDTH = '256px';

const AYUDA_HUBS: Record<string, string> = {
    'gobernanza': 'Configura roles, permisos, vistas y acceso a modulos del sistema. Desde aqui controlas quien puede ver y hacer que.',
    'vistas públicas': 'Paginas accesibles sin autenticacion: landing, catalogo publico y formularios abiertos al visitante.',
    'vistas privadas': 'Paginas que requieren sesion activa. Solo usuarios registrados y autenticados pueden acceder.',
    'inventario': 'Gestiona stock, movimientos inmutables de kardex, ordenes de compra, bodegas y catalogo de productos.',
    'multi nivel': 'Configura estructuras jerarquicas, redes de distribucion y arboles de referidos multinivel.',
    'bd conexion': 'Parametros de conexion a bases de datos y configuracion tecnica del servidor.',
    'rutas dinamicas': 'Administra y parametriza las rutas del sistema de navegacion generadas dinamicamente.',
    'configuracion': 'Ajustes generales de la plataforma: moneda, comprobantes, parametros globales y preferencias del tenant.',
    'seguridad': 'Control de acceso, politicas de contrasenas, sesiones activas y auditoria de accesos.',
    'usuarios': 'Gestion de cuentas de usuario, perfiles, estados y asignacion de roles.',
    'reportes': 'Informes y estadisticas de operaciones, ventas, inventario y actividad del sistema.',
};

interface MenuItem {
    label: string;
    icon: React.ReactNode;
    path: string;
}

interface MenuTreeItem extends MenuItem {
    id: string;
    component: string;
    tipoNodo: string;
    children: MenuTreeItem[];
}

const pageModules = import.meta.glob(
    ['../../pages/**/*.tsx', '../../components/admin/**/*.tsx'],
    { eager: false }
);

const buildRegisteredComponentNames = (): Set<string> => {
    const names = new Set<string>();
    Object.keys(pageModules).forEach((filePath) => {
        const match = filePath.match(/\/([^/]+)\.tsx$/);
        if (match?.[1]) names.add(match[1]);
    });
    const aliases: Record<string, string> = {
        ParametrizacionCatalogTenant: 'ParametrizacionCatologTenant',
        TenantCorportativo: 'TenantCorporativo',
        tenantCorportativo: 'TenantCorporativo',
        tenantCorporativo: 'TenantCorporativo',
        parametrizacionMenu: 'ParametrizacionMenu',
        RouteUserMenuSettings: 'ParametrizacionMenu',
        envioCorreos: 'EnvioCorreos',
        ConfiguracionPerfil: 'Perfil',
        DashboardAdmin: 'Dashboard',
        Usuarios: 'GestionUsuarios',
        Administracion: 'GestionUsuarios',
    };
    Object.entries(aliases).forEach(([alias, target]) => {
        if (names.has(target)) names.add(alias);
    });
    return names;
};

const registeredComponentNames = buildRegisteredComponentNames();

const iconByLabel = (label: string, path: string): React.ReactNode => {
    const l = label.trim().toLowerCase();
    const p = normalizeRoutePath(path).toLowerCase();

    // Por label (más específico primero)
    if (l.includes('dashboard') || l.includes('inicio')) return <LayoutDashboard className="w-4 h-4" />;
    if (l.includes('producto')) return <Package className="w-4 h-4" />;
    if (l.includes('categor')) return <Tags className="w-4 h-4" />;
    if (l.includes('usuario') && !l.includes('menu')) return <Users className="w-4 h-4" />;
    if (l.includes('referido') || l.includes('referral')) return <Handshake className="w-4 h-4" />;
    if (l.includes('pedido') || l.includes('orden')) return <ClipboardList className="w-4 h-4" />;
    if (l.includes('ruta') || l.includes('route')) return <Route className="w-4 h-4" />;
    if (l.includes('membres')) return <Award className="w-4 h-4" />;
    if (l.includes('comis')) return <Percent className="w-4 h-4" />;
    if (l.includes('correo') || l.includes('email') || l.includes('mail')) return <Mail className="w-4 h-4" />;
    if (l.includes('paleta') || l.includes('color')) return <Palette className="w-4 h-4" />;
    if (l.includes('personalizaci') || l.includes('branding')) return <Palette className="w-4 h-4" />;
    if (l.includes('empresa') || l.includes('tenant')) return <Building2 className="w-4 h-4" />;
    if (l.includes('gobernanz') || l.includes('gobernaz')) return <Landmark className="w-4 h-4" />;
    if (l.includes('parametr') || l.includes('config')) return <Sliders className="w-4 h-4" />;
    if (l.includes('rol') || l.includes('permiso')) return <Shield className="w-4 h-4" />;
    if (l.includes('notif')) return <Bell className="w-4 h-4" />;
    if (l.includes('report') || l.includes('informe')) return <BarChart2 className="w-4 h-4" />;
    if (l.includes('analít') || l.includes('estadíst')) return <PieChart className="w-4 h-4" />;
    if (l.includes('inventar')) return <Boxes className="w-4 h-4" />;
    if (l.includes('proveedor') || l.includes('supplier')) return <Truck className="w-4 h-4" />;
    if (l.includes('pago') || l.includes('factura') || l.includes('cobro')) return <CreditCard className="w-4 h-4" />;
    if (l.includes('banco') || l.includes('finanz')) return <Landmark className="w-4 h-4" />;
    if (l.includes('mensaj') || l.includes('chat')) return <MessageSquare className="w-4 h-4" />;
    if (l.includes('calend') || l.includes('agenda')) return <Calendar className="w-4 h-4" />;
    if (l.includes('buscar') || l.includes('search')) return <Search className="w-4 h-4" />;
    if (l.includes('imagen') || l.includes('media') || l.includes('foto')) return <Image className="w-4 h-4" />;
    if (l.includes('document') || l.includes('archivo')) return <FileText className="w-4 h-4" />;
    if (l.includes('log') || l.includes('audit')) return <ScrollText className="w-4 h-4" />;
    if (l.includes('seguridad') || l.includes('acceso')) return <Lock className="w-4 h-4" />;
    if (l.includes('api') || l.includes('webhook')) return <Code className="w-4 h-4" />;
    if (l.includes('integrac')) return <Link className="w-4 h-4" />;
    if (l.includes('tienda') || l.includes('store')) return <Store className="w-4 h-4" />;
    if (l.includes('carrito')) return <ShoppingCart className="w-4 h-4" />;
    if (l.includes('ubicac') || l.includes('direcc') || l.includes('zona')) return <MapPin className="w-4 h-4" />;
    if (l.includes('web') || l.includes('sitio') || l.includes('público')) return <Globe className="w-4 h-4" />;
    if (l.includes('feature') || l.includes('funcional')) return <Zap className="w-4 h-4" />;
    if (l.includes('plan') || l.includes('suscr')) return <Star className="w-4 h-4" />;
    if (l.includes('ayuda') || l.includes('soport')) return <HelpCircle className="w-4 h-4" />;
    if (l.includes('admin')) return <UserCog className="w-4 h-4" />;
    if (l.includes('perfil') || l.includes('profile')) return <UserCheck className="w-4 h-4" />;
    if (l.includes('contenido') || l.includes('content')) return <BookOpen className="w-4 h-4" />;
    if (l.includes('publicaci') || l.includes('post') || l.includes('blog')) return <FileText className="w-4 h-4" />;
    if (l.includes('banner') || l.includes('slider')) return <Image className="w-4 h-4" />;
    if (l.includes('descuento') || l.includes('cupon')) return <Percent className="w-4 h-4" />;
    if (l.includes('sync') || l.includes('sincron')) return <RefreshCw className="w-4 h-4" />;
    if (l.includes('vista') || l.includes('view')) return <Eye className="w-4 h-4" />;
    if (l.includes('campo') || l.includes('field')) return <Hash className="w-4 h-4" />;
    if (l.includes('país') || l.includes('nacion') || l.includes('region')) return <Flag className="w-4 h-4" />;
    if (l.includes('folder') || l.includes('carpeta')) return <Folder className="w-4 h-4" />;
    if (l.includes('base de dato') || l.includes('database')) return <Database className="w-4 h-4" />;
    if (l.includes('token') || l.includes('clave') || l.includes('key')) return <Key className="w-4 h-4" />;
    if (l.includes('red') || l.includes('network')) return <Network className="w-4 h-4" />;
    if (l.includes('nivel') || l.includes('jerarqu')) return <Layers className="w-4 h-4" />;
    if (l.includes('modulo') || l.includes('módulo')) return <SquareStack className="w-4 h-4" />;

    // Fallback por path
    if (p.includes('/dashboard')) return <LayoutDashboard className="w-4 h-4" />;
    if (p.includes('/productos')) return <Package className="w-4 h-4" />;
    if (p.includes('/usuarios')) return <Users className="w-4 h-4" />;
    if (p.includes('/referidos')) return <Handshake className="w-4 h-4" />;
    if (p.includes('/pedidos')) return <ClipboardList className="w-4 h-4" />;
    if (p.includes('/rutas')) return <Route className="w-4 h-4" />;
    if (p.includes('/configuracion')) return <Settings className="w-4 h-4" />;
    if (p.includes('/parametrizacion')) return <Sliders className="w-4 h-4" />;
    if (p.includes('/gobernanz')) return <Landmark className="w-4 h-4" />;

    return <SquareStack className="w-4 h-4" />;
};

export default function AdminSidebar({ mobileOpen, setMobileOpen }: AdminSidebarProps): React.ReactElement {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const location = useLocation();
    const [dynamicTree, setDynamicTree] = useState<MenuTreeItem[]>([]);
    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
    const [ayudaHubId, setAyudaHubId] = useState<string | null>(null);
    const [sidebarLogoUrl, setSidebarLogoUrl] = useState<string | null>(null);

    const mapMenuNode = (node: AdminNavTreeItem): MenuTreeItem => ({
        id: node.id,
        label: node.label,
        path: node.path,
        component: node.component,
        icon: iconByLabel(node.label, node.path),
        tipoNodo: node.tipoNodo,
        children: (node.children || []).map(mapMenuNode),
    });

    const buildExpandedState = (nodes: MenuTreeItem[]): Record<string, boolean> => {
        const expanded: Record<string, boolean> = {};
        const visit = (items: MenuTreeItem[]): void => {
            items.forEach((item) => {
                if (item.children.length > 0) {
                    expanded[item.id] = false;
                    visit(item.children);
                }
            });
        };
        visit(nodes);
        return expanded;
    };

    const closeDescendants = (
        nodes: MenuTreeItem[],
        targetId: string,
        state: Record<string, boolean>
    ): Record<string, boolean> => {
        const nextState = { ...state };

        const collapseBranch = (items: MenuTreeItem[]): void => {
            items.forEach((item) => {
                nextState[item.id] = false;
                if (item.children.length > 0) collapseBranch(item.children);
            });
        };

        const visit = (items: MenuTreeItem[]): boolean => {
            for (const item of items) {
                if (item.id === targetId) {
                    collapseBranch(item.children);
                    return true;
                }
                if (visit(item.children)) return true;
            }
            return false;
        };

        visit(nodes);
        return nextState;
    };

    useEffect(() => {
        let active = true;

        const loadDynamicMenu = async (): Promise<void> => {
            try {
                const { tree: routes, actorTipo } = await getAdminSidebarTreeWithContext();
                if (!active) return;
                if (!routes.length) {
                    const fallbackTree = await getAdminSidebarFallbackTree(actorTipo);
                    if (!active) return;
                    if (fallbackTree.length > 0) {
                        const mapped = fallbackTree.map(mapMenuNode);
                        setDynamicTree(mapped);
                        setExpandedNodes(buildExpandedState(mapped));
                    } else {
                        setDynamicTree([]);
                        setExpandedNodes({});
                    }
                    return;
                }
                const mapped = routes.map(mapMenuNode);
                setDynamicTree(mapped);
                setExpandedNodes(buildExpandedState(mapped));
            } catch (error) {
                console.error('Error cargando menu admin dinamico:', error);
            }
        };

        const onRoutesUpdated = (): void => {
            invalidateSidebarCache();
            void loadDynamicMenu();
        };
        void loadDynamicMenu();
        window.addEventListener('admin-routes-updated', onRoutesUpdated);
        return () => {
            active = false;
            window.removeEventListener('admin-routes-updated', onRoutesUpdated);
        };
    }, []);

    useEffect(() => {
        const tieneToken = typeof window !== 'undefined' && Boolean(String(localStorage.getItem('token') || '').trim());
        void fetchSplashLogo(tieneToken)
            .then((res) => setSidebarLogoUrl(resolveSplashLogoUrl(res?.logo)))
            .catch(() => setSidebarLogoUrl(null));
    }, []);

    const toggleNode = (id: string): void => {
        setExpandedNodes((prev) => {
            if (prev[id]) {
                return closeDescendants(dynamicTree, id, { ...prev, [id]: false });
            }
            return { ...prev, [id]: true };
        });
    };

    const expandNode = (id: string): void => {
        setExpandedNodes((prev) => ({ ...prev, [id]: true }));
    };

    const TreeNode = ({ node, level = 0 }: { node: MenuTreeItem; level?: number }): React.ReactElement => {
        const hasChildren = Array.isArray(node.children) && node.children.length > 0;
        const isExpanded = !!expandedNodes[node.id];
        const isActive = normalizeRoutePath(location.pathname) === normalizeRoutePath(node.path);
        const componentName = String(node.component || '').trim();
        const hasRegisteredComponent = componentName ? registeredComponentNames.has(componentName) : false;
        const isNavigable = !!String(node.path || '').trim() && hasRegisteredComponent;

        // Ayuda: solo en hubs de nivel 0 con hijos
        const esHub = level === 0 && hasChildren;
        const ayudaKey = node.label.trim().toLowerCase();
        const ayudaTexto = AYUDA_HUBS[ayudaKey] ?? null;
        const ayudaAbierta = ayudaHubId === node.id;

        const handleClick = (): void => {
            if (hasChildren) expandNode(node.id);
            if (isNavigable) {
                navigate(node.path);
                if (setMobileOpen) setMobileOpen(false);
            }
        };

        const indent = level * 8;

        const rowBase = `
            group flex items-start justify-between gap-2 w-full
            rounded-lg px-2.5 py-2.5 text-sm cursor-pointer
            transition-colors duration-200 select-none mb-0.5
        `;

        const rowStyle = isActive
            ? `${rowBase} bg-primary/10 text-primary font-medium`
            : `${rowBase} text-foreground/85 hover:bg-muted/70 hover:text-foreground`;

        const row = (
            <div
                className={rowStyle}
                style={{ paddingLeft: `${10 + indent}px` }}
                onClick={(e) => {
                    if (hasChildren && !isNavigable) {
                        toggleNode(node.id);
                    } else {
                        handleClick();
                    }
                }}
            >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {level > 0 && (
                        <span className="mt-1 flex-shrink-0 w-px h-4 bg-border/60 rounded-full" />
                    )}
                    <span className={`mt-0.5 flex-shrink-0 transition-colors duration-150 ${isActive ? 'text-primary' : 'text-foreground/60 group-hover:text-foreground'}`}>
                        {node.icon}
                    </span>
                    <span className="min-w-0 flex-1 break-words whitespace-normal text-left text-[13px] leading-5">
                        {node.label}
                    </span>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Botón de ayuda — solo en hubs de nivel 0 */}
                    {esHub && ayudaTexto && (
                        <button
                            type="button"
                            className={`mt-0.5 rounded p-0.5 transition-colors ${ayudaAbierta ? 'text-primary' : 'text-foreground/30 hover:text-primary'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setAyudaHubId(ayudaAbierta ? null : node.id);
                            }}
                            aria-label={`Ayuda sobre ${node.label}`}
                        >
                            <CircleHelp className="w-3.5 h-3.5" />
                        </button>
                    )}

                    {hasChildren && (
                        <span
                            className={`mt-0.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : 'rotate-0'} ${isActive ? 'text-primary' : 'text-foreground/45'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleNode(node.id);
                            }}
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                    )}
                </div>
            </div>
        );

        return (
            <div>
                {isNavigable ? (
                    <a
                        href={node.path}
                        onClick={(e) => { e.preventDefault(); handleClick(); }}
                        className="block no-underline"
                    >
                        {row}
                    </a>
                ) : (
                    row
                )}

                {/* Panel de ayuda colapsable — solo hubs nivel 0 */}
                {esHub && ayudaTexto && ayudaAbierta && (
                    <div className="mx-2 mb-1 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] leading-relaxed text-primary/80">
                        {ayudaTexto}
                    </div>
                )}

                {/* Subopciones con transición suave */}
                {hasChildren && (
                    <div
                        className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                    >
                        <div
                            className={`min-h-0 overflow-hidden transition-transform duration-300 ease-out ${isExpanded ? 'translate-y-0' : '-translate-y-1'}`}
                        >
                            <div className="relative ml-2.5 pl-2.5 border-l border-border/40">
                                {node.children.map((child) => (
                                    <TreeNode key={child.id} node={child} level={level + 1} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const handleLogout = (): void => {
        logout();
        navigate('/');
    };

    // Contenido del sidebar
    const drawerContent = (
        <div className="flex flex-col h-full bg-card overflow-hidden">

            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 h-[57px] md:h-16 border-b border-border/50 flex-shrink-0">
                {sidebarLogoUrl ? (
                    <img
                        src={sidebarLogoUrl}
                        alt="Logo"
                        className="h-8 w-8 object-contain rounded-md flex-shrink-0"
                    />
                ) : (
                    <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                        <LayoutDashboard className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                )}
                <span className="font-semibold text-sm text-foreground tracking-tight">MABS Panel</span>
            </div>

            {/* Navegación */}
            <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 scrollbar-thin">
                {dynamicTree.map((node) => (
                    <TreeNode key={node.id} node={node} />
                ))}
            </nav>

            {/* Footer — cerrar sesión */}
            <div className="px-2 py-3 border-t border-border/50 flex-shrink-0">
                <button
                    onClick={handleLogout}
                    className="
                        w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg
                        text-[13px] text-muted-foreground
                        hover:bg-destructive/8 hover:text-destructive
                        transition-all duration-150 cursor-pointer
                    "
                >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    <span>Cerrar sesión</span>
                </button>
            </div>
        </div>
    );

    const handleMobileToggle = (open: boolean): void => {
        if (setMobileOpen) setMobileOpen(open);
    };

    return (
        <>
            {/* Desktop */}
            <div
                className="hidden md:flex flex-col border-r border-border/50 bg-card"
                style={{ width: DRAWER_WIDTH, minWidth: DRAWER_WIDTH, height: '100vh', position: 'sticky', top: 0 }}
            >
                {drawerContent}
            </div>

            {/* Mobile */}
            <Sheet open={mobileOpen} onOpenChange={handleMobileToggle}>
                <SheetContent
                    side="left"
                    className="p-0 border-r-0"
                    style={{ width: DRAWER_WIDTH, minWidth: DRAWER_WIDTH }}
                >
                    {drawerContent}
                </SheetContent>
            </Sheet>
        </>
    );
}
