import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import inventarioService, {
  type BodegaInventario,
  type InventarioOrdenCompra,
  type InventarioProveedor,
} from '@/app/services/inventarioService';
import type { BackendProducto } from '@/app/services/productosService';
import reglasContablesService, { type BaseCalculoRegla } from '@/app/services/reglasContablesService';
import { Button } from '@/components/ui/button';
import { GovernedButton } from '@/app/presentation/actions';
import type { ActionId } from '@/app/presentation/actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { descuentoMontoLinea } from '@/app/presentation/pages/admin/utils/ordenCompraLineaCalculo';
import {
  mensajeErrorComprasInventario,
  mensajeExitoCrearOrden,
} from '../inventario/inventarioComprasMensajes';
import { getOrdenCompraId } from '@/app/presentation/pages/admin/utils/ordenCompraIdUtils';

const moneyCo = (n: number): string =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

/**
 * Traducción accionable de `motivo` de `resolverTarifaAplicable` (backend). Espeja el mapa
 * `MENSAJE_SIN_REGLA_IMPUESTO` de `inventarioComprasOrdenService`: el backend bloquea la orden con
 * estos mismos casos, así que conviene que el usuario los vea antes de intentar guardar.
 */
const MOTIVO_SIN_REGLA: Record<string, string> = {
  SIN_REGLAS_TRIBUTO_AMBITO:
    'No hay ninguna regla contable de IVA activa para el ámbito de compras. Parametrízala en Reglas contables.',
  PROVEEDOR_NO_DISPONIBLE: 'El proveedor no existe o está inactivo.',
  PROVEEDOR_NO_APLICA_IVA:
    'El proveedor no está marcado como responsable de IVA. Edítalo y activa «Aplica IVA».',
  PROVEEDOR_NO_CUMPLE_REGLA:
    'El proveedor no cumple ninguna regla contable de IVA de compras. Revisa la asignación regla ↔ proveedor y sus responsabilidades DIAN.',
  PROVEEDOR_NO_INFORMADO: 'Selecciona el proveedor para resolver la regla contable de IVA.',
};

const mensajeMotivoSinRegla = (motivo: string | null): string =>
  MOTIVO_SIN_REGLA[String(motivo || '').trim().toUpperCase()]
  || 'No se pudo resolver la regla contable de IVA aplicable a la compra.';

type LineId = string;

type OcLineDraft = {
  id: LineId;
  sku: string;
  /** Referencia al catálogo de productos; se resuelve al elegir el SKU. */
  productoId: string;
  nombreProducto: string;
  cantidad: string;
  precioUnitario: string;
  descuento: string;
  impuestoPorcentaje: string;
  /** Código de la regla contable usada para autocompletar el % de impuesto; null si fue editado a mano. */
  codigoReglaImpuesto: string | null;
  baseCalculoImpuesto: BaseCalculoRegla | null;
  montoFijoImpuesto: number;
  motivoReglaImpuesto: string | null;
  /** true si la última resolución de tarifa (por SKU) no encontró regla específica por producto o categoría. */
  bodega: string;
};

const newLineId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `l-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Subtotal comercial visible: cantidad por precio, sin impuesto ni descuento. */
const calcSubtotalLinea = (line: OcLineDraft): number =>
  round2((Number(line.cantidad) || 0) * (Number(line.precioUnitario) || 0));

const calcImpuestoLinea = (line: OcLineDraft): number => {
  const bruto = calcSubtotalLinea(line);
  const descuento = Math.min(bruto, Math.max(0, Number(line.descuento) || 0));
  const subtotalComercial = Math.max(0, round2(bruto - descuento));
  const baseCalculo = line.baseCalculoImpuesto || 'SUBTOTAL_COMERCIAL';
  const base = baseCalculo === 'COSTO'
    ? bruto
    : baseCalculo === 'IMPUESTO' || baseCalculo === 'VALOR_IVA'
      ? 0
      : subtotalComercial;
  const taxPercent = Number(line.impuestoPorcentaje) || 0;
  return round2((taxPercent > 0 ? base * (taxPercent / 100) : 0) + (line.montoFijoImpuesto || 0));
};

const calcTotalLinea = (line: OcLineDraft): number => {
  const subtotal = calcSubtotalLinea(line);
  const descuento = Math.min(subtotal, Math.max(0, Number(line.descuento) || 0));
  return Math.max(0, round2(subtotal + calcImpuestoLinea(line) - descuento));
};

const getProveedorId = (proveedor: InventarioProveedor): string =>
  String(proveedor._id || proveedor.iud || '').trim();

export type InventarioOrdenCompraModalProps = {
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  proveedores: InventarioProveedor[];
  bodegas: BodegaInventario[];
  productos: BackendProducto[];
  onCreated: (orden?: InventarioOrdenCompra) => void | Promise<void>;
  /** Si viene definida, el modal opera en modo edición (PUT). */
  ordenEdicion?: InventarioOrdenCompra | null;
  showTrigger?: boolean;
  triggerClassName?: string;
  triggerActionId?: ActionId;
  /** Al pulsar «Nueva orden» desde el trigger (limpia modo edición). */
  onAntesNuevaOrden?: () => void;
  recepcionAutomatica?: boolean;
  /** Códigos de ámbito cuyas reglas de impuesto aplican a la OC (config compras.ambitosReglaImpuesto). */
  ambitosReglaImpuesto?: string[];
};

export default function InventarioOrdenCompraModal({
  open,
  saving,
  onOpenChange,
  proveedores,
  bodegas,
  productos,
  onCreated,
  ordenEdicion = null,
  showTrigger = false,
  triggerClassName = '',
  triggerActionId,
  onAntesNuevaOrden,
  recepcionAutomatica = false,
  ambitosReglaImpuesto,
}: InventarioOrdenCompraModalProps): React.ReactElement {
  const bodegasActivas = useMemo(() => Array.from(
    new Map(
      bodegas
        .filter((b) => b.estado !== false && String(b.nombre || '').trim())
        .map((b) => [String(b.nombre).trim().toUpperCase(), b])
    ).values()
  ), [bodegas]);
  const productosConSku = useMemo(() => Array.from(
    new Map(
      productos
        .filter((p) => String(p.sku || '').trim())
        .map((p) => [String(p.sku).trim().toUpperCase(), p])
    ).values()
  ).sort((a, b) => String(a.sku).localeCompare(String(b.sku))), [productos]);

  const [numeroRemision, setNumeroRemision] = useState('');
  const [numeroFacturaElectronico, setNumeroFacturaElectronico] = useState('');
  const [concepto, setConcepto] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [lines, setLines] = useState<OcLineDraft[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [siguienteNumeroOrden, setSiguienteNumeroOrden] = useState('');
  /**
   * El backend ignora todo % digitado a mano y recalcula desde la ReglaContable. Para que el
   * usuario no descubra el cambio recién en la orden guardada, el primer "Guardar orden" con
   * líneas manuales no envía: reemplaza los % por los de la regla, los muestra en pantalla y pide
   * confirmar. El segundo clic ya guarda. Se reinicia al abrir el modal y al cambiar de proveedor
   * (ambos invalidan las tarifas resueltas).
   */
  const [tarifaManualConfirmada, setTarifaManualConfirmada] = useState(false);

  const ordenEdicionId = getOrdenCompraId(ordenEdicion);
  const esEdicion = Boolean(ordenEdicionId);

  useEffect(() => {
    if (!open) return;
    setTarifaManualConfirmada(false);
    const b0 = bodegasActivas[0]?.nombre ?? '';
    if (esEdicion && ordenEdicion) {
      const oc = ordenEdicion;
      setNumeroRemision(oc.numeroRemision?.trim() || '');
      setNumeroFacturaElectronico(oc.numeroFacturaElectronico?.trim() || '');
      setConcepto(oc.concepto?.trim() || '');
      setJustificacion('');
      const itemLines = (oc.items || []).map((it) => ({
        id: newLineId(),
        sku: String(it.sku || ''),
        productoId: String(it.productoId || ''),
        nombreProducto: String(it.nombreProducto || ''),
        cantidad: String(it.cantidadOrdenada ?? 1),
        precioUnitario: String(it.costoUnitario ?? 0),
        descuento: String(
          (() => {
            const desc = Number(it.descuento || 0);
            if (desc > 0) return String(Math.round(desc));
            const base = Number(it.cantidadOrdenada || 0) * Number(it.costoUnitario || 0);
            const raw = Number(it.descuentoPorcentaje || 0);
            if (raw > 100) return String(Math.round(Math.min(raw, base)));
            if (raw > 0 && base > 0) return String(Math.round((base * raw) / 100));
            return '0';
          })()
        ),
        impuestoPorcentaje: String(
          it.impuestoPorcentaje ??
            (() => {
              const bruto = Number(it.cantidadOrdenada || 0) * Number(it.costoUnitario || 0);
              const dMonto = descuentoMontoLinea(bruto, {
                descuentoPorcentaje: it.descuentoPorcentaje,
                descuento: it.descuento,
              });
              const baseN = Math.max(0, bruto - dMonto);
              const imp = Number(it.impuestos || 0);
              return baseN > 0 && imp > 0 ? Math.round(((imp / baseN) * 100 + Number.EPSILON) * 100) / 100 : 0;
            })()
        ),
        codigoReglaImpuesto: it.codigoReglaImpuesto ?? null,
        baseCalculoImpuesto: null,
        montoFijoImpuesto: 0,
        motivoReglaImpuesto: null,
        bodega: String(it.bodega || b0),
      }));
      setLines(itemLines.length ? itemLines : [{ id: newLineId(), sku: '', productoId: '', nombreProducto: '', cantidad: '1', precioUnitario: '0', descuento: '0', impuestoPorcentaje: '0', codigoReglaImpuesto: null, baseCalculoImpuesto: null, montoFijoImpuesto: 0, motivoReglaImpuesto: null, bodega: b0 }]);
    } else {
      setNumeroRemision('');
      setNumeroFacturaElectronico('');
      setConcepto('');
      setJustificacion('');
      setProveedorId('');
      setLines([
        {
          id: newLineId(),
          sku: '',
          productoId: '',
          nombreProducto: '',
          cantidad: '1',
          precioUnitario: '0',
          descuento: '0',
          impuestoPorcentaje: '0',
          codigoReglaImpuesto: null,
          baseCalculoImpuesto: null,
          montoFijoImpuesto: 0,
          motivoReglaImpuesto: null,
          bodega: b0,
        },
      ]);
    }
  }, [open, bodegasActivas, esEdicion, ordenEdicion, ordenEdicionId]);

  /** Resolver proveedor al editar cuando ya cargó el catálogo (no incluir `proveedores` en el efecto anterior: borraba la selección en «nueva orden» al refrescar la lista). */
  useEffect(() => {
    if (!open || !esEdicion || !ordenEdicion) return;
    const oc = ordenEdicion;
    const nitOc = String(oc.proveedor?.nit || '').trim().replace(/\s+/g, '');
    const prov =
      proveedores.find((p) => {
        const nitP = String(p.nit || '').trim().replace(/\s+/g, '');
        return nitP === nitOc || nitP.replace(/-\d+$/, '') === nitOc.replace(/-\d+$/, '');
      }) ||
      proveedores.find((p) => p.nombre === oc.proveedor?.nombre);
    setProveedorId(prov ? getProveedorId(prov) : '');
  }, [open, esEdicion, ordenEdicion, proveedores]);

  useEffect(() => {
    if (!open || esEdicion) return;

    let activo = true;
    setSiguienteNumeroOrden('');

    inventarioService.obtenerSiguienteNumeroOrdenCompra()
      .then((data) => {
        if (activo) setSiguienteNumeroOrden(data?.numeroOrden || '');
      })
      .catch((error) => {
        console.error('Error consultando siguiente numero OC:', error);
        if (activo) setSiguienteNumeroOrden('');
      });

    return () => {
      activo = false;
    };
  }, [open, esEdicion]);

  const addLine = (): void => {
    const b0 = bodegasActivas[0]?.nombre ?? '';
    setLines((prev) => [
      ...prev,
      {
        id: newLineId(),
        sku: '',
        productoId: '',
        nombreProducto: '',
        cantidad: '1',
        precioUnitario: '0',
        descuento: '0',
        impuestoPorcentaje: '0',
        codigoReglaImpuesto: null,
        baseCalculoImpuesto: null,
        montoFijoImpuesto: 0,
        motivoReglaImpuesto: null,
        bodega: b0,
      },
    ]);
  };

  const removeLine = (id: LineId): void => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));
  };

  const updateLine = (id: LineId, patch: Partial<Omit<OcLineDraft, 'id'>>): void => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  /**
   * Edición manual del "Imp. %": desliga la línea de su regla contable y anula la confirmación
   * previa, para que el guardado vuelva a mostrar qué tarifa se aplicará realmente.
   */
  const editarImpuestoManual = (id: LineId, valor: string): void => {
    setTarifaManualConfirmada(false);
    updateLine(id, {
      impuestoPorcentaje: valor,
      codigoReglaImpuesto: null,
      baseCalculoImpuesto: null,
      montoFijoImpuesto: 0,
      motivoReglaImpuesto: null,
    });
  };

  /**
   * Consulta la tarifa de IVA parametrizada en "Reglas contables" para compras y autocompleta el
   * campo "Imp. %" de la línea (junto con el código de la regla usada, para trazabilidad). Si el
   * usuario edita el % a mano, el código de regla se limpia; `restaurarTarifaParametrizada` vuelve
   * a llamar aquí para recuperarlo. Devuelve el resultado para que el llamador pueda avisar.
   */
  const aplicarTarifaImpuestoAutomatica = async (
    lineId: LineId,
    sku: string,
    productoId?: string,
    proveedorResolverId: string = proveedorId
  ): Promise<{ ok: boolean; tarifa: number; codigo: string | null; motivo: string | null }> => {
    if (!proveedorResolverId) {
      updateLine(lineId, {
        impuestoPorcentaje: '0',
        codigoReglaImpuesto: null,
        baseCalculoImpuesto: null,
        montoFijoImpuesto: 0,
        motivoReglaImpuesto: 'PROVEEDOR_NO_INFORMADO',
      });
      return { ok: false, tarifa: 0, codigo: null, motivo: 'PROVEEDOR_NO_INFORMADO' };
    }
    try {
      const resultadoTarifa = await reglasContablesService.obtenerTarifaAplicable({
        // Alcance parametrizable (config compras.ambitosReglaImpuesto); sin config es dinámico:
        // '*' = todas las reglas de IVA activas del tenant, sin filtrar por ámbito.
        aplicaEn: ambitosReglaImpuesto?.length ? ambitosReglaImpuesto.join(',') : '*',
        proveedorId: proveedorResolverId || undefined,
      });
      const { tarifa, codigo, montoFijo, baseCalculo, esGeneral, sinReglas, motivo } = resultadoTarifa;
      if (sinReglas || (esGeneral && !codigo)) {
        // Ninguna regla resuelve. El backend ya no acepta impuesto manual: bloqueará el guardado
        // con este mismo `motivo`, así que se conserva para mostrarlo en la línea.
        updateLine(lineId, {
          codigoReglaImpuesto: null,
          baseCalculoImpuesto: null,
          montoFijoImpuesto: 0,
          motivoReglaImpuesto: motivo || 'SIN_REGLA_APLICABLE',
        });
        return { ok: false, tarifa: 0, codigo: null, motivo: motivo || 'SIN_REGLA_APLICABLE' };
      }
      // Regla activa del alcance: aplica su tarifa (la específica gana; la general es el
      // fallback del ámbito). El backend recalcula igual al guardar.
      updateLine(lineId, {
        impuestoPorcentaje: String(tarifa ?? 0),
        codigoReglaImpuesto: codigo ?? null,
        baseCalculoImpuesto: baseCalculo ?? 'SUBTOTAL_COMERCIAL',
        montoFijoImpuesto: Number(montoFijo || 0),
        motivoReglaImpuesto: null,
      });
      return { ok: true, tarifa: Number(tarifa ?? 0), codigo: codigo ?? null, motivo: null };
    } catch (error) {
      console.error('Error resolviendo tarifa de IVA aplicable a la compra:', error);
      return { ok: false, tarifa: 0, codigo: null, motivo: 'ERROR_CONSULTA' };
    }
  };

  /**
   * Vuelve a tomar la tarifa parametrizada en una línea cuyo "Imp. %" fue editado a mano.
   * Solo toca los campos de impuesto: conserva cantidad, precio y descuento ya digitados
   * (a diferencia de re-seleccionar el SKU, que reescribe el precio con el del catálogo).
   */
  const restaurarTarifaParametrizada = async (lineId: LineId): Promise<void> => {
    const linea = lines.find((l) => l.id === lineId);
    if (!linea) return;
    const sku = String(linea.sku || '').trim();
    if (!sku) {
      toast.error('Selecciona primero el SKU de la línea.');
      return;
    }
    const resultado = await aplicarTarifaImpuestoAutomatica(lineId, sku, linea.productoId);
    if (resultado.ok) {
      toast.success(`Tarifa parametrizada aplicada a ${sku.toUpperCase()}: ${resultado.tarifa}% (regla ${resultado.codigo}).`);
      return;
    }
    toast.error(`No se pudo tomar la tarifa parametrizada para ${sku.toUpperCase()}. ${mensajeMotivoSinRegla(resultado.motivo)}`);
  };

  const cambiarProveedor = (id: string): void => {
    setProveedorId(id);
    // Cambiar de proveedor cambia la regla aplicable: la confirmación anterior ya no vale.
    setTarifaManualConfirmada(false);
    setLines((prev) => prev.map((linea) => linea.codigoReglaImpuesto
      ? { ...linea, impuestoPorcentaje: '0', codigoReglaImpuesto: null, baseCalculoImpuesto: null, montoFijoImpuesto: 0, motivoReglaImpuesto: null }
      : linea
    ));
    for (const linea of lines) {
      void aplicarTarifaImpuestoAutomatica(linea.id, linea.sku, linea.productoId, id);
    }
  };

  /**
   * Asigna el SKU (y su producto asociado) a una línea. Si el producto ya está en otra línea de la
   * orden, fusiona: suma la cantidad a la línea existente y descarta la línea actual (fusión de
   * duplicados por producto en la misma OC), en vez de dejar dos filas separadas.
   */
  const asignarProductoALinea = (lineId: LineId, skuRaw: string): void => {
    const sku = skuRaw.trim().toUpperCase();
    if (!sku) return;
    const prod = productosConSku.find((p) => String(p.sku).toUpperCase() === sku);
    const productoId = prod ? String(prod._id || prod.iud || '') : '';
    const currentLine = lines.find((l) => l.id === lineId);
    const existing = lines.find(
      (l) => l.id !== lineId && String(l.sku || '').trim().toUpperCase() === sku
    );

    if (existing && currentLine) {
      const cantidadActual = Number(currentLine.cantidad) || 0;
      const cantidadASumar = cantidadActual > 0 ? cantidadActual : 1;
      setLines((prev) => {
        const merged = prev.map((l) =>
          l.id === existing.id
            ? { ...l, cantidad: String((Number(l.cantidad) || 0) + cantidadASumar) }
            : l
        );
        const sinDuplicada = merged.filter((l) => l.id !== lineId);
        return sinDuplicada.length ? sinDuplicada : merged;
      });
      toast.info(`El producto ${sku} ya estaba en la orden; se sumó la cantidad a esa línea.`);
      return;
    }

    updateLine(lineId, {
      sku,
      productoId,
      nombreProducto: prod?.nombre ?? currentLine?.nombreProducto ?? '',
      precioUnitario: prod ? String(Math.max(0, Number(prod.precio) || 0)) : (currentLine?.precioUnitario ?? '0'),
    });
    void aplicarTarifaImpuestoAutomatica(lineId, sku, productoId);
  };

  const onSkuChange = (lineId: LineId, sku: string): void => {
    asignarProductoALinea(lineId, sku);
  };

  const filtrarProductosParaLinea = (linea: OcLineDraft): BackendProducto[] => {
    const termino = String(linea.sku || '').trim().toLocaleLowerCase('es');
    if (!termino) return productosConSku;
    return productosConSku.filter((producto) => {
      const sku = String(producto.sku || '').toLocaleLowerCase('es');
      const nombre = String(producto.nombre || '').toLocaleLowerCase('es');
      return sku.includes(termino) || nombre.includes(termino);
    });
  };

  const asignarProductoPorNombreALinea = (lineId: LineId, nombreRaw: string): void => {
    const nombre = nombreRaw.trim().toLocaleLowerCase('es');
    if (!nombre) return;
    const coincidencias = productosConSku.filter(
      (producto) => String(producto.nombre || '').trim().toLocaleLowerCase('es') === nombre,
    );
    if (coincidencias.length === 1) {
      asignarProductoALinea(lineId, String(coincidencias[0].sku || ''));
    }
  };

  const totalOrden = useMemo(() => lines.reduce((acc, l) => acc + calcTotalLinea(l), 0), [lines]);

  const guardar = async (): Promise<void> => {
    if (!proveedorId) {
      toast.error('Selecciona un proveedor.');
      return;
    }
    const prov = proveedores.find((p) => getProveedorId(p) === proveedorId);
    if (!prov) {
      toast.error('Proveedor no válido.');
      return;
    }
    const c = concepto.trim();
    const j = justificacion.trim();
    if (!esEdicion && !c) {
      toast.error('El concepto es obligatorio.');
      return;
    }
    if (esEdicion && !j) {
      toast.error('La justificación del cambio es obligatoria.');
      return;
    }
    const rem = numeroRemision.trim();
    const factura = numeroFacturaElectronico.trim();
    const tieneRem = rem.length > 0;
    const tieneFac = factura.length > 0;
    if (tieneRem && tieneFac) {
      toast.error('No puede usar número de remisión y factura electrónica en el mismo documento.');
      return;
    }
    if (!tieneRem && !tieneFac) {
      toast.error('Indica número de remisión o número de factura electrónico (uno solo).');
      return;
    }

    // Última puerta antes de enviar: el backend ignora todo % digitado a mano y recalcula desde la
    // ReglaContable. En el primer intento se resuelve la tarifa real, se pinta en pantalla (para que
    // el usuario vea subtotales y totales definitivos) y se pide confirmar; el segundo clic guarda.
    const lineasImpuestoManual = lines.filter(
      (l) => String(l.sku || '').trim() && !l.codigoReglaImpuesto && Number(l.impuestoPorcentaje) > 0
    );
    if (lineasImpuestoManual.length > 0 && !tarifaManualConfirmada) {
      const reemplazos: string[] = [];
      const fallidas: string[] = [];
      for (const linea of lineasImpuestoManual) {
        const skuLinea = String(linea.sku || '').trim().toUpperCase();
        const digitado = Number(linea.impuestoPorcentaje) || 0;
        const resultado = await aplicarTarifaImpuestoAutomatica(linea.id, skuLinea, linea.productoId);
        if (resultado.ok) reemplazos.push(`${skuLinea}: ${digitado}% → ${resultado.tarifa}% (${resultado.codigo})`);
        else fallidas.push(`${skuLinea}: ${mensajeMotivoSinRegla(resultado.motivo)}`);
      }
      // Sin regla activa el backend rechaza la orden; no tiene sentido pedir confirmación.
      if (fallidas.length > 0) {
        toast.error(`No hay regla contable de IVA aplicable. ${fallidas.join(' | ')}`);
        return;
      }
      setTarifaManualConfirmada(true);
      toast.warning(
        `El % digitado no se guarda: manda la regla contable. Se aplicó ${reemplazos.join(' | ')}. ` +
        'Revisa los totales y pulsa «Guardar orden» de nuevo para confirmar.'
      );
      return;
    }

    const items = lines
      .map((l) => {
        const sku = String(l.sku || '').trim().toUpperCase();
        const cant = Number(l.cantidad);
        const precio = Number(l.precioUnitario);
        const descuentoCop = Math.max(0, Math.round(Number(l.descuento) || 0));
        const impuestoPorcentaje = Number(l.impuestoPorcentaje) || 0;
        const bod = String(l.bodega || '').trim();
        return {
          sku,
          productoId: l.productoId || null,
          nombreProducto: String(l.nombreProducto || '').trim(),
          cantidadOrdenada: cant,
          costoUnitario: precio,
          descuento: descuentoCop,
          descuentoPorcentaje: 0,
          impuestoPorcentaje,
          codigoReglaImpuesto: l.codigoReglaImpuesto || null,
          bodega: bod,
        };
      })
      .filter((it) => it.sku && it.bodega && it.cantidadOrdenada > 0 && !Number.isNaN(it.costoUnitario) && it.costoUnitario >= 0);

    if (items.length === 0) {
      toast.error('Agrega al menos una línea con SKU, bodega, cantidad y precio válidos.');
      return;
    }

    try {
      setEnviando(true);
      let ordenResultado: InventarioOrdenCompra | undefined;
      if (esEdicion && ordenEdicionId) {
        ordenResultado = await inventarioService.actualizarOrdenCompra(ordenEdicionId, {
          justificacion: j,
          ...(tieneRem ? { numeroRemision: rem } : {}),
          ...(tieneFac ? { numeroFacturaElectronico: factura } : {}),
          proveedor: { id: proveedorId, nombre: prov.nombre.trim(), nit: prov.nit.trim() },
          items,
        });
        toast.success('Orden de compra actualizada.');
      } else {
        ordenResultado = await inventarioService.crearOrdenCompra({
          concepto: c,
          ...(tieneRem ? { numeroRemision: rem } : {}),
          ...(tieneFac ? { numeroFacturaElectronico: factura } : {}),
          proveedor: { id: proveedorId, nombre: prov.nombre.trim(), nit: prov.nit.trim() },
          items,
        });
        const estado = String(ordenResultado.estado || '').toUpperCase();
        toast.success(
          mensajeExitoCrearOrden(ordenResultado.numeroOrden, estado, recepcionAutomatica),
          { autoClose: 9000 },
        );
      }
      onOpenChange(false);
      await onCreated(ordenResultado);
    } catch (error) {
      console.error('Error creando orden de compra:', error);
      toast.error(mensajeErrorComprasInventario(error, 'No se pudo guardar la orden de compra.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      {showTrigger ? (
        <GovernedButton
          actionId={triggerActionId || 'inventory.purchases.orders.create'}
          type="button"
          variant="outline"
          size="sm"
          className={triggerClassName}
          onClick={() => {
            onAntesNuevaOrden?.();
          }}
          disabled={saving || enviando}
        >
          <ClipboardList className="mr-2 h-4 w-4" />
          Nueva orden de compra
        </GovernedButton>
      ) : null}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="inset-0 left-0 top-0 flex h-[100dvh] max-h-none w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-3 overflow-hidden rounded-none border-border bg-background p-3 text-foreground sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-[1120px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:p-6">
          <DialogHeader className="shrink-0 pr-8">
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              {esEdicion ? 'Editar orden de compra' : 'Nueva orden de compra'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Remisión o factura electrónica (uno solo). El concepto queda en el documento.
              {esEdicion
                ? ' Solo editable en Verificación; el consecutivo OC no cambia.'
                : ' El número OC lo genera el servidor al crear; la fecha de creación también.'}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 w-full flex-1 space-y-4 overflow-x-hidden overflow-y-scroll overscroll-y-contain pr-1 [-webkit-overflow-scrolling:touch] [touch-action:pan-y]">
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Número OC: </span>
            <span className="font-mono font-semibold text-foreground">
              {(ordenEdicion?.numeroOrden ?? siguienteNumeroOrden) || '(consultando consecutivo...)'}
            </span>
            {!esEdicion && siguienteNumeroOrden ? (
              <span className="ml-2 text-xs text-muted-foreground">se confirma al guardar</span>
            ) : esEdicion ? (
              <span className="ml-2 text-xs text-muted-foreground">consecutivo inmutable</span>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Número de remisión</Label>
              <Input
                value={numeroRemision}
                onChange={(e) => setNumeroRemision(e.target.value)}
                placeholder="REM-123"
                className="border-input bg-background"
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">Solo si no usas factura electrónica.</p>
            </div>
            <div className="space-y-2">
              <Label>Número factura electrónico</Label>
              <Input
                value={numeroFacturaElectronico}
                onChange={(e) => setNumeroFacturaElectronico(e.target.value)}
                placeholder="Ej. CUFE / número fiscal"
                className="border-input bg-background"
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">Solo si no usas remisión.</p>
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label>Proveedor *</Label>
              <Select value={proveedorId || ''} onValueChange={cambiarProveedor}>
                <SelectTrigger className="border-input bg-background">
                  <SelectValue placeholder={proveedores.length ? 'Selecciona proveedor' : 'Sin proveedores'} />
                </SelectTrigger>
                <SelectContent className="max-h-72 border-border bg-popover">
                  {proveedores.map((p) => {
                    const id = getProveedorId(p);
                    return id ? (
                      <SelectItem key={id} value={id}>
                        {p.nombre} · NIT {p.nit}
                      </SelectItem>
                    ) : null;
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className={`grid gap-4 ${esEdicion ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
            <div className="space-y-2">
              <Label>Concepto {esEdicion ? '' : '*'}</Label>
              <Textarea
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Ej. Compra de insumos para producción Q2"
                rows={3}
                readOnly={esEdicion}
                className={`border-input bg-background resize-y min-h-[72px] ${esEdicion ? 'cursor-not-allowed bg-muted/40 text-muted-foreground' : ''}`}
              />
              {esEdicion ? (
                <p className="text-[11px] text-muted-foreground">
                  El concepto queda en el documento original y no puede modificarse al editar.
                </p>
              ) : null}
            </div>
            {esEdicion ? (
              <div className="space-y-2">
                <Label>Justificación de este cambio *</Label>
                <Textarea
                  value={justificacion}
                  onChange={(e) => setJustificacion(e.target.value)}
                  placeholder="Describe por qué modificas esta orden (queda guardado en el documento)."
                  rows={3}
                  className="border-input bg-background resize-y min-h-[72px]"
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-base font-medium">Detalle de ítems</Label>
              <Button type="button" className="w-full sm:w-auto" size="sm" variant="outline" onClick={addLine} disabled={saving || enviando}>
                <Plus className="mr-1 h-4 w-4" />
                Agregar línea
              </Button>
            </div>
            <div className="space-y-3 md:hidden">
              {lines.map((line, index) => (
                <article key={line.id} className="min-w-0 rounded-md border border-border bg-card p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">Ítem {index + 1}</p>
                    <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeLine(line.id)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>SKU</Label>
                      <Input
                        value={line.sku}
                        onChange={(e) => {
                          const sku = e.target.value.toUpperCase();
                          updateLine(line.id, { sku });
                          const exacto = productosConSku.find((producto) => String(producto.sku || '').trim().toUpperCase() === sku.trim());
                          if (exacto) asignarProductoALinea(line.id, sku);
                        }}
                        onBlur={(e) => asignarProductoALinea(line.id, e.target.value)}
                        placeholder="Buscar SKU"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Producto</Label>
                      <Input value={line.nombreProducto} onChange={(e) => { updateLine(line.id, { nombreProducto: e.target.value }); asignarProductoPorNombreALinea(line.id, e.target.value); }} placeholder="Nombre del producto" />
                    </div>
                    <div className="space-y-1.5"><Label>Cantidad</Label><Input type="number" min="0" step="any" value={line.cantidad} onChange={(e) => updateLine(line.id, { cantidad: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>Precio</Label><Input type="number" min="0" step="any" value={line.precioUnitario} onChange={(e) => updateLine(line.id, { precioUnitario: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>Descuento (COP)</Label><Input type="number" min="0" step={1} value={line.descuento} onChange={(e) => updateLine(line.id, { descuento: e.target.value })} /></div>
                    <div className="space-y-1.5">
                      <Label>Impuesto %</Label>
                      <Input type="number" min="0" step="any" value={line.impuestoPorcentaje} onChange={(e) => editarImpuestoManual(line.id, e.target.value)} />
                      {line.codigoReglaImpuesto ? (
                        <p className="text-[11px] leading-tight text-muted-foreground">{line.codigoReglaImpuesto}</p>
                      ) : String(line.sku || '').trim() ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto gap-1 px-0 py-0 text-[11px] font-normal text-muted-foreground hover:text-foreground"
                          onClick={() => { void restaurarTarifaParametrizada(line.id); }}
                          title="Volver a tomar la tarifa de la regla contable parametrizada"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Usar tarifa parametrizada
                        </Button>
                      ) : null}
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Bodega</Label>
                      <Select value={line.bodega || ''} onValueChange={(v) => updateLine(line.id, { bodega: v })}>
                        <SelectTrigger><SelectValue placeholder="Bodega" /></SelectTrigger>
                        <SelectContent className="max-h-60 border-border bg-popover">
                          {bodegasActivas.map((b) => <SelectItem key={String(b._id || b.iud || b.nombre)} value={b.nombre}>{b.nombre}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
                    <div><p className="text-xs text-muted-foreground">Subtotal</p><p className="font-medium tabular-nums">{moneyCo(calcSubtotalLinea(line))}</p></div>
                    <div className="text-right"><p className="text-xs text-muted-foreground">Total</p><p className="font-semibold tabular-nums">{moneyCo(calcTotalLinea(line))}</p></div>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden w-full overflow-x-auto rounded-md border border-border md:block">
              <Table className="w-full table-fixed [&_td]:px-2 [&_th]:px-2">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[15%]">SKU</TableHead>
                    <TableHead className="w-[14%]">Nombre producto</TableHead>
                    <TableHead className="w-[7%] text-right">Cant.</TableHead>
                    <TableHead className="w-[9%] text-right">Precio</TableHead>
                    <TableHead className="w-[8%] text-right">Desc. (COP)</TableHead>
                    <TableHead className="w-[8%] text-right">Imp. %</TableHead>
                    <TableHead className="w-[9%] text-right">Subtotal</TableHead>
                    <TableHead className="w-[9%] text-right">Total</TableHead>
                    <TableHead className="w-[16%]">Bodega</TableHead>
                    <TableHead className="w-[5%]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="align-top">
                        <Select value={line.sku || ''} onValueChange={(v) => onSkuChange(line.id, v)}>
                          <SelectTrigger
                            className="h-9 border-input bg-background px-2"
                            title={line.nombreProducto || 'Selecciona un SKU'}
                          >
                            <SelectValue placeholder="SKU" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 w-72 max-w-[calc(100vw-2rem)] border-border bg-popover">
                            {filtrarProductosParaLinea(line).map((p) => (
                              <SelectItem
                                key={String(p.iud || p._id || p.sku)}
                                value={String(p.sku)}
                                className="group items-start"
                                aria-label={`${p.sku}. ${p.nombre || 'Sin nombre'}`}
                              >
                                <span className="flex min-w-0 flex-col">
                                  <span className="font-medium">{p.sku}</span>
                                  <span className="hidden whitespace-normal pt-0.5 text-xs text-muted-foreground group-hover:block group-focus:block group-data-[highlighted]:block">
                                    Producto: {p.nombre || 'Sin nombre'}
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          className="mt-1 h-8 border-input bg-background px-2 text-xs"
                          value={line.sku}
                          onChange={(e) => {
                            const sku = e.target.value.toUpperCase();
                            updateLine(line.id, { sku });
                            const coincidenciaExacta = productosConSku.find(
                              (producto) => String(producto.sku || '').trim().toUpperCase() === sku.trim(),
                            );
                            if (coincidenciaExacta) asignarProductoALinea(line.id, sku);
                          }}
                          onBlur={(e) => asignarProductoALinea(line.id, e.target.value)}
                          placeholder="Filtrar SKU o nombre"
                        />
                        {line.sku.trim() ? (
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {filtrarProductosParaLinea(line).length} coincidencia(s). Abre el selector superior.
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          value={line.nombreProducto}
                          list={`productos-nombre-${line.id}`}
                          onChange={(e) => {
                            const nombreProducto = e.target.value;
                            updateLine(line.id, { nombreProducto });
                            asignarProductoPorNombreALinea(line.id, nombreProducto);
                          }}
                          onBlur={(e) => asignarProductoPorNombreALinea(line.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              asignarProductoPorNombreALinea(line.id, e.currentTarget.value);
                            }
                          }}
                          className="border-input bg-background px-2"
                          placeholder="Buscar nombre"
                        />
                        <datalist id={`productos-nombre-${line.id}`}>
                          {productosConSku.map((producto) => (
                            <option
                              key={String(producto.iud || producto._id || producto.sku)}
                              value={String(producto.nombre || '')}
                            >
                              {String(producto.sku || '')}
                            </option>
                          ))}
                        </datalist>
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          className="border-input bg-background px-2 text-right"
                          value={line.cantidad}
                          onChange={(e) => updateLine(line.id, { cantidad: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          className="border-input bg-background px-2 text-right"
                          value={line.precioUnitario}
                          onChange={(e) => updateLine(line.id, { precioUnitario: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          type="number"
                          min="0"
                          step={1}
                          className="border-input bg-background px-2 text-right"
                          value={line.descuento}
                          onChange={(e) => {
                            // Clamp visible: el descuento nunca supera el bruto de la línea
                            // (misma regla del backend, pero explícita para el usuario).
                            const bruto = round2((Number(line.cantidad) || 0) * (Number(line.precioUnitario) || 0));
                            const digitado = Number(e.target.value) || 0;
                            if (bruto > 0 && digitado > bruto) {
                              toast.info(`El descuento no puede superar el bruto de la línea (${moneyCo(bruto)}); se ajustó al máximo.`);
                              updateLine(line.id, { descuento: String(Math.floor(bruto)) });
                              return;
                            }
                            updateLine(line.id, { descuento: e.target.value });
                          }}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          className="border-input bg-background px-2 text-right"
                          value={line.impuestoPorcentaje}
                          onChange={(e) => editarImpuestoManual(line.id, e.target.value)}
                          placeholder="%"
                        />
                        {line.codigoReglaImpuesto ? (
                          <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{line.codigoReglaImpuesto}</p>
                        ) : String(line.sku || '').trim() ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mt-1 h-auto w-full justify-end gap-1 px-0 py-0 text-[11px] font-normal text-muted-foreground hover:text-foreground"
                            onClick={() => { void restaurarTarifaParametrizada(line.id); }}
                            title="Volver a tomar la tarifa de la regla contable parametrizada"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Usar tarifa parametrizada
                          </Button>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-top text-right text-sm font-medium tabular-nums">
                        {moneyCo(calcSubtotalLinea(line))}
                      </TableCell>
                      <TableCell className="align-top text-right text-sm font-semibold tabular-nums text-foreground">
                        {moneyCo(calcTotalLinea(line))}
                      </TableCell>
                      <TableCell className="align-top">
                        <Select value={line.bodega || ''} onValueChange={(v) => updateLine(line.id, { bodega: v })}>
                          <SelectTrigger className="h-9 border-input bg-background px-2">
                            <SelectValue placeholder="Bodega" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 border-border bg-popover">
                            {bodegasActivas.map((b) => (
                              <SelectItem
                                key={String(b._id || b.iud || b.nombre)}
                                value={b.nombre}
                              >
                                {b.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="align-top">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeLine(line.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Con varias líneas el botón de arriba queda fuera de vista al hacer
                scroll: se repite al pie para seguir agregando sin volver a subir. */}
            {lines.length > 2 ? (
              <div className="flex justify-end">
                <Button type="button" className="w-full sm:w-auto" size="sm" variant="outline" onClick={addLine} disabled={saving || enviando}>
                  <Plus className="mr-1 h-4 w-4" />
                  Agregar línea
                </Button>
              </div>
            ) : null}
            <p className="text-right text-sm font-semibold text-foreground">
              Total orden: <span className="tabular-nums">{moneyCo(totalOrden)}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Subtotal por línea = cantidad × precio. Total por línea = subtotal + impuesto % sobre el subtotal − descuento en pesos.
            </p>
          </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border bg-background pt-3 sm:gap-0">
            <Button type="button" className="w-full sm:w-auto" variant="outline" onClick={() => onOpenChange(false)} disabled={saving || enviando}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => void guardar()}
              disabled={saving || enviando}
            >
              <Save className="mr-2 h-4 w-4" />
              {esEdicion ? 'Guardar cambios' : 'Guardar orden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
