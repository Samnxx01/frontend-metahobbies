import type { InventarioTipoMovimiento } from '@/app/services/inventarioService';

/** Códigos de documento soporte; no son tipos operativos del formulario de kardex manual. */
const CODIGO_TIPO_DOCUMENTO_SOPORTE = /^(RECEPCION_OC|COMPROBANTE_|VENTA_|WOMPI_)/;

export const esCodigoTipoDocumentoSoporte = (codigo?: string): boolean =>
  CODIGO_TIPO_DOCUMENTO_SOPORTE.test(String(codigo || '').trim().toUpperCase());

type TipoMovimientoIdentificable = Pick<InventarioTipoMovimiento, '_id' | 'iud' | 'codigo'> & {
  id?: string;
};

export const idTipoMovimiento = (tipo?: TipoMovimientoIdentificable | null): string =>
  String(tipo?.iud ?? tipo?._id ?? tipo?.id ?? '').trim();

export const esIdTipoMovimientoValido = (tipo?: TipoMovimientoIdentificable | null): boolean =>
  idTipoMovimiento(tipo).length > 0;

export const esCodigoEntradaCompra = (codigo?: string): boolean =>
  String(codigo || '').trim().toUpperCase() === 'ENTRADA_COMPRA';

export const buscarTipoMovimientoPorCodigo = (
  tipos: InventarioTipoMovimiento[] = [],
  codigo: string,
): InventarioTipoMovimiento | undefined =>
  tipos.find((tipo) => String(tipo.codigo || '').trim().toUpperCase() === String(codigo || '').trim().toUpperCase());

export const filtrarTiposMovimientoKardexEntrada = (
  tipos: InventarioTipoMovimiento[] = [],
): InventarioTipoMovimiento[] =>
  tipos.filter(
    (tipo) => tipo.estado && tipo.naturaleza === 'ENTRADA' && !esCodigoTipoDocumentoSoporte(tipo.codigo),
  );

export const resolverTipoMovimientoKardexEntradaPorDefecto = (
  tipos: InventarioTipoMovimiento[] = [],
): InventarioTipoMovimiento | undefined => {
  const activos = filtrarTiposMovimientoKardexEntrada(tipos);
  return (
    buscarTipoMovimientoPorCodigo(activos, 'ENTRADA_COMPRA')
    ?? activos[0]
  );
};

export const resolverIdTipoEntradaCompra = (
  tipos: InventarioTipoMovimiento[] = [],
): string => {
  const tipo = resolverTipoMovimientoKardexEntradaPorDefecto(tipos);
  return idTipoMovimiento(tipo);
};
