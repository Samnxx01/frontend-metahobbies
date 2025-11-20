import React, { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import AdminNavbar from '@/app/presentation/components/admin/AdminNavbar'
import AdminSidebar from '@/app/presentation/components/admin/AdminSidebar'

const drawerWidth = 260

export default function AdminLayout() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [mobileOpen, setMobileOpen] = useState(false)

    if (!user || (user.role !== 'ADMIN' && user.role !== 'DESARROLLADOR')) {
        navigate('/')
        return null
    }

    return (
        <div className="flex">
            <AdminNavbar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
            <AdminSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
            <main
                className="grow p-3 bg-gray-100 min-h-screen sm:w-[calc(100%-260px)]"
            >
                <div className="min-h-[70px]" /> {/* Spacer for fixed navbar */}

                <Outlet />

            </main>
        </div>
    )
}