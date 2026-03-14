import { apiFetch } from './api';

export interface PaletaColores {
  COLOR_PRIMARY: string;
  COLOR_ACCENT: string;
  COLOR_LIGHT: string;
  COLOR_BG: string;
  COLOR_CHAMPAGNE: string;
  COLOR_SUNSET: string;
}

export interface EmailPaleta {
  _id: string;
  nombre: string;
  activa: boolean;
  colores: PaletaColores;
  fechaCreacion: string;
  fechaActualizacion?: string;
}

export const DEFAULT_COLORS: PaletaColores = {
  COLOR_PRIMARY:   '#C43670',
  COLOR_ACCENT:    '#F283AF',
  COLOR_LIGHT:     '#FBDCE5',
  COLOR_BG:        '#FBD9E5',
  COLOR_CHAMPAGNE: '#FBF4EB',
  COLOR_SUNSET:    '#F3CC97',
};

export const COLOR_LABELS: Record<keyof PaletaColores, string> = {
  COLOR_PRIMARY:   'Principal (botones, títulos)',
  COLOR_ACCENT:    'Acento (badges, pasos)',
  COLOR_LIGHT:     'Claro (fondo de íconos)',
  COLOR_BG:        'Fondo exterior',
  COLOR_CHAMPAGNE: 'Champagne (header/footer)',
  COLOR_SUNSET:    'Sunset (bordes internos)',
};

export const listarPaletas = (): Promise<{ ok: boolean; paletas: EmailPaleta[] }> =>
  apiFetch('/api/email-paleta', { method: 'GET' });

export const crearPaleta = (data: { nombre: string; colores: PaletaColores }): Promise<{ ok: boolean; paleta: EmailPaleta }> =>
  apiFetch('/api/email-paleta', { method: 'POST', body: data });

export const actualizarPaleta = (id: string, data: { nombre?: string; colores?: Partial<PaletaColores> }): Promise<{ ok: boolean; paleta: EmailPaleta }> =>
  apiFetch(`/api/email-paleta/${id}`, { method: 'PUT', body: data });

export const activarPaleta = (id: string): Promise<{ ok: boolean; paleta: EmailPaleta }> =>
  apiFetch(`/api/email-paleta/${id}/activar`, { method: 'PATCH' });

export const eliminarPaleta = (id: string): Promise<{ ok: boolean; msg: string }> =>
  apiFetch(`/api/email-paleta/${id}`, { method: 'DELETE' });

export type TipoCorreo =
  | 'activacion-membresia'
  | 'verificacion-cuenta'
  | 'recuperar-contrasena'
  | 'cambio-contrasena';

export const TIPOS_CORREO: { value: TipoCorreo; label: string }[] = [
  { value: 'activacion-membresia',  label: 'Activación de membresía' },
  { value: 'verificacion-cuenta',   label: 'Verificación de cuenta' },
  { value: 'recuperar-contrasena',  label: 'Recuperar contraseña' },
  { value: 'cambio-contrasena',     label: 'Cambio de contraseña' },
];

export const previewEmail = async (
  tipo: TipoCorreo,
  colores: Partial<PaletaColores>
): Promise<string> => {
  const response: Response = await apiFetch('/api/email-paleta/preview', {
    method: 'POST',
    body: { tipo, colores },
    responseType: 'raw',
  });
  return response.text();
};
