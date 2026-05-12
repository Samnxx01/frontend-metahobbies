import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { GobernanzaCardDesign } from '../gobernanzaCardDesignTypes';
import { DEFAULT_GOBERNANZA_CARD_DESIGN } from '../gobernanzaCardDesignTypes';

export type CardDesignControlsProps = {
  endpointId: string;
  value: GobernanzaCardDesign;
  onChange: (next: GobernanzaCardDesign) => void;
  readOnly?: boolean;
};

export function CardDesignControls({
  endpointId,
  value,
  onChange,
  readOnly = false,
}: CardDesignControlsProps): React.ReactElement {
  const v = { ...DEFAULT_GOBERNANZA_CARD_DESIGN, ...value };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`gd-surface-${endpointId}`}>Superficie de la tarjeta</Label>
          <Select
            value={v.surface}
            disabled={readOnly}
            onValueChange={(surface) =>
              onChange({ ...v, surface: surface as GobernanzaCardDesign['surface'] })
            }
          >
            <SelectTrigger id={`gd-surface-${endpointId}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Estándar</SelectItem>
              <SelectItem value="elevated">Elevada (sombra)</SelectItem>
              <SelectItem value="soft">Suave (degradado)</SelectItem>
              <SelectItem value="minimal">Mínima (punteada)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`gd-accent-${endpointId}`}>Acento (borde izquierdo)</Label>
          <Select
            value={v.accent}
            disabled={readOnly}
            onValueChange={(accent) =>
              onChange({ ...v, accent: accent as GobernanzaCardDesign['accent'] })
            }
          >
            <SelectTrigger id={`gd-accent-${endpointId}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">Primario</SelectItem>
              <SelectItem value="sky">Cielo</SelectItem>
              <SelectItem value="violet">Violeta</SelectItem>
              <SelectItem value="emerald">Esmeralda</SelectItem>
              <SelectItem value="rose">Rosa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
        <div className="space-y-0.5">
          <Label htmlFor={`gd-path-${endpointId}`}>Resaltar bloque de ruta</Label>
          <p className="text-xs text-muted-foreground">Anillo suave y fondo para la ruta API</p>
        </div>
        <Switch
          id={`gd-path-${endpointId}`}
          checked={v.pathEmphasis}
          disabled={readOnly}
          onCheckedChange={(pathEmphasis) => onChange({ ...v, pathEmphasis })}
        />
      </div>
    </>
  );
}
