import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { EndpointSpec } from './parametrosGobernanzaTypes';
import type { GobernanzaEndpointCapabilities } from './gobernanzaEndpointCapabilities';

export type GobernanzaModuloMenuTabsProps = {
  endpoints: EndpointSpec[];
  activeActionId: string;
  onActionChange: (actionId: string) => void;
  getCapabilities?: (endpoint: EndpointSpec) => GobernanzaEndpointCapabilities;
  actionShortLabels?: Record<string, string>;
  menuDisponibleById?: Record<string, boolean>;
  loading?: boolean;
};

/**
 * Menú de acciones estilo Inventario (TabsList), sin rutas API ni tarjetas HTTP.
 */
export function GobernanzaModuloMenuTabs({
  endpoints,
  activeActionId,
  onActionChange,
  getCapabilities,
  actionShortLabels,
  menuDisponibleById,
  loading,
}: GobernanzaModuloMenuTabsProps): React.ReactElement | null {
  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Cargando módulos disponibles…</p>
    );
  }

  if (endpoints.length === 0) return null;

  return (
    <Tabs value={activeActionId} onValueChange={onActionChange} className="w-full">
      <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1">
        {endpoints.map((endpoint) => {
          const caps = getCapabilities?.(endpoint);
          const menuOk = menuDisponibleById?.[endpoint.id] ?? true;
          const scopeOk = (caps ? caps.scopeDisponible : true) && menuOk;
          const label = actionShortLabels?.[endpoint.id] ?? endpoint.title;

          return (
            <TabsTrigger
              key={endpoint.id}
              value={endpoint.id}
              disabled={!scopeOk}
              className={cn(
                'text-xs sm:text-sm',
                !scopeOk && 'opacity-50'
              )}
            >
              {label}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
