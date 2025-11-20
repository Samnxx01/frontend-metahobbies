import { Outlet, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

const BACKGROUND_IMAGE_URL = '/assets/images/banner.jpg';

export default function AuthLayout() {
    const navigate = useNavigate();

    return (
        <div className="relative flex items-center justify-center min-h-screen overflow-hidden">
            <Button
                onClick={() => navigate('/')}
                variant="ghost"
                className="absolute top-6 left-6 z-40 text-white hover:bg-black/20 hover:text-white"
            >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Regresar
            </Button>

            <div
                className="absolute inset-0 w-full h-full bg-cover bg-center blur-md scale-110 z-10"
                style={{ backgroundImage: `url(${BACKGROUND_IMAGE_URL})` }}
            />

            <div
                className="absolute inset-0 w-full h-full bg-primary/30 z-20"
            />

            <div
                className="z-30 relative w-full max-w-[90%] sm:max-w-[450px] mx-auto"
            >
                <Outlet />
            </div>
        </div>
    )
}