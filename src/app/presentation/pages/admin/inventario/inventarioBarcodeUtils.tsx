import React from 'react';
import { toast } from 'react-toastify';
import type { BackendProducto } from '@/app/services/productosService';

const EAN13_L: Record<string, string> = {
  '0': '0001101', '1': '0011001', '2': '0010011', '3': '0111101', '4': '0100011',
  '5': '0110001', '6': '0101111', '7': '0111011', '8': '0110111', '9': '0001011',
};
const EAN13_G: Record<string, string> = {
  '0': '0100111', '1': '0110011', '2': '0011011', '3': '0100001', '4': '0011101',
  '5': '0111001', '6': '0000101', '7': '0010001', '8': '0001001', '9': '0010111',
};
const EAN13_R: Record<string, string> = {
  '0': '1110010', '1': '1100110', '2': '1101100', '3': '1000010', '4': '1011100',
  '5': '1001110', '6': '1010000', '7': '1000100', '8': '1001000', '9': '1110100',
};
const EAN13_PARITY: Record<string, string> = {
  '0': 'LLLLLL', '1': 'LLGLGG', '2': 'LLGGLG', '3': 'LLGGGL', '4': 'LGLLGG',
  '5': 'LGGLLG', '6': 'LGGGLL', '7': 'LGLGLG', '8': 'LGLGGL', '9': 'LGGLGL',
};

export const normalizarCodigoBarrasAlfanumerico = (codigo: string): string =>
  String(codigo || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

export const buildEan13Bits = (codigo: string): string | null => {
  const digits = normalizarCodigoBarrasAlfanumerico(codigo).replace(/[^0-9]/g, '');
  if (digits.length !== 13) return null;
  const parity = EAN13_PARITY[digits[0]];
  const left = digits.slice(1, 7).split('').map((digit, index) => (
    parity[index] === 'L' ? EAN13_L[digit] : EAN13_G[digit]
  )).join('');
  const right = digits.slice(7).split('').map((digit) => EAN13_R[digit]).join('');
  return `101${left}01010${right}101`;
};

export const getProductoId = (producto: BackendProducto): string =>
  String(producto.iud || producto._id || producto.id || '').trim();

export const BarcodePreview = ({ codigo }: { codigo?: string }): React.ReactElement => {
  const clean = normalizarCodigoBarrasAlfanumerico(String(codigo || ''));
  const eanDigits = clean.replace(/[^0-9]/g, '');
  const bits = eanDigits.length === 13 ? buildEan13Bits(eanDigits) : null;
  if (!clean) return <span className="text-xs text-muted-foreground">Sin codigo</span>;
  if (!bits) {
    return (
      <div className="space-y-1">
        <div className="flex h-8 w-36 items-end gap-px rounded bg-white px-2 py-1">
          {clean.split('').map((char, index) => (
            <span
              key={`${char}-${index}`}
              className="block bg-foreground"
              style={{
                width: 1 + (char.charCodeAt(0) % 3),
                height: 12 + ((char.charCodeAt(0) + index) % 18),
              }}
            />
          ))}
        </div>
        <p className="font-mono text-[10px] leading-none">{clean}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <svg viewBox={`0 0 ${bits.length} 48`} className="h-10 w-40 rounded bg-white px-1" preserveAspectRatio="none" aria-label={`Codigo de barras ${clean}`}>
        {bits.split('').map((bit, index) => bit === '1' ? (
          <rect key={index} x={index} y="4" width="1" height="36" fill="currentColor" />
        ) : null)}
      </svg>
      <p className="font-mono text-[10px] leading-none tracking-[0.18em]">{clean}</p>
    </div>
  );
};

export const imprimirCodigoBarrasSku = (producto: BackendProducto | null): void => {
  const codigo = normalizarCodigoBarrasAlfanumerico(String(producto?.codigoBarras || ''));
  if (!producto || !codigo) {
    toast.error('Este SKU no tiene codigo de barras para imprimir.');
    return;
  }
  const eanDigits = codigo.replace(/[^0-9]/g, '');
  const bits = eanDigits.length === 13 ? buildEan13Bits(eanDigits) : null;
  const bars = bits
    ? bits.split('').map((bit, index) => (
      bit === '1' ? `<rect x="${index}" y="10" width="1" height="70" fill="#111827" />` : ''
    )).join('')
    : codigo.split('').map((char, index) => (
      `<rect x="${index * 2}" y="10" width="1" height="${50 + (char.charCodeAt(0) % 20)}" fill="#111827" />`
    )).join('');
  const viewBoxWidth = bits ? bits.length : codigo.length * 2;
  const nombre = String(producto.nombre || '').trim();
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
          .name { font-size: 12px; font-weight: 700; margin-bottom: 8px; }
          svg { width: 260px; height: 120px; }
          @media print { body { margin: 0; } .label { page-break-inside: avoid; } }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="name">${nombre}</div>
          <svg viewBox="0 0 ${viewBoxWidth} 90" preserveAspectRatio="none">${bars}</svg>
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
