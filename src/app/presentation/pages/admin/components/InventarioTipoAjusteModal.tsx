import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toastAjusteError, toastAjusteExito } from './inventario-ajuste/inventarioAjusteAlerts';
import inventarioService, { type InventarioTipoAjuste } from '@/app/services/inventarioService';
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
import InventarioTipoAjusteFormSubmodal from './inventario-ajuste/InventarioTipoAjusteFormSubmodal';
import { catalogoAjusteUi } from './inventario-ajuste/inventarioAjusteCatalogStyles';

type InventarioTipoAjusteModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  onTiposActualizados?: () => void;
};

export default function InventarioTipoAjusteModal({
  open,
  onOpenChange,
  saving = false,
  onTiposActualizados,
}: InventarioTipoAjusteModalProps): React.ReactElement {
  const [tipos, setTipos] = useState<InventarioTipoAjuste[]>([]);
  const [loading, setLoading] = useState(false);
  const [submodalOpen, setSubmodalOpen] = useState(false);
  const [registroEditar, setRegistroEditar] = useState<InventarioTipoAjuste | null>(null);
  const [eliminandoCodigo, setEliminandoCodigo] = useState<string | null>(null);

  const cargar = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await inventarioService.listarTiposAjusteAdmin();
      setTipos(data);
    } catch (error) {
      console.error('Error cargando tipos de ajuste:', error);
      toastAjusteError(error, 'No se pudieron cargar los tipos de ajuste.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void cargar();
  }, [open, cargar]);

  const handleGuardado = (): void => {
    void cargar();
    onTiposActualizados?.();
  };

  const abrirCrear = (): void => {
    setRegistroEditar(null);
    setSubmodalOpen(true);
  };

  const abrirEditar = (tipo: InventarioTipoAjuste): void => {
    setRegistroEditar(tipo);
    setSubmodalOpen(true);
  };

  const eliminarTipo = async (tipo: InventarioTipoAjuste): Promise<void> => {
    const confirmar = window.confirm(
      `¿Eliminar el tipo de ajuste "${tipo.codigo}"? Esta acción no se puede deshacer.`
    );
    if (!confirmar) return;

    try {
      setEliminandoCodigo(tipo.codigo);
      const { msg } = await inventarioService.eliminarTipoAjuste(tipo.codigo);
      toastAjusteExito(msg || `Tipo "${tipo.codigo}" eliminado.`);
      handleGuardado();
    } catch (error) {
      console.error('Error eliminando tipo de ajuste:', error);
      toastAjusteError(error, 'No se pudo eliminar el tipo de ajuste.');
    } finally {
      setEliminandoCodigo(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={catalogoAjusteUi.dialogContent}>
          <DialogHeader>
            <DialogTitle>Tipos de ajuste parametrizados</DialogTitle>
            <DialogDescription className={catalogoAjusteUi.description}>
              Catálogo de tipos con dirección de entrada o salida en kardex. Solo comprobantes APROBADOS y confirmados al solicitar ajustes.
            </DialogDescription>
          </DialogHeader>

          <div className={catalogoAjusteUi.tableWrap}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={catalogoAjusteUi.tableHead}>Código</TableHead>
                  <TableHead className={catalogoAjusteUi.tableHead}>Nombre</TableHead>
                  <TableHead className={catalogoAjusteUi.tableHead}>Dirección</TableHead>
                  <TableHead className={catalogoAjusteUi.tableHead}>Estado</TableHead>
                  <TableHead className={`${catalogoAjusteUi.tableHead} text-right`}>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tipos.map((tipo) => (
                  <TableRow key={tipo.codigo} className={catalogoAjusteUi.tableRowHover}>
                    <TableCell className="font-medium">{tipo.codigo}</TableCell>
                    <TableCell>{tipo.nombre}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={tipo.direccion === 'POSITIVO' ? catalogoAjusteUi.badgeEntrada : catalogoAjusteUi.badgeSalida}
                      >
                        {tipo.direccion}
                      </Badge>
                    </TableCell>
                    <TableCell>{tipo.estado ? 'Activo' : 'Inactivo'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary"
                          title="Editar"
                          disabled={saving || eliminandoCodigo === tipo.codigo}
                          onClick={() => abrirEditar(tipo)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          title="Eliminar"
                          disabled={saving || eliminandoCodigo === tipo.codigo}
                          onClick={() => void eliminarTipo(tipo)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && tipos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      No hay tipos de ajuste parametrizados.
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
              className={catalogoAjusteUi.btnPrimary}
              onClick={abrirCrear}
              disabled={saving}
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar tipo de ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InventarioTipoAjusteFormSubmodal
        open={submodalOpen}
        onOpenChange={(next) => {
          setSubmodalOpen(next);
          if (!next) setRegistroEditar(null);
        }}
        saving={saving}
        registro={registroEditar}
        onGuardado={handleGuardado}
      />
    </>
  );
}
