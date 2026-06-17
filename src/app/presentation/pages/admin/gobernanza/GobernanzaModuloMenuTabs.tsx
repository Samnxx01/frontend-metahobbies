import React from 'react';
import { Loader2 } from 'lucide-react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { GobernanzaMenuTabItem } from './gobernanzaModuloMenuUi';

export type GobernanzaModuloMenuTabsProps = {
  tabs: GobernanzaMenuTabItem[];
  activeActionId: string;
  onActionChange: (actionId: string) => void;
  loading?: boolean;
  className?: string;
};

/**
 * Barra de pestañas — misma API y estilos que InventarioMenuTabs.
 */
export function GobernanzaModuloMenuTabs({
  tabs,
  activeActionId,
  onActionChange,
  loading,
  className,
}: GobernanzaModuloMenuTabsProps): React.ReactElement | null {
  if (loading) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-6 text-sm text-muted-foreground',
          className
        )}
        role="status"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando menú parametrizado…
      </div>
    );
  }

  if (!tabs.length) return null;

  return (
    <TabsList className={cn('justify-start', className)}>
      {tabs.map((tab) => (
        <TabsTrigger
          key={tab.value}
          value={tab.value}
          disabled={tab.disabled}
          aria-current={activeActionId === tab.value ? 'page' : undefined}
          title={tab.disabled ? 'No disponible con tu sesión actual' : tab.label}
          onClick={() => onActionChange(tab.value)}
        >
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
