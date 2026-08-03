import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toastAjusteError, toastAjusteExito } from './inventario-ajuste/inventarioAjusteAlerts';
import inventarioService, { type InventarioCausalAjuste } from '@/app/services/inventarioService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  const [editorInstance, setEditorInstance] = useState(0);
  const [registroEliminar, setRegistroEliminar] = useState<InventarioCausalAjuste | null>(null);
  const [eliminandoCodigo, setEliminandoCodigo] = useState<string | null>(null);

  const cargar = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const [data, tiposMovimiento] = await Promise.all([
        inventarioService.listarCausalesAjusteAdmin(),
        inventarioService.listarTiposMovimientoAdmin(),
      ]);
      const tiposPorId = new Map(
        tiposMovimiento.flatMap((tipo) => {
          const ids = [tipo.iud, tipo._id].map((id) => String(id || '')).filter(Boolean);
          return ids.map((id) => [id, tipo] as const);
        }),
      );
      setCausales(data.map((causal) => {
        const referenciaId = String(
          causal.tipoMovimientoReferenciaId
          || (typeof causal.tipoMovimientoId === 'string' ? causal.tipoMovimientoId : '')
          || '',
        );
        const tipoMovimiento = causal.tipoMovimiento || tiposPorId.get(referenciaId) || null;
        return {
          ...causal,
          tipoMovimiento,
          tipoMovimientoRelacionValida: Boolean(tipoMovimiento),
        };
      }));
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
    setEditorInstance((actual) => actual + 1);
    setSubmodalOpen(true);
  };

  const abrirEditar = (causal: InventarioCausalAjuste): void => {
    setRegistroEditar({ ...causal });
    setEditorInstance((actual) => actual + 1);
    setSubmodalOpen(true);
  };

  const eliminarCausal = async (): Promise<void> => {
    const causal = registroEliminar;
    if (!causal) return;
    try {
      setEliminandoCodigo(causal.codigo);
      const { msg } = await inventarioService.eliminarCausalAjuste(causal.codigo);
      toastAjusteExito(msg || `Causal "${causal.codigo}" eliminada.`);
      setRegistroEliminar(null);
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

          <div className={`${catalogoAjusteUi.tableWrap} hidden md:block`}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={catalogoAjusteUi.tableHead}>Código</TableHead>
                  <TableHead className={catalogoAjusteUi.tableHead}>Nombre</TableHead>
                  <TableHead className={catalogoAjusteUi.tableHead}>Tipo de movimiento</TableHead>
                  <TableHead className={catalogoAjusteUi.tableHead}>Estado</TableHead>
                  <TableHead className={`${catalogoAjusteUi.tableHead} text-right`}>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {causales.map((causal) => (
                  <TableRow key={causal.codigo} className={catalogoAjusteUi.tableRowHover}>
                    <TableCell className="font-medium">{causal.codigo}</TableCell>
                    <TableCell>{causal.nombre}</TableCell>
                    <TableCell>
                      {causal.tipoMovimiento
                        ? `${causal.tipoMovimiento.codigo} · ${causal.tipoMovimiento.nombre}`
                        : causal.tipoMovimientoReferenciaId
                          ? `Referencia inválida · ${causal.tipoMovimientoReferenciaId}`
                          : 'Sin relación'}
                    </TableCell>
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
                          onClick={() => setRegistroEliminar(causal)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && causales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      No hay causales parametrizadas.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 md:hidden">
            {causales.map((causal) => {
              const tipo = causal.tipoMovimiento || null;
              return (
                <article key={causal.codigo} className="rounded-lg border border-border bg-card p-3 text-card-foreground shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold">{causal.nombre}</p>
                      <p className="break-all text-xs text-muted-foreground">{causal.codigo}</p>
                    </div>
                    <Badge variant={causal.estado ? 'outline' : 'destructive'}>
                      {causal.estado ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <div className="mt-3 rounded-md border border-border bg-muted/40 p-2 text-xs">
                    <span className="font-medium">Tipo de movimiento:</span>{' '}
                    {tipo
                      ? `${tipo.codigo} · ${tipo.nombre}`
                      : causal.tipoMovimientoReferenciaId
                        ? `Referencia inválida · ${causal.tipoMovimientoReferenciaId}`
                        : 'Sin relación'}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => abrirEditar(causal)} disabled={saving || eliminandoCodigo === causal.codigo}>
                      <Pencil className="mr-1 h-4 w-4" /> Editar
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => setRegistroEliminar(causal)} disabled={saving || eliminandoCodigo === causal.codigo}>
                      <Trash2 className="mr-1 h-4 w-4" /> Eliminar
                    </Button>
                  </div>
                </article>
              );
            })}
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
        key={`${editorInstance}-${registroEditar?.codigo || 'nuevo'}`}
        open={submodalOpen}
        onOpenChange={(next) => {
          setSubmodalOpen(next);
          if (!next) setRegistroEditar(null);
        }}
        saving={saving}
        registro={registroEditar}
        onGuardada={handleGuardada}
      />

      <AlertDialog
        open={Boolean(registroEliminar)}
        onOpenChange={(next) => {
          if (!next && !eliminandoCodigo) setRegistroEliminar(null);
        }}
      >
        <AlertDialogContent className="max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-md overflow-y-auto border-border bg-card p-4 text-card-foreground sm:w-full sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar causal de ajuste</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">Esta operación elimina permanentemente la causal seleccionada.</span>
              {registroEliminar ? (
                <span className="block rounded-md border border-destructive/30 bg-destructive/10 p-3 text-foreground">
                  <strong>{registroEliminar.codigo}</strong> · {registroEliminar.nombre}
                </span>
              ) : null}
              <span className="block">Si tiene ajustes relacionados, el servidor impedirá eliminarla. En ese caso puedes desactivarla desde Editar.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel className="w-full sm:w-auto" disabled={Boolean(eliminandoCodigo)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
              disabled={Boolean(eliminandoCodigo)}
              onClick={(event) => {
                event.preventDefault();
                void eliminarCausal();
              }}
            >
              {eliminandoCodigo ? 'Eliminando…' : 'Eliminar definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

