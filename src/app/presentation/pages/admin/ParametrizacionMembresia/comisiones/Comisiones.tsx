import { BarChart3 } from 'lucide-react';
import KPIGlobal from './KPIGlobal';
import KPIUsuarioMembresia from './KPIUsuarioMembresia';

export default function Comisiones() {
    return (
        <div className="min-h-screen bg-background">
            {/* Header sticky — coherente con el resto de secciones del sistema */}
            <div className="border-b border-border/50 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm shrink-0">
                        <BarChart3 className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold text-foreground leading-none">
                            Panel de Comisiones
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Rendimiento global de membresías y detalle de comisiones por referidor
                        </p>
                    </div>
                </div>
            </div>

            {/* Secciones hijas */}
            <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
                <KPIGlobal />
                <KPIUsuarioMembresia />
            </div>
        </div>
    );
}