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
  variant?: 'default' | 'operational';
  /** Título/descripción desde gobernanzaModuloConfigs (no catálogo local). */
  copyDesdeConfig?: boolean;
};

export function GobernanzaModuloInlinePanel({
  endpoint,
  capabilities,
  children,
  variant = 'default',
  copyDesdeConfig = false,
}: GobernanzaModuloInlinePanelProps): React.ReactElement {
  const meta = getGobernanzaModuloFlowMeta(endpoint.id);
  const soloLectura = capabilities.diosSoloLectura || !capabilities.canExecuteApi;
  const operational = variant === 'operational';
  const titulo = copyDesdeConfig ? endpoint.title : meta?.title ?? endpoint.title;
  const resumen = copyDesdeConfig ? endpoint.description : meta?.summary ?? endpoint.description;

  if (operational) {
    return (
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg">{titulo}</CardTitle>
            <CardDescription>{resumen}</CardDescription>
          </div>
          <GobernanzaModuloFlowHelpButton endpointId={endpoint.id} />
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {capabilities.diosSoloLectura ? (
            <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
              Tu jerarquía tiene corporativo en counters: puedes revisar datos pero no ejecutar cambios.
            </p>
          ) : !capabilities.scopeDisponible ? (
            <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
              Tu sesión no tiene permiso para ejecutar esta acción. El formulario es solo referencia.
            </p>
          ) : soloLectura ? (
            <Badge variant="outline" className="rounded-md border-amber-200 bg-amber-50 text-amber-900">
              Solo lectura
            </Badge>
          ) : null}
          {children}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="space-y-3 space-y-4 border-b border-border/70 bg-muted/20 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
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
            <CardTitle className="text-lg leading-snug">{titulo}</CardTitle>
            <CardDescription className="text-sm leading-relaxed">{resumen}</CardDescription>
          </div>
          <GobernanzaModuloFlowHelpButton endpointId={endpoint.id} />
        </div>
        <p className="rounded-md border border-border bg-background/90 px-3 py-2 font-mono text-xs text-muted-foreground">
          {endpoint.path}
        </p>
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
