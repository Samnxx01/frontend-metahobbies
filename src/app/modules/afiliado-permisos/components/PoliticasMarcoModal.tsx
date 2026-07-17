import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Loader2, Save, ShieldCheck, Search, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  type PoliticaRuntime,
  getPoliticasCatalogo,
  guardarPoliticasMarco,
} from '../api/marco.api';
import { normalizePublicIdForApi } from '@/app/utils/entityPublicId';

interface PoliticasMarcoModalProps {
  open: boolean;
  onClose: () => void;
  rolCorporativoId: string | null;
  /** IDs de políticas ya vinculadas en herenciaCliente (pre-selección) */
  politicasRuntimeIds?: string[];
  onGuardado?: (ids: string[]) => void;
}

const EFECTO_COLORS: Record<string, string> = {
  ALLOW: 'bg-success/10 text-success',
  DENY: 'bg-destructive/10 text-destructive',
  BYPASS_RUNTIME: 'bg-info/10 text-info',
  REQUIRE_TECHO: 'bg-warning/10 text-warning',
};

export const PoliticasMarcoModal = ({
  open,
  onClose,
  rolCorporativoId,
  politicasRuntimeIds = [],
  onGuardado,
}: PoliticasMarcoModalProps): React.ReactElement => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [politicas, setPoliticas] = useState<PoliticaRuntime[]>([]);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [filtro, setFiltro] = useState('');

  const cargarCatalogo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPoliticasCatalogo();
      const lista = (res?.politicas ?? []).filter((p) => p.activo !== false);
      setPoliticas(lista);
      const preIds = new Set(
        politicasRuntimeIds
          .map((id) => normalizePublicIdForApi(id))
          .filter(Boolean),
      );
      setSeleccionados(preIds);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar catálogo de políticas');
    } finally {
      setLoading(false);
    }
  }, [politicasRuntimeIds]);

  useEffect(() => {
    if (open) {
      void cargarCatalogo();
      setFiltro('');
    }
  }, [open, cargarCatalogo]);

  const filtroNorm = filtro.trim().toLowerCase();
  const politicasFiltradas = useMemo(
    () =>
      politicas.filter((p) => {
        if (!filtroNorm) return true;
        return (
          `${p.codigo} ${p.dominio} ${p.tipo} ${p.efecto} ${p.scope?.tipo ?? ''}`
            .toLowerCase()
            .includes(filtroNorm)
        );
      }),
    [politicas, filtroNorm],
  );

  const togglePolitica = (id: string, checked: boolean) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleGuardar = async () => {
    if (!rolCorporativoId) {
      toast.warn('No hay rol corporativo seleccionado.');
      return;
    }
    setSaving(true);
    try {
      const politicaIds = [...seleccionados];
      const res = await guardarPoliticasMarco({
        rolCorporativoId: normalizePublicIdForApi(rolCorporativoId),
        politicaIds: politicaIds.map((id) => normalizePublicIdForApi(id)),
      });
      toast.success(res?.msg || `${politicaIds.length} política(s) guardadas en herenciaCliente.`);
      onGuardado?.(politicaIds);
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar políticas');
    } finally {
      setSaving(false);
    }
  };

  const idDe = (p: PoliticaRuntime) => normalizePublicIdForApi(p.iud ?? p._id);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[88vh] w-[min(96vw,52rem)] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Políticas de usuarios — herenciaCliente
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Seleccione las políticasRuntime que se vincularán a la herenciaCliente del rol corporativo.
            Los roles corporativos no usan reglas: si no hay política parametrizada, el sistema
            continúa validando por herenciaCliente + rolCorporativo.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 px-6 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 pr-9 text-sm"
              placeholder="Filtrar por código, dominio, tipo, efecto…"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
            {filtro && (
              <button
                type="button"
                onClick={() => setFiltro('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {seleccionados.size} seleccionadas · {politicasFiltradas.length} de {politicas.length} mostradas
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden px-6 pb-2">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando políticas…
            </div>
          ) : politicasFiltradas.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {filtro ? 'Sin resultados para el filtro aplicado.' : 'No hay políticas activas en el catálogo.'}
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-1 pr-2">
                {politicasFiltradas.map((p) => {
                  const id = idDe(p);
                  const checked = seleccionados.has(id);
                  return (
                    <label
                      key={id}
                      htmlFor={`pol-${id}`}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                        checked
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-transparent hover:border-border hover:bg-muted/40'
                      }`}
                    >
                      <Checkbox
                        id={`pol-${id}`}
                        checked={checked}
                        onCheckedChange={(v) => togglePolitica(id, Boolean(v))}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.codigo}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.dominio} · {p.tipo}
                          {p.scope?.tipo ? ` · scope: ${p.scope.tipo}` : ''}
                        </p>
                      </div>
                      <Badge
                        className={`shrink-0 text-[10px] font-semibold ${EFECTO_COLORS[p.efecto] ?? 'bg-muted text-muted-foreground'}`}
                        variant="outline"
                      >
                        {p.efecto}
                      </Badge>
                    </label>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="shrink-0 border-t border-border px-6 py-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={() => void handleGuardar()}
            disabled={saving || loading || !rolCorporativoId}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar en herenciaCliente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
