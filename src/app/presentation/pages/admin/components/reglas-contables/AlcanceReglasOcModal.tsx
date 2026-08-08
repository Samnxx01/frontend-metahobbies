import { useCallback, useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'react-toastify';

import inventarioService from '@/app/services/inventarioService';
import reglasContablesService, {
  type AmbitoReglaContable,
  type CatalogoCodigo,
  type TenantAlcanceImpuesto,
} from '@/app/services/reglasContablesService';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  const [tenants, setTenants] = useState<TenantAlcanceImpuesto[]>([]);
  const [tenantsCompartidos, setTenantsCompartidos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const [config, ambitos, catalogoTributos, tenantsAlcance] = await Promise.all([
        inventarioService.obtenerConfig(),
        reglasContablesService.listarAmbitosActivos(),
        reglasContablesService.listarCatalogoCodigos('DIAN_TRIBUTOS'),
        reglasContablesService.listarTenantsAlcanceImpuesto(),
      ]);
      setRecepcionAutomatica(config?.compras?.recepcionAutomatica === true);
      setSeleccionados(
        Array.isArray(config?.compras?.ambitosReglaImpuesto)
          ? config.compras.ambitosReglaImpuesto
          : []
      );
      setTenants(tenantsAlcance);
      setTenantsCompartidos(
        Array.isArray(config?.reglasContables?.tenantsCompartidos)
          ? config.reglasContables.tenantsCompartidos
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
        // Un solo tenant marcado equivale a no compartir; el backend lo guarda vacío.
        tenantsCompartidosReglas: tenantsCompartidos,
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
          <div className="grid gap-5 py-1">
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

            {/* Tabla 1 — qué tenants comparten las reglas (quién las usa). */}
            <section className="space-y-2">
              <h3 className="text-sm font-medium">Tenants que comparten estas reglas</h3>
              <p className="text-xs text-muted-foreground">
                Los usuarios de los tenants marcados ven y aplican el conjunto de reglas de todos ellos
                en <strong>órdenes de compra, carrito/POS, factura electrónica DIAN</strong> y la matriz
                de aplicación. Sin marcar (o con uno solo), cada tenant usa únicamente las suyas.
                No cambia quién puede editarlas: eso sigue siendo del tenant dueño.
              </p>
              <div className={reglasContablesUi.tableWrap}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={`${reglasContablesUi.tableHead} w-12`}>Usa</TableHead>
                      <TableHead className={reglasContablesUi.tableHead}>Tenant</TableHead>
                      <TableHead className={`${reglasContablesUi.tableHead} text-right`}>Reglas propias</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                          No hay tenants disponibles.
                        </TableCell>
                      </TableRow>
                    ) : tenants.map((tenant) => (
                      <TableRow key={tenant.tenantId} className={reglasContablesUi.tableRowHover}>
                        <TableCell>
                          <Checkbox
                            checked={tenantsCompartidos.includes(tenant.tenantId)}
                            disabled={saving}
                            onCheckedChange={(checked) => {
                              setTenantsCompartidos((prev) => checked === true
                                ? [...new Set([...prev, tenant.tenantId])]
                                : prev.filter((item) => item !== tenant.tenantId));
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="font-medium">{tenant.label}</span>
                          {tenant.esActual ? (
                            <span className="ml-2 text-xs text-muted-foreground">(tu tenant)</span>
                          ) : null}
                          {tenant.activo ? null : (
                            <span className="ml-2 text-xs text-muted-foreground">(inactivo)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{tenant.totalReglas}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            {/* Tabla 2 — qué ámbitos entran en la OC (cuáles reglas se consideran). */}
            <section className="space-y-2">
              <h3 className="text-sm font-medium">Ámbitos que aplican a la orden de compra</h3>
              <p className="text-xs text-muted-foreground">
                Sin selección, el alcance es dinámico y considera todas las reglas del tributo.
              </p>
              <div className={reglasContablesUi.tableWrap}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={`${reglasContablesUi.tableHead} w-12`}>Aplica</TableHead>
                      <TableHead className={reglasContablesUi.tableHead}>Ámbito</TableHead>
                      <TableHead className={reglasContablesUi.tableHead}>Código</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {catalogo.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                          No hay ámbitos activos.
                        </TableCell>
                      </TableRow>
                    ) : catalogo.map((ambito) => {
                      const codigo = String(ambito.codigo || '').trim().toUpperCase();
                      return (
                        <TableRow key={codigo} className={reglasContablesUi.tableRowHover}>
                          <TableCell>
                            <Checkbox
                              checked={seleccionados.includes(codigo)}
                              disabled={saving}
                              onCheckedChange={(checked) => {
                                setSeleccionados((prev) => checked === true
                                  ? [...new Set([...prev, codigo])]
                                  : prev.filter((item) => item !== codigo));
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-sm font-medium">{ambito.nombre}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{codigo}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </section>
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
