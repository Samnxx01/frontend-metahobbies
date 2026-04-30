import React, { useState } from 'react';
import { Pencil, Save, Trash2 } from 'lucide-react';
import type { InventarioUnidadMedida } from '@/app/services/inventarioService';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

export type UnidadMedidaDraft = {
  _id?: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  estado: boolean;
};

type InventarioUnidadMedidaModalProps = {
  open: boolean;
  saving: boolean;
  unidades: InventarioUnidadMedida[];
  draft: UnidadMedidaDraft;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (draft: UnidadMedidaDraft) => void;
  onSubmit: () => void;
  onEdit: (unidad: InventarioUnidadMedida) => void;
  onReset: () => void;
  onDelete: (unidad: InventarioUnidadMedida) => Promise<void>;
};

export default function InventarioUnidadMedidaModal({
  open,
  saving,
  unidades,
  draft,
  onOpenChange,
  onDraftChange,
  onSubmit,
  onEdit,
  onReset,
  onDelete,
}: InventarioUnidadMedidaModalProps): React.ReactElement {
  const [confirmDelete, setConfirmDelete] = useState<InventarioUnidadMedida | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const update = (field: keyof UnidadMedidaDraft, value: string | boolean): void => {
    onDraftChange({ ...draft, [field]: value });
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!confirmDelete) return;
    setDeleteBusy(true);
    try {
      await onDelete(confirmDelete);
      setConfirmDelete(null);
    } catch {
      /* error ya mostrado en el padre */
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl border-border bg-background text-foreground">
          <DialogHeader>
            <DialogTitle>Parametrizar unidades de medida</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Cree, actualice o elimine unidades usadas al crear SKU. Los colores siguen la paleta activa de la aplicación.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Codigo *</Label>
              <Input
                value={draft.codigo}
                onChange={(event) => update('codigo', event.target.value.toUpperCase())}
                placeholder="CAJA"
                className="border-input bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={draft.nombre}
                onChange={(event) => update('nombre', event.target.value)}
                placeholder="Caja"
                className="border-input bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={draft.estado ? 'ACTIVO' : 'INACTIVO'} onValueChange={(value) => update('estado', value === 'ACTIVO')}>
                <SelectTrigger className="border-input bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-popover text-popover-foreground">
                  <SelectItem value="ACTIVO">Activo</SelectItem>
                  <SelectItem value="INACTIVO">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descripcion</Label>
              <Input
                value={draft.descripcion}
                onChange={(event) => update('descripcion', event.target.value)}
                placeholder="Uso interno de la unidad"
                className="border-input bg-background"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            En la lista: use el lápiz para cargar la unidad en el formulario y editar; la papelera elimina de forma permanente (si ningún SKU la usa).
          </p>

          <div className="max-h-56 overflow-auto rounded-md border border-border bg-card">
            {unidades.length ? (
              unidades.map((unidad) => (
                <div
                  key={unidad._id}
                  className="flex w-full items-stretch gap-1 border-b border-border last:border-b-0"
                >
                  <div
                    className="flex min-w-0 flex-1 cursor-pointer items-center px-3 py-3 transition-colors hover:bg-muted/60"
                    role="button"
                    tabIndex={0}
                    onClick={() => onEdit(unidad)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onEdit(unidad);
                      }
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">{unidad.nombre}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {unidad.codigo} — {unidad.descripcion || 'Sin descripcion'}
                      </span>
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 pr-2">
                    <Badge variant={unidad.estado ? 'outline' : 'destructive'} className="shrink-0">
                      {unidad.estado ? 'Activo' : 'Inactivo'}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-foreground hover:bg-accent hover:text-accent-foreground"
                      title="Editar en formulario"
                      disabled={saving || deleteBusy}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(unidad);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Eliminar unidad"
                      disabled={saving || deleteBusy}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(unidad);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="px-4 py-6 text-sm text-muted-foreground">No hay unidades parametrizadas.</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onReset} disabled={saving || deleteBusy}>
              Nuevo
            </Button>
            <Button type="button" onClick={onSubmit} disabled={saving || deleteBusy}>
              <Save className="mr-2 h-4 w-4" />
              {draft._id ? 'Actualizar unidad' : 'Crear unidad'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(next) => !next && !deleteBusy && setConfirmDelete(null)}>
        <AlertDialogContent className="border-border bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Eliminar unidad de medida</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete
                ? `Se eliminará permanentemente «${confirmDelete.nombre}» (${confirmDelete.codigo}). No podrá deshacerse. Si algún producto aún usa esta unidad, la operación será rechazada.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel disabled={deleteBusy}>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteBusy}
              onClick={() => void handleConfirmDelete()}
            >
              {deleteBusy ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
