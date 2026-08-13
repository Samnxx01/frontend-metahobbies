/**
 * Utilidad que convierte colores HEX → HSL en el formato que usa Tailwind + shadcn/ui.
 * Tailwind espera: "328 78% 54%" (sin "hsl(" ni ")")
 */

/**
 * Convierte un color HEX (#RRGGBB) a los valores H S% L%
 * en el formato de string que usan las CSS variables de Tailwind.
 * Ejemplo: hexToHsl("#C43670") → "328 78% 54%"
 */
export function hexToHsl(hex: string): string {
    // Normalizar — admite #RGB y #RRGGBB
    const clean = hex.replace('#', '');
    const full = clean.length === 3
        ? clean.split('').map(c => c + c).join('')
        : clean;

    const r = parseInt(full.slice(0, 2), 16) / 255;
    const g = parseInt(full.slice(2, 4), 16) / 255;
    const b = parseInt(full.slice(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (delta !== 0) {
        s = delta / (1 - Math.abs(2 * l - 1));

        switch (max) {
            case r: h = ((g - b) / delta + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / delta + 2) / 6; break;
            case b: h = ((r - g) / delta + 4) / 6; break;
        }
    }

    const hDeg = Math.round(h * 360);
    const sPct = Math.round(s * 100);
    const lPct = Math.round(l * 100);

    return `${hDeg} ${sPct}% ${lPct}%`;
}

const hexToRgb = (hex: string): [number, number, number] => {
    const clean = String(hex || '').replace('#', '');
    const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean.padEnd(6, '0');
    return [0, 2, 4].map(offset => parseInt(full.slice(offset, offset + 2), 16) || 0) as [number, number, number];
};

const luminancia = (hex: string): number => {
    const rgb = hexToRgb(hex).map(value => {
        const channel = value / 255;
        return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return (0.2126 * rgb[0]) + (0.7152 * rgb[1]) + (0.0722 * rgb[2]);
};

const contraste = (a: string, b: string): number => {
    const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
    return (claro + 0.05) / (oscuro + 0.05);
};

/** Conserva COLOR_TEXT cuando es legible; si no, elige negro o blanco con contraste WCAG. */
const textoLegible = (fondo: string, preferido: string): string => {
    if (contraste(fondo, preferido) >= 4.5) return hexToHsl(preferido);
    return contraste(fondo, '#000000') >= contraste(fondo, '#FFFFFF')
        ? hexToHsl('#000000')
        : hexToHsl('#FFFFFF');
};

/**
 * Mapeo de colores del email (PaletaColores) → variables CSS de la app.
 * Cada entrada: [variableCSS, valorHSL]
 * Se pueden mapear múltiples variables CSS al mismo color de la paleta.
 */
export type PaletaColorKey =
    | 'COLOR_PRIMARY'
    | 'COLOR_ACCENT'
    | 'COLOR_LIGHT'
    | 'COLOR_BG'
    | 'COLOR_CHAMPAGNE'
    | 'COLOR_SUNSET'
    | 'COLOR_TEXT';

export interface ColoresPaleta {
    COLOR_PRIMARY: string;
    COLOR_ACCENT: string;
    COLOR_LIGHT: string;
    COLOR_BG: string;
    COLOR_CHAMPAGNE: string;
    COLOR_SUNSET: string;
    COLOR_TEXT: string;
}

/**
 * Aplica los colores de una paleta como CSS variables en :root.
 * Convierte HEX → HSL y hace setProperty en document.documentElement.
 */
export function aplicarPaletaEnApp(colores: ColoresPaleta): void {
    const root = document.documentElement;

    const hsl: any = (key: PaletaColorKey) => hexToHsl(colores[key]);

    root.style.setProperty('--background', hsl('COLOR_BG'));

    // COLOR_TEXT → color de texto principal en toda la app
    root.style.setProperty('--foreground', textoLegible(colores.COLOR_BG, colores.COLOR_TEXT));
    root.style.setProperty('--card-foreground', textoLegible(colores.COLOR_CHAMPAGNE, colores.COLOR_TEXT));
    root.style.setProperty('--popover-foreground', textoLegible(colores.COLOR_CHAMPAGNE, colores.COLOR_TEXT));

    // COLOR_PRIMARY → color dominante de la app
    root.style.setProperty('--primary', hsl('COLOR_PRIMARY'));
    root.style.setProperty('--ring', hsl('COLOR_PRIMARY'));
    root.style.setProperty('--primary-foreground', textoLegible(colores.COLOR_PRIMARY, colores.COLOR_TEXT));

    // COLOR_ACCENT → acento y secondary
    root.style.setProperty('--accent', hsl('COLOR_ACCENT'));
    root.style.setProperty('--accent-foreground', textoLegible(colores.COLOR_ACCENT, colores.COLOR_TEXT));

    // COLOR_SUNSET → botones de acción y tono secundario complementario
    const sunsetHsl = hsl('COLOR_SUNSET');
    root.style.setProperty('--button', sunsetHsl);
    root.style.setProperty('--button-foreground', textoLegible(colores.COLOR_SUNSET, colores.COLOR_TEXT));
    root.style.setProperty('--secondary', sunsetHsl);
    root.style.setProperty('--secondary-foreground', textoLegible(colores.COLOR_SUNSET, colores.COLOR_TEXT));

    // COLOR_LIGHT → muted, border, input
    root.style.setProperty('--muted', hsl('COLOR_LIGHT'));
    root.style.setProperty('--muted-foreground', textoLegible(colores.COLOR_LIGHT, colores.COLOR_TEXT));
    root.style.setProperty('--border', hsl('COLOR_LIGHT'));
    root.style.setProperty('--input', hsl('COLOR_LIGHT'));

    // COLOR_CHAMPAGNE → card y popover (foreground ya fue seteado con COLOR_TEXT arriba)
    root.style.setProperty('--card', hsl('COLOR_CHAMPAGNE'));
    root.style.setProperty('--popover', hsl('COLOR_CHAMPAGNE'));

    // COLOR_PRIMARY también como destructive (tono de marca)
    root.style.setProperty('--destructive', hsl('COLOR_PRIMARY'));
    root.style.setProperty('--destructive-foreground', textoLegible(colores.COLOR_PRIMARY, colores.COLOR_TEXT));

    // Estados semánticos — mapeados a la paleta para que nada quede quemado:
    // success→ACCENT, warning→SUNSET, info→LIGHT; texto de estado con COLOR_TEXT.
    root.style.setProperty('--success', hsl('COLOR_ACCENT'));
    root.style.setProperty('--success-foreground', textoLegible(colores.COLOR_ACCENT, colores.COLOR_TEXT));
    root.style.setProperty('--warning', hsl('COLOR_SUNSET'));
    root.style.setProperty('--warning-foreground', textoLegible(colores.COLOR_SUNSET, colores.COLOR_TEXT));
    root.style.setProperty('--info', hsl('COLOR_LIGHT'));
    root.style.setProperty('--info-foreground', textoLegible(colores.COLOR_LIGHT, colores.COLOR_TEXT));

    // Persistir en localStorage para restaurar al recargar
    localStorage.setItem('mabs_paleta_activa', JSON.stringify(colores));
}

/**
 * Restaura la paleta guardada en localStorage (si existe).
 * Se llama al iniciar la app para evitar el flash del color por defecto.
 */
export function restaurarPaletaLocal(): boolean {
    try {
        const raw = localStorage.getItem('mabs_paleta_activa');
        if (!raw) return false;
        const colores = JSON.parse(raw) as ColoresPaleta;
        aplicarPaletaEnApp(colores);
        return true;
    } catch {
        return false;
    }
}

/**
 * Limpia la paleta personalizada y vuelve a los colores por defecto del CSS.
 */
export function limpiarPaletaApp(): void {
    const root = document.documentElement;
    const vars = [
        '--background',
        '--foreground', '--card-foreground', '--popover-foreground',
        '--primary', '--primary-foreground', '--ring',
        '--accent', '--accent-foreground',
        '--button', '--button-foreground',
        '--secondary', '--secondary-foreground',
        '--muted', '--muted-foreground',
        '--border', '--input',
        '--card',
        '--popover',
        '--destructive', '--destructive-foreground',
        '--success', '--success-foreground',
        '--warning', '--warning-foreground',
        '--info', '--info-foreground',
    ];
    vars.forEach(v => root.style.removeProperty(v));
    localStorage.removeItem('mabs_paleta_activa');
}
