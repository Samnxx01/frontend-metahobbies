import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { toast } from 'react-toastify';
import type { BackendProducto } from '@/app/services/productosService';

export type FormatoCodigoBarras = 'EAN13' | 'CODE128';

export const normalizarCodigoBarrasAlfanumerico = (codigo: string): string =>
  String(codigo || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

export const inferirFormatoCodigoBarras = (
  codigo: string,
  formatoApi?: FormatoCodigoBarras | null,
): FormatoCodigoBarras | null => {
  if (formatoApi === 'EAN13' || formatoApi === 'CODE128') return formatoApi;
  const clean = normalizarCodigoBarrasAlfanumerico(codigo);
  if (!clean) return null;
  if (/^\d{13}$/.test(clean)) return 'EAN13';
  return 'CODE128';
};

const OPCIONES_BARRAS = {
  width: 1.6,
  height: 48,
  displayValue: true,
  fontSize: 11,
  margin: 6,
  background: '#ffffff',
  lineColor: '#111827',
};

export const renderCodigoBarrasEnSvg = (
  svg: SVGSVGElement,
  codigo: string,
  formato?: FormatoCodigoBarras | null,
): void => {
  const clean = normalizarCodigoBarrasAlfanumerico(codigo);
  if (!clean) return;
  const formatoBarras = inferirFormatoCodigoBarras(clean, formato);
  if (!formatoBarras) return;
  JsBarcode(svg, clean, {
    ...OPCIONES_BARRAS,
    format: formatoBarras,
  });
};

export const crearSvgCodigoBarras = (
  codigo: string,
  formato?: FormatoCodigoBarras | null,
): string => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  renderCodigoBarrasEnSvg(svg, codigo, formato);
  return svg.outerHTML;
};

export const getProductoId = (producto: BackendProducto): string =>
  String(producto.iud || producto._id || producto.id || '').trim();

export const BarcodePreview = ({
  codigo,
  formato,
}: {
  codigo?: string;
  formato?: FormatoCodigoBarras | null;
}): React.ReactElement => {
  const svgRef = useRef<SVGSVGElement>(null);
  const clean = normalizarCodigoBarrasAlfanumerico(String(codigo || ''));
  const formatoBarras = inferirFormatoCodigoBarras(clean, formato);

  useEffect(() => {
    if (!svgRef.current || !clean || !formatoBarras) return;
    svgRef.current.innerHTML = '';
    try {
      renderCodigoBarrasEnSvg(svgRef.current, clean, formatoBarras);
    } catch {
      svgRef.current.innerHTML = '';
    }
  }, [clean, formatoBarras]);

  if (!clean) return <span className="text-xs text-muted-foreground">Sin codigo</span>;

  return (
    <div className="space-y-1">
      <svg
        ref={svgRef}
        className="h-10 w-40 rounded bg-white px-1 text-slate-950"
        aria-label={`Codigo de barras ${clean}`}
      />
      <p className="font-mono text-[10px] leading-none tracking-wide">{clean}</p>
    </div>
  );
};

export const imprimirCodigoBarrasSku = (producto: BackendProducto | null): void => {
  const codigo = normalizarCodigoBarrasAlfanumerico(String(producto?.codigoBarras || ''));
  if (!producto || !codigo) {
    toast.error('Este SKU no tiene codigo de barras para imprimir.');
    return;
  }
  const formato = inferirFormatoCodigoBarras(codigo, producto.formatoCodigoBarras);
  if (!formato) {
    toast.error('El codigo de barras no es escaneable.');
    return;
  }
  const svgHtml = crearSvgCodigoBarras(codigo, formato);
  const nombre = String(producto.nombre || '').trim();
  const sku = String(producto.sku || '').trim();
  const printWindow = window.open('', '_blank', 'width=420,height=320');
  if (!printWindow) {
    toast.error('No se pudo abrir la ventana de impresion.');
    return;
  }
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Codigo de barras ${codigo}</title>
        <style>
          body { margin: 0; font-family: Arial, sans-serif; color: #111827; }
          .label { width: 320px; padding: 18px; text-align: center; }
          .sku { font-size: 11px; font-weight: 600; margin-bottom: 4px; }
          .name { font-size: 12px; font-weight: 700; margin-bottom: 8px; }
          svg { width: 280px; height: 110px; }
          @media print { body { margin: 0; } .label { page-break-inside: avoid; } }
        </style>
      </head>
      <body>
        <div class="label">
          ${sku ? `<div class="sku">${sku}</div>` : ''}
          <div class="name">${nombre}</div>
          ${svgHtml}
        </div>
        <script>
          window.onload = function () {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
