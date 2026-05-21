import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import inventarioService, { type EstadoOrdenCompraConfig } from '@/app/services/inventarioService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

const blankDraft = (): EstadoOrdenCompraConfig => ({
  codigo: '',
  nombre: '',
  descripcion: '',
  orden: 1,
  activo: true,
  esEstadoInicial: false,
  permiteEditarOrden: false,
  permiteConfirmarOrden: false,
  estadoDestinoConfirmacion: '',
  permiteComprobanteEntrada: false,
  generaComprobanteContable: false,
});

export type InventarioEstadoOrdenCompraConfigModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (estados: EstadoOrdenCompraConfig[]) => void;
};

export default function InventarioEstadoOrdenCompraConfigModal({
  open,
  onOpenChange,
  onSaved,
}: InventarioEstadoOrdenCompraConfigModalProps): React.ReactElement {
  const [rows, setRows] = useState<EstadoOrdenCompraConfig[]>([]);
  const [draft, setDraft] = useState<EstadoOrdenCompraConfig>(blankDraft());
  const [editCodigo, setEditCodigo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setRows([]);
    setDraft(blankDraft());
    setEditCodigo(null);
    inventarioService.listarEstadosOrdenCompra()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((error) => {
        console.error(error);
        toast.error('No se pudieron cargar los estados de orden de compra.');
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const codigosActivos = useMemo(
    () => rows.filter((r) => r.activo).map((r) => r.codigo),
    [rows],
  );

  const addOrUpdate = (): void => {
    const codigo = draft.codigo.trim().toUpperCase();
    const nombre = draft.nombre.trim();
    if (!codigo || !nombre) {
      toast.error('Código y nombre son obligatorios.');
      return;
    }
    const next: EstadoOrdenCompraConfig = {
      ...draft,
      codigo,
      nombre,
      descripcion: draft.descripcion?.trim() || '',
      orden: Math.max(0, Number(draft.orden) || 0),
      estadoDestinoConfirmacion: String(draft.estadoDestinoConfirmacion || '').trim().toUpperCase(),
    };
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.codigo === codigo);
      const merged = idx >= 0
        ? prev.map((r, i) => (i === idx ? { ...r, ...next } : r))
        : [...prev, next];
      if (next.esEstadoInicial) {
        return merged
          .map((r) => ({ ...r, esEstadoInicial: r.codigo === codigo }))
          .sort((a, b) => a.orden - b.orden || a.codigo.localeCompare(b.codigo));
      }
      return merged.sort((a, b) => a.orden - b.orden || a.codigo.localeCompare(b.codigo));
    });
    setDraft(blankDraft());
    setEditCodigo(null);
  };

  const editRow = (row: EstadoOrdenCompraConfig): void => {
    setDraft({ ...row });
    setEditCodigo(row.codigo);
  };

  const removeRow = (codigo: string): void => {
    setRows((prev) => prev.filter((r) => r.codigo !== codigo));
    if (editCodigo === codigo) {
      setDraft(blankDraft());
      setEditCodigo(null);
    }
  };

  const toggleField = (codigo: string, field: keyof EstadoOrdenCompraConfig): void => {
    setRows((prev) => prev.map((r) => {
      if (r.codigo !== codigo) {
        if (field === 'esEstadoInicial') return { ...r, esEstadoInicial: false };
        return r;
      }
      const nextVal = !(r[field] as boolean);
      if (field === 'esEstadoInicial' && nextVal) {
        return { ...r, esEstadoInicial: true };
      }
      return { ...r, [field]: nextVal };
    }));
  };

  const save = async (): Promise<void> => {
    if (!rows.length) {
      toast.error('Agregue al menos un estado.');
      return;
    }
    if (rows.filter((r) => r.activo).length === 0) {
      toast.error('Debe haber al menos un estado activo.');
      return;
    }
    if (rows.filter((r) => r.activo && r.esEstadoInicial).length !== 1) {
      toast.error('Debe haber exactamente un estado inicial activo.');
      return;
    }
    try {
      setSaving(true);
      const saved = await inventarioService.guardarEstadosOrdenCompra(rows);
      onSaved?.(saved);
      toast.success('Estados de orden de compra guardados.');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(1100px,calc(100vw-2rem))] max-w-none border-border bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>Parametrización estados — Orden de compra</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Define el flujo: estado inicial, confirmación (genera comprobante contable) y cuándo permitir comprobante de entrada.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
            <p className="text-sm font-medium">{editCodigo ? `Editar ${editCodigo}` : 'Nuevo estado'}</p>
            <div className="space-y-2">
              <Label>Código *</Label>
              <Input
                value={draft.codigo}
                onChange={(e) => setDraft((p) => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                placeholder="VERIFICACION"
                disabled={Boolean(editCodigo)}
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={draft.nombre}
                onChange={(e) => setDraft((p) => ({ ...p, nombre: e.target.value }))}
                placeholder="Verificación"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={draft.descripcion || ''}
                onChange={(e) => setDraft((p) => ({ ...p, descripcion: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Orden</Label>
              <Input
                type="number"
                min="0"
                value={String(draft.orden ?? 0)}
                onChange={(e) => setDraft((p) => ({ ...p, orden: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Estado destino al confirmar</Label>
              <Select
                value={draft.estadoDestinoConfirmacion || '__none__'}
                onValueChange={(v) => setDraft((p) => ({
                  ...p,
                  estadoDestinoConfirmacion: v === '__none__' ? '' : v,
                }))}
              >
                <SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {codigosActivos.filter((c) => c !== draft.codigo).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 text-sm">
              {([
                ['esEstadoInicial', 'Estado inicial (al crear OC)'],
                ['permiteEditarOrden', 'Permite editar / eliminar OC'],
                ['permiteConfirmarOrden', 'Muestra botón Confirmar orden'],
                ['generaComprobanteContable', 'Genera comprobante al llegar a este estado'],
                ['permiteComprobanteEntrada', 'Permite comprobante de entrada'],
                ['activo', 'Activo'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <Checkbox
                    checked={Boolean(draft[key])}
                    onCheckedChange={() => setDraft((p) => ({ ...p, [key]: !p[key] }))}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <Button type="button" onClick={addOrUpdate} disabled={saving}>
              <Plus className="mr-2 h-4 w-4" />
              {editCodigo ? 'Actualizar' : 'Agregar'}
            </Button>
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-center">Ord.</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Destino confirm.</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.codigo}>
                    <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                    <TableCell className="text-sm">{r.nombre}</TableCell>
                    <TableCell className="text-center tabular-nums">{r.orden}</TableCell>
                    <TableCell>
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {r.esEstadoInicial ? <Badge variant="secondary">Inicial</Badge> : null}
                        {r.permiteEditarOrden ? <Badge variant="outline">Edita</Badge> : null}
                        {r.permiteConfirmarOrden ? <Badge variant="outline">Confirma</Badge> : null}
                        {r.generaComprobanteContable ? <Badge variant="outline">Contable</Badge> : null}
                        {r.permiteComprobanteEntrada ? <Badge variant="outline">Entrada</Badge> : null}
                        {!r.activo ? <Badge variant="destructive">Inactivo</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.estadoDestinoConfirmacion || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => editRow(r)}>Editar</Button>
                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeRow(r.codigo)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!rows.length ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Sin estados parametrizados.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            Guardar parametrización
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
