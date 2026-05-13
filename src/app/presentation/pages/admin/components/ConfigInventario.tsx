import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Boxes, CheckCircle2, Save } from 'lucide-react';
import type { InventarioConfig, MetodoValuacion } from '@/app/services/inventarioService';
import inventarioService from '@/app/services/inventarioService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  inventarioModulosParaGridConfig,
  type InventarioModuloCatalogo,
  type InventarioTabValue,
} from '../inventario/inventarioModulosCatalog';
import { resolveMenuPathForCatalogModule } from '../inventario/inventarioFormularioPathMatch';
import InventarioFormulariosTenantModal from './InventarioFormulariosTenantModal';

type ConfigInventarioProps = {
  config: InventarioConfig | null;
  periodo: string;
  saving: boolean;
  setPeriodo: React.Dispatch<React.SetStateAction<string>>;
  actualizarMetodo: (metodoValuacion: MetodoValuacion) => Promise<void>;
  cerrarPeriodo: () => Promise<void>;
  onNavigateTab: (tab: InventarioTabValue) => void;
  /**
   * Opcional: limita qué tarjetas se muestran (p. ej. según permisos o tenant).
   * Por defecto se muestran todas las que tengan `cardDescription` en el catálogo.
   */
  filtroModulos?: (m: InventarioModuloCatalogo) => boolean;
};

export default function ConfigInventario({
  config,
  periodo,
  saving,
  setPeriodo,
  actualizarMetodo,
  cerrarPeriodo,
  onNavigateTab,
  filtroModulos,
}: ConfigInventarioProps): React.ReactElement {
  const modulosGrid = useMemo(
    () => inventarioModulosParaGridConfig(filtroModulos ?? (() => true)),
    [filtroModulos],
  );

  const [pathsDesdeSeguridad, setPathsDesdeSeguridad] = useState<Partial<Record<InventarioTabValue, string>>>({});

  const refreshPathsDesdeSeguridad = useCallback(async () => {
    try {
      const data = await inventarioService.obtenerFormulariosAutorizacionOpciones(undefined);
      const forms = data.formularios ?? [];
      const next: Partial<Record<InventarioTabValue, string>> = {};
      for (const m of modulosGrid) {
        const resolved = resolveMenuPathForCatalogModule(m.path, m.pathSegment, forms);
        if (resolved) next[m.tab] = resolved;
      }
      setPathsDesdeSeguridad(next);
    } catch {
      setPathsDesdeSeguridad({});
    }
  }, [modulosGrid]);

  useEffect(() => {
    void refreshPathsDesdeSeguridad();
  }, [refreshPathsDesdeSeguridad]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5" />
              ConfigInventario
            </CardTitle>
            <CardDescription>
              Centraliza la parametrizacion del modulo de inventario y sus secciones operativas.
            </CardDescription>
          </div>
          <InventarioFormulariosTenantModal
            modules={modulosGrid.map(({ title, path }) => ({ title, path }))}
            onFormulariosAutorizacionApplied={() => void refreshPathsDesdeSeguridad()}
          />
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {modulosGrid.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.tab}
                type="button"
                className="rounded-lg border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:bg-muted/40"
                onClick={() => onNavigateTab(item.tab)}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background">
                    <Icon className="h-4 w-4" />
                  </span>
                  <Badge variant="secondary">Abrir</Badge>
                </div>
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
                <p className="mt-3 break-all rounded-md bg-muted/60 px-2 py-1 font-mono text-[11px] text-muted-foreground">
                  {pathsDesdeSeguridad[item.tab] ?? item.path}
                </p>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Configuracion contable
          </CardTitle>
          <CardDescription>Metodo de valuacion y periodos cerrados.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Metodo de valuacion</Label>
              <Select value={config?.metodoValuacion || 'PROMEDIO'} onValueChange={(value) => void actualizarMetodo(value as MetodoValuacion)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROMEDIO">Promedio ponderado</SelectItem>
                  <SelectItem value="FIFO">PEPS / FIFO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Periodo a cerrar</Label>
              <Input value={periodo} onChange={(event) => setPeriodo(event.target.value)} placeholder="2026-04" />
            </div>
            <div className="flex items-end">
              <Button onClick={() => void cerrarPeriodo()} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                Cerrar periodo
              </Button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Periodos cerrados</p>
            <div className="flex flex-wrap gap-2">
              {(config?.periodosCerrados || []).length > 0 ? (
                config?.periodosCerrados.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)
              ) : (
                <p className="text-sm text-muted-foreground">No hay periodos cerrados.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
