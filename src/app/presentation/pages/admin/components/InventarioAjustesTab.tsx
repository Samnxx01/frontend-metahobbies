import React from 'react';
import { Plus, RotateCcw } from 'lucide-react';
import type { AjusteInventario, AjustePayload, EstadoAjuste, TipoAjuste } from '@/app/services/inventarioService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

type InventarioAjustesTabProps = {
  ajusteForm: AjustePayload;
  setAjusteForm: React.Dispatch<React.SetStateAction<AjustePayload>>;
  ajusteFiltro: EstadoAjuste | '';
  setAjusteFiltro: React.Dispatch<React.SetStateAction<EstadoAjuste | ''>>;
  ajustes: AjusteInventario[];
  saving: boolean;
  causalesAjuste: string[];
  renderBodegaSelect: (value: string, onChange: (value: string) => void) => React.ReactElement;
  solicitarAjuste: () => Promise<void>;
  refreshAjustes: (estado?: EstadoAjuste | '') => Promise<void>;
  cambiarEstadoAjuste: (ajuste: AjusteInventario, accion: 'aprobar' | 'rechazar') => Promise<void>;
  estadoBadge: (estado: string) => 'default' | 'secondary' | 'destructive' | 'outline';
};

export default function InventarioAjustesTab({
  ajusteForm,
  setAjusteForm,
  ajusteFiltro,
  setAjusteFiltro,
  ajustes,
  saving,
  causalesAjuste,
  renderBodegaSelect,
  solicitarAjuste,
  refreshAjustes,
  cambiarEstadoAjuste,
  estadoBadge,
}: InventarioAjustesTabProps): React.ReactElement {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><RotateCcw className="h-5 w-5" /> Solicitar ajuste</CardTitle>
          <CardDescription>Los ajustes quedan pendientes hasta aprobacion.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label>SKU</Label>
            <Input value={ajusteForm.sku} onChange={(event) => setAjusteForm((prev) => ({ ...prev, sku: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Bodega</Label>
            {renderBodegaSelect(ajusteForm.bodega, (value) => setAjusteForm((prev) => ({ ...prev, bodega: value })))}
          </div>
          <div className="space-y-2">
            <Label>Tipo ajuste</Label>
            <Select value={ajusteForm.tipoAjuste} onValueChange={(value) => setAjusteForm((prev) => ({ ...prev, tipoAjuste: value as TipoAjuste }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="POSITIVO">Positivo</SelectItem>
                <SelectItem value="NEGATIVO">Negativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Causal</Label>
            <Select value={ajusteForm.causal} onValueChange={(value) => setAjusteForm((prev) => ({ ...prev, causal: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {causalesAjuste.map((causal) => <SelectItem key={causal} value={causal}>{causal}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Cantidad</Label>
            <Input type="number" min="1" value={ajusteForm.cantidad} onChange={(event) => setAjusteForm((prev) => ({ ...prev, cantidad: Number(event.target.value) }))} />
          </div>
          <div className="space-y-2">
            <Label>Costo referencia</Label>
            <Input type="number" min="0" value={ajusteForm.costoUnitarioReferencia} onChange={(event) => setAjusteForm((prev) => ({ ...prev, costoUnitarioReferencia: Number(event.target.value) }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Observacion</Label>
            <Textarea value={ajusteForm.observacion} onChange={(event) => setAjusteForm((prev) => ({ ...prev, observacion: event.target.value }))} />
          </div>
          <div className="md:col-span-2 xl:col-span-4">
            <Button onClick={() => void solicitarAjuste()} disabled={saving}>
              <Plus className="mr-2 h-4 w-4" />
              Solicitar ajuste
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Ajustes registrados</CardTitle>
              <CardDescription>Aprueba o rechaza ajustes pendientes.</CardDescription>
            </div>
            <Select value={ajusteFiltro || 'TODOS'} onValueChange={(value) => {
              const next = value === 'TODOS' ? '' : value as EstadoAjuste;
              setAjusteFiltro(next);
              void refreshAjustes(next);
            }}>
              <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="SOLICITADO">Solicitados</SelectItem>
                <SelectItem value="APROBADO">Aprobados</SelectItem>
                <SelectItem value="RECHAZADO">Rechazados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Bodega</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Causal</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ajustes.map((ajuste) => (
                  <TableRow key={ajuste._id}>
                    <TableCell className="font-medium">{ajuste.sku}</TableCell>
                    <TableCell>{ajuste.bodega}</TableCell>
                    <TableCell>{ajuste.tipoAjuste}</TableCell>
                    <TableCell>{ajuste.causal}</TableCell>
                    <TableCell className="text-right">{Number(ajuste.cantidad || 0).toLocaleString('es-CO')}</TableCell>
                    <TableCell><Badge variant={estadoBadge(ajuste.estado)}>{ajuste.estado}</Badge></TableCell>
                    <TableCell className="text-right">
                      {ajuste.estado === 'SOLICITADO' ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => void cambiarEstadoAjuste(ajuste, 'rechazar')} disabled={saving}>Rechazar</Button>
                          <Button size="sm" onClick={() => void cambiarEstadoAjuste(ajuste, 'aprobar')} disabled={saving}>Aprobar</Button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Procesado</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {ajustes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No hay ajustes para mostrar.</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

