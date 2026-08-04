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
      <div className="space-y-2 md:hidden">
        {lineas.map((linea) => {
          const doc = linea.movimiento?.documentoRelacionado;
          return (
            <div key={`mobile-${linea.sku}-${linea.bodega}-${linea.movimientoKardexId || 'sin-id'}`} className="rounded-md border border-border bg-card p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-all font-mono text-xs font-semibold">{linea.sku}</p>
                  <p className="break-words text-xs text-muted-foreground">{linea.bodega}</p>
                </div>
                <Badge variant="outline">Entrada {formatQty(Number(linea.movimiento?.cantidad || 0))}</Badge>
              </div>
              {!compact ? <p className="mt-2 text-xs">{labelTipoMovimiento(linea)}</p> : null}
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div><dt className="text-muted-foreground">Stock anterior</dt><dd className="font-medium tabular-nums">{formatQty(Number(linea.movimiento?.saldoBodega?.cantidadAnterior ?? 0))}</dd></div>
                <div><dt className="text-muted-foreground">Stock posterior</dt><dd className="font-medium tabular-nums">{formatQty(Number(linea.movimiento?.saldoBodega?.cantidadPosterior ?? linea.saldo?.cantidadDisponible ?? 0))}</dd></div>
                <div><dt className="text-muted-foreground">Saldo actual</dt><dd className="font-semibold tabular-nums">{formatQty(Number(linea.saldo?.cantidadDisponible ?? 0))}</dd></div>
                {!compact ? <div><dt className="text-muted-foreground">Costo promedio</dt><dd className="font-medium tabular-nums">{moneyCo(Number(linea.saldo?.costoPromedioUnitario ?? linea.movimiento?.costoUnitario ?? 0))}</dd></div> : null}
              </dl>
              {!compact ? <p className="mt-3 break-all font-mono text-[11px] text-muted-foreground">{doc?.tipo && doc?.numero ? `${doc.tipo} · ${doc.numero}` : '—'}</p> : null}
            </div>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto rounded-md border border-border md:block">
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
