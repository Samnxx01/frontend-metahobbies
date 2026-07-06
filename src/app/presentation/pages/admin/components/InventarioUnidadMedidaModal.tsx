import React, { useState } from 'react';
import { Ban, Eye, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import type { InventarioTipoUnidadMedida, InventarioUnidadMedida, TipoUnidadMedida } from '@/app/services/inventarioService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const getTipoUnidadLabel = (tipos: InventarioTipoUnidadMedida[], codigo?: string): string => {
  const value = String(codigo || 'UNIDAD').trim().toUpperCase();
  return tipos.find((tipo) => tipo.codigo === value)?.nombre || value;
};

export type UnidadMedidaDraft = {
  _id?: string;
  codigo: string;
  nombre: string;
  tipoUnidad: TipoUnidadMedida | '';
  descripcion: string;
  estado: boolean;
  esUnidadBaseInventario: boolean;
  unidadBaseRelacionadaId: string;
  factorConversionHaciaBase: string;
};

type InventarioUnidadMedidaModalProps = {
  open: boolean;
  saving: boolean;
  unidades: InventarioUnidadMedida[];
  tiposUnidad: InventarioTipoUnidadMedida[];
  draft: UnidadMedidaDraft;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (draft: UnidadMedidaDraft) => void;
  onCreateTipoUnidad: (payload: { codigo?: string; nombre: string; descripcion?: string }) => Promise<InventarioTipoUnidadMedida>;
  onSubmit: () => void;
  onEdit: (unidad: InventarioUnidadMedida) => void;
  onReset: () => void;
  onInactivate: (unidad: InventarioUnidadMedida) => Promise<void>;
  onDelete: (unidad: InventarioUnidadMedida) => void;
};

function formatFactorDisplay(value: number): string {
  if (!Number.isFinite(value)) return '';
  const abs = Math.abs(value);
  if (abs >= 1e-3 && abs < 1e6) return value.toLocaleString('es-CO', { maximumFractionDigits: 12 });
  return String(value);
}

export default function InventarioUnidadMedidaModal({
  open,
  saving,
  unidades,
  tiposUnidad,
  draft,
  onOpenChange,
  onDraftChange,
  onCreateTipoUnidad,
  onSubmit,
  onEdit,
  onReset,
  onInactivate,
  onDelete,
}: InventarioUnidadMedidaModalProps): React.ReactElement {
  const [tipoModalOpen, setTipoModalOpen] = useState(false);
  const [tipoListModalOpen, setTipoListModalOpen] = useState(false);
  const [tipoSaving, setTipoSaving] = useState(false);
  const [tipoDraft, setTipoDraft] = useState({ codigo: '', nombre: '', descripcion: '' });

  const patch = (partial: Partial<UnidadMedidaDraft>): void => {
    let next: UnidadMedidaDraft = { ...draft, ...partial };
    if (partial.esUnidadBaseInventario === true) {
      next = { ...next, unidadBaseRelacionadaId: '', factorConversionHaciaBase: '' };
    }
    onDraftChange(next);
  };

  const update = (field: keyof UnidadMedidaDraft, value: string | boolean): void => {
    patch({ [field]: value } as Partial<UnidadMedidaDraft>);
  };

  const crearTipoUnidad = async (): Promise<void> => {
    const nombre = tipoDraft.nombre.trim();
    const codigo = tipoDraft.codigo.trim().toUpperCase();
    if (!nombre) {
      toast.error('El nombre del tipo de unidad es obligatorio.');
      return;
    }

    try {
      setTipoSaving(true);
      const saved = await onCreateTipoUnidad({
        ...(codigo ? { codigo } : {}),
        nombre,
        descripcion: tipoDraft.descripcion.trim(),
      });
      patch({ tipoUnidad: saved.codigo });
      setTipoDraft({ codigo: '', nombre: '', descripcion: '' });
      setTipoModalOpen(false);
      toast.success('Tipo de unidad creado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo crear el tipo de unidad.');
    } finally {
      setTipoSaving(false);
    }
  };

  const tipoActual = (draft.tipoUnidad || 'UNIDAD') as TipoUnidadMedida;
  const tiposActivos = tiposUnidad.filter((tipo) => tipo.estado);

  const candidatosBase = unidades.filter((u) => {
    if (draft._id && u._id === draft._id) return false;
    if (!u.estado) return false;
    const esBase = u.esUnidadBaseInventario !== false;
    if (!esBase) return false;
    const t = u.tipoUnidad || 'UNIDAD';
    return t === tipoActual;
  });

  const unidadBaseSeleccionada = unidades.find((u) => u._id === draft.unidadBaseRelacionadaId);
  const factorNum = Number(String(draft.factorConversionHaciaBase).replace(',', '.'));
  const codigoPreview = draft.codigo.trim().toUpperCase();
  const ayudaConversion =
    unidadBaseSeleccionada &&
    codigoPreview &&
    Number.isFinite(factorNum) &&
    factorNum > 0
      ? `1 ${codigoPreview} = ${formatFactorDisplay(factorNum)} ${unidadBaseSeleccionada.codigo}`
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-h-[92dvh] max-w-3xl overflow-y-auto border-border bg-background text-foreground shadow-lg">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-lg font-semibold">Parametrizar unidades de medida</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Configure unidades base y conversiones usadas en inventario y productos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card className="border-border/80 bg-muted/20 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Información general</CardTitle>
              <div className="flex items-start justify-between gap-3">
                <CardDescription>Código, nombre, tipo y estado de la unidad.</CardDescription>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setTipoListModalOpen(true)} disabled={saving}>
                    <Eye className="mr-1 h-4 w-4" />
                    Ver tipos
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setTipoModalOpen(true)} disabled={saving}>
                    <Plus className="mr-1 h-4 w-4" />
                    Tipo unidad
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="um-codigo">Código *</Label>
                  <Input
                    id="um-codigo"
                    value={draft.codigo}
                    onChange={(e) => update('codigo', e.target.value.toUpperCase())}
                    placeholder="CAJA"
                    className="border-input bg-background shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="um-nombre">Nombre *</Label>
                  <Input
                    id="um-nombre"
                    value={draft.nombre}
                    onChange={(e) => update('nombre', e.target.value)}
                    placeholder="Caja"
                    className="border-input bg-background shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de unidad *</Label>
                  <Select
                    value={draft.tipoUnidad || undefined}
                    onValueChange={(value) => patch({ tipoUnidad: value as TipoUnidadMedida })}
                  >
                    <SelectTrigger className="border-input bg-background shadow-sm">
                      <SelectValue placeholder="Seleccione tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposActivos.map((opt) => (
                        <SelectItem key={opt.codigo} value={opt.codigo}>
                          {opt.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estado *</Label>
                  <Select value={draft.estado ? 'ACTIVO' : 'INACTIVO'} onValueChange={(v) => update('estado', v === 'ACTIVO')}>
                    <SelectTrigger className="border-input bg-background shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVO">Activo</SelectItem>
                      <SelectItem value="INACTIVO">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="um-desc">Descripción</Label>
                <Input
                  id="um-desc"
                  value={draft.descripcion}
                  onChange={(e) => update('descripcion', e.target.value)}
                  placeholder="Uso interno de la unidad"
                  className="border-input bg-background shadow-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-muted/30 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Configuración de conversión</CardTitle>
              <CardDescription>
                Marque si esta fila es la unidad base de inventario para su tipo; en caso contrario, indique hacia qué
                unidad base se convierte y el factor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/80 p-3 shadow-sm">
                <Checkbox
                  id="um-base"
                  checked={draft.esUnidadBaseInventario}
                  onCheckedChange={(checked) => patch({ esUnidadBaseInventario: checked === true })}
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <Label htmlFor="um-base" className="cursor-pointer font-medium leading-none">
                    Unidad base de inventario
                  </Label>
                  <p className="text-xs text-muted-foreground">Sin conversión hacia otra unidad del mismo tipo.</p>
                </div>
              </div>

              {!draft.esUnidadBaseInventario ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Unidad base relacionada *</Label>
                    {candidatosBase.length > 0 ? (
                      <Select
                        value={draft.unidadBaseRelacionadaId || undefined}
                        onValueChange={(value) => update('unidadBaseRelacionadaId', value)}
                      >
                        <SelectTrigger className="border-input bg-background shadow-sm">
                          <SelectValue placeholder="Seleccione unidad base" />
                        </SelectTrigger>
                        <SelectContent>
                          {candidatosBase.map((u) => (
                            <SelectItem key={u._id} value={u._id}>
                              {u.nombre} ({u.codigo})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
                        No hay otra unidad marcada como base activa para este tipo. Cree o active una unidad base del mismo
                        tipo primero.
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="um-factor">Factor de conversión *</Label>
                    <Input
                      id="um-factor"
                      inputMode="decimal"
                      value={draft.factorConversionHaciaBase}
                      onChange={(e) => update('factorConversionHaciaBase', e.target.value)}
                      placeholder="0.001"
                      className="border-input bg-background font-mono text-sm shadow-sm"
                    />
                    <p className="text-xs text-muted-foreground">Cantidad en la unidad base equivalente a 1 unidad de esta fila.</p>
                  </div>
                </div>
              ) : null}

              {!draft.esUnidadBaseInventario && ayudaConversion ? (
                <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-foreground">
                  {ayudaConversion}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-foreground">Unidades registradas</p>
              <p className="text-xs text-muted-foreground">
                Use el lápiz para cargar la fila en el formulario. La acción de inactivar deshabilita la unidad en listas
                nuevas; no borra el registro.
              </p>
            </div>

            <div className="grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {unidades.length ? (
                unidades.map((unidad) => {
                  const tipo = (unidad.tipoUnidad || 'UNIDAD') as TipoUnidadMedida;
                  return (
                    <div
                      key={unidad._id}
                      className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-3 shadow-sm transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-sm font-semibold text-foreground">{unidad.nombre}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">{unidad.codigo}</p>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <Badge variant="secondary" className="text-[10px] font-normal">
                            {getTipoUnidadLabel(tiposUnidad, tipo)}
                          </Badge>
                          <Badge variant={unidad.estado ? 'outline' : 'destructive'} className="text-[10px]">
                            {unidad.estado ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1 border-t border-border/50 pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 px-2"
                          disabled={saving}
                          onClick={() => onEdit(unidad)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 px-2 text-muted-foreground hover:text-amber-700"
                          title="Inactivar unidad"
                          disabled={saving || !unidad.estado}
                          onClick={() => void onInactivate(unidad)}
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Inactivar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 px-2 text-destructive hover:text-destructive"
                          title="Eliminar unidad"
                          disabled={saving}
                          onClick={() => onDelete(unidad)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="col-span-full rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  No hay unidades parametrizadas.
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-border/60 pt-4 sm:justify-end">
          <Button type="button" variant="outline" onClick={onReset} disabled={saving}>
            Nuevo
          </Button>
          <Button type="button" onClick={onSubmit} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {draft._id ? 'Actualizar unidad' : 'Crear unidad'}
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={tipoListModalOpen} onOpenChange={setTipoListModalOpen}>
        <DialogContent className="z-[60] w-[calc(100%-2rem)] max-h-[90dvh] max-w-2xl overflow-y-auto border-border bg-background text-foreground shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Tipos de unidad creados
            </DialogTitle>
            <DialogDescription>
              Consulta los tipos registrados desde el GET y carga uno en el formulario cuando lo necesites.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm">
            <span className="font-medium text-foreground">Catalogo de tipos</span>
            <Badge variant="secondary">{tiposUnidad.length} registros</Badge>
          </div>

          <div className="grid max-h-[55vh] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {tiposUnidad.length ? (
              tiposUnidad.map((tipo) => (
                <div
                  key={tipo._id || tipo.codigo}
                  className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-sm"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{tipo.nombre}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">{tipo.codigo}</p>
                      </div>
                      <Badge variant={tipo.estado ? 'outline' : 'destructive'} className="shrink-0 text-[10px]">
                        {tipo.estado ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {tipo.descripcion?.trim() || 'Sin descripcion registrada.'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-end"
                    disabled={saving || !tipo.estado}
                    onClick={() => {
                      patch({ tipoUnidad: tipo.codigo as TipoUnidadMedida });
                      setTipoListModalOpen(false);
                    }}
                  >
                    Usar tipo
                  </Button>
                </div>
              ))
            ) : (
              <p className="col-span-full rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                No hay tipos de unidad creados.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTipoListModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={tipoModalOpen} onOpenChange={setTipoModalOpen}>
        <DialogContent className="z-[60] w-[calc(100%-2rem)] max-h-[90dvh] max-w-md overflow-y-auto border-border bg-background text-foreground shadow-xl">
          <DialogHeader>
            <DialogTitle>Nuevo tipo de unidad</DialogTitle>
            <DialogDescription>
              Cree el tipo y quedara disponible inmediatamente en el select de unidades.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Codigo</Label>
              <Input
                value={tipoDraft.codigo}
                onChange={(event) => setTipoDraft((prev) => ({ ...prev, codigo: event.target.value.toUpperCase() }))}
                placeholder="EMPAQUE"
                className="border-input bg-background"
                disabled={tipoSaving}
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={tipoDraft.nombre}
                onChange={(event) => setTipoDraft((prev) => ({ ...prev, nombre: event.target.value }))}
                placeholder="Empaque"
                className="border-input bg-background"
                disabled={tipoSaving}
              />
            </div>
            <div className="space-y-2">
              <Label>Descripcion</Label>
              <Input
                value={tipoDraft.descripcion}
                onChange={(event) => setTipoDraft((prev) => ({ ...prev, descripcion: event.target.value }))}
                placeholder="Cajas, paquetes o presentaciones comerciales"
                className="border-input bg-background"
                disabled={tipoSaving}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setTipoModalOpen(false)} disabled={tipoSaving}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void crearTipoUnidad()} disabled={tipoSaving || !tipoDraft.nombre.trim()}>
              <Save className="mr-2 h-4 w-4" />
              {tipoSaving ? 'Creando...' : 'Crear tipo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
