import { BTN_ACTION } from '@/app/utils/buttonStyles';

/** Estilos compartidos para parametrización de reglas contables (paleta primary). */
export const reglasContablesUi = {
  dialogContent: 'w-[calc(100%-2rem)] max-w-5xl max-h-[90dvh] overflow-y-auto border-primary/25',
  dialogContentSm: 'w-[calc(100%-2rem)] max-w-xl max-h-[90dvh] overflow-y-auto border-primary/25',
  description: 'text-primary',
  section: 'rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4',
  input: 'border-primary/35 focus-visible:ring-primary/40',
  tableWrap: 'max-h-[min(24rem,50vh)] overflow-auto rounded-md border border-primary/20',
  tableHead: 'text-primary font-semibold bg-primary/5',
  tableRowHover: 'hover:bg-primary/5',
  linkAction: 'text-xs font-medium text-primary underline-offset-2 hover:underline',
  btnPrimary: BTN_ACTION,
  badgeSistema: 'border-warning/40 bg-warning/10 text-warning dark:text-warning',
} as const;
