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
  /** Sesión actual: filtra pestañas sensibles (p. ej. TRM) según `tenantScope` del JWT. */
  user?: InventarioJwtScopeUserLike | null;
};

export default function InventarioMenuTabs({
  activeTab,
  onTabChange,
  tabs: tabsProp,
}: InventarioMenuTabsProps): React.ReactElement {
  const tabs = tabsProp ?? [];

  return (
    <TabsList className="justify-start">
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
  );
}
