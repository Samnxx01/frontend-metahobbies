import React, { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import AdminNavbar from '@/app/presentation/components/admin/AdminNavbar'
import AdminSidebar from '@/app/presentation/components/admin/AdminSidebar'
import { shouldShowAdminHerenciaSinPermisoAlert } from '@/app/services/routeService'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

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
            } catch {
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

                <Outlet />

            </main>
        </div>
    )
}
