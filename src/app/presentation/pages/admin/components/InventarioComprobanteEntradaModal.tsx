import React, { useMemo, useState } from 'react';
import { CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import inventarioService from '@/app/services/inventarioService';
import type { InventarioOrdenCompra, RecepcionOrdenCompraResponse } from '@/app/services/inventarioService';
import { mensajeErrorComprasInventario } from '../inventario/inventarioComprasMensajes';
import {
  estadoComprobanteEntradaBadgeClass,
  labelEstadoComprobanteEntrada,
} from '@/app/presentation/pages/admin/utils/estadoComprobanteEntradaUi';
import { getRecepcionCompraId, textoUsuarioAuditoria } from '@/app/presentation/pages/admin/utils/ordenCompraIdUtils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  escapePrintHtml,
  openPrintDocument,
  resolveCorporateNameFromSession,
  type PrintDocumentFooterConfig,
} from '@/lib/print/printDocument';
import InventarioReporteKardexEntrada from './InventarioReporteKardexEntrada';
import {
  subtotalLineaComprobanteEntrada,
  subtotalLineaRecepcion,
} from '@/app/presentation/pages/admin/utils/ordenCompraLineaCalculo';

const moneyCo = (n: number): string =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const formatDateTimeCo = (value?: string): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
};

export type DocumentoSoporte = { tipo: string; numero: string };

export type ComprobanteEntradaPrintFooterConfig = PrintDocumentFooterConfig;

const resolveStoredCorporateName = resolveCorporateNameFromSession;

export type InventarioComprobanteEntradaModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: RecepcionOrdenCompraResponse | null;
  documentoSoporte?: DocumentoSoporte | null;
  nombreCorporativo?: string;
  /** true = compras con recepción automática: al confirmar sí registra kardex. false = solo aprueba comprobante (subproceso manual). */
  recepcionAutomatica?: boolean;
  /** Pie de página del PDF/imprimible. Si no se envía, se arma uno por defecto al imprimir. */
  printFooter?: ComprobanteEntradaPrintFooterConfig | null;
  onConfirmed?: (data: RecepcionOrdenCompraResponse) => void;
};

const getOrdenFromData = (data: RecepcionOrdenCompraResponse | null): InventarioOrdenCompra | null => data?.orden ?? null;

const subtotalRecepcionItem = (
  it: { sku: string; cantidadRecibida: number; costoUnitario: number; subtotal?: number },
  ordenItems: InventarioOrdenCompra['items'] | undefined,
): number => {
  if (it.subtotal != null && it.subtotal > 0) {
    return subtotalLineaComprobanteEntrada(it.cantidadRecibida, it.costoUnitario, it.subtotal);
  }
  const ordenItem = (ordenItems || []).find((row) => String(row.sku || '').toUpperCase() === String(it.sku || '').toUpperCase());
  if (ordenItem) return subtotalLineaRecepcion(ordenItem, it.cantidadRecibida);
  return subtotalLineaComprobanteEntrada(it.cantidadRecibida, it.costoUnitario);
};

const desgloseRecepcionItem = (
  it: { sku: string; cantidadRecibida: number; costoUnitario: number; subtotal?: number },
  ordenItems: InventarioOrdenCompra['items'] | undefined,
) => {
  const ordenItem = (ordenItems || []).find((row) => String(row.sku || '').toUpperCase() === String(it.sku || '').toUpperCase());
  const total = subtotalRecepcionItem(it, ordenItems);
  if (!ordenItem || Number(ordenItem.cantidadOrdenada || 0) <= 0) {
    return { subtotalBruto: total, descuento: 0, baseGravable: total, iva: 0, total };
  }
  const proporcion = Number(it.cantidadRecibida || 0) / Number(ordenItem.cantidadOrdenada);
  const brutoOrden = Number(ordenItem.cantidadOrdenada) * Number(ordenItem.costoUnitario || 0);
  const descuentoOrden = Number(ordenItem.descuento || 0)
    || brutoOrden * (Number(ordenItem.descuentoPorcentaje || 0) / 100);
  const baseOrden = ordenItem.baseImpuestoAlGuardar != null
    ? Number(ordenItem.baseImpuestoAlGuardar)
    : Math.max(0, brutoOrden - descuentoOrden);
  const ivaOrden = ordenItem.impuestos != null
    ? Number(ordenItem.impuestos)
    : baseOrden * (Number(ordenItem.tarifaReglaAlGuardar ?? ordenItem.impuestoPorcentaje ?? 0) / 100);
  return {
    subtotalBruto: brutoOrden * proporcion,
    descuento: descuentoOrden * proporcion,
    baseGravable: baseOrden * proporcion,
    iva: ivaOrden * proporcion,
    total,
  };
};

export default function InventarioComprobanteEntradaModal({
  open,
  onOpenChange,
  data,
  documentoSoporte = null,
  nombreCorporativo,
  recepcionAutomatica = false,
  printFooter,
  onConfirmed,
}: InventarioComprobanteEntradaModalProps): React.ReactElement {
  const [confirmando, setConfirmando] = useState(false);
  const [dataLocal, setDataLocal] = useState<RecepcionOrdenCompraResponse | null>(null);

  const dataUi = dataLocal ?? data;
  const orden = getOrdenFromData(dataUi);
  const comprobanteContable = dataUi?.comprobanteContable ?? dataUi?.recepcion?.comprobanteContable ?? null;
  const estadoRecepcion = String(dataUi?.recepcion?.estado || '').trim().toUpperCase();
  const pendienteConfirmacion = estadoRecepcion === 'PENDIENTE_APROBACION';
  const recepcionId = getRecepcionCompraId(dataUi?.recepcion);
  const mostrarConfirmar = pendienteConfirmacion && Boolean(recepcionId);

  React.useEffect(() => {
    if (open) setDataLocal(data);
  }, [open, data]);

  const total = useMemo(() => {
    const items = dataUi?.recepcion?.items ?? [];
    return items.reduce(
      (acc, it) => acc + subtotalRecepcionItem(it, orden?.items),
      0,
    );
  }, [dataUi, orden?.items]);
  const resumen = useMemo(() => (dataUi?.recepcion?.items ?? []).reduce((acc, item) => {
    const linea = desgloseRecepcionItem(item, orden?.items);
    acc.subtotalBruto += linea.subtotalBruto;
    acc.descuento += linea.descuento;
    acc.baseGravable += linea.baseGravable;
    acc.iva += linea.iva;
    acc.total += linea.total;
    return acc;
  }, { subtotalBruto: 0, descuento: 0, baseGravable: 0, iva: 0, total: 0 }), [dataUi, orden?.items]);

  const reporteKardex = dataUi?.reporteKardex ?? [];
  const kardexRegistrado = reporteKardex.length > 0
    || dataUi?.aplicoKardex === true
    || (dataUi?.recepcion?.items || []).some((it) => String(it.estadoKardex || '').toUpperCase() === 'CONFIRMADO');

  const confirmarComprobante = async (): Promise<void> => {
    if (!recepcionId || !mostrarConfirmar) {
      if (!recepcionId) toast.error('No se pudo identificar el comprobante de entrada.');
      return;
    }
    try {
      setConfirmando(true);
      const confirmed = await inventarioService.confirmarRecepcionOrdenCompra(recepcionId, {
        estado: recepcionAutomatica,
      });
      setDataLocal(confirmed);
      onConfirmed?.(confirmed);
      toast.success(
        confirmed?.msg
        || (recepcionAutomatica
          ? 'Comprobante confirmado. Comprobante contable y kardex registrados.'
          : 'Comprobante contable registrado. Registre la entrada física en kardex desde Movimientos.'),
      );
    } catch (error) {
      console.error('Error confirmando comprobante:', error);
      toast.error(
        mensajeErrorComprasInventario(error, 'No se pudo confirmar el comprobante de entrada.'),
        { autoClose: 10000 },
      );
    } finally {
      setConfirmando(false);
    }
  };

  const imprimirComprobante = (): void => {
    if (!dataUi || !orden) return;
    const corporativo = String(nombreCorporativo || resolveStoredCorporateName() || 'Mabs by Gabs').trim();
    const documentoTexto = `${documentoSoporte?.tipo?.trim() || ''}${documentoSoporte?.numero?.trim() ? ` · ${documentoSoporte.numero}` : ''}`.trim();
    const contableTexto = comprobanteContable?.numero
      ? `${comprobanteContable.tipo || 'COMPROBANTE_ENTRADA'} · ${comprobanteContable.numero}`
      : '';
    const impresoEn = formatDateTimeCo(new Date().toISOString());
    const estadoComprobante = labelEstadoComprobanteEntrada(dataUi.recepcion.estado || 'APROBADA');

    const footer: PrintDocumentFooterConfig = printFooter ?? {
      row: {
        left: orden.proveedor?.nombre ? `Proveedor: ${orden.proveedor.nombre}` : '',
        center: corporativo,
        right: impresoEn,
      },
      lines: [
        `Recepción ${dataUi.recepcion.numeroRecepcion} · OC ${orden.numeroOrden} · ${estadoComprobante}`,
        documentoTexto || undefined,
        contableTexto ? `Comprobante contable: ${contableTexto}` : undefined,
        orden.proveedor?.nit ? `NIT proveedor ${orden.proveedor.nit}` : undefined,
      ].filter(Boolean) as string[],
    };

    const rows = dataUi.recepcion.items.map((it) => {
      const subtotal = subtotalRecepcionItem(it, orden?.items);
      return `
        <tr>
          <td>${escapePrintHtml(it.sku)}</td>
          <td>${escapePrintHtml(it.bodega)}</td>
          <td class="num">${escapePrintHtml(Number(it.cantidadRecibida ?? 0))}</td>
          <td class="num">${escapePrintHtml(moneyCo(Number(it.costoUnitario ?? 0)))}</td>
          <td class="num strong">${escapePrintHtml(moneyCo(subtotal))}</td>
        </tr>
      `;
    }).join('');

    const kardexRows = reporteKardex.map((linea) => {
      const ant = Number(linea.movimiento?.saldoBodega?.cantidadAnterior ?? 0);
      const post = Number(linea.movimiento?.saldoBodega?.cantidadPosterior ?? linea.saldo?.cantidadDisponible ?? 0);
      const doc = linea.movimiento?.documentoRelacionado;
      return `
        <tr>
          <td>${escapePrintHtml(linea.sku)}</td>
          <td>${escapePrintHtml(linea.bodega)}</td>
          <td class="num">${escapePrintHtml(Number(linea.movimiento?.cantidad ?? 0))}</td>
          <td class="num">${escapePrintHtml(ant)}</td>
          <td class="num strong">${escapePrintHtml(post)}</td>
          <td class="num strong">${escapePrintHtml(Number(linea.saldo?.cantidadDisponible ?? 0))}</td>
          <td class="num">${escapePrintHtml(moneyCo(Number(linea.saldo?.costoPromedioUnitario ?? linea.movimiento?.costoUnitario ?? 0)))}</td>
          <td class="mono">${escapePrintHtml(doc?.tipo && doc?.numero ? `${doc.tipo} · ${doc.numero}` : '—')}</td>
        </tr>
      `;
    }).join('');

    const kardexSection = reporteKardex.length
      ? `
        <h2 style="margin:18px 0 8px;font-size:14px;">Registro en kardex (inventarioMovimiento / inventarioSaldo)</h2>
        <table>
          <thead><tr><th>SKU</th><th>Bodega</th><th class="num">Cant. entrada</th><th class="num">Stock ant.</th><th class="num">Stock post.</th><th class="num">Saldo actual</th><th class="num">Costo prom.</th><th>Documento</th></tr></thead>
          <tbody>${kardexRows}</tbody>
        </table>
      `
      : '';

    const bodyHtml = `
      <main class="card">
        <h1>Comprobante de entrada</h1>
        <section class="grid">
          <div><div class="label">Recepción</div><div class="value mono">${escapePrintHtml(dataUi.recepcion.numeroRecepcion)}</div></div>
          <div><div class="label">Orden compra</div><div class="value mono">${escapePrintHtml(orden.numeroOrden)}</div></div>
          <div><div class="label">Estado OC</div><div class="value">${escapePrintHtml(orden.estado)}</div></div>
          <div><div class="label">Estado comprobante</div><div class="value">${escapePrintHtml(estadoComprobante)}</div></div>
          <div><div class="label">Documento soporte</div><div>${escapePrintHtml(documentoTexto || 'Sin documento')}</div></div>
          <div><div class="label">Comprobante contable</div><div class="mono">${escapePrintHtml(contableTexto || 'Pendiente al confirmar')}</div></div>
          <div><div class="label">Creado</div><div>${escapePrintHtml(formatDateTimeCo(dataUi.recepcion.createdAt))}</div></div>
          <div><div class="label">Proveedor</div><div>${escapePrintHtml(orden.proveedor?.nombre)}</div><div class="label">NIT ${escapePrintHtml(orden.proveedor?.nit)}</div></div>
        </section>
        <div class="total">Total: ${escapePrintHtml(moneyCo(total))}</div>
        <table>
          <thead><tr><th>SKU</th><th>Bodega</th><th class="num">Cant. recibida</th><th class="num">Costo unit.</th><th class="num">Subtotal</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${kardexSection}
      </main>
    `;

    const ok = openPrintDocument({
      title: `${corporativo} - ${dataUi.recepcion.numeroRecepcion}`,
      bodyHtml,
      footer,
      extraStyles: `
        h1 { margin: 0 0 14px; font-size: 18px; }
        .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin-bottom: 14px; }
        .label { color: #6b7280; font-size: 11px; margin-bottom: 3px; }
        .value { font-weight: 700; }
        .mono { font-family: Consolas, monospace; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border-bottom: 1px solid #e5e7eb; padding: 8px 6px; text-align: left; }
        th { font-size: 11px; color: #374151; }
        .num { text-align: right; font-variant-numeric: tabular-nums; }
        .strong { font-weight: 700; }
        .total { text-align: right; margin: 12px 0 0; font-size: 13px; font-weight: 700; }
      `,
      onBlocked: () => toast.error('El navegador bloqueó la ventana de impresión.'),
    });

    if (!ok) toast.error('El navegador bloqueó la ventana de impresión.');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[980px] overflow-y-auto border-border bg-background p-3 text-foreground sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:p-6">
        <DialogHeader className="space-y-1">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {kardexRegistrado ? 'Comprobante de entrada · Kardex registrado' : 'Comprobante de entrada'}
            </DialogTitle>
            {mostrarConfirmar ? (
              <Button type="button" size="sm" onClick={() => void confirmarComprobante()} disabled={confirmando}>
                {confirmando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                {recepcionAutomatica ? 'Confirmar y kardex' : 'Confirmar comprobante'}
              </Button>
            ) : null}
          </div>
          <DialogDescription className="sr-only">
            Detalle del comprobante de entrada físico vinculado a la orden de compra.
          </DialogDescription>
        </DialogHeader>

        {!dataUi || !orden ? (
          <div className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            No hay información de comprobante.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid min-w-0 gap-3 rounded-md border border-border bg-muted/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Recepción</p>
                <p className="font-mono text-sm font-semibold text-foreground">{dataUi.recepcion.numeroRecepcion}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Orden compra</p>
                <p className="font-mono text-sm font-semibold text-foreground">{orden.numeroOrden}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estado OC</p>
                <Badge variant="outline" className="mt-1">
                  {orden.estado}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estado comprobante</p>
                <Badge
                  variant="outline"
                  className={`mt-1 ${estadoComprobanteEntradaBadgeClass(dataUi.recepcion.estado || 'APROBADA')}`}
                >
                  {labelEstadoComprobanteEntrada(dataUi.recepcion.estado || 'APROBADA')}
                </Badge>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Comprobante de entrada (documento soporte)</p>
                <p className="text-sm text-foreground">
                  {documentoSoporte?.tipo?.trim() ? documentoSoporte.tipo : '—'} {documentoSoporte?.numero?.trim() ? `· ${documentoSoporte.numero}` : ''}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Creado: {formatDateTimeCo(dataUi.recepcion.createdAt)}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Comprobante contable (secuencia propia)</p>
                <p className="break-all font-mono text-sm font-semibold text-foreground">
                  {comprobanteContable?.numero
                    ? `${comprobanteContable.tipo || 'COMPROBANTE_ENTRADA'} · ${comprobanteContable.numero}`
                    : pendienteConfirmacion ? 'Se asigna al confirmar' : '—'}
                </p>
                {comprobanteContable?.confirmadoEn ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Confirmado: {formatDateTimeCo(comprobanteContable.confirmadoEn)}
                  </p>
                ) : null}
                {comprobanteContable?.usuario ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ejecutado por: {textoUsuarioAuditoria({ usuario: comprobanteContable.usuario })}
                  </p>
                ) : null}
                {pendienteConfirmacion ? (
                  <p className="mt-1 rounded-sm bg-warning/10 px-2 py-1 text-xs text-foreground dark:bg-warning/15 dark:text-foreground">
                    {recepcionAutomatica
                      ? 'Al confirmar se aprueba el comprobante de entrada, se genera el comprobante contable (COMPROBANTE_ENTRADA) y se registra el kardex.'
                      : 'Al confirmar se aprueba el comprobante de entrada y se genera el comprobante contable (COMPROBANTE_ENTRADA). El kardex físico se registra después en Movimientos.'}
                  </p>
                ) : null}
              </div>

              <div className="sm:col-span-2 lg:col-span-4">
                <p className="text-xs text-muted-foreground">Proveedor</p>
                <p className="break-words text-sm text-foreground">{orden.proveedor?.nombre}</p>
                <p className="break-words text-xs text-muted-foreground">NIT {orden.proveedor?.nit}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">Detalle recibido (comprobante físico)</p>
                <p className="text-sm font-semibold text-foreground">
                  Total: <span className="tabular-nums">{moneyCo(total)}</span>
                </p>
              </div>
              <div className="space-y-3 md:hidden">
                {dataUi.recepcion.items.map((it, idx) => {
                  const subtotal = subtotalRecepcionItem(it, orden?.items);
                  return (
                    <article key={`${it.sku}-${it.bodega}-${idx}`} className="rounded-md border border-border bg-card p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 break-words text-sm text-foreground">{it.bodega}</p>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">{it.sku}</span>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div><dt className="text-muted-foreground">Cant. recibida</dt><dd className="tabular-nums text-foreground">{Number(it.cantidadRecibida ?? 0)}</dd></div>
                        <div><dt className="text-muted-foreground">Costo unitario</dt><dd className="tabular-nums text-foreground">{moneyCo(Number(it.costoUnitario ?? 0))}</dd></div>
                        <div className="col-span-2 border-t border-border pt-2"><dt className="text-muted-foreground">Subtotal</dt><dd className="font-semibold tabular-nums text-foreground">{moneyCo(subtotal)}</dd></div>
                      </dl>
                    </article>
                  );
                })}
              </div>
              <div className="hidden overflow-x-auto rounded-md border border-border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Bodega</TableHead>
                      <TableHead className="text-right">Cant. recibida</TableHead>
                      <TableHead className="text-right">Costo unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dataUi.recepcion.items.map((it, idx) => {
                      const subtotal = subtotalRecepcionItem(it, orden?.items);
                      return (
                        <TableRow key={`${it.sku}-${it.bodega}-${idx}`}>
                          <TableCell className="font-mono text-xs">{it.sku}</TableCell>
                          <TableCell className="text-sm text-foreground">{it.bodega}</TableCell>
                          <TableCell className="text-right tabular-nums">{Number(it.cantidadRecibida ?? 0)}</TableCell>
                          <TableCell className="text-right tabular-nums">{moneyCo(Number(it.costoUnitario ?? 0))}</TableCell>
                          <TableCell className="text-right tabular-nums font-medium">{moneyCo(subtotal)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="ml-auto grid w-full gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground sm:max-w-sm">
                <div className="flex justify-between gap-4"><span>Subtotal bruto</span><span className="tabular-nums">{moneyCo(resumen.subtotalBruto)}</span></div>
                <div className="flex justify-between gap-4"><span>Descuento</span><span className="tabular-nums">- {moneyCo(resumen.descuento)}</span></div>
                <div className="flex justify-between gap-4"><span>Base gravable</span><span className="tabular-nums">{moneyCo(resumen.baseGravable)}</span></div>
                <div className="flex justify-between gap-4"><span>IVA según tarifa</span><span className="tabular-nums">+ {moneyCo(resumen.iva)}</span></div>
                <div className="flex justify-between gap-4 border-t border-border pt-2 font-semibold"><span>Total recibido</span><span className="tabular-nums">{moneyCo(resumen.total)}</span></div>
              </div>
            </div>

            {reporteKardex.length > 0 ? (
              <InventarioReporteKardexEntrada lineas={reporteKardex} />
            ) : kardexRegistrado && !pendienteConfirmacion ? (
              <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                Kardex confirmado. Recargue el comprobante para ver el detalle de inventarioMovimiento e inventarioSaldo.
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" className="w-full sm:w-auto" variant="outline" onClick={() => onOpenChange(false)} disabled={confirmando}>
            Cerrar
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto"
            variant="outline"
            onClick={imprimirComprobante}
            disabled={!dataUi || confirmando}
          >
            Imprimir / PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
