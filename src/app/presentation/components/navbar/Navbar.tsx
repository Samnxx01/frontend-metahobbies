import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { swalFire as Swal } from '@/lib/sweetalert';
import { toast } from 'react-toastify';
// Importar Providers
import { useAuth } from "@/app/providers/AuthProvider";
import { useCart } from "@/app/providers/CartProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
// Shadcn UI components
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Lucide icons
import { Menu, ShoppingCart, User, X, Trash2, ShieldCheck, LogOut, LogIn, ChevronRight, Crown } from "lucide-react";
// Theme Toggle
import ThemeToggle from "@/app/presentation/components/common/ThemeToggle";

import { apiFetch } from "@/app/services/api";
import { getPrivateHomeRoute, getPublicNavigationRoutes } from "@/app/services/routeService";

import type { NavbarProps } from '@/types/components';

const DEFAULT_LOGO = "/assets/logo.png";

interface MenuItem {
    label: string;
    path: string;
}

interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
    color?: {
        pantone?: string;
        name?: string;
    };
}

export default function Navbar({ transparent = false }: NavbarProps = {}): React.ReactElement {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const { cartItems, removeFromCart } = useCart();
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const { hasActiveMembership } = useMembership();
    const [isScrolled, setIsScrolled] = useState<boolean>(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

    const [logoUrl, setLogoUrl] = useState<string>(DEFAULT_LOGO);
    const [logoError, setLogoError] = useState<boolean>(false);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [privateHomePath, setPrivateHomePath] = useState<string>('/admin/dashboard');
    const menuItemsWithoutCart = menuItems.filter((item) => {
        const normalizedLabel = String(item.label || '').trim().toLowerCase();
        const normalizedPath = String(item.path || '').trim().toLowerCase();
        return normalizedLabel !== 'carrito' && normalizedPath !== '/carrito';
    });

    const userRole = String(user?.role || user?.rol || '').toUpperCase();
    const hasAdminScope = ['ADMIN', 'DIOS', 'DESAROLLADOR'].includes(userRole);

    useEffect(() => {
        const fetchHeaderData = async (): Promise<void> => {
            try {
                const requests: Promise<any>[] = [
                    apiFetch('/api/config/parametrizacion/listar/logos/coporativo', {
                        method: 'GET',
                        useAuth: false,
                        logoutOn401: false
                    }),
                    getPublicNavigationRoutes(),
                ];

                if (hasAdminScope) {
                    requests.push(getPrivateHomeRoute());
                }

                const [logoRes, dynamicRoutes, privateHome] = await Promise.all(requests);

                if (logoRes?.ok && logoRes?.logo) {
                    const { base64, mimetype } = logoRes.logo;
                    if (base64 && mimetype) {
                        setLogoUrl(`data:${mimetype};base64,${base64}`);
                        setLogoError(false);
                    } else {
                        setLogoUrl(DEFAULT_LOGO);
                    }
                } else {
                    setLogoUrl(DEFAULT_LOGO);
                }

                setMenuItems(dynamicRoutes.map((route) => ({
                    label: route.label,
                    path: route.path
                })));

                if (typeof privateHome === 'string' && privateHome.trim()) {
                    setPrivateHomePath(privateHome);
                }
            } catch (err) {
                console.error('Error en el flujo de header dinamico:', err);
                setLogoError(true);
                setLogoUrl(DEFAULT_LOGO);
                setMenuItems([]);
            }
        };

        fetchHeaderData();
    }, [hasAdminScope]);

    useEffect(() => {
        const handleScroll = (): void => {
            setIsScrolled(window.pageYOffset > 10);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleRemoveItem = async (e: React.MouseEvent, item: CartItem): Promise<void> => {
        e.stopPropagation();
        const result = await Swal({
            title: '¿Eliminar producto?',
            text: `¿Estás seguro de que quieres eliminar ${item.name} del carrito?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });
        if (result.isConfirmed) {
            removeFromCart(item.id, item.color?.pantone);
            toast.success('Producto eliminado del carrito');
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
            navigate('/login');
            toast.success('Sesión cerrada correctamente');
        }
    };

    const isLinkActive = (path: string): boolean => {
        if (path === "/") return location.pathname === "/";
        return location.pathname.startsWith(path);
    };

    const getUserInitials = (): string => {
        if (!user) return 'U';
        return user.nombre?.charAt(0)?.toUpperCase() || user.correo?.charAt(0)?.toUpperCase() || 'U';
    };

    const getUserName = (): string => {
        if (!user) return 'Usuario';
        return user.nombre || user.correo?.split('@')[0] || 'Usuario';
    };

    const getUserEmail = (): string => {
        if (!user) return '';
        return user.correo || '';
    };

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
        const target = e.target as HTMLImageElement;
        target.onerror = null;
        target.src = "https://placehold.co/48x48/f3f4f6/a3a3a3?text=IMG";
    };

    const handleLogoError = (): void => {
        if (!logoError && logoUrl !== DEFAULT_LOGO) {
            console.warn('⚠️ Error al renderizar imagen del logo, usando fallback');
            setLogoError(true);
            setLogoUrl(DEFAULT_LOGO);
        }
    };

    const renderCartDropdown = (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 hover:bg-accent transition-colors">
                    <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs font-bold rounded-full h-4 min-w-4 justify-center"
                    >
                        {totalItems}
                    </Badge>
                    <ShoppingCart className="h-5 w-5 text-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-80 p-4 backdrop-blur-lg border-none shadow-xl"
                align="end"
            >
                {cartItems.length === 0 ? (
                    <DropdownMenuItem disabled className="text-center justify-center font-medium py-4">
                        Tu carrito está vacío
                    </DropdownMenuItem>
                ) : (
                    <>
                        {cartItems.map((item: CartItem) => (
                            <DropdownMenuItem key={`${item.id}-${item.color?.pantone}`} className="flex items-center gap-3 py-3 h-auto cursor-default pointer-events-none border-b border-border/30 last:border-b-0">
                                <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-12 h-12 object-cover rounded-md flex-shrink-0"
                                    onError={handleImageError}
                                />
                                <div className="flex-1 overflow-hidden pointer-events-auto">
                                    <p className="font-semibold text-sm truncate leading-tight">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">Cant: {item.quantity} {item.color?.name ? `- ${item.color.name}` : ''}</p>
                                </div>
                                <p className="font-semibold text-sm flex-shrink-0 pointer-events-auto">${(item.price * item.quantity).toFixed(2)}</p>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0 h-6 w-6 ml-1 text-destructive hover:bg-destructive/10 pointer-events-auto"
                                    onClick={(e) => handleRemoveItem(e, item)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator className="my-3" />
                        <div className="flex justify-between items-center p-2 pt-0">
                            <p className="text-base font-semibold">Total:</p>
                            <p className="text-lg font-bold text-primary">${cartTotal.toFixed(2)}</p>
                        </div>
                        <div className="flex gap-2 p-2 pt-0">
                            <Button variant="outline" className="flex-1" onClick={() => navigate('/carrito')}>Ver Carrito</Button>
                            <Button className="flex-1" onClick={() => navigate('/checkout')}>Finalizar Compra</Button>
                        </div>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const renderProfileDropdown = (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 p-0 rounded-full hover:border-primary/40 transition-colors">
                    <Avatar className="h-full w-full">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                            {getUserInitials()}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 backdrop-blur-lg border-none shadow-xl" align="end">
                <div className="flex items-center gap-2 p-3">
                    <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                            {getUserInitials()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-0.5">
                        <p className="text-sm font-medium leading-none">{getUserName()}</p>
                        <p className="text-xs leading-none text-muted-foreground">{getUserEmail()}</p>
                    </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/perfil")} className="cursor-pointer py-2.5">
                    <User className="mr-2 h-4 w-4" /> Mi Perfil
                </DropdownMenuItem>
                {hasAdminScope && (
                    <DropdownMenuItem onClick={() => navigate(privateHomePath)} className="cursor-pointer py-2.5">
                        <ShieldCheck className="mr-2 h-4 w-4" /> Panel Admin
                    </DropdownMenuItem>
                )}
                {user && hasActiveMembership && (
                    <DropdownMenuItem onClick={() => navigate("/membresia/dashboard")} className="cursor-pointer py-2.5">
                        <Crown className="mr-2 h-4 w-4" /> Mi Membresía
                    </DropdownMenuItem>
                )}
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
                <Button variant="default" onClick={() => navigate("/public/render/view/login")} className="h-9 px-4 text-sm font-semibold bg-black hover:bg-gray-800 text-white">
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
                                    <Link to={item.path} className={`flex items-center justify-between px-4 py-3 text-base font-medium rounded-xl transition-all duration-200 border ${isActive ? 'text-primary border-primary shadow-sm' : 'text-foreground border-transparent hover:bg-accent/50 hover:border-accent'}`}>
                                        <span className="font-semibold">{item.label}</span>
                                        <ChevronRight className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                                    </Link>
                                </SheetClose>
                            );
                        })}
                        {hasAdminScope && (
                            <SheetClose asChild>
                                <Link to={privateHomePath} className="flex items-center justify-between px-4 py-3 text-base font-medium rounded-xl transition-all duration-200 border border-transparent hover:bg-accent/50 hover:border-accent text-foreground">
                                    <span className="font-semibold flex items-center"><ShieldCheck className="mr-3 h-5 w-5" /> Panel Admin</span>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </Link>
                            </SheetClose>
                        )}
                        {user && hasActiveMembership && (
                            <SheetClose asChild>
                                <Link to="/membresia/dashboard" className="flex items-center justify-between px-4 py-3 text-base font-medium rounded-xl transition-all duration-200 border border-transparent hover:bg-accent/50 hover:border-accent text-foreground">
                                    <span className="font-semibold flex items-center"><Crown className="mr-3 h-5 w-5" /> Mi Membresía</span>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </Link>
                            </SheetClose>
                        )}
                    </div>
                    <div className="flex flex-col gap-3 p-6 border-t border-border/30 bg-background/50 backdrop-blur-md">
                        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-accent/30">
                            <span className="text-sm font-semibold">Tema</span>
                            <ThemeToggle />
                        </div>
                        <SheetClose asChild>
                            <Button variant="outline" onClick={() => navigate('/carrito')} className="w-full justify-between font-semibold py-3 rounded-xl border-border/50 hover:border-primary/50">
                                <span className="flex items-center"><ShoppingCart className="mr-3 h-4 w-4" /> Ver Carrito</span>
                                <Badge variant="destructive" className="ml-2">{totalItems}</Badge>
                            </Button>
                        </SheetClose>
                        {user ? (
                            <>
                                <SheetClose asChild>
                                    <Button variant="outline" onClick={() => navigate('/perfil')} className="w-full justify-start font-semibold py-3 rounded-xl border-border/50 hover:border-primary/50">
                                        <User className="mr-3 h-4 w-4" /> Mi Perfil
                                    </Button>
                                </SheetClose>
                                <SheetClose asChild>
                                    <Button variant="destructive" onClick={handleLogout} className="w-full justify-start font-semibold py-3 rounded-xl">
                                        <LogOut className="mr-3 h-4 w-4" /> Cerrar Sesión
                                    </Button>
                                </SheetClose>
                            </>
                        ) : (
                            <SheetClose asChild>
                                <Button variant="default" onClick={() => navigate('/public/render/view/login')} className="w-full justify-start font-semibold py-3 rounded-xl bg-black hover:bg-gray-800 text-white">
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
                            <img
                                src={logoError ? DEFAULT_LOGO : logoUrl}
                                alt="Logo"
                                className="h-7 md:h-8 max-w-[120px] object-contain cursor-pointer flex-shrink-0 hover:opacity-80 transition-opacity"
                                onClick={() => navigate("/")}
                                onError={handleLogoError}
                            />
                        </div>

                        <div className="hidden md:flex items-center gap-1 h-full ml-6">
                            {menuItemsWithoutCart.map((item) => {
                                const isActive = isLinkActive(item.path);
                                return (
                                    <Link key={item.label} to={item.path} className={`text-sm font-medium transition-all duration-200 h-full flex items-center px-4 relative ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}`}>
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


