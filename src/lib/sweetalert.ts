import Swal, { SweetAlertOptions } from 'sweetalert2';

/**
 * Obtiene el tema actual (light o dark) desde el documento HTML
 */
const getCurrentTheme = (): 'light' | 'dark' => {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
};

/**
 * Estilos personalizados para dark mode y light mode
 */
const getThemeStyles = (): Partial<SweetAlertOptions> => {
  const theme = getCurrentTheme();

  return {
    background: 'hsl(var(--card))',
    color: 'hsl(var(--foreground))',
    customClass: {
      popup: theme === 'dark' ? 'dark-swal-popup' : 'light-swal-popup',
      title: theme === 'dark' ? 'dark-swal-title' : 'light-swal-title',
      htmlContainer: theme === 'dark' ? 'dark-swal-text' : 'light-swal-text',
      confirmButton: theme === 'dark' ? 'dark-swal-confirm' : 'light-swal-confirm',
      cancelButton: theme === 'dark' ? 'dark-swal-cancel' : 'light-swal-cancel',
      actions: theme === 'dark' ? 'dark-swal-actions' : 'light-swal-actions',
    },
  };
};

/**
 * Wrapper para Swal.fire con soporte automático de dark mode
 */
export const swalFire = (options: SweetAlertOptions) => {
  const themeStyles = getThemeStyles();
  
  const mergedOptions = {
    ...options,
    ...themeStyles,
    confirmButtonColor: options.confirmButtonColor || 'hsl(var(--primary))',
    cancelButtonColor: options.cancelButtonColor || 'hsl(var(--destructive))',
  } as SweetAlertOptions;
  
  return Swal.fire(mergedOptions);
};

/**
 * Exportar Swal original por si se necesita
 */
export { Swal };
export default swalFire;
