import { useCallback, useEffect, useState } from 'react';
import { Percent, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import reglasContablesService, { type TarifaReglaContable } from '@/app/services/reglasContablesService';
import { useTiposReglaContable } from '@/app/hooks/useTiposReglaContable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import TarifaReglaContableFormSubmodal from './TarifaReglaContableFormSubmodal';
import { reglasContablesUi } from './reglasContablesUi';

export type TarifaReglaContableModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  onTarifasActualizadas?: () => void;
  tiposRefreshKey?: number;
};

const errMsg = (e: unknown, f: string) => (e instanceof Error ? e.message.replace(/^\[\d+\]\s*/, '') : f);

export default function TarifaReglaContableModal({
  open, onOpenChange, saving = false, onTarifasActualizadas, tiposRefreshKey = 0,
}: TarifaReglaContableModalProps): React.ReactElement {
  const [tarifas, setTarifas] = useState<TarifaReglaContable[]>([]);
  const [loading, setLoading] = useState(false);
  const [submodalOpen, setSubmodalOpen] = useState(false);
  const [registroEditar, setRegistroEditar] = useState<TarifaReglaContable | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const { labelPorCodigo: labelTipo } = useTiposReglaContable({ refreshKey: tiposRefreshKey });

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setTarifas(await reglasContablesService.listarTarifasAdmin());
    } catch (e) {
      toast.error(errMsg(e, 'No se pudieron cargar las tarifas.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void cargar();
  }, [open, cargar]);

  const recargar = (): void => {
    void cargar();
    onTarifasActualizadas?.();
  };

  const reactivarTarifa = async (t: TarifaReglaContable): Promise<void> => {
    if (!window.confirm(`¿Reactivar la tarifa "${t.codigo}"?`)) return;
    try {
      setEliminando(t.codigo);
      await reglasContablesService.actualizarTarifa(t.codigo, { estado: true });
      toast.success(`Tarifa "${t.codigo}" reactivada.`);
      recargar();
    } catch (e) {
      toast.error(errMsg(e, 'No se pudo reactivar la tarifa.'));
    } finally {
      setEliminando(null);
    }
  };

  const eliminarTarifa = async (t: TarifaReglaContable): Promise<void> => {
    const esSistema = Boolean(t.esSistema);
    const confirmar = window.confirm(
      esSistema
        ? `La tarifa "${t.codigo}" es del sistema. ¿Desactivarla?`
        : `¿Eliminar la tarifa "${t.codigo}"?`
    );
    if (!confirmar) return;

    if (esSistema) {
      try {
        setEliminando(t.codigo);
        await reglasContablesService.actualizarTarifa(t.codigo, { estado: false });
        toast.success(`Tarifa "${t.codigo}" desactivada.`);
        recargar();
      } catch (e) {
        toast.error(errMsg(e, 'No se pudo desactivar la tarifa.'));
      } finally {
        setEliminando(null);
      }
      return;
    }

    try {
      setEliminando(t.codigo);
      const { msg } = await reglasContablesService.eliminarTarifa(t.codigo);
      toast.success(msg || `Tarifa "${t.codigo}" eliminada.`);
      recargar();
    } catch (e) {
      const mensaje = errMsg(e, 'No se pudo eliminar la tarifa.');
      if (/sistema|desactívela/i.test(mensaje)) {
        try {
          await reglasContablesService.actualizarTarifa(t.codigo, { estado: false });
          toast.success(`Tarifa "${t.codigo}" desactivada (registro del sistema).`);
          recargar();
          return;
        } catch {
          /* usar mensaje original */
        }
      }
      toast.error(mensaje);
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
              <Percent className="h-5 w-5 text-primary" />
              Tarifas (%)
            </DialogTitle>
            <DialogDescription className={reglasContablesUi.description}>
              Porcentajes parametrizados para asignar rápidamente a las reglas contables.
            </DialogDescription>
          </DialogHeader>
          <div className={reglasContablesUi.tableWrap}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={reglasContablesUi.tableHead}>Código</TableHead>
                  <TableHead className={reglasContablesUi.tableHead}>Nombre</TableHead>
                  <TableHead className={`${reglasContablesUi.tableHead} text-right`}>Valor %</TableHead>
                  <TableHead className={reglasContablesUi.tableHead}>Tipo</TableHead>
                  <TableHead className={reglasContablesUi.tableHead}>Estado</TableHead>
                  <TableHead className={`${reglasContablesUi.tableHead} text-right`}>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tarifas.map((t) => (
                  <TableRow key={t.codigo}>
                    <TableCell className="font-medium">
                      {t.codigo}
                      {t.esSistema ? <Badge variant="outline" className={`ml-1 ${reglasContablesUi.badgeSistema}`}>Sistema</Badge> : null}
                    </TableCell>
                    <TableCell>{t.nombre}</TableCell>
                    <TableCell className="text-right">{Number(t.valor).toFixed(2)}</TableCell>
                    <TableCell>{t.tipoReglaCodigo ? labelTipo(t.tipoReglaCodigo) : '—'}</TableCell>
                    <TableCell>{t.estado ? 'Activa' : 'Inactiva'}</TableCell>
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
                            onClick={() => void reactivarTarifa(t)}
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
                            onClick={() => void eliminarTarifa(t)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && !tarifas.length ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                      No hay tarifas parametrizadas.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
            <Button type="button" className={reglasContablesUi.btnPrimary} onClick={() => { setRegistroEditar(null); setSubmodalOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Agregar tarifa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TarifaReglaContableFormSubmodal
        open={submodalOpen}
        onOpenChange={(n) => { setSubmodalOpen(n); if (!n) setRegistroEditar(null); }}
        saving={saving}
        registro={registroEditar}
        tiposRefreshKey={tiposRefreshKey}
        onGuardada={() => { void cargar(); onTarifasActualizadas?.(); }}
      />
    </>
  );
}
