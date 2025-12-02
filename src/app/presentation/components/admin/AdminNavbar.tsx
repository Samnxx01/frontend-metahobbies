// src/presentation/components/admin/AdminNavbar.tsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { useTheme } from 'next-themes'

// Shadcn UI components
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

// Lucide icons
import { Menu, Search, Bell, Sun, Moon, Home, LogOut, User as UserIcon, Settings } from 'lucide-react'

import type { AdminNavbarProps } from '@/types/components'

const LOGO_URL = "/assets/logo.png"

export default function AdminNavbar({ mobileOpen, setMobileOpen, title }: AdminNavbarProps): React.ReactElement {
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const { theme, setTheme } = useTheme()

    const toggleTheme = (): void => {
        setTheme(theme === 'dark' ? 'light' : 'dark')
    }

    const handleViewProfile = (): void => {
        navigate('/perfil')
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

    return (
        <header
            className="fixed top-0 left-0 right-0 z-1200 bg-background text-foreground shadow-sm border-b border-border h-[70px]"
        >
            <div className="flex items-center justify-between h-full px-4 sm:px-6 lg:px-8">

                {/* --- IZQUIERDA: Logo, Menú Mobile y Búsqueda --- */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={handleMenuToggle}>
                        <Menu className="h-6 w-6" />
                        <span className="sr-only">Toggle sidebar</span>
                    </Button>

                    {/* Título si se proporciona */}
                    {title && (
                        <h1 className="text-lg font-semibold text-foreground hidden md:block">
                            {title}
                        </h1>
                    )}

                    {/* Barra de Búsqueda Estilizada */}
                    <div className="hidden sm:flex items-center bg-muted/50 px-3 py-1.5 rounded-md border border-input focus-within:border-primary focus-within:ring-1 focus-within:ring-primary w-64">
                        <Search className="h-4 w-4 text-muted-foreground mr-2" />
                        <Input type="text" placeholder="Buscar..." className="text-sm border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent" />
                    </div>
                </div>

                {/* --- DERECHA: Íconos de Acción y Perfil --- */}
                <div className="flex items-center gap-4">

                    {/* Botón Home */}
                    <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-muted-foreground hover:text-primary">
                        <Home className="h-5 w-5" />
                        <span className="sr-only">Ir a Home</span>
                    </Button>

                    {/* Toggle Theme */}
                    <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-primary">
                        {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                        <span className="sr-only">Toggle theme</span>
                    </Button>

                    {/* Notificaciones */}
                    <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary">
                        <Badge variant="destructive" className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs font-bold rounded-full">
                            3
                        </Badge>
                        <Bell className="h-5 w-5" />
                        <span className="sr-only">Notificaciones</span>
                    </Button>

                    {/* Avatar (Target para el Menú) */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-10 w-auto p-1 rounded-full flex items-center gap-2 hover:bg-muted">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={ LOGO_URL} alt={user?.nombre || "Admin"} />
                                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                                        {user?.nombre ? user.nombre[0] : 'A'}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="hidden md:block text-sm font-medium">
                                    {user?.nombre || 'Admin'}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount={true}>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{user?.nombre || 'Admin'}</p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        {user?.correo || 'admin@example.com'}
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleViewProfile}>
                                <UserIcon className="mr-2 h-4 w-4" />
                                <span>Ver Perfil</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate("/admin/configuracion")}>
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Configuración</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="hover:bg-white dark:hover:bg-white hover:text-foreground">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Cerrar Sesión</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                </div>
            </div>
        </header>
    )
}