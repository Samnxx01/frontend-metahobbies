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
  const isDark = getCurrentTheme() === 'dark';
  
  return {
    background: isDark ? 'hsl(var(--card))' : '#fff',
    color: isDark ? 'hsl(var(--foreground))' : '#545454',
    customClass: {
      popup: isDark ? 'dark-swal-popup' : 'light-swal-popup',
      title: isDark ? 'dark-swal-title' : 'light-swal-title',
      htmlContainer: isDark ? 'dark-swal-text' : 'light-swal-text',
      confirmButton: isDark ? 'dark-swal-confirm' : 'light-swal-confirm',
      cancelButton: isDark ? 'dark-swal-cancel' : 'light-swal-cancel',
      actions: isDark ? 'dark-swal-actions' : 'light-swal-actions',
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
    confirmButtonColor: options.confirmButtonColor || '#3085d6',
    cancelButtonColor: options.cancelButtonColor || '#d33',
  } as SweetAlertOptions;
  
  return Swal.fire(mergedOptions);
};

/**
 * Exportar Swal original por si se necesita
 */
export { Swal };
export default swalFire;
