import { toast } from 'react-toastify';

/**
 * Alertas del ciclo de una transacción del panel: se abre una alerta en estado
 * de carga y se cierra indicando si la operación finalizó bien o falló.
 */
export const abrirAlerta = (mensaje: string): string | number => toast.loading(mensaje);

export const cerrarAlerta = (
  alertaId: string | number,
  tipo: 'success' | 'error',
  mensaje: string
): void => {
  toast.update(alertaId, {
    render: mensaje,
    type: tipo,
    isLoading: false,
    autoClose: tipo === 'error' ? 6000 : 3500,
  });
};
