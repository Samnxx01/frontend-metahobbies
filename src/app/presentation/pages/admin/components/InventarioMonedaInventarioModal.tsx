import React, { useState } from 'react';
import { Eye, RefreshCcw, Save, Settings } from 'lucide-react';
import type { MonedaCopOption } from '@/app/services/inventarioService';
import {
  conversionLabel,
  monedaId,
  monedaLabel,
  type MonedaInventarioDraft,
} from '@/app/presentation/pages/admin/inventario/monedaInventarioDraft';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export type InventarioMonedaInventarioModalProps = {
  open: boolean;
  saving?: boolean;
  draft: MonedaInventarioDraft;
  monedaOptions: MonedaCopOption[];
  monedasLoading?: boolean;
  sincronizandoMonedas?: boolean;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (draft: MonedaInventarioDraft) => void;
  onSincronizarMonedas: () => void | Promise<void>;
  onSave: () => void | Promise<void>;
};

export default function InventarioMonedaInventarioModal({
  open,
  saving = false,
  draft,
  monedaOptions,
  monedasLoading = false,
  sincronizandoMonedas = false,
  onOpenChange,
  onDraftChange,
  onSincronizarMonedas,
  onSave,
}: InventarioMonedaInventarioModalProps): React.ReactElement {
  const [visualizadorOpen, setVisualizadorOpen] = useState(false);

  const patchDraft = (partial: Partial<MonedaInventarioDraft>): void => {
    onDraftChange({ ...draft, ...partial });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-h-[92dvh] max-w-4xl overflow-y-auto border-border bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Parametrizar moneda de inventario
          </DialogTitle>
          <DialogDescription>
            Define la moneda operativa y registra conversiones monetarias para compras, costos e inventario.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => void onSincronizarMonedas()}
            disabled={sincronizandoMonedas}
          >
            <RefreshCcw className={`h-4 w-4 ${sincronizandoMonedas ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Moneda base inventario *</Label>
            <Select
              value={draft.monedaBaseId}
              onValueChange={(value) => patchDraft({ monedaBaseId: value })}
              disabled={monedasLoading}
            >
              <SelectTrigger><SelectValue placeholder="Selecciona una moneda" /></SelectTrigger>
              <SelectContent>
                {monedaOptions.map((moneda) => (
                  <SelectItem key={monedaId(moneda)} value={monedaId(moneda)}>{monedaLabel(moneda)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Moneda de compra por defecto *</Label>
            <Select
              value={draft.monedaCompraId}
              onValueChange={(value) => patchDraft({ monedaCompraId: value })}
              disabled={monedasLoading}
            >
              <SelectTrigger><SelectValue placeholder="Selecciona una moneda" /></SelectTrigger>
              <SelectContent>
                {monedaOptions.map((moneda) => (
                  <SelectItem key={monedaId(moneda)} value={monedaId(moneda)}>{monedaLabel(moneda)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Simbolo</Label>
            <Input value={draft.simbolo} onChange={(event) => patchDraft({ simbolo: event.target.value })} placeholder="$" />
          </div>

          <div className="space-y-2">
            <Label>Decimales</Label>
            <Input inputMode="numeric" value={draft.decimales} onChange={(event) => patchDraft({ decimales: event.target.value })} placeholder="2" />
          </div>

          <div className="space-y-2">
            <Label>Formato regional</Label>
            <Select value={draft.formato} onValueChange={(value) => patchDraft({ formato: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="es-CO">es-CO</SelectItem>
                <SelectItem value="en-US">en-US</SelectItem>
                <SelectItem value="es-ES">es-ES</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border px-3 py-3">
            <div>
              <p className="text-sm font-medium">Convertir costos con TRM</p>
              <p className="text-xs text-muted-foreground">Aplica cuando la moneda de compra difiere de la base.</p>
            </div>
            <Switch checked={draft.convertirPorTrm} onCheckedChange={(checked) => patchDraft({ convertirPorTrm: checked })} />
          </div>
        </div>

        <DialogFooter className="items-center justify-between gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => setVisualizadorOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Visualizar conversiones
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void onSave()} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Guardando' : 'Guardar moneda'}
            </Button>
          </div>
        </DialogFooter>

        <Dialog open={visualizadorOpen} onOpenChange={setVisualizadorOpen}>
          <DialogContent className="w-[calc(100%-2rem)] max-h-[90dvh] max-w-3xl overflow-y-auto border-border bg-background text-foreground">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Visualizador de conversiones
              </DialogTitle>
              <DialogDescription>
                Registros asociados a la configuracion de moneda de inventario.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md border border-border bg-card">
              <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
                <p className="text-sm font-medium">Conversiones parametrizadas</p>
                <Badge variant="secondary">{draft.conversionesMoneda.length} registros</Badge>
              </div>
              <div className="max-h-80 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conversion</TableHead>
                      <TableHead>Tasa</TableHead>
                      <TableHead>Fuente</TableHead>
                      <TableHead>Vigencia</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {draft.conversionesMoneda.length ? (
                      draft.conversionesMoneda.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{conversionLabel(item)}</TableCell>
                          <TableCell>{item.tasa}</TableCell>
                          <TableCell>{item.fuente}</TableCell>
                          <TableCell>{item.fechaVigencia || 'Sin fecha'}</TableCell>
                          <TableCell>
                            <Badge variant={item.activo ? 'default' : 'secondary'}>
                              {item.activo ? 'Activa' : 'Inactiva'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                          No hay conversiones parametrizadas.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setVisualizadorOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
