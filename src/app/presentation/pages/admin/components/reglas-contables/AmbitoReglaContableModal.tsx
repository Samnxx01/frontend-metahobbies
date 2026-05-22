import { useCallback, useEffect, useState } from 'react';
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import reglasContablesService, { type AmbitoReglaContable } from '@/app/services/reglasContablesService';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AmbitoReglaContableFormSubmodal from './AmbitoReglaContableFormSubmodal';
import { reglasContablesUi } from './reglasContablesUi';

export type AmbitoReglaContableModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  onAmbitosActualizados?: () => void;
  title?: string;
  description?: string;
};

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : fallback;

/**
 * Modal para parametrizar tipos de ámbito (compra, venta, ambos, etc.)
 * vía `/api/inventario/config/reglas-contables/ambitos`.
 */
export default function AmbitoReglaContableModal({
  open,
  onOpenChange,
  saving = false,
  onAmbitosActualizados,
  title = 'Tipos de ámbito comercial',
  description = 'Parametrice los ámbitos disponibles al asignar reglas contables (compra, venta, compra y venta u otros que defina su operación).',
}: AmbitoReglaContableModalProps): React.ReactElement {
  const [ambitos, setAmbitos] = useState<AmbitoReglaContable[]>([]);
  const [loading, setLoading] = useState(false);
  const [submodalOpen, setSubmodalOpen] = useState(false);
  const [registroEditar, setRegistroEditar] = useState<AmbitoReglaContable | null>(null);
  const [eliminandoCodigo, setEliminandoCodigo] = useState<string | null>(null);

  const cargar = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await reglasContablesService.listarAmbitosAdmin();
      setAmbitos(data);
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudieron cargar los ámbitos.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void cargar();
  }, [open, cargar]);

  const handleGuardada = (): void => {
    void cargar();
    onAmbitosActualizados?.();
  };

  const eliminarAmbito = async (ambito: AmbitoReglaContable): Promise<void> => {
    const confirmar = window.confirm(
      ambito.esSistema
        ? `El ámbito "${ambito.codigo}" es del sistema. ¿Desactivarlo?`
        : `¿Eliminar el ámbito "${ambito.codigo}"?`
    );
    if (!confirmar) return;

    if (ambito.esSistema) {
      try {
        setEliminandoCodigo(ambito.codigo);
        await reglasContablesService.actualizarAmbito(ambito.codigo, { estado: false });
        toast.success(`Ámbito "${ambito.codigo}" desactivado.`);
        handleGuardada();
      } catch (error) {
        toast.error(errorMessage(error, 'No se pudo desactivar el ámbito.'));
      } finally {
        setEliminandoCodigo(null);
      }
      return;
    }

    try {
      setEliminandoCodigo(ambito.codigo);
      const { msg } = await reglasContablesService.eliminarAmbito(ambito.codigo);
      toast.success(msg || `Ámbito "${ambito.codigo}" eliminado.`);
      handleGuardada();
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo eliminar el ámbito.'));
    } finally {
      setEliminandoCodigo(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={reglasContablesUi.dialogContent}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              {title}
            </DialogTitle>
            <DialogDescription className={reglasContablesUi.description}>{description}</DialogDescription>
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
                {ambitos.map((ambito) => (
                  <TableRow key={ambito.codigo} className={reglasContablesUi.tableRowHover}>
                    <TableCell className="font-medium">
                      <span className="flex flex-wrap items-center gap-1">
                        {ambito.codigo}
                        {ambito.esSistema ? (
                          <Badge variant="outline" className={reglasContablesUi.badgeSistema}>
                            Sistema
                          </Badge>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell>{ambito.nombre}</TableCell>
                    <TableCell>{ambito.orden}</TableCell>
                    <TableCell>{ambito.estado ? 'Activo' : 'Inactivo'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary"
                          title="Editar"
                          disabled={saving || eliminandoCodigo === ambito.codigo}
                          onClick={() => {
                            setRegistroEditar(ambito);
                            setSubmodalOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          title={ambito.esSistema ? 'Desactivar' : 'Eliminar'}
                          disabled={saving || eliminandoCodigo === ambito.codigo}
                          onClick={() => void eliminarAmbito(ambito)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && ambitos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      No hay ámbitos parametrizados.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button
              type="button"
              className={reglasContablesUi.btnPrimary}
              onClick={() => {
                setRegistroEditar(null);
                setSubmodalOpen(true);
              }}
              disabled={saving}
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar ámbito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AmbitoReglaContableFormSubmodal
        open={submodalOpen}
        onOpenChange={(next) => {
          setSubmodalOpen(next);
          if (!next) setRegistroEditar(null);
        }}
        saving={saving}
        registro={registroEditar}
        onGuardada={handleGuardada}
      />
    </>
  );
}
