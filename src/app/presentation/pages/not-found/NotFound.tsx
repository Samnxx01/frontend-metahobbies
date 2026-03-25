import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFound(): React.ReactElement {
    const navigate = useNavigate();

    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-background gap-6 px-6 text-center">
            <div className="space-y-2">
                <h1 className="text-8xl font-bold text-primary">404</h1>
                <p className="text-xl font-semibold text-foreground">Página no encontrada</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                    La ruta que intentas acceder no existe o fue movida.
                </p>
            </div>
            <Button onClick={() => navigate('/', { replace: true })}>
                Ir al inicio
            </Button>
        </div>
    );
}
