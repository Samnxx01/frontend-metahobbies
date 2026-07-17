import { useEffect, useState } from 'react';
import { DownloadCloud, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import reglasContablesService, { type CatalogoCodigo } from '@/app/services/reglasContablesService';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { reglasContablesUi } from './reglasContablesUi';

const DOMINIO_TRIBUTOS = 'DIAN_TRIBUTOS';
const DOMINIO_LISTAS = 'DIAN_LISTAS';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Draft = {
  codigo: string;
  nombre: string;
  descripcion: string;
  lista: string;
  chargeIndicator: boolean;
};

const draftInicial: Draft = { codigo: '', nombre: '', descripcion: '', lista: '', chargeIndicator: true };

const errMsg = (e: unknown, f: string) => (e instanceof Error ? e.message.replace(/^\[\d+\]\s*/, '') : f);

/**
 * Administración del catálogo de códigos DIAN (dominio DIAN_TRIBUTOS, scope global).
 * La lista DIAN del formulario se alimenta del dominio DIAN_LISTAS del mismo catálogo;
 * si ese dominio aún no está parametrizado, se captura como texto libre.
 */
export default function CatalogoCodigosDianModal({ open, onOpenChange }: Props): React.ReactElement {
  const [items, setItems] = useState<CatalogoCodigo[]>([]);
  const [listas, setListas] = useState<CatalogoCodigo[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState<Draft>(draftInicial);

  const cargar = async (): Promise<void> => {
    setLoading(true);
    try {
      const [tributos, listasDian] = await Promise.all([
        reglasContablesService.listarCatalogoCodigosAdmin(DOMINIO_TRIBUTOS),
        reglasContablesService.listarCatalogoCodigos(DOMINIO_LISTAS).catch(() => [] as CatalogoCodigo[]),
      ]);
      setItems(tributos);
      setListas(listasDian);
    } catch (e) {
      toast.error(errMsg(e, 'No se pudo cargar el catálogo de códigos DIAN.'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setDraft(draftInicial);
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const crear = async (): Promise<void> => {
    if (!draft.codigo.trim() || !draft.nombre.trim()) {
      toast.error('Código y nombre son obligatorios.');
      return;
    }
    try {
      setSubmitting(true);
      const { msg } = await reglasContablesService.crearCatalogoCodigo({
        dominio: DOMINIO_TRIBUTOS,
        codigo: draft.codigo.trim(),
        nombre: draft.nombre.trim(),
        descripcion: draft.descripcion.trim(),
        metadata: {
          ...(draft.lista.trim() ? { lista: draft.lista.trim() } : {}),
          chargeIndicator: draft.chargeIndicator,
        },
      });
      toast.success(msg || 'Código registrado.');
      setDraft(draftInicial);
      await cargar();
    } catch (e) {
      toast.error(errMsg(e, 'No se pudo registrar el código.'));
    } finally {
      setSubmitting(false);
    }
  };

  const alternarEstado = async (item: CatalogoCodigo): Promise<void> => {
    try {
      await reglasContablesService.actualizarCatalogoCodigo(DOMINIO_TRIBUTOS, item.codigo, {
        estado: item.estado === false,
      });
      await cargar();
    } catch (e) {
      toast.error(errMsg(e, 'No se pudo cambiar el estado.'));
    }
  };

  const cargarOficiales = async (): Promise<void> => {
    try {
      setSubmitting(true);
      const { msg } = await reglasContablesService.sembrarCatalogoCodigosOficiales();
      toast.success(msg || 'Códigos oficiales DIAN cargados.');
      await cargar();
    } catch (e) {
      toast.error(errMsg(e, 'No se pudieron cargar los códigos oficiales.'));
    } finally {
      setSubmitting(false);
    }
  };

  const eliminar = async (item: CatalogoCodigo): Promise<void> => {
    if (!window.confirm(`¿Eliminar el código "${item.codigo}" del catálogo DIAN?`)) return;
    try {
      const { msg } = await reglasContablesService.eliminarCatalogoCodigo(DOMINIO_TRIBUTOS, item.codigo);
      toast.success(msg || 'Código eliminado.');
      await cargar();
    } catch (e) {
      toast.error(errMsg(e, 'No se pudo eliminar el código.'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={reglasContablesUi.dialogContent}>
        <DialogHeader>
          <DialogTitle>Códigos DIAN (tributos y retenciones)</DialogTitle>
          <DialogDescription className={reglasContablesUi.description}>
            Catálogo global del Anexo 20. Cada código define su lista DIAN y si suma (impuesto) o resta
            (retención) al total — las reglas contables lo heredan al seleccionarlo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void cargarOficiales()}
              disabled={submitting || loading}
            >
              <DownloadCloud className="mr-2 h-4 w-4" />
              Cargar códigos oficiales DIAN (Anexo 20)
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando catálogo...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay códigos registrados. Usa «Cargar códigos oficiales DIAN» para insertar los del Anexo 20,
              o registra manualmente los que necesites.
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Lista</TableHead>
                    <TableHead>Efecto</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.codigo}>
                      <TableCell className="font-medium">{item.codigo}</TableCell>
                      <TableCell>{item.nombre}</TableCell>
                      <TableCell>{String(item.metadata?.lista ?? '-')}</TableCell>
                      <TableCell>{item.metadata?.chargeIndicator === false ? 'Resta (retención)' : 'Suma (impuesto)'}</TableCell>
                      <TableCell>
                        <Switch
                          checked={item.estado !== false}
                          onCheckedChange={() => void alternarEstado(item)}
                          disabled={submitting}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => void eliminar(item)}
                          disabled={submitting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="space-y-3 rounded-md border p-4">
            <p className="text-sm font-semibold">Registrar código</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Código</Label>
                <Input
                  className={reglasContablesUi.input}
                  value={draft.codigo}
                  onChange={(e) => setDraft((p) => ({ ...p, codigo: e.target.value }))}
                  placeholder="Ej: 01"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  className={reglasContablesUi.input}
                  value={draft.nombre}
                  onChange={(e) => setDraft((p) => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej: IVA"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label>Lista DIAN</Label>
                {listas.length > 0 ? (
                  <Select
                    value={draft.lista || undefined}
                    onValueChange={(v) => setDraft((p) => ({ ...p, lista: v }))}
                  >
                    <SelectTrigger className={reglasContablesUi.input}>
                      <SelectValue placeholder="Selecciona la lista" />
                    </SelectTrigger>
                    <SelectContent>
                      {listas.map((l) => (
                        <SelectItem key={l.codigo} value={l.codigo}>
                          {l.codigo} — {l.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    className={reglasContablesUi.input}
                    value={draft.lista}
                    onChange={(e) => setDraft((p) => ({ ...p, lista: e.target.value }))}
                    placeholder="Ej: 5 (impuestos) o 9 (retenciones)"
                    disabled={submitting}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input
                  className={reglasContablesUi.input}
                  value={draft.descripcion}
                  onChange={(e) => setDraft((p) => ({ ...p, descripcion: e.target.value }))}
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="catalogo-dian-charge"
                checked={draft.chargeIndicator}
                onCheckedChange={(c) => setDraft((p) => ({ ...p, chargeIndicator: c === true }))}
                disabled={submitting}
              />
              <Label htmlFor="catalogo-dian-charge" className="cursor-pointer font-normal">
                Suma al total (impuesto) — desmárcalo para retenciones (restan)
              </Label>
            </div>
            <Button
              type="button"
              className={reglasContablesUi.btnPrimary}
              onClick={() => void crear()}
              disabled={submitting || loading}
            >
              <Plus className="mr-2 h-4 w-4" />
              Registrar código DIAN
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
