import type { ComprobanteEntradaDetalle, ReporteKardexEntradaLinea } from '@/app/services/inventarioService';
import { escapePrintHtml, openPrintDocument, type PrintDocumentFooterConfig } from '@/lib/print/printDocument';

const moneyCo = (n: number): string =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const formatQty = (value: number): string =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(value);

const formatDateTimeCo = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
};

const labelTipoMovimiento = (linea: ReporteKardexEntradaLinea): string => {
  const cfg = linea.movimiento?.tipoMovimientoConfig;
  if (cfg?.nombre) return `${cfg.nombre} (${cfg.codigo || linea.movimiento?.tipoMovimiento || 'ENTRADA'})`;
  return linea.movimiento?.tipoMovimiento || 'ENTRADA';
};

const csvCell = (value: string | number): string => {
  const raw = String(value ?? '');
  if (/[",;\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
};

export const descargarReporteKardexCsv = (
  detalle: Pick<ComprobanteEntradaDetalle, 'numeroRecepcion' | 'reporteKardex'>,
): void => {
  const lineas = detalle.reporteKardex ?? [];
  if (!lineas.length) return;

  const header = [
    'SKU',
    'Bodega',
    'Tipo movimiento',
    'Motivo',
    'Cant. entrada',
    'Stock anterior',
    'Stock posterior',
    'Saldo actual',
    'Costo prom.',
    'Documento tipo',
    'Documento numero',
    'Registrado en',
  ];

  const rows = lineas.map((linea) => {
    const doc = linea.movimiento?.documentoRelacionado;
    return [
      linea.sku,
      linea.bodega,
      labelTipoMovimiento(linea),
      linea.movimiento?.motivo || 'COMPRA',
      formatQty(Number(linea.movimiento?.cantidad || 0)),
      formatQty(Number(linea.movimiento?.saldoBodega?.cantidadAnterior ?? 0)),
      formatQty(Number(linea.movimiento?.saldoBodega?.cantidadPosterior ?? linea.saldo?.cantidadDisponible ?? 0)),
      formatQty(Number(linea.saldo?.cantidadDisponible ?? 0)),
      moneyCo(Number(linea.saldo?.costoPromedioUnitario ?? linea.movimiento?.costoUnitario ?? 0)),
      doc?.tipo || '',
      doc?.numero || '',
      formatDateTimeCo(linea.movimiento?.registradoEn),
    ].map(csvCell).join(';');
  });

  const bom = '\uFEFF';
  const content = `${bom}${header.join(';')}\n${rows.join('\n')}`;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `reporte-kardex-${detalle.numeroRecepcion || 'entrada'}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export const imprimirReporteKardex = (
  detalle: ComprobanteEntradaDetalle,
  options: { nombreCorporativo?: string; printFooter?: PrintDocumentFooterConfig | null } = {},
): boolean => {
  const lineas = detalle.reporteKardex ?? [];
  if (!lineas.length) return false;

  const corporativo = String(options.nombreCorporativo || 'Mabs by Gabs').trim();
  const contable = detalle.comprobanteContable;
  const contableTexto = contable?.numero
    ? `${contable.tipo || 'COMPROBANTE_ENTRADA'} · ${contable.numero}`
    : '—';
  const docFisico = `${detalle.documentoSoporte?.tipo || ''} · ${detalle.documentoSoporte?.numero || ''}`.trim();

  const rows = lineas.map((linea) => {
    const doc = linea.movimiento?.documentoRelacionado;
    return `
      <tr>
        <td>${escapePrintHtml(linea.sku)}</td>
        <td>${escapePrintHtml(linea.bodega)}</td>
        <td>${escapePrintHtml(labelTipoMovimiento(linea))}</td>
        <td class="num">${escapePrintHtml(formatQty(Number(linea.movimiento?.cantidad || 0)))}</td>
        <td class="num">${escapePrintHtml(formatQty(Number(linea.movimiento?.saldoBodega?.cantidadAnterior ?? 0)))}</td>
        <td class="num strong">${escapePrintHtml(formatQty(Number(linea.movimiento?.saldoBodega?.cantidadPosterior ?? linea.saldo?.cantidadDisponible ?? 0)))}</td>
        <td class="num strong">${escapePrintHtml(formatQty(Number(linea.saldo?.cantidadDisponible ?? 0)))}</td>
        <td class="num">${escapePrintHtml(moneyCo(Number(linea.saldo?.costoPromedioUnitario ?? linea.movimiento?.costoUnitario ?? 0)))}</td>
        <td class="mono">${escapePrintHtml(doc?.tipo && doc?.numero ? `${doc.tipo} · ${doc.numero}` : '—')}</td>
      </tr>
    `;
  }).join('');

  const footer: PrintDocumentFooterConfig = options.printFooter ?? {
    row: {
      left: detalle.orden?.proveedor?.nombre ? `Proveedor: ${detalle.orden.proveedor.nombre}` : '',
      center: corporativo,
      right: formatDateTimeCo(new Date().toISOString()),
    },
    lines: [
      `Recepción ${detalle.numeroRecepcion} · OC ${detalle.orden?.numeroOrden || '—'}`,
      docFisico ? `Comprobante físico: ${docFisico}` : undefined,
      `Comprobante contable: ${contableTexto}`,
    ].filter(Boolean) as string[],
  };

  const bodyHtml = `
    <main class="card">
      <h1>Reporte kardex — inventarioMovimiento / inventarioSaldo</h1>
      <section class="grid">
        <div><div class="label">Recepción</div><div class="value mono">${escapePrintHtml(detalle.numeroRecepcion)}</div></div>
        <div><div class="label">Orden compra</div><div class="value mono">${escapePrintHtml(detalle.orden?.numeroOrden || '—')}</div></div>
        <div><div class="label">Comprobante físico</div><div>${escapePrintHtml(docFisico || '—')}</div></div>
        <div><div class="label">Comprobante contable</div><div class="mono">${escapePrintHtml(contableTexto)}</div></div>
      </section>
      <table>
        <thead>
          <tr>
            <th>SKU</th><th>Bodega</th><th>Tipo mov.</th>
            <th class="num">Cant.</th><th class="num">Stock ant.</th><th class="num">Stock post.</th>
            <th class="num">Saldo act.</th><th class="num">Costo prom.</th><th>Documento</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </main>
  `;

  return openPrintDocument({
    title: `${corporativo} - Reporte kardex ${detalle.numeroRecepcion}`,
    bodyHtml,
    footer,
    extraStyles: `
      h1 { margin: 0 0 14px; font-size: 18px; }
      .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin-bottom: 14px; }
      .label { color: #6b7280; font-size: 11px; margin-bottom: 3px; }
      .value { font-weight: 700; }
      .mono { font-family: Consolas, monospace; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border-bottom: 1px solid #e5e7eb; padding: 8px 6px; text-align: left; font-size: 11px; }
      .num { text-align: right; font-variant-numeric: tabular-nums; }
      .strong { font-weight: 700; }
    `,
    onBlocked: () => undefined,
  });
};
