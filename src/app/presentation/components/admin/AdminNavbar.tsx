import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from 'next-themes'
import { useAuth } from '@/app/providers/AuthProvider'
import { useMembership } from '@/app/hooks/useMembership'
import { apiFetch } from '@/app/services/api'
import { getMenuUsuarioRoutes, getPrivateHomeRoute, getUserShortcutRoutes, readCachedPrivateHomeRoute, type MenuUsuarioItem } from '@/app/services/routeService'
import { getRouteMenuTags, resolveCurrentRouteMenuTags, type RouteMenuTag } from '@/app/services/routesService'
import { getGovernedLogoutPath } from '@/app/services/governedNavigation'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Crown, Home, Landmark, LayoutDashboard, LogOut, Menu, Moon, Settings, Sun, User as UserIcon } from 'lucide-react'
import type { AdminNavbarProps } from '@/types/components'

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

const mergeMenuUsuarioItems = (...sources: Array<MenuUsuarioItem[] | RouteMenuTag[] | null | undefined>): MenuUsuarioItem[] => {
    const items = new Map<string, MenuUsuarioItem>()

    sources.forEach((source) => {
        ; (Array.isArray(source) ? source : []).forEach((row: any) => {
            const key = String(row?.key || row?.codigo || row?.iud || '').trim()
            const path = String(row?.path || row?.routePath || row?.ruta?.path || '').trim()
            const label = String(row?.label || row?.nombreTag || '').trim()

            if (!key || !path || !label) return

            items.set(key, {
                key,
                label,
                path,
                icon: row?.icon ?? row?.iconKey ?? null,
                order: Number(row?.order ?? 0),
            })
        })
    })

    return Array.from(items.values()).sort(
        (a, b) => Number(a.order ?? 0) - Number(b.order ?? 0) || String(a.label || '').localeCompare(String(b.label || ''))
    )
}

export default function AdminNavbar({ mobileOpen, setMobileOpen }: AdminNavbarProps): React.ReactElement {
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const { theme, setTheme } = useTheme()
    const { hasActiveMembership } = useMembership()
    const [logoUrl, setLogoUrl] = useState<string | null>(null)
    const [logoLoading, setLogoLoading] = useState<boolean>(true)
    const [adminHomePath, setAdminHomePath] = useState<string>('/admin')
    const [profilePath, setProfilePath] = useState<string>(ADMIN_PROFILE_VIEW_PATH)
    const [membershipPath, setMembershipPath] = useState<string>('/membresia/dashboard')
    const [dynamicMenuItems, setDynamicMenuItems] = useState<MenuUsuarioItem[]>([])
    const [menuOpen, setMenuOpen] = useState(false)

    useEffect(() => {
        let active = true

        const cargarLogoAdmin = async (): Promise<void> => {
            setLogoLoading(true)
            try {
                const resContextual = await apiFetch('/api/config/parametrizacion/listar/logos/coporativo/admin', {
                    method: 'GET',
                    useAuth: true,
                    logoutOn401: false
                })

                if (!active) return

                if (resContextual?.ok && resContextual?.logo?.dataUrl) {
                    setLogoUrl(resContextual.logo.dataUrl)
                    return
                }

                if (resContextual?.ok && resContextual?.logo?.base64 && resContextual?.logo?.mimetype) {
                    setLogoUrl(`data:${resContextual.logo.mimetype};base64,${resContextual.logo.base64}`)
                    return
                }
                setLogoUrl(null)
            } catch (_error) {
                if (!active) return
                // No fallback sin JWT: evita mostrar un logo publico global (otra marca) en rutas admin.
                setLogoUrl(null)
            } finally {
                if (active) setLogoLoading(false)
            }
        }

        cargarLogoAdmin()
        return () => {
            active = false
        }
    }, [user?.iud, user?._id, user?.correo, user?.rol])

    useEffect(() => {
        let active = true

        const cargarShortcuts = async (): Promise<void> => {
            try {
                const [shortcuts, privateHome] = await Promise.all([
                    getUserShortcutRoutes(),
                    getPrivateHomeRoute()
                ])

                if (!active) return
                setAdminHomePath(privateHome || readCachedPrivateHomeRoute() || '/public/render/home')
                setProfilePath(ADMIN_PROFILE_VIEW_PATH)
                setMembershipPath(shortcuts.membresia || '/membresia/dashboard')
            } catch (_error) {
                if (!active) return
                setAdminHomePath(readCachedPrivateHomeRoute() || '/public/render/home')
                setProfilePath(ADMIN_PROFILE_VIEW_PATH)
                setMembershipPath('/membresia/dashboard')
            }
        }

        cargarShortcuts()
        return () => {
            active = false
        }
    }, [user?.iud, user?._id, user?.correo])

    const cargarMenuDinamico = useCallback(async (): Promise<void> => {
        try {
            const resolvedItems = await getMenuUsuarioRoutes()
            console.log('[MABS][AdminNavbar][cargarMenuDinamico][resolvedItems]', resolvedItems)
            setDynamicMenuItems(Array.isArray(resolvedItems) ? resolvedItems : [])
        } catch (error) {
            console.error('Error cargando menu dinamico del avatar:', error)
            setDynamicMenuItems([])
        }
    }, [])

    useEffect(() => {
        void cargarMenuDinamico()

        const handleMenuUpdated = (): void => {
            void cargarMenuDinamico()
        }

        window.addEventListener('user-menu-tags-updated', handleMenuUpdated)
        return () => {
            window.removeEventListener('user-menu-tags-updated', handleMenuUpdated)
        }
    }, [cargarMenuDinamico, user?._id])

    useEffect(() => {
        if (!menuOpen) return
        void cargarMenuDinamico()
    }, [menuOpen, cargarMenuDinamico])

    const toggleTheme = (): void => {
        setTheme(theme === 'dark' ? 'light' : 'dark')
    }

    const handleLogout = (): void => {
        logout()
        navigate(getGovernedLogoutPath())
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

    const menuItems = [...dynamicMenuItems]
        .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0) || String(a.label || '').localeCompare(String(b.label || '')))
        .map((item) => ({
            key: item.key,
            label: item.label,
            path: item.path,
            Icon: MENU_ICON_MAP[String(item.icon || '').toUpperCase()] || UserIcon,
            visible: true,
        }))

    const visibleMenuItems = menuItems.filter((item) => item.visible && item.path)

    const renderProfileDropdown = (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
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
                className="w-80 overflow-hidden rounded-3xl border border-primary/10 bg-background/95 p-0 shadow-2xl backdrop-blur-2xl"
                align="end"
                sideOffset={14}
            >
                <div className="border-b border-primary/10 bg-gradient-to-br from-primary/10 via-background to-secondary/25 px-4 py-4">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11 ring-2 ring-primary/15">
                            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                                {getUserInitials()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold leading-none text-foreground">{getUserName()}</p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">{getUserEmail()}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <div className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                                    Panel privado
                                </div>
                                <div className="inline-flex items-center rounded-full bg-secondary/25 px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                                    {menuItems.length} accesos
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="px-3 py-3">
                    {menuItems.filter((item) => item.visible && item.path).length > 0 ? (
                        <div className="space-y-1.5">
                            <div className="px-2 pb-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                Navegacion dinamica
                            </div>
                            {menuItems.filter((item) => item.visible && item.path).map((item) => {
                                const Icon = item.Icon
                                return (
                                    <DropdownMenuItem
                                        key={item.key}
                                        asChild
                                        className="cursor-pointer rounded-2xl px-3 py-0 focus:bg-transparent"
                                    >
                                        <a
                                            href={item.path}
                                            onClick={(e) => { e.preventDefault(); navigate(item.path) }}
                                            className="group flex min-h-[56px] items-center gap-3 rounded-2xl border border-transparent bg-muted/35 px-3 py-3 transition-all hover:border-primary/15 hover:bg-primary/5"
                                        >
                                            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                                                <Icon className="h-4.5 w-4.5" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-medium text-foreground">{item.label}</span>
                                                <span className="block truncate text-xs text-muted-foreground">{item.path}</span>
                                            </span>
                                        </a>
                                    </DropdownMenuItem>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-primary/15 bg-muted/20 px-4 py-5 text-center">
                            <p className="text-sm font-medium text-foreground">Sin accesos visibles</p>
                            <p className="mt-1 text-xs text-muted-foreground">Cuando parametrices los tags del avatar, apareceran aqui.</p>
                        </div>
                    )}
                </div>
                <div className="border-t border-primary/10 bg-muted/15 p-3">
                    <DropdownMenuItem
                        onClick={handleLogout}
                        className="cursor-pointer rounded-2xl px-3 py-3 text-destructive focus:bg-destructive/5 focus:text-destructive"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Cerrar Sesion
                    </DropdownMenuItem>
                </div>
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

                    <div
                        className="cursor-pointer flex-shrink-0 hover:opacity-80 transition-opacity dark:rounded-lg dark:bg-card dark:p-1.5 dark:shadow-sm"
                        onClick={() => navigate(adminHomePath)}
                    >
                        {logoLoading ? (
                            <div className="h-7 md:h-8 w-20 rounded bg-muted animate-pulse" />
                        ) : logoUrl ? (
                            <img
                                src={logoUrl}
                                alt="Logo"
                                className="h-7 md:h-8"
                                onError={() => setLogoUrl(null)}
                            />
                        ) : (
                            <span className="text-xs text-muted-foreground italic px-1">
                                Sin logo guardado
                            </span>
                        )}
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
