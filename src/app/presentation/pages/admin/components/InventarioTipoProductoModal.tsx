import React from 'react';
import { Plus, Save } from 'lucide-react';
import type { BackendTipoProducto } from '@/app/services/productosService';
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

export type TipoProductoDraft = {
  nombre: string;
  codigo: string;
};

type InventarioTipoProductoModalProps = {
  open: boolean;
  saving: boolean;
  tipos: BackendTipoProducto[];
  draft: TipoProductoDraft;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (draft: TipoProductoDraft) => void;
  onSubmit: () => void;
};

export default function InventarioTipoProductoModal({
  open,
  saving,
  tipos,
  draft,
  onOpenChange,
  onDraftChange,
  onSubmit,
}: InventarioTipoProductoModalProps): React.ReactElement {
  const update = (field: keyof TipoProductoDraft, value: string): void => {
    onDraftChange({ ...draft, [field]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tipos de producto</DialogTitle>
          <DialogDescription>
            Administra los tipos disponibles para clasificar los productos del inventario.
          </DialogDescription>
        </DialogHeader>

        {tipos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tipos.map((tipo) => (
              <Badge key={tipo._id ?? tipo.iud ?? tipo.nombre} variant="outline">
                {tipo.nombre}
                {tipo.codigo ? ` (${tipo.codigo})` : ''}
              </Badge>
            ))}
          </div>
        )}

        <div className="grid gap-4 pt-2">
          <p className="text-sm font-medium">Crear nuevo tipo</p>
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input
              value={draft.nombre}
              onChange={(e) => update('nombre', e.target.value)}
              placeholder="Ej: SERVICIO"
            />
          </div>
          <div className="space-y-2">
            <Label>Codigo</Label>
            <Input
              value={draft.codigo}
              onChange={(e) => update('codigo', e.target.value.toUpperCase())}
              placeholder="Se genera desde el nombre si lo dejas vacio"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cerrar
          </Button>
          <Button type="button" onClick={onSubmit} disabled={saving || !draft.nombre.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            Crear tipo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
