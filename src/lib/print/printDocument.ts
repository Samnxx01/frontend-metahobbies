export type PrintPageSize = 'letter' | 'a4';

export type PrintFooterAlign = 'left' | 'center' | 'right';

export type PrintFooterLine = {
  text: string;
  align?: PrintFooterAlign;
  bold?: boolean;
};

/** Pie de página embebido en el HTML (no depende del encabezado/pie del navegador). */
export type PrintDocumentFooterConfig = {
  /** Fila con tres columnas opcionales. */
  row?: {
    left?: string;
    center?: string;
    right?: string;
  };
  /** Líneas apiladas debajo de la fila (texto plano o con alineación). */
  lines?: Array<string | PrintFooterLine>;
  /** Separador superior del pie. */
  separator?: boolean;
};

export type PrintDocumentMargins = {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
};

export type PrintDocumentOptions = {
  title: string;
  bodyHtml: string;
  footer?: PrintDocumentFooterConfig | null;
  /** Estilos adicionales dentro de <style> (contenido del documento). */
  extraStyles?: string;
  pageSize?: PrintPageSize;
  margins?: PrintDocumentMargins;
  autoPrint?: boolean;
  lang?: string;
};

const DEFAULT_MARGINS: Required<PrintDocumentMargins> = {
  top: '16mm',
  right: '14mm',
  bottom: '28mm',
  left: '14mm',
};

export const escapePrintHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const normalizeFooterLine = (line: string | PrintFooterLine): PrintFooterLine => {
  if (typeof line === 'string') return { text: line, align: 'center' };
  return { text: line.text, align: line.align || 'center', bold: line.bold };
};

export const buildPrintFooterHtml = (footer?: PrintDocumentFooterConfig | null): string => {
  if (!footer) return '';

  const parts: string[] = [];
  const { row, lines = [], separator = true } = footer;

  if (row && (row.left || row.center || row.right)) {
    parts.push(`
      <div class="print-doc-footer-row">
        <span class="print-doc-footer-left">${escapePrintHtml(row.left || '')}</span>
        <span class="print-doc-footer-center">${escapePrintHtml(row.center || '')}</span>
        <span class="print-doc-footer-right">${escapePrintHtml(row.right || '')}</span>
      </div>
    `);
  }

  const normalizedLines = lines
    .map(normalizeFooterLine)
    .filter((line) => String(line.text || '').trim());

  if (normalizedLines.length) {
    parts.push(`
      <div class="print-doc-footer-lines">
        ${normalizedLines.map((line) => `
          <p class="print-doc-footer-line print-doc-footer-line--${line.align || 'center'}${line.bold ? ' print-doc-footer-line--bold' : ''}">
            ${escapePrintHtml(line.text)}
          </p>
        `).join('')}
      </div>
    `);
  }

  if (!parts.length) return '';

  return `
    <footer class="print-doc-footer${separator ? ' print-doc-footer--separator' : ''}" aria-label="Pie de página">
      ${parts.join('')}
    </footer>
  `;
};

export const buildPrintDocumentBaseStyles = (
  pageSize: PrintPageSize = 'letter',
  margins: PrintDocumentMargins = {},
): string => {
  const m = { ...DEFAULT_MARGINS, ...margins };

  return `
    @page {
      size: ${pageSize};
      margin: ${m.top} ${m.right} ${m.bottom} ${m.left};
    }

    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      padding: 0;
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .print-doc-shell {
      min-height: 100%;
      padding-bottom: 24mm;
    }

    .print-doc-footer {
      position: fixed;
      left: ${m.left};
      right: ${m.right};
      bottom: 0;
      padding: 4mm 0 2mm;
      background: #ffffff;
      color: #374151;
      font-size: 9px;
      line-height: 1.35;
      z-index: 9999;
    }

    .print-doc-footer--separator {
      border-top: 1px solid #d1d5db;
    }

    .print-doc-footer-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      align-items: end;
      margin-bottom: 2px;
    }

    .print-doc-footer-left { text-align: left; }
    .print-doc-footer-center { text-align: center; font-weight: 600; color: #111827; }
    .print-doc-footer-right { text-align: right; }

    .print-doc-footer-lines { margin-top: 2px; }
    .print-doc-footer-line { margin: 0; }
    .print-doc-footer-line--left { text-align: left; }
    .print-doc-footer-line--center { text-align: center; }
    .print-doc-footer-line--right { text-align: right; }
    .print-doc-footer-line--bold { font-weight: 700; color: #111827; }

    @media print {
      .print-doc-footer {
        position: fixed;
      }
    }
  `;
};

export const buildPrintDocumentHtml = (options: PrintDocumentOptions): string => {
  const {
    title,
    bodyHtml,
    footer,
    extraStyles = '',
    pageSize = 'letter',
    margins,
    autoPrint = true,
    lang = 'es',
  } = options;

  const footerHtml = buildPrintFooterHtml(footer);
  const baseStyles = buildPrintDocumentBaseStyles(pageSize, margins);

  return `<!doctype html>
<html lang="${escapePrintHtml(lang)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapePrintHtml(title)}</title>
    <style>
      ${baseStyles}
      ${extraStyles}
    </style>
  </head>
  <body>
    <div class="print-doc-shell">
      ${bodyHtml}
    </div>
    ${footerHtml}
    ${autoPrint ? `<script>
      window.addEventListener('load', function () {
        window.focus();
        window.print();
      });
    </script>` : ''}
  </body>
</html>`;
};

export type OpenPrintDocumentOptions = PrintDocumentOptions & {
  onBlocked?: () => void;
};

/**
 * Abre el documento en una pestaña (Blob URL) e imprime.
 * El pie parametrizable va embebido en el HTML: funciona con impresión del navegador,
 * Puppeteer, Playwright, wkhtmltopdf, etc.
 *
 * Nota: desactiva "Encabezados y pies de página" en el diálogo del navegador
 * para ocultar URL/fecha automáticas del motor de impresión.
 */
export const openPrintDocument = (options: OpenPrintDocumentOptions): boolean => {
  if (typeof window === 'undefined') return false;

  const html = buildPrintDocumentHtml(options);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank', 'width=920,height=720');

  if (!printWindow) {
    URL.revokeObjectURL(url);
    options.onBlocked?.();
    return false;
  }

  printWindow.addEventListener('load', () => {
    setTimeout(() => URL.revokeObjectURL(url), 120_000);
  });

  return true;
};

/** Nombre corporativo desde sesión local (fallback para pies de página). */
export const resolveCorporateNameFromSession = (): string => {
  try {
    const raw = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;
    return String(
      user?.corporativo?.razon_social
      || user?.tenantCorporativo?.razon_social
      || user?.perfil?.corporativo?.razon_social
      || user?.perfil?.razon_social
      || user?.empresa
      || user?.nombreEmpresa
      || 'Mabs by Gabs',
    ).trim();
  } catch {
    return 'Mabs by Gabs';
  }
};
