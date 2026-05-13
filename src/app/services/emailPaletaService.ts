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
  tiposAsignados: TipoCorreo[];
  fechaCreacion: string;
  fechaActualizacion?: string;
}

export const DEFAULT_COLORS: PaletaColores = {
  COLOR_PRIMARY: '#C43670',
  COLOR_ACCENT: '#F283AF',
  COLOR_LIGHT: '#FBDCE5',
  COLOR_BG: '#FBD9E5',
  COLOR_CHAMPAGNE: '#FBF4EB',
  COLOR_SUNSET: '#F3CC97',
};

export const COLOR_LABELS: Record<keyof PaletaColores, string> = {
  COLOR_PRIMARY: 'Principal (botones, titulos)',
  COLOR_ACCENT: 'Acento (badges, pasos)',
  COLOR_LIGHT: 'Claro (fondo de iconos)',
  COLOR_BG: 'Fondo exterior',
  COLOR_CHAMPAGNE: 'Champagne (header/footer)',
  COLOR_SUNSET: 'Sunset (bordes internos)',
};

export const listarPaletas = (): Promise<{ ok: boolean; paletas: EmailPaleta[] }> =>
  apiFetch('/api/email-paleta', { method: 'GET' });

export const crearPaleta = (data: { nombre: string; colores: PaletaColores; tiposAsignados?: TipoCorreo[] }): Promise<{ ok: boolean; paleta: EmailPaleta }> =>
  apiFetch('/api/email-paleta', { method: 'POST', body: data });

export const actualizarPaleta = (id: string, data: { nombre?: string; colores?: Partial<PaletaColores>; tiposAsignados?: TipoCorreo[] }): Promise<{ ok: boolean; paleta: EmailPaleta }> =>
  apiFetch(`/api/email-paleta/${id}`, { method: 'PUT', body: data });

export const asignarTiposPaleta = (id: string, tiposAsignados: TipoCorreo[]): Promise<{ ok: boolean; paleta: EmailPaleta }> =>
  apiFetch(`/api/email-paleta/${id}/tipos`, { method: 'PATCH', body: { tiposAsignados } });

export const activarPaleta = (id: string): Promise<{ ok: boolean; paleta: EmailPaleta }> =>
  apiFetch(`/api/email-paleta/${id}/activar`, { method: 'PATCH' });

export const eliminarPaleta = (id: string): Promise<{ ok: boolean; msg: string }> =>
  apiFetch(`/api/email-paleta/${id}`, { method: 'DELETE' });

export type TipoCorreo =
  | 'activacion-membresia'
  | 'verificacion-cuenta'
  | 'recuperar-contrasena'
  | 'cambio-contrasena'
  | 'referido-vencimiento'
  | 'pago-cancelado'
  | 'bienvenida-usuario-global';

export const TIPOS_CORREO: { value: TipoCorreo; label: string }[] = [
  { value: 'activacion-membresia', label: 'Activacion de membresia' },
  { value: 'verificacion-cuenta', label: 'Verificacion de cuenta' },
  { value: 'recuperar-contrasena', label: 'Recuperar contrasena' },
  { value: 'cambio-contrasena', label: 'Cambio de contrasena' },
  { value: 'referido-vencimiento', label: 'Referido por vencer' },
  { value: 'pago-cancelado', label: 'Pago cancelado' },
  { value: 'bienvenida-usuario-global', label: 'Bienvenida usuario global' },
];

export type ContenidoCorreo = Record<string, string>;

export interface CampoContenido {
  key: string;
  label: string;
  placeholder: string;
  type?: 'text' | 'number' | 'textarea';
}

export const CAMPOS_CONTENIDO: Record<TipoCorreo, CampoContenido[]> = {
  'activacion-membresia': [
    { key: 'contrasenaTemporal', label: 'Contrasena temporal (ejemplo)', placeholder: 'Ab3$xR7m' },
  ],
  'verificacion-cuenta': [
    { key: 'enlaceActivacion', label: 'Enlace activacion (ejemplo)', placeholder: 'https://…/api/verificar/token', type: 'text' },
    { key: 'heroTitle', label: 'Titulo', placeholder: 'Verifica tu cuenta en MABS', type: 'text' },
    { key: 'heroSub', label: 'Subtitulo', placeholder: 'Tu acceso ya está casi listo.', type: 'text' },
    {
      key: 'bodyText',
      label: 'Texto principal',
      placeholder:
        'Para activar tu cuenta y completar el registro, confirma tu correo con el siguiente enlace seguro.',
      type: 'textarea',
    },
    { key: 'ctaText', label: 'Texto del boton', placeholder: 'Activar cuenta', type: 'text' },
    { key: 'step1', label: 'Paso 1', placeholder: 'Haz clic en «Activar cuenta».', type: 'text' },
    { key: 'step2', label: 'Paso 2', placeholder: 'Completa la activación en la página que se abre.', type: 'text' },
    { key: 'step3', label: 'Paso 3', placeholder: 'Accede a tu espacio en MABS.', type: 'text' },
  ],
  'recuperar-contrasena': [],
  'cambio-contrasena': [
    { key: 'fechaExpiracion', label: 'Tiempo de expiracion del enlace', placeholder: '15 minutos' },
  ],
  'referido-vencimiento': [
    { key: 'nombrePadre', label: 'Nombre del remitente (ejemplo)', placeholder: 'Carlos Perez' },
    { key: 'enlaceReferido', label: 'Enlace de referido (ejemplo)', placeholder: 'https://mabs.com/membresia/pago/token-demo' },
    { key: 'horasRestantes', label: 'Horas restantes (ejemplo)', placeholder: '12', type: 'number' },
  ],
  'pago-cancelado': [
    { key: 'emailCliente', label: 'Correo del cliente (ejemplo)', placeholder: 'cliente@ejemplo.com' },
    { key: 'referencia', label: 'Referencia de pago (ejemplo)', placeholder: 'MABS-0001-000042' },
    { key: 'enlaceReintento', label: 'Enlace para reintentar (ejemplo)', placeholder: 'https://mabs.com/membresia' },
  ],
  'bienvenida-usuario-global': [
    { key: 'tituloSaludo', label: 'Titulo / saludo', placeholder: 'Hola Juan Pixel', type: 'text' },
    { key: 'nombreEmpresa', label: 'Nombre empresa (vacío = ocultar)', placeholder: 'MABS BY GABS', type: 'text' },
    { key: 'etiquetaEmpresa', label: 'Etiqueta empresa', placeholder: 'Empresa:', type: 'text' },
    { key: 'textoPrincipal', label: 'Mensaje principal (negrita)', placeholder: 'Bienvenido, te acabas de vincular con la empresa.', type: 'textarea' },
    { key: 'textoSecundario', label: 'Mensaje de cierre', placeholder: 'Gracias por ser parte de la familia.', type: 'textarea' },
    { key: 'enlaceVerificacion', label: 'Enlace activacion (vacío = sin bloque)', placeholder: 'https://…/api/verificar/token', type: 'text' },
    {
      key: 'textoBloqueVerificacion',
      label: 'Texto antes del boton',
      placeholder: 'Activa tu cuenta con el siguiente enlace:',
      type: 'textarea',
    },
    { key: 'textoBotonVerificacion', label: 'Texto del boton', placeholder: 'Activar cuenta', type: 'text' },
    { key: 'footerLine1', label: 'Pie linea 1', placeholder: '© 2026 MABS · Todos los derechos reservados', type: 'text' },
    { key: 'footerLine2', label: 'Pie linea 2 (opcional)', placeholder: '', type: 'textarea' },
    { key: 'asuntoReferencia', label: 'Asunto (referencia envío real)', placeholder: 'Bienvenido a MABS', type: 'text' },
  ],
};

export const previewEmail = async (
  tipo: TipoCorreo,
  colores: Partial<PaletaColores>,
  contenido: ContenidoCorreo = {}
): Promise<string> => {
  const response: Response = await apiFetch('/api/email-paleta/preview', {
    method: 'POST',
    body: { tipo, colores, contenido },
    responseType: 'raw',
  });
  return response.text();
};
