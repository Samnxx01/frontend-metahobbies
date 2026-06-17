import type {
  InventarioMovimiento,
  InventarioValorHistoricoEntry,
  StockActualItem,
} from '@/app/services/inventarioService';

export type HistoricoValorRow = InventarioValorHistoricoEntry & {
  sku: string;
  bodega: string;
};

export function buildHistoricoDesdeKardex(
  kardex: InventarioMovimiento[],
  skuFiltro: string,
): HistoricoValorRow[] {
  const skuNorm = String(skuFiltro || '').trim().toUpperCase();
  if (!skuNorm || kardex.length === 0) return [];

  const movs = kardex.filter(
    (mov) => String(mov.sku || '').trim().toUpperCase() === skuNorm && mov.saldoBodega,
  );
  const asc = [...movs].sort((a, b) => {
    const da = new Date(a.createdAt || 0).getTime();
    const db = new Date(b.createdAt || 0).getTime();
    return da - db || String(a._id || '').localeCompare(String(b._id || ''));
  });

  let huboPrimerRegistro = false;
  const rows = asc.map((mov) => {
    const sb = mov.saldoBodega!;
    const cu = Number(mov.costoUnitario || 0);
    const esPrimerRegistro = !huboPrimerRegistro
      && mov.tipoMovimiento === 'ENTRADA'
      && Number(sb.cantidadAnterior ?? 0) === 0;
    if (esPrimerRegistro) huboPrimerRegistro = true;

    return {
      movimientoId: mov._id,
      fecha: mov.createdAt,
      tipoMovimiento: mov.tipoMovimiento,
      documentoTipo: mov.documentoRelacionado?.tipo ?? null,
      documentoNumero: mov.documentoRelacionado?.numero ?? null,
      valorAnterior: sb.valorInicial != null
        ? Number(sb.valorInicial)
        : Number(sb.cantidadAnterior || 0) * cu,
      valorPosterior: sb.valorActual != null
        ? Number(sb.valorActual)
        : Number(sb.cantidadPosterior || 0) * cu,
      cantidadAnterior: Number(sb.cantidadAnterior || 0),
      cantidadPosterior: Number(sb.cantidadPosterior || 0),
      esPrimerRegistro,
      sku: mov.sku,
      bodega: mov.bodega || '',
    };
  });

  return rows.sort((a, b) => {
    const da = new Date(a.fecha || 0).getTime();
    const db = new Date(b.fecha || 0).getTime();
    return db - da;
  });
}

export function buildHistoricoValor(
  stockActual: StockActualItem[],
  kardex: InventarioMovimiento[],
  skuFiltro: string,
): HistoricoValorRow[] {
  const skuNorm = String(skuFiltro || '').trim().toUpperCase();
  const filas = skuNorm
    ? stockActual.filter((item) => String(item.sku || '').trim().toUpperCase() === skuNorm)
    : stockActual;

  const fromStock = filas.flatMap((item) => (item.historicoValores || []).map((entry) => ({
    ...entry,
    sku: item.sku,
    bodega: item.bodega,
  })));

  const rows = fromStock.length > 0
    ? fromStock
    : buildHistoricoDesdeKardex(kardex, skuNorm);

  return rows.sort((a, b) => {
    const da = new Date(a.fecha || 0).getTime();
    const db = new Date(b.fecha || 0).getTime();
    return db - da;
  });
}
