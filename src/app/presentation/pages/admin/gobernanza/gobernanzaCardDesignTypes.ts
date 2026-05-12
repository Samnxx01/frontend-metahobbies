/** Preferencias visuales por tarjeta de endpoint (solo UI; persiste en localStorage). */

export type GobernanzaCardDesign = {
  surface: 'default' | 'elevated' | 'soft' | 'minimal';
  accent: 'primary' | 'sky' | 'violet' | 'emerald' | 'rose';
  pathEmphasis: boolean;
};

export const DEFAULT_GOBERNANZA_CARD_DESIGN: GobernanzaCardDesign = {
  surface: 'default',
  accent: 'primary',
  pathEmphasis: false,
};

const STORAGE_KEY = 'gobernanza-card-designs-v1';

export function loadAllCardDesigns(): Record<string, GobernanzaCardDesign> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, GobernanzaCardDesign>;
  } catch {
    return {};
  }
}

export function persistAllCardDesigns(next: Record<string, GobernanzaCardDesign>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
}

const SURFACE: Record<GobernanzaCardDesign['surface'], string> = {
  default: '',
  elevated: 'shadow-lg shadow-primary/10 border-primary/25',
  soft: 'border-primary/20 bg-gradient-to-br from-primary/[0.07] via-card to-card',
  minimal: 'border-dashed border-muted-foreground/30 bg-muted/25',
};

const ACCENT_LEFT: Record<GobernanzaCardDesign['accent'], string> = {
  primary: 'border-l-[3px] border-l-primary',
  sky: 'border-l-[3px] border-l-sky-500',
  violet: 'border-l-[3px] border-l-violet-500',
  emerald: 'border-l-[3px] border-l-emerald-500',
  rose: 'border-l-[3px] border-l-rose-500',
};

/** Clases extra para el contenedor Card del endpoint. */
export function cardShellClassForDesign(
  id: string,
  byId: Record<string, GobernanzaCardDesign>
): string {
  const d = byId[id] ?? DEFAULT_GOBERNANZA_CARD_DESIGN;
  const parts = [SURFACE[d.surface] || SURFACE.default, ACCENT_LEFT[d.accent] || ACCENT_LEFT.primary];
  return parts.filter(Boolean).join(' ');
}

/** Clases para la caja de la ruta (monospace). */
export function cardPathClassForDesign(
  id: string,
  byId: Record<string, GobernanzaCardDesign>
): string {
  const d = byId[id] ?? DEFAULT_GOBERNANZA_CARD_DESIGN;
  if (!d.pathEmphasis) return '';
  return 'ring-2 ring-primary/25 ring-offset-2 ring-offset-background bg-primary/[0.06]';
}
