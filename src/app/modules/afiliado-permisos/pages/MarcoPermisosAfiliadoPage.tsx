import React from 'react';
import { Loader2, Shield } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMarcoPermisosParametrizacion } from '../hooks/useMarcoPermisosParametrizacion';
import { MarcoPermisosPageHeader } from '../components/MarcoPermisosPageHeader';
import { MarcoPermisosStatsCards } from '../components/MarcoPermisosStatsCards';
import { MarcoPermisosNotesCard } from '../components/MarcoPermisosNotesCard';
import { MarcoPermisosCatalogCard } from '../components/MarcoPermisosCatalogCard';

export default function MarcoPermisosAfiliadoPage(): React.ReactElement {
  const vm = useMarcoPermisosParametrizacion();

  if (vm.loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <MarcoPermisosPageHeader
        saving={vm.saving}
        syncing={vm.syncing}
        hasMarco={Boolean(vm.marcoActivo)}
        marcoActivo={vm.marcoActivo}
        vistasCount={vm.vistasSel.size}
        accionesCount={vm.accionesSel.size}
        onRecargar={() => void vm.cargar()}
        onSincronizar={() => void vm.sincronizar()}
        onGuardar={() => void vm.guardar()}
      />

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Regla de autorización</AlertTitle>
        <AlertDescription>
          Al guardar se crea una nueva versión (<strong>seq</strong>). El job aplica el marco a cada
          usuario CLIENTE global. El corporativo para logo/nombre se resuelve aparte y no forma parte
          del techo.
        </AlertDescription>
      </Alert>

      <MarcoPermisosStatsCards
        marcoActivo={vm.marcoActivo}
        vistasCount={vm.vistasSel.size}
        accionesCount={vm.accionesSel.size}
      />

      <MarcoPermisosNotesCard notas={vm.notas} onNotasChange={vm.setNotas} />

      <MarcoPermisosCatalogCard
        tab={vm.tab}
        onTabChange={vm.setTab}
        filtro={vm.filtro}
        onFiltroChange={vm.setFiltro}
        soloSugeridas={vm.soloSugeridas}
        onSoloSugeridasChange={vm.setSoloSugeridas}
        vistasSel={vm.vistasSel}
        accionesSel={vm.accionesSel}
        rutasFiltradas={vm.rutasFiltradas}
        accionesFiltradas={vm.accionesFiltradas}
        onToggleVista={vm.toggleVista}
        onToggleAccion={vm.toggleAccion}
        onSeleccionarVistasVisibles={vm.seleccionarTodasVistasVisibles}
        onLimpiarVistasVisibles={vm.limpiarVistasVisibles}
        onSeleccionarAccionesVisibles={vm.seleccionarTodasAccionesVisibles}
        onLimpiarAccionesVisibles={vm.limpiarAccionesVisibles}
      />
    </div>
  );
}
