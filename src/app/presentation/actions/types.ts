import type { LucideIcon } from 'lucide-react';

/** Identificador estable; debe alinearse con parametrización backend cuando exista. */
export type ActionId = string;

/**
 * Definición de una acción en el catálogo del componente.
 * La visibilidad final = `allowedIds` ∩ reglas opcionales `isAllowed`.
 */
export type UiActionDef<TContext = void> = {
  id: ActionId;
  label: string;
  icon: LucideIcon;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  iconClassName?: string;
  /** Orden en toolbars (menor = más a la izquierda). */
  order?: number;
  /** false = solo icono (p. ej. refrescar). Por defecto true en ToolbarActionBar. */
  showLabel?: boolean;
  loadingLabel?: string;
  isLoading?: (ctx: TContext) => boolean;
  isAllowed?: (ctx: TContext) => boolean;
  isDisabled?: (ctx: TContext) => boolean;
  title?: string | ((ctx: TContext) => string);
  onClick: (ctx: TContext) => void;
};
