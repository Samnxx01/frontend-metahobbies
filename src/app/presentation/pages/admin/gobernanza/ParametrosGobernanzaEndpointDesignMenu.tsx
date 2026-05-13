import React from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { METHOD_STYLE } from './parametrosGobernanzaSectionUi';
import type { EndpointSpec } from './parametrosGobernanzaTypes';
import { cn } from '@/lib/utils';

export type ParametrosGobernanzaEndpointDesignMenuProps = {
  endpoints: EndpointSpec[];
  designQueryParam?: string;
  /** Control dinámico: si retorna false, el ítem no navega (solo consulta / sin permiso de diseño). */
  canEditDesign?: (endpoint: EndpointSpec) => boolean;
};

/**
 * Menú horizontal con rutas dinámicas: cada ítem enlaza a la misma página con `?diseno=<endpointId>`.
 */
export function ParametrosGobernanzaEndpointDesignMenu({
  endpoints,
  designQueryParam = 'diseno',
  canEditDesign,
}: ParametrosGobernanzaEndpointDesignMenuProps): React.ReactElement | null {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const activeId = searchParams.get(designQueryParam)?.trim() ?? '';

  if (endpoints.length === 0) return null;

  const hrefFor = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(designQueryParam, id);
    return `${location.pathname}?${next.toString()}`;
  };

  return (
    <div className="min-w-0 border-t border-border/80 pt-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Acceso rápido a formularios (rutas dinámicas, controlado por scope)
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {endpoints.map((ep) => {
          const active = activeId === ep.id;
          const editable = canEditDesign ? canEditDesign(ep) : true;
          const classChip = cn(
            'flex min-w-0 max-w-[220px] shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-left text-xs transition-colors',
            active
              ? 'border-primary bg-primary/10 text-foreground shadow-sm'
              : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:bg-muted/60 hover:text-foreground'
          );
          const inner = (
            <>
              <span
                className={cn(
                  'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold',
                  METHOD_STYLE[ep.method] ?? 'border border-border bg-muted'
                )}
              >
                {ep.method}
              </span>
              <span className="truncate font-medium">{ep.title}</span>
            </>
          );
          if (!editable) {
            return (
              <span
                key={ep.id}
                title="Sin permiso de diseño para este endpoint con tu sesión actual"
                className={cn(classChip, 'cursor-not-allowed opacity-50')}
              >
                {inner}
              </span>
            );
          }
          return (
            <Link key={ep.id} to={hrefFor(ep.id)} title={ep.title} className={classChip}>
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
