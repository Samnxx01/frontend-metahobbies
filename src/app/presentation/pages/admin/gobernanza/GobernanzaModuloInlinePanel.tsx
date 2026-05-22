import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { METHOD_STYLE } from './parametrosGobernanzaSectionUi';
import type { GobernanzaEndpointCapabilities } from './gobernanzaEndpointCapabilities';
import type { EndpointSpec } from './parametrosGobernanzaTypes';
import { getGobernanzaModuloFlowMeta } from './gobernanzaModuloFlowMeta';
import { GobernanzaModuloFlowHelpButton } from './GobernanzaModuloFlowHelpButton';
import { cn } from '@/lib/utils';

export type GobernanzaModuloInlinePanelProps = {
  endpoint: EndpointSpec;
  capabilities: GobernanzaEndpointCapabilities;
  children: React.ReactNode;
  /** `operational`: estilo Inventario (sin ruta API ni badge HTTP prominente). */
  variant?: 'default' | 'operational';
};

export function GobernanzaModuloInlinePanel({
  endpoint,
  capabilities,
  children,
  variant = 'default',
}: GobernanzaModuloInlinePanelProps): React.ReactElement {
  const meta = getGobernanzaModuloFlowMeta(endpoint.id);
  const soloLectura = capabilities.diosSoloLectura || !capabilities.canExecuteApi;
  const operational = variant === 'operational';

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader
        className={cn(
          'space-y-3',
          operational ? 'border-b border-border/60 p-5' : 'space-y-4 border-b border-border/70 bg-muted/20 p-5'
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            {!operational ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn('border', METHOD_STYLE[endpoint.method])}>{endpoint.method}</Badge>
                {!capabilities.scopeDisponible ? (
                  <Badge variant="outline" className="rounded-md">
                    Solo referencia
                  </Badge>
                ) : soloLectura ? (
                  <Badge variant="outline" className="rounded-md border-amber-200 bg-amber-50 text-amber-900">
                    Solo lectura
                  </Badge>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {!capabilities.scopeDisponible ? (
                  <Badge variant="outline" className="rounded-md text-xs">
                    Solo referencia
                  </Badge>
                ) : soloLectura ? (
                  <Badge variant="outline" className="rounded-md border-amber-200 bg-amber-50 text-xs text-amber-900">
                    Solo lectura
                  </Badge>
                ) : null}
              </div>
            )}
            <CardTitle className={cn('leading-snug', operational ? 'text-xl' : 'text-lg')}>
              {meta?.title ?? endpoint.title}
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {meta?.summary ?? endpoint.description}
            </CardDescription>
          </div>
          <GobernanzaModuloFlowHelpButton endpointId={endpoint.id} />
        </div>
        {!operational ? (
          <p className="rounded-md border border-border bg-background/90 px-3 py-2 font-mono text-xs text-muted-foreground">
            {endpoint.path}
          </p>
        ) : null}
        {capabilities.diosSoloLectura ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Tu jerarquía tiene corporativo en counters: puedes revisar datos pero no ejecutar cambios desde esta
            pantalla.
          </p>
        ) : !capabilities.scopeDisponible ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Tu sesión actual no tiene permiso para ejecutar esta acción. El formulario se muestra solo como referencia.
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}

export const GobernanzaTenantInlinePanel = GobernanzaModuloInlinePanel;
