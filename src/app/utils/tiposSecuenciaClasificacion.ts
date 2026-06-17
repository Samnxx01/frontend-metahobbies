export type ClasificacionEmision = {
  id: number;
  secuencialId?: number;
  nombre: string;
  etiqueta: string;
};

export type ClasificacionEmisionPlantilla = {
  nombre: string;
  etiqueta: string;
};

/** Catálogo base VENTA (alineado al seed counterClasificacionEmision). */
export const CLASIFICACIONES_EMISION_VENTA_PREDETERMINADAS: ClasificacionEmisionPlantilla[] = [
  { nombre: 'CARRITO_CONTADOR', etiqueta: 'CARRITO' },
  { nombre: 'PRODUCTOS_CONTADOR', etiqueta: 'PRODUCTOS' },
];

const CODIGO_CLASIFICACION_REGEX = /^[A-Z][A-Z0-9_]{0,31}$/;



export const esCodigoClasificacionValido = (value: string): boolean => (

  CODIGO_CLASIFICACION_REGEX.test(String(value || '').trim().toUpperCase())

);



export const etiquetaClasificacion = (row: ClasificacionEmision): string => (

  `${row.etiqueta} (${row.nombre})`

);



export const etiquetaClasificacionConId = (row: ClasificacionEmision): string => (

  `#${row.id} · ${row.etiqueta} (${row.nombre})`

);



export const normalizarClasificacionEmision = (

  value: unknown,

  opciones: ClasificacionEmision[] = [],

): string => {

  const tipo = String(value || '').trim().toUpperCase();

  if (opciones.some((op) => op.nombre === tipo)) return tipo;

  if (esCodigoClasificacionValido(tipo)) return tipo;

  return opciones[0]?.nombre || '';

};

export const clasificacionEmisionPreferida = (
  opciones: ClasificacionEmision[] = [],
): ClasificacionEmision | null => {
  if (!opciones.length) return null;
  return opciones.find((op) => op.nombre === 'CARRITO_CONTADOR') || opciones[0];
};

export const siguienteClasificacionEmisionDraft = (
  existentes: ClasificacionEmision[] = [],
): ClasificacionEmisionPlantilla => {
  const usados = new Set(existentes.map((row) => row.nombre));
  const libre = CLASIFICACIONES_EMISION_VENTA_PREDETERMINADAS.find(
    (plantilla) => !usados.has(plantilla.nombre),
  );
  return libre || CLASIFICACIONES_EMISION_VENTA_PREDETERMINADAS[0];
};

