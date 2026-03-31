import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../providers/AuthProvider';

import {
    Sheet,
    SheetContent,
} from "@/components/ui/sheet";

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
    SquareStack,
    Route,
    Building2,
    ChevronDown,
    ChevronRight
} from 'lucide-react';

import { getAdminSidebarFallbackTree, getAdminSidebarTreeWithContext, type AdminNavTreeItem } from '@/app/services/routeService';
import { normalizeRoutePath } from '@/app/services/routePathNormalizer';
import type { AdminSidebarProps } from '@/types/components';

const DRAWER_WIDTH = '260px';
const PRIMARY_COLOR_CLASS = 'text-rose-600';
const PRIMARY_BG_LIGHT_CLASS = 'bg-primary/10';
const HOVER_BG_CLASS = 'hover:bg-muted';

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
    [
        '../../pages/**/*.tsx',
        '../../components/admin/**/*.tsx',
    ],
    { eager: false }
);

const buildRegisteredComponentNames = (): Set<string> => {
    const names = new Set<string>();

    Object.keys(pageModules).forEach((filePath) => {
        const match = filePath.match(/\/([^/]+)\.tsx$/);
        if (match?.[1]) {
            names.add(match[1]);
        }
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
        if (names.has(target)) {
            names.add(alias);
        }
    });

    return names;
};

const registeredComponentNames = buildRegisteredComponentNames();

export default function AdminSidebar({ mobileOpen, setMobileOpen }: AdminSidebarProps): React.ReactElement {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const location = useLocation();
    const [dynamicTree, setDynamicTree] = useState<MenuTreeItem[]>([]);
    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

    const mapMenuNode = (node: AdminNavTreeItem): MenuTreeItem => ({
        id: node.id,
        label: node.label,
        path: node.path,
        component: node.component,
        icon: iconByPath(node.path),
        tipoNodo: node.tipoNodo,
        children: (node.children || []).map(mapMenuNode)
    });

    const buildExpandedState = (nodes: MenuTreeItem[]): Record<string, boolean> => {
        const expanded: Record<string, boolean> = {};

        const visit = (items: MenuTreeItem[]): void => {
            items.forEach((item) => {
                if (item.children.length > 0) {
                    expanded[item.id] = true;
                    visit(item.children);
                }
            });
        };

        visit(nodes);
        return expanded;
    };

    const iconByPath = (path: string): React.ReactNode => {
        const normalized = normalizeRoutePath(path).toLowerCase();
        if (normalized.includes('/dashboard')) return <LayoutDashboard className='w-5 h-5' />;
        if (normalized.includes('/productos')) return <Package className='w-5 h-5' />;
        if (normalized.includes('/categorias')) return <Tags className='w-5 h-5' />;
        if (normalized.includes('/usuarios')) return <Users className='w-5 h-5' />;
        if (normalized.includes('/referidos')) return <Network className='w-5 h-5' />;
        if (normalized.includes('/pedidos')) return <ScrollText className='w-5 h-5' />;
        if (normalized.includes('/rutas')) return <Route className='w-5 h-5' />;
        if (normalized.includes('/parametrizacion-corporativa')) return <Building2 className='w-5 h-5' />;
        if (normalized.includes('/gobernanza') || normalized.includes('/gobernaza')) return <Building2 className='w-5 h-5' />;
        if (normalized.includes('/parametrizacion')) return <Wrench className='w-5 h-5' />;
        if (normalized.includes('/personalizacion') || normalized.includes('/posts')) return <Palette className='w-5 h-5' />;
        if (normalized.includes('/configuracion')) return <Settings className='w-5 h-5' />;
        return <SquareStack className='w-5 h-5' />;
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
                        const mappedFallbackTree: MenuTreeItem[] = fallbackTree.map(mapMenuNode);
                        setDynamicTree(mappedFallbackTree);
                        setExpandedNodes(buildExpandedState(mappedFallbackTree));
                    } else {
                        setDynamicTree([]);
                        setExpandedNodes({});
                    }
                    return;
                }
                const mappedTree: MenuTreeItem[] = routes.map(mapMenuNode);
                setDynamicTree(mappedTree);
                setExpandedNodes(buildExpandedState(mappedTree));
            } catch (error) {
                console.error('Error cargando menu admin dinamico:', error);
            }
        };

        const onRoutesUpdated = (): void => {
            void loadDynamicMenu();
        };

        void loadDynamicMenu();
        window.addEventListener('admin-routes-updated', onRoutesUpdated);

        return () => {
            active = false;
            window.removeEventListener('admin-routes-updated', onRoutesUpdated);
        };
    }, []);

    const toggleNode = (id: string): void => {
        setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const expandNode = (id: string): void => {
        setExpandedNodes((prev) => ({ ...prev, [id]: true }));
    };

    const TreeNode = ({ node, level = 0 }: { node: MenuTreeItem; level?: number }): React.ReactElement => {
        const hasChildren = Array.isArray(node.children) && node.children.length > 0;
        const isExpanded = !!expandedNodes[node.id];
        const isActive = normalizeRoutePath(location.pathname) === normalizeRoutePath(node.path);
        const nodeType = String(node.tipoNodo || '').trim().toUpperCase();
        const componentName = String(node.component || '').trim();
        const hasRegisteredComponent = componentName ? registeredComponentNames.has(componentName) : false;
        const linkClasses = `
            flex items-center justify-between p-3 mb-1 rounded-md cursor-pointer transition-all duration-200
            ${isActive
                ? `${PRIMARY_BG_LIGHT_CLASS} ${PRIMARY_COLOR_CLASS} font-semibold`
                : `text-muted-foreground ${HOVER_BG_CLASS} hover:${PRIMARY_COLOR_CLASS}`
            }
        `;

        const handleNavigate = (): void => {
            if (hasChildren) {
                expandNode(node.id);
            }
            if (node.path && hasRegisteredComponent) {
                navigate(node.path);
                if (setMobileOpen) setMobileOpen(false);
            }
        };

        const isNavigable = !!String(node.path || '').trim() && hasRegisteredComponent;

        return (
            <div style={{ paddingLeft: `${level * 10}px` }}>
                {isNavigable ? (
                    <a
                        href={node.path}
                        className={linkClasses}
                        onClick={(e) => {
                            e.preventDefault();
                            handleNavigate();
                        }}
                    >
                        <div className="flex items-center space-x-3">
                            <span className={`flex-shrink-0 w-5 h-5 ${isActive ? PRIMARY_COLOR_CLASS : 'text-muted-foreground'}`}>
                                {node.icon}
                            </span>
                            <span className="text-sm">{node.label}</span>
                        </div>
                        {hasChildren && (
                            <span
                                className="text-muted-foreground"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleNode(node.id);
                                }}
                            >
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </span>
                        )}
                    </a>
                ) : (
                    <div className={linkClasses} onClick={() => { if (hasChildren) toggleNode(node.id); }}>
                        <div className="flex items-center space-x-3">
                            <span className={`flex-shrink-0 w-5 h-5 ${isActive ? PRIMARY_COLOR_CLASS : 'text-muted-foreground'}`}>
                                {node.icon}
                            </span>
                            <span className="text-sm">{node.label}</span>
                        </div>
                        {hasChildren && (
                            <span className="text-muted-foreground">
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </span>
                        )}
                    </div>
                )}
                {hasChildren && isExpanded && (
                    <div>
                        {node.children.map((child) => (
                            <TreeNode key={child.id} node={child} level={level + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const handleLogout = (): void => {
        logout();
        navigate('/');
    };

    const drawerContent = (
        <div className="overflow-y-auto flex flex-col h-full bg-card">
            <div style={{ minHeight: '70px' }} className="flex items-center justify-center mb-2 px-4 border-b border-border">
                <h1 className={`${PRIMARY_COLOR_CLASS} font-bold text-xl`}>
                    MABS Panel
                </h1>
            </div>

            <nav className="px-2 space-y-1">
                {dynamicTree.map((node) => <TreeNode key={node.id} node={node} />)}
            </nav>

            <div className="flex-grow" />

            <div className="p-2 border-t border-gray-200">
                <div
                    onClick={handleLogout}
                    className="flex items-center space-x-3 p-3 rounded-md cursor-pointer transition-all duration-200 text-gray-600 hover:bg-red-50 hover:text-red-600"
                >
                    <span className="flex-shrink-0 w-5 h-5 text-gray-500 group-hover:text-red-600">
                        <LogOut className='w-5 h-5' />
                    </span>
                    <span className="text-sm font-medium">
                        Cerrar Sesion
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
            <div
                className="hidden md:block border-r border-gray-200 bg-white"
                style={{ width: DRAWER_WIDTH, minWidth: DRAWER_WIDTH }}
            >
                {drawerContent}
            </div>

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
