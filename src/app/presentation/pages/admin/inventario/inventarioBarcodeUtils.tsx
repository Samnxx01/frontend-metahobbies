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

/**
 * Genera un código de barras basado en el SKU del producto.
 * Si el SKU normalizado tiene 8-14 chars y no está en uso, lo usa directamente.
 * Si es más corto, rellena con dígitos consecutivos hasta alcanzar 8 chars.
 * Si ya existe, incrementa el contador hasta encontrar uno libre.
 */
export const generarCodigoBarrasDesdeSkú = (
  sku: string,
  existentes: Set<string>,
): string => {
  const base = normalizarCodigoBarrasAlfanumerico(sku);
  if (!base) {
    const fallback = `B${Date.now().toString(36).toUpperCase()}`.slice(0, 12);
    return fallback;
  }

  // SKU ya válido y libre
  if (base.length >= 8 && base.length <= 14 && !existentes.has(base)) return base;

  // Prefijo: si es > 10 chars lo acortamos para dejar espacio al sufijo consecutivo
  const prefix = base.length >= 8 ? base.slice(0, 10) : base;
  const minLen = Math.max(8, prefix.length + 1);

  for (let i = 1; i <= 9999; i++) {
    const suffix = String(i).padStart(minLen - prefix.length, '0');
    const candidato = (prefix + suffix).slice(0, 14);
    if (!existentes.has(candidato)) return candidato;
  }

  return (base + Date.now().toString(36).toUpperCase()).slice(0, 14);
};

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

export const imprimirMultiplesCodigosBarras = (productos: BackendProducto[]): void => {
  const validos = productos.filter((p) => normalizarCodigoBarrasAlfanumerico(String(p.codigoBarras || '')));
  if (validos.length === 0) {
    toast.error('Ninguno de los SKU seleccionados tiene codigo de barras.');
    return;
  }
  const labelsHtml = validos.map((producto) => {
    const codigo = normalizarCodigoBarrasAlfanumerico(String(producto.codigoBarras || ''));
    const formato = inferirFormatoCodigoBarras(codigo, producto.formatoCodigoBarras);
    const svgHtml = formato ? crearSvgCodigoBarras(codigo, formato) : '';
    const nombre = String(producto.nombre || '').trim();
    const sku = String(producto.sku || '').trim();
    return `
      <div class="label">
        ${sku ? `<div class="sku">${sku}</div>` : ''}
        <div class="name">${nombre}</div>
        ${svgHtml || `<p style="font-size:10px;color:#999">Sin codigo</p>`}
      </div>`;
  }).join('');

  const printWindow = window.open('', '_blank', 'width=860,height=620');
  if (!printWindow) {
    toast.error('No se pudo abrir la ventana de impresion.');
    return;
  }
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Etiquetas de codigos de barras</title>
        <style>
          body { margin: 12px; font-family: Arial, sans-serif; color: #111827; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
          .label { border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; text-align: center; page-break-inside: avoid; }
          .sku { font-size: 10px; font-weight: 600; color: #6b7280; margin-bottom: 2px; }
          .name { font-size: 11px; font-weight: 700; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          svg { max-width: 100%; height: 80px; }
          @media print {
            body { margin: 0; }
            .grid { grid-template-columns: repeat(3, 1fr); gap: 8px; }
            .label { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="grid">${labelsHtml}</div>
        <script>
          window.onload = function () { window.focus(); window.print(); };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
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
