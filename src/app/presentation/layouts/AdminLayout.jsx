import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import AdminNavbar from '@/app/presentation/components/admin/AdminNavbar'
import AdminSidebar from '@/app/presentation/components/admin/AdminSidebar'

const SIDEBAR_PATH = '/admin/gestor-rutas/administracion/dashboardadmin'

export default function AdminLayout() {
    const { user } = useAuth()
    const [mobileOpen, setMobileOpen] = useState(false)
    const location = useLocation()

    if (!user) {
        return null
    }

    const showSidebar = location.pathname === SIDEBAR_PATH

    return (
        <div className="flex">
            <AdminNavbar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
            {showSidebar && <AdminSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />}
            <main
                className={`grow p-3 bg-background min-h-screen ${showSidebar ? 'sm:w-[calc(100%-260px)]' : 'w-full'}`}
            >
                <div className="h-16" /> {/* Spacer for fixed navbar */}

                <Outlet />

            </main>
        </div>
    )
}
