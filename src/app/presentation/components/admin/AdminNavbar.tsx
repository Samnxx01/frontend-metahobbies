// src/presentation/components/admin/AdminNavbar.tsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { useTheme } from 'next-themes'
import { useMembership } from '@/app/hooks/useMembership'

// Shadcn UI components
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// Lucide icons
import { Menu, Sun, Moon, Home, LogOut, User as UserIcon, Crown } from 'lucide-react'

import type { AdminNavbarProps } from '@/types/components'

const LOGO_URL = "/assets/logo.png"

export default function AdminNavbar({ mobileOpen, setMobileOpen }: AdminNavbarProps): React.ReactElement {
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const { theme, setTheme } = useTheme()
    const { hasActiveMembership } = useMembership()

    const toggleTheme = (): void => {
        setTheme(theme === 'dark' ? 'light' : 'dark')
    }

    const handleLogout = (): void => {
        logout()
        navigate('/login')
    }

    const handleMenuToggle = (): void => {
        if (setMobileOpen) {
            setMobileOpen(!mobileOpen)
        }
    }

    const getUserInitials = (): string => {
        if (user?.nombre && user?.apellido) {
            return `${user.nombre[0]}${user.apellido[0]}`.toUpperCase()
        }
        return user?.nombre?.[0]?.toUpperCase() || 'A'
    }

    const getUserName = (): string => {
        if (user?.nombre && user?.apellido) {
            return `${user.nombre} ${user.apellido}`
        }
        return user?.nombre || 'Admin'
    }

    const getUserEmail = (): string => {
        return user?.correo || 'admin@example.com'
    }

    // Dropdown de perfil mejorado y seguro (estilo PublicLayout)
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
                    <UserIcon className="mr-2 h-4 w-4" />
                    Mi Perfil
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate("/")} className="cursor-pointer py-2.5">
                    <Home className="mr-2 h-4 w-4" />
                    Inicio
                </DropdownMenuItem>

                {hasActiveMembership && (
                    <DropdownMenuItem onClick={() => navigate("/membresia/dashboard")} className="cursor-pointer py-2.5">
                        <Crown className="mr-2 h-4 w-4" />
                        Membresía
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive py-2.5">
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )

    return (
        <header
            className="fixed top-0 left-0 right-0 z-50 shadow-lg backdrop-blur-md bg-background/95 border-b border-border h-16"
        >
            <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

                {/* --- IZQUIERDA: Logo y Menú Mobile --- */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={handleMenuToggle}>
                        <Menu className="h-6 w-6" />
                        <span className="sr-only">Toggle sidebar</span>
                    </Button>

                    {/* Logo */}
                    <div className="dark:bg-white dark:rounded-lg dark:p-1.5 dark:shadow-sm">
                        <img
                            src={LOGO_URL}
                            alt="Mabs Logo"
                            className="h-7 md:h-8 cursor-pointer flex-shrink-0 hover:opacity-80 transition-opacity"
                            onClick={() => navigate("/admin/dashboard")}
                        />
                    </div>
                </div>

                {/* --- DERECHA: Toggle Theme y Perfil --- */}
                <div className="flex items-center gap-2">
                    
                    {/* Toggle Theme */}
                    <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9">
                        {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                        <span className="sr-only">Toggle theme</span>
                    </Button>

                    {/* Avatar Dropdown */}
                    {renderProfileDropdown}

                </div>
            </div>
        </header>
    )
}