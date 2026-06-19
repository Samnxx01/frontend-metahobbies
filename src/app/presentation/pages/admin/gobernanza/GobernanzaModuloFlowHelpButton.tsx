import React from 'react';
import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { getGobernanzaModuloFlowMeta } from './gobernanzaModuloFlowMeta';
import { useGobernanzaFlowHelpExtra } from './gobernanzaFlowHelpContext';

export type GobernanzaModuloFlowHelpButtonProps = {
  endpointId: string;
};

export function GobernanzaModuloFlowHelpButton({
  endpointId,
}: GobernanzaModuloFlowHelpButtonProps): React.ReactElement {
  const meta = getGobernanzaModuloFlowMeta(endpointId);
  const helpExtra = useGobernanzaFlowHelpExtra(endpointId);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5">
          <CircleHelp className="h-4 w-4" />
          Ayuda
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[min(70vh,520px)] w-80 overflow-y-auto sm:w-96">
        <PopoverHeader>
          <PopoverTitle>{meta?.helpTitle ?? 'Ayuda de esta acción'}</PopoverTitle>
          <PopoverDescription asChild>
            <div className="space-y-2 pt-1 text-xs leading-relaxed text-muted-foreground">
              {(meta?.helpParagraphs ?? ['Selecciona una acción del menú superior para ver su explicación.']).map(
                (p, i) => (
                  <p key={i}>{p}</p>
                )
              )}
              {meta?.tips?.length ? (
                <ul className="list-disc space-y-1 pl-4">
                  {meta.tips.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              ) : null}
              {helpExtra}
            </div>
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}

/** Alias histórico */
export const GobernanzaTenantFlowHelpButton = GobernanzaModuloFlowHelpButton;
