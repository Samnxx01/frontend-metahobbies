import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from '@/app/presentation/components/navbar/Navbar'
import Footer from '@/app/presentation/components/footer/Footer'
import WelcomeModal from '@/app/presentation/components/membership/WelcomeModal'
import WompiRetornoRedirect from '@/app/presentation/components/checkout/WompiRetornoRedirect'
import { capturePublicAttributionFromSearch } from '@/app/services/publicAttributionParams'
import { useAttributionLinkResolver } from '@/app/hooks/useAttributionLinkResolver'

/** Guarda guestSessionId / ref / originType en sessionStorage al cambiar de página pública. */
function PublicAttributionCapture() {
    const location = useLocation()
    useAttributionLinkResolver()
    useEffect(() => {
        capturePublicAttributionFromSearch(location.search)
    }, [location.search])
    return null
}

export default function PublicLayout() {
    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <PublicAttributionCapture />
            <WompiRetornoRedirect />
            <Navbar />
            <main className="grow bg-background">
                <Outlet />
            </main>
            <Footer />
            <WelcomeModal />
        </div>
    )
}
