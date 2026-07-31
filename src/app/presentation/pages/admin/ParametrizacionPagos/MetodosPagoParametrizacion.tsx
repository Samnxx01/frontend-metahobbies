import { useCallback, useEffect, useState } from 'react';
import { CreditCard, Eye, Landmark, Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import metodoPagoService, { type MetodoPagoCatalogo, type MetodoPagoPadre } from '@/app/services/metodoPagoService';
import { useBancosColombiaCatalogo } from '@/app/hooks/useBancosColombiaCatalogo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import MetodoPagoFormSubmodal from '../components/metodos-pago/MetodoPagoFormSubmodal';
import CatalogoMediosPagoDianModal from '../components/metodos-pago/CatalogoMediosPagoDianModal';
import { reglasContablesUi } from '../components/reglas-contables/reglasContablesUi';
import BancosCatalogoAdmin from '@/app/presentation/components/perfil/BancosCatalogoAdmin';
import { GovernedButton, PAYMENT_METHOD_ACTION_IDS } from '@/app/presentation/actions';
import {
  GobernanzaModuloSearchableSelect,
  type GobernanzaSearchableSelectOption,
} from '../gobernanza/GobernanzaModuloSearchableSelect';

const NOMBRE_MANUAL_VALUE = '__MANUAL__';

export type MetodosPagoParametrizacionProps = {
  embedded?: boolean;
  saving?: boolean;
  onMetodosActualizados?: () => void;
};

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : fallback;

export default function MetodosPagoParametrizacion({
  embedded = false,
  saving = false,
  onMetodosActualizados,
}: MetodosPagoParametrizacionProps): React.ReactElement {
  const [metodos, setMetodos] = useState<MetodoPagoCatalogo[]>([]);
  const [padres, setPadres] = useState<MetodoPagoPadre[]>([]);
  const [padreSeleccionado, setPadreSeleccionado] = useState<MetodoPagoPadre | null>(null);
  const [modalPadreOpen, setModalPadreOpen] = useState(false);
  const [guardandoPadre, setGuardandoPadre] = useState(false);
  const [padreDraft, setPadreDraft] = useState({
    codigo: '',
    nombreMetodoPago: '',
    descripcion: '',
    catalogoMetodoCodigo: '',
    pasarelaPago: '',
  });
  const [loading, setLoading] = useState(false);
  const [submodalOpen, setSubmodalOpen] = useState(false);
  const [registroEditar, setRegistroEditar] = useState<MetodoPagoCatalogo | null>(null);
  const [registroVer, setRegistroVer] = useState<MetodoPagoCatalogo | null>(null);
  const [listadoCatalogosOpen, setListadoCatalogosOpen] = useState(false);
  const [eliminandoCodigo, setEliminandoCodigo] = useState<string | null>(null);
  const [catalogoDianOpen, setCatalogoDianOpen] = useState(false);
  const [catalogoBancosOpen, setCatalogoBancosOpen] = useState(false);
  const [nombreSelectValue, setNombreSelectValue] = useState('');
  const { bancos: bancosCatalogo } = useBancosColombiaCatalogo();

  const bancosOptions: GobernanzaSearchableSelectOption[] = bancosCatalogo
    .filter((banco) => banco.estado)
    .map((banco) => ({
      value: banco.nombre,
      label: banco.nombreCorto || banco.nombre,
      searchText: `${banco.nombreCorto || ''} ${banco.nombre}`,
    }))
    .concat([{ value: NOMBRE_MANUAL_VALUE, label: 'Otro / escribir manualmente…', searchText: 'otro manual' }]);

  const cargar = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const dataPadres = await metodoPagoService.listarPadres();
      setPadres(dataPadres);
      const padreActual = dataPadres[0];
      setPadreSeleccionado(padreActual || null);
      setMetodos(await metodoPagoService.listarAdmin());
    } catch (error) {
      console.error('Error cargando métodos de pago:', error);
      toast.error(errorMessage(error, 'No se pudieron cargar los métodos de pago.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const seleccionarPadre = async (padre: MetodoPagoPadre): Promise<void> => {
    setPadreSeleccionado(padre);
  };

  const guardarPadre = async (): Promise<void> => {
    if (!padreDraft.nombreMetodoPago.trim()) {
      toast.error('El nombre del método de pago es obligatorio.');
      return;
    }
    if (!padreDraft.catalogoMetodoCodigo) {
      toast.error('Primero seleccione un registro del catálogo de métodos.');
      return;
    }
    if (!padreDraft.pasarelaPago.trim()) {
      toast.error('El alcance de la pasarela de pago es obligatorio.');
      return;
    }
    try {
      setGuardandoPadre(true);
      const { msg } = await metodoPagoService.crearPadre({
        codigo: padreDraft.codigo.trim() || undefined,
        nombreMetodoPago: padreDraft.nombreMetodoPago.trim(),
        descripcion: padreDraft.descripcion.trim(),
        catalogoMetodoCodigo: padreDraft.catalogoMetodoCodigo,
        pasarelaPago: padreDraft.pasarelaPago.trim(),
        estado: true,
      });
      toast.success(msg || 'Método de pago creado.');
      setModalPadreOpen(false);
      setPadreDraft({
        codigo: '',
        nombreMetodoPago: '',
        descripcion: '',
        catalogoMetodoCodigo: '',
        pasarelaPago: '',
      });
      setNombreSelectValue('');
      await cargar();
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo crear el método de pago.'));
    } finally {
      setGuardandoPadre(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const handleGuardada = (): void => {
    void cargar();
    onMetodosActualizados?.();
  };

  const eliminarMetodo = async (metodo: MetodoPagoCatalogo): Promise<void> => {
    if (metodo.esSistema) {
      toast.error(`El método "${metodo.codigo}" es del sistema. Desactívelo en lugar de eliminarlo.`);
      return;
    }
    if (!window.confirm(`¿Eliminar el método "${metodo.codigo}"?`)) return;

    try {
      setEliminandoCodigo(metodo.codigo);
      const { msg } = await metodoPagoService.eliminar(metodo.codigo);
      toast.success(msg || `Método "${metodo.codigo}" eliminado.`);
      handleGuardada();
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo eliminar el método de pago.'));
    } finally {
      setEliminandoCodigo(null);
    }
  };

  const barraSuperior = (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Cada método declara a qué medio de pago DIAN (Efectivo/Tarjeta) mapea al facturar electrónicamente.
      </p>
      <div className="flex flex-wrap gap-2">
        <GovernedButton
          actionId={PAYMENT_METHOD_ACTION_IDS.VIEW_COLOMBIA_BANKS}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCatalogoBancosOpen(true)}
          disabled={saving}
        >
          <Landmark className="mr-2 h-4 w-4" />
          Catálogo bancos Colombia
        </GovernedButton>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCatalogoDianOpen(true)}
          disabled={saving}
        >
          <Plus className="mr-2 h-4 w-4" />
          Catálogo DIAN
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => void cargar()} disabled={loading || saving}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Recargar
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setListadoCatalogosOpen(true)}
        >
          <Eye className="mr-2 h-4 w-4" />
          Visualizar catálogos
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            setRegistroEditar(null);
            setSubmodalOpen(true);
          }}
          disabled={saving}
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar catálogo
        </Button>
        <Button
          type="button"
          size="sm"
          className={reglasContablesUi.btnPrimary}
          onClick={() => {
            setModalPadreOpen(true);
          }}
          disabled={saving || metodos.length === 0}
          title={metodos.length === 0 ? 'Primero registre un método en el catálogo' : undefined}
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar método
        </Button>
      </div>
    </div>
  );

  const tabla = (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {padres.map((padre) => (
          <Button
            key={padre.iud || padre._id}
            type="button"
            size="sm"
            variant={(padre.iud || padre._id) === (padreSeleccionado?.iud || padreSeleccionado?._id) ? 'default' : 'outline'}
            onClick={() => void seleccionarPadre(padre)}
          >
            {padre.nombreMetodoPago}
          </Button>
        ))}
      </div>
      <div className={reglasContablesUi.tableWrap}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={reglasContablesUi.tableHead}>Código</TableHead>
            <TableHead className={reglasContablesUi.tableHead}>Nombre</TableHead>
            <TableHead className={reglasContablesUi.tableHead}>Medio DIAN</TableHead>
            <TableHead className={reglasContablesUi.tableHead}>Estado</TableHead>
            <TableHead className={`${reglasContablesUi.tableHead} text-right`}>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {metodos.map((metodo) => (
            <TableRow key={metodo.codigo} className={reglasContablesUi.tableRowHover}>
              <TableCell className="font-medium">
                <span className="flex flex-wrap items-center gap-1">
                  {metodo.codigo}
                  {metodo.esSistema ? (
                    <Badge variant="outline" className={reglasContablesUi.badgeSistema}>
                      Sistema
                    </Badge>
                  ) : null}
                </span>
              </TableCell>
              <TableCell>{metodo.nombre}</TableCell>
              <TableCell>
                <Badge variant="secondary">{metodo.medioPagoDian}</Badge>
              </TableCell>
              <TableCell>{metodo.estado ? 'Activo' : 'Inactivo'}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-secondary"
                    title="Ver detalle"
                    onClick={() => setRegistroVer(metodo)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary"
                    title="Editar"
                    disabled={saving || eliminandoCodigo === metodo.codigo}
                    onClick={() => {
                      setRegistroEditar(metodo);
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
                    title="Eliminar"
                    disabled={saving || eliminandoCodigo === metodo.codigo}
                    onClick={() => void eliminarMetodo(metodo)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!loading && metodos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                No hay registros en el catálogo. Use «Agregar catálogo» para crear el primero.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      </div>
    </div>
  );

  const modal = (
    <MetodoPagoFormSubmodal
      open={submodalOpen}
      onOpenChange={(next) => {
        setSubmodalOpen(next);
        if (!next) setRegistroEditar(null);
      }}
      saving={saving}
      registro={registroEditar}
      onGuardada={handleGuardada}
    />
  );

  const modalPadre = (
    <Dialog open={modalPadreOpen} onOpenChange={setModalPadreOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar método de pago</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Código</Label>
            <Input value={padreDraft.codigo} onChange={e => setPadreDraft(p => ({ ...p, codigo: e.target.value }))} placeholder="Ej: WOMPI" />
          </div>
          <div className="space-y-2">
            <Label>Nombre</Label>
            <GobernanzaModuloSearchableSelect
              value={nombreSelectValue}
              onValueChange={(value) => {
                setNombreSelectValue(value);
                if (value && value !== NOMBRE_MANUAL_VALUE) {
                  setPadreDraft(p => ({ ...p, nombreMetodoPago: value }));
                } else if (value === NOMBRE_MANUAL_VALUE) {
                  setPadreDraft(p => ({ ...p, nombreMetodoPago: '' }));
                }
              }}
              options={bancosOptions}
              placeholder="Seleccione una entidad del catálogo de bancos"
              searchPlaceholder="Buscar banco…"
            />
            {nombreSelectValue === NOMBRE_MANUAL_VALUE && (
              <Input
                className="mt-2"
                value={padreDraft.nombreMetodoPago}
                onChange={e => setPadreDraft(p => ({ ...p, nombreMetodoPago: e.target.value }))}
                placeholder="Ej: Wompi"
              />
            )}
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input value={padreDraft.descripcion} onChange={e => setPadreDraft(p => ({ ...p, descripcion: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Registro del catálogo</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={padreDraft.catalogoMetodoCodigo}
              onChange={e => setPadreDraft(p => ({ ...p, catalogoMetodoCodigo: e.target.value }))}
            >
              <option value="">Seleccione un método del catálogo</option>
              {metodos.filter(item => item.estado).map(item => (
                <option key={item.codigo} value={item.codigo}>
                  {item.codigo} — {item.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Alcance de la pasarela de pago</Label>
            <Input
              value={padreDraft.pasarelaPago}
              onChange={e => setPadreDraft(p => ({ ...p, pasarelaPago: e.target.value }))}
              placeholder="Ej: WOMPI"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setModalPadreOpen(false)}>Cancelar</Button>
          <Button onClick={() => void guardarPadre()} disabled={guardandoPadre}>
            {guardandoPadre && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar método
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const contenido = (
    <div className="space-y-4">
      {barraSuperior}
      {tabla}
      {modal}
      {modalPadre}
      <CatalogoMediosPagoDianModal
        open={catalogoDianOpen}
        onOpenChange={setCatalogoDianOpen}
      />
      <Dialog open={catalogoBancosOpen} onOpenChange={setCatalogoBancosOpen}>
        <DialogContent className="max-h-[90vh] w-[min(96vw,72rem)] max-w-none overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Catálogo de bancos de Colombia</DialogTitle>
          </DialogHeader>
          <BancosCatalogoAdmin />
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(registroVer)} onOpenChange={(open) => { if (!open) setRegistroVer(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle del método de pago</DialogTitle>
          </DialogHeader>
          {registroVer ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Código</span>
                <span className="flex items-center gap-1 font-medium">
                  {registroVer.codigo}
                  {registroVer.esSistema ? (
                    <Badge variant="outline" className={reglasContablesUi.badgeSistema}>
                      Sistema
                    </Badge>
                  ) : null}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Nombre</span>
                <span className="font-medium">{registroVer.nombre}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Descripción</span>
                <span className="text-right">{registroVer.descripcion || '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Medio de pago DIAN</span>
                <Badge variant="secondary">{registroVer.medioPagoDian}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Estado</span>
                <Badge variant={registroVer.estado ? 'secondary' : 'outline'}>
                  {registroVer.estado ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Orden</span>
                <span className="font-medium">{registroVer.orden}</span>
              </div>
              {registroVer.metodoPagoId && typeof registroVer.metodoPagoId === 'object' ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Método padre</span>
                  <span className="font-medium">
                    {registroVer.metodoPagoId.nombreMetodoPago || registroVer.metodoPagoId.codigo || '—'}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegistroVer(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={listadoCatalogosOpen} onOpenChange={setListadoCatalogosOpen}>
        <DialogContent className="max-h-[85vh] sm:max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Catálogo de métodos de pago</DialogTitle>
          </DialogHeader>
          <div className={reglasContablesUi.tableWrap}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={reglasContablesUi.tableHead}>Código</TableHead>
                  <TableHead className={reglasContablesUi.tableHead}>Nombre</TableHead>
                  <TableHead className={reglasContablesUi.tableHead}>Medio DIAN</TableHead>
                  <TableHead className={reglasContablesUi.tableHead}>Estado</TableHead>
                  <TableHead className={`${reglasContablesUi.tableHead} text-right`}>Ver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metodos.map((metodo) => (
                  <TableRow key={metodo.codigo} className={reglasContablesUi.tableRowHover}>
                    <TableCell className="font-medium">{metodo.codigo}</TableCell>
                    <TableCell>{metodo.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{metodo.medioPagoDian}</Badge>
                    </TableCell>
                    <TableCell>{metodo.estado ? 'Activo' : 'Inactivo'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-secondary"
                        title="Ver detalle"
                        onClick={() => setRegistroVer(metodo)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {metodos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No hay registros en la colección metodopagocatalogos todavía. Use «Agregar catálogo» para crear el primero.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setListadoCatalogosOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (embedded) {
    return contenido;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <CreditCard className="h-5 w-5" />
          Métodos de pago
        </CardTitle>
        <CardDescription>
          Parametrice los métodos de pago disponibles y su mapeo al medio de pago DIAN para la facturación electrónica.
        </CardDescription>
      </CardHeader>
      <CardContent>{contenido}</CardContent>
    </Card>
  );
}
