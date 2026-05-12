import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { GobernanzaEndpointCapabilities } from '../gobernanzaEndpointCapabilities';
import { cn } from '@/lib/utils';

export type EndpointCapabilityInventoryProps = {
  capabilities: GobernanzaEndpointCapabilities;
  className?: string;
};

/**
 * Inventario dinámico de acciones por componente/tarjeta (configurar, ejecutar API, diseño).
 */
export function EndpointCapabilityInventory({
  capabilities,
  className,
}: EndpointCapabilityInventoryProps): React.ReactElement {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card px-3 py-2 text-xs',
        capabilities.diosSoloLectura && 'border-amber-200 bg-amber-50/60 dark:bg-amber-950/20',
        className
      )}
    >
      <p className="font-semibold text-foreground">Inventario de acciones (dinámico)</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {capabilities.inventory.map((item) => (
          <li key={item.id}>
            <Badge
              variant={item.allowed ? 'secondary' : 'outline'}
              className={cn(
                'font-normal',
                !item.allowed && 'opacity-60 line-through decoration-muted-foreground'
              )}
            >
              {item.label}
            </Badge>
          </li>
        ))}
      </ul>
      {capabilities.diosSoloLectura ? (
        <p className="mt-2 text-[11px] font-medium text-amber-800 dark:text-amber-200">
          Modo solo lectura por jerarquía (corporativo en counters): diseño y ejecución bloqueados; puede revisar el
          inventario.
        </p>
      ) : !capabilities.scopeDisponible ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Scope actual sin permiso sobre este endpoint: acciones de ejecución y diseño deshabilitadas.
        </p>
      ) : null}
    </div>
  );
}
