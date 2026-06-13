import React from 'react';
import type { ReporteKardexEntradaLinea } from '@/app/services/inventarioService';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const moneyCo = (n: number): string =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const formatQty = (value: number): string =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(value);

const formatDateTimeCo = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
};

const labelTipoMovimiento = (linea: ReporteKardexEntradaLinea): string => {
  const cfg = linea.movimiento?.tipoMovimientoConfig;
  if (cfg?.nombre) return `${cfg.nombre} (${cfg.codigo || linea.movimiento?.tipoMovimiento || 'ENTRADA'})`;
  return linea.movimiento?.tipoMovimiento || 'ENTRADA';
};

export type InventarioReporteKardexEntradaProps = {
  lineas: ReporteKardexEntradaLinea[];
  compact?: boolean;
};

export default function InventarioReporteKardexEntrada({
  lineas,
  compact = false,
}: InventarioReporteKardexEntradaProps): React.ReactElement | null {
  if (!lineas.length) return null;

  const registradoEn = lineas.find((l) => l.movimiento?.registradoEn)?.movimiento?.registradoEn;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">Registro en kardex</p>
          <p className="text-xs text-muted-foreground">
            inventarioMovimiento · inventarioSaldo
            {registradoEn ? ` · ${formatDateTimeCo(registradoEn)}` : ''}
          </p>
        </div>
        <Badge variant="outline">Kardex confirmado</Badge>
      </div>
      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Bodega</TableHead>
              {!compact ? <TableHead>Tipo mov.</TableHead> : null}
              <TableHead className="text-right">Cant. entrada</TableHead>
              <TableHead className="text-right">Stock anterior</TableHead>
              <TableHead className="text-right">Stock posterior</TableHead>
              <TableHead className="text-right">Saldo actual</TableHead>
              {!compact ? <TableHead className="text-right">Costo prom.</TableHead> : null}
              {!compact ? <TableHead>Documento kardex</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineas.map((linea) => {
              const doc = linea.movimiento?.documentoRelacionado;
              return (
                <TableRow key={`${linea.sku}-${linea.bodega}-${linea.movimientoKardexId || 'sin-id'}`}>
                  <TableCell className="font-mono text-xs">{linea.sku}</TableCell>
                  <TableCell className="text-sm">{linea.bodega}</TableCell>
                  {!compact ? (
                    <TableCell className="text-xs text-foreground">{labelTipoMovimiento(linea)}</TableCell>
                  ) : null}
                  <TableCell className="text-right tabular-nums">
                    {formatQty(Number(linea.movimiento?.cantidad || 0))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatQty(Number(linea.movimiento?.saldoBodega?.cantidadAnterior ?? 0))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatQty(Number(linea.movimiento?.saldoBodega?.cantidadPosterior ?? linea.saldo?.cantidadDisponible ?? 0))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {formatQty(Number(linea.saldo?.cantidadDisponible ?? 0))}
                  </TableCell>
                  {!compact ? (
                    <TableCell className="text-right tabular-nums">
                      {moneyCo(Number(linea.saldo?.costoPromedioUnitario ?? linea.movimiento?.costoUnitario ?? 0))}
                    </TableCell>
                  ) : null}
                  {!compact ? (
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {doc?.tipo && doc?.numero ? `${doc.tipo} · ${doc.numero}` : '—'}
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
