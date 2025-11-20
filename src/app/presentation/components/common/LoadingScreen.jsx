export default function LoadingScreen() {
    return (
        <div
            className="fixed inset-0 flex flex-col items-center justify-center bg-background z-1301" // Tailwind classes for fixed, full screen, centered, and z-index (modal + 1)
        >
            <div
                className="relative w-24 h-24 flex items-center justify-center" // Tailwind classes for relative, size, and centered
            >
                <div
                    className="absolute w-16 h-16 border-4 border-t-4 border-primary border-t-transparent rounded-full animate-spin" // Tailwind classes for spinner
                ></div>
                <img
                    src="/assets/logo.png"
                    alt="Logo"
                    className="w-10 h-auto animate-pulse" // Tailwind classes for image size and pulse animation
                />
            </div>
            <p
                className="mt-4 text-xl font-medium bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent animate-fadeInOut" // Tailwind classes for text styling and gradient
            >
                Cargando...
            </p>

            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    @keyframes pulse {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.1); }
                    }
                    @keyframes fadeInOut {
                        0%, 100% { opacity: 0.6; }
                        50% { opacity: 1; }
                    }
                `}
            </style>
        </div>
    );
}