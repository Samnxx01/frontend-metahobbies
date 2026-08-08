import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, History, Package, Search } from 'lucide-react';
import type {
  InventarioMovimiento,
  InventarioSaldo,
  StockActualItem,
} from '@/app/services/inventarioService';
import { buildHistoricoValor } from '@/app/presentation/pages/admin/inventario/inventarioHistoricoValorUtils';
import InventarioHistoricoValorModal from '@/app/presentation/pages/admin/components/InventarioHistoricoValorModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type StockFiltro = {
  sku: string;
};

type InventarioStockTabProps = {
  stockFiltro: StockFiltro;
  stockConsulta: InventarioSaldo | null;
  stockActual: StockActualItem[];
  kardex: InventarioMovimiento[];
  money: Intl.NumberFormat;
  /** Buscador + selector de SKU. Es un nodo ya montado (no una render-prop) para no recrearlo en cada render del padre. */
  skuSelect: React.ReactNode;
  consultarStock: () => Promise<void>;
  etiquetaVista?: string;
  formatDate: (value?: string | Date | null) => string;
  fechaMovimiento?: (mov: InventarioMovimiento) => string | Date | undefined;
  getTipoMovimientoLabel: (mov: InventarioMovimiento) => string;
};

export default function InventarioStockTab({
  stockFiltro,
  stockConsulta,
  stockActual,
  kardex,
  money,
  skuSelect,
  consultarStock,
  formatDate,
  fechaMovimiento,
  getTipoMovimientoLabel,
  etiquetaVista = 'Todas las bodegas',
}: InventarioStockTabProps): React.ReactElement {
  const [historicoModalOpen, setHistoricoModalOpen] = useState(false);
  const [paginaKardex, setPaginaKardex] = useState(1);
  const [paginaStock, setPaginaStock] = useState(1);
  const skuConsultado = stockFiltro.sku.trim().toUpperCase();

  const KARDEX_PAGE_SIZE = 10;
  const totalPaginasKardex = Math.max(1, Math.ceil(kardex.length / KARDEX_PAGE_SIZE));
  const paginaKardexActual = Math.min(paginaKardex, totalPaginasKardex);
  const kardexVisible = useMemo(
    () => kardex.slice((paginaKardexActual - 1) * KARDEX_PAGE_SIZE, paginaKardexActual * KARDEX_PAGE_SIZE),
    [kardex, paginaKardexActual],
  );

  useEffect(() => {
    setPaginaKardex(1);
  }, [kardex]);

  // `stockActual` llega sin límite desde el backend (`stockActualCombinadoEnriquecido`),
  // así que pintar el array completo generaba tablas de miles de celdas en cada render.
  // Los totales del encabezado los sigue calculando el padre sobre el array íntegro.
  const STOCK_PAGE_SIZE = 25;
  const totalPaginasStock = Math.max(1, Math.ceil(stockActual.length / STOCK_PAGE_SIZE));
  const paginaStockActual = Math.min(paginaStock, totalPaginasStock);
  const stockVisible = useMemo(
    () => stockActual.slice((paginaStockActual - 1) * STOCK_PAGE_SIZE, paginaStockActual * STOCK_PAGE_SIZE),
    [stockActual, paginaStockActual],
  );

  useEffect(() => {
    setPaginaStock(1);
  }, [stockActual]);

  const historicoValor = useMemo(
    () => buildHistoricoValor(stockActual, kardex, skuConsultado),
    [stockActual, kardex, skuConsultado],
  );

  const abrirHistoricoValor = (): void => {
    if (!skuConsultado) return;
    setHistoricoModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" /> Consultar stock</CardTitle>
            <CardDescription>
              Opcional: filtra por SKU y pulsa Consultar. Los saldos combinan kardex y documentos de inventario.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>SKU</Label>
              {skuSelect}
            </div>
            <Button className="w-full" onClick={() => void consultarStock()}>
              <Search className="mr-2 h-4 w-4" />
              Consultar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={!skuConsultado}
              onClick={abrirHistoricoValor}
            >
              <History className="mr-2 h-4 w-4" />
              Historico de valor
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
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Stock actual</CardTitle>
              <CardDescription>
                Saldos en <span className="font-medium text-foreground">{etiquetaVista}</span>.
                Valor inicial = primer registro kardex; valor actual = saldo vigente.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!skuConsultado}
              onClick={abrirHistoricoValor}
            >
              <History className="mr-2 h-4 w-4" />
              Historico
            </Button>
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
                    <TableHead className="text-right">Valor inicial</TableHead>
                    <TableHead className="text-right">Valor actual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockVisible.map((item) => (
                    <TableRow key={`${item.sku}-${item.bodega}`}>
                      <TableCell className="font-medium">{item.sku}</TableCell>
                      <TableCell>{item.bodega}</TableCell>
                      <TableCell className="text-right">{Number(item.cantidadDisponible || 0).toLocaleString('es-CO')}</TableCell>
                      <TableCell className="text-right">{money.format(Number(item.costoPromedioUnitario || 0))}</TableCell>
                      <TableCell className="text-right">
                        {money.format(
                          item.valorInicial != null
                            ? Number(item.valorInicial)
                            : Number(item.valorTotal ?? Number(item.cantidadDisponible || 0) * Number(item.costoPromedioUnitario || 0)),
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {money.format(
                          item.valorActual != null
                            ? Number(item.valorActual)
                            : Number(item.valorTotal ?? Number(item.cantidadDisponible || 0) * Number(item.costoPromedioUnitario || 0)),
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {stockActual.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No hay saldos disponibles.</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
            {stockActual.length > STOCK_PAGE_SIZE ? (
              <div className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="text-muted-foreground">
                  {stockActual.length} saldo(s) · Página {paginaStockActual} de {totalPaginasStock}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={paginaStockActual <= 1}
                    onClick={() => setPaginaStock((prev) => Math.max(1, prev - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={paginaStockActual >= totalPaginasStock}
                    onClick={() => setPaginaStock((prev) => Math.min(totalPaginasStock, prev + 1))}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Kardex consultado</CardTitle>
            <CardDescription>
              Movimientos en <span className="font-medium text-foreground">{etiquetaVista}</span>
              {stockFiltro.sku.trim() ? ` · SKU ${stockFiltro.sku.trim()}` : ''}.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!skuConsultado}
            onClick={abrirHistoricoValor}
          >
            <History className="mr-2 h-4 w-4" />
            Historico de valor
          </Button>
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
                  <TableHead>Ejecutado por</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Costo unit.</TableHead>
                  <TableHead className="text-right">Valor movimiento</TableHead>
                  <TableHead className="text-right">Valor inicial</TableHead>
                  <TableHead className="text-right">Valor actual</TableHead>
                  <TableHead>Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kardexVisible.map((mov) => (
                  <TableRow key={mov._id}>
                    <TableCell>{formatDate(fechaMovimiento ? fechaMovimiento(mov) : mov.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={mov.tipoMovimiento === 'SALIDA' ? 'salida' : 'entrada'}>
                        {getTipoMovimientoLabel(mov)}
                      </Badge>
                    </TableCell>
                    <TableCell>{mov.sku}</TableCell>
                    <TableCell>{mov.documentoRelacionado?.tipo} {mov.documentoRelacionado?.numero}</TableCell>
                    <TableCell>
                      <span className="block text-sm">{mov.auditoria?.usuarioNombre || mov.auditoria?.usuarioCorreo || 'Sistema'}</span>
                      {mov.auditoria?.usuarioNombre && mov.auditoria?.usuarioCorreo ? (
                        <span className="block text-xs text-muted-foreground">{mov.auditoria.usuarioCorreo}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">{Number(mov.cantidad || 0).toLocaleString('es-CO')}</TableCell>
                    <TableCell className="text-right">{money.format(Number(mov.costoUnitario || 0))}</TableCell>
                    <TableCell className="text-right">{money.format(Number(mov.costoTotal || 0))}</TableCell>
                    <TableCell className="text-right">
                      {mov.saldoBodega?.valorInicial != null
                        ? money.format(Number(mov.saldoBodega.valorInicial))
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {mov.saldoBodega?.valorActual != null
                        ? money.format(Number(mov.saldoBodega.valorActual))
                        : '—'}
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate font-mono text-xs">{mov.hashIntegridad}</TableCell>
                  </TableRow>
                ))}
                {kardex.length === 0 ? (
                  <TableRow>
                      <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">Pulsa Consultar para ver movimientos del kardex.</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          {kardex.length > 0 ? (
            <div className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="text-muted-foreground">
                {kardex.length} movimiento(s) · Página {paginaKardexActual} de {totalPaginasKardex}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={paginaKardexActual <= 1}
                  onClick={() => setPaginaKardex((prev) => Math.max(1, prev - 1))}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={paginaKardexActual >= totalPaginasKardex}
                  onClick={() => setPaginaKardex((prev) => Math.min(totalPaginasKardex, prev + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <InventarioHistoricoValorModal
        open={historicoModalOpen}
        sku={skuConsultado}
        rows={historicoValor}
        money={money}
        formatDate={formatDate}
        onOpenChange={setHistoricoModalOpen}
      />
    </div>
  );
}
