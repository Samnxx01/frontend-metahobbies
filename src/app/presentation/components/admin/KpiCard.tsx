import React from 'react';
import { Card } from '@/components/ui/card'; // Usamos Card de Shadcn
import type { KpiCardProps } from '@/types/components';

// Nota: Mantuvimos las props originales para asegurar la compatibilidad con el código que lo invoca, 
// usando estilos inline de Tailwind para las propiedades de color y borde dinámicas.

export default function KpiCard({ 
    icon, 
    label, 
    value, 
    sub, 
    subColor = '#757575', 
    borderColor = '#eee', 
    children 
}: KpiCardProps): React.ReactElement {

    // Convertimos los estilos MUI a clases de Tailwind y estilos inline para dinámicos
    return (
        <Card
            className="
                rounded-xl 
                p-5 
                flex flex-col 
                items-start 
                gap-2 
                shadow-md 
                min-h-[120px] 
                bg-card 
                border-2
            "
            style={{
                borderColor: borderColor, // Estilo inline para el borde dinámico
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)' // Sombra un poco más prominente para destacar
            }}
        >
            {/* Box equivalente: Contenedor del Icono y Label */}
            <div className="flex items-center gap-2">
                {/* El icono vendrá de Lucide o cualquier otro lugar */}
                {icon}
                {/* Typography variant="subtitle2" */}
                <p className="text-sm font-semibold text-muted-foreground uppercase">{label}</p>
            </div>

            {/* Typography variant="h5" */}
            <h3 className="text-3xl font-bold text-foreground">{value}</h3>

            {/* Typography variant="body2" */}
            <p className="text-sm" style={{ color: subColor }}>{sub}</p>

            {children}
        </Card>
    );
}