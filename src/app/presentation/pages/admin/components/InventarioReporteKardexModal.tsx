import React from 'react';
import { Download, FileSpreadsheet, Loader2, Printer } from 'lucide-react';
import { toast } from 'react-toastify';
import inventarioService, { type ComprobanteEntradaDetalle } from '@/app/services/inventarioService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GovernedButton, INVENTORY_REPORT_ACTION_IDS } from '@/app/presentation/actions';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import InventarioReporteKardexEntrada from './InventarioReporteKardexEntrada';
import {
  descargarReporteKardexCsv,
  imprimirReporteKardex,
} from '@/app/presentation/pages/admin/utils/inventarioReporteKardexExport';
import { resolveCorporateNameFromSession } from '@/lib/print/printDocument';

export type InventarioReporteKardexModalProps = {
  open: boolean;
  recepcionId: string | null;
  nombreCorporativo?: string;
  onOpenChange: (open: boolean) => void;
};

const formatDateTimeCo = (value?: string): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
};

export default function InventarioReporteKardexModal({
  open,
  recepcionId,
  nombreCorporativo,
  onOpenChange,
}: InventarioReporteKardexModalProps): React.ReactElement {
  const [loading, setLoading] = React.useState(false);
  const [exportandoSku, setExportandoSku] = React.useState(false);
  const [detalle, setDetalle] = React.useState<ComprobanteEntradaDetalle | null>(null);

  React.useEffect(() => {
    if (!open || !recepcionId) {
      setDetalle(null);
      return;
    }
    let cancelled = false;
    const cargar = async (): Promise<void> => {
      try {
        setLoading(true);
        const data = await inventarioService.obtenerDetalleComprobanteEntrada(recepcionId);
        if (!cancelled) setDetalle(data);
      } catch (error) {
        console.error('Error cargando reporte kardex:', error);
        toast.error('No se pudo cargar el reporte de kardex.');
        if (!cancelled) onOpenChange(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void cargar();
    return () => {
      cancelled = true;
    };
  }, [open, recepcionId, onOpenChange]);

  const lineas = detalle?.reporteKardex ?? [];
  const tieneReporte = lineas.length > 0;
  const corporativo = nombreCorporativo || resolveCorporateNameFromSession() || 'Mabs by Gabs';

  const exportarCsv = (): void => {
    if (!detalle || !tieneReporte) {
      toast.info('No hay líneas de kardex para exportar.');
      return;
    }
    descargarReporteKardexCsv(detalle);
    toast.success('Reporte exportado en CSV (compatible con Excel).');
  };

  const exportarExcelSku = async (): Promise<void> => {
    const sku = lineas[0]?.sku?.trim();
    if (!sku) {
      toast.info('Seleccione un comprobante con kardex registrado.');
      return;
    }
    const bodega = lineas[0]?.bodega?.trim();
    try {
      setExportandoSku(true);
      await inventarioService.exportarKardexExcel({ sku, bodega });
      toast.success(`Kardex histórico del SKU ${sku} exportado.`);
    } catch (error) {
      console.error('Error exportando kardex SKU:', error);
      toast.error(error instanceof Error ? error.message : 'No se pudo exportar el kardex del SKU.');
    } finally {
      setExportandoSku(false);
    }
  };

  const imprimir = (): void => {
    if (!detalle || !tieneReporte) {
      toast.info('No hay líneas de kardex para imprimir.');
      return;
    }
    const ok = imprimirReporteKardex(detalle, { nombreCorporativo: corporativo });
    if (!ok) toast.error('El navegador bloqueó la ventana de impresión.');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col overflow-hidden border-border bg-background p-3 text-foreground sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:p-5 lg:w-[min(1180px,calc(100vw-3rem))]">
        <DialogHeader className="shrink-0 pr-7 text-left">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Reporte kardex
            {tieneReporte ? <Badge variant="outline">inventarioMovimiento · inventarioSaldo</Badge> : null}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando reporte...
          </div>
        ) : !detalle ? (
          <div className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            No hay información del reporte.
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-0.5 sm:pr-1">
            <div className="grid gap-3 rounded-md border border-border bg-muted/40 p-3 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Recepción</p>
                <p className="font-mono text-sm font-semibold">{detalle.numeroRecepcion}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Orden compra</p>
                <p className="font-mono text-sm font-semibold">{detalle.orden?.numeroOrden || '—'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Comprobante físico</p>
                <p className="text-sm">
                  {detalle.documentoSoporte.tipo} · {detalle.documentoSoporte.numero}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Comprobante contable</p>
                <p className="font-mono text-sm font-semibold">
                  {detalle.comprobanteContable?.numero
                    ? `${detalle.comprobanteContable.tipo || 'COMPROBANTE_ENTRADA'} · ${detalle.comprobanteContable.numero}`
                    : '—'}
                </p>
                {detalle.comprobanteContable?.confirmadoEn ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Confirmado: {formatDateTimeCo(detalle.comprobanteContable.confirmadoEn)}
                  </p>
                ) : null}
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Proveedor</p>
                <p className="text-sm font-medium">{detalle.orden?.proveedor?.nombre || 'Proveedor no identificado'}</p>
                {detalle.orden?.proveedor?.nit ? <p className="text-xs text-muted-foreground">NIT {detalle.orden.proveedor.nit}</p> : null}
              </div>
            </div>

            {tieneReporte ? (
              <InventarioReporteKardexEntrada lineas={lineas} />
            ) : (
              <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                Este comprobante aún no tiene kardex confirmado en inventarioMovimiento / inventarioSaldo.
                Registre la entrada desde el formulario de movimientos.
              </div>
            )}
          </div>
        )}

        <DialogFooter className="grid shrink-0 grid-cols-1 gap-2 border-t border-border pt-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
          <Button type="button" variant="outline" size="sm" className="w-full lg:w-auto" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <GovernedButton
            actionId={INVENTORY_REPORT_ACTION_IDS.EXPORT_KARDEX_CSV}
            type="button"
            variant="outline"
            size="sm"
            className="w-full lg:w-auto"
            disabled={!tieneReporte || loading}
            onClick={exportarCsv}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </GovernedButton>
          <GovernedButton
            actionId={INVENTORY_REPORT_ACTION_IDS.EXPORT_KARDEX_XLSX}
            type="button"
            variant="outline"
            size="sm"
            className="w-full lg:w-auto"
            disabled={!tieneReporte || loading || exportandoSku}
            onClick={() => void exportarExcelSku()}
          >
            {exportandoSku ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
            Exportar kardex SKU (.xlsx)
          </GovernedButton>
          <GovernedButton
            actionId={INVENTORY_REPORT_ACTION_IDS.PRINT_KARDEX}
            type="button"
            variant="outline"
            size="sm"
            className="w-full lg:w-auto"
            disabled={!tieneReporte || loading}
            onClick={imprimir}
          >
            <Printer className="mr-2 h-4 w-4" />
            Imprimir / PDF
          </GovernedButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
