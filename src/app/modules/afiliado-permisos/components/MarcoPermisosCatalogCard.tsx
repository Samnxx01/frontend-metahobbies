import React from 'react';
import type { Route } from '@/app/services/routesService';
import type { AccionOption } from '@/app/services/routesService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SUGERENCIAS_AFILIADO } from '../constants/catalog-filters';
import type { MarcoCatalogTab } from '../types/marco.types';
import { toId } from '../utils/toId';

type Props = {
  tab: MarcoCatalogTab;
  onTabChange: (tab: MarcoCatalogTab) => void;
  filtro: string;
  onFiltroChange: (value: string) => void;
  soloSugeridas: boolean;
  onSoloSugeridasChange: (value: boolean) => void;
  vistasSel: Set<string>;
  accionesSel: Set<string>;
  rutasFiltradas: Route[];
  accionesFiltradas: AccionOption[];
  onToggleVista: (id: string, checked: boolean) => void;
  onToggleAccion: (id: string, checked: boolean) => void;
  onSeleccionarVistasVisibles: () => void;
  onLimpiarVistasVisibles: () => void;
  onSeleccionarAccionesVisibles: () => void;
  onLimpiarAccionesVisibles: () => void;
};

export function MarcoPermisosCatalogCard({
  tab,
  onTabChange,
  filtro,
  onFiltroChange,
  soloSugeridas,
  onSoloSugeridasChange,
  vistasSel,
  accionesSel,
  rutasFiltradas,
  accionesFiltradas,
  onToggleVista,
  onToggleAccion,
  onSeleccionarVistasVisibles,
  onLimpiarVistasVisibles,
  onSeleccionarAccionesVisibles,
  onLimpiarAccionesVisibles,
}: Props): React.ReactElement {
  const filtroNorm = filtro.trim().toLowerCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Catálogo del techo</CardTitle>
        <CardDescription>Marque vistas (rutas de seguridad) y acciones HTTP permitidas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="filtro-marco">Buscar</Label>
            <Input
              id="filtro-marco"
              value={filtro}
              onChange={(e) => onFiltroChange(e.target.value)}
              placeholder="path, nombre, GET, referido…"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm">
            <Checkbox
              checked={soloSugeridas}
              onCheckedChange={(v) => onSoloSugeridasChange(v === true)}
            />
            Solo rutas sugeridas afiliado
          </label>
        </div>

        <Tabs value={tab} onValueChange={(v) => onTabChange(v as MarcoCatalogTab)}>
          <TabsList>
            <TabsTrigger value="vistas">
              Vistas ({vistasSel.size}/{rutasFiltradas.length})
            </TabsTrigger>
            <TabsTrigger value="acciones">
              Acciones ({accionesSel.size}/{accionesFiltradas.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vistas" className="mt-4 space-y-2">
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onSeleccionarVistasVisibles}>
                Marcar visibles
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={onLimpiarVistasVisibles}>
                Desmarcar visibles
              </Button>
            </div>
            <ScrollArea className="h-[min(420px,50vh)] rounded-md border">
              <ul className="divide-y p-2">
                {rutasFiltradas.length === 0 ? (
                  <li className="p-4 text-center text-sm text-muted-foreground">
                    Sin rutas para el filtro
                  </li>
                ) : (
                  rutasFiltradas.map((r) => {
                    const id = toId(r.iud || r._id);
                    const checked = vistasSel.has(id);
                    const sugerida = SUGERENCIAS_AFILIADO.test(`${r.path} ${r.name}`);
                    return (
                      <li key={id} className="flex items-start gap-3 py-2">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => onToggleVista(id, v === true)}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-sm">{r.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{r.path}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {sugerida ? (
                              <Badge variant="secondary" className="text-[10px]">
                                sugerida
                              </Badge>
                            ) : null}
                            <Badge variant="outline" className="text-[10px]">
                              {r.component}
                            </Badge>
                          </div>
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="acciones" className="mt-4 space-y-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSeleccionarAccionesVisibles}
              >
                Marcar visibles
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={onLimpiarAccionesVisibles}>
                Desmarcar visibles
              </Button>
            </div>
            <ScrollArea className="h-[min(420px,50vh)] rounded-md border">
              <ul className="divide-y p-2">
                {accionesFiltradas.length === 0 ? (
                  <li className="p-4 text-center text-sm text-muted-foreground">
                    {filtroNorm
                      ? 'Sin acciones para el filtro. Limpie la búsqueda o use «Marcar visibles».'
                      : 'No hay acciones HTTP en el catálogo. Créelas en Gestión de rutas o reinicie el backend.'}
                  </li>
                ) : (
                  accionesFiltradas.map((a) => {
                    const id = toId(a._id || a.iud);
                    const checked = accionesSel.has(id);
                    return (
                      <li key={id} className="flex items-center gap-3 py-2">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => onToggleAccion(id, v === true)}
                        />
                        <Badge className="shrink-0 font-mono text-xs">{a.method}</Badge>
                        <span className="truncate text-sm">{a.etiquetas || id}</span>
                      </li>
                    );
                  })
                )}
              </ul>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
