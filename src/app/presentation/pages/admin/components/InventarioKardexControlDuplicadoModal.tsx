import React, { useState } from 'react';
import { CircleHelp, Save, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { InventarioKardexAuditoriaParametro } from '@/app/services/inventarioService';

type InventarioKardexControlDuplicadoModalProps = {
  open: boolean;
  saving: boolean;
  omitirControlDuplicado: boolean;
  auditoria?: InventarioKardexAuditoriaParametro | null;
  historial?: InventarioKardexAuditoriaParametro[];
  onOpenChange: (open: boolean) => void;
  onOmitirChange: (value: boolean) => void;
  onSubmit: () => void;
};

const formatFecha = (value: string | null | undefined): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
};

const formatBool = (value: boolean | null | undefined): string =>
  value === true ? 'true' : value === false ? 'false' : '—';

export function InventarioKardexControlDuplicadoAyudaDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>¿Qué hace el control de duplicados?</DialogTitle>
          <DialogDescription>
            Parámetro global de inventario para movimientos de kardex con documento soporte repetido.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm text-slate-700">
          <section className="rounded-lg border bg-slate-50 p-4 space-y-2">
            <p className="font-medium text-slate-900">omitirControlDuplicado = false (recomendado)</p>
            <ul className="list-disc space-y-1 pl-5 text-slate-600">
              <li>No omite la validación.</li>
              <li>
                Si ya existe una salida o entrada para el mismo comprobante (ej. <strong>FACTUR-000005</strong>),
                SKU y bodega, el sistema rechaza el nuevo movimiento.
              </li>
              <li>Aplica aunque la factura o pedido esté <strong>CONFIRMADO</strong> / pagado.</li>
            </ul>
          </section>

          <section className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 space-y-2">
            <p className="font-medium text-amber-950">omitirControlDuplicado = true</p>
            <ul className="list-disc space-y-1 pl-5 text-amber-900/90">
              <li>Omite la validación de duplicados en kardex.</li>
              <li>
                Permite registrar <strong>otra salida o entrada</strong> con el mismo documento, SKU y bodega,
                incluso si la factura ya está confirmada.
              </li>
              <li>Riesgo: stock incorrecto (doble descuento por la misma venta).</li>
              <li>Solo usar en correcciones excepcionales y revertir después si aplica.</li>
            </ul>
          </section>

          <section className="rounded-lg border p-4 space-y-2">
            <p className="font-medium text-slate-900">Lo que este parámetro NO cambia</p>
            <ul className="list-disc space-y-1 pl-5 text-slate-600">
              <li>No anula la exigencia de factura CONFIRMADA en ventas ecommerce automáticas.</li>
              <li>
                El botón <strong>Reaplicar kardex</strong> en Pedidos aprobados sigue bloqueado si ya hay salidas
                registradas para ese pedido (independiente de este switch).
              </li>
              <li>Cada cambio de este parámetro queda en auditoría con usuario y fecha.</li>
            </ul>
          </section>
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function InventarioKardexControlDuplicadoModal({
  open,
  saving,
  omitirControlDuplicado,
  auditoria,
  historial = [],
  onOpenChange,
  onOmitirChange,
  onSubmit,
}: InventarioKardexControlDuplicadoModalProps): React.ReactElement {
  const [ayudaOpen, setAyudaOpen] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Control de duplicados en kardex
                </DialogTitle>
                <DialogDescription className="mt-1.5">
                  Parámetro global: define si se permite otro movimiento con el mismo documento, SKU y bodega.
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => setAyudaOpen(true)}
              >
                <CircleHelp className="h-4 w-4" />
                Ayuda
              </Button>
            </div>
          </DialogHeader>

          <div className="rounded-xl border bg-muted/40 p-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="omitir-control-duplicado" className="text-sm font-medium">
                  Omitir control de duplicados
                </Label>
                <p className="text-xs text-muted-foreground">
                  <strong>false:</strong> bloquea duplicados · <strong>true:</strong> permite insertar aunque el
                  comprobante ya tenga movimiento (ej. factura confirmada).
                </p>
              </div>
              <Switch
                id="omitir-control-duplicado"
                checked={omitirControlDuplicado}
                onCheckedChange={onOmitirChange}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant={omitirControlDuplicado ? 'destructive' : 'secondary'}>
                omitirControlDuplicado: {omitirControlDuplicado ? 'true' : 'false'}
              </Badge>
              <Badge variant="outline">
                {omitirControlDuplicado ? 'Permite duplicar movimientos' : 'Validación activa'}
              </Badge>
            </div>
          </div>

          {auditoria?.modificadoEn ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm">
              <p className="font-medium text-slate-900">Última modificación del parámetro</p>
              <p className="mt-1 text-slate-600">
                {auditoria.usuarioCorreo || auditoria.usuarioId || 'Usuario desconocido'}
                {' · '}
                {formatFecha(auditoria.modificadoEn)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Cambió de {formatBool(auditoria.valorAnterior)} a {formatBool(auditoria.valorNuevo)}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Aún no hay cambios registrados en auditoría para este parámetro.
            </p>
          )}

          {historial.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Historial de cambios</p>
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Anterior</TableHead>
                      <TableHead>Nuevo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historial.map((row, index) => (
                      <TableRow key={`${row.modificadoEn}-${index}`}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatFecha(row.modificadoEn)}
                        </TableCell>
                        <TableCell className="text-xs max-w-[180px] truncate">
                          {row.usuarioCorreo || row.usuarioId || '—'}
                        </TableCell>
                        <TableCell className="text-xs">{formatBool(row.valorAnterior)}</TableCell>
                        <TableCell className="text-xs">{formatBool(row.valorNuevo)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={onSubmit} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InventarioKardexControlDuplicadoAyudaDialog open={ayudaOpen} onOpenChange={setAyudaOpen} />
    </>
  );
}
