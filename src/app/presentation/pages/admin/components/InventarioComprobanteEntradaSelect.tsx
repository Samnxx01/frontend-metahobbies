import { useEffect, useMemo, useState } from 'react';
import { toastAjusteError } from './inventario-ajuste/inventarioAjusteAlerts';
import inventarioService, {
  type ComprobanteEntradaAjuste,
  type ComprobanteEntradaAjusteItem,
  type TipoAjuste,
} from '@/app/services/inventarioService';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type ComprobanteEntradaSeleccion = {
  recepcionId: string;
  numeroRecepcion: string;
  bodega: string;
  sku: string;
  costoUnitario: number;
  cantidadRecibida: number;
};

type InventarioComprobanteEntradaSelectProps = {
  recepcionCompraId: string;
  sku: string;
  bodega: string;
  onSelect: (seleccion: ComprobanteEntradaSeleccion | null) => void;
  disabled?: boolean;
  /** Oculta el campo bodega duplicado cuando el padre muestra «Bodega origen». */
  ocultarCampoBodega?: boolean;
  etiquetaBodega?: string;
  tipoAjusteDireccion?: TipoAjuste | null;
};

const formatComprobanteLabel = (comprobante: ComprobanteEntradaAjuste): string => {
  const fecha = comprobante.createdAt
    ? new Date(comprobante.createdAt).toLocaleDateString('es-CO')
    : '';
  return fecha
    ? `${comprobante.numeroRecepcion} · ${fecha}`
    : comprobante.numeroRecepcion;
};

export default function InventarioComprobanteEntradaSelect({
  recepcionCompraId,
  sku,
  bodega,
  onSelect,
  disabled = false,
  ocultarCampoBodega = false,
  etiquetaBodega = 'Bodega',
  tipoAjusteDireccion = null,
}: InventarioComprobanteEntradaSelectProps): React.ReactElement {
  const [comprobantes, setComprobantes] = useState<ComprobanteEntradaAjuste[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onSelect(null);
    if (!tipoAjusteDireccion) {
      setComprobantes([]);
      setLoading(false);
      return;
    }
    let mounted = true;
    const load = async (): Promise<void> => {
      try {
        setLoading(true);
        const data = await inventarioService.listarComprobantesEntradaAjustes();
        if (!mounted) return;
        const asociados = tipoAjusteDireccion === 'NEGATIVO'
          ? data
            .map((comprobante) => ({
              ...comprobante,
              items: comprobante.items.filter((item) => Number(item.disponibleKardex || 0) > 0),
            }))
            .filter((comprobante) => comprobante.items.length > 0)
          : data;
        setComprobantes(asociados);
      } catch (error) {
        console.error('Error cargando comprobantes de entrada:', error);
        toastAjusteError(error, 'No se pudieron cargar los comprobantes de entrada aprobados.');
        if (mounted) setComprobantes([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [tipoAjusteDireccion]);

  const comprobanteActual = useMemo(
    () => comprobantes.find((item) => item.recepcionId === recepcionCompraId) ?? null,
    [comprobantes, recepcionCompraId],
  );

  const itemsSku = useMemo((): ComprobanteEntradaAjusteItem[] => {
    if (!comprobanteActual) return [];
    return comprobanteActual.items;
  }, [comprobanteActual]);

  const resolverBodega = (
    comprobante: ComprobanteEntradaAjuste,
    item: ComprobanteEntradaAjusteItem | null,
  ): string => {
    if (item?.bodega) return String(item.bodega).trim();
    if (comprobante.bodega) return String(comprobante.bodega).trim();
    return String(comprobante.bodegas?.[0] || '').trim();
  };

  const emitirSeleccion = (
    comprobante: ComprobanteEntradaAjuste | null,
    item: ComprobanteEntradaAjusteItem | null,
  ): void => {
    if (!comprobante) {
      onSelect(null);
      return;
    }
    if (!item) {
      const bodegaComprobante = resolverBodega(comprobante, null);
      if (!bodegaComprobante) {
        onSelect(null);
        return;
      }
      onSelect({
        recepcionId: comprobante.recepcionId,
        numeroRecepcion: comprobante.numeroRecepcion,
        bodega: bodegaComprobante,
        sku: '',
        costoUnitario: 0,
        cantidadRecibida: 0,
      });
      return;
    }
    onSelect({
      recepcionId: comprobante.recepcionId,
      numeroRecepcion: comprobante.numeroRecepcion,
      bodega: resolverBodega(comprobante, item),
      sku: item.sku,
      costoUnitario: item.costoUnitario,
      cantidadRecibida: item.cantidadRecibida,
    });
  };

  const handleComprobanteChange = (nextRecepcionId: string): void => {
    const comprobante = comprobantes.find((item) => item.recepcionId === nextRecepcionId) ?? null;
    if (!comprobante) {
      onSelect(null);
      return;
    }
    const primerItem = comprobante.items[0] ?? null;
    emitirSeleccion(comprobante, primerItem);
  };

  const handleSkuChange = (nextSku: string): void => {
    if (!comprobanteActual) return;
    const item = comprobanteActual.items.find((row) => row.sku === nextSku) ?? null;
    emitirSeleccion(comprobanteActual, item);
  };

  return (
    <div className="space-y-4 md:col-span-2 xl:col-span-4">
      <div className={`grid gap-4 ${ocultarCampoBodega ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
        <div className="space-y-2">
          <Label>Comprobante de entrada (aprobado)</Label>
          <Select
            value={recepcionCompraId || undefined}
            onValueChange={handleComprobanteChange}
            disabled={disabled || !tipoAjusteDireccion || loading || comprobantes.length === 0}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  loading
                    ? 'Cargando comprobantes...'
                    : !tipoAjusteDireccion
                      ? 'Primero selecciona el tipo de ajuste'
                    : comprobantes.length === 0
                      ? 'Sin documentos asociados al tipo'
                      : 'Selecciona comprobante'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {comprobantes.map((comprobante) => (
                <SelectItem key={comprobante.recepcionId} value={comprobante.recepcionId}>
                  {formatComprobanteLabel(comprobante)}
                  {comprobante.bodega ? ` · ${comprobante.bodega}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>SKU del comprobante</Label>
          <Select
            value={sku || undefined}
            onValueChange={handleSkuChange}
            disabled={disabled || !comprobanteActual || itemsSku.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona SKU" />
            </SelectTrigger>
            <SelectContent>
              {itemsSku.map((item) => (
                <SelectItem key={`${comprobanteActual?.recepcionId}-${item.sku}-${item.bodega}`} value={item.sku}>
                  {item.sku} · recibido {Number(item.cantidadRecibida || 0).toLocaleString('es-CO')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {ocultarCampoBodega ? null : (
          <div className="space-y-2">
            <Label>{etiquetaBodega}</Label>
            <Input
              value={bodega}
              readOnly
              disabled
              placeholder="Se completa al elegir comprobante"
              className="bg-muted"
            />
          </div>
        )}
      </div>
    </div>
  );
}
