/**
 * Extrae mensaje legible de errores lanzados por apiFetch (`[status] mensaje`).
 */
export const extractApiErrorMessage = (error: unknown, fallback = 'Ocurrió un error inesperado.'): string => {
  if (error instanceof Error && error.message) {
    return error.message.replace(/^\[\d+\]\s*/, '').trim() || fallback;
  }
  if (typeof error === 'string') return error;
  return fallback;
};

export type ApiResponsePayload<T> = {
  ok?: boolean;
  msg?: string;
  data?: T;
};
