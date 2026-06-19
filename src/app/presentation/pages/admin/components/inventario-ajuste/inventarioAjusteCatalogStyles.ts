import { BTN_ACTION } from '@/app/utils/buttonStyles';

/** Clases compartidas para modales de catálogo de ajustes (paleta primary del tema). */
export const catalogoAjusteUi = {
  dialogContent: 'max-w-4xl max-h-[90vh] overflow-y-auto border-primary/25',
  dialogContentSm: 'max-w-lg border-primary/25',
  description: 'text-primary',
  section: 'rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4',
  input: 'border-primary/35 focus-visible:ring-primary/40',
  tableWrap: 'max-h-64 overflow-auto rounded-md border border-primary/20',
  tableHead: 'text-primary font-semibold bg-primary/5',
  tableRowHover: 'hover:bg-primary/5',
  linkAction: 'text-xs font-medium text-primary underline-offset-2 hover:underline',
  btnPrimary: BTN_ACTION,
  badgeEntrada: 'border-primary/40 bg-primary/10 text-primary',
  badgeSalida: 'border-destructive/40 bg-destructive/10 text-destructive',
} as const;
