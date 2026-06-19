import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { swalFire as Swal } from '@/lib/sweetalert';
import { toast } from 'react-toastify';
// Importar Providers
import { useAuth } from "@/app/providers/AuthProvider";
import { useCart } from "@/app/providers/CartProvider";
// Shadcn UI components
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Lucide icons
import { Menu, ShoppingCart, User, X, ShieldCheck, LogOut, LogIn, ChevronRight, Crown } from "lucide-react";
// Theme Toggle
import ThemeToggle from "@/app/presentation/components/common/ThemeToggle";
import MiniCartContent from "@/app/presentation/components/carrito/MiniCartContent";
import { useMiniCartConfig } from "@/app/hooks/useMiniCartConfig";
import { groupCartItemsByProduct } from "@/app/presentation/components/carrito/cartColorQtyCache";
import type { CartItem as CartItemType } from "@/types/common";

import { apiFetch } from "@/app/services/api";
import { fetchSplashLogo, invalidateSplashLogoCache, resolveSplashLogoUrl } from '@/app/services/splashLogoService';
import {
    getNavbarNavigationRoutes,
    getMenuUsuarioRoutes,
    MenuUsuarioItem,
} from "@/app/services/routeService";
import { getGovernedLoginPath, getGovernedLogoutPath, getGovernedPublicHomePath } from "@/app/services/governedNavigation";
import { appendPublicAttributionToInternalPath } from "@/app/services/publicAttributionParams";
import { resolveUserDisplayName, resolveUserInitial } from "@/app/presentation/utils/resolveUserDisplayName";

import type { NavbarProps } from '@/types/components';

interface MenuItem {
    label: string;
    path: string;
}

export default function Navbar({ transparent = false }: NavbarProps = {}): React.ReactElement {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const { cartItems, removeFromCart, updateVariantQuantity } = useCart();
    const cartGroups = groupCartItemsByProduct(cartItems as CartItemType[]);
    const { config: miniCartConfig } = useMiniCartConfig();
    const useSidePanel = cartGroups.length > miniCartConfig.sidePanelThreshold;
    const [cartPanelOpen, setCartPanelOpen] = useState(false);
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const [isScrolled, setIsScrolled] = useState<boolean>(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoError, setLogoError] = useState<boolean>(false);
    const [logoLoading, setLogoLoading] = useState<boolean>(true);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [menuUsuarioItems, setMenuUsuarioItems] = useState<MenuUsuarioItem[]>([]);
    const menuItemsWithoutCart = menuItems.filter((item) => {
        const normalizedLabel = String(item.label || '').trim().toLowerCase();
        const normalizedPath = String(item.path || '').trim().toLowerCase();
        return normalizedLabel !== 'carrito' && normalizedPath !== '/carrito';
    });

    const loadHeaderLogo = async (forceRefresh = false): Promise<void> => {
        setLogoLoading(true);
        try {
            const useAuthLogo = Boolean(localStorage.getItem('token'));
            const logoRes = await fetchSplashLogo(useAuthLogo, { forceRefresh });
            const nextLogoUrl = resolveSplashLogoUrl(logoRes?.logo);
            if (nextLogoUrl) {
                setLogoUrl(nextLogoUrl);
                setLogoError(false);
            } else {
                setLogoUrl(null);
                setLogoError(false);
            }
        } catch (err) {
            console.error('Error al cargar logo del header:', err);
            setLogoError(true);
            setLogoUrl(null);
        } finally {
            setLogoLoading(false);
        }
    };

    useEffect(() => {
        const fetchHeaderData = async (): Promise<void> => {
            try {
                const [dynamicRoutes, usuarioItems] = await Promise.all([
                    getNavbarNavigationRoutes(!!user),
                    user ? getMenuUsuarioRoutes() : Promise.resolve([])
                ]);

                setMenuItems(dynamicRoutes.map((route: any) => ({
                    label: route.label,
                    path: route.path
                })));

                setMenuUsuarioItems(usuarioItems);
            } catch (err) {
                console.error('Error en el flujo de header dinamico:', err);
                setMenuItems([]);
            }
        };

        invalidateSplashLogoCache();
        void loadHeaderLogo(true);
        void fetchHeaderData();
    }, [user]);

    useEffect(() => {
        const onAuthChanged = (): void => {
            invalidateSplashLogoCache();
            void loadHeaderLogo(true);
        };
        window.addEventListener('mabs-auth-changed', onAuthChanged);
        return () => window.removeEventListener('mabs-auth-changed', onAuthChanged);
    }, [user]);

    useEffect(() => {
        const handleScroll = (): void => {
            setIsScrolled(window.pageYOffset > 10);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleRemoveGroup = async (lines: CartItemType[]): Promise<void> => {
        const name = lines[0]?.name || 'este producto';
        const result = await Swal({
            title: '¿Eliminar producto?',
            text: `¿Estás seguro de que quieres eliminar ${name} del carrito?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });
        if (result.isConfirmed) {
            try {
                for (const line of lines) {
                    await removeFromCart(line.id, line.color?.pantone, line.backendItemId);
                }
                toast.success('Producto eliminado del carrito');
            } catch (err: unknown) {
                const msg = err instanceof Error
                  ? err.message.replace(/^\[\d+\]\s*/, '')
                  : 'No se pudo eliminar el producto';
                toast.error(msg);
            }
        }
    };

    const handleVariantQuantityChange = async (
        line: CartItemType,
        color: CartItemType['color'],
        newQuantity: number,
    ): Promise<void> => {
        if (!color) return;
        try {
            await updateVariantQuantity(line, color, newQuantity);
            if (newQuantity < 1) {
                toast.success('Tono eliminado del carrito', { autoClose: 1000 });
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'No se pudo actualizar la cantidad');
        }
    };

    const handleLogout = async (): Promise<void> => {
        const result = await Swal({
            title: 'Cerrar sesión',
            text: '¿Estás seguro de que quieres cerrar sesión?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, cerrar sesión',
            cancelButtonText: 'Cancelar'
        });
        if (result.isConfirmed) {
            logout();
            navigate(getGovernedLogoutPath());
            toast.success('Sesión cerrada correctamente');
        }
    };

    const isLinkActive = (path: string): boolean => {
        if (path === "/") return location.pathname === "/";
        return location.pathname.startsWith(path);
    };

    const getUserInitials = (): string => resolveUserInitial(user);

    const getUserName = (): string => resolveUserDisplayName(user);

    const getUserEmail = (): string => {
        if (!user) return '';
        return user.correo || '';
    };

    const getUserRoleLabel = (): string => {
        if (!user) return '';
        const tenantRole = user.auth?.tenantScope?.rol?.nombre;
        return String(user.rolInfo?.nombre || tenantRole || user.rol || user.role || '').trim();
    };

    const getUserProfileLabel = (): string => {
        if (!user?.perfil) return '';
        const profileTypeLabels: Record<string, string> = {
            SUPER_ADMIN: 'Perfil SuperAdmin',
            TENANT_GLOBAL: 'Perfil TenantGlobal',
            TENANT_CORPORATIVO: 'Perfil corporativo',
            CLIENTE: 'Perfil cliente',
        };
        const tipo = String(user.perfil.tipo || '').trim().toUpperCase();
        const base = profileTypeLabels[tipo] || 'Perfil';
        const detalle = user.perfil.cargo || user.perfil.cc || '';
        return [base, detalle].filter(Boolean).join(' | ');
    };

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
        const target = e.target as HTMLImageElement;
        target.onerror = null;
        target.src = "https://placehold.co/48x48/f3f4f6/a3a3a3?text=IMG";
    };

    const handleLogoError = (): void => {
        if (!logoError && logoUrl) {
            console.warn('⚠️ Error al renderizar imagen del logo, usando fallback');
            setLogoError(true);
            setLogoUrl(null);
        }
    };

    const miniCartBodyProps = {
        groups: cartGroups,
        cartTotal,
        config: miniCartConfig,
        onRemoveGroup: (lines: CartItemType[]) => { void handleRemoveGroup(lines); },
        onQuantityChange: (line, color, qty) => { void handleVariantQuantityChange(line, color, qty); },
        onImageError: handleImageError,
    };

    const cartTriggerButton = (
        <Button variant="ghost" size="icon" className="relative h-9 w-9 hover:bg-accent transition-colors">
            <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs font-bold rounded-full h-4 min-w-4 justify-center"
            >
                {totalItems}
            </Badge>
            <ShoppingCart className="h-5 w-5 text-foreground" />
        </Button>
    );

    const renderCartDropdown = useSidePanel ? (
        <Sheet open={cartPanelOpen} onOpenChange={setCartPanelOpen}>
            <SheetTrigger asChild>
                {cartTriggerButton}
            </SheetTrigger>
            <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
                <SheetHeader className="shrink-0 border-b pb-4">
                    <SheetTitle>Tu carrito ({totalItems})</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto py-4">
                    {cartItems.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">Tu carrito está vacío</p>
                    ) : (
                        <MiniCartContent {...miniCartBodyProps} dense />
                    )}
                </div>
            </SheetContent>
        </Sheet>
    ) : (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {cartTriggerButton}
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-[min(22rem,calc(100vw-1.5rem))] p-4 backdrop-blur-lg border-none shadow-xl"
                align="end"
            >
                {cartItems.length === 0 ? (
                    <DropdownMenuItem disabled className="text-center justify-center font-medium py-4">
                        Tu carrito está vacío
                    </DropdownMenuItem>
                ) : (
                    <MiniCartContent {...miniCartBodyProps} />
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const ICON_MAP: Record<string, React.ReactNode> = {
        USER: <User className="mr-2 h-4 w-4" />,
        SHIELD_CHECK: <ShieldCheck className="mr-2 h-4 w-4" />,
        CROWN: <Crown className="mr-2 h-4 w-4" />,
        LOG_OUT: <LogOut className="mr-2 h-4 w-4" />,
    };

    const resolveIcon = (icon: string | null): React.ReactNode =>
        (icon && ICON_MAP[icon.toUpperCase()]) ?? <ChevronRight className="mr-2 h-4 w-4" />;

    const renderProfileDropdown = (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 p-0 rounded-full hover:border-button/40 transition-colors">
                    <Avatar className="h-full w-full">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                            {getUserInitials()}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 backdrop-blur-lg border-none shadow-xl" align="end">
                <div className="flex items-center gap-2 p-3">
                    <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                            {getUserInitials()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-0.5">
                        <p className="text-sm font-medium leading-none">{getUserName()}</p>
                        <p className="text-xs leading-none text-muted-foreground">{getUserEmail()}</p>
                        {(getUserRoleLabel() || getUserProfileLabel()) && (
                            <div className="flex flex-wrap gap-1 pt-1">
                                {getUserRoleLabel() && (
                                    <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px]">
                                        {getUserRoleLabel()}
                                    </Badge>
                                )}
                                {getUserProfileLabel() && (
                                    <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">
                                        {getUserProfileLabel()}
                                    </Badge>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <DropdownMenuSeparator />
                {menuUsuarioItems.map((item) => (
                    <DropdownMenuItem key={item.key ?? item.path} asChild className="cursor-pointer py-2.5">
                        <Link to={appendPublicAttributionToInternalPath(item.path)}>
                            {resolveIcon(item.icon)} {item.label}
                        </Link>
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive py-2.5">
                    <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const renderAuthSection = (
        <div className="flex items-center gap-2">
            <div className="hidden md:block"><ThemeToggle /></div>
            <div className="hidden md:block relative">{renderCartDropdown}</div>
            {user ? renderProfileDropdown : (
                <Button variant="default" onClick={() => navigate(appendPublicAttributionToInternalPath(getGovernedLoginPath()))} className="h-9 px-4 text-sm font-semibold">
                    <LogIn className="mr-2 h-4 w-4" /> Ingresar
                </Button>
            )}
        </div>
    );

    const renderMobileMenu = (
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Abrir menú móvil</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-xs p-0 backdrop-blur-md border-l border-border/50 z-[100]">
                <div className="flex flex-col h-full">
                    <SheetHeader className="p-6 border-b border-border/30 backdrop-blur-md bg-background/80">
                        <div className="flex items-center justify-between">
                            <SheetTitle className="text-xl font-bold text-foreground">Menú</SheetTitle>
                            <SheetClose asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent/50">
                                    <X className="h-4 w-4" />
                                </Button>
                            </SheetClose>
                        </div>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto p-6 space-y-3">
                        {menuItemsWithoutCart.map((item) => {
                            const isActive = isLinkActive(item.path);
                            return (
                                <SheetClose asChild key={item.label}>
                                    <Link to={appendPublicAttributionToInternalPath(item.path)} className={`flex items-center justify-between px-4 py-3 text-base font-medium rounded-xl transition-all duration-200 border ${isActive ? 'text-primary border-primary shadow-sm' : 'text-foreground border-transparent hover:bg-accent/50 hover:border-accent'}`}>
                                        <span className="font-semibold">{item.label}</span>
                                        <ChevronRight className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                                    </Link>
                                </SheetClose>
                            );
                        })}
                        {menuUsuarioItems.map((item) => (
                            <SheetClose asChild key={item.key ?? item.path}>
                                <Link to={appendPublicAttributionToInternalPath(item.path)} className="flex items-center justify-between px-4 py-3 text-base font-medium rounded-xl transition-all duration-200 border border-transparent hover:bg-accent/50 hover:border-accent text-foreground">
                                    <span className="font-semibold flex items-center">{resolveIcon(item.icon)} {item.label}</span>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </Link>
                            </SheetClose>
                        ))}
                    </div>
                    <div className="flex flex-col gap-3 p-6 border-t border-border/30 bg-background/50 backdrop-blur-md">
                        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-accent/30">
                            <span className="text-sm font-semibold">Tema</span>
                            <ThemeToggle />
                        </div>
                        <SheetClose asChild>
                            <Button variant="outline" onClick={() => navigate(appendPublicAttributionToInternalPath('/carrito'))} className="w-full justify-between font-semibold py-3 rounded-xl border-border/50 hover:border-primary/50">
                                <span className="flex items-center"><ShoppingCart className="mr-3 h-4 w-4" /> Ver Carrito</span>
                                <Badge variant="destructive" className="ml-2">{totalItems}</Badge>
                            </Button>
                        </SheetClose>
                        {user ? (
                            <>
                                <SheetClose asChild>
                                    <Button variant="destructive" onClick={handleLogout} className="w-full justify-start font-semibold py-3 rounded-xl">
                                        <LogOut className="mr-3 h-4 w-4" /> Cerrar Sesión
                                    </Button>
                                </SheetClose>
                            </>
                        ) : (
                            <SheetClose asChild>
                                <Button variant="default" onClick={() => navigate(appendPublicAttributionToInternalPath(getGovernedLoginPath()))} className="w-full justify-start font-semibold py-3 rounded-xl">
                                    <LogIn className="mr-3 h-4 w-4" /> Ingresar
                                </Button>
                            </SheetClose>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );

    return (
        <>
            <div className="h-[57px] md:h-16" />
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${transparent && !isScrolled ? "bg-transparent" : isScrolled ? "shadow-lg backdrop-blur-md bg-background/95" : "bg-background/80 backdrop-blur-md"}`}>
                <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[57px] md:h-16 flex items-center justify-between">
                    <div className="flex items-center h-full">
                        <div className="dark:bg-white dark:rounded-lg dark:p-1.5 dark:shadow-sm">
                            {/* LOGO RENDERIZADO AQUÍ */}
                            {logoLoading ? (
                                <span className="text-xs text-muted-foreground italic px-1">
                                    Cargando logo…
                                </span>
                            ) : logoUrl && !logoError ? (
                                <img
                                    src={logoUrl}
                                    alt="Logo"
                                    className="h-7 md:h-8 max-w-[120px] object-contain cursor-pointer flex-shrink-0 hover:opacity-80 transition-opacity"
                                    onClick={() => navigate(appendPublicAttributionToInternalPath(getGovernedPublicHomePath()))}
                                    onError={handleLogoError}
                                />
                            ) : (
                                <span
                                    className="text-xs text-muted-foreground italic px-1 cursor-pointer"
                                    onClick={() => navigate(appendPublicAttributionToInternalPath(getGovernedPublicHomePath()))}
                                >
                                    Sin logo
                                </span>
                            )}
                        </div>

                        <div className="hidden md:flex items-center gap-1 h-full ml-6">
                            {menuItemsWithoutCart.map((item) => {
                                const isActive = isLinkActive(item.path);
                                return (
                                    <Link key={item.label} to={appendPublicAttributionToInternalPath(item.path)} className={`text-sm font-medium transition-all duration-200 h-full flex items-center px-4 relative ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}`}>
                                        {item.label}
                                        {isActive && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/4 h-0.5 bg-primary rounded-full"></div>}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        {renderAuthSection}
                        <div className="md:hidden">{renderMobileMenu}</div>
                    </div>
                </div>
            </nav>
        </>
    );
}

// PR hecho por Gustavo Pereira el 13-02-2026


