import { useCallback, useEffect, useState } from 'react';

import { Calculator, Layers, Loader2, Percent, Pencil, Plus, RefreshCw, Tag, Trash2 } from 'lucide-react';

import { useAmbitosReglaContable } from '@/app/hooks/useAmbitosReglaContable';

import { useTiposReglaContable } from '@/app/hooks/useTiposReglaContable';

import { toast } from 'react-toastify';

import reglasContablesService, { type ReglaContable } from '@/app/services/reglasContablesService';

import { Badge } from '@/components/ui/badge';

import { Button } from '@/components/ui/button';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import AmbitoReglaContableModal from '../components/reglas-contables/AmbitoReglaContableModal';

import TipoReglaContableModal from '../components/reglas-contables/TipoReglaContableModal';

import TarifaReglaContableModal from '../components/reglas-contables/TarifaReglaContableModal';

import ReglaContableFormSubmodal from '../components/reglas-contables/ReglaContableFormSubmodal';

import { labelBaseCalculo } from '../components/reglas-contables/reglasContablesConstants';

import { reglasContablesUi } from '../components/reglas-contables/reglasContablesUi';



export type ReglasContablesParametrizacionProps = {

  embedded?: boolean;

  saving?: boolean;

  onReglasActualizadas?: () => void;

};



const errorMessage = (error: unknown, fallback: string): string =>

  error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : fallback;



export default function ReglasContablesParametrizacion({

  embedded = false,

  saving = false,

  onReglasActualizadas,

}: ReglasContablesParametrizacionProps): React.ReactElement {

  const [reglas, setReglas] = useState<ReglaContable[]>([]);

  const [loading, setLoading] = useState(false);

  const [submodalOpen, setSubmodalOpen] = useState(false);

  const [registroEditar, setRegistroEditar] = useState<ReglaContable | null>(null);

  const [eliminandoCodigo, setEliminandoCodigo] = useState<string | null>(null);



  const [tipoModalOpen, setTipoModalOpen] = useState(false);

  const [ambitoModalOpen, setAmbitoModalOpen] = useState(false);

  const [tarifaModalOpen, setTarifaModalOpen] = useState(false);

  const [tiposRefreshKey, setTiposRefreshKey] = useState(0);

  const [ambitosRefreshKey, setAmbitosRefreshKey] = useState(0);

  const [tarifasRefreshKey, setTarifasRefreshKey] = useState(0);



  const { labelPorCodigo: labelAmbito } = useAmbitosReglaContable({ refreshKey: ambitosRefreshKey });

  const { labelPorCodigo: labelTipo } = useTiposReglaContable({ refreshKey: tiposRefreshKey });



  const cargar = useCallback(async (): Promise<void> => {

    try {

      setLoading(true);

      const data = await reglasContablesService.listarAdmin();

      setReglas(data);

    } catch (error) {

      console.error('Error cargando reglas contables:', error);

      toast.error(errorMessage(error, 'No se pudieron cargar las reglas contables.'));

    } finally {

      setLoading(false);

    }

  }, []);



  useEffect(() => {

    void cargar();

  }, [cargar]);



  const handleGuardada = (): void => {

    void cargar();

    onReglasActualizadas?.();

  };



  const eliminarRegla = async (regla: ReglaContable): Promise<void> => {

    const confirmar = window.confirm(

      regla.esSistema

        ? `La regla "${regla.codigo}" es del sistema. ¿Desactivarla?`

        : `¿Eliminar la regla "${regla.codigo}"?`

    );

    if (!confirmar) return;



    if (regla.esSistema) {

      try {

        setEliminandoCodigo(regla.codigo);

        await reglasContablesService.actualizar(regla.codigo, { estado: false });

        toast.success(`Regla "${regla.codigo}" desactivada.`);

        handleGuardada();

      } catch (error) {

        toast.error(errorMessage(error, 'No se pudo desactivar la regla.'));

      } finally {

        setEliminandoCodigo(null);

      }

      return;

    }



    try {

      setEliminandoCodigo(regla.codigo);

      const { msg } = await reglasContablesService.eliminar(regla.codigo);

      toast.success(msg || `Regla "${regla.codigo}" eliminada.`);

      handleGuardada();

    } catch (error) {

      toast.error(errorMessage(error, 'No se pudo eliminar la regla.'));

    } finally {

      setEliminandoCodigo(null);

    }

  };



  const barraSuperior = (

    <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">

      <div className="flex flex-wrap gap-2">

        <Button type="button" variant="outline" size="sm" onClick={() => setTipoModalOpen(true)} disabled={saving}>

          <Tag className="mr-2 h-4 w-4" />

          Parametrizar tipos

        </Button>

        <Button type="button" variant="outline" size="sm" onClick={() => setAmbitoModalOpen(true)} disabled={saving}>

          <Layers className="mr-2 h-4 w-4" />

          Parametrizar ámbitos

        </Button>

        <Button type="button" variant="outline" size="sm" onClick={() => setTarifaModalOpen(true)} disabled={saving}>

          <Percent className="mr-2 h-4 w-4" />

          Parametrizar tarifas

        </Button>

      </div>

      <div className="flex flex-wrap gap-2">

        <Button type="button" variant="outline" size="sm" onClick={() => void cargar()} disabled={loading || saving}>

          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}

          Recargar

        </Button>

        <Button

          type="button"

          size="sm"

          className={reglasContablesUi.btnPrimary}

          onClick={() => {

            setRegistroEditar(null);

            setSubmodalOpen(true);

          }}

          disabled={saving}

        >

          <Plus className="mr-2 h-4 w-4" />

          Agregar regla

        </Button>

      </div>

    </div>

  );



  const tabla = (

    <div className={reglasContablesUi.tableWrap}>

      <Table>

        <TableHeader>

          <TableRow>

            <TableHead className={reglasContablesUi.tableHead}>Código</TableHead>

            <TableHead className={reglasContablesUi.tableHead}>Nombre</TableHead>

            <TableHead className={reglasContablesUi.tableHead}>Tipo</TableHead>

            <TableHead className={`${reglasContablesUi.tableHead} text-right`}>Tarifa %</TableHead>

            <TableHead className={reglasContablesUi.tableHead}>Base</TableHead>

            <TableHead className={reglasContablesUi.tableHead}>Ámbito</TableHead>

            <TableHead className={reglasContablesUi.tableHead}>Aplicacion</TableHead>

            <TableHead className={reglasContablesUi.tableHead}>Estado</TableHead>

            <TableHead className={`${reglasContablesUi.tableHead} text-right`}>Acciones</TableHead>

          </TableRow>

        </TableHeader>

        <TableBody>

          {reglas.map((regla) => (

            <TableRow key={regla.codigo} className={reglasContablesUi.tableRowHover}>

              <TableCell className="font-medium">

                <span className="flex flex-wrap items-center gap-1">

                  {regla.codigo}

                  {regla.esSistema ? (

                    <Badge variant="outline" className={reglasContablesUi.badgeSistema}>

                      Sistema

                    </Badge>

                  ) : null}

                </span>

              </TableCell>

              <TableCell>{regla.nombre}</TableCell>

              <TableCell>{labelTipo(regla.tipo)}</TableCell>

              <TableCell className="text-right">{Number(regla.tarifa || 0).toFixed(2)}</TableCell>

              <TableCell className="text-xs">{labelBaseCalculo(regla.baseCalculo)}</TableCell>

              <TableCell>{labelAmbito(regla.aplicaEn)}</TableCell>

              <TableCell>{regla.aplicaEnCarrito ? 'Masiva en productos' : 'Individual'}</TableCell>

              <TableCell>{regla.estado ? 'Activa' : 'Inactiva'}</TableCell>

              <TableCell className="text-right">

                <div className="flex justify-end gap-1">

                  <Button

                    type="button"

                    variant="ghost"

                    size="icon"

                    className="h-8 w-8 text-primary"

                    title="Editar"

                    disabled={saving || eliminandoCodigo === regla.codigo}

                    onClick={() => {

                      setRegistroEditar(regla);

                      setSubmodalOpen(true);

                    }}

                  >

                    <Pencil className="h-4 w-4" />

                  </Button>

                  <Button

                    type="button"

                    variant="ghost"

                    size="icon"

                    className="h-8 w-8 text-destructive"

                    title={regla.esSistema ? 'Desactivar' : 'Eliminar'}

                    disabled={saving || eliminandoCodigo === regla.codigo}

                    onClick={() => void eliminarRegla(regla)}

                  >

                    <Trash2 className="h-4 w-4" />

                  </Button>

                </div>

              </TableCell>

            </TableRow>

          ))}

          {!loading && reglas.length === 0 ? (

            <TableRow>

              <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">

                No hay reglas parametrizadas. Use «Agregar regla» o recargue para sembrar las predeterminadas.

              </TableCell>

            </TableRow>

          ) : null}

        </TableBody>

      </Table>

    </div>

  );



  const modales = (

    <>

      <ReglaContableFormSubmodal

        open={submodalOpen}

        onOpenChange={(next) => {

          setSubmodalOpen(next);

          if (!next) setRegistroEditar(null);

        }}

        saving={saving}

        registro={registroEditar}

        onGuardada={handleGuardada}

        tiposRefreshKey={tiposRefreshKey}

        ambitosRefreshKey={ambitosRefreshKey}

        tarifasRefreshKey={tarifasRefreshKey}

        onAbrirParametrizacionTipos={() => setTipoModalOpen(true)}

        onAbrirParametrizacionAmbitos={() => setAmbitoModalOpen(true)}

        onAbrirParametrizacionTarifas={() => setTarifaModalOpen(true)}

      />

      <TipoReglaContableModal

        open={tipoModalOpen}

        onOpenChange={setTipoModalOpen}

        saving={saving}

        onTiposActualizados={() => {

          setTiposRefreshKey((k) => k + 1);

          setTarifasRefreshKey((k) => k + 1);

          toast.success('Catálogo de tipos actualizado.');

        }}

      />

      <AmbitoReglaContableModal

        open={ambitoModalOpen}

        onOpenChange={setAmbitoModalOpen}

        saving={saving}

        onAmbitosActualizados={() => {

          setAmbitosRefreshKey((k) => k + 1);

          toast.success('Catálogo de ámbitos actualizado.');

        }}

      />

      <TarifaReglaContableModal

        open={tarifaModalOpen}

        onOpenChange={setTarifaModalOpen}

        saving={saving}

        tiposRefreshKey={tiposRefreshKey}

        onTarifasActualizadas={() => {

          setTarifasRefreshKey((k) => k + 1);

          toast.success('Catálogo de tarifas actualizado.');

        }}

      />

    </>

  );



  const contenido = (

    <div className="space-y-4">

      {barraSuperior}

      {tabla}

      {modales}

    </div>

  );



  if (embedded) {

    return contenido;

  }



  return (

    <Card className="border-primary/20">

      <CardHeader>

        <CardTitle className="flex items-center gap-2 text-primary">

          <Calculator className="h-5 w-5" />

          Reglas contables y comerciales

        </CardTitle>

        <CardDescription>

          Parametrice tipos, ámbitos, tarifas y reglas que alimentan el cálculo de costos, impuestos y precios de venta.

        </CardDescription>

      </CardHeader>

      <CardContent>{contenido}</CardContent>

    </Card>

  );

}


