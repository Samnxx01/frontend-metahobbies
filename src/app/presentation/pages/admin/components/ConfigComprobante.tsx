import React from 'react';
import { FileText, Loader2, Plus, RefreshCw, Settings2 } from 'lucide-react';
import inventarioService, {
  type CrearComprobanteContablePayload,
  type InventarioComprobanteContable,
} from '@/app/services/inventarioService';
import productosService, { type BackendProducto } from '@/app/services/productosService';
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

const textoUsuarioComprobante = (
  usuario?: { nombre?: string; correo?: string | null } | null,
): string => {
  const nombre = String(usuario?.nombre || '').trim();
  const correo = String(usuario?.correo || '').trim();
  return nombre || correo || '—';
};

const formatDate = (value?: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('es-CO');
};

/** Etiquetas del campo movementType en inventoryledgers (kardex contable). */
const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  PURCHASE: 'Compra',
  SALE: 'Venta',
  ADJUSTMENT_IN: 'Ajuste entrada',
  ADJUSTMENT_OUT: 'Ajuste salida',
  REVERSAL: 'Reversión',
};

const labelTipoMovimientoLedger = (tipo: string): string =>
  MOVEMENT_TYPE_LABELS[String(tipo || '').trim().toUpperCase()] || String(tipo || '').replace(/_/g, ' ');

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

export type ConfigComprobanteProps = {
  /** Cuando es true, omite su propio `<Card>` contenedor (para montarse dentro de un Dialog). */
  embedded?: boolean;
};

export default function ConfigComprobante({ embedded = false }: ConfigComprobanteProps = {}): React.ReactElement {
  const [rows, setRows] = React.useState<InventarioComprobanteContable[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [modalOpen, setModalOpen] = React.useState(false);
  const [configOpen, setConfigOpen] = React.useState(false);
  const [tiposDoc, setTiposDoc] = React.useState<DocumentoSoporteTipoConfig[]>([]);
  const [siguientePreview, setSiguientePreview] = React.useState('');
  const [form, setForm] = React.useState<CrearComprobanteContablePayload>(() => emptyForm());
  const [productos, setProductos] = React.useState<BackendProducto[]>([]);
  const [productosLoading, setProductosLoading] = React.useState(false);

  const productosConSku = React.useMemo(
    () => productos.filter((p) => String(p.sku || '').trim()),
    [productos],
  );

  const cargarComprobantes = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await inventarioService.listarComprobantesContables();
      setRows(result.data);
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

  const cargarProductos = React.useCallback(async () => {
    setProductosLoading(true);
    try {
      const data = await productosService.listarProductosAdmin({ estadoCatalogo: 'ACTIVO' });
      setProductos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los productos del catálogo.');
      setProductos([]);
    } finally {
      setProductosLoading(false);
    }
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
      const [activos] = await Promise.all([cargarTiposDocumento(), cargarProductos()]);
      if (cancelled) return;
      const codigo = activos[0]?.codigo || 'COMPROBANTE_CONTABLE';
      setForm(emptyForm(codigo));
      await refrescarSiguienteNumero(codigo);
    })();
    return () => {
      cancelled = true;
    };
  }, [modalOpen, cargarTiposDocumento, cargarProductos, refrescarSiguienteNumero]);

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

  const cuerpoComprobantes = (
    <>
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
              <TableHead>Ejecutado por</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead>Actualizado</TableHead>
              <TableHead>Movs</TableHead>
              <TableHead>Productos</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Salida</TableHead>
              <TableHead>Valor neto</TableHead>
              <TableHead>Tipo mov.</TableHead>
              <TableHead>Hash</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="py-8 text-center text-sm text-muted-foreground">
                  Cargando comprobantes contables...
                </TableCell>
              </TableRow>
            ) : rows.length ? (
              rows.map((row) => {
                const neto = Number(row.valorEntrada || 0) - Number(row.valorSalida || 0);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="min-w-48">
                      <div className="font-medium text-foreground">{row.tipo}</div>
                      <div className="font-mono text-xs text-muted-foreground">{row.numero}</div>
                      {row.comprobanteEntrada?.numero ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Entrada: {row.comprobanteEntrada.tipo || 'RECEPCION'} · {row.comprobanteEntrada.numero}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="min-w-40">
                      <div className="text-sm text-foreground">{textoUsuarioComprobante(row.usuario)}</div>
                      {row.usuario?.correo && row.usuario?.nombre ? (
                        <div className="text-xs text-muted-foreground">{row.usuario.correo}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(row.creadoEn || row.fechaPrimera)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(row.actualizadoEn || row.fechaUltima)}
                    </TableCell>
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
                    <TableCell className={neto >= 0 ? 'text-success' : 'text-destructive'}>
                      {money(neto)}
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-56 flex-wrap gap-1">
                        {row.tiposMovimiento.map((tipo) => (
                          <Badge
                            key={tipo}
                            variant="outline"
                            className="border-border bg-card font-normal text-foreground"
                            title={tipo}
                          >
                            {labelTipoMovimientoLedger(tipo)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{shortHash(row.ultimoHash)}</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={11} className="py-8 text-center text-sm text-muted-foreground">
                  No hay comprobantes contables registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );

  const acciones = (
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
  );

  const modales = (
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
        <DialogContent className="w-[calc(100%-2rem)] max-h-[90dvh] max-w-2xl overflow-y-auto sm:max-w-2xl">
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
              <Select
                value={form.sku}
                onValueChange={(value) => setForm((prev) => ({ ...prev, sku: value }))}
                disabled={saving || productosLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={productosLoading ? 'Cargando productos...' : 'Selecciona un SKU'} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {productosConSku.map((p) => (
                    <SelectItem key={p.sku} value={p.sku as string}>
                      {p.sku} · {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {productosLoading
                  ? 'Cargando catálogo de productos...'
                  : productosConSku.length
                    ? 'Solo productos activos con SKU registrado en el catálogo.'
                    : 'No hay productos activos con SKU en el catálogo.'}
              </p>
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
            <Button type="button" onClick={() => void guardarComprobante()} disabled={saving || !form.sku}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (embedded) {
    return (
      <>
        {modales}
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Un comprobante = numero de secuencia parametrizable (documentos soporte) con auditoria del ejecutor.
            </p>
            {acciones}
          </div>
          <div className="space-y-3">{cuerpoComprobantes}</div>
        </div>
      </>
    );
  }

  return (
    <>
      {modales}
      <Card>
        <CardHeader className="flex flex-col gap-4 space-y-0 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Comprobantes contables
            </CardTitle>
            <CardDescription>
              Un comprobante = numero de secuencia parametrizable (documentos soporte) con auditoria del ejecutor.
            </CardDescription>
          </div>
          {acciones}
        </CardHeader>
        <CardContent className="space-y-3">
          {cuerpoComprobantes}
        </CardContent>
      </Card>
    </>
  );
}
