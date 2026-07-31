import React from 'react';
import { Loader2 } from 'lucide-react';
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
  loading?: boolean;
  tab: MarcoCatalogTab;
  onTabChange: (tab: MarcoCatalogTab) => void;
  filtroVistas: string;
  onFiltroVistasChange: (value: string) => void;
  filtroAcciones: string;
  onFiltroAccionesChange: (value: string) => void;
  accionesTotal: number;
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
  loading = false,
  tab,
  onTabChange,
  filtroVistas,
  onFiltroVistasChange,
  filtroAcciones,
  onFiltroAccionesChange,
  accionesTotal,
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
  const filtroAccionesNorm = filtroAcciones.trim().toLowerCase();
  const rutasPorModulo = React.useMemo(() => {
    const grupos = new Map<string, Route[]>();
    for (const ruta of rutasFiltradas) {
      const segmentos = String(ruta.path || '').split('/').filter(Boolean);
      const moduloPath = segmentos.find((segmento) => !['admin', 'app', 'dashboard'].includes(segmento.toLowerCase()));
      const modulo = String(moduloPath || ruta.layout || ruta.component || 'General')
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (letra) => letra.toUpperCase());
      grupos.set(modulo, [...(grupos.get(modulo) ?? []), ruta]);
    }
    return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b, 'es'));
  }, [rutasFiltradas]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Catálogo del techo</CardTitle>
        <CardDescription>Administre permisos separados por módulo, ruta y acción HTTP</CardDescription>
      </CardHeader>
      <CardContent className="relative space-y-4">
        {loading ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/60"
            aria-busy="true"
            aria-label="Cargando marco del rol"
          >
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="filtro-marco">Buscar</Label>
            <Input
              id="filtro-marco"
              value={tab === 'vistas' ? filtroVistas : filtroAcciones}
              onChange={(e) =>
                tab === 'vistas'
                  ? onFiltroVistasChange(e.target.value)
                  : onFiltroAccionesChange(e.target.value)
              }
              placeholder={
                tab === 'vistas'
                  ? 'path, nombre, componente…'
                  : 'GET, POST, etiqueta, id…'
              }
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
              Módulos y rutas ({vistasSel.size}/{rutasFiltradas.length})
            </TabsTrigger>
            <TabsTrigger value="acciones">
              Acciones ({accionesSel.size}/{accionesTotal})
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
                  rutasPorModulo.map(([modulo, rutasModulo]) => (
                    <li key={modulo} className="list-none py-1">
                      <div className="sticky top-0 z-[1] flex items-center justify-between bg-muted px-3 py-2 text-xs font-semibold uppercase tracking-wide">
                        <span>{modulo}</span>
                        <Badge variant="outline" className="text-[10px]">{rutasModulo.length} ruta(s)</Badge>
                      </div>
                      <ul className="divide-y">
                        {rutasModulo.map((r) => {
                          const id = toId(r);
                          const checked = vistasSel.has(id);
                          const sugerida = SUGERENCIAS_AFILIADO.test(`${r.path} ${r.name}`);
                          return (
                            <li key={id} className="flex items-start gap-3 px-3 py-2">
                              <Checkbox checked={checked} onCheckedChange={(v) => onToggleVista(id, v === true)} className="mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{r.name}</p>
                                <p className="truncate text-xs text-muted-foreground">{r.path}</p>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {sugerida ? <Badge variant="secondary" className="text-[10px]">sugerida</Badge> : null}
                                  <Badge variant="outline" className="text-[10px]">{r.component}</Badge>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))
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
                    {accionesTotal === 0
                      ? 'No hay acciones HTTP en el catálogo. Créelas en Gestión de rutas o verifique el backend.'
                      : filtroAccionesNorm
                        ? `Ninguna acción coincide con «${filtroAcciones}». Hay ${accionesTotal} en catálogo — limpie el filtro.`
                        : 'Sin acciones visibles. Use «Marcar visibles».'}
                  </li>
                ) : (
                  accionesFiltradas.map((a) => {
                    const id = toId(a);
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
