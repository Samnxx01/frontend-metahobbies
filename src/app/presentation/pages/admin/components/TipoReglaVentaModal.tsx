import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, RotateCcw, Tag, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import reglasVentasService, {
  type TipoReglaVentaCatalogo,
  etiquetaComportamientoTipoReglaVenta,
} from '@/app/services/reglasVentasService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import TipoReglaVentaFormSubmodal from './TipoReglaVentaFormSubmodal';

export type TipoReglaVentaModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  onTiposActualizados?: () => void;
};

const errMsg = (e: unknown, f: string) => (e instanceof Error ? e.message.replace(/^\[\d+\]\s*/, '') : f);

export default function TipoReglaVentaModal({
  open,
  onOpenChange,
  saving = false,
  onTiposActualizados,
}: TipoReglaVentaModalProps): React.ReactElement {
  const [tipos, setTipos] = useState<TipoReglaVentaCatalogo[]>([]);
  const [loading, setLoading] = useState(false);
  const [submodalOpen, setSubmodalOpen] = useState(false);
  const [registroEditar, setRegistroEditar] = useState<TipoReglaVentaCatalogo | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setTipos(await reglasVentasService.listarTiposAdmin());
    } catch (e) {
      toast.error(errMsg(e, 'No se pudieron cargar los tipos.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void cargar();
  }, [open, cargar]);

  const recargar = (): void => {
    void cargar();
    onTiposActualizados?.();
  };

  const reactivarTipo = async (t: TipoReglaVentaCatalogo): Promise<void> => {
    if (!window.confirm(`¿Reactivar el tipo "${t.codigo}"?`)) return;
    try {
      setEliminando(t.codigo);
      await reglasVentasService.actualizarTipo(t.codigo, { estado: true });
      toast.success(`Tipo "${t.codigo}" reactivado.`);
      recargar();
    } catch (e) {
      toast.error(errMsg(e, 'No se pudo reactivar el tipo.'));
    } finally {
      setEliminando(null);
    }
  };

  const eliminarTipo = async (t: TipoReglaVentaCatalogo): Promise<void> => {
    if (!window.confirm(`¿Eliminar el tipo "${t.codigo}"?`)) return;

    try {
      setEliminando(t.codigo);
      const { msg } = await reglasVentasService.eliminarTipo(t.codigo);
      toast.success(msg || `Tipo "${t.codigo}" eliminado.`);
      recargar();
    } catch (e) {
      toast.error(errMsg(e, 'No se pudo eliminar el tipo.'));
    } finally {
      setEliminando(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              Tipos de regla de venta
            </DialogTitle>
            <DialogDescription>
              Defina aqui solo el concepto (codigo, nombre y comportamiento). No guarda porcentajes ni cantidades:
              esos valores se parametrizan por producto al asignar cada regla de venta. Cree cada tipo con
              &quot;Agregar tipo&quot;; no se generan automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codigo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Comportamiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tipos.map((t) => (
                <TableRow key={t.codigo}>
                  <TableCell className="font-medium">
                    {t.codigo}
                    {t.esSistema ? <Badge variant="outline" className="ml-1">Sistema</Badge> : null}
                  </TableCell>
                  <TableCell>{t.nombre}</TableCell>
                  <TableCell>{etiquetaComportamientoTipoReglaVenta(t.comportamiento)}</TableCell>
                  <TableCell>{t.estado ? 'Activo' : 'Inactivo'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        disabled={saving || eliminando === t.codigo}
                        onClick={() => { setRegistroEditar(t); setSubmodalOpen(true); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!t.estado ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Reactivar"
                          disabled={saving || eliminando === t.codigo}
                          onClick={() => void reactivarTipo(t)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          title="Eliminar"
                          disabled={saving || eliminando === t.codigo}
                          onClick={() => void eliminarTipo(t)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && !tipos.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    Sin tipos. Use &quot;Agregar tipo&quot; (ej. CANTIDAD_MAXIMA con limite de cantidad, PORCENTAJE con descuento %).
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
            <Button type="button" onClick={() => { setRegistroEditar(null); setSubmodalOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Agregar tipo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TipoReglaVentaFormSubmodal
        open={submodalOpen}
        onOpenChange={(n) => { setSubmodalOpen(n); if (!n) setRegistroEditar(null); }}
        saving={saving}
        registro={registroEditar}
        onGuardada={recargar}
      />
    </>
  );
}
