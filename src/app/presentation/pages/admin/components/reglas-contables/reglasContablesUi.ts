/** Estilos compartidos para parametrización de reglas contables (paleta primary). */
export const reglasContablesUi = {
  dialogContent: 'max-w-5xl max-h-[90vh] overflow-y-auto border-primary/25',
  dialogContentSm: 'max-w-xl border-primary/25',
  description: 'text-primary',
  section: 'rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4',
  input: 'border-primary/35 focus-visible:ring-primary/40',
  tableWrap: 'max-h-[min(24rem,50vh)] overflow-auto rounded-md border border-primary/20',
  tableHead: 'text-primary font-semibold bg-primary/5',
  tableRowHover: 'hover:bg-primary/5',
  linkAction: 'text-xs font-medium text-primary underline-offset-2 hover:underline',
  btnPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  badgeSistema: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200',
} as const;
