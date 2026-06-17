import React from 'react';
import { History } from 'lucide-react';
import type { HistoricoValorRow } from '@/app/presentation/pages/admin/inventario/inventarioHistoricoValorUtils';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export type InventarioHistoricoValorModalProps = {
  open: boolean;
  sku: string;
  rows: HistoricoValorRow[];
  money: Intl.NumberFormat;
  formatDate: (value?: string | Date | null) => string;
  onOpenChange: (open: boolean) => void;
};

export default function InventarioHistoricoValorModal({
  open,
  sku,
  rows,
  money,
  formatDate,
  onOpenChange,
}: InventarioHistoricoValorModalProps): React.ReactElement {
  const skuLabel = String(sku || '').trim().toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historico de valor
          </DialogTitle>
          <DialogDescription>
            Referencia desde el primer registro kardex. Cada cambio de valor queda en el historial.
            {skuLabel ? ` · SKU ${skuLabel}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Bodega</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead className="text-right">Valor anterior</TableHead>
                <TableHead className="text-right">Valor posterior</TableHead>
                <TableHead className="text-right">Cant. anterior</TableHead>
                <TableHead className="text-right">Cant. posterior</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((entry, index) => (
                <TableRow key={`${entry.movimientoId || index}-${entry.fecha || index}`}>
                  <TableCell>{formatDate(entry.fecha)}</TableCell>
                  <TableCell className="font-mono text-xs">{entry.sku}</TableCell>
                  <TableCell>{entry.bodega}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        entry.esPrimerRegistro
                          ? 'default'
                          : entry.tipoMovimiento === 'SALIDA'
                            ? 'salida'
                            : 'entrada'
                      }
                    >
                      {entry.esPrimerRegistro ? 'Primer registro' : entry.tipoMovimiento || '—'}
                    </Badge>
                  </TableCell>
                  <TableCell>{entry.documentoTipo} {entry.documentoNumero}</TableCell>
                  <TableCell className="text-right">{money.format(Number(entry.valorAnterior || 0))}</TableCell>
                  <TableCell className="text-right">{money.format(Number(entry.valorPosterior || 0))}</TableCell>
                  <TableCell className="text-right">{Number(entry.cantidadAnterior || 0).toLocaleString('es-CO')}</TableCell>
                  <TableCell className="text-right">{Number(entry.cantidadPosterior || 0).toLocaleString('es-CO')}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    {skuLabel
                      ? 'No hay cambios de valor registrados para este SKU.'
                      : 'Selecciona un SKU y consulta el stock para ver el historico.'}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
