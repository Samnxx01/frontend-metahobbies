/**
 * Saneamiento de HTML enriquecido antes de renderizarlo con dangerouslySetInnerHTML.
 * El backend ya sanea al guardar; esto es la segunda barrera en el cliente y
 * mantiene la misma whitelist de formato de texto.
 */

const TAGS_PERMITIDAS = new Set(['b', 'strong', 'i', 'em', 'u', 'span', 'p', 'br', 'div', 'font']);
const ATRIBUTOS_PERMITIDOS = new Set(['style', 'color', 'face', 'size']);

const limpiarStyle = (valor: string): string => valor
  .split(';')
  .map((declaracion) => declaracion.trim())
  .filter((declaracion) => declaracion && !/(expression|url\s*\(|javascript:|@import|behaviou?r)/i.test(declaracion))
  .join('; ');

const limpiarAtributos = (atributosRaw: string): string => {
  const atributos: string[] = [];
  const regex = /([a-zA-Z-]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(atributosRaw)) !== null) {
    const nombre = match[1].toLowerCase();
    if (!ATRIBUTOS_PERMITIDOS.has(nombre)) continue;

    const valor = match[2].replace(/^["']|["']$/g, '');
    if (/javascript:|data:text\/html/i.test(valor)) continue;

    const valorFinal = nombre === 'style' ? limpiarStyle(valor) : valor;
    if (!valorFinal) continue;

    atributos.push(`${nombre}="${valorFinal.replace(/"/g, '&quot;')}"`);
  }

  return atributos.length ? ` ${atributos.join(' ')}` : '';
};

/** Devuelve el HTML limitado a la whitelist de formato de texto. */
export const sanitizeRichText = (html?: string | null): string => {
  const entrada = String(html || '');
  if (!entrada) return '';

  return entrada
    .replace(/<(script|style|iframe|object|embed|link|meta)[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|style|iframe|object|embed|link|meta)[^>]*\/?>/gi, '')
    .replace(/<\s*(\/?)\s*([a-zA-Z0-9]+)((?:[^>"']|"[^"]*"|'[^']*')*)>/g, (_coincidencia, cierre: string, tag: string, atributos: string) => {
      const nombre = String(tag).toLowerCase();
      if (!TAGS_PERMITIDAS.has(nombre)) return '';
      if (cierre) return `</${nombre}>`;
      if (nombre === 'br') return '<br>';
      return `<${nombre}${limpiarAtributos(atributos || '')}>`;
    });
};

/** Texto plano equivalente, útil para validaciones y textos accesibles. */
export const richTextToPlain = (html?: string | null): string => String(html || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export default sanitizeRichText;
