import React from 'react';
import { Loader2, Plus, Save } from 'lucide-react';
import { toast } from 'react-toastify';
import inventarioService, {
  type InventarioLibroFiscalCatalogoHijo,
  type InventarioLibroFiscalConfig,
} from '@/app/services/inventarioService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Props = {
  open: boolean;
  libro: InventarioLibroFiscalConfig | null;
  onOpenChange: (open: boolean) => void;
};

const blankRow = (): InventarioLibroFiscalCatalogoHijo => ({
  codigo: '',
  nombre: '',
  descripcion: '',
  activo: true,
});

export default function InventarioLibroFiscalPeriodicidadesModal({
  open,
  libro,
  onOpenChange,
}: Props): React.ReactElement {
  const [rows, setRows] = React.useState<InventarioLibroFiscalCatalogoHijo[]>([]);
  const [draft, setDraft] = React.useState<InventarioLibroFiscalCatalogoHijo>(blankRow());
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open || !libro?.iud) return;
    let mounted = true;
    setLoading(true);
    setDraft(blankRow());
    inventarioService
      .listarPeriodicidadesLibroFiscal(libro.iud)
      .then((data) => {
        if (mounted) setRows(data);
      })
      .catch((err) => {
        if (mounted) {
          setRows([]);
          toast.error(err instanceof Error ? err.message : 'No se pudieron cargar las periodicidades.');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [open, libro?.iud]);

  const agregar = (): void => {
    const next = {
      ...draft,
      codigo: draft.codigo.trim().toUpperCase(),
      nombre: draft.nombre.trim(),
      descripcion: String(draft.descripcion || '').trim(),
    };
    if (!next.codigo || !next.nombre) {
      toast.error('Codigo y nombre son obligatorios.');
      return;
    }
    setRows((prev) => {
      const exists = prev.some((row) => row.codigo === next.codigo);
      return exists
        ? prev.map((row) => (row.codigo === next.codigo ? { ...row, ...next } : row))
        : [...prev, next].sort((a, b) => a.codigo.localeCompare(b.codigo));
    });
    setDraft(blankRow());
  };

  const guardar = async (): Promise<void> => {
    if (!libro?.iud) return;
    setSaving(true);
    try {
      const saved = await inventarioService.guardarPeriodicidadesLibroFiscal(libro.iud, rows);
      setRows(saved);
      toast.success('Periodicidades guardadas.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron guardar las periodicidades.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-h-[90dvh] max-w-3xl overflow-y-auto border-border bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>Periodicidades de {libro?.codigo || 'libro fiscal'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-[1fr_1.4fr_auto]">
          <div className="space-y-2">
            <Label>Codigo</Label>
            <Input value={draft.codigo} onChange={(event) => setDraft((prev) => ({ ...prev, codigo: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={draft.nombre} onChange={(event) => setDraft((prev) => ({ ...prev, nombre: event.target.value }))} />
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={agregar}>
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </div>
        </div>

        <div className="max-h-72 overflow-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codigo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                    Cargando periodicidades...
                  </TableCell>
                </TableRow>
              ) : rows.length ? rows.map((row) => (
                <TableRow key={row.codigo}>
                  <TableCell>{row.codigo}</TableCell>
                  <TableCell>{row.nombre}</TableCell>
                  <TableCell>
                    <Badge variant={row.activo ? 'default' : 'secondary'}>{row.activo ? 'ACTIVO' : 'INACTIVO'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRows((prev) => prev.map((item) => item.codigo === row.codigo ? { ...item, activo: !item.activo } : item))}
                    >
                      {row.activo ? 'Desactivar' : 'Activar'}
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                    No hay periodicidades parametrizadas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button type="button" onClick={() => void guardar()} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar periodicidades
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
