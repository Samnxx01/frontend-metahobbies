import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ParametrosGobernanzaModalFormLayoutProps = {
  /** Metadatos mínimos para path + aviso de scope */
  path: string;
  actorLabel: string;
  /** Oculta la ruta API en la barra de acciones (flujo inline tipo Inventario). */
  showApiPath?: boolean;
  /** Etiqueta del botón principal (p. ej. Consultar / Guardar). */
  executeLabel?: string;
  running: boolean;
  disponible: boolean;
  /** Deshabilita solo el botón Ejecutar (p. ej. modo solo lectura por jerarquía corporativa). */
  executeDisabled?: boolean;
  executeDisabledReason?: string;
  /** Clases Tailwind para el botón principal (p. ej. verde cuando el scope JWT valida). */
  executeButtonClassName?: string;
  /** Acciones extra sobre la barra de botones (p. ej. sincronizar regla DIOS). */
  extraToolbar?: React.ReactNode;
  onExecute: () => void;
  onClearForm: () => void;
  /**
   * Si se define, sustituye el botón «Limpiar formulario» (p. ej. sincronización jerarquía counters).
   * Si no se pasa, se muestra el limpiado por defecto.
   */
  clearFormReplacement?: React.ReactNode;
  /** Campos del formulario (pueden vivir en componentes hijos por endpoint). */
  children: React.ReactNode;
  /** Tablas JSON / pre según endpoint — lo controla el padre ParametrosGobernanza. */
  resultSlot: React.ReactNode;
};

/**
 * Envoltorio del contenido del modal de Parametros Gobernanza: mismo layout para todos los endpoints,
 * con Ejecutar / Limpiar / ruta / aviso de scope y área de resultado. El cuerpo del formulario va en `children`.
 */
export function ParametrosGobernanzaModalFormLayout({
  path,
  actorLabel,
  running,
  disponible,
  showApiPath = true,
  executeLabel = 'Ejecutar',
  executeDisabled = false,
  executeDisabledReason,
  executeButtonClassName,
  extraToolbar,
  onExecute,
  onClearForm,
  clearFormReplacement,
  children,
  resultSlot,
}: ParametrosGobernanzaModalFormLayoutProps): React.ReactElement {
  const ejecutarBloqueado = !disponible || executeDisabled;
  return (
    <div className="space-y-4">
      {children}
      {extraToolbar ? <div className="flex flex-wrap items-center gap-2">{extraToolbar}</div> : null}
      {executeDisabledReason && disponible && executeDisabled ? (
        <p className="text-xs font-medium text-amber-700">{executeDisabledReason}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
        <Button
          type="button"
          variant={executeButtonClassName ? 'outline' : 'default'}
          onClick={onExecute}
          disabled={running || ejecutarBloqueado}
          className={cn(executeButtonClassName)}
        >
          {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {executeLabel}
        </Button>
        {clearFormReplacement != null ? (
          clearFormReplacement
        ) : (
          <Button type="button" variant="outline" onClick={onClearForm}>
            Limpiar
          </Button>
        )}
        {showApiPath ? (
          <code className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">{path}</code>
        ) : null}
      </div>
      {!disponible && showApiPath ? (
        <p className="text-xs font-medium text-amber-600">
          Visible solo como referencia. Este flujo se habilita cuando el JWT corresponda al scope `{actorLabel}`.
        </p>
      ) : null}
      {resultSlot}
    </div>
  );
}
