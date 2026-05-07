import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export type DocumentoSoporteTipoConfig = {
  id: string;
  codigo: string; // ej. RECEPCION_OC
  prefijo: string; // ej. REC
  padding: number; // ej. 6
  siguiente: number; // ej. 123
  activo: boolean;
};

const STORAGE_KEY = 'mabs.inventario.documentoSoporteTipos.v1';

const newId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const defaultDocumentoSoporteTipos = (): DocumentoSoporteTipoConfig[] => [
  {
    id: newId(),
    codigo: 'RECEPCION_OC',
    prefijo: 'REC',
    padding: 6,
    siguiente: 1,
    activo: true,
  },
];

export const loadDocumentoSoporteTipos = (): DocumentoSoporteTipoConfig[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultDocumentoSoporteTipos();
    const parsed = JSON.parse(raw) as DocumentoSoporteTipoConfig[];
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultDocumentoSoporteTipos();
    return parsed.map((r) => ({
      id: String((r as any).id || newId()),
      codigo: String((r as any).codigo || '').trim() || 'RECEPCION_OC',
      prefijo: String((r as any).prefijo || '').trim() || 'REC',
      padding: Number((r as any).padding ?? 6) || 6,
      siguiente: Math.max(1, Number((r as any).siguiente ?? 1) || 1),
      activo: (r as any).activo !== false,
    }));
  } catch {
    return defaultDocumentoSoporteTipos();
  }
};

export const saveDocumentoSoporteTipos = (rows: DocumentoSoporteTipoConfig[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
};

export const formatDocNumero = (cfg: Pick<DocumentoSoporteTipoConfig, 'prefijo' | 'padding'>, n: number): string => {
  const pref = String(cfg.prefijo || '').trim();
  const pad = Math.max(1, Math.min(12, Number(cfg.padding) || 6));
  const num = Math.max(0, Number(n) || 0);
  return `${pref}-${String(num).padStart(pad, '0')}`;
};

export const nextDocNumero = (codigo: string): { numero: string; tipo: DocumentoSoporteTipoConfig | null } => {
  const all = loadDocumentoSoporteTipos();
  const tipo = all.find((t) => t.codigo === codigo && t.activo) ?? all.find((t) => t.codigo === codigo) ?? null;
  if (!tipo) return { numero: '', tipo: null };
  return { numero: formatDocNumero(tipo, tipo.siguiente), tipo };
};

export const consumeDocNumero = (codigo: string): { numero: string } => {
  const all = loadDocumentoSoporteTipos();
  const idx = all.findIndex((t) => t.codigo === codigo);
  if (idx < 0) return { numero: '' };
  const tipo = all[idx];
  const numero = formatDocNumero(tipo, tipo.siguiente);
  all[idx] = { ...tipo, siguiente: Math.max(1, Number(tipo.siguiente || 1)) + 1 };
  saveDocumentoSoporteTipos(all);
  return { numero };
};

type Draft = Omit<DocumentoSoporteTipoConfig, 'id'> & { id?: string };

const blankDraft = (): Draft => ({
  codigo: '',
  prefijo: '',
  padding: 6,
  siguiente: 1,
  activo: true,
});

export type InventarioDocumentoSoporteConfigModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (tipos: DocumentoSoporteTipoConfig[]) => void;
};

export default function InventarioDocumentoSoporteConfigModal({
  open,
  onOpenChange,
  onSaved,
}: InventarioDocumentoSoporteConfigModalProps): React.ReactElement {
  const [rows, setRows] = useState<DocumentoSoporteTipoConfig[]>([]);
  const [draft, setDraft] = useState<Draft>(blankDraft());

  useEffect(() => {
    if (!open) return;
    setRows(loadDocumentoSoporteTipos());
    setDraft(blankDraft());
  }, [open]);

  const activeCount = useMemo(() => rows.filter((r) => r.activo).length, [rows]);

  const addOrUpdate = (): void => {
    const codigo = draft.codigo.trim().toUpperCase();
    const prefijo = draft.prefijo.trim().toUpperCase();
    const padding = Math.max(2, Math.min(12, Number(draft.padding) || 6));
    const siguiente = Math.max(1, Number(draft.siguiente) || 1);
    if (!codigo) {
      toast.error('El código del tipo es obligatorio.');
      return;
    }
    if (!prefijo) {
      toast.error('El prefijo es obligatorio.');
      return;
    }
    const nextRow: DocumentoSoporteTipoConfig = {
      id: draft.id || newId(),
      codigo,
      prefijo,
      padding,
      siguiente,
      activo: draft.activo !== false,
    };
    setRows((prev) => {
      const exists = prev.some((r) => r.id === nextRow.id || r.codigo === nextRow.codigo);
      const merged = exists
        ? prev.map((r) => (r.id === nextRow.id || r.codigo === nextRow.codigo ? { ...r, ...nextRow, id: r.id } : r))
        : [...prev, nextRow];
      return merged.sort((a, b) => a.codigo.localeCompare(b.codigo));
    });
    setDraft(blankDraft());
  };

  const remove = (id: string): void => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (draft.id === id) setDraft(blankDraft());
  };

  const toggleActive = (id: string): void => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, activo: !r.activo } : r)));
  };

  const save = (): void => {
    if (rows.length === 0) {
      toast.error('Debes tener al menos un tipo.');
      return;
    }
    if (rows.every((r) => !r.activo)) {
      toast.error('Debe existir al menos un tipo activo.');
      return;
    }
    saveDocumentoSoporteTipos(rows);
    onSaved?.(rows);
    toast.success('Tipos de documento soporte guardados.');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(980px,calc(100vw-2rem))] max-w-none border-border bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>Parametrización documento soporte</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Define el tipo (código), prefijo y secuencia por documento. Activos: {activeCount}/{rows.length || 0}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
            <div className="space-y-2">
              <Label>Código *</Label>
              <Input
                value={draft.codigo}
                onChange={(e) => setDraft((p) => ({ ...p, codigo: e.target.value }))}
                placeholder="RECEPCION_OC"
                className="border-input bg-background"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Prefijo *</Label>
                <Input
                  value={draft.prefijo}
                  onChange={(e) => setDraft((p) => ({ ...p, prefijo: e.target.value }))}
                  placeholder="REC"
                  className="border-input bg-background"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label>Padding</Label>
                <Input
                  type="number"
                  min="2"
                  max="12"
                  value={String(draft.padding ?? 6)}
                  onChange={(e) => setDraft((p) => ({ ...p, padding: Number(e.target.value) }))}
                  className="border-input bg-background"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Siguiente #</Label>
                <Input
                  type="number"
                  min="1"
                  value={String(draft.siguiente ?? 1)}
                  onChange={(e) => setDraft((p) => ({ ...p, siguiente: Number(e.target.value) }))}
                  className="border-input bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>Activo</Label>
                <Button
                  type="button"
                  variant={draft.activo ? 'secondary' : 'outline'}
                  className="w-full justify-center"
                  onClick={() => setDraft((p) => ({ ...p, activo: !p.activo }))}
                >
                  {draft.activo ? 'Activo' : 'Inactivo'}
                </Button>
              </div>
            </div>
            <Button type="button" onClick={addOrUpdate}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar / actualizar
            </Button>
          </div>

          <div className="space-y-2">
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Prefijo</TableHead>
                    <TableHead className="text-right">Siguiente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[120px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                      <TableCell className="font-mono text-xs">{r.prefijo}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatDocNumero(r, r.siguiente)}</TableCell>
                      <TableCell className="text-sm text-foreground">{r.activo ? 'Activo' : 'Inactivo'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDraft({ ...r });
                            }}
                            title="Editar"
                          >
                            Editar
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => toggleActive(r.id)} title="Activar/Inactivar">
                            {r.activo ? 'Inactivar' : 'Activar'}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => remove(r.id)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                        No hay tipos configurados.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              El consecutivo se guarda localmente en este navegador (localStorage). Si necesitas consecutivo global multiusuario, se debe mover al backend.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={save}>
            <Save className="mr-2 h-4 w-4" />
            Guardar parametrización
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

