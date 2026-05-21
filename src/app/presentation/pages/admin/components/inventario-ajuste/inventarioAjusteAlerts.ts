import { toast } from 'react-toastify';
import { extractApiErrorMessage } from '@/app/utils/apiErrorMessage';

export const toastAjusteExito = (mensaje: string): void => {
  toast.success(mensaje);
};

export const toastAjusteError = (error: unknown, fallback: string): void => {
  if (error === null || error === undefined) {
    toast.error(fallback);
    return;
  }
  toast.error(extractApiErrorMessage(error, fallback));
};

export const toastAjusteInfo = (mensaje: string): void => {
  toast.info(mensaje);
};
