import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from 'next-themes'
import { useAuth } from '@/app/providers/AuthProvider'
import { apiFetch } from '@/app/services/api'
import { getMenuUsuarioRoutes, getPrivateHomeRoute, readCachedPrivateHomeRoute, type MenuUsuarioItem } from '@/app/services/routeService'
import { getGovernedLogoutPath } from '@/app/services/governedNavigation'
import { resolveUserDisplayName, resolveUserInitial } from '@/app/presentation/utils/resolveUserDisplayName'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Crown, Home, Landmark, LayoutDashboard, LogOut, Menu, Moon, Settings, Sun, User as UserIcon } from 'lucide-react'
import type { AdminNavbarProps } from '@/types/components'

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
    const [logoUrl, setLogoUrl] = useState<string | null>(null)
    const [logoLoading, setLogoLoading] = useState<boolean>(true)
    const [adminHomePath, setAdminHomePath] = useState<string>('/admin')
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
                const privateHome = await getPrivateHomeRoute()

                if (!active) return
                setAdminHomePath(privateHome || readCachedPrivateHomeRoute() || '/public/render/home')
            } catch (_error) {
                if (!active) return
                setAdminHomePath(readCachedPrivateHomeRoute() || '/public/render/home')
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

    const getUserInitials = (): string => resolveUserInitial(user)

    const getUserName = (): string => resolveUserDisplayName(user)

    const getUserEmail = (): string => {
        if (!user) return ''
        return user.correo || ''
    }

    const getUserRoleLabel = (): string => {
        if (!user) return ''
        const tenantRole = user.auth?.tenantScope?.rol?.nombre
        return String(user.rolInfo?.nombre || tenantRole || user.rol || user.role || '').trim()
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
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full border border-button/60 bg-background/70 p-0 shadow-sm hover:bg-button/20"
                >
                    <Avatar className="h-full w-full">
                        <AvatarFallback className="bg-button text-button-foreground text-sm font-semibold">
                            {getUserInitials()}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-[min(calc(100vw-1.5rem),22rem)] overflow-hidden rounded-lg border border-border/70 bg-popover p-0 text-popover-foreground shadow-xl"
                align="end"
                sideOffset={10}
            >
                <div className="border-b border-border bg-muted/35 px-3.5 py-3">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 shrink-0 ring-1 ring-border">
                            <AvatarFallback className="bg-button text-button-foreground text-sm font-semibold">
                                {getUserInitials()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold leading-5 text-foreground">{getUserName()}</p>
                            {getUserEmail() ? (
                                <p className="truncate text-xs leading-4 text-muted-foreground">{getUserEmail()}</p>
                            ) : null}
                            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
                                {getUserRoleLabel() ? (
                                    <span className="max-w-full truncate rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-medium leading-4 text-foreground">
                                        {getUserRoleLabel()}
                                    </span>
                                ) : (
                                    <span className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-medium leading-4 text-foreground">
                                        Panel privado
                                    </span>
                                )}
                                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium leading-4 text-primary">
                                    {visibleMenuItems.length} accesos
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="max-h-[min(420px,var(--radix-dropdown-menu-content-available-height))] overflow-y-auto px-2 py-2">
                    {visibleMenuItems.length > 0 ? (
                        <div className="space-y-0.5">
                            <div className="px-2 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                Accesos rapidos
                            </div>
                            {visibleMenuItems.map((item) => {
                                const Icon = item.Icon
                                return (
                                    <DropdownMenuItem
                                        key={item.key}
                                        asChild
                                        className="cursor-pointer rounded-md p-0 focus:bg-transparent"
                                    >
                                        <a
                                            href={item.path}
                                            onClick={(e) => {
                                                if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return
                                                e.preventDefault()
                                                setMenuOpen(false)
                                                navigate(item.path)
                                            }}
                                            className="group flex h-10 min-w-0 items-center gap-3 rounded-md px-2.5 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                                <Icon className="h-4 w-4" />
                                            </span>
                                            <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                                                {item.label}
                                            </span>
                                        </a>
                                    </DropdownMenuItem>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5 text-center">
                            <p className="text-sm font-medium text-foreground">Sin accesos visibles</p>
                            <p className="mt-1 text-xs text-muted-foreground">Cuando parametrices los tags del avatar, apareceran aqui.</p>
                        </div>
                    )}
                </div>
                <div className="border-t border-border bg-muted/25 p-2">
                    <DropdownMenuItem
                        onClick={handleLogout}
                        className="h-10 cursor-pointer rounded-md px-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive"
                    >
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-destructive/10">
                            <LogOut className="h-4 w-4" />
                        </span>
                        <span className="ml-3 text-sm font-medium">Cerrar Sesion</span>
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
