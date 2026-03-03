import { Settings } from 'lucide-react';
import ConfiguracionMembresia from './Configuracionmembresia';
import GestionMonedas from './Gestionmonedas';
import ZonaCritica from './Zonacritica';

export default function ParametrizacionMembresia() {
    return (
        <div className="min-h-screen bg-background py-8 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-border/40 pb-6">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight">
                            Gestión de Membresías
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Administra la parametrización, monedas y precios del sistema de membresías
                        </p>
                    </div>
                </div>

                {/* Grid de componentes hijos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Configuración de Membresías — ocupa ancho completo en lg */}
                    <div className="lg:col-span-2">
                        <ConfiguracionMembresia />
                    </div>

                    {/* Administración de Monedas */}
                    <GestionMonedas />

                    {/* Zona Crítica */}
                    <ZonaCritica />
                </div>
            </div>
        </div>
    );
}