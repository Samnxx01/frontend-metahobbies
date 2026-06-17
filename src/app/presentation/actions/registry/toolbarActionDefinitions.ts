import { Network, Plus, RefreshCw, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ActionId } from '../types';

export type ToolbarActionDefinition = {
  id: ActionId;
  label: string;
  icon: LucideIcon;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  order?: number;
  iconClassName?: string;
};

export const TOOLBAR_ACTION_DEFINITIONS = {
  REFRESCAR: {
    id: 'REFRESCAR',
    label: 'Sincronizar counter',
    icon: RefreshCw,
    variant: 'outline',
    size: 'icon',
    showLabel: false,
    order: 0,
  },
  USUARIOS: {
    id: 'USUARIOS',
    label: 'Usuarios',
    icon: Users,
    variant: 'outline',
    order: 10,
  },
  VER_ARBOL: {
    id: 'VER_ARBOL',
    label: 'Ver Arbol',
    icon: Network,
    variant: 'outline',
    order: 20,
  },
  PARAM_TIPOS: {
    id: 'PARAM_TIPOS',
    label: 'Param. Tipos',
    icon: Plus,
    variant: 'outline',
    order: 30,
  },
  PARAM_ACCESOS: {
    id: 'PARAM_ACCESOS',
    label: 'Param. Accesos',
    icon: Plus,
    variant: 'outline',
    order: 40,
  },
  NUEVA_SUITE: {
    id: 'NUEVA_SUITE',
    label: 'Nueva Suite',
    icon: Plus,
    variant: 'outline',
    order: 50,
  },
  NUEVO_MODULO: {
    id: 'NUEVO_MODULO',
    label: 'Nuevo Modulo',
    icon: Plus,
    variant: 'outline',
    order: 60,
  },
  NUEVO_FORMULARIO: {
    id: 'NUEVO_FORMULARIO',
    label: 'Nuevo Formulario',
    icon: Plus,
    variant: 'default',
    order: 70,
  },
  NUEVO_SUBFORMULARIO: {
    id: 'NUEVO_SUBFORMULARIO',
    label: 'Nuevo SubFormulario',
    icon: Plus,
    variant: 'outline',
    order: 80,
  },
} as const satisfies Record<string, ToolbarActionDefinition>;

export type ToolbarActionDefinitionKey = keyof typeof TOOLBAR_ACTION_DEFINITIONS;

export function getToolbarActionDefinition(id: ActionId): ToolbarActionDefinition | undefined {
  const key = id as ToolbarActionDefinitionKey;
  return TOOLBAR_ACTION_DEFINITIONS[key] ?? Object.values(TOOLBAR_ACTION_DEFINITIONS).find((d) => d.id === id);
}
