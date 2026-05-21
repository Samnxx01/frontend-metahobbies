import React from 'react';
import { FileText, Loader2, Plus, RefreshCw, Settings2 } from 'lucide-react';
import inventarioService, {
  type CrearComprobanteContablePayload,
  type InventarioComprobanteContable,
} from '@/app/services/inventarioService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import InventarioDocumentoSoporteConfigModal, {
  type DocumentoSoporteTipoConfig,
} from './InventarioDocumentoSoporteConfigModal';

const money = (value: number): string =>
  Number(value || 0).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

const qty = (value: number): string =>
  Number(value || 0).toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });

const shortHash = (value?: string | null): string => {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  return raw.length > 16 ? `${raw.slice(0, 10)}...${raw.slice(-6)}` : raw;
};

const shortId = (value?: string | null): string => {
  const raw = String(value || '').trim();
  if (!raw) return '—';
  return raw.length > 12 ? `${raw.slice(0, 8)}…${raw.slice(-4)}` : raw;
};

const formatDate = (value?: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('es-CO');
};

const emptyForm = (codigo = 'COMPROBANTE_CONTABLE'): CrearComprobanteContablePayload => ({
  sku: '',
  direction: 'IN',
  quantity: 1,
  unitCost: 0,
  reason: '',
  documentoCodigo: codigo,
  usarSecuenciaAutomatica: true,
  referenceDocument: {
    type: codigo,
    number: '',
    issuedAt: new Date().toISOString().slice(0, 10),
  },
});

export default function ConfigComprobante(): React.ReactElement {
  const [rows, setRows] = React.useState<InventarioComprobanteContable[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [modalOpen, setModalOpen] = React.useState(false);
  const [configOpen, setConfigOpen] = React.useState(false);
  const [tiposDoc, setTiposDoc] = React.useState<DocumentoSoporteTipoConfig[]>([]);
  const [siguientePreview, setSiguientePreview] = React.useState('');
  const [form, setForm] = React.useState<CrearComprobanteContablePayload>(() => emptyForm());

  const cargarComprobantes = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await inventarioService.listarComprobantesContables();
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los comprobantes contables.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarTiposDocumento = React.useCallback(async () => {
    const data = await inventarioService.listarDocumentosSoporte();
    const activos = data.filter((t) => t.activo);
    setTiposDoc(data);
    return activos;
  }, []);

  const refrescarSiguienteNumero = React.useCallback(async (codigo: string) => {
    if (!codigo) {
      setSiguientePreview('');
      return;
    }
    try {
      const preview = await inventarioService.previewSiguienteNumeroComprobante(codigo);
      setSiguientePreview(preview.siguienteFormateado);
      setForm((prev) => ({
        ...prev,
        documentoCodigo: codigo,
        referenceDocument: {
          ...prev.referenceDocument,
          type: codigo,
          number: preview.siguienteFormateado,
        },
      }));
    } catch (err) {
      setSiguientePreview('');
      setError(err instanceof Error ? err.message : 'No se pudo obtener el siguiente numero.');
    }
  }, []);

  React.useEffect(() => {
    void cargarComprobantes();
  }, [cargarComprobantes]);

  React.useEffect(() => {
    if (!modalOpen) return;
    let cancelled = false;
    void (async () => {
      const activos = await cargarTiposDocumento();
      if (cancelled) return;
      const codigo = activos[0]?.codigo || 'COMPROBANTE_CONTABLE';
      setForm(emptyForm(codigo));
      await refrescarSiguienteNumero(codigo);
    })();
    return () => {
      cancelled = true;
    };
  }, [modalOpen, cargarTiposDocumento, refrescarSiguienteNumero]);

  const guardarComprobante = async (): Promise<void> => {
    setSaving(true);
    setError('');
    try {
      await inventarioService.crearComprobanteContable({
        ...form,
        sku: form.sku.trim().toUpperCase(),
        quantity: Number(form.quantity || 0),
        unitCost: form.direction === 'IN' ? Number(form.unitCost || 0) : Number(form.unitCost || 0),
        reason: form.reason.trim(),
        documentoCodigo: form.documentoCodigo || form.referenceDocument.type,
        usarSecuenciaAutomatica: true,
        referenceDocument: {
          type: form.referenceDocument.type?.trim().toUpperCase(),
          issuedAt: form.referenceDocument.issuedAt || null,
        },
      });
      setModalOpen(false);
      setForm(emptyForm());
      await cargarComprobantes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el comprobante contable.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <InventarioDocumentoSoporteConfigModal
        open={configOpen}
        onOpenChange={setConfigOpen}
        onSaved={async () => {
          const activos = await cargarTiposDocumento();
          const codigo = form.documentoCodigo || activos[0]?.codigo;
          if (codigo) await refrescarSiguienteNumero(codigo);
        }}
      />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo comprobante contable</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <Label>Tipo de secuencia (parametrizable)</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setConfigOpen(true)}>
                  <Settings2 className="mr-2 h-4 w-4" />
                  Configurar secuencias
                </Button>
              </div>
              <Select
                value={form.documentoCodigo || form.referenceDocument.type}
                onValueChange={(value) => void refrescarSiguienteNumero(value)}
                disabled={saving}
              >
                <SelectTrigger><SelectValue placeholder="Tipo documento" /></SelectTrigger>
                <SelectContent>
                  {tiposDoc.filter((t) => t.activo).map((t) => (
                    <SelectItem key={t.codigo} value={t.codigo}>
                      {t.codigo} · {t.prefijo}-…
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Numero unico (siguiente consecutivo)</Label>
              <Input value={siguientePreview} readOnly className="font-mono" />
              <p className="text-xs text-muted-foreground">
                Se asigna automaticamente al guardar. Configura prefijo y digitos en Documentos soporte.
              </p>
            </div>
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input
                value={form.sku}
                onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
                placeholder="SKU-PRODUCTO"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label>Direccion</Label>
              <Select
                value={form.direction}
                onValueChange={(value) => setForm((prev) => ({ ...prev, direction: value as 'IN' | 'OUT' }))}
                disabled={saving}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Entrada</SelectItem>
                  <SelectItem value="OUT">Salida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input
                type="number"
                min="0.000001"
                step="0.001"
                value={form.quantity}
                onChange={(event) => setForm((prev) => ({ ...prev, quantity: Number(event.target.value) }))}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label>Costo unitario</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.unitCost ?? 0}
                onChange={(event) => setForm((prev) => ({ ...prev, unitCost: Number(event.target.value) }))}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha documento</Label>
              <Input
                type="date"
                value={form.referenceDocument.issuedAt || ''}
                onChange={(event) => setForm((prev) => ({
                  ...prev,
                  referenceDocument: { ...prev.referenceDocument, issuedAt: event.target.value },
                }))}
                disabled={saving}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Motivo (auditoria)</Label>
              <Textarea
                value={form.reason}
                onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
                disabled={saving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void guardarComprobante()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Comprobantes contables
            </CardTitle>
            <CardDescription>
              Un comprobante = un ID unico + numero de secuencia parametrizable (documentos soporte).
            </CardDescription>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setConfigOpen(true)}>
              <Settings2 className="h-4 w-4" />
              Secuencias
            </Button>
            <Button type="button" size="sm" onClick={() => setModalOpen(true)} disabled={loading || saving}>
              <Plus className="h-4 w-4" />
              Nuevo
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void cargarComprobantes()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comprobante</TableHead>
                  <TableHead>Ultima fecha</TableHead>
                  <TableHead>Movs</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Salida</TableHead>
                  <TableHead>Valor neto</TableHead>
                  <TableHead>Tipos</TableHead>
                  <TableHead>Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                      Cargando comprobantes contables...
                    </TableCell>
                  </TableRow>
                ) : rows.length ? (
                  rows.map((row) => {
                    const neto = Number(row.valorEntrada || 0) - Number(row.valorSalida || 0);
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="min-w-56">
                          <div className="font-medium text-foreground">{row.tipo}</div>
                          <div className="font-mono text-xs text-muted-foreground">{row.numero}</div>
                          {row.comprobanteId ? (
                            <div className="text-[10px] text-muted-foreground" title={row.comprobanteId}>
                              ID: {shortId(row.comprobanteId)}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(row.fechaUltima)}</TableCell>
                        <TableCell>{row.totalMovimientos}</TableCell>
                        <TableCell>{row.totalProductos}</TableCell>
                        <TableCell>
                          <div>{qty(row.cantidadEntrada)}</div>
                          <div className="text-xs text-muted-foreground">{money(row.valorEntrada)}</div>
                        </TableCell>
                        <TableCell>
                          <div>{qty(row.cantidadSalida)}</div>
                          <div className="text-xs text-muted-foreground">{money(row.valorSalida)}</div>
                        </TableCell>
                        <TableCell className={neto >= 0 ? 'text-emerald-700' : 'text-destructive'}>
                          {money(neto)}
                        </TableCell>
                        <TableCell>
                          <div className="flex max-w-56 flex-wrap gap-1">
                            {row.tiposMovimiento.map((tipo) => (
                              <Badge key={tipo} variant="secondary" className="rounded-md">{tipo}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{shortHash(row.ultimoHash)}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                      No hay comprobantes contables registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
