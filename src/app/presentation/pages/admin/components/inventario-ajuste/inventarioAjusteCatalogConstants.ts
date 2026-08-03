import type { TipoAjuste } from '@/app/services/inventarioService';

export const DIRECCIONES_AJUSTE: Array<{ value: TipoAjuste; label: string }> = [
  { value: 'POSITIVO', label: 'Entrada (positivo)' },
  { value: 'NEGATIVO', label: 'Salida (negativo)' },
];

export const CODIGOS_TIPO_AJUSTE_PRESET: Array<{ codigo: string; nombre: string; direccion: TipoAjuste }> = [
  { codigo: 'AJUSTE_POSITIVO', nombre: 'Ajuste positivo', direccion: 'POSITIVO' },
  { codigo: 'AJUSTE_NEGATIVO', nombre: 'Ajuste negativo', direccion: 'NEGATIVO' },
  { codigo: 'MERMA', nombre: 'Merma', direccion: 'NEGATIVO' },
  { codigo: 'DANO', nombre: 'Daño', direccion: 'NEGATIVO' },
  { codigo: 'ERROR_CONTEO_ENTRADA', nombre: 'Corrección conteo (entrada)', direccion: 'POSITIVO' },
  { codigo: 'ERROR_CONTEO_SALIDA', nombre: 'Corrección conteo (salida)', direccion: 'NEGATIVO' },
];

export const MODO_REGISTRO_MANUAL = '__REGISTRO_MANUAL__';
