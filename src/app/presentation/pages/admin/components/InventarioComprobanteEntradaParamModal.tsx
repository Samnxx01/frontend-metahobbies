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
import {
  FLUJO_COMPRAS_PASOS,
  mensajeErrorComprasInventario,
  TIPO_DOCUMENTO_ENTRADA_FISICA,
} from '../inventario/inventarioComprasMensajes';
import { getOrdenCompraId } from '@/app/presentation/pages/admin/utils/ordenCompraIdUtils';
import InventarioDocumentoSoporteConfigModal, {
  labelDocumentoSoporte,
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
  /** false = solo subproceso manual (comprobante); no mezclar con OC ya recibidas en automatico. */
  recepcionAutomatica?: boolean;
};

export const buildRecepcionItems = (oc: InventarioOrdenCompra) =>
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

export const ordenCompraTienePendienteRecepcion = (oc: InventarioOrdenCompra): boolean =>
  buildRecepcionItems(oc).length > 0;

const ordenCompraEstaConfirmada = (oc: InventarioOrdenCompra): boolean =>
  String(oc?.estado || '').trim().toUpperCase() === 'CONFIRMADO';

const tiposCatalogoActivos = (rows: DocumentoSoporteTipoConfig[]): DocumentoSoporteTipoConfig[] =>
  rows.filter((t) => t.activo).sort((a, b) => a.codigo.localeCompare(b.codigo));

const resolverTipoDocumentoDefault = (rows: DocumentoSoporteTipoConfig[]): string => {
  const activos = tiposCatalogoActivos(rows);
  if (activos.some((t) => t.codigo === TIPO_DOCUMENTO_ENTRADA_FISICA)) return TIPO_DOCUMENTO_ENTRADA_FISICA;
  return activos[0]?.codigo || TIPO_DOCUMENTO_ENTRADA_FISICA;
};

const USO_TIPO_CATALOGO: Record<string, string> = {
  RECEPCION_OC: 'Comprobante fisico · este paso',
  COMPROBANTE_ENTRADA: 'Contable · al confirmar entrada',
  COMPROBANTE_ORDEN_COMPRA: 'Contable · al confirmar OC',
  COMPROBANTE_CONTABLE: 'Ajustes manuales',
};

export default function InventarioComprobanteEntradaParamModal({
  open,
  onOpenChange,
  ordenesCompra,
  saving = false,
  onPreview,
  recepcionAutomatica = false,
}: InventarioComprobanteEntradaParamModalProps): React.ReactElement {
  const ordenesSorted = useMemo(
    () => [...ordenesCompra].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')) || String(b.numeroOrden || '').localeCompare(String(a.numeroOrden || ''))),
    [ordenesCompra]
  );

  const ordenesElegibles = useMemo(
    () => ordenesSorted.filter((oc) => ordenCompraEstaConfirmada(oc) && ordenCompraTienePendienteRecepcion(oc)),
    [ordenesSorted],
  );

  const [values, setValues] = useState<InventarioComprobanteEntradaParamValues>({
    ordenId: '',
    documentoTipo: TIPO_DOCUMENTO_ENTRADA_FISICA,
    documentoNumero: '',
  });
  const [tiposDoc, setTiposDoc] = useState<DocumentoSoporteTipoConfig[]>([]);
  const [configOpen, setConfigOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const orden = useMemo(
    () => ordenesSorted.find((oc) => getOrdenCompraId(oc) === values.ordenId) ?? null,
    [ordenesSorted, values.ordenId],
  );
  const ordenTienePendienteRecepcion = useMemo(
    () => Boolean(orden) && buildRecepcionItems(orden as InventarioOrdenCompra).length > 0,
    [orden]
  );

  const tieneSecuenciaEntrada = tiposDoc.some((t) => t.codigo === TIPO_DOCUMENTO_ENTRADA_FISICA);

  const tipoEntradaConfig = useMemo(
    () => tiposDoc.find((t) => t.codigo === TIPO_DOCUMENTO_ENTRADA_FISICA) ?? null,
    [tiposDoc],
  );

  const numeroSugerido = useMemo(
    () => nextDocNumero(TIPO_DOCUMENTO_ENTRADA_FISICA, tiposDoc).numero,
    [tiposDoc],
  );

  const canPreview =
    Boolean(orden)
    && ordenTienePendienteRecepcion
    && tieneSecuenciaEntrada
    && Boolean(values.documentoNumero.trim() || numeroSugerido)
    && !saving
    && !submitting;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setTiposDoc([]);
    inventarioService.listarDocumentosSoporte()
      .then((serverRows) => {
        if (cancelled) return;
        const activos = tiposCatalogoActivos(serverRows);
        const tipoDefault = resolverTipoDocumentoDefault(serverRows);
        setTiposDoc(activos);
        const { numero } = nextDocNumero(tipoDefault, activos);
        setValues((p) => ({
          ...p,
          documentoTipo: tipoDefault,
          documentoNumero: numero || '',
        }));
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
    // Si el número está vacío, sugiere el consecutivo de RECEPCION_OC
    if (!values.documentoNumero.trim() && tiposDoc.length) {
      const { numero } = nextDocNumero(TIPO_DOCUMENTO_ENTRADA_FISICA, tiposDoc);
      if (numero) {
        setValues((p) => ({
          ...p,
          documentoTipo: TIPO_DOCUMENTO_ENTRADA_FISICA,
          documentoNumero: numero,
        }));
      }
    }
  }, [open, values.documentoNumero, tiposDoc]);

  useEffect(() => {
    if (!open || !tiposDoc.length || !tieneSecuenciaEntrada) return;
    if (values.documentoTipo !== TIPO_DOCUMENTO_ENTRADA_FISICA) {
      const { numero } = nextDocNumero(TIPO_DOCUMENTO_ENTRADA_FISICA, tiposDoc);
      setValues((p) => ({
        ...p,
        documentoTipo: TIPO_DOCUMENTO_ENTRADA_FISICA,
        documentoNumero: numero || p.documentoNumero,
      }));
    }
  }, [open, values.documentoTipo, tiposDoc, tieneSecuenciaEntrada]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setValues({ ordenId: '', documentoTipo: TIPO_DOCUMENTO_ENTRADA_FISICA, documentoNumero: '' });
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
                {recepcionAutomatica
                  ? 'Define el documento soporte y la orden. Las OC sin pendiente (ya recibidas) no aparecen en la lista.'
                  : 'Recepción manual: OC con pendiente. El comprobante queda en borrador; al confirmar no mueve kardex. Use Movimientos para el subproceso de entrada.'}
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
              <Select
                value={values.documentoTipo}
                onValueChange={(codigo) => {
                  if (codigo !== TIPO_DOCUMENTO_ENTRADA_FISICA) return;
                  const { numero } = nextDocNumero(TIPO_DOCUMENTO_ENTRADA_FISICA, tiposDoc);
                  setValues((p) => ({
                    ...p,
                    documentoTipo: TIPO_DOCUMENTO_ENTRADA_FISICA,
                    documentoNumero: numero || '',
                  }));
                }}
                disabled={!tiposDoc.length || !tieneSecuenciaEntrada}
              >
                <SelectTrigger className="border-input bg-background [&>span]:line-clamp-none">
                  <SelectValue placeholder={tiposDoc.length ? 'Selecciona tipo' : 'Configura tipos en Parametrizar'} />
                </SelectTrigger>
                <SelectContent className="max-h-72 min-w-[var(--radix-select-trigger-width)] border-border bg-popover">
                  {tiposDoc.map((t) => {
                    const esEntradaFisica = t.codigo === TIPO_DOCUMENTO_ENTRADA_FISICA;
                    const uso = USO_TIPO_CATALOGO[t.codigo] || 'Otro paso del flujo';
                    return (
                      <SelectItem
                        key={t.id || t.codigo}
                        value={t.codigo}
                        disabled={!esEntradaFisica}
                        className={esEntradaFisica ? undefined : 'opacity-60'}
                      >
                        {labelDocumentoSoporte(t)} · {uso}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {tipoEntradaConfig ? (
                <p className="text-xs text-muted-foreground">
                  Prefijo {tipoEntradaConfig.prefijo} · {tipoEntradaConfig.padding} digitos · siguiente #{tipoEntradaConfig.siguiente}
                </p>
              ) : null}
              {!tieneSecuenciaEntrada ? (
                <p className="text-xs text-destructive">
                  Falta {TIPO_DOCUMENTO_ENTRADA_FISICA} en el catalogo. Use «Parametrizar» para crearla o activarla.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Solo {TIPO_DOCUMENTO_ENTRADA_FISICA} es seleccionable aqui. Los demas tipos del catalogo aparecen como referencia.
                </p>
              )}
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
                  disabled={saving || !tieneSecuenciaEntrada}
                  onClick={() => {
                    const { numero } = nextDocNumero(TIPO_DOCUMENTO_ENTRADA_FISICA, tiposDoc);
                    if (numero) {
                      setValues((p) => ({
                        ...p,
                        documentoTipo: TIPO_DOCUMENTO_ENTRADA_FISICA,
                        documentoNumero: numero,
                      }));
                    }
                  }}
                  title="Sugerir consecutivo"
                >
                  Generar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Secuencia del comprobante fisico de entrada ({TIPO_DOCUMENTO_ENTRADA_FISICA}). Al confirmar se genera aparte el comprobante contable (COMPROBANTE_ENTRADA).
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Orden de compra</Label>
            <Select value={values.ordenId} onValueChange={(ordenId) => setValues((p) => ({ ...p, ordenId }))}>
              <SelectTrigger className="border-input bg-background">
                <SelectValue
                  placeholder={
                    ordenesElegibles.length
                      ? 'Selecciona OC con pendiente'
                      : ordenesSorted.length
                        ? 'No hay OC CONFIRMADAS con cantidades pendientes'
                        : 'No hay órdenes de compra'
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-72 border-border bg-popover">
                {ordenesElegibles.map((oc) => (
                  <SelectItem key={getOrdenCompraId(oc)} value={getOrdenCompraId(oc)}>
                    {oc.numeroOrden} · {oc.proveedor?.nombre || 'Proveedor'} · {oc.estado}
                  </SelectItem>
                ))}
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
              const tipo = TIPO_DOCUMENTO_ENTRADA_FISICA;
              if (!tieneSecuenciaEntrada) {
                toast.error(`Configure la secuencia ${TIPO_DOCUMENTO_ENTRADA_FISICA} en Parametrizar.`);
                return;
              }
              const numeroDigitado = values.documentoNumero.trim();
              const expected = nextDocNumero(tipo, tiposDoc).numero;
              const numeroFinal = numeroDigitado || expected;
              if (!numeroFinal) return;

              try {
                setSubmitting(true);
                const ordenFresh = await inventarioService.obtenerOrdenCompra(getOrdenCompraId(orden));
                const items = buildRecepcionItems(ordenFresh);
                if (!items.length) {
                  toast.error(
                    mensajeErrorComprasInventario(
                      ordenFresh.estado === 'RECIBIDA_TOTAL'
                        ? new Error(
                            'Esta orden ya fue recibida por completo (recepcion automatica o comprobante previo).',
                          )
                        : new Error('No hay cantidades pendientes por recibir en esta orden.'),
                    ),
                    { autoClose: 10000 },
                  );
                  return;
                }
                const data = await inventarioService.registrarRecepcionOrdenCompra(getOrdenCompraId(ordenFresh), {
                  confirmar: false,
                  numeroRecepcion: numeroFinal,
                  documentoSoporte: { tipo, numero: numeroFinal },
                  items,
                });
                const serverRows = await inventarioService.listarDocumentosSoporte();
                setTiposDoc(tiposCatalogoActivos(serverRows));
                toast.info(
                  `Borrador ${numeroFinal} creado. Confirme el comprobante para mover inventario y ocupar la secuencia.`,
                  { autoClose: 10000 },
                );
                onPreview({
                  data,
                  documentoSoporte: { tipo, numero: numeroFinal },
                });
              } catch (error) {
                console.error('Error registrando comprobante de entrada:', error);
                toast.error(
                  mensajeErrorComprasInventario(error, 'No se pudo registrar el comprobante de entrada.'),
                  { autoClose: 10000 },
                );
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? 'Generando...' : 'Generar comprobante'}
          </Button>
        </DialogFooter>
      </DialogContent>

      <InventarioDocumentoSoporteConfigModal
        open={configOpen}
        onOpenChange={setConfigOpen}
        onSaved={async (next) => {
          const serverRows = next?.length ? next : await inventarioService.listarDocumentosSoporte();
          const activos = tiposCatalogoActivos(serverRows);
          setTiposDoc(activos);
          const tipoActual = TIPO_DOCUMENTO_ENTRADA_FISICA;
          const { numero } = nextDocNumero(tipoActual, activos);
          setValues((p) => ({
            ...p,
            documentoTipo: tipoActual,
            documentoNumero: numero || '',
          }));
        }}
      />
    </Dialog>
  );
}


