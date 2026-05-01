import React from 'react';
import { ClipboardList, Package, Search } from 'lucide-react';
import type {
  InventarioMovimiento,
  InventarioSaldo,
  StockActualItem,
} from '@/app/services/inventarioService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type StockFiltro = {
  sku: string;
  bodega: string;
};

type InventarioStockTabProps = {
  stockFiltro: StockFiltro;
  setStockFiltro: React.Dispatch<React.SetStateAction<StockFiltro>>;
  stockConsulta: InventarioSaldo | null;
  stockActual: StockActualItem[];
  kardex: InventarioMovimiento[];
  money: Intl.NumberFormat;
  renderBodegaSelect: (value: string, onChange: (value: string) => void) => React.ReactElement;
  consultarStock: () => Promise<void>;
  formatDate: (value?: string) => string;
  getTipoMovimientoLabel: (mov: InventarioMovimiento) => string;
};

export default function InventarioStockTab({
  stockFiltro,
  setStockFiltro,
  stockConsulta,
  stockActual,
  kardex,
  money,
  renderBodegaSelect,
  consultarStock,
  formatDate,
  getTipoMovimientoLabel,
}: InventarioStockTabProps): React.ReactElement {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" /> Consultar stock</CardTitle>
            <CardDescription>Busca saldo y kardex por SKU y bodega.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input
                value={stockFiltro.sku}
                onChange={(event) => setStockFiltro((prev) => ({ ...prev, sku: event.target.value }))}
                placeholder="CAM-BAS-M"
              />
            </div>
            <div className="space-y-2">
              <Label>Bodega</Label>
              {renderBodegaSelect(stockFiltro.bodega, (value) => setStockFiltro((prev) => ({ ...prev, bodega: value })))}
            </div>
            <Button className="w-full" onClick={() => void consultarStock()}>
              <Search className="mr-2 h-4 w-4" />
              Consultar
            </Button>
            {stockConsulta ? (
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Disponible</p>
                <p className="text-3xl font-bold">{Number(stockConsulta.cantidadDisponible || 0).toLocaleString('es-CO')}</p>
                <p className="mt-2 text-sm text-muted-foreground">Costo promedio</p>
                <p className="font-semibold">{money.format(Number(stockConsulta.costoPromedioUnitario || 0))}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Stock actual</CardTitle>
            <CardDescription>Saldos disponibles registrados por bodega.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Bodega</TableHead>
                    <TableHead className="text-right">Disponible</TableHead>
                    <TableHead className="text-right">Costo prom.</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockActual.slice(0, 20).map((item) => (
                    <TableRow key={`${item.sku}-${item.bodega}`}>
                      <TableCell className="font-medium">{item.sku}</TableCell>
                      <TableCell>{item.bodega}</TableCell>
                      <TableCell className="text-right">{Number(item.cantidadDisponible || 0).toLocaleString('es-CO')}</TableCell>
                      <TableCell className="text-right">{money.format(Number(item.costoPromedioUnitario || 0))}</TableCell>
                      <TableCell className="text-right">
                        {money.format(Number(item.valorTotal ?? Number(item.cantidadDisponible || 0) * Number(item.costoPromedioUnitario || 0)))}
                      </TableCell>
                    </TableRow>
                  ))}
                  {stockActual.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No hay saldos disponibles.</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Kardex consultado</CardTitle>
          <CardDescription>Ultimos movimientos del filtro seleccionado.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead>Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kardex.map((mov) => (
                  <TableRow key={mov._id}>
                    <TableCell>{formatDate(mov.createdAt)}</TableCell>
                    <TableCell><Badge variant={mov.tipoMovimiento === 'SALIDA' ? 'secondary' : 'default'}>{getTipoMovimientoLabel(mov)}</Badge></TableCell>
                    <TableCell>{mov.sku}</TableCell>
                    <TableCell>{mov.documentoRelacionado?.tipo} {mov.documentoRelacionado?.numero}</TableCell>
                    <TableCell className="text-right">{Number(mov.cantidad || 0).toLocaleString('es-CO')}</TableCell>
                    <TableCell className="text-right">{money.format(Number(mov.costoTotal || 0))}</TableCell>
                    <TableCell className="max-w-[140px] truncate font-mono text-xs">{mov.hashIntegridad}</TableCell>
                  </TableRow>
                ))}
                {kardex.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Consulta un SKU para ver su kardex.</TableCell>
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

