import type { AmbitoReglaContable } from '@/app/services/reglasContablesService';

export const PRESETS_AMBITO_REGLA: Array<Pick<AmbitoReglaContable, 'codigo' | 'nombre'>> = [
  { codigo: 'COMPRA', nombre: 'Compra' },
  { codigo: 'VENTA', nombre: 'Venta' },
  { codigo: 'AMBOS', nombre: 'Compra y venta' },
];
