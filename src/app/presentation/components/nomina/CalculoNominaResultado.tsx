import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ResultadoCalculoNomina } from '@/app/services/nominaService';
import {
  formatCOP,
  TIPO_DESCUENTO_LABELS,
  TIPO_HORA_EXTRA_LABELS,
  TIPO_RECARGO_LABELS,
} from './nominaFormat';

type Props = {
  resultado: ResultadoCalculoNomina | null;
};

export function CalculoNominaResultado({ resultado }: Props) {
  if (!resultado) return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total devengado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{formatCOP(resultado.totalDevengado)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total descuentos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning">{formatCOP(resultado.totalDescuentos)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Neto a pagar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{formatCOP(resultado.netoPagar)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen base</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <div className="flex justify-between"><span>Sueldo base</span><strong>{formatCOP(resultado.sueldoBaseMensual)}</strong></div>
          <div className="flex justify-between"><span>Horas laborales mensuales</span><strong>{resultado.horasLaboralesMensuales}</strong></div>
          <div className="flex justify-between"><span>Valor hora ordinaria</span><strong>{formatCOP(resultado.valorHoraOrdinaria)}</strong></div>
          <div className="flex justify-between"><span>Base seguridad social</span><strong>{formatCOP(resultado.baseSeguridadSocial)}</strong></div>
          {resultado.otrosIngresos > 0 && (
            <div className="flex justify-between"><span>Otros ingresos</span><strong>{formatCOP(resultado.otrosIngresos)}</strong></div>
          )}
          {resultado.otrosDescuentos > 0 && (
            <div className="flex justify-between"><span>Otros descuentos</span><strong>{formatCOP(resultado.otrosDescuentos)}</strong></div>
          )}
        </CardContent>
      </Card>

      {resultado.detalleHorasExtras.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Horas extras
              <Badge variant="secondary">{formatCOP(resultado.totalHorasExtras)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Unitario</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultado.detalleHorasExtras.map((item) => (
                  <TableRow key={item.tipo}>
                    <TableCell>{item.nombre || TIPO_HORA_EXTRA_LABELS[item.tipo] || item.tipo}</TableCell>
                    <TableCell className="text-right">{item.cantidadHoras}</TableCell>
                    <TableCell className="text-right">{item.porcentajeAplicado}</TableCell>
                    <TableCell className="text-right">{formatCOP(item.valorUnitario)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCOP(item.valorTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {resultado.detalleRecargos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Recargos
              <Badge variant="secondary">{formatCOP(resultado.totalRecargos)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Unitario</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultado.detalleRecargos.map((item) => (
                  <TableRow key={item.tipo}>
                    <TableCell>{item.nombre || TIPO_RECARGO_LABELS[item.tipo] || item.tipo}</TableCell>
                    <TableCell className="text-right">{item.cantidadHoras}</TableCell>
                    <TableCell className="text-right">{item.porcentajeAplicado}</TableCell>
                    <TableCell className="text-right">{formatCOP(item.valorUnitario)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCOP(item.valorTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {resultado.detalleSeguridadSocial.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Seguridad social
              <Badge variant="outline">{formatCOP(resultado.totalSeguridadSocial)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultado.detalleSeguridadSocial.map((item) => (
                  <TableRow key={item.tipo}>
                    <TableCell>{item.nombre || TIPO_DESCUENTO_LABELS[item.tipo] || item.tipo}</TableCell>
                    <TableCell className="text-right">{formatCOP(item.baseAplicada)}</TableCell>
                    <TableCell className="text-right">{item.porcentajeAplicado}</TableCell>
                    <TableCell className="text-right font-medium">{formatCOP(item.valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {resultado.formulasAplicadas?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Trazabilidad — fórmulas aplicadas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-xs text-muted-foreground font-mono">
              {resultado.formulasAplicadas.map((f, i) => (
                <li key={`${i}-${f.slice(0, 24)}`}>{f}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {resultado.guardado && (
        <>
          <Separator />
          <p className="text-sm text-muted-foreground">Cálculo guardado en historial.</p>
        </>
      )}
    </div>
  );
}
