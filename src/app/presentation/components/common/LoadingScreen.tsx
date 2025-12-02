export default function LoadingScreen(): React.ReactElement {
    return (
        <div
            className="fixed inset-0 flex flex-col items-center justify-center bg-background z-1301"
        >
            <div
                className="relative w-24 h-24 flex items-center justify-center"
            >
                <div
                    className="absolute w-16 h-16 border-4 border-t-4 border-primary border-t-transparent rounded-full animate-spin"
                ></div>
                <img
                    src="/assets/logo.png"
                    alt="Logo"
                    className="w-10 h-auto animate-pulse"
                />
            </div>
            <p
                className="mt-4 text-xl font-medium bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent animate-fadeInOut"
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
                        0%, 100% { opacity: 1; }
                        50% { opacity: .5; }
                    }
                    @keyframes fadeInOut {
                        0%, 100% { opacity: 0.8; }
                        50% { opacity: 1; }
                    }
                    .animate-fadeInOut {
                        animation: fadeInOut 2s ease-in-out infinite;
                    }
                `}
            </style>
        </div>
    );
}