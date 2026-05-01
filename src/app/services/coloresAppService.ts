import { apiFetch, apiFetchPublic } from './api';

export interface ColoresApp {
  COLOR_PRIMARY: string;
  COLOR_ACCENT: string;
  COLOR_LIGHT: string;
  COLOR_BG: string;
  COLOR_CHAMPAGNE: string;
  COLOR_SUNSET: string;
}

export const DEFAULT_COLORES_APP: ColoresApp = {
  COLOR_PRIMARY:   '#C43670',
  COLOR_ACCENT:    '#F283AF',
  COLOR_LIGHT:     '#FBDCE5',
  COLOR_BG:        '#FBD9E5',
  COLOR_CHAMPAGNE: '#FBF4EB',
  COLOR_SUNSET:    '#F3CC97',
};

/** Misma fuente que el backend por defecto: evita HEX “quemados” distintos al endpoint. */
export const fusionarColoresApp = (partial?: Partial<ColoresApp> | null): ColoresApp => ({
  ...DEFAULT_COLORES_APP,
  ...(partial || {}),
});

// Sin JWT — para vistas públicas y BrandingProvider
export const obtenerColoresPublico = (): Promise<{ ok: boolean; colores: ColoresApp }> =>
  apiFetchPublic('/api/colores-app/publica');

// Con JWT — solo desde el admin
export const guardarColoresApp = (
  colores: Partial<ColoresApp>
): Promise<{ ok: boolean; msg: string; colores: ColoresApp }> =>
  apiFetch('/api/colores-app', { method: 'PUT', body: { colores } });
