import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export type ParametrosGobernanzaModalFormLayoutProps = {
  /** Metadatos mínimos para path + aviso de scope */
  path: string;
  actorLabel: string;
  running: boolean;
  disponible: boolean;
  /** Deshabilita solo el botón Ejecutar (p. ej. modo solo lectura por jerarquía corporativa). */
  executeDisabled?: boolean;
  executeDisabledReason?: string;
  /** Acciones extra sobre la barra de botones (p. ej. sincronizar regla DIOS). */
  extraToolbar?: React.ReactNode;
  onExecute: () => void;
  onClearForm: () => void;
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
  executeDisabled = false,
  executeDisabledReason,
  extraToolbar,
  onExecute,
  onClearForm,
  children,
  resultSlot,
}: ParametrosGobernanzaModalFormLayoutProps): React.ReactElement {
  const ejecutarBloqueado = !disponible || executeDisabled;
  return (
    <div className="space-y-3">
      {children}
      {extraToolbar ? <div className="flex flex-wrap items-center gap-2">{extraToolbar}</div> : null}
      {executeDisabledReason && disponible && executeDisabled ? (
        <p className="text-xs font-medium text-amber-700">{executeDisabledReason}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={onExecute} disabled={running || ejecutarBloqueado}>
          {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Ejecutar
        </Button>
        <Button type="button" variant="outline" onClick={onClearForm}>
          Limpiar formulario
        </Button>
        <code className="rounded bg-slate-100 px-2 py-1 text-xs">{path}</code>
      </div>
      {!disponible ? (
        <p className="mt-2 text-xs font-medium text-amber-600">
          Visible solo como referencia. Este flujo se habilita cuando el JWT corresponda al scope `{actorLabel}`.
        </p>
      ) : null}
      {resultSlot}
    </div>
  );
}
