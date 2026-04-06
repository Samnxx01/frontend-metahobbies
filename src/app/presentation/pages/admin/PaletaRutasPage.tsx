import React, { useCallback, useEffect, useState } from 'react';
import {
  listarPaletas,
  listarRutasConPaleta,
  listarRutasSinPaleta,
  crearPaleta,
  actualizarPaleta,
  eliminarPaleta,
  obtenerPorId,
  type PaletaRuta,
  type RutaInfo,
} from '@/app/services/paletaRutaService';
import type { FormPayload } from '@/app/presentation/components/admin/paleta-rutas/PaletaRutaForm';
import PaletaRutaForm from '@/app/presentation/components/admin/paleta-rutas/PaletaRutaForm';
import CrearPaletaModal from '@/app/presentation/components/admin/paleta-rutas/CrearPaletaModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Palette, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';

// ─── Sub-componente: tarjeta de paleta ────────────────────────────────────────

interface PaletaCardProps {
  paleta: PaletaRuta;
  onEditar: (paleta: PaletaRuta) => void;
  onEliminar: (id: string, nombre: string) => void;
}

function PaletaCard({ paleta, onEditar, onEliminar }: PaletaCardProps) {
  const ruta = paleta.rutaId;

  return (
    <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Muestra de color primario */}
            <span
              className="inline-block w-4 h-4 rounded-sm flex-shrink-0 border border-black/10"
              style={{ backgroundColor: paleta.colores.colorPrimario }}
              title={paleta.colores.colorPrimario}
            />
            <CardTitle className="text-sm font-semibold truncate">
              {paleta.nombre}
            </CardTitle>
          </div>
          <Badge
            variant={paleta.activa ? 'default' : 'secondary'}
            className="flex-shrink-0 text-xs"
          >
            {paleta.activa ? 'Activa' : 'Inactiva'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Info de la ruta */}
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p className="font-medium text-foreground">{ruta?.name ?? '—'}</p>
          <p className="font-mono">{ruta?.path ?? '—'}</p>
        </div>

        {/* Muestra de colores */}
        <div className="flex gap-1 flex-wrap">
          {[
            paleta.colores.colorNavbar,
            paleta.colores.colorPrimario,
            paleta.colores.colorSecundario,
            paleta.colores.colorFondo,
            paleta.colores.colorBotonPrimario,
          ].map((c, i) => (
            <span
              key={i}
              title={c}
              style={{ backgroundColor: c }}
              className="inline-block w-5 h-5 rounded-sm border border-black/10"
            />
          ))}
        </div>

        {/* Acciones */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEditar(paleta)}
            className="flex-1 h-8 text-xs"
          >
            <Pencil className="h-3 w-3 mr-1" />
            Editar
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onEliminar(paleta.iud, paleta.nombre)}
            className="h-8 px-3"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Sub-componente: lista de rutas sin paleta ────────────────────────────────

interface RutaSinPaletaCardProps {
  ruta: RutaInfo;
  onCrear: (ruta: RutaInfo) => void;
}

function RutaSinPaletaCard({ ruta, onCrear }: RutaSinPaletaCardProps) {
  return (
    <Card className="border border-dashed border-border/60">
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{ruta.name}</p>
          <p className="text-xs text-muted-foreground font-mono truncate">
            {ruta.path}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onCrear(ruta)}
          className="flex-shrink-0 h-8 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Crear paleta
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PaletaRutasPage() {
  const [paletas, setPaletas] = useState<PaletaRuta[]>([]);
  const [rutasSin, setRutasSin] = useState<RutaInfo[]>([]);
  const [rutasCon, setRutasCon] = useState<RutaInfo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalCrear, setModalCrear] = useState<{
    abierto: boolean;
    rutaPreseleccionada?: RutaInfo;
  }>({ abierto: false });

  const [modalEditar, setModalEditar] = useState<{
    abierto: boolean;
    paleta?: PaletaRuta;
  }>({ abierto: false });

  const [guardando, setGuardando] = useState(false);

  const [confirmarEliminar, setConfirmarEliminar] = useState<{
    abierto: boolean;
    id: string;
    nombre: string;
  }>({ abierto: false, id: '', nombre: '' });

  // ─── Carga inicial ───────────────────────────────────────────────────────────

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [resPaletas, resSin, resCon] = await Promise.all([
        listarPaletas(1, 50),
        listarRutasSinPaleta(),
        listarRutasConPaleta(),
      ]);
      setPaletas(resPaletas.paletas ?? []);
      setRutasSin(resSin.rutas ?? []);
      setRutasCon(resCon.rutas ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar datos';
      setError(msg);
      toast.error(msg);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ─── Abrir / cerrar modales ──────────────────────────────────────────────────

  const abrirCrear = (ruta?: RutaInfo) => {
    setModalCrear({ abierto: true, rutaPreseleccionada: ruta });
  };

  const cerrarCrear = () => {
    setModalCrear({ abierto: false });
  };

  const abrirEditar = async (paleta: PaletaRuta) => {
    try {
      const res = await obtenerPorId(paleta.iud);
      setModalEditar({ abierto: true, paleta: res.paleta });
    } catch {
      setModalEditar({ abierto: true, paleta });
    }
  };

  const cerrarEditar = () => {
    setModalEditar({ abierto: false, paleta: undefined });
  };

  // ─── Guardar ─────────────────────────────────────────────────────────────────

  const handleCrear = async (data: { nombre: string; rutaId: string }) => {
    setGuardando(true);
    try {
      await crearPaleta(data);
      toast.success('Paleta creada correctamente');
      cerrarCrear();
      await cargarDatos();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear la paleta';
      toast.error(msg);
    } finally {
      setGuardando(false);
    }
  };

  const handleEditar = async (data: FormPayload) => {
    if (!modalEditar.paleta) return;
    setGuardando(true);
    try {
      await actualizarPaleta(modalEditar.paleta.iud, data);
      toast.success('Paleta actualizada correctamente');
      cerrarEditar();
      await cargarDatos();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar la paleta';
      toast.error(msg);
    } finally {
      setGuardando(false);
    }
  };

  // ─── Eliminar paleta ─────────────────────────────────────────────────────────

  const pedirConfirmacion = (id: string, nombre: string) => {
    setConfirmarEliminar({ abierto: true, id, nombre });
  };

  const handleEliminar = async () => {
    try {
      await eliminarPaleta(confirmarEliminar.id);
      toast.success('Paleta eliminada');
      setConfirmarEliminar({ abierto: false, id: '', nombre: '' });
      await cargarDatos();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar';
      toast.error(msg);
    }
  };

  // ─── Rutas disponibles para el form de edición ──────────────────────────────

  const todasLasRutas: RutaInfo[] = [
    ...rutasSin,
    ...rutasCon,
    ...(modalEditar.paleta?.rutaId && typeof modalEditar.paleta.rutaId === 'object'
      ? [modalEditar.paleta.rutaId as RutaInfo]
      : []),
  ].filter(
    (ruta, idx, arr) => arr.findIndex((r) => r._id === ruta._id) === idx
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (cargando) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
          <p className="font-semibold">Error al cargar paletas</p>
          <p className="text-sm">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={cargarDatos}
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Palette className="h-6 w-6 text-primary" />
              Parametrización de Paletas por Ruta
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configura colores, imágenes de fondo y estilos de botones por
              cada vista de la aplicación.
            </p>
          </div>
          <Button onClick={() => abrirCrear()} className="flex-shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Nueva paleta
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="con-paleta">
          <TabsList>
            <TabsTrigger value="con-paleta">
              Rutas con paleta
              <Badge variant="secondary" className="ml-2 text-xs">
                {paletas.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="sin-paleta">
              Rutas sin paleta
              <Badge variant="secondary" className="ml-2 text-xs">
                {rutasSin.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* ── Rutas CON paleta ─────────────────────────────────────── */}
          <TabsContent value="con-paleta" className="pt-4">
            {paletas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Palette className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No hay paletas configuradas aún.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => abrirCrear()}
                >
                  Crear primera paleta
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paletas.map((p) => (
                  <PaletaCard
                    key={p.iud}
                    paleta={p}
                    onEditar={abrirEditar}
                    onEliminar={pedirConfirmacion}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Rutas SIN paleta ─────────────────────────────────────── */}
          <TabsContent value="sin-paleta" className="pt-4">
            {rutasSin.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Todas las rutas ya tienen paleta configurada.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rutasSin.map((ruta) => (
                  <RutaSinPaletaCard
                    key={ruta._id}
                    ruta={ruta}
                    onCrear={abrirCrear}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dialog 1: Crear (simple) ──────────────────────────────────────── */}
      <Dialog open={modalCrear.abierto} onOpenChange={(open) => !open && cerrarCrear()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva paleta de colores</DialogTitle>
          </DialogHeader>
          <CrearPaletaModal
            rutasDisponibles={todasLasRutas}
            rutaPreseleccionada={modalCrear.rutaPreseleccionada}
            onGuardar={handleCrear}
            onCancelar={cerrarCrear}
            cargando={guardando}
          />
        </DialogContent>
      </Dialog>

      {/* ── Dialog 2: Editar (completo) ───────────────────────────────────── */}
      <Dialog open={modalEditar.abierto} onOpenChange={(open) => !open && cerrarEditar()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar paleta</DialogTitle>
          </DialogHeader>
          <PaletaRutaForm
            paletaInicial={modalEditar.paleta}
            rutasDisponibles={todasLasRutas}
            onGuardar={handleEditar}
            onCancelar={cerrarEditar}
            cargando={guardando}
          />
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog: Confirmar eliminación ───────────────────────────── */}
      <AlertDialog
        open={confirmarEliminar.abierto}
        onOpenChange={(open) =>
          !open && setConfirmarEliminar({ abierto: false, id: '', nombre: '' })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar paleta</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar la paleta{' '}
              <strong>{confirmarEliminar.nombre}</strong>? Esta acción no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminar}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
