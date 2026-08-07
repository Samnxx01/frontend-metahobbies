/**
 * Tokens semánticos de la paleta activa. Son las CSS vars que `aplicarPaletaEnApp`
 * (ColorUtils.ts) escribe en :root a partir de los colores guardados en BD.
 *
 * El contenido de publicidad referencia estos tokens (`hsl(var(--primary))`) en vez
 * de HEX fijos: al cambiar la paleta, el texto cambia con ella.
 * Mantener sincronizado con `server-mabs/helpers/paletaSemanticaTokens.js`.
 */

export interface TokenPaleta {
  /** Nombre de la CSS var, sin los guiones iniciales. */
  token: string;
  label: string;
}

export const TOKENS_PALETA_SEMANTICA: readonly TokenPaleta[] = [
  { token: 'primary', label: 'Primario (marca)' },
  { token: 'secondary', label: 'Secundario' },
  { token: 'accent', label: 'Acento' },
  { token: 'foreground', label: 'Texto principal' },
  { token: 'muted-foreground', label: 'Texto atenuado' },
  { token: 'card-foreground', label: 'Texto sobre tarjeta' },
  { token: 'background', label: 'Fondo' },
  { token: 'card', label: 'Tarjeta' },
  { token: 'border', label: 'Borde' },
  { token: 'button', label: 'Botón' },
  { token: 'success', label: 'Éxito' },
  { token: 'warning', label: 'Advertencia' },
  { token: 'info', label: 'Información' },
  { token: 'destructive', label: 'Destructivo' },
] as const;

/** Valor CSS que referencia el token (las vars guardan HSL sin envolver). */
export const cssVarDeToken = (token: string): string => `hsl(var(--${token}))`;

/** Color real que el token resuelve ahora mismo, para pintar muestras en la UI. */
export const colorResueltoDeToken = (token: string): string => {
  if (typeof window === 'undefined') return 'transparent';
  const valor = getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim();
  return valor ? `hsl(${valor})` : 'transparent';
};

/** Tokens de paleta referenciados dentro de un HTML. */
export const extraerTokensColor = (html?: string | null): string[] => {
  const permitidos = new Set(TOKENS_PALETA_SEMANTICA.map((item) => item.token));
  const encontrados = new Set<string>();
  const regex = /var\(\s*--([a-z0-9-]+)\s*\)/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(String(html || ''))) !== null) {
    const token = match[1].toLowerCase();
    if (permitidos.has(token)) encontrados.add(token);
  }

  return [...encontrados];
};
