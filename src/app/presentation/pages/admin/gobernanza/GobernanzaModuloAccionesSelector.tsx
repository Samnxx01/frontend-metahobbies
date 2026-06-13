import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { GobernanzaFormularioAccionApi } from './gobernanzaModuloApiTypes';
import { METHOD_STYLE } from './parametrosGobernanzaSectionUi';

export type GobernanzaModuloAccionesSelectorProps = {
  acciones: GobernanzaFormularioAccionApi[];
  seleccion: Record<string, boolean>;
  onSeleccionChange: (next: Record<string, boolean>) => void;
  loading?: boolean;
  onRefresh?: () => void;
  refreshLoading?: boolean;
  /** Fuente de la selección publicada (no rutaseguridads.acciones). */
  origen?: 'gobernanzaModuloConfigs' | 'ruta';
};

export function GobernanzaModuloAccionesSelector({
  acciones,
  seleccion,
  onSeleccionChange,
  loading = false,
  onRefresh,
  refreshLoading = false,
  origen = 'gobernanzaModuloConfigs',
}: GobernanzaModuloAccionesSelectorProps): React.ReactElement {
  const toggleAccion = (accionId: string, checked: boolean): void => {
    onSeleccionChange({ ...seleccion, [accionId]: checked });
  };

  const seleccionarTodas = (checked: boolean): void => {
    const next: Record<string, boolean> = {};
    for (const a of acciones) {
      next[a.accionId] = checked;
    }
    onSeleccionChange(next);
  };

  const totalMarcadas = acciones.filter((a) => seleccion[a.accionId]).length;

  return (
    <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
          Operaciones habilitadas
        </p>
        <div className="flex items-center gap-2">
          {acciones.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => seleccionarTodas(totalMarcadas < acciones.length)}
            >
              {totalMarcadas < acciones.length ? 'Marcar todas' : 'Desmarcar todas'}
            </Button>
          ) : null}
          {onRefresh ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={loading || refreshLoading}
              onClick={onRefresh}
            >
              {loading || refreshLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Actualizar'}
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          {origen === 'gobernanzaModuloConfigs'
            ? 'Cargando operaciones…'
            : 'Cargando operaciones del formulario…'}
        </p>
      ) : acciones.length === 0 ? (
        <p className="text-xs text-amber-800">
          {origen === 'ruta'
            ? 'Sin acciones HTTP en la vista (rutaseguridads). Agrega al menos un GET en Seguridad → Rutas.'
            : 'Sin acciones activas en la colección acciones. Revise Seguridad → Rutas → acciones.'}
        </p>
      ) : (
        <ul className="max-h-56 space-y-1 overflow-y-auto text-xs">
          {acciones.map((a) => (
            <li
              key={a.accionId}
              className="flex items-center gap-2 rounded border border-border/60 bg-card px-2 py-1.5"
            >
              <Checkbox
                id={`gm-accion-${a.accionId}`}
                checked={seleccion[a.accionId] === true}
                onCheckedChange={(v) => toggleAccion(a.accionId, v === true)}
              />
              <label htmlFor={`gm-accion-${a.accionId}`} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                <span
                  className={`rounded border px-1 py-0.5 text-[10px] font-semibold ${METHOD_STYLE[a.method as keyof typeof METHOD_STYLE] ?? ''}`}
                >
                  {a.method}
                </span>
                <span className="min-w-0 flex-1 truncate">{a.title || a.method}</span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {acciones.length > 0 ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {totalMarcadas} de {acciones.length} operación(es) habilitada(s).
        </p>
      ) : null}
    </div>
  );
}
