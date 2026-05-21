import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, RotateCcw, Tag, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import reglasContablesService, { type TipoReglaContableCatalogo } from '@/app/services/reglasContablesService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import TipoReglaContableFormSubmodal from './TipoReglaContableFormSubmodal';
import { reglasContablesUi } from './reglasContablesUi';

export type TipoReglaContableModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  onTiposActualizados?: () => void;
};

const errMsg = (e: unknown, f: string) => (e instanceof Error ? e.message.replace(/^\[\d+\]\s*/, '') : f);

export default function TipoReglaContableModal({
  open, onOpenChange, saving = false, onTiposActualizados,
}: TipoReglaContableModalProps): React.ReactElement {
  const [tipos, setTipos] = useState<TipoReglaContableCatalogo[]>([]);
  const [loading, setLoading] = useState(false);
  const [submodalOpen, setSubmodalOpen] = useState(false);
  const [registroEditar, setRegistroEditar] = useState<TipoReglaContableCatalogo | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setTipos(await reglasContablesService.listarTiposAdmin());
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

  const reactivarTipo = async (t: TipoReglaContableCatalogo): Promise<void> => {
    if (!window.confirm(`¿Reactivar el tipo "${t.codigo}"?`)) return;
    try {
      setEliminando(t.codigo);
      await reglasContablesService.actualizarTipo(t.codigo, { estado: true });
      toast.success(`Tipo "${t.codigo}" reactivado.`);
      recargar();
    } catch (e) {
      toast.error(errMsg(e, 'No se pudo reactivar el tipo.'));
    } finally {
      setEliminando(null);
    }
  };

  const eliminarTipo = async (t: TipoReglaContableCatalogo): Promise<void> => {
    const esSistema = Boolean(t.esSistema);
    const confirmar = window.confirm(
      esSistema
        ? `El tipo "${t.codigo}" es del sistema. ¿Desactivarlo?`
        : `¿Eliminar el tipo "${t.codigo}"?`
    );
    if (!confirmar) return;

    if (esSistema) {
      try {
        setEliminando(t.codigo);
        await reglasContablesService.actualizarTipo(t.codigo, { estado: false });
        toast.success(`Tipo "${t.codigo}" desactivado.`);
        recargar();
      } catch (e) {
        toast.error(errMsg(e, 'No se pudo desactivar el tipo.'));
      } finally {
        setEliminando(null);
      }
      return;
    }

    try {
      setEliminando(t.codigo);
      const { msg } = await reglasContablesService.eliminarTipo(t.codigo);
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
        <DialogContent className={reglasContablesUi.dialogContent}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              Tipos de regla contable
            </DialogTitle>
            <DialogDescription className={reglasContablesUi.description}>
              Parametrice IVA, retenciones, márgenes y demás tipos usados al crear reglas.
            </DialogDescription>
          </DialogHeader>
          <div className={reglasContablesUi.tableWrap}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={reglasContablesUi.tableHead}>Código</TableHead>
                  <TableHead className={reglasContablesUi.tableHead}>Nombre</TableHead>
                  <TableHead className={reglasContablesUi.tableHead}>Orden</TableHead>
                  <TableHead className={reglasContablesUi.tableHead}>Estado</TableHead>
                  <TableHead className={`${reglasContablesUi.tableHead} text-right`}>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tipos.map((t) => (
                  <TableRow key={t.codigo}>
                    <TableCell className="font-medium">
                      {t.codigo}
                      {t.esSistema ? <Badge variant="outline" className={`ml-1 ${reglasContablesUi.badgeSistema}`}>Sistema</Badge> : null}
                    </TableCell>
                    <TableCell>{t.nombre}</TableCell>
                    <TableCell>{t.orden}</TableCell>
                    <TableCell>{t.estado ? 'Activo' : 'Inactivo'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary"
                          title="Editar"
                          disabled={saving || eliminando === t.codigo}
                          onClick={() => {
                            setRegistroEditar(t);
                            setSubmodalOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {t.esSistema && !t.estado ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary"
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
                            className="h-8 w-8 text-destructive"
                            title={t.esSistema ? 'Desactivar' : 'Eliminar'}
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
                  <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">Sin tipos.</TableCell></TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
            <Button type="button" className={reglasContablesUi.btnPrimary} onClick={() => { setRegistroEditar(null); setSubmodalOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Agregar tipo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TipoReglaContableFormSubmodal
        open={submodalOpen}
        onOpenChange={(n) => { setSubmodalOpen(n); if (!n) setRegistroEditar(null); }}
        saving={saving}
        registro={registroEditar}
        onGuardada={() => { void cargar(); onTiposActualizados?.(); }}
      />
    </>
  );
}
