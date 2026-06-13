import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { KeyRound, Link2, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GobernanzaAccionGridItem } from './gobernanzaModuloMenuUi';
import {
  GOBERNANZA_INVENTARIO_CARD,
  GOBERNANZA_INVENTARIO_CARD_FOOTER,
  GOBERNANZA_INVENTARIO_CARD_ICON,
  GOBERNANZA_INVENTARIO_PATH_BAR,
} from './gobernanzaInventarioLayout';
import { cn } from '@/lib/utils';

export type GobernanzaModuloAccionesGridProps = {
  items: GobernanzaAccionGridItem[];
  activeActionId?: string;
  onAbrir?: (actionId: string) => void;
  loading?: boolean;
  readOnly?: boolean;
  icon?: LucideIcon;
  className?: string;
};

/**
 * Rejilla tipo ConfigInventario (icono, Abrir, título, descripción, path, acciones).
 */
export function GobernanzaModuloAccionesGrid({
  items,
  activeActionId,
  onAbrir,
  loading,
  readOnly = false,
  icon: Icon = KeyRound,
  className,
}: GobernanzaModuloAccionesGridProps): React.ReactElement | null {
  if (loading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-10 text-sm text-muted-foreground',
          className
        )}
        role="status"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando acciones parametrizadas…
      </div>
    );
  }

  if (!items.length) return null;

  return (
    <div className={cn('grid gap-3 md:grid-cols-2 xl:grid-cols-3', className)} data-gobernanza-acciones-grid>
      {items.map((item) => {
        const active = activeActionId === item.id;
        return (
          <div
            key={item.id}
            className={cn(GOBERNANZA_INVENTARIO_CARD, active && 'border-primary/35 ring-1 ring-primary/15')}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className={GOBERNANZA_INVENTARIO_CARD_ICON}>
                <Icon className="h-4 w-4" />
              </span>
              {!readOnly ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={!item.disponible}
                  onClick={() => onAbrir?.(item.id)}
                >
                  Abrir
                </Button>
              ) : null}
            </div>
            <p className="text-sm font-semibold text-foreground">{item.title}</p>
            {item.description ? (
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
            ) : null}
            <p className={GOBERNANZA_INVENTARIO_PATH_BAR}>{item.path || '—'}</p>
            {!item.disponible ? (
              <p className="mt-2 text-[11px] text-muted-foreground">No disponible con tu sesión actual.</p>
            ) : null}
            {!readOnly ? (
              <div className={GOBERNANZA_INVENTARIO_CARD_FOOTER}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  disabled={!item.disponible}
                  onClick={() => onAbrir?.(item.id)}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Ejecutar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  disabled={!item.disponible}
                  onClick={() => onAbrir?.(item.id)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Formulario
                </Button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
