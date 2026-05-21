import { Edit, Eye, Pencil, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ActionId } from '../types';

/**
 * Catálogo central de acciones UI (solo metadatos).
 * Las pantallas referencian estos IDs; la parametrización (API/JWT/reglas) decide cuáles se muestran.
 */
export type ActionDefinition = {
  id: ActionId;
  label: string;
  icon: LucideIcon;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  iconClassName?: string;
};

export const MABS_ACTION_DEFINITIONS = {
  PREVIEW: {
    id: 'PREVIEW',
    label: 'Previsualizar',
    icon: Eye,
    variant: 'ghost',
    size: 'icon',
  },
  VER: {
    id: 'VER',
    label: 'Ver detalles',
    icon: Eye,
    variant: 'ghost',
    size: 'icon',
  },
  EDITAR: {
    id: 'EDITAR',
    label: 'Editar',
    icon: Pencil,
    variant: 'ghost',
    size: 'icon',
  },
  EDIT: {
    id: 'EDIT',
    label: 'Editar',
    icon: Edit,
    variant: 'ghost',
    size: 'icon',
  },
  ELIMINAR: {
    id: 'ELIMINAR',
    label: 'Eliminar',
    icon: Trash2,
    variant: 'ghost',
    size: 'icon',
    iconClassName: 'text-destructive',
  },
  BAJA: {
    id: 'BAJA',
    label: 'Baja',
    icon: Trash2,
    variant: 'ghost',
    size: 'icon',
    iconClassName: 'text-destructive',
  },
} as const satisfies Record<string, ActionDefinition>;

export type MabsActionDefinitionKey = keyof typeof MABS_ACTION_DEFINITIONS;

export function getActionDefinition(id: ActionId): ActionDefinition | undefined {
  const key = id as MabsActionDefinitionKey;
  return MABS_ACTION_DEFINITIONS[key] ?? Object.values(MABS_ACTION_DEFINITIONS).find((d) => d.id === id);
}
