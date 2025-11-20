import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Configuracion() {
    return (
        <div className="p-4 md:p-6 lg:p-8"> {/* Reemplaza Box principal con padding */}

            {/* Título de la Página - Reemplaza Typography variant="h5" */}
            <h1 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
                Configuración del Panel
            </h1>

            {/* Contenedor de Opciones - Reemplaza Paper */}
            <Card className="shadow-md border rounded-xl">
                <CardContent className="p-6"> {/* Reemplaza Paper sx={{ p: 3 }} */}

                    {/* Subtítulo o Descripción */}
                    <p className="text-muted-foreground text-lg mb-4">
                        Opciones generales del panel
                    </p>

                    <div className="flex gap-4 mt-4"> {/* Reemplaza Box sx={{ mt: 2 }} y ml: 2 */}
                        <Button variant="outline">
                            Preferencias de Interfaz
                        </Button>
                        <Button variant="outline">
                            Integraciones de API
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}