import React, { useEffect, useMemo, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ActionId, UiActionDef } from '@/app/presentation/actions';

export type GestionRutasToolbarMode = 'all' | 'consulta' | 'parametrizacion' | 'crear' | 'personalizado';

export type GestionRutasToolbarDraft = {
  mode: GestionRutasToolbarMode;
  actionIds: ActionId[] | undefined;
};

type PresetOption = {
  mode: GestionRutasToolbarMode;
  label: string;
  ids: ActionId[] | undefined;
};

type GestionRutasToolbarParametrizacionProps<TContext> = {
  catalog: readonly UiActionDef<TContext>[];
  value?: GestionRutasToolbarDraft | null;
  tenantValue?: GestionRutasToolbarDraft | null;
  presets: PresetOption[];
  onChange: (draft: GestionRutasToolbarDraft) => void;
};

const normalizeIds = (ids: readonly ActionId[] | undefined): ActionId[] | undefined => {
  if (!Array.isArray(ids)) return undefined;
  return ids.map((id) => String(id || '').trim()).filter(Boolean);
};

const sameIds = (a: readonly ActionId[] | undefined, b: readonly ActionId[] | undefined): boolean => {
  const aa = normalizeIds(a) ?? [];
  const bb = normalizeIds(b) ?? [];
  if (aa.length !== bb.length) return false;
  return aa.every((id, index) => id === bb[index]);
};

export function GestionRutasToolbarParametrizacion<TContext>({
  catalog = [],
  value,
  tenantValue,
  presets = [],
  onChange,
}: GestionRutasToolbarParametrizacionProps<TContext>): React.ReactElement {
  const fallbackDraft = useMemo<GestionRutasToolbarDraft>(
    () => ({
      mode: 'all',
      actionIds: undefined,
    }),
    [],
  );
  const safeValue = value ?? fallbackDraft;
  const safeTenantValue = tenantValue ?? safeValue;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<GestionRutasToolbarDraft>(safeValue);

  useEffect(() => {
    if (!open) setDraft(safeValue);
  }, [open, safeValue]);

  const normalizedDraftIds = useMemo(
    () => normalizeIds(draft?.actionIds) ?? catalog.map((action) => action.id),
    [catalog, draft?.actionIds],
  );
  const selectedIds = useMemo(() => new Set(normalizedDraftIds), [normalizedDraftIds]);
  const currentLabel = presets.find((preset) => preset.mode === safeValue.mode)?.label ?? 'Personalizado';

  const openModal = (): void => {
    setDraft(safeValue);
    setOpen(true);
  };

  const setPreset = (mode: GestionRutasToolbarMode): void => {
    const preset = presets.find((item) => item.mode === mode);
    if (!preset) return;
    setDraft({ mode: preset.mode, actionIds: normalizeIds(preset.ids) });
  };

  const toggleAction = (id: ActionId, checked: boolean): void => {
    const current = normalizeIds(draft.actionIds) ?? catalog.map((action) => action.id);
    const next = checked
      ? Array.from(new Set([...current, id]))
      : current.filter((item) => item !== id);
    setDraft({ mode: 'personalizado', actionIds: next });
  };

  const restoreTenant = (): void => {
    setDraft(safeTenantValue);
  };

  const applyDraft = (): void => {
    const presetMatch = presets.find((preset) => sameIds(preset.ids, draft.actionIds));
    onChange({
      mode: presetMatch?.mode ?? draft.mode,
      actionIds: normalizeIds(draft.actionIds),
    });
    setOpen(false);
  };

  return (
    <>
      <Button type="button" variant="outline" className="gap-2" onClick={openModal}>
        <Settings2 className="h-4 w-4" />
        {currentLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Parametrizar toolbar</DialogTitle>
            <DialogDescription>
              Define los botones visibles para este contexto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Preset</Label>
              <Select value={draft.mode} onValueChange={(mode) => setPreset(mode as GestionRutasToolbarMode)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona preset" />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((preset) => (
                    <SelectItem key={preset.mode} value={preset.mode}>
                      {preset.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {catalog.map((action) => (
                <label
                  key={action.id}
                  className="flex min-h-11 items-center gap-3 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <Checkbox
                    checked={selectedIds.has(action.id)}
                    onCheckedChange={(checked) => toggleAction(action.id, checked === true)}
                  />
                  <span>{action.label}</span>
                </label>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={restoreTenant}>
              Restaurar tenant
            </Button>
            <Button type="button" onClick={applyDraft}>
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
