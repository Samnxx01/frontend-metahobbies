import React from 'react';
import { Loader2, Play, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { METHOD_STYLE } from './parametrosGobernanzaSectionUi';
import type { EndpointSpec } from './parametrosGobernanzaTypes';
import { GOBERNANZA_MODULO_TENANT } from './gobernanzaModuloConfig';
import { GobernanzaModuloActionsSubmenu } from './GobernanzaModuloActionsSubmenu';
import type { GobernanzaEndpointCapabilities } from './gobernanzaEndpointCapabilities';

type TenantActionsSubmenuProps = {
  endpoints: EndpointSpec[];
  actionQueryParam?: string;
  getCapabilities?: (endpoint: EndpointSpec) => GobernanzaEndpointCapabilities;
};

export function GobernanzaTenantActionsSubmenu({
  endpoints,
  actionQueryParam,
  getCapabilities,
}: TenantActionsSubmenuProps): React.ReactElement | null {
  const modulo = actionQueryParam
    ? { ...GOBERNANZA_MODULO_TENANT, actionQueryParam }
    : GOBERNANZA_MODULO_TENANT;
  return (
    <GobernanzaModuloActionsSubmenu modulo={modulo} endpoints={endpoints} getCapabilities={getCapabilities} />
  );
}

export { GobernanzaModuloActionsSubmenu };

type TenantActionCardProps = {
  endpoint: EndpointSpec;
  disponible: boolean;
  running: boolean;
  actorLabel?: string;
  secondaryBadge?: string;
  title?: string;
  description?: string;
  unavailableText?: string;
  shellClassName?: string;
  pathClassName?: string;
  spanClassName?: string;
  onConfigure: (endpoint: EndpointSpec) => void;
  onExecute: (endpoint: EndpointSpec) => void;
};

const ACTION_ACCENT: Record<string, string> = {
  'tenant-crear-global-usuario': 'border-l-4 border-l-emerald-500',
  'tenant-crear-global-admin': 'border-l-4 border-l-emerald-500',
  'tenant-listar-libres-tenantglobal': 'border-l-4 border-l-sky-500',
  'tenant-listar-libres-superadmin': 'border-l-4 border-l-sky-500',
  'tenant-actualizar-global': 'border-l-4 border-l-amber-500',
  'tenant-superadmin-desactivar': 'border-l-4 border-l-red-500',
  'tenant-superadmin-eliminar': 'border-l-4 border-l-red-700',
  'tenant-global-actualizar-propio': 'border-l-4 border-l-amber-500',
  'tenant-desactivar-global': 'border-l-4 border-l-red-500',
  'tenant-eliminar-global': 'border-l-4 border-l-red-700',
};

const ACTION_LABEL: Record<string, string> = {
  'tenant-crear-global-usuario': 'Alta',
  'tenant-crear-global-admin': 'Alta',
  'tenant-listar-libres-tenantglobal': 'Consulta',
  'tenant-listar-libres-superadmin': 'Consulta',
  'tenant-actualizar-global': 'Edicion',
  'tenant-superadmin-desactivar': 'Desactivacion SA',
  'tenant-superadmin-eliminar': 'Eliminacion SA',
  'tenant-global-actualizar-propio': 'Edicion TG',
  'tenant-desactivar-global': 'Bloqueo',
  'tenant-eliminar-global': 'Eliminacion',
};

function TenantActionCardBase({
  endpoint,
  disponible,
  running,
  actorLabel,
  secondaryBadge,
  title,
  description,
  unavailableText,
  shellClassName,
  pathClassName,
  spanClassName,
  onConfigure,
  onExecute,
}: TenantActionCardProps): React.ReactElement {
  return (
    <Card
      id={`accion-${endpoint.id}`}
      className={cn(
        'group scroll-mt-24 overflow-hidden border-border bg-card shadow-sm transition-colors hover:border-primary/30',
        ACTION_ACCENT[endpoint.id],
        !disponible && 'opacity-75',
        spanClassName,
        shellClassName
      )}
    >
      <CardHeader className="space-y-3 border-b border-border/70 bg-muted/25 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn('border', METHOD_STYLE[endpoint.method])}>{endpoint.method}</Badge>
            <Badge variant="outline" className="rounded-md">
              {ACTION_LABEL[endpoint.id] || 'Accion'}
            </Badge>
            {secondaryBadge ? (
              <Badge variant="outline" className="rounded-md">
                {secondaryBadge}
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {actorLabel ? (
              <Badge variant="outline" className="rounded-md">
                {actorLabel}
              </Badge>
            ) : null}
            {!disponible ? (
              <Badge variant="outline" className="rounded-md">
                Solo visible
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="space-y-1">
          <CardTitle className="text-base leading-snug text-foreground">{title || endpoint.title}</CardTitle>
          <CardDescription>{description || endpoint.description}</CardDescription>
        </div>
        {!disponible ? (
          <p className="rounded-md border border-warning/20 bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
            {unavailableText || 'Este bloque pertenece a otro scope y queda disponible solo como referencia.'}
          </p>
        ) : null}
        <p
          className={cn(
            'rounded-md border border-border bg-background/80 p-2 font-mono text-xs text-muted-foreground',
            endpoint.method !== 'GET' && 'line-clamp-2',
            pathClassName
          )}
        >
          {endpoint.path}
        </p>
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={() => onConfigure(endpoint)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Configurar
          </Button>
          <Button type="button" onClick={() => onExecute(endpoint)} disabled={running || !disponible}>
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Ejecutar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function CrearTenantGlobalActionCard(props: TenantActionCardProps): React.ReactElement {
  return <TenantActionCardBase {...props} />;
}

export function ListarTenantGlobalActionCard(props: TenantActionCardProps): React.ReactElement {
  return <TenantActionCardBase {...props} />;
}

export function ActualizarTenantGlobalActionCard(props: TenantActionCardProps): React.ReactElement {
  return <TenantActionCardBase {...props} />;
}

export function DesactivarTenantGlobalActionCard(props: TenantActionCardProps): React.ReactElement {
  return <TenantActionCardBase {...props} />;
}

export function EliminarTenantGlobalActionCard(props: TenantActionCardProps): React.ReactElement {
  return <TenantActionCardBase {...props} />;
}
