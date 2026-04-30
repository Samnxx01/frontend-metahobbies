import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

export type InventarioTabValue = 'stock' | 'movimientos' | 'orden-compras' | 'ajustes' | 'bodegas' | 'config';

type InventarioMenuTabsProps = {
  activeTab: InventarioTabValue;
  onTabChange: (value: InventarioTabValue) => void;
};

const INVENTARIO_TABS: Array<{ value: InventarioTabValue; label: string }> = [
  { value: 'stock', label: 'Stock' },
  { value: 'movimientos', label: 'Movimientos' },
  { value: 'orden-compras', label: 'Orden/compras' },
  { value: 'ajustes', label: 'Ajustes' },
  { value: 'bodegas', label: 'Bodegas' },
  { value: 'config', label: 'Configuracion' },
];

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
