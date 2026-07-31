import React, { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import AdminNavbar from '@/app/presentation/components/admin/AdminNavbar'
import AdminSidebar from '@/app/presentation/components/admin/AdminSidebar'
import { shouldShowAdminHerenciaSinPermisoAlert } from '@/app/services/routeService'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { GovernanceButtonScopeProvider } from '@/app/presentation/actions'

export default function AdminLayout() {
    const { user } = useAuth()
    const location = useLocation()
    const [mobileOpen, setMobileOpen] = useState(false)
    const [sinPermisoPorHerencia, setSinPermisoPorHerencia] = useState(null)

    useEffect(() => {
        setSinPermisoPorHerencia(null)
        let active = true
        void (async () => {
            try {
                const show = await shouldShowAdminHerenciaSinPermisoAlert(location.pathname)
                if (active) setSinPermisoPorHerencia(show)
            } catch (error) {
                console.error('[MABS][AdminLayout] Error verificando permisos', {
                    pathname: location.pathname,
                    error,
                })
                if (active) setSinPermisoPorHerencia(false)
            }
        })()
        return () => {
            active = false
        }
    }, [location.pathname])

    if (!user) {
        return null
    }

    return (
        <div className="flex">
            <AdminNavbar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
            <AdminSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
            <main
                className="grow p-3 bg-background min-h-screen sm:w-[calc(100%-260px)]"
            >
                <div className="h-16" /> {/* Spacer for fixed navbar */}

                {sinPermisoPorHerencia === true && (
                    <Alert variant="destructive" className="mb-4 border-destructive/60">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Sin permisos para esta vista</AlertTitle>
                        <AlertDescription>
                            Tu herencia de vistas no autoriza el acceso a esta pantalla según la parametrización actual.
                            Si la necesitas, solicita permisos al administrador del tenant.
                        </AlertDescription>
                    </Alert>
                )}

                {sinPermisoPorHerencia === null ? (
                    <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Verificando permisos de la vista…
                    </div>
                ) : sinPermisoPorHerencia === true ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
                        No puedes usar acciones de esta pantalla (editar colores, usuarios, parametrización, etc.)
                        hasta que tu herencia incluya esta vista y las acciones correspondientes.
                    </div>
                ) : (
                    <GovernanceButtonScopeProvider>
                        <Outlet />
                    </GovernanceButtonScopeProvider>
                )}

            </main>
        </div>
    )
}
