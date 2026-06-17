import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { History, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  listarCalculosNomina,
  obtenerCalculoNomina,
  type ResultadoCalculoNomina,
} from '@/app/services/nominaService';
import { formatCOP } from './nominaFormat';
import { CalculoNominaResultado } from './CalculoNominaResultado';

export function HistorialCalculosNomina() {
  const [loading, setLoading] = useState(true);
  const [lista, setLista] = useState<ResultadoCalculoNomina[]>([]);
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [detalle, setDetalle] = useState<ResultadoCalculoNomina | null>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await listarCalculosNomina({
        periodoLiquidacion: filtroPeriodo || undefined,
      });
      setLista(data);
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo cargar el historial');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  const verDetalle = async (id: string) => {
    try {
      const data = await obtenerCalculoNomina(id);
      setDetalle(data);
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo cargar el detalle');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de cálculos
          </h3>
          <p className="text-sm text-muted-foreground">Cálculos guardados por empleado y periodo.</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Periodo</Label>
            <Input
              placeholder="2026-06"
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              className="w-32"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => void cargar()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Buscar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registros</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : lista.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sin cálculos guardados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periodo</TableHead>
                  <TableHead className="text-right">Devengado</TableHead>
                  <TableHead className="text-right">Descuentos</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((item) => (
                  <TableRow key={item.iud}>
                    <TableCell>{item.periodoLiquidacion}</TableCell>
                    <TableCell className="text-right">{formatCOP(item.totalDevengado)}</TableCell>
                    <TableCell className="text-right">{formatCOP(item.totalDescuentos)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCOP(item.netoPagar)}</TableCell>
                    <TableCell className="text-right">
                      {item.iud && (
                        <Button variant="ghost" size="sm" onClick={() => void verDetalle(item.iud!)}>
                          Ver
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {detalle && (
        <div>
          <h4 className="mb-3 font-medium">Detalle del cálculo</h4>
          <CalculoNominaResultado resultado={detalle} />
        </div>
      )}
    </div>
  );
}
