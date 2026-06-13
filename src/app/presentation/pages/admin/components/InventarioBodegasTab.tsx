import React from 'react';
import { Pencil, Plus, Save, Trash2, Warehouse } from 'lucide-react';
import type { BodegaInventario } from '@/app/services/inventarioService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

type BodegaFormState = {
  nombre: string;
  descripcion: string;
  depId: string;
  ciudadId: string;
  municipiosExtra: string[];
  estado: boolean;
};

type GeoDepartamentoRow = {
  departamentoId: string;
  nombre_Departamento?: string;
  nombre_departamento?: string;
  nombre_Dapartamento?: string;
  ciudades?: Array<{ ciudadId: string; nombre_ciudad: string }>;
};

type CiudadRow = {
  ciudadId: string;
  nombre_ciudad: string;
};

type InventarioBodegasTabProps = {
  bodegaForm?: BodegaFormState;
  setBodegaForm: React.Dispatch<React.SetStateAction<BodegaFormState>>;
  editingBodegaId: string | null;
  saving: boolean;
  bodegas: BodegaInventario[];
  bodegaDepartamentos: GeoDepartamentoRow[];
  bodegaCiudades: CiudadRow[];
  departamentoNombres: Record<string, string>;
  bodegaDeleteTarget: BodegaInventario | null;
  bodegaDeleteBusy: boolean;
  setBodegaDeleteTarget: React.Dispatch<React.SetStateAction<BodegaInventario | null>>;
  cancelarEdicionBodega: () => void;
  guardarBodegaForm: () => Promise<void>;
  iniciarEdicionBodega: (doc: BodegaInventario) => void;
  confirmarEliminarBodega: () => Promise<void>;
};

const getDepartamentoNombre = (departamento: GeoDepartamentoRow, nombres: Record<string, string>): string =>
  nombres[String(departamento.departamentoId)] ??
  departamento.nombre_departamento ??
  departamento.nombre_Dapartamento ??
  departamento.nombre_Departamento ??
  String(departamento.departamentoId);

const EMPTY_BODEGA_FORM: BodegaFormState = {
  nombre: '',
  descripcion: '',
  depId: '',
  ciudadId: '',
  municipiosExtra: [],
  estado: true,
};

const normalizeBodegaForm = (form?: Partial<BodegaFormState> | null): BodegaFormState => ({
  ...EMPTY_BODEGA_FORM,
  ...(form ?? {}),
  municipiosExtra: Array.isArray(form?.municipiosExtra) ? form.municipiosExtra : [],
});

const bodegaId = (bodega: BodegaInventario): string =>
  String(bodega._id || bodega.iud || bodega.nombre || '').trim();

export default function InventarioBodegasTab({
  bodegaForm: rawBodegaForm,
  setBodegaForm,
  editingBodegaId,
  saving,
  bodegas = [],
  bodegaDepartamentos = [],
  bodegaCiudades = [],
  departamentoNombres = {},
  bodegaDeleteTarget,
  bodegaDeleteBusy,
  setBodegaDeleteTarget,
  cancelarEdicionBodega,
  guardarBodegaForm,
  iniciarEdicionBodega,
  confirmarEliminarBodega,
}: InventarioBodegasTabProps): React.ReactElement {
  const bodegaForm = normalizeBodegaForm(rawBodegaForm);
  const departamentoCabecera = bodegaDepartamentos.find((d) => String(d.departamentoId) === String(bodegaForm.depId));
  const ciudadCabecera = bodegaCiudades.find((c) => String(c.ciudadId) === String(bodegaForm.ciudadId));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5" />
            {editingBodegaId ? 'Editar bodega' : 'Crear bodega'}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Ubicacion por departamento y ciudad (Colombia). Puedes asociar varios municipios del mismo departamento como subnodos de cobertura.
            {editingBodegaId ? ' El codigo interno (nombre) no se puede cambiar si ya esta en uso en movimientos de inventario; desactiva la bodega si debe dejar de usarse.' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Nombre</Label>
              <Input
                value={bodegaForm.nombre}
                onChange={(event) => setBodegaForm((prev) => ({ ...normalizeBodegaForm(prev), nombre: event.target.value }))}
                placeholder="BODEGA-PRINCIPAL"
                className="border-input bg-background"
                disabled={!!editingBodegaId}
                title={editingBodegaId ? 'El nombre se mantiene para no romper referencias en inventario.' : undefined}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Descripcion</Label>
              <Input
                value={bodegaForm.descripcion}
                onChange={(event) => setBodegaForm((prev) => ({ ...normalizeBodegaForm(prev), descripcion: event.target.value }))}
                className="border-input bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select
                value={bodegaForm.depId || undefined}
                onValueChange={(val) => setBodegaForm((prev) => ({ ...normalizeBodegaForm(prev), depId: val, ciudadId: '', municipiosExtra: [] }))}
              >
                <SelectTrigger className="border-input bg-background">
                  <SelectValue placeholder="Selecciona departamento" />
                </SelectTrigger>
                <SelectContent className="max-h-72 border-border bg-popover text-popover-foreground">
                  {bodegaDepartamentos.map((d) => (
                    <SelectItem key={d.departamentoId} value={String(d.departamentoId)}>
                      {getDepartamentoNombre(d, departamentoNombres)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ciudad</Label>
              <Select
                value={bodegaForm.ciudadId || undefined}
                onValueChange={(val) => setBodegaForm((prev) => {
                  const normalized = normalizeBodegaForm(prev);
                  return {
                  ...normalized,
                  ciudadId: val,
                  municipiosExtra: normalized.municipiosExtra.filter((id) =>
                    bodegaCiudades.some((c) => String(c.ciudadId) === String(id))
                  ),
                };
                })}
                disabled={!bodegaForm.depId}
              >
                <SelectTrigger className="border-input bg-background">
                  <SelectValue placeholder={bodegaForm.depId ? 'Selecciona ciudad' : 'Primero el departamento'} />
                </SelectTrigger>
                <SelectContent className="max-h-72 border-border bg-popover text-popover-foreground">
                  {bodegaCiudades.map((c) => (
                    <SelectItem key={c.ciudadId} value={String(c.ciudadId)}>
                      {c.nombre_ciudad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {bodegaForm.depId && bodegaForm.ciudadId && bodegaCiudades.length > 0 ? (
            <div className="space-y-2 rounded-md border border-border bg-card p-3">
              <p className="text-sm font-medium text-foreground">Municipios de cobertura (subnodos)</p>
              <p className="text-xs text-muted-foreground">
                Los municipios listados son los del departamento seleccionado. La ciudad elegida arriba es la cabecera; marca los demas en los que tambien opera la bodega.
              </p>
              <div className="max-h-52 space-y-1 overflow-y-auto overscroll-contain pr-1">
                {bodegaCiudades.map((c) => {
                  const isPrincipal = String(c.ciudadId) === String(bodegaForm.ciudadId);
                  const checkedExtra = bodegaForm.municipiosExtra.some((id) => String(id) === String(c.ciudadId));
                  const checked = isPrincipal || checkedExtra;
                  return (
                    <label
                      key={String(c.ciudadId)}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 transition-colors hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={checked}
                        disabled={isPrincipal}
                        onCheckedChange={(v) => {
                          if (isPrincipal) return;
                          setBodegaForm((prev) => {
                            const normalized = normalizeBodegaForm(prev);
                            if (v === true) {
                              if (normalized.municipiosExtra.some((id) => String(id) === String(c.ciudadId))) return normalized;
                              return { ...normalized, municipiosExtra: [...normalized.municipiosExtra, String(c.ciudadId)] };
                            }
                            return {
                              ...normalized,
                              municipiosExtra: normalized.municipiosExtra.filter((id) => String(id) !== String(c.ciudadId)),
                            };
                          });
                        }}
                      />
                      <span className={`text-sm ${isPrincipal ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                        {c.nombre_ciudad}
                        {isPrincipal ? ' · cabecera' : ''}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          {bodegaForm.depId && bodegaForm.ciudadId ? (
            <p className="text-xs text-muted-foreground">
              Cabecera:{' '}
              <span className="font-medium text-foreground">
                {departamentoCabecera ? getDepartamentoNombre(departamentoCabecera, departamentoNombres) : bodegaForm.depId}
                {' · '}
                {ciudadCabecera?.nombre_ciudad}
              </span>
              {1 + bodegaForm.municipiosExtra.length > 1 ? (
                <span className="text-foreground"> - Cobertura: {1 + bodegaForm.municipiosExtra.length} municipios</span>
              ) : null}
            </p>
          ) : null}

          {editingBodegaId ? (
            <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2">
              <Switch
                id="bodega-activa"
                checked={bodegaForm.estado}
                onCheckedChange={(v) => setBodegaForm((prev) => ({ ...normalizeBodegaForm(prev), estado: v === true }))}
              />
              <Label htmlFor="bodega-activa" className="cursor-pointer text-sm font-normal leading-none">
                Bodega activa (visible en listados y selectores)
              </Label>
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            {editingBodegaId ? (
              <Button type="button" variant="outline" className="shrink-0" onClick={cancelarEdicionBodega} disabled={saving}>
                Cancelar edicion
              </Button>
            ) : null}
            <Button type="button" className="shrink-0" onClick={() => void guardarBodegaForm()} disabled={saving}>
              {editingBodegaId ? (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar cambios
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {bodegas.map((bodega, index) => (
          <Card key={bodegaId(bodega) || `bodega-${index}`} className="border-border bg-card">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{bodega.nombre}</CardTitle>
                  <CardDescription>{bodega.descripcion || 'Sin descripcion'}</CardDescription>
                  {(bodega.departamentoNombre || bodega.ciudadNombre) ? (
                    <p className="mt-2 text-sm text-foreground">
                      <span className="text-muted-foreground">Ubicacion: </span>
                      {[bodega.departamentoNombre, bodega.ciudadNombre].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                  {bodega.municipiosSubnodo && bodega.municipiosSubnodo.length > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="text-foreground/80">Cobertura municipal: </span>
                      {bodega.municipiosSubnodo.map((m) => m.nombre).join(', ')}
                    </p>
                  ) : null}
                </div>
                <Badge variant={bodega.estado ? 'default' : 'outline'}>{bodega.estado ? 'Activa' : 'Inactiva'}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Ubicaciones internas: {bodega.ubicaciones?.length ?? 0}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => iniciarEdicionBodega(bodega)} disabled={saving}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Editar
                </Button>
                <Button type="button" size="sm" variant="destructive" onClick={() => setBodegaDeleteTarget(bodega)} disabled={saving}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog
        open={!!bodegaDeleteTarget}
        onOpenChange={(open) => {
          if (!open && !bodegaDeleteBusy) setBodegaDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="border-border bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Eliminar bodega</AlertDialogTitle>
            <AlertDialogDescription>
              {bodegaDeleteTarget ? (
                <>
                  Se eliminara permanentemente <span className="font-semibold text-foreground">{bodegaDeleteTarget.nombre}</span>.
                  Solo es posible si no hay movimientos, existencias, ajustes ni ordenes de compra asociados a ese nombre.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel disabled={bodegaDeleteBusy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void confirmarEliminarBodega();
              }}
              disabled={bodegaDeleteBusy}
            >
              {bodegaDeleteBusy ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

