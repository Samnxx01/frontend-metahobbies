import { Outlet } from 'react-router-dom'
import Navbar from '@/app/presentation/components/navbar/Navbar'
import Footer from '@/app/presentation/components/footer/Footer'
import WelcomeModal from '@/app/presentation/components/membership/WelcomeModal'

export default function PublicLayout() {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="grow">
                <Outlet />
            </main>
            <Footer />
            <WelcomeModal />
        </div>
    )
}
