import React, { useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { toast } from 'react-toastify';
import inventarioService from '@/app/services/inventarioService';
import type { InventarioOrdenCompra, RecepcionOrdenCompraResponse } from '@/app/services/inventarioService';
import { mensajeErrorComprasInventario } from '../inventario/inventarioComprasMensajes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const moneyCo = (n: number): string =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const formatDateTimeCo = (value?: string): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
};

export type DocumentoSoporte = { tipo: string; numero: string };

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const resolveStoredCorporateName = (): string => {
  try {
    const raw = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;
    return String(
      user?.corporativo?.razon_social
      || user?.tenantCorporativo?.razon_social
      || user?.perfil?.corporativo?.razon_social
      || user?.perfil?.razon_social
      || user?.empresa
      || user?.nombreEmpresa
      || 'Mabs by Gabs'
    ).trim();
  } catch {
    return 'Mabs by Gabs';
  }
};

export type InventarioComprobanteEntradaModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: RecepcionOrdenCompraResponse | null;
  documentoSoporte?: DocumentoSoporte | null;
  nombreCorporativo?: string;
  /** true = compras con recepción automática: al confirmar sí registra kardex. false = solo aprueba comprobante (subproceso manual). */
  recepcionAutomatica?: boolean;
  onConfirmed?: (data: RecepcionOrdenCompraResponse) => void;
};

const getOrdenFromData = (data: RecepcionOrdenCompraResponse | null): InventarioOrdenCompra | null => data?.orden ?? null;

export default function InventarioComprobanteEntradaModal({
  open,
  onOpenChange,
  data,
  documentoSoporte = null,
  nombreCorporativo,
  recepcionAutomatica = false,
  onConfirmed,
}: InventarioComprobanteEntradaModalProps): React.ReactElement {
  const [confirmando, setConfirmando] = useState(false);
  const orden = getOrdenFromData(data);
  const pendienteConfirmacion = data?.recepcion?.estado === 'PENDIENTE_APROBACION';

  const total = useMemo(() => {
    const items = data?.recepcion?.items ?? [];
    return items.reduce((acc, it) => acc + Math.max(0, Number(it.cantidadRecibida || 0) * Number(it.costoUnitario || 0)), 0);
  }, [data]);

  const imprimirComprobante = (): void => {
    if (!data || !orden) return;
    const corporativo = String(nombreCorporativo || resolveStoredCorporateName() || 'Mabs by Gabs').trim();
    const documentoTexto = `${documentoSoporte?.tipo?.trim() || ''}${documentoSoporte?.numero?.trim() ? ` - ${documentoSoporte.numero}` : ''}`.trim();
    const rows = data.recepcion.items.map((it, idx) => {
      const subtotal = Math.max(0, Number(it.cantidadRecibida || 0) * Number(it.costoUnitario || 0));
      return `
        <tr>
          <td>${escapeHtml(it.sku)}</td>
          <td>${escapeHtml(it.bodega)}</td>
          <td class="num">${escapeHtml(Number(it.cantidadRecibida ?? 0))}</td>
          <td class="num">${escapeHtml(moneyCo(Number(it.costoUnitario ?? 0)))}</td>
          <td class="num strong">${escapeHtml(moneyCo(subtotal))}</td>
        </tr>
      `;
    }).join('');

    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(corporativo)} - ${escapeHtml(data.recepcion.numeroRecepcion)}</title>
          <style>
            @page { size: letter; margin: 18mm 16mm 22mm; }
            * { box-sizing: border-box; }
            body { margin: 0; color: #111827; font-family: Arial, sans-serif; font-size: 12px; }
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
            .footer { position: fixed; left: 0; right: 0; bottom: -12mm; text-align: center; font-size: 10px; color: #374151; }
          </style>
        </head>
        <body>
          <main class="card">
            <h1>Comprobante de entrada</h1>
            <section class="grid">
              <div><div class="label">Recepcion</div><div class="value mono">${escapeHtml(data.recepcion.numeroRecepcion)}</div></div>
              <div><div class="label">Orden compra</div><div class="value mono">${escapeHtml(orden.numeroOrden)}</div></div>
              <div><div class="label">Estado OC</div><div class="value">${escapeHtml(orden.estado)}</div></div>
              <div><div class="label">Estado comprobante</div><div class="value">${escapeHtml(data.recepcion.estado || 'APROBADA')}</div></div>
              <div><div class="label">Documento soporte</div><div>${escapeHtml(documentoTexto || 'Sin documento')}</div></div>
              <div><div class="label">Creado</div><div>${escapeHtml(formatDateTimeCo(data.recepcion.createdAt))}</div></div>
              <div><div class="label">Proveedor</div><div>${escapeHtml(orden.proveedor?.nombre)}</div><div class="label">NIT ${escapeHtml(orden.proveedor?.nit)}</div></div>
            </section>
            <div class="total">Total: ${escapeHtml(moneyCo(total))}</div>
            <table>
              <thead><tr><th>SKU</th><th>Bodega</th><th class="num">Cant. recibida</th><th class="num">Costo unit.</th><th class="num">Subtotal</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </main>
          <footer class="footer">${escapeHtml(corporativo)}</footer>
          <script>window.addEventListener('load', () => { window.print(); });</script>
        </body>
      </html>`;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      toast.error('El navegador bloqueo la ventana de impresion.');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(980px,calc(100vw-2rem))] max-w-none border-border bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Comprobante de entrada
          </DialogTitle>
        </DialogHeader>

        {!data || !orden ? (
          <div className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            No hay información de comprobante.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-md border border-border bg-muted/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Recepción</p>
                <p className="font-mono text-sm font-semibold text-foreground">{data.recepcion.numeroRecepcion}</p>
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
                <Badge variant={pendienteConfirmacion ? 'secondary' : 'outline'} className="mt-1">
                  {data.recepcion.estado || 'APROBADA'}
                </Badge>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Documento soporte</p>
                <p className="text-sm text-foreground">
                  {documentoSoporte?.tipo?.trim() ? documentoSoporte.tipo : '—'} {documentoSoporte?.numero?.trim() ? `· ${documentoSoporte.numero}` : ''}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Creado: {formatDateTimeCo(data.recepcion.createdAt)}</p>
                {pendienteConfirmacion ? (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                    {recepcionAutomatica
                      ? 'Al confirmar se aprueba el comprobante, se genera el comprobante contable y se registra la entrada en kardex.'
                      : 'Al confirmar se aprueba el comprobante, la secuencia y el comprobante contable. El kardex físico se registra después en Movimientos (subproceso manual).'}
                  </p>
                ) : null}
              </div>

              <div className="sm:col-span-2 lg:col-span-4">
                <p className="text-xs text-muted-foreground">Proveedor</p>
                <p className="text-sm text-foreground">{orden.proveedor?.nombre}</p>
                <p className="text-xs text-muted-foreground">NIT {orden.proveedor?.nit}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">Detalle recibido</p>
                <p className="text-sm font-semibold text-foreground">
                  Total: <span className="tabular-nums">{moneyCo(total)}</span>
                </p>
              </div>
              <div className="overflow-x-auto rounded-md border border-border">
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
                    {data.recepcion.items.map((it, idx) => {
                      const subtotal = Math.max(0, Number(it.cantidadRecibida || 0) * Number(it.costoUnitario || 0));
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
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={confirmando}>
            Cerrar
          </Button>
          {pendienteConfirmacion && data?.recepcion?._id ? (
            <Button
              type="button"
              disabled={confirmando}
              onClick={async () => {
                try {
                  setConfirmando(true);
                  const confirmed = await inventarioService.confirmarRecepcionOrdenCompra(data.recepcion._id, {
                    estado: recepcionAutomatica,
                  });
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
              }}
            >
              {confirmando
                ? 'Confirmando...'
                : recepcionAutomatica
                  ? 'Confirmar y registrar en kardex'
                  : 'Confirmar comprobante (sin kardex)'}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={imprimirComprobante}
            disabled={!data || confirmando}
          >
            Imprimir / PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

