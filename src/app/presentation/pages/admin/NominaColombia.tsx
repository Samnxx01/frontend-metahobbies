import React, { useState } from 'react';
import { Banknote, Settings2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfiguracionNominaPanel } from '@/app/presentation/components/nomina/ConfiguracionNominaPanel';
import { CalculoNominaForm } from '@/app/presentation/components/nomina/CalculoNominaForm';
import { HistorialCalculosNomina } from '@/app/presentation/components/nomina/HistorialCalculosNomina';
import type { ConfiguracionNomina } from '@/app/services/nominaService';

export default function NominaColombia() {
  const [configActiva, setConfigActiva] = useState<ConfiguracionNomina | null>(null);

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Banknote className="h-7 w-7 text-primary" />
          Nómina Colombia
        </h1>
        <p className="text-muted-foreground mt-1">
          Cálculo parametrizable de horas extras, recargos, seguridad social y neto a pagar.
          {configActiva && (
            <span className="ml-2 text-xs">
              Config activa: {configActiva.horasLaboralesMensuales} h/mes
            </span>
          )}
        </p>
      </div>

      <Tabs defaultValue="calculo" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="calculo">Cálculo</TabsTrigger>
          <TabsTrigger value="config">
            <Settings2 className="mr-1 h-4 w-4" />
            Configuración
          </TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="calculo" className="mt-6">
          <CalculoNominaForm />
        </TabsContent>

        <TabsContent value="config" className="mt-6">
          <ConfiguracionNominaPanel onConfigChange={setConfigActiva} />
        </TabsContent>

        <TabsContent value="historial" className="mt-6">
          <HistorialCalculosNomina />
        </TabsContent>
      </Tabs>
    </div>
  );
}
