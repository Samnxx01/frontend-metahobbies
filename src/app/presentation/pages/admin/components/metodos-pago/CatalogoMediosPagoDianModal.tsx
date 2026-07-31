import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import reglasContablesService, { type CatalogoCodigo } from '@/app/services/reglasContablesService';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const DOMINIO = 'DIAN_MEDIOS_PAGO';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActualizado?: () => void;
};

const inicial = { codigo: '', nombre: '', descripcion: '' };
const mensajeError = (error: unknown) =>
  error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo actualizar el catálogo DIAN.';

export default function CatalogoMediosPagoDianModal({
  open,
  onOpenChange,
  onActualizado,
}: Props): React.ReactElement {
  const [items, setItems] = useState<CatalogoCodigo[]>([]);
  const [draft, setDraft] = useState(inicial);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setItems(await reglasContablesService.listarCatalogoCodigosAdmin(DOMINIO));
    } catch (error) {
      toast.error(mensajeError(error));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setDraft(inicial);
    void cargar();
  }, [open, cargar]);

  const crear = async () => {
    if (!draft.codigo.trim() || !draft.nombre.trim()) {
      toast.error('Código y nombre son obligatorios.');
      return;
    }
    try {
      setSaving(true);
      await reglasContablesService.crearCatalogoCodigo({
        dominio: DOMINIO,
        codigo: draft.codigo.trim(),
        nombre: draft.nombre.trim(),
        descripcion: draft.descripcion.trim(),
        metadata: { lista: '15A' },
      });
      toast.success('Medio de pago DIAN registrado.');
      setDraft(inicial);
      await cargar();
      onActualizado?.();
    } catch (error) {
      toast.error(mensajeError(error));
    } finally {
      setSaving(false);
    }
  };

  const cambiarEstado = async (item: CatalogoCodigo) => {
    try {
      await reglasContablesService.actualizarCatalogoCodigo(DOMINIO, item.codigo, {
        estado: item.estado === false,
      });
      await cargar();
      onActualizado?.();
    } catch (error) {
      toast.error(mensajeError(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Catálogo DIAN — medios de pago</DialogTitle>
          <DialogDescription>
            Parametrice los códigos de la Lista 15A enviados como PaymentMeansCode en la factura electrónica.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="max-h-56 overflow-y-auto overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Activo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => (
                  <TableRow key={item.codigo}>
                    <TableCell className="font-medium">{item.codigo}</TableCell>
                    <TableCell>{item.nombre}</TableCell>
                    <TableCell>{item.descripcion || '—'}</TableCell>
                    <TableCell>
                      <Switch
                        checked={item.estado !== false}
                        onCheckedChange={() => void cambiarEstado(item)}
                        disabled={saving}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                      No hay medios de pago DIAN parametrizados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 rounded-md border p-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Código Lista 15A</Label>
              <Input
                value={draft.codigo}
                onChange={event => setDraft(previous => ({ ...previous, codigo: event.target.value }))}
                placeholder="Ej: 10"
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={draft.nombre}
                onChange={event => setDraft(previous => ({ ...previous, nombre: event.target.value }))}
                placeholder="Ej: Efectivo"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Descripción</Label>
              <Input
                value={draft.descripcion}
                onChange={event => setDraft(previous => ({ ...previous, descripcion: event.target.value }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          <Button onClick={() => void crear()} disabled={saving || loading}>
            <Plus className="mr-2 h-4 w-4" /> Registrar código
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
