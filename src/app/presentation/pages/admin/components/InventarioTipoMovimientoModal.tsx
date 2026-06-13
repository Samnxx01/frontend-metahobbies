import React from 'react';
import { Save } from 'lucide-react';
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
  onReset,
}: InventarioTipoMovimientoModalProps): React.ReactElement {
  const update = (field: keyof TipoMovimientoDraft, value: string | boolean): void => {
    onDraftChange({ ...draft, [field]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
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
            <button
              key={idTipoMovimiento(tipo) || tipo.codigo}
              type="button"
              className="flex w-full items-center justify-between gap-3 border-b border-border px-4 py-3 text-left text-foreground last:border-b-0 transition-colors hover:bg-muted/60"
              onClick={() => onEdit(tipo)}
            >
              <span>
                <span className="block text-sm font-semibold text-foreground">{tipo.nombre}</span>
                <span className="block text-xs text-muted-foreground">{tipo.codigo} - {tipo.descripcion || 'Sin descripcion'}</span>
              </span>
              <span className="flex items-center gap-2">
                <Badge variant="outline">
                  {tipo.naturaleza === 'ENTRADA' ? 'Entrada' : 'Salida'}
                </Badge>
                <Badge variant={tipo.estado ? 'outline' : 'destructive'}>
                  {tipo.estado ? 'Activo' : 'Inactivo'}
                </Badge>
              </span>
            </button>
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
