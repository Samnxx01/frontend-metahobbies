import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { inventarioTabsDesdeCatalogo, type InventarioTabValue } from '../inventario/inventarioModulosCatalog';

export type { InventarioTabValue };

type InventarioMenuTabsProps = {
  activeTab: InventarioTabValue;
  onTabChange: (value: InventarioTabValue) => void;
};

const INVENTARIO_TABS = inventarioTabsDesdeCatalogo();

export default function InventarioMenuTabs({
  activeTab,
  onTabChange,
}: InventarioMenuTabsProps): React.ReactElement {
  return (
    <TabsList className="justify-start">
      {INVENTARIO_TABS.map((tab) => (
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
  );
}
