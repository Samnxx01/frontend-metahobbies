import React, { useEffect, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
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

const buildComprobanteData = (oc: InventarioOrdenCompra, documentoNumero: string): RecepcionOrdenCompraResponse => {
  const itemsRecibidos = (oc.items || [])
    .map((it) => ({
      sku: String(it.sku || ''),
      cantidadRecibida: Number((it as any).cantidadRecibida || 0),
      costoUnitario: Number(it.costoUnitario || 0),
      bodega: String(it.bodega || ''),
    }))
    .filter((it) => it.sku && it.bodega && it.cantidadRecibida > 0);

  const numeroRecepcion = documentoNumero.trim() || oc.numeroRemision?.trim() || oc.numeroFacturaElectronico?.trim() || `OC-${oc.numeroOrden}`;

  return {
    orden: oc,
    recepcion: {
      _id: `local-${oc._id}`,
      numeroRecepcion,
      items: itemsRecibidos,
    },
  };
};

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

  const orden = useMemo(() => ordenesSorted.find((oc) => oc._id === values.ordenId) ?? null, [ordenesSorted, values.ordenId]);
  const ordenTieneEntrada = useMemo(
    () => Boolean(orden) && (orden?.items || []).some((it) => Number((it as any).cantidadRecibida || 0) > 0),
    [orden]
  );

  const canPreview = Boolean(orden) && ordenTieneEntrada && !saving;

  useEffect(() => {
    if (!open) return;
    const loaded = loadDocumentoSoporteTipos().filter((t) => t.activo);
    setTiposDoc(loaded);
    if (loaded.length && !loaded.some((t) => t.codigo === values.documentoTipo)) {
      setValues((p) => ({ ...p, documentoTipo: loaded[0].codigo }));
    }
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
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Parametrizar comprobante de entrada
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Define primero el documento soporte y luego selecciona la orden de compra para generar el comprobante.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo documento soporte</Label>
              <div className="flex gap-2">
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
                <Button type="button" variant="outline" onClick={() => setConfigOpen(true)} disabled={saving}>
                  Parametrizar
                </Button>
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
                  const tieneEntrada = (oc.items || []).some((it) => Number((it as any).cantidadRecibida || 0) > 0);
                  return (
                  <SelectItem key={oc._id} value={oc._id}>
                    {oc.numeroOrden} · {oc.proveedor?.nombre || 'Proveedor'} · {oc.estado}{tieneEntrada ? '' : ' · (sin entrada)'}
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
                {!ordenTieneEntrada ? (
                  <p className="mt-1 text-xs text-muted-foreground">Esta OC aún no tiene entradas registradas; no es posible generar comprobante.</p>
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
            onClick={() => {
              if (!orden) return;
              const tipo = values.documentoTipo.trim();
              if (!tipo) return;
              // Consume el consecutivo si el usuario no digitó otro
              const numeroFinal = values.documentoNumero.trim() ? values.documentoNumero.trim() : consumeDocNumero(tipo).numero;
              if (!numeroFinal) return;

              // Incrementa secuencia si el número coincide con el esperado (caso típico)
              // Si el usuario editó manualmente, dejamos la secuencia tal cual.
              const expected = nextDocNumero(tipo).numero;
              if (numeroFinal === expected) {
                consumeDocNumero(tipo);
              }
              const data = buildComprobanteData(orden, numeroFinal);
              onPreview({
                data,
                documentoSoporte: { tipo, numero: numeroFinal },
              });
            }}
          >
            Ver comprobante
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

