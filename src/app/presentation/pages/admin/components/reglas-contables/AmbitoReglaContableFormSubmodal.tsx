import { useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import reglasContablesService, { type AmbitoReglaContable } from '@/app/services/reglasContablesService';
import { useTiposReglaContable } from '@/app/hooks/useTiposReglaContable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { reglasContablesUi } from './reglasContablesUi';

type TenantOption = { value: string; label: string };

type AmbitoReglaContableFormSubmodalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  registro?: AmbitoReglaContable | null;
  onGuardada?: () => void;
};

type DraftAmbito = {
  codigo: string;
  nombre: string;
  descripcion: string;
  tipoReglaCodigo: string;
  estado: boolean;
};

const draftInicial: DraftAmbito = {
  codigo: '',
  nombre: '',
  descripcion: '',
  tipoReglaCodigo: '',
  estado: true,
};

const SIN_TIPO = '__SIN_TIPO__';

const draftDesdeRegistro = (registro: AmbitoReglaContable): DraftAmbito => ({
  codigo: registro.codigo,
  nombre: registro.nombre,
  descripcion: registro.descripcion ?? '',
  tipoReglaCodigo: registro.tipoReglaCodigo ?? '',
  estado: registro.estado !== false,
});

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : fallback;

export default function AmbitoReglaContableFormSubmodal({
  open,
  onOpenChange,
  saving = false,
  registro = null,
  onGuardada,
}: AmbitoReglaContableFormSubmodalProps): React.ReactElement {
  const esEdicion = Boolean(registro?.codigo);
  const [draft, setDraft] = useState<DraftAmbito>(draftInicial);
  const [submitting, setSubmitting] = useState(false);
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);
  const [tenantsSel, setTenantsSel] = useState<string[]>([]);
  const { tipos } = useTiposReglaContable({ enabled: open });

  useEffect(() => {
    if (!open) return;
    setDraft(registro ? draftDesdeRegistro(registro) : draftInicial);
    setTenantsSel([]);
    if (!registro) {
      // Tenants de la rama del JWT (tenantjerarquiacounters). Sin selección aplica al tenant actual.
      reglasContablesService.listarTenantsAutorizables()
        .then((data) => setTenantOptions(data.map((t) => ({ value: t.tenantId, label: t.label }))))
        .catch(() => setTenantOptions([]));
    }
  }, [open, registro]);

  const toggleTenant = (id: string): void => {
    setTenantsSel((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const guardar = async (): Promise<void> => {
    if (!draft.codigo.trim() || !draft.nombre.trim()) {
      toast.error('Código y nombre son obligatorios.');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        nombre: draft.nombre.trim(),
        descripcion: draft.descripcion.trim(),
        tipoReglaCodigo: draft.tipoReglaCodigo,
        estado: draft.estado,
      };
      if (esEdicion && registro) {
        const { msg } = await reglasContablesService.actualizarAmbito(registro.codigo, payload);
        toast.success(msg || `Ámbito "${registro.codigo}" actualizado.`);
      } else {
        const { msg } = await reglasContablesService.crearAmbito({
          codigo: draft.codigo.trim(),
          ...payload,
          ...(tenantsSel.length > 0 ? { tenantIds: tenantsSel } : {}),
        });
        toast.success(msg || `Ámbito "${draft.codigo}" registrado.`);
      }
      setDraft(draftInicial);
      onGuardada?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        errorMessage(error, esEdicion ? 'No se pudo actualizar el ámbito.' : 'No se pudo registrar el ámbito.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setDraft(draftInicial);
        onOpenChange(next);
      }}
    >
      <DialogContent className={reglasContablesUi.dialogContentSm}>
        <DialogHeader>
          <DialogTitle>{esEdicion ? 'Editar tipo de ámbito' : 'Nuevo tipo de ámbito'}</DialogTitle>
          <DialogDescription className={reglasContablesUi.description}>
            Los ámbitos clasifican si una regla aplica en compra, venta o en ambos flujos.
          </DialogDescription>
        </DialogHeader>

        <div className={reglasContablesUi.section}>
          <div className="space-y-2">
            <Label>Código del ámbito</Label>
            <Input
              className={reglasContablesUi.input}
              value={draft.codigo}
              onChange={(e) => setDraft((prev) => ({ ...prev, codigo: e.target.value }))}
              placeholder="Ej: EXPORTACION"
              disabled={esEdicion || submitting || saving}
            />
          </div>
          <div className="space-y-2">
            <Label>Nombre visible</Label>
            <Input
              className={reglasContablesUi.input}
              value={draft.nombre}
              onChange={(e) => setDraft((prev) => ({ ...prev, nombre: e.target.value }))}
              placeholder="Exportación"
            />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input
              className={reglasContablesUi.input}
              value={draft.descripcion}
              onChange={(e) => setDraft((prev) => ({ ...prev, descripcion: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo de regla (catálogo)</Label>
            <Select
              value={draft.tipoReglaCodigo || SIN_TIPO}
              onValueChange={(v) => setDraft((prev) => ({ ...prev, tipoReglaCodigo: v === SIN_TIPO ? '' : v }))}
            >
              <SelectTrigger className={reglasContablesUi.input}>
                <SelectValue placeholder="Selecciona un tipo del catálogo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_TIPO}>— Sin tipo asociado —</SelectItem>
                {tipos.map((t) => (
                  <SelectItem key={t.codigo} value={t.codigo}>
                    {t.codigo} — {t.nombre}
                  </SelectItem>
                ))}
                {draft.tipoReglaCodigo && !tipos.some((t) => t.codigo === draft.tipoReglaCodigo) && (
                  <SelectItem value={draft.tipoReglaCodigo}>{draft.tipoReglaCodigo} — (no está en el catálogo)</SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Relación dinámica con tiporeglacontablecatalogos. Al autorizar varios tenants, el tipo debe existir activo en el catálogo de cada uno.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="ambito-regla-activo"
              checked={draft.estado}
              onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, estado: checked === true }))}
              disabled={submitting || saving}
            />
            <Label htmlFor="ambito-regla-activo" className="cursor-pointer font-normal">
              Activo en catálogo
            </Label>
          </div>

          {!esEdicion && tenantOptions.length > 0 && (
            <div className="space-y-2">
              <Label>Tenants autorizados</Label>
              <p className="text-xs text-muted-foreground">
                Selecciona a quién se le autoriza este ámbito. Sin selección, aplica solo a tu tenant actual.
              </p>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                {tenantOptions.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`ambito-tenant-${option.value}`}
                      checked={tenantsSel.includes(option.value)}
                      onCheckedChange={() => toggleTenant(option.value)}
                      disabled={submitting || saving}
                    />
                    <Label htmlFor={`ambito-tenant-${option.value}`} className="cursor-pointer font-normal">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
              {tenantsSel.length > 0 && (
                <p className="text-xs text-muted-foreground">{tenantsSel.length} tenant(s) seleccionado(s).</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            className={reglasContablesUi.btnPrimary}
            onClick={() => void guardar()}
            disabled={saving || submitting}
          >
            {esEdicion ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {esEdicion ? 'Guardar cambios' : 'Guardar ámbito'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
