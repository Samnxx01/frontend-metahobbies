import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Copy, ExternalLink, Loader2, Plus, ReceiptText, Search, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import carritoService from '@/app/services/carritoService';
import productosService, { type BackendProducto } from '@/app/services/productosService';
import inventarioService, { type StockActualItem } from '@/app/services/inventarioService';
import metodoPagoService, { type MetodoPagoPadre } from '@/app/services/metodoPagoService';
import { apiFetchPublic } from '@/app/services/api';
import terceroService from '@/app/services/terceroService';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type Linea = { productoId: string; cantidad: number; colorPantone?: string };
type ImpuestoLinea = {
  productoId: string; baseImponible: number; aplicaImpuesto: boolean;
  detalleImpuestos: Array<{ codigo?: string; nombre?: string; tarifa?: number; valor: number }>;
  totalImpuestos: number; totalConImpuestos: number;
};
type ReferidorBypass = { id: string; nombre: string; correo: string; rol?: string; politica: { codigo: string; decision: string } };
type CiudadCatalogo = { ciudadId: string; nombre: string };
type DepartamentoCatalogo = { departamentoId: string; nombre: string; ciudades: CiudadCatalogo[] };
type TipoDocumentoCatalogo = { id: string; codigo: string; nombre: string; validacion?: { minLength: number; maxLength: number; soloNumeros: boolean; descripcion: string } };
type Props = { open: boolean; onOpenChange: (open: boolean) => void; onCreated: () => Promise<void> | void };

const idProducto = (p: BackendProducto): string => String(p.id || p.iud || p._id || '');
const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const nombreCortoMetodoPago = (metodo: MetodoPagoPadre): string => {
  const nombre = String(metodo.nombreMetodoPago || '').trim();
  return nombre.length <= 42 ? nombre : String(metodo.codigo || metodo.catalogoMetodoCodigo || nombre);
};
const esDocumentoEmpresa = (tipo: TipoDocumentoCatalogo): boolean => {
  const texto = `${tipo.codigo} ${tipo.nombre}`.toUpperCase();
  return texto.includes('NIT') || tipo.codigo === '31';
};
const esMetodoEfectivo = (metodo: MetodoPagoPadre | undefined): boolean => {
  if (!metodo) return false;
  return [metodo.codigo, metodo.catalogoMetodoCodigo, metodo.pasarelaPago]
    .some((valor) => String(valor || '').trim().toUpperCase() === 'EFECTIVO');
};

export default function VentaManualModal({ open, onOpenChange, onCreated }: Props): React.ReactElement {
  const [productos, setProductos] = useState<BackendProducto[]>([]);
  const [stock, setStock] = useState<StockActualItem[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPagoPadre[]>([]);
  const [metodoPagoCodigo, setMetodoPagoCodigo] = useState('');
  const [departamentos, setDepartamentos] = useState<DepartamentoCatalogo[]>([]);
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumentoCatalogo[]>([]);
  const [buscandoTercero, setBuscandoTercero] = useState(false);
  const [terceroEncontrado, setTerceroEncontrado] = useState(false);
  const [lineas, setLineas] = useState<Linea[]>([{ productoId: '', cantidad: 1 }]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pipelineB, setPipelineB] = useState(false);
  const [pagoYaRecibido, setPagoYaRecibido] = useState(false);
  const [busquedasProducto, setBusquedasProducto] = useState<Record<number, string>>({});
  const [selectorProductoAbierto, setSelectorProductoAbierto] = useState<number | null>(null);
  const [sponsorUserId, setSponsorUserId] = useState('');
  const [referidoresBypass, setReferidoresBypass] = useState<ReferidorBypass[]>([]);
  const [cargandoReferidores, setCargandoReferidores] = useState(false);
  const [preview, setPreview] = useState<{ items: ImpuestoLinea[]; subtotal: number; totalImpuestos: number; total: number } | null>(null);
  const [calculandoImpuestos, setCalculandoImpuestos] = useState(false);
  const [enlacePago, setEnlacePago] = useState<{ url: string; referencia: string } | null>(null);
  const [cliente, setCliente] = useState({
    terceroId: '',
    tipoPersona: 'NATURAL' as 'NATURAL' | 'JURIDICA', tipoDocumento: 'CC', numeroDocumento: '',
    nombreCompleto: '', razonSocial: '', email: '', telefono: '', direccion: '', ciudad: '',
    departamento: '', ciudadId: '', departamentoId: '', pais: 'CO',
  });

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void Promise.all([
      productosService.listarProductosVentasAdmin(),
      inventarioService.stockActual(),
      metodoPagoService.listarPadres(),
      apiFetchPublic('/api/carrito/catalogos/facturacion', { method: 'GET' }),
    ]).then(([p, s, metodos, catalogos]) => {
      const metodosActivos = metodos.filter((metodo) => metodo.estado !== false);
      setProductos(p);
      setStock(s);
      setMetodosPago(metodosActivos);
      setDepartamentos(Array.isArray(catalogos?.data?.departamentos) ? catalogos.data.departamentos : []);
      const documentos = Array.isArray(catalogos?.data?.tiposDocumento) ? catalogos.data.tiposDocumento : [];
      setTiposDocumento(documentos);
      setCliente((actual) => {
        const disponibles = documentos.filter((tipo: TipoDocumentoCatalogo) => actual.tipoPersona === 'JURIDICA' ? esDocumentoEmpresa(tipo) : !esDocumentoEmpresa(tipo));
        return disponibles.some((tipo: TipoDocumentoCatalogo) => tipo.codigo === actual.tipoDocumento)
          ? actual
          : { ...actual, tipoDocumento: disponibles[0]?.codigo || '' };
      });
      setMetodoPagoCodigo((actual) => actual && metodosActivos.some((m) => m.codigo === actual) ? actual : '');
    })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'No se pudo cargar productos y stock.'))
      .finally(() => setLoading(false));
  }, [open]);
  useEffect(() => {
    if (!metodoPagoCodigo) return;
    if (esMetodoEfectivo(metodosPago.find((metodo) => metodo.codigo === metodoPagoCodigo))) {
      setPagoYaRecibido(true);
    }
  }, [metodoPagoCodigo, metodosPago]);
  const ciudades = useMemo(
    () => departamentos.find((item) => item.departamentoId === cliente.departamentoId)?.ciudades || [],
    [departamentos, cliente.departamentoId],
  );
  const tiposDocumentoDisponibles = useMemo(() => {
    const filtrados = tiposDocumento.filter((tipo) => cliente.tipoPersona === 'JURIDICA' ? esDocumentoEmpresa(tipo) : !esDocumentoEmpresa(tipo));
    return filtrados.length ? filtrados : tiposDocumento;
  }, [tiposDocumento, cliente.tipoPersona]);
  const validacionDocumento = useMemo(
    () => tiposDocumento.find((tipo) => tipo.codigo === cliente.tipoDocumento)?.validacion,
    [tiposDocumento, cliente.tipoDocumento],
  );
  useEffect(() => {
    if (!open || !cliente.tipoDocumento || !cliente.numeroDocumento || !validacionDocumento) {
      setTerceroEncontrado(false);
      return;
    }
    const numero = cliente.numeroDocumento.trim();
    const longitudValida = numero.length >= validacionDocumento.minLength && numero.length <= validacionDocumento.maxLength;
    const formatoValido = validacionDocumento.soloNumeros ? /^\d+$/.test(numero) : /^[a-zA-Z0-9]+$/.test(numero);
    if (!longitudValida || !formatoValido) {
      setTerceroEncontrado(false);
      return;
    }
    let activo = true;
    const timer = window.setTimeout(() => {
      setBuscandoTercero(true);
      void terceroService.buscarPorDocumento(numero)
        .then(({ data }) => {
          if (!activo) return;
          if (!data) {
            setTerceroEncontrado(false);
            setCliente((actual) => ({ ...actual, terceroId: '' }));
            return;
          }
          setTerceroEncontrado(true);
          setCliente((actual) => ({
            ...actual,
            ...data,
            terceroId: data.terceroId || data.iud || '',
            numeroDocumento: numero,
          }));
        })
        .catch(() => { if (activo) setTerceroEncontrado(false); })
        .finally(() => { if (activo) setBuscandoTercero(false); });
    }, 450);
    return () => { activo = false; window.clearTimeout(timer); };
  }, [open, cliente.tipoDocumento, cliente.numeroDocumento, validacionDocumento]);
  useEffect(() => {
    if (!open || !pipelineB) return;
    setCargandoReferidores(true);
    void carritoService.listarReferidoresBypassPipelineB()
      .then((resp) => {
        const rows = resp.data || [];
        setReferidoresBypass(rows);
        if (sponsorUserId && !rows.some((row) => row.id === sponsorUserId)) setSponsorUserId('');
      })
      .catch((error) => {
        setReferidoresBypass([]);
        setSponsorUserId('');
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar los referidores con bypass.');
      })
      .finally(() => setCargandoReferidores(false));
  }, [open, pipelineB]);

  const stockSku = useMemo(() => {
    const map = new Map<string, number>();
    stock.forEach((s) => map.set(s.sku, (map.get(s.sku) || 0) + Number(s.cantidadDisponible || 0)));
    return map;
  }, [stock]);
  const productosConStock = useMemo(() => productos.filter((producto) => {
    const relacion = producto.productoVentaRelacion;
    const sku = String(producto.sku || '').trim().toUpperCase();
    return Boolean(
      idProducto(producto)
      && relacion
      && relacion.estado !== false
      && relacion.manejaVentas !== false
      && String(producto.estadoCatalogo || '').toUpperCase() === 'ACTIVO'
      && sku
      && Number(stockSku.get(sku) || 0) > 0
    );
  }), [productos, stockSku]);
  useEffect(() => {
    const faltaColor = lineas.some((linea) => {
      const producto = productos.find((item) => idProducto(item) === linea.productoId);
      const colores = producto?.productoVentaRelacion?.coloresPermitidos || [];
      return colores.length > 0 && !linea.colorPantone;
    });
    if (!open || lineas.some((linea) => !linea.productoId || linea.cantidad < 1) || faltaColor) {
      setPreview(null);
      return;
    }
    let activo = true;
    const timer = window.setTimeout(() => {
      setCalculandoImpuestos(true);
      void carritoService.previsualizarVentaManual(lineas)
        .then((resp) => { if (activo) setPreview(resp.data || null); })
        .catch((error) => {
          if (!activo) return;
          setPreview(null);
          toast.error(error instanceof Error ? error.message : 'No se pudieron calcular los impuestos.');
        })
        .finally(() => { if (activo) setCalculandoImpuestos(false); });
    }, 300);
    return () => { activo = false; window.clearTimeout(timer); };
  }, [open, lineas, productos]);
  const cantidadSeleccionadaSku = lineas.reduce((map, linea) => {
    const producto = productos.find((p) => idProducto(p) === linea.productoId);
    const sku = String(producto?.sku || '').trim().toUpperCase();
    if (sku) map.set(sku, (map.get(sku) || 0) + Number(linea.cantidad || 0));
    return map;
  }, new Map<string, number>());
  const detalle = lineas.map((linea) => {
    const producto = productos.find((p) => idProducto(p) === linea.productoId);
    const sku = String(producto?.sku || '').trim().toUpperCase();
    const disponible = sku ? stockSku.get(sku) || 0 : 0;
    const colores = producto?.productoVentaRelacion?.coloresPermitidos || [];
    return {
      ...linea,
      producto,
      colores,
      faltaColor: colores.length > 0 && !linea.colorPantone,
      disponible,
      excede: !sku || (cantidadSeleccionadaSku.get(sku) || 0) > disponible,
    };
  });
  const previewPorProducto = useMemo(
    () => new Map((preview?.items || []).map((item) => [item.productoId, item])),
    [preview],
  );
  const total = preview?.total ?? detalle.reduce((sum, row) => sum + Number(row.producto?.precio || 0) * row.cantidad, 0);

  const guardar = async (): Promise<void> => {
    if (detalle.some((x) => !x.productoId || x.cantidad < 1 || x.excede)) return toast.error('Corrige productos, cantidades y disponibilidad.');
    if (detalle.some((x) => x.faltaColor)) return toast.error('Selecciona el color de cada producto que maneja colores.');
    if (!cliente.numeroDocumento || !cliente.email || !cliente.telefono || !cliente.direccion || !cliente.ciudad || !cliente.departamento || !cliente.ciudadId || !cliente.departamentoId) return toast.error('Completa los datos obligatorios y códigos geográficos del cliente.');
    if (pipelineB && !sponsorUserId.trim()) return toast.error('Indica el ID del usuario referidor para Pipeline B.');
    if (!metodoPagoCodigo) return toast.error('Selecciona el método de pago de la factura manual.');
    setSaving(true);
    try {
      const resp = await carritoService.crearVentaManual({
        items: lineas, metodoPagoCodigo, datosFacturacion: {
          ...cliente,
          ciudadId: cliente.ciudadId || cliente.ciudad,
          departamentoId: cliente.departamentoId || cliente.departamento,
        },
        aplicaComisionPipelineB: pipelineB,
        sponsorUserId: pipelineB ? sponsorUserId.trim() : undefined,
        pagoYaRecibido,
      });
      if (pagoYaRecibido) {
        toast.success(resp.data?.facturaId
          ? `Factura ${resp.data.facturaId} creada y Kardex descontado.`
          : 'Venta pagada procesada correctamente.');
        onOpenChange(false);
        await onCreated();
        return;
      }
      const url = String(resp.data?.wompiCheckoutUrl || '').trim();
      if (!url) throw new Error('La venta fue creada, pero el servidor no devolvió el enlace del portal de pago.');
      setEnlacePago({ url, referencia: String(resp.data?.reference || resp.data?.referenciaManual || '') });
      toast.success('Enlace de pago generado. La factura se creará cuando Wompi confirme APPROVED.');
      await onCreated();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo crear la venta manual.'); }
    finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={(value) => !saving && onOpenChange(value)}>
    <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto bg-background text-foreground">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><ReceiptText className="h-5 w-5" />Generar factura manual</DialogTitle>
        <DialogDescription>Valida existencias y genera un enlace de pago. La factura y el descuento de inventario se ejecutan solo con pago APPROVED.</DialogDescription></DialogHeader>
      {enlacePago && <section className="space-y-3 rounded-lg border border-primary/30 bg-card p-4">
        <div><h3 className="font-semibold">Portal de pago generado</h3><p className="text-xs text-muted-foreground">Referencia: {enlacePago.referencia}. Comparte este enlace con el cliente; la factura permanecerá pendiente hasta recibir APPROVED.</p></div>
        <Input readOnly value={enlacePago.url} />
        <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => void navigator.clipboard.writeText(enlacePago.url).then(() => toast.success('Enlace copiado.'))}><Copy className="mr-2 h-4 w-4" />Copiar enlace</Button><Button type="button" onClick={() => window.open(enlacePago.url, '_blank', 'noopener,noreferrer')}><ExternalLink className="mr-2 h-4 w-4" />Abrir portal de pago</Button></div>
      </section>}
      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin" /></div> : <div className="space-y-5">
        <section className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><Label>Tipo persona</Label><Select value={cliente.tipoPersona} onValueChange={(v: 'NATURAL'|'JURIDICA') => { const disponibles = tiposDocumento.filter((tipo) => v === 'JURIDICA' ? esDocumentoEmpresa(tipo) : !esDocumentoEmpresa(tipo)); setTerceroEncontrado(false); setCliente({ ...cliente, terceroId: '', tipoPersona: v, tipoDocumento: disponibles[0]?.codigo || '' }); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NATURAL">Natural</SelectItem><SelectItem value="JURIDICA">Jurídica</SelectItem></SelectContent></Select></div>
          <div><Label>Tipo documento *</Label><Select value={cliente.tipoDocumento} onValueChange={(value) => { setTerceroEncontrado(false); setCliente({ ...cliente, terceroId: '', tipoDocumento: value }); }}><SelectTrigger><SelectValue placeholder="Selecciona tipo" /></SelectTrigger><SelectContent>{tiposDocumentoDisponibles.map((tipo) => <SelectItem key={tipo.id || tipo.codigo} value={tipo.codigo}>{tipo.codigo} · {tipo.nombre}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Número documento *</Label><Input value={cliente.numeroDocumento} onChange={(e) => { setTerceroEncontrado(false); setCliente({ ...cliente, terceroId: '', numeroDocumento: e.target.value }); }} /><p className="mt-1 text-xs text-muted-foreground">{buscandoTercero ? 'Buscando cliente...' : terceroEncontrado ? 'Cliente existente: datos cargados desde terceros.' : cliente.numeroDocumento && validacionDocumento ? 'Si el cliente no existe, se registrará en terceros al confirmar.' : ''}</p></div>
          <div><Label>{cliente.tipoPersona === 'JURIDICA' ? 'Razón social' : 'Nombre completo'} *</Label><Input value={cliente.tipoPersona === 'JURIDICA' ? cliente.razonSocial : cliente.nombreCompleto} onChange={(e) => setCliente({ ...cliente, [cliente.tipoPersona === 'JURIDICA' ? 'razonSocial' : 'nombreCompleto']: e.target.value })} /></div>
          {(['email','telefono','direccion'] as const).map((key) => <div key={key}><Label className="capitalize">{key} *</Label><Input type={key === 'email' ? 'email' : 'text'} value={cliente[key]} onChange={(e) => setCliente({ ...cliente, [key]: e.target.value })} /></div>)}
          <div><Label>Departamento *</Label><Select value={cliente.departamentoId} onValueChange={(value) => { const departamento = departamentos.find((item) => item.departamentoId === value); setCliente({ ...cliente, departamentoId: value, departamento: departamento?.nombre || '', ciudadId: '', ciudad: '' }); }}><SelectTrigger><SelectValue placeholder="Selecciona departamento" /></SelectTrigger><SelectContent>{departamentos.map((item) => <SelectItem key={item.departamentoId} value={item.departamentoId}>{item.nombre}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Ciudad *</Label><Select value={cliente.ciudadId} disabled={!cliente.departamentoId} onValueChange={(value) => { const ciudad = ciudades.find((item) => item.ciudadId === value); setCliente({ ...cliente, ciudadId: value, ciudad: ciudad?.nombre || '' }); }}><SelectTrigger><SelectValue placeholder={cliente.departamentoId ? 'Selecciona ciudad' : 'Primero el departamento'} /></SelectTrigger><SelectContent>{ciudades.map((item) => <SelectItem key={item.ciudadId} value={item.ciudadId}>{item.nombre}</SelectItem>)}</SelectContent></Select></div>
        </section>
        <section className="space-y-2 rounded-lg border bg-card p-4">
          <div><h3 className="font-semibold">Metodo de pago</h3><p className="text-xs text-muted-foreground">Se muestran los metodos activos configurados en metodopagos. El catalogo asociado determina el medio DIAN.</p></div>
          <div className="max-w-md"><Label>Metodo de pago *</Label><Select value={metodoPagoCodigo} onValueChange={setMetodoPagoCodigo}><SelectTrigger><SelectValue placeholder="Selecciona un metodo de pago" /></SelectTrigger><SelectContent>{metodosPago.map((metodo) => <SelectItem key={metodo.iud || metodo._id || metodo.codigo} value={metodo.codigo} title={metodo.nombreMetodoPago}>{nombreCortoMetodoPago(metodo)}{metodo.catalogoMetodoCodigo ? ` · ${metodo.catalogoMetodoCodigo}` : ''}</SelectItem>)}</SelectContent></Select>{metodosPago.length === 0 && <p className="mt-1 text-xs text-muted-foreground">No hay metodos de pago activos configurados.</p>}</div>
        </section>
        <section className="space-y-2 rounded-lg border bg-card p-4"><div className="flex items-start gap-2"><Checkbox id="pago-recibido" checked={pagoYaRecibido} onCheckedChange={(value) => setPagoYaRecibido(value === true)} /><div><Label htmlFor="pago-recibido">El pago ya fue recibido</Label><p className="text-xs text-muted-foreground">Marcado: confirma la venta, genera la factura y descuenta Kardex ahora. Sin marcar: genera un enlace Wompi para copiar y compartir.</p></div></div></section>
        <section className="space-y-3 rounded-lg border bg-card p-4"><div className="flex items-center justify-between"><div><h3 className="font-semibold">Productos y cantidades</h3><p className="text-xs text-muted-foreground">La disponibilidad suma todas las bodegas y se vuelve a validar en backend.</p></div><Button type="button" variant="outline" size="sm" onClick={() => setLineas([...lineas, { productoId: '', cantidad: 1 }])}><Plus className="mr-1 h-4 w-4" />Agregar</Button></div>
          {detalle.map((row, index) => { const impuesto = previewPorProducto.get(row.productoId); const tarifas = impuesto?.detalleImpuestos.map((item) => `${Number(item.tarifa || 0)}%`).join(', '); return <div key={index} className="grid items-end gap-2 xl:grid-cols-[minmax(15rem,1fr)_8rem_6rem_6rem_7rem_9rem_7rem_8rem_auto]">
            <div><Label>Producto</Label><Popover open={selectorProductoAbierto === index} onOpenChange={(value) => setSelectorProductoAbierto(value ? index : null)}><PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" className="w-full justify-between font-normal"><span className="truncate">{row.producto ? `${row.producto.nombre} · ${row.producto.sku}` : 'Buscar producto por nombre o SKU'}</span><ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0"><div className="relative border-b border-border p-2"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input autoFocus className="pl-8" value={busquedasProducto[index] || ''} onChange={(e) => setBusquedasProducto((prev) => ({ ...prev, [index]: e.target.value }))} placeholder="Escribe nombre o SKU..." /></div><div className="max-h-64 overflow-y-auto p-1">{productosConStock.filter((p) => { const q = String(busquedasProducto[index] || '').trim().toLocaleLowerCase('es'); return !q || `${p.nombre} ${p.sku}`.toLocaleLowerCase('es').includes(q); }).map((p) => { const pid = idProducto(p); return <button key={pid} type="button" className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-muted" onClick={() => { setLineas(lineas.map((l,i) => i === index ? { ...l, productoId: pid, colorPantone: undefined } : l)); setSelectorProductoAbierto(null); setBusquedasProducto((prev) => ({ ...prev, [index]: '' })); }}><Check className={`h-4 w-4 ${row.productoId === pid ? 'opacity-100' : 'opacity-0'}`} /><span className="min-w-0 flex-1"><span className="block truncate font-medium">{p.nombre}</span><span className="block truncate text-xs text-muted-foreground">SKU {p.sku} · Disponible {stockSku.get(String(p.sku).toUpperCase()) || 0}</span></span></button>; })}{productosConStock.filter((p) => { const q = String(busquedasProducto[index] || '').trim().toLocaleLowerCase('es'); return !q || `${p.nombre} ${p.sku}`.toLocaleLowerCase('es').includes(q); }).length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No hay productos con stock que coincidan.</p>}</div></PopoverContent></Popover></div>
            <div><Label>Color{row.colores.length > 0 ? ' *' : ''}</Label>{row.colores.length > 0 ? <Select value={row.colorPantone || ''} onValueChange={(value) => setLineas(lineas.map((linea, i) => i === index ? { ...linea, colorPantone: value } : linea))}><SelectTrigger className={row.faltaColor ? 'border-destructive' : ''}><SelectValue placeholder="Selecciona color" /></SelectTrigger><SelectContent>{row.colores.map((color) => <SelectItem key={color.valor} value={color.valor}><span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-full border" style={{ backgroundColor: color.valor }} />{color.nombre || color.valor}</span></SelectItem>)}</SelectContent></Select> : <Input readOnly value="No aplica" />}</div>
            <div><Label>Disponible</Label><Input readOnly value={Number.isFinite(row.disponible) ? row.disponible : 'No aplica'} /></div>
            <div><Label>Cantidad</Label><Input type="number" min={1} className={row.excede ? 'border-destructive' : ''} value={row.cantidad} onChange={(e) => setLineas(lineas.map((l,i) => i === index ? { ...l, cantidad: Math.max(1, Number(e.target.value) || 1) } : l))} /></div>
            <div><Label>Base</Label><Input readOnly value={money.format(impuesto?.baseImponible ?? Number(row.producto?.precio || 0) * row.cantidad)} /></div>
            <div><Label>Tarifa</Label><div className="flex min-h-10 items-center rounded-md border border-input bg-background px-3 text-sm"><span className={impuesto?.aplicaImpuesto ? 'text-foreground' : 'text-muted-foreground'}>{calculandoImpuestos ? 'Calculando...' : impuesto?.aplicaImpuesto ? tarifas || 'Aplicada' : 'No aplica'}</span></div></div>
            <div><Label>Impuesto</Label><Input readOnly value={money.format(impuesto?.totalImpuestos || 0)} /></div>
            <div><Label>Total línea</Label><Input readOnly value={money.format(impuesto?.totalConImpuestos ?? Number(row.producto?.precio || 0) * row.cantidad)} /></div>
            <Button type="button" variant="ghost" size="icon" disabled={lineas.length === 1} onClick={() => setLineas(lineas.filter((_,i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
          </div>; })}
          <div className="ml-auto w-full max-w-sm space-y-1 border-t border-border pt-3 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{money.format(preview?.subtotal ?? total)}</span></div><div className="flex justify-between"><span>Total impuestos</span><span>{money.format(preview?.totalImpuestos || 0)}</span></div><div className="flex justify-between text-lg font-bold"><span>Total</span><span>{money.format(total)}</span></div></div>
        </section>
        <section className="space-y-3 rounded-lg border bg-card p-4"><div className="flex items-center gap-2"><Checkbox id="pipeline-b" checked={pipelineB} onCheckedChange={(v) => { const enabled = v === true; setPipelineB(enabled); if (!enabled) setSponsorUserId(''); }} /><Label htmlFor="pipeline-b">Esta venta aplica comisión del flujo Pipeline B</Label></div>{pipelineB && <div className="max-w-xl"><Label>Referidor con política BYPASS activa *</Label><Select value={sponsorUserId} onValueChange={setSponsorUserId} disabled={cargandoReferidores}><SelectTrigger><SelectValue placeholder={cargandoReferidores ? 'Cargando referidores...' : 'Selecciona un referidor elegible'} /></SelectTrigger><SelectContent>{referidoresBypass.map((referidor) => <SelectItem key={referidor.id} value={referidor.id}><span className="font-medium">{referidor.nombre}</span><span className="ml-2 text-muted-foreground">{referidor.correo} · {referidor.politica.codigo} ({referidor.politica.decision})</span></SelectItem>)}</SelectContent></Select>{!cargandoReferidores && referidoresBypass.length === 0 ? <p className="mt-1 text-xs text-muted-foreground">No hay usuarios con políticas BYPASS activas para VENTAS en Pipeline B.</p> : <p className="mt-1 text-xs text-muted-foreground">Solo se muestran usuarios autorizados por una política activa de VENTAS en Pipeline B.</p>}</div>}</section>
      </div>}
      <DialogFooter><Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>{enlacePago ? 'Cerrar' : 'Cancelar'}</Button>{!enlacePago && <Button disabled={loading || saving || calculandoImpuestos || !preview || !metodoPagoCodigo || total <= 0 || detalle.some((x) => x.excede || x.faltaColor)} onClick={() => void guardar()}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{pagoYaRecibido ? 'Confirmar pago y generar factura' : 'Generar enlace de pago'}</Button>}</DialogFooter>
    </DialogContent>
  </Dialog>;
}
