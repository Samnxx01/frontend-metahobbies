import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Swal from 'sweetalert2'
import { toast } from 'react-toastify'

// Importar Providers
import { useAuth } from "@/app/providers/AuthProvider";
import { useCart } from "@/app/providers/CartProvider";
import { useMembership } from "@/app/providers/MembershipProvider";

// Shadcn UI components
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Lucide icons
import { Menu, ShoppingCart, User, X, Trash2, ShieldCheck, DollarSign, LogOut, LogIn, ChevronRight, Crown } from "lucide-react";

const LOGO_URL = "/assets/logo.png";

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const { cartItems, totalItems, removeFromCart, cartTotal } = useCart();
    const { hasActiveMembership } = useMembership();

    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.pageYOffset > 10);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Función de eliminación del carrito
    const handleRemoveItem = async (e, item) => {
        e.stopPropagation();
        const result = await Swal.fire({
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

    const handleLogout = async () => {
        const result = await Swal.fire({
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
            toast.success('Sesión cerrada correctamente');
        }
    };

    const menuItems = [
        { label: "Inicio", path: "/" },
        { label: "Descubre tu Tono", path: "/descubre-tono" },
        { label: "Sobre Nosotros", path: "/sobre-nosotros" },
        { label: "Productos", path: "/productos" },
        { label: "Modelo de Negocio", path: "/modelo-negocio" },
        { label: "Eventos", path: "/eventos" },
        { label: "Contacto", path: "/contacto" },
    ];

    // Función para determinar si un enlace está activo
    const isLinkActive = (path) => {
        if (path === "/") {
            return location.pathname === "/";
        }
        return location.pathname.startsWith(path);
    };

    // Función segura para obtener iniciales del usuario
    const getUserInitials = () => {
        if (!user) return 'U';
        return user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U';
    };

    // Función segura para obtener nombre de usuario
    const getUserName = () => {
        if (!user) return 'Usuario';
        return user.name || user.email?.split('@')[0] || 'Usuario';
    };

    // Función segura para obtener email de usuario
    const getUserEmail = () => {
        if (!user) return '';
        return user.email || '';
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
                    <ShoppingCart className="h-5 w-5" />
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
                        {cartItems.map((item) => (
                            <DropdownMenuItem key={`${item.id}-${item.color?.pantone}`} className="flex items-center gap-3 py-3 h-auto cursor-default pointer-events-none border-b border-border/30 last:border-b-0">
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-12 h-12 object-cover rounded-md flex-shrink-0"
                                        onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/48x48/f3f4f6/a3a3a3?text=IMG"; }}
                                    />
                                    <div className="flex-1 overflow-hidden pointer-events-auto">
                                        <p className="font-semibold text-sm truncate leading-tight">{item.name}</p>
                                        <p className="text-xs text-muted-foreground">Cant: {item.quantity} - {item.color?.name || ''}</p>
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

    // Dropdown de perfil mejorado y seguro
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
            <DropdownMenuContent
                className="w-56 backdrop-blur-lg border-none shadow-xl"
                align="end"
            >
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
                    <User className="mr-2 h-4 w-4" />
                    Mi Perfil
                </DropdownMenuItem>

                {user?.role === 'ADMIN' && (
                    <DropdownMenuItem onClick={() => navigate("/admin/dashboard")} className="cursor-pointer py-2.5">
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Panel Admin
                    </DropdownMenuItem>
                )}

                {user && hasActiveMembership && (
                    <DropdownMenuItem onClick={() => navigate("/membresia/dashboard")} className="cursor-pointer py-2.5">
                        <Crown className="mr-2 h-4 w-4" />
                        Mi Membresía
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive py-2.5">
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const renderAuthSection = (
        <div className="flex items-center gap-2">
            <div className="hidden md:block relative mr-2">
                {renderCartDropdown}
            </div>

            {user ? (
                renderProfileDropdown
            ) : (
                <Button
                    variant="default"
                    onClick={() => navigate("/login")}
                    className="h-9 px-4 text-sm font-semibold bg-black hover:bg-gray-800 text-white"
                >
                    <LogIn className="mr-2 h-4 w-4" />
                    Ingresar
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
            <SheetContent side="right" className="w-full sm:max-w-xs p-0 backdrop-blur-md border-l border-border/50 -[100]">
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <SheetHeader className="p-6 border-b border-border/30 backdrop-blur-md bg-background/80">
                        <div className="flex items-center justify-between">
                            <SheetTitle className="text-xl font-bold text-foreground">Menú</SheetTitle>
                            <SheetClose asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-accent/50"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </SheetClose>
                        </div>
                    </SheetHeader>

                    {/* Contenido del menú */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-3">
                        {menuItems.map((item) => {
                            const isActive = isLinkActive(item.path);
                            return (
                                <SheetClose asChild key={item.label}>
                                    <Link
                                        to={item.path}
                                        className={`flex items-center justify-between px-4 py-3 text-base font-medium rounded-xl transition-all duration-200 border
                                            ${isActive
                                                ? 'bg-primary text-primary-foreground border-primary shadow-sm hover:bg-primary/90'
                                                : 'text-foreground border-transparent hover:bg-accent/50 hover:border-accent'}`}
                                    >
                                        <span className="font-semibold">{item.label}</span>
                                        <ChevronRight className={`h-4 w-4 ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`} />
                                    </Link>
                                </SheetClose>
                            );
                        })}

                        {/* Panel Admin y Mi Membresía como items normales del menú */}
                        {user?.role === 'ADMIN' && (
                            <SheetClose asChild>
                                <Link
                                    to="/admin/dashboard"
                                    className={`flex items-center justify-between px-4 py-3 text-base font-medium rounded-xl transition-all duration-200 border border-transparent hover:bg-accent/50 hover:border-accent text-foreground`}
                                >
                                    <span className="font-semibold flex items-center">
                                        <ShieldCheck className="mr-3 h-5 w-5" />
                                        Panel Admin
                                    </span>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </Link>
                            </SheetClose>
                        )}

                        {user && hasActiveMembership && (
                            <SheetClose asChild>
                                <Link
                                    to="/membresia/dashboard"
                                    className={`flex items-center justify-between px-4 py-3 text-base font-medium rounded-xl transition-all duration-200 border border-transparent hover:bg-accent/50 hover:border-accent text-foreground`}
                                >
                                    <span className="font-semibold flex items-center">
                                        <Crown className="mr-3 h-5 w-5" />
                                        Mi Membresía
                                    </span>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </Link>
                            </SheetClose>
                        )}
                    </div>

                    {/* Footer con acciones */}
                    <div className="flex flex-col gap-3 p-6 border-t border-border/30 bg-background/50 backdrop-blur-md">
                        {/* Carrito Móvil */}
                        <SheetClose asChild>
                            <Button
                                variant="outline"
                                onClick={() => navigate('/carrito')}
                                className="w-full justify-between font-semibold py-3 rounded-xl border-border/50 hover:border-primary/50"
                            >
                                <span className="flex items-center">
                                    <ShoppingCart className="mr-3 h-4 w-4" />
                                    Ver Carrito
                                </span>
                                <Badge variant="destructive" className="ml-2">{totalItems}</Badge>
                            </Button>
                        </SheetClose>

                        {user ? (
                            <>
                                <SheetClose asChild>
                                    <Button
                                        variant="outline"
                                        onClick={() => navigate('/perfil')}
                                        className="w-full justify-start font-semibold py-3 rounded-xl border-border/50 hover:border-primary/50"
                                    >
                                        <User className="mr-3 h-4 w-4" />
                                        Mi Perfil
                                    </Button>
                                </SheetClose>
                                <SheetClose asChild>
                                    <Button
                                        variant="destructive"
                                        onClick={handleLogout}
                                        className="w-full justify-start font-semibold py-3 rounded-xl"
                                    >
                                        <LogOut className="mr-3 h-4 w-4" />
                                        Cerrar Sesión
                                    </Button>
                                </SheetClose>
                            </>
                        ) : (
                            <SheetClose asChild>
                                <Button
                                    variant="default"
                                    onClick={() => navigate('/login')}
                                    className="w-full justify-start font-semibold py-3 rounded-xl bg-black hover:bg-gray-800 text-white"
                                >
                                    <LogIn className="mr-3 h-4 w-4" />
                                    Ingresar
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
            <nav
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out
                    ${isScrolled
                        ? "shadow-lg backdrop-blur-md bg-background/95"
                        : "bg-background/80 backdrop-blur-md"}`}
            >
                <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[57px] md:h-16 flex items-center justify-between">
                    {/* Logo y Menú Principal */}
                    <div className="flex items-center h-full">
                        <img
                            src={LOGO_URL}
                            alt="Mabs Logo"
                            className="h-7 md:h-8 cursor-pointer flex-shrink-0 mr-6 hover:opacity-80 transition-opacity"
                            onClick={() => navigate("/")}
                        />

                        {/* Menú principal (Desktop) */}
                        <div className="hidden md:flex items-center gap-1 h-full">
                            {menuItems.map((item) => {
                                const isActive = isLinkActive(item.path);
                                return (
                                    <Link
                                        key={item.label}
                                        to={item.path}
                                        className={`text-sm font-medium transition-all duration-200 h-full flex items-center px-4 rounded-full relative
                                            ${isActive
                                                ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}`}
                                    >
                                        {item.label}
                                        {isActive && (
                                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-foreground/60 rounded-full"></div>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Íconos y botones de autenticación */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {renderAuthSection}
                        <div className="md:hidden">
                            {renderMobileMenu}
                        </div>
                    </div>
                </div>
            </nav>
        </>
    );
}