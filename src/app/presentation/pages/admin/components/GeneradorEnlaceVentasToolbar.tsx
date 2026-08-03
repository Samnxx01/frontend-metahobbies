import React from 'react';
import { Hash, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type GeneradorEnlaceVentasToolbarProps = {
    onOpenSecuenciaWompi: () => void;
    onOpenParametrizarArbol: () => void;
    className?: string;
};

/**
 * Acciones auxiliares del generador de enlace (una sola instancia por pantalla).
 */
export default function GeneradorEnlaceVentasToolbar({
    onOpenSecuenciaWompi,
    onOpenParametrizarArbol,
    className,
}: GeneradorEnlaceVentasToolbarProps): React.ReactElement {
    return (
        <div className={cn('flex flex-wrap gap-2 shrink-0', className)}>
            <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={onOpenSecuenciaWompi}
            >
                <Hash className="h-4 w-4" />
                Secuencia Wompi
            </Button>
            <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={onOpenParametrizarArbol}
            >
                <Network className="h-4 w-4" />
                Parametrizar árbol
            </Button>
        </div>
    );
}
