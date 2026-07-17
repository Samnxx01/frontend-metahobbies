import { useCallback, useEffect, useState } from 'react';

import { ArrowRight, Calculator, FileDigit, Layers, Loader2, Percent, Pencil, Plus, Power, PowerOff, RefreshCw, Save, Settings2, Tag, Trash2 } from 'lucide-react';

import { useAmbitosReglaContable } from '@/app/hooks/useAmbitosReglaContable';

import { useTiposReglaContable } from '@/app/hooks/useTiposReglaContable';

import { toast } from 'react-toastify';

import reglasContablesService, { type CatalogoCodigo, type ReglaContable } from '@/app/services/reglasContablesService';

import inventarioService, { type InventarioProveedor } from '@/app/services/inventarioService';

import { Badge } from '@/components/ui/badge';

import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Checkbox } from '@/components/ui/checkbox';

import { Label } from '@/components/ui/label';


import AmbitoReglaContableModal from '../components/reglas-contables/AmbitoReglaContableModal';


import TipoReglaContableModal from '../components/reglas-contables/TipoReglaContableModal';

import TarifaReglaContableModal from '../components/reglas-contables/TarifaReglaContableModal';
import CatalogoCodigosDianModal from '../components/reglas-contables/CatalogoCodigosDianModal';
import AlcanceReglasOcModal from '../components/reglas-contables/AlcanceReglasOcModal';

import ReglaContableFormSubmodal from '../components/reglas-contables/ReglaContableFormSubmodal';

import { labelBaseCalculo } from '../components/reglas-contables/reglasContablesConstants';

import { reglasContablesUi } from '../components/reglas-contables/reglasContablesUi';



export type ReglasContablesParametrizacionProps = {

  embedded?: boolean;

  saving?: boolean;

  onReglasActualizadas?: () => void;

  /** Vista resumida (usada en el modal de acceso rápido): oculta los botones de parametrización granular y "Agregar regla". */
  modoResumen?: boolean;

  /** Botón "Ir a parametrización completa", visible solo junto con `modoResumen`. */
  onIrACompleta?: () => void;

};



const errorMessage = (error: unknown, fallback: string): string =>

  error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : fallback;



export default function ReglasContablesParametrizacion({

  embedded = false,

  saving = false,

  onReglasActualizadas,

  modoResumen = false,

  onIrACompleta,

}: ReglasContablesParametrizacionProps): React.ReactElement {

  const [reglas, setReglas] = useState<ReglaContable[]>([]);

  const [loading, setLoading] = useState(false);

  const [submodalOpen, setSubmodalOpen] = useState(false);

  const [registroEditar, setRegistroEditar] = useState<ReglaContable | null>(null);

  const [eliminandoCodigo, setEliminandoCodigo] = useState<string | null>(null);



  const [tipoModalOpen, setTipoModalOpen] = useState(false);

  const [ambitoModalOpen, setAmbitoModalOpen] = useState(false);

  const [tarifaModalOpen, setTarifaModalOpen] = useState(false);
  const [codigosDianModalOpen, setCodigosDianModalOpen] = useState(false);

  const [tiposRefreshKey, setTiposRefreshKey] = useState(0);

  const [ambitosRefreshKey, setAmbitosRefreshKey] = useState(0);

  const [tarifasRefreshKey, setTarifasRefreshKey] = useState(0);



  const { labelPorCodigo: labelAmbito } = useAmbitosReglaContable({ refreshKey: ambitosRefreshKey });

  const { labelPorCodigo: labelTipo } = useTiposReglaContable({ refreshKey: tiposRefreshKey });

  const [filtroTipo, setFiltroTipo] = useState('');

  const reglasFiltradas = filtroTipo ? reglas.filter((r) => r.tipo === filtroTipo) : reglas;

  /** Solo tipos que efectivamente tienen alguna regla creada (no el catálogo completo). */
  const tiposEnUso = Array.from(new Set(reglas.map((r) => r.tipo))).sort((a, b) =>
    labelTipo(a).localeCompare(labelTipo(b))
  );

  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());

  const [bulkSaving, setBulkSaving] = useState(false);

  const toggleSeleccionada = (codigo: string, checked: boolean): void => {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (checked) next.add(codigo);
      else next.delete(codigo);
      return next;
    });
  };

  const todasVisiblesSeleccionadas = reglasFiltradas.length > 0
    && reglasFiltradas.every((r) => seleccionadas.has(r.codigo));

  const toggleTodasVisibles = (checked: boolean): void => {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      for (const r of reglasFiltradas) {
        if (checked) next.add(r.codigo);
        else next.delete(r.codigo);
      }
      return next;
    });
  };

  const aplicarEstadoMasivo = async (estado: boolean): Promise<void> => {
    if (seleccionadas.size === 0) return;
    try {
      setBulkSaving(true);
      await Promise.all(
        Array.from(seleccionadas).map((codigo) => reglasContablesService.actualizar(codigo, { estado }))
      );
      toast.success(
        estado
          ? `${seleccionadas.size} regla(s) activada(s).`
          : `${seleccionadas.size} regla(s) desactivada(s).`
      );
      setSeleccionadas(new Set());
      await cargar();
      onReglasActualizadas?.();
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo actualizar el estado de las reglas seleccionadas.'));
    } finally {
      setBulkSaving(false);
    }
  };

  const codigoUnicoSeleccionado = seleccionadas.size === 1 ? Array.from(seleccionadas)[0] : null;
  const reglaUnicaSeleccionada = codigoUnicoSeleccionado
    ? reglas.find((r) => r.codigo === codigoUnicoSeleccionado) ?? null
    : null;

  const [proveedoresCatalogo, setProveedoresCatalogo] = useState<InventarioProveedor[]>([]);
  const [responsabilidadesCatalogo, setResponsabilidadesCatalogo] = useState<CatalogoCodigo[]>([]);
  const [panelProveedoresSel, setPanelProveedoresSel] = useState<string[]>([]);
  const [panelResponsabilidadesSel, setPanelResponsabilidadesSel] = useState<string[]>([]);
  const [proveedorParaAgregar, setProveedorParaAgregar] = useState('');
  const [panelSaving, setPanelSaving] = useState(false);
  // Ámbitos de OC configurados (compras.ambitosReglaImpuesto). Lista vacía = dinámico (todas las reglas).
  const [ambitosOc, setAmbitosOc] = useState<string[]>([]);
  const [ambitosOcModalOpen, setAmbitosOcModalOpen] = useState(false);

  useEffect(() => {
    inventarioService.obtenerConfig()
      .then((cfg) => setAmbitosOc(
        Array.isArray(cfg?.compras?.ambitosReglaImpuesto) ? cfg.compras.ambitosReglaImpuesto : []
      ))
      .catch(() => setAmbitosOc([]));
  }, []);

  /** El panel de productos solo aplica a reglas del alcance de compras (la asociación alimenta la OC). */
  const reglaEsDeCompra = (regla: ReglaContable | null): boolean => {
    if (!regla) return false;
    if (ambitosOc.length === 0) return true; // dinámico: sin restricción configurada
    return ambitosOc.includes(String(regla.aplicaEn || '').trim().toUpperCase());
  };
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState('');
  const [creandoCategoria] = useState(false);

  /** Crea una categoría desde la matriz (alcance sin salir de la parametrización) y la deja marcada. */
  const crearCategoriaInline = async (): Promise<void> => {
    const nombre = nuevaCategoriaNombre.trim();
    if (!nombre) {
      toast.error('El nombre de la categoría es obligatorio.');
      return;
    }
    try {
      const creada = { _id: '' };
      toast.success(`Categoría "${nombre}" creada.`);
      const data: InventarioProveedor[] = [];
      setProveedoresCatalogo(data);
      const idCreada = panelBackendId(creada);
      if (idCreada) setPanelProveedoresSel((prev) => [...new Set([...prev, idCreada])]);
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo crear la categoría.'));
    } finally {}
  };

  useEffect(() => {
    if (!reglaUnicaSeleccionada) return;
    Promise.all([
      inventarioService.listarProveedoresCompra(),
      reglasContablesService.listarCatalogoCodigos('DIAN_RESPONSABILIDADES'),
      reglasContablesService.listarAplicacionesRegla(reglaUnicaSeleccionada.codigo),
    ])
      .then(([proveedores, responsabilidades, aplicaciones]) => {
        setProveedoresCatalogo(proveedores);
        setResponsabilidadesCatalogo(responsabilidades);
        setPanelProveedoresSel(aplicaciones.proveedoresAplicacion);
        setPanelResponsabilidadesSel(aplicaciones.responsabilidadesRequeridas);
      })
      .catch(() => {
        setProveedoresCatalogo([]);
        setResponsabilidadesCatalogo([]);
        setPanelProveedoresSel([]);
        setPanelResponsabilidadesSel([]);
      });
  }, [reglaUnicaSeleccionada?.codigo]);

  const panelBackendId = (row: { _id?: string; iud?: string } | string): string =>
    typeof row === 'string' ? row : String(row?.iud || row?._id || '');

  const panelCategoriaLabel = (proveedor: InventarioProveedor): string =>
    `${proveedor.nombre} · NIT ${proveedor.nit}`;

  const togglePanelCategoria = (id: string, checked: boolean): void => {
    setPanelProveedoresSel((prev) => {
      const set = new Set(prev);
      if (checked) set.add(id);
      else set.delete(id);
      return Array.from(set);
    });
  };

  const guardarParametrizacionProductos = async (): Promise<void> => {
    if (!reglaUnicaSeleccionada) return;
    try {
      setPanelSaving(true);
      await reglasContablesService.reemplazarAplicacionesRegla(reglaUnicaSeleccionada.codigo, {
        proveedoresAplicacion: panelProveedoresSel,
        responsabilidadesRequeridas: panelResponsabilidadesSel,
      });
      toast.success(`Parametrización de productos guardada para "${reglaUnicaSeleccionada.codigo}".`);
      await cargar();
      onReglasActualizadas?.();
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo guardar la parametrización de productos.'));
    } finally {
      setPanelSaving(false);
    }
  };



  const cargar = useCallback(async (): Promise<void> => {

    try {

      setLoading(true);

      const data = await reglasContablesService.listarAdmin(modoResumen ? { alcance: 'OC' } : {});

      setReglas(data);

    } catch (error) {

      console.error('Error cargando reglas contables:', error);

      toast.error(errorMessage(error, 'No se pudieron cargar las reglas contables.'));

    } finally {

      setLoading(false);

    }

  }, [modoResumen]);



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

        {!modoResumen ? (
          <>
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

            <Button type="button" variant="outline" size="sm" onClick={() => setCodigosDianModalOpen(true)} disabled={saving}>

              <FileDigit className="mr-2 h-4 w-4" />

              Códigos DIAN

            </Button>

            <Button type="button" variant="outline" size="sm" onClick={() => setAmbitosOcModalOpen(true)} disabled={saving}>

              <Settings2 className="mr-2 h-4 w-4" />

              Alcance reglas OC

            </Button>
          </>
        ) : (
          <>
            <Select value={filtroTipo || 'TODOS'} onValueChange={(v) => setFiltroTipo(v === 'TODOS' ? '' : v)}>
              <SelectTrigger className="h-8 w-[220px] text-sm">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los tipos</SelectItem>
                {tiposEnUso.map((codigo) => (
                  <SelectItem key={codigo} value={codigo}>{labelTipo(codigo)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" onClick={() => setAmbitosOcModalOpen(true)} disabled={saving}>
              <Settings2 className="mr-2 h-4 w-4" />
              Alcance OC
            </Button>
          </>
        )}

      </div>

      <div className="flex flex-wrap gap-2">

        <Button type="button" variant="outline" size="sm" onClick={() => void cargar()} disabled={loading || saving}>

          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}

          Recargar

        </Button>

        {modoResumen ? (
          onIrACompleta ? (
            <Button type="button" size="sm" className={reglasContablesUi.btnPrimary} onClick={onIrACompleta} disabled={saving}>
              Parametrización completa
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : null
        ) : (
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
        )}

      </div>

    </div>

  );



  const barraSeleccion = seleccionadas.size > 0 ? (
    <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">{seleccionadas.size} seleccionada(s)</span>
        <Button type="button" variant="outline" size="sm" disabled={bulkSaving} onClick={() => void aplicarEstadoMasivo(true)}>
          <Power className="mr-2 h-4 w-4" />
          Activar
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={bulkSaving} onClick={() => void aplicarEstadoMasivo(false)}>
          <PowerOff className="mr-2 h-4 w-4" />
          Desactivar
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={bulkSaving} onClick={() => setSeleccionadas(new Set())}>
          Limpiar selección
        </Button>
      </div>

      {reglaUnicaSeleccionada && reglaEsDeCompra(reglaUnicaSeleccionada) ? (
        <div className="space-y-3 rounded-md border border-border bg-background p-3">
          <div>
            <Label>Proveedores y responsabilidades de "{reglaUnicaSeleccionada.codigo}"</Label>
            <p className={reglasContablesUi.description}>
              Selecciona proveedores existentes y las responsabilidades DIAN que deben cumplir. Esta
              asociaci&oacute;n se eval&uacute;a al seleccionar el proveedor en la orden de compra.
            </p>
            <p className="hidden">
              Marca categorías y, si quieres restringir aún más, productos específicos. Sin selección de
              categorías, aplica a todo el catálogo. Esta asociación es la que se usa al resolver el
              impuesto en la orden de compra.
            </p>
          </div>

          <Select
            value={proveedorParaAgregar || undefined}
            onValueChange={(id) => {
              setProveedorParaAgregar('');
              setPanelProveedoresSel((prev) => [...new Set([...prev, id])]);
            }}
          >
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Agregar proveedor creado" />
            </SelectTrigger>
            <SelectContent>
              {proveedoresCatalogo
                .filter((proveedor) => !panelProveedoresSel.includes(panelBackendId(proveedor)))
                .map((proveedor) => {
                  const id = panelBackendId(proveedor);
                  return <SelectItem key={id} value={id}>{panelCategoriaLabel(proveedor)}</SelectItem>;
                })}
            </SelectContent>
          </Select>

          {proveedoresCatalogo.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay proveedores activos creados para parametrizar esta regla.
              <span className="hidden">
              No hay categorías activas. Crea la primera aquí mismo para darle alcance a la regla.
              </span>
            </p>
          ) : (
            <div className="grid max-h-48 gap-2 overflow-auto sm:grid-cols-2">
              {proveedoresCatalogo.map((categoria) => {
                const id = panelBackendId(categoria);
                const checked = panelProveedoresSel.includes(id);
                return (
                  <label key={id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <Checkbox
                      checked={checked}
                      disabled={panelSaving}
                      onCheckedChange={(value) => togglePanelCategoria(id, value === true)}
                    />
                    <span className="min-w-0 truncate">{panelCategoriaLabel(categoria)}</span>
                  </label>
                );
              })}
            </div>
          )}

          <div className="hidden">
            <Input
              className={`${reglasContablesUi.input} h-8 w-56`}
              value={nuevaCategoriaNombre}
              onChange={(e) => setNuevaCategoriaNombre(e.target.value)}
              placeholder="Nueva categoría (ej: Aseo)"
              disabled={creandoCategoria || panelSaving}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void crearCategoriaInline()}
              disabled={creandoCategoria || panelSaving}
            >
              {creandoCategoria ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Crear categoría
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Responsabilidades DIAN requeridas</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {responsabilidadesCatalogo.map((responsabilidad) => (
                <label key={responsabilidad.codigo} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <Checkbox
                    checked={panelResponsabilidadesSel.includes(responsabilidad.codigo)}
                    disabled={panelSaving}
                    onCheckedChange={(checked) => {
                      setPanelResponsabilidadesSel((prev) => {
                        if (checked === true) {
                          if (responsabilidad.codigo === 'R-99-PN') return ['R-99-PN'];
                          return [...new Set([...prev.filter((codigo) => codigo !== 'R-99-PN'), responsabilidad.codigo])];
                        }
                        return prev.filter((codigo) => codigo !== responsabilidad.codigo);
                      });
                    }}
                  />
                  <span>{responsabilidad.codigo} · {responsabilidad.nombre}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" size="sm" className={reglasContablesUi.btnPrimary} disabled={panelSaving} onClick={() => void guardarParametrizacionProductos()}>
              {panelSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar parametrización
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Selecciona una sola regla para parametrizar sus productos/categorías.</p>
      )}
    </div>
  ) : null;

  const tabla = (

    <div className={reglasContablesUi.tableWrap}>

      <Table>

        <TableHeader>

          <TableRow>

            <TableHead className="w-10">
              <Checkbox
                checked={todasVisiblesSeleccionadas}
                onCheckedChange={(v) => toggleTodasVisibles(v === true)}
                aria-label="Seleccionar todas"
              />
            </TableHead>

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

          {reglasFiltradas.map((regla) => (

            <TableRow key={regla.codigo} className={reglasContablesUi.tableRowHover}>

              <TableCell>
                <Checkbox
                  checked={seleccionadas.has(regla.codigo)}
                  onCheckedChange={(v) => toggleSeleccionada(regla.codigo, v === true)}
                  aria-label={`Seleccionar ${regla.codigo}`}
                />
              </TableCell>

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

          {!loading && reglasFiltradas.length === 0 ? (

            <TableRow>

              <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">

                {reglas.length === 0
                  ? 'No hay reglas parametrizadas. Use «Agregar regla» o recargue para sembrar las predeterminadas.'
                  : 'No hay reglas de este tipo.'}

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

      <CatalogoCodigosDianModal
        open={codigosDianModalOpen}
        onOpenChange={setCodigosDianModalOpen}
      />

      <AlcanceReglasOcModal
        open={ambitosOcModalOpen}
        onOpenChange={setAmbitosOcModalOpen}
        onSaved={(ambitos) => {
          setAmbitosOc(ambitos);
          void cargar();
          onReglasActualizadas?.();
        }}
      />

    </>

  );



  const contenido = (

    <div className="space-y-4">

      {barraSuperior}

      {barraSeleccion}

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


