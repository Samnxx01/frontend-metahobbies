import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toastAjusteError, toastAjusteExito } from './inventario-ajuste/inventarioAjusteAlerts';
import inventarioService, { type InventarioCausalAjuste } from '@/app/services/inventarioService';
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
import InventarioCausalAjusteFormSubmodal from './inventario-ajuste/InventarioCausalAjusteFormSubmodal';
import { catalogoAjusteUi } from './inventario-ajuste/inventarioAjusteCatalogStyles';

type InventarioCausalAjusteModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  onCausalesActualizadas?: () => void;
  title?: string;
  description?: string;
};

export default function InventarioCausalAjusteModal({
  open,
  onOpenChange,
  saving = false,
  onCausalesActualizadas,
  title = 'Causales de ajuste parametrizadas',
  description = 'Catálogo de motivos para solicitar ajustes vinculados a comprobantes de entrada aprobados.',
}: InventarioCausalAjusteModalProps): React.ReactElement {
  const [causales, setCausales] = useState<InventarioCausalAjuste[]>([]);
  const [loading, setLoading] = useState(false);
  const [submodalOpen, setSubmodalOpen] = useState(false);
  const [registroEditar, setRegistroEditar] = useState<InventarioCausalAjuste | null>(null);
  const [eliminandoCodigo, setEliminandoCodigo] = useState<string | null>(null);

  const cargar = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await inventarioService.listarCausalesAjusteAdmin();
      setCausales(data);
    } catch (error) {
      console.error('Error cargando causales de ajuste:', error);
      toastAjusteError(error, 'No se pudieron cargar las causales.');
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
    onCausalesActualizadas?.();
  };

  const abrirCrear = (): void => {
    setRegistroEditar(null);
    setSubmodalOpen(true);
  };

  const abrirEditar = (causal: InventarioCausalAjuste): void => {
    setRegistroEditar(causal);
    setSubmodalOpen(true);
  };

  const eliminarCausal = async (causal: InventarioCausalAjuste): Promise<void> => {
    const confirmar = window.confirm(
      `¿Eliminar la causal "${causal.codigo}"? Esta acción no se puede deshacer.`
    );
    if (!confirmar) return;

    try {
      setEliminandoCodigo(causal.codigo);
      const { msg } = await inventarioService.eliminarCausalAjuste(causal.codigo);
      toastAjusteExito(msg || `Causal "${causal.codigo}" eliminada.`);
      handleGuardada();
    } catch (error) {
      console.error('Error eliminando causal:', error);
      toastAjusteError(error, 'No se pudo eliminar la causal.');
    } finally {
      setEliminandoCodigo(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={catalogoAjusteUi.dialogContent}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className={catalogoAjusteUi.description}>
              {description}
            </DialogDescription>
          </DialogHeader>

          <div className={catalogoAjusteUi.tableWrap}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={catalogoAjusteUi.tableHead}>Código</TableHead>
                  <TableHead className={catalogoAjusteUi.tableHead}>Nombre</TableHead>
                  <TableHead className={catalogoAjusteUi.tableHead}>Estado</TableHead>
                  <TableHead className={`${catalogoAjusteUi.tableHead} text-right`}>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {causales.map((causal) => (
                  <TableRow key={causal.codigo} className={catalogoAjusteUi.tableRowHover}>
                    <TableCell className="font-medium">{causal.codigo}</TableCell>
                    <TableCell>{causal.nombre}</TableCell>
                    <TableCell>{causal.estado ? 'Activo' : 'Inactivo'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary"
                          title="Editar"
                          disabled={saving || eliminandoCodigo === causal.codigo}
                          onClick={() => abrirEditar(causal)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          title="Eliminar"
                          disabled={saving || eliminandoCodigo === causal.codigo}
                          onClick={() => void eliminarCausal(causal)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && causales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                      No hay causales parametrizadas.
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
              Agregar causal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InventarioCausalAjusteFormSubmodal
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

