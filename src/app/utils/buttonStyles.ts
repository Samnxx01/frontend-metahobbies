/** Clases estándar para botones de acción — enlazadas a COLOR_SUNSET vía --button. */
export const BTN_ACTION =
  'bg-button text-button-foreground hover:bg-button/90';

/** Hover suave para botones ghost / icono. */
export const BTN_GHOST_ACCENT =
  'text-button-foreground hover:bg-button/10 hover:text-button-foreground';

/** Estado pendiente / deshabilitado visual (outline cálido). */
export const BTN_PENDING =
  'border-button/40 bg-button/10 text-button-foreground hover:bg-button/20 hover:text-button-foreground';

/**
 * Botones de acción de fila (editar / probar / eliminar) en tablas tipo CRUD.
 * Mismo peso visual (relleno sólido) que el botón primario "Nueva conexión",
 * pero cada uno toma su color de una variable CSS distinta para diferenciarse
 * y para recolorearse solos cuando el tenant cambia su paleta
 * (ver ColorUtils.aplicarPaletaEnApp).
 */
export const BTN_ROW_EDIT =
  'border-transparent bg-accent text-accent-foreground shadow-sm hover:bg-accent/90';

export const BTN_ROW_PROBE =
  'border-transparent bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/90';

export const BTN_ROW_DELETE =
  'border-transparent bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90';
