import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from 'next-themes'
import { useAuth } from '@/app/providers/AuthProvider'
import { useMembership } from '@/app/hooks/useMembership'
import { apiFetch } from '@/app/services/api'
import { getPrivateHomeRoute, getUserShortcutRoutes } from '@/app/services/routeService'
import { resolveCurrentRouteMenuTags, RouteMenuTag } from '@/app/services/routesService'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Crown, Home, Landmark, LayoutDashboard, LogOut, Menu, Moon, Settings, Sun, User as UserIcon } from 'lucide-react'
import type { AdminNavbarProps } from '@/types/components'

const DEFAULT_LOGO = "/assets/logo.png"
const ADMIN_PROFILE_VIEW_PATH = '/admin/parametros/perfil/visualizacion'

const MENU_ICON_MAP: Record<string, React.ElementType> = {
    USER: UserIcon,
    HOME: Home,
    CROWN: Crown,
    LAYOUT_DASHBOARD: LayoutDashboard,
    SETTINGS: Settings,
    LANDMARK: Landmark,
    CIRCLE: UserIcon,
}

export default function AdminNavbar({ mobileOpen, setMobileOpen }: AdminNavbarProps): React.ReactElement {
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const { theme, setTheme } = useTheme()
    const { hasActiveMembership } = useMembership()
    const [logoUrl, setLogoUrl] = useState<string>(DEFAULT_LOGO)
    const [logoError, setLogoError] = useState<boolean>(false)
    const [adminHomePath, setAdminHomePath] = useState<string>('/admin')
    const [profilePath, setProfilePath] = useState<string>(ADMIN_PROFILE_VIEW_PATH)
    const [membershipPath, setMembershipPath] = useState<string>('/membresia/dashboard')
    const [dynamicMenuTags, setDynamicMenuTags] = useState<RouteMenuTag[]>([])

    useEffect(() => {
        let active = true

        const cargarLogoAdmin = async (): Promise<void> => {
            try {
                const resContextual = await apiFetch('/api/config/parametrizacion/listar/logos/coporativo/admin', {
                    method: 'GET',
                    useAuth: true,
                    logoutOn401: false
                })

                if (!active) return

                if (resContextual?.ok && resContextual?.logo?.base64 && resContextual?.logo?.mimetype) {
                    setLogoUrl(`data:${resContextual.logo.mimetype};base64,${resContextual.logo.base64}`)
                    setLogoError(false)
                    return
                }

                const resPublico = await apiFetch('/api/config/parametrizacion/listar/logos/coporativo', {
                    method: 'GET',
                    useAuth: false,
                    logoutOn401: false
                })

                if (!active) return

                if (resPublico?.ok && resPublico?.logo?.base64 && resPublico?.logo?.mimetype) {
                    setLogoUrl(`data:${resPublico.logo.mimetype};base64,${resPublico.logo.base64}`)
                    setLogoError(false)
                    return
                }

                setLogoUrl(DEFAULT_LOGO)
                setLogoError(false)
            } catch (_error) {
                if (!active) return
                setLogoUrl(DEFAULT_LOGO)
                setLogoError(true)
            }
        }

        cargarLogoAdmin()
        return () => {
            active = false
        }
    }, [user?._id, user?.correo, user?.rol])

    useEffect(() => {
        let active = true

        const cargarShortcuts = async (): Promise<void> => {
            try {
                const [shortcuts, privateHome] = await Promise.all([
                    getUserShortcutRoutes(),
                    getPrivateHomeRoute()
                ])

                if (!active) return
                setAdminHomePath(privateHome || '/admin')
                setProfilePath(ADMIN_PROFILE_VIEW_PATH)
                setMembershipPath(shortcuts.membresia || '/membresia/dashboard')
            } catch (_error) {
                if (!active) return
                setAdminHomePath('/admin')
                setProfilePath(ADMIN_PROFILE_VIEW_PATH)
                setMembershipPath('/membresia/dashboard')
            }
        }

        cargarShortcuts()
        return () => {
            active = false
        }
    }, [user?._id])

    useEffect(() => {
        let active = true

        const cargarMenuDinamico = async (): Promise<void> => {
            try {
                const response = await resolveCurrentRouteMenuTags({ menuTipo: 'USER_DROPDOWN' })
                if (!active) return
                setDynamicMenuTags(Array.isArray(response?.data) ? response.data.filter((item) => item.estado !== false) : [])
            } catch (error) {
                if (!active) return
                console.error('Error cargando menu dinamico del avatar:', error)
                setDynamicMenuTags([])
            }
        }

        cargarMenuDinamico()
        return () => {
            active = false
        }
    }, [user?._id])

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

    const menuItems = dynamicMenuTags.map((tag) => ({
        key: tag.iud,
        label: tag.label,
        path: tag.ruta?.path || tag.routePath,
        Icon: MENU_ICON_MAP[String(tag.iconKey || '').toUpperCase()] || UserIcon,
        visible: true,
    }))

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
                {menuItems.filter((item) => item.visible && item.path).length > 0 ? (
                    <>
                        {menuItems.filter((item) => item.visible && item.path).map((item) => {
                            const Icon = item.Icon
                            return (
                                <DropdownMenuItem key={item.key} onClick={() => navigate(item.path)} className="cursor-pointer py-2.5">
                                    <Icon className="mr-2 h-4 w-4" />
                                    {item.label}
                                </DropdownMenuItem>
                            )
                        })}
                        <DropdownMenuSeparator />
                    </>
                ) : null}
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive py-2.5">
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesion
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )

    return (
        <header className="fixed top-0 left-0 right-0 z-50 shadow-lg backdrop-blur-md bg-background/95 border-b border-border h-16">
            <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={handleMenuToggle}>
                        <Menu className="h-6 w-6" />
                        <span className="sr-only">Toggle sidebar</span>
                    </Button>

                    <div className="dark:bg-white dark:rounded-lg dark:p-1.5 dark:shadow-sm">
                        <img
                            src={logoError ? DEFAULT_LOGO : logoUrl}
                            alt="Mabs Logo"
                            className="h-7 md:h-8 cursor-pointer flex-shrink-0 hover:opacity-80 transition-opacity"
                            onClick={() => navigate(adminHomePath)}
                            onError={() => {
                                setLogoError(true)
                                setLogoUrl(DEFAULT_LOGO)
                            }}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9">
                        {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                        <span className="sr-only">Toggle theme</span>
                    </Button>
                    {renderProfileDropdown}
                </div>
            </div>
        </header>
    )
}
