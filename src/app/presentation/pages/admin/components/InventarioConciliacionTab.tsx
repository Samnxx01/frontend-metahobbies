import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { CheckCircle2, FileSearch, FileText, Link2, Search, ShieldAlert, ShieldCheck } from 'lucide-react';
import inventarioService, {
  type InventoryLedgerMovement,
  type LedgerByInvoiceResponse,
} from '@/app/services/inventarioService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ConfigComprobante from './ConfigComprobante';

const MONEY = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const fmtDate = (value?: string | null): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
};

const documentoTipoLabel: Record<NonNullable<LedgerByInvoiceResponse['documentoTipo']>, string> = {
  FACTURA_PROVEEDOR_LEGACY: 'Factura proveedor (XML legacy)',
  ORDEN_COMPRA: 'Orden de compra',
  FACTURA_DIAN_COMPRA: 'Factura DIAN (compra)',
  FACTURA_DIAN_VENTA: 'Factura DIAN (venta)',
  COMPROBANTE_ENTRADA: 'Comprobante contable (entrada)',
  COMPROBANTE_ORDEN_COMPRA: 'Comprobante contable (orden compra)',
  COMPROBANTE_CONTABLE: 'Comprobante contable (manual)',
};

const Hash = ({ value }: { value?: string | null }): React.ReactElement => (
  <span className="font-mono text-[11px] text-muted-foreground" title={value || ''}>
    {value ? `${value.slice(0, 10)}…${value.slice(-6)}` : '—'}
  </span>
);

const renderMovementRow = (m: InventoryLedgerMovement): React.ReactElement => (
  <TableRow key={m._id}>
    <TableCell className="text-xs">{fmtDate(m.createdAt)}</TableCell>
    <TableCell>
      <Badge variant={m.direction === 'IN' ? 'default' : 'secondary'}>
        {m.direction === 'IN' ? 'Entrada' : 'Salida'}
      </Badge>
    </TableCell>
    <TableCell className="text-xs">{m.movementType}</TableCell>
    <TableCell className="text-xs">
      <div className="font-medium text-foreground">
        {m.referenceDocument?.type} · {m.referenceDocument?.number}
      </div>
      {m.referenceDocument?.comprobanteId ? (
        <div className="font-mono text-[10px] text-muted-foreground" title={m.referenceDocument.comprobanteId}>
          Comprobante: {m.referenceDocument.comprobanteId.slice(0, 8)}…
        </div>
      ) : null}
      <div className="text-muted-foreground">{fmtDate(m.referenceDocument?.issuedAt)}</div>
    </TableCell>
    <TableCell className="text-right font-mono text-xs">{Number(m.quantity).toLocaleString('es-CO')}</TableCell>
    <TableCell className="text-right font-mono text-xs">{MONEY.format(Number(m.unitCost || 0))}</TableCell>
    <TableCell className="text-right font-mono text-xs">{MONEY.format(Number(m.totalCost || 0))}</TableCell>
    <TableCell className="text-xs">
      <div className="text-foreground">{m.audit?.usuarioCorreo || '—'}</div>
      <div className="text-muted-foreground">{m.audit?.ipOrigen || '—'}</div>
      <div className="text-muted-foreground">{fmtDate(m.audit?.timestamp)}</div>
    </TableCell>
    <TableCell><Hash value={m.transactionHash} /></TableCell>
    <TableCell>
      {m.parent ? (
        <div className="space-y-0.5 text-xs">
          <div className="flex items-center gap-1 text-foreground">
            <Link2 className="h-3 w-3" />
            <span className="font-medium">
              {m.parent.referenceDocument?.type} · {m.parent.referenceDocument?.number}
            </span>
          </div>
          <Hash value={m.parent.transactionHash} />
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      )}
    </TableCell>
  </TableRow>
);

export default function InventarioConciliacionTab(): React.ReactElement {
  const [invoiceId, setInvoiceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LedgerByInvoiceResponse | null>(null);
  const [comprobantesModalOpen, setComprobantesModalOpen] = useState(false);

  const consultar = async (): Promise<void> => {
    const id = invoiceId.trim();
    if (!id) {
      toast.error('Ingresa un ID de factura, orden de compra o factura DIAN.');
      return;
    }
    try {
      setLoading(true);
      const data = await inventarioService.obtenerLedgerPorInvoice(id);
      setResult(data);
      if (!data?.movements?.length) {
        toast.info('No se encontraron movimientos asociados al ID consultado.');
      }
    } catch (error) {
      console.error('Error consultando conciliacion:', error);
      toast.error(error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo consultar la conciliacion.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') void consultar();
  };

  const validacionTone: 'success' | 'warning' | 'destructive' | 'muted' = (() => {
    if (!result?.documentoTipo) return 'muted';
    if (result.validada) return 'success';
    if (result.documentoTipo === 'ORDEN_COMPRA') return 'muted';
    return 'warning';
  })();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-primary" />
            Conciliacion factura DIAN ↔ kardex contable
          </CardTitle>
          <CardDescription>
            Consulta los movimientos del kardex inmutable asociados a una factura, orden de compra o factura DIAN.
            Cada movimiento muestra su movimiento padre (drilldown) y el estado de validacion del documento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="invoiceId">ID del documento (orden, factura proveedor o factura DIAN)</Label>
              <Input
                id="invoiceId"
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ej. 663ccc1112233aabbccddeeff"
                autoComplete="off"
                className="font-mono text-xs"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={() => void consultar()} disabled={loading} className="w-full sm:w-auto">
                <Search className="mr-2 h-4 w-4" />
                {loading ? 'Consultando...' : 'Consultar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Comprobantes contables
              </CardTitle>
              <CardDescription>
                Consulta y registra comprobantes contables (numero de secuencia parametrizable) con auditoria del ejecutor.
              </CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setComprobantesModalOpen(true)}>
              <FileText className="mr-2 h-4 w-4" />
              Abrir comprobantes contables
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Dialog open={comprobantesModalOpen} onOpenChange={setComprobantesModalOpen}>
        <DialogContent className="max-h-[90dvh] w-[min(96vw,80rem)] max-w-none overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Comprobantes contables
            </DialogTitle>
          </DialogHeader>
          <ConfigComprobante embedded />
        </DialogContent>
      </Dialog>

      {result ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-lg">Documento</CardTitle>
                <CardDescription>
                  <span className="font-mono text-[11px]">{result.invoiceId}</span>
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.documentoTipo ? (
                  <Badge variant="outline">{documentoTipoLabel[result.documentoTipo]}</Badge>
                ) : (
                  <Badge variant="outline">Documento no resuelto</Badge>
                )}
                {result.documentoTipo ? (
                  validacionTone === 'success' ? (
                    <Badge variant="default" className="bg-success hover:bg-success">
                      <ShieldCheck className="mr-1 h-3 w-3" /> Validada · {result.estadoValidacion}
                    </Badge>
                  ) : validacionTone === 'warning' ? (
                    <Badge variant="destructive">
                      <ShieldAlert className="mr-1 h-3 w-3" /> {result.estadoValidacion || 'Sin validar'}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> {result.estadoValidacion || '—'}
                    </Badge>
                  )
                ) : null}
                <Badge variant="secondary">{result.total} movimientos</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {typeof result.documento === 'object' && result.documento && 'cufe' in result.documento && result.documento.cufe ? (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">CUFE (invoiceElectronic):</span>{' '}
                <span className="font-mono">{String(result.documento.cufe)}</span>
              </div>
            ) : null}
            {result.mensajeValidacion ? (
              <div className="rounded-md border border-warning/50 bg-warning/40 px-3 py-2 text-xs text-warning dark:border-warning/50 dark:bg-warning/20 dark:text-warning">
                {result.mensajeValidacion}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {result?.movements?.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Movimientos del kardex contable</CardTitle>
            <CardDescription>
              Drilldown: cada fila muestra auditoría del ejecutor. El CUFE vive solo en invoiceElectronic (documento arriba).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Direccion</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Costo unitario</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Auditoría</TableHead>
                    <TableHead>Hash</TableHead>
                    <TableHead>Movimiento padre</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.movements.map(renderMovementRow)}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
