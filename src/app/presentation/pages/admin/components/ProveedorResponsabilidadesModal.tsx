import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import inventarioService, { type InventarioProveedor } from '@/app/services/inventarioService';
import reglasContablesService, { type CatalogoCodigo } from '@/app/services/reglasContablesService';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const DOMINIO_RESPONSABILIDADES = 'DIAN_RESPONSABILIDADES';
const RESPONSABILIDADES_OFICIALES = ['O-13', 'O-15', 'O-23', 'O-47', 'R-99-PN'] as const;
const RESPONSABILIDAD_COMODIN = 'R-99-PN';
const NOMBRE_POR_CODIGO: Record<string, string> = {
  'O-13': 'Gran contribuyente',
  'O-15': 'Autorretenedor',
  'O-23': 'Agente de retención IVA',
  'O-47': 'Régimen simple de tributación',
  'R-99-PN': 'No responsable',
};
const AYUDA_POR_CODIGO: Record<string, string> = {
  'O-13': 'Seleccione si el proveedor figura como gran contribuyente.',
  'O-15': 'Seleccione si el proveedor tiene calidad de autorretenedor.',
  'O-23': 'Seleccione si el proveedor es agente de retención del IVA.',
  'O-47': 'Seleccione si el proveedor pertenece al Régimen Simple de Tributación.',
  'R-99-PN': 'Comodín para facturación electrónica cuando no aplica ninguna de las cuatro responsabilidades anteriores.',
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proveedor: InventarioProveedor | null;
};

const errMsg = (e: unknown, f: string) => (e instanceof Error ? e.message.replace(/^\[\d+\]\s*/, '') : f);

/**
 * Parametrización de responsabilidades fiscales DIAN (Lista 48 del RUT) por proveedor.
 * Opciones dinámicas desde el catálogo global `catalogosDian` (dominio DIAN_RESPONSABILIDADES);
 * la asignación se persiste en `responsabilidadesFiscalesProveedor`.
 */
export default function ProveedorResponsabilidadesModal({
  open,
  onOpenChange,
  proveedor,
}: Props): React.ReactElement {
  const [catalogo, setCatalogo] = useState<CatalogoCodigo[]>([]);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [confirmadoRut, setConfirmadoRut] = useState(false);

  const proveedorId = String(proveedor?._id || (proveedor as { iud?: string } | null)?.iud || '');

  const cargar = useCallback(async (): Promise<void> => {
    if (!proveedorId) return;
    setLoading(true);
    try {
      const [codigos, asignadas] = await Promise.all([
        reglasContablesService.listarCatalogoCodigos(DOMINIO_RESPONSABILIDADES),
        inventarioService.listarResponsabilidadesProveedor(proveedorId),
      ]);
      setCatalogo(codigos);
      setSeleccion(asignadas.map((a) => a.responsabilidadCodigo));
    } catch (e) {
      toast.error(errMsg(e, 'No se pudieron cargar las responsabilidades fiscales.'));
      setCatalogo([]);
      setSeleccion([]);
    } finally {
      setLoading(false);
    }
  }, [proveedorId]);

  useEffect(() => {
    if (!open || !proveedorId) return;
    setConfirmadoRut(false);
    void cargar();
  }, [cargar, open, proveedorId]);

  const catalogoOficial = useMemo(
    () => RESPONSABILIDADES_OFICIALES
      .map((codigo) => catalogo.find((item) => item.codigo.toUpperCase() === codigo))
      .filter((item): item is CatalogoCodigo => Boolean(item)),
    [catalogo]
  );

  const toggle = (codigo: string): void => {
    setSeleccion((prev) => {
      if (prev.includes(codigo)) return prev.filter((c) => c !== codigo);
      if (codigo === RESPONSABILIDAD_COMODIN) return [RESPONSABILIDAD_COMODIN];
      return [...prev.filter((c) => c !== RESPONSABILIDAD_COMODIN), codigo];
    });
  };

  const cargarCatalogoOficial = async (): Promise<void> => {
    try {
      setSeeding(true);
      const { msg } = await reglasContablesService.sembrarCatalogoCodigosOficiales();
      toast.success(msg || 'Catálogo oficial DIAN cargado.');
      await cargar();
    } catch (e) {
      toast.error(errMsg(e, 'No se pudo cargar el catálogo oficial DIAN.'));
    } finally {
      setSeeding(false);
    }
  };

  const guardar = async (): Promise<void> => {
    if (!proveedorId) return;
    if (!seleccion.length) {
      toast.warning('Selecciona una responsabilidad o R-99-PN cuando no aplique ninguna de las otras cuatro.');
      return;
    }
    if (!confirmadoRut) {
      toast.warning('Confirma que verificaste la selección con el RUT vigente del proveedor.');
      return;
    }
    try {
      setSaving(true);
      const { msg } = await inventarioService.guardarResponsabilidadesProveedor(proveedorId, seleccion);
      toast.success(msg || 'Responsabilidades fiscales actualizadas.');
      onOpenChange(false);
    } catch (e) {
      toast.error(errMsg(e, 'No se pudieron guardar las responsabilidades fiscales.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Responsabilidades fiscales DIAN
          </DialogTitle>
          <DialogDescription>
            {proveedor
              ? `${proveedor.nombre} · NIT ${proveedor.nit}. Selecciona los códigos que se informarán en los documentos electrónicos DIAN.`
              : 'Selecciona un proveedor.'}
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Catálogo técnico de facturación electrónica</AlertTitle>
          <AlertDescription>
            La DIAN admite estos cinco códigos. R-99-PN es excluyente y solo corresponde cuando
            no aplica O-13, O-15, O-23 u O-47. Esta selección no modifica el RUT del proveedor.
          </AlertDescription>
        </Alert>

        {loading ? (
          <p className="flex items-center py-4 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando responsabilidades...
          </p>
        ) : catalogoOficial.length === 0 ? (
          <div className="space-y-3 rounded-md border border-dashed p-4">
            <p className="text-sm text-muted-foreground">
              El catálogo técnico no está cargado. Puedes registrarlo de forma idempotente desde aquí.
            </p>
            <Button type="button" variant="outline" onClick={() => void cargarCatalogoOficial()} disabled={seeding}>
              {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Cargar catálogo oficial DIAN
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {catalogoOficial.length < RESPONSABILIDADES_OFICIALES.length ? (
              <Alert variant="destructive">
                <AlertTitle>Catálogo oficial incompleto</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>Faltan uno o más códigos admitidos por la DIAN.</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => void cargarCatalogoOficial()} disabled={seeding}>
                    {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Completar catálogo oficial
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            {catalogoOficial.map((item) => (
              <div key={item.codigo} className="flex items-start gap-3 rounded-md border px-3 py-3">
                <Checkbox
                  id={`resp-${item.codigo}`}
                  checked={seleccion.includes(item.codigo)}
                  onCheckedChange={() => toggle(item.codigo)}
                  disabled={saving}
                  className="mt-0.5"
                />
                <Label htmlFor={`resp-${item.codigo}`} className="cursor-pointer space-y-1 font-normal">
                  <span className="block">
                    <span className="font-semibold">{item.codigo}</span> — {NOMBRE_POR_CODIGO[item.codigo] || item.nombre}
                  </span>
                  <span className="block text-xs leading-5 text-muted-foreground">
                    {AYUDA_POR_CODIGO[item.codigo] || item.descripcion}
                  </span>
                </Label>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              {seleccion.length} responsabilidad(es) seleccionada(s).
            </p>

            <label className="flex items-start gap-3 rounded-md bg-muted/40 p-3 text-sm">
              <Checkbox
                checked={confirmadoRut}
                onCheckedChange={(value) => setConfirmadoRut(value === true)}
                disabled={saving}
                className="mt-0.5"
              />
              <span>
                Confirmo que contrasté esta selección con el RUT vigente del proveedor y que los
                datos corresponden a la operación que se documentará.
              </span>
            </label>

            <a
              href="https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documentacion-tecnica/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
            >
              Consultar documentación técnica oficial DIAN
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void guardar()}
            disabled={
              saving
              || loading
              || !proveedorId
              || catalogoOficial.length !== RESPONSABILIDADES_OFICIALES.length
              || !confirmadoRut
            }
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar responsabilidades
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
