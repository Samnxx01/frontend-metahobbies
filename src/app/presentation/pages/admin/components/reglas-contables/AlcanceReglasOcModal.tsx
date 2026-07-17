import { useCallback, useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'react-toastify';

import inventarioService from '@/app/services/inventarioService';
import reglasContablesService, { type AmbitoReglaContable, type CatalogoCodigo } from '@/app/services/reglasContablesService';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { reglasContablesUi } from './reglasContablesUi';

type AlcanceReglasOcModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (ambitos: string[]) => void;
};

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : fallback;

export default function AlcanceReglasOcModal({
  open,
  onOpenChange,
  onSaved,
}: AlcanceReglasOcModalProps): React.ReactElement {
  const [catalogo, setCatalogo] = useState<AmbitoReglaContable[]>([]);
  const [tributos, setTributos] = useState<CatalogoCodigo[]>([]);
  const [codigoDianImpuesto, setCodigoDianImpuesto] = useState('01');
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [recepcionAutomatica, setRecepcionAutomatica] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const [config, ambitos, catalogoTributos] = await Promise.all([
        inventarioService.obtenerConfig(),
        reglasContablesService.listarAmbitosActivos(),
        reglasContablesService.listarCatalogoCodigos('DIAN_TRIBUTOS'),
      ]);
      setRecepcionAutomatica(config?.compras?.recepcionAutomatica === true);
      setSeleccionados(
        Array.isArray(config?.compras?.ambitosReglaImpuesto)
          ? config.compras.ambitosReglaImpuesto
          : []
      );
      setCatalogo(ambitos);
      setTributos(catalogoTributos.filter(
        (item) => String(item?.metadata?.lista || '') === '5'
          && item?.metadata?.chargeIndicator !== false
      ));
      setCodigoDianImpuesto(String(config?.compras?.codigoDianImpuesto || '01'));
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo cargar el alcance de órdenes de compra.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void cargar();
  }, [cargar, open]);

  const guardar = async (): Promise<void> => {
    try {
      setSaving(true);
      await inventarioService.actualizarConfigCompras({
        recepcionAutomatica,
        ambitosReglaImpuesto: seleccionados,
        codigoDianImpuesto,
      });
      toast.success(
        seleccionados.length
          ? 'Alcance de reglas para órdenes de compra actualizado.'
          : 'Alcance dinámico habilitado: se mostrarán todas las reglas.'
      );
      onSaved(seleccionados);
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo guardar el alcance de órdenes de compra.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={reglasContablesUi.dialogContentSm}>
        <DialogHeader>
          <DialogTitle>Alcance de reglas para órdenes de compra</DialogTitle>
          <DialogDescription className={reglasContablesUi.description}>
            Selecciona los ámbitos cuyas reglas deben aparecer y aplicarse en las órdenes de compra.
            Sin selección, el alcance es dinámico y considera todas las reglas.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando ámbitos...
          </div>
        ) : (
          <div className="grid max-h-72 gap-3 overflow-auto py-1">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tributo que calcula la orden</label>
              <Select value={codigoDianImpuesto} onValueChange={setCodigoDianImpuesto} disabled={saving}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tributo DIAN" />
                </SelectTrigger>
                <SelectContent>
                  {tributos.map((tributo) => (
                    <SelectItem key={tributo.codigo} value={tributo.codigo}>
                      {tributo.codigo} · {tributo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                La regla aplicable debe heredar este código desde su tipo contable.
              </p>
            </div>
            {catalogo.map((ambito) => {
              const codigo = String(ambito.codigo || '').trim().toUpperCase();
              return (
                <label key={codigo} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                  <Checkbox
                    checked={seleccionados.includes(codigo)}
                    disabled={saving}
                    onCheckedChange={(checked) => {
                      setSeleccionados((prev) => checked === true
                        ? [...new Set([...prev, codigo])]
                        : prev.filter((item) => item !== codigo));
                    }}
                  />
                  <span>
                    <span className="font-medium">{ambito.nombre}</span>
                    <span className="ml-2 text-muted-foreground">({codigo})</span>
                  </span>
                </label>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" className={reglasContablesUi.btnPrimary} onClick={() => void guardar()} disabled={loading || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar alcance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
