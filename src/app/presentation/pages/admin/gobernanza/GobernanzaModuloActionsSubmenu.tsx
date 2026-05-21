import React from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { METHOD_STYLE } from './parametrosGobernanzaSectionUi';
import type { EndpointSpec } from './parametrosGobernanzaTypes';
import type { GobernanzaModuloConfig } from './gobernanzaModuloConfig';
import { GOBERNANZA_MODULO_ACTION_QUERY_DEFAULT } from './gobernanzaModuloConfig';
import type { GobernanzaEndpointCapabilities } from './gobernanzaEndpointCapabilities';

export type GobernanzaModuloActionsSubmenuProps = {
  modulo: GobernanzaModuloConfig;
  endpoints: EndpointSpec[];
  getCapabilities?: (endpoint: EndpointSpec) => GobernanzaEndpointCapabilities;
  /** Etiquetas cortas desde POST menú (prioridad sobre mapa local). */
  actionShortLabels?: Record<string, string>;
  /** Disponibilidad por id desde API de menú (combinada con scope en UI). */
  menuDisponibleById?: Record<string, boolean>;
};

const ACTION_SHORT_LABEL: Record<string, string> = {
  'tenant-crear-global-usuario': 'Alta',
  'tenant-listar-libres-tenantglobal': 'Consulta',
  'tenant-actualizar-global': 'Edición',
  'tenant-desactivar-global': 'Bloqueo',
  'tenant-eliminar-global': 'Eliminación',
};

export function GobernanzaModuloActionsSubmenu({
  modulo,
  endpoints,
  getCapabilities,
  actionShortLabels,
  menuDisponibleById,
}: GobernanzaModuloActionsSubmenuProps): React.ReactElement | null {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const actionQueryParam = modulo.actionQueryParam ?? GOBERNANZA_MODULO_ACTION_QUERY_DEFAULT;
  const activeActionId = searchParams.get(actionQueryParam)?.trim() ?? '';
  const linkBase = modulo.basePath ?? location.pathname;

  if (endpoints.length === 0) return null;

  const hrefForAction = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(actionQueryParam, id);
    return `${linkBase}?${next.toString()}`;
  };

  return (
    <nav className="mt-4 rounded-lg border border-primary/20 bg-background/80 p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
            {modulo.submenuTitle ?? 'Acciones disponibles'}
          </p>
          <p className="text-xs text-muted-foreground">
            {modulo.submenuHint ??
              'Elige una operación; el formulario se muestra debajo según la ruta del módulo.'}
          </p>
        </div>
        <Badge variant="outline" className="rounded-md">
          {endpoints.length} acciones
        </Badge>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {endpoints.map((endpoint) => {
          const caps = getCapabilities?.(endpoint);
          const menuOk = menuDisponibleById?.[endpoint.id] ?? true;
          const scopeOk = (caps ? caps.scopeDisponible : true) && menuOk;
          const active = activeActionId === endpoint.id;
          const shortLabel = actionShortLabels?.[endpoint.id] ?? ACTION_SHORT_LABEL[endpoint.id];
          const className = cn(
            'flex min-w-[200px] shrink-0 flex-col gap-1 rounded-md border px-3 py-2 text-left text-xs transition-colors',
            active
              ? 'border-primary bg-primary/10 text-foreground shadow-sm'
              : 'border-border bg-card text-foreground hover:border-primary/35 hover:bg-muted/60',
            !scopeOk && 'opacity-70'
          );

          return (
            <Link key={endpoint.id} to={hrefForAction(endpoint.id)} className={className} title={endpoint.title}>
              <span className="flex items-center justify-between gap-2">
                <span className="min-w-0">
                  <span
                    className={cn(
                      'mr-2 rounded border px-1.5 py-0.5 text-[10px] font-semibold',
                      METHOD_STYLE[endpoint.method]
                    )}
                  >
                    {endpoint.method}
                  </span>
                  {shortLabel ? (
                    <span className="text-[10px] font-medium uppercase text-muted-foreground">{shortLabel}</span>
                  ) : null}
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </span>
              <span className="line-clamp-2 font-medium leading-snug">{endpoint.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
