import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  type InventarioJwtScopeUserLike,
  type InventarioTabValue,
} from '../inventario/inventarioModulosCatalog';

export type { InventarioTabValue };

type InventarioMenuTabsProps = {
  activeTab: InventarioTabValue;
  onTabChange: (value: InventarioTabValue) => void;
  /** Si se omite, se listan todas las pestañas del catálogo (salvo `config`). */
  tabs?: Array<{ value: InventarioTabValue; label: string }>;
  user?: InventarioJwtScopeUserLike | null;
};

export default function InventarioMenuTabs({
  activeTab,
  onTabChange,
  tabs: tabsProp,
}: InventarioMenuTabsProps): React.ReactElement {
  const tabs = tabsProp ?? [];

  return (
    <div className="w-full overflow-x-auto pb-1">
    <TabsList className="h-auto min-w-max justify-start">
      {tabs.map((tab) => (
        <TabsTrigger
          key={tab.value}
          value={tab.value}
          aria-current={activeTab === tab.value ? 'page' : undefined}
          onClick={() => onTabChange(tab.value)}
        >
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
    </div>
  );
}
