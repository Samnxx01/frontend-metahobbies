import type { AplicaEnRegla, BaseCalculoRegla, TipoReglaContable } from '@/app/services/reglasContablesService';

export const TIPOS_REGLA_CONTABLE: Array<{ value: TipoReglaContable; label: string }> = [
  { value: 'IVA', label: 'IVA' },
  { value: 'RETENCION', label: 'Retención' },
  { value: 'IMPUESTO_ADICIONAL', label: 'Impuesto adicional' },
  { value: 'MARGEN_UTILIDAD', label: 'Margen de utilidad' },
  { value: 'DESCUENTO', label: 'Descuento' },
  { value: 'REGLA_COMERCIAL', label: 'Regla comercial' },
];

export const BASES_CALCULO_REGLA: Array<{ value: BaseCalculoRegla; label: string }> = [
  { value: 'COSTO', label: 'Costo' },
  { value: 'SUBTOTAL_COMERCIAL', label: 'Subtotal comercial' },
  { value: 'IMPUESTO', label: 'Monto de impuesto' },
  { value: 'PRECIO_FINAL', label: 'Precio final' },
];

export const APLICA_EN_REGLA: Array<{ value: AplicaEnRegla; label: string }> = [
  { value: 'COMPRA', label: 'Compra' },
  { value: 'VENTA', label: 'Venta' },
  { value: 'AMBOS', label: 'Compra y venta' },
];

export const PRESETS_REGLA_CONTABLE: Array<{
  codigo: string;
  nombre: string;
  tipo: TipoReglaContable;
  tarifa: number;
  baseCalculo: BaseCalculoRegla;
  aplicaEn: AplicaEnRegla;
}> = [
  {
    codigo: 'IVA_VENTA_5',
    nombre: 'IVA venta 5%',
    tipo: 'IVA',
    tarifa: 5,
    baseCalculo: 'SUBTOTAL_COMERCIAL',
    aplicaEn: 'VENTA',
  },
  {
    codigo: 'IVA_VENTA_19',
    nombre: 'IVA venta 19%',
    tipo: 'IVA',
    tarifa: 19,
    baseCalculo: 'SUBTOTAL_COMERCIAL',
    aplicaEn: 'VENTA',
  },
  {
    codigo: 'MARGEN_UTILIDAD_25',
    nombre: 'Margen utilidad 25%',
    tipo: 'MARGEN_UTILIDAD',
    tarifa: 25,
    baseCalculo: 'COSTO',
    aplicaEn: 'VENTA',
  },
];

export const labelTipoRegla = (tipo: string): string =>
  TIPOS_REGLA_CONTABLE.find((t) => t.value === tipo)?.label ?? tipo;

export const labelBaseCalculo = (base: string): string =>
  BASES_CALCULO_REGLA.find((b) => b.value === base)?.label ?? base;

export const labelAplicaEn = (aplica: string): string =>
  APLICA_EN_REGLA.find((a) => a.value === aplica)?.label ?? aplica;
