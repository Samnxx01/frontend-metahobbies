import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from '@/app/presentation/components/navbar/Navbar'
import Footer from '@/app/presentation/components/footer/Footer'
import WelcomeModal from '@/app/presentation/components/membership/WelcomeModal'
import { capturePublicAttributionFromSearch } from '@/app/services/publicAttributionParams'

/** Guarda guestSessionId / ref / originType en sessionStorage al cambiar de página pública. */
function PublicAttributionCapture() {
    const location = useLocation()
    useEffect(() => {
        capturePublicAttributionFromSearch(location.search)
    }, [location.search])
    return null
}

export default function PublicLayout() {
    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <PublicAttributionCapture />
            <Navbar />
            <main className="grow bg-background">
                <Outlet />
            </main>
            <Footer />
            <WelcomeModal />
        </div>
    )
}
