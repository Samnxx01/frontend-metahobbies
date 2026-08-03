import React from 'react';
import { Pencil, Save, Trash2 } from 'lucide-react';
import type { InventarioTipoMovimiento } from '@/app/services/inventarioService';
import { idTipoMovimiento } from '@/app/presentation/pages/admin/inventario/inventarioTipoMovimientoKardex';
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

export type TipoMovimientoDraft = {
  _id?: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  naturaleza: 'ENTRADA' | 'SALIDA';
  estado: boolean;
};

type InventarioTipoMovimientoModalProps = {
  open: boolean;
  saving: boolean;
  tipos: InventarioTipoMovimiento[];
  draft: TipoMovimientoDraft;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (draft: TipoMovimientoDraft) => void;
  onSubmit: () => void;
  onEdit: (tipo: InventarioTipoMovimiento) => void;
  onDelete: (tipo: InventarioTipoMovimiento) => void;
  onReset: () => void;
};

export default function InventarioTipoMovimientoModal({
  open,
  saving,
  tipos,
  draft,
  onOpenChange,
  onDraftChange,
  onSubmit,
  onEdit,
  onDelete,
  onReset,
}: InventarioTipoMovimientoModalProps): React.ReactElement {
  const update = (field: keyof TipoMovimientoDraft, value: string | boolean): void => {
    onDraftChange({ ...draft, [field]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-h-[90dvh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Parametrizar tipos de movimiento</DialogTitle>
          <DialogDescription>
            Crea tipos de entrada o salida que luego quedan relacionados al movimiento del kardex.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Codigo *</Label>
            <Input value={draft.codigo} onChange={(event) => update('codigo', event.target.value.toUpperCase())} placeholder="ENTRADA_COMPRA" />
          </div>
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input value={draft.nombre} onChange={(event) => update('nombre', event.target.value)} placeholder="Entrada por compra" />
          </div>
          <div className="space-y-2">
            <Label>Naturaleza *</Label>
            <Select value={draft.naturaleza} onValueChange={(value) => update('naturaleza', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ENTRADA">Entrada</SelectItem>
                <SelectItem value="SALIDA">Salida</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={draft.estado ? 'ACTIVO' : 'INACTIVO'} onValueChange={(value) => update('estado', value === 'ACTIVO')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVO">Activo</SelectItem>
                <SelectItem value="INACTIVO">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Descripcion</Label>
            <Input value={draft.descripcion} onChange={(event) => update('descripcion', event.target.value)} />
          </div>
        </div>

        <div className="max-h-56 overflow-auto rounded-md border border-border bg-card">
          {tipos.map((tipo) => (
            <div
              key={idTipoMovimiento(tipo) || tipo.codigo}
              className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 text-left text-foreground last:border-b-0 transition-colors hover:bg-muted/60"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">{tipo.nombre}</span>
                <span className="block text-xs text-muted-foreground">{tipo.codigo} - {tipo.descripcion || 'Sin descripcion'}</span>
              </span>
              <span className="flex flex-wrap items-center justify-end gap-2">
                {tipo.codigo === 'SALIDA_VENTA_CARRITO' ? (
                  <Badge variant="secondary">Pipeline B</Badge>
                ) : null}
                <Badge variant="outline">
                  {tipo.naturaleza === 'ENTRADA' ? 'Entrada' : 'Salida'}
                </Badge>
                <Badge variant={tipo.estado ? 'outline' : 'destructive'}>
                  {tipo.estado ? 'Activo' : 'Inactivo'}
                </Badge>
                <Button type="button" variant="outline" size="sm" onClick={() => onEdit(tipo)} disabled={saving}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(tipo)} disabled={saving}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Eliminar
                </Button>
              </span>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" size="sm" onClick={onReset} disabled={saving}>
            Nuevo
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onSubmit} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {draft._id ? 'Actualizar tipo' : 'Crear tipo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
