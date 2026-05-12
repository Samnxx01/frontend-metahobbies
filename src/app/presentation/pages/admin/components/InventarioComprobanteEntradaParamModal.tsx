import React, { useEffect, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { toast } from 'react-toastify';
import inventarioService from '@/app/services/inventarioService';
import type { InventarioOrdenCompra, RecepcionOrdenCompraResponse } from '@/app/services/inventarioService';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InventarioDocumentoSoporteConfigModal, {
  consumeDocNumero,
  loadDocumentoSoporteTipos,
  nextDocNumero,
  saveDocumentoSoporteTipos,
  type DocumentoSoporteTipoConfig,
} from './InventarioDocumentoSoporteConfigModal';

export type InventarioComprobanteEntradaParamValues = {
  ordenId: string;
  documentoTipo: string;
  documentoNumero: string;
};

export type InventarioComprobanteEntradaParamModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordenesCompra: InventarioOrdenCompra[];
  saving?: boolean;
  onPreview: (payload: {
    data: RecepcionOrdenCompraResponse;
    documentoSoporte: { tipo: string; numero: string };
  }) => void;
};

const buildRecepcionItems = (oc: InventarioOrdenCompra) =>
  (oc.items || [])
    .map((it, index) => {
      const cantidadOrdenada = Number(it.cantidadOrdenada || 0);
      const cantidadRecibida = Number((it as any).cantidadRecibida || 0);
      const pendiente = Math.max(0, cantidadOrdenada - cantidadRecibida);
      return {
        ordenItemIndex: index,
        sku: String(it.sku || '').trim(),
        cantidadRecibida: pendiente,
      };
    })
    .filter((it) => it.sku && it.cantidadRecibida > 0);

export default function InventarioComprobanteEntradaParamModal({
  open,
  onOpenChange,
  ordenesCompra,
  saving = false,
  onPreview,
}: InventarioComprobanteEntradaParamModalProps): React.ReactElement {
  const ordenesSorted = useMemo(
    () => [...ordenesCompra].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')) || String(b.numeroOrden || '').localeCompare(String(a.numeroOrden || ''))),
    [ordenesCompra]
  );

  const [values, setValues] = useState<InventarioComprobanteEntradaParamValues>({
    ordenId: '',
    documentoTipo: 'RECEPCION_OC',
    documentoNumero: '',
  });
  const [tiposDoc, setTiposDoc] = useState<DocumentoSoporteTipoConfig[]>([]);
  const [configOpen, setConfigOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const orden = useMemo(() => ordenesSorted.find((oc) => oc._id === values.ordenId) ?? null, [ordenesSorted, values.ordenId]);
  const ordenTienePendienteRecepcion = useMemo(
    () => Boolean(orden) && buildRecepcionItems(orden as InventarioOrdenCompra).length > 0,
    [orden]
  );

  const canPreview = Boolean(orden) && ordenTienePendienteRecepcion && !saving && !submitting;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loaded = loadDocumentoSoporteTipos().filter((t) => t.activo);
    setTiposDoc(loaded);
    if (loaded.length && !loaded.some((t) => t.codigo === values.documentoTipo)) {
      setValues((p) => ({ ...p, documentoTipo: loaded[0].codigo }));
    }
    inventarioService.listarDocumentosSoporte()
      .then((serverRows) => {
        if (cancelled) return;
        const activos = serverRows.filter((t) => t.activo);
        if (!activos.length) return;
        saveDocumentoSoporteTipos(serverRows);
        setTiposDoc(activos);
        if (!activos.some((t) => t.codigo === values.documentoTipo)) {
          setValues((p) => ({ ...p, documentoTipo: activos[0].codigo, documentoNumero: '' }));
        }
      })
      .catch((error) => {
        console.error('Error cargando documentos soporte:', error);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Si el número está vacío, sugiere el siguiente consecutivo del tipo
    if (!values.documentoNumero.trim() && values.documentoTipo) {
      const { numero } = nextDocNumero(values.documentoTipo);
      if (numero) setValues((p) => ({ ...p, documentoNumero: numero }));
    }
  }, [open, values.documentoTipo]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setValues({ ordenId: '', documentoTipo: 'RECEPCION_OC', documentoNumero: '' });
        }
      }}
    >
      <DialogContent className="max-w-xl border-border bg-background text-foreground">
        <DialogHeader className="pr-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Parametrizar comprobante de entrada
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Define primero el documento soporte y luego selecciona la orden de compra para generar el comprobante.
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full shrink-0 sm:w-auto"
              onClick={() => setConfigOpen(true)}
              disabled={saving}
            >
              Parametrizar
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo documento soporte</Label>
              <div className="w-full">
                <Select
                  value={values.documentoTipo || undefined}
                  onValueChange={(codigo) => setValues((p) => ({ ...p, documentoTipo: codigo, documentoNumero: '' }))}
                >
                  <SelectTrigger className="border-input bg-background">
                    <SelectValue placeholder={tiposDoc.length ? 'Selecciona tipo' : 'Configura tipos'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 border-border bg-popover">
                    {tiposDoc.map((t) => (
                      <SelectItem key={t.id} value={t.codigo}>
                        {t.codigo} · {t.prefijo}-{String(t.siguiente).padStart(Math.max(1, t.padding), '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Número documento soporte</Label>
              <div className="flex gap-2">
                <Input
                  value={values.documentoNumero}
                  onChange={(e) => setValues((p) => ({ ...p, documentoNumero: e.target.value }))}
                  className="border-input bg-background"
                  placeholder="Ej. REC-000123"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving || !values.documentoTipo}
                  onClick={() => {
                    const { numero } = nextDocNumero(values.documentoTipo);
                    if (numero) setValues((p) => ({ ...p, documentoNumero: numero }));
                  }}
                  title="Sugerir consecutivo"
                >
                  Generar
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Orden de compra</Label>
            <Select value={values.ordenId || undefined} onValueChange={(ordenId) => setValues((p) => ({ ...p, ordenId }))}>
              <SelectTrigger className="border-input bg-background">
                <SelectValue placeholder={ordenesSorted.length ? 'Selecciona OC' : 'No hay órdenes de compra'} />
              </SelectTrigger>
              <SelectContent className="max-h-72 border-border bg-popover">
                {ordenesSorted.map((oc) => {
                  const tienePendiente = buildRecepcionItems(oc).length > 0;
                  return (
                  <SelectItem key={oc._id} value={oc._id}>
                    {oc.numeroOrden} · {oc.proveedor?.nombre || 'Proveedor'} · {oc.estado}{tienePendiente ? '' : ' · (sin pendiente)'}
                  </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {orden ? (
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                <p className="text-foreground">
                  <span className="text-muted-foreground">Proveedor: </span>
                  {orden.proveedor?.nombre} (NIT {orden.proveedor?.nit})
                </p>
                <p className="text-muted-foreground">OC: {orden.numeroOrden}</p>
                {!ordenTienePendienteRecepcion ? (
                  <p className="mt-1 text-xs text-muted-foreground">Esta OC no tiene cantidades pendientes por recibir; no es posible generar comprobante.</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!canPreview}
            onClick={async () => {
              if (!orden) return;
              const tipo = values.documentoTipo.trim();
              if (!tipo) return;
              const numeroDigitado = values.documentoNumero.trim();
              const expected = nextDocNumero(tipo).numero;
              const numeroFinal = numeroDigitado || expected;
              if (!numeroFinal) return;

              try {
                setSubmitting(true);
                const items = buildRecepcionItems(orden);
                if (!items.length) {
                  toast.error('La orden no tiene cantidades pendientes por recibir.');
                  return;
                }
                const data = await inventarioService.registrarRecepcionOrdenCompra(orden._id, {
                  numeroRecepcion: numeroFinal,
                  documentoSoporte: { tipo, numero: numeroFinal },
                  items,
                });
                if (!numeroDigitado || numeroFinal === expected) {
                  consumeDocNumero(tipo);
                  const nextRows = loadDocumentoSoporteTipos();
                  await inventarioService.guardarDocumentosSoporte(nextRows);
                  setTiposDoc(nextRows.filter((t) => t.activo));
                }
                onPreview({
                  data,
                  documentoSoporte: { tipo, numero: numeroFinal },
                });
              } catch (error) {
                console.error('Error actualizando consecutivo documento soporte:', error);
                toast.error(error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo actualizar el consecutivo.');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? 'Generando...' : 'Ver comprobante'}
          </Button>
        </DialogFooter>
      </DialogContent>

      <InventarioDocumentoSoporteConfigModal
        open={configOpen}
        onOpenChange={setConfigOpen}
        onSaved={(next) => {
          const activos = next.filter((t) => t.activo);
          setTiposDoc(activos);
          if (activos.length && !activos.some((t) => t.codigo === values.documentoTipo)) {
            setValues((p) => ({ ...p, documentoTipo: activos[0].codigo, documentoNumero: '' }));
          } else {
            setValues((p) => ({ ...p, documentoNumero: '' }));
          }
        }}
      />
    </Dialog>
  );
}


