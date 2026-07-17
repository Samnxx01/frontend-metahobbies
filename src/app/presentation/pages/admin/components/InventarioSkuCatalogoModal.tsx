import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Barcode,
  Download,
  Info,
  Package,
  Pencil,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Wand2,
  Zap,
} from 'lucide-react';
import type { BackendProducto } from '@/app/services/productosService';
import {
  BarcodePreview,
  generarCodigoBarrasDesdeSkú,
  getProductoId,
  imprimirCodigoBarrasSku,
  imprimirMultiplesCodigosBarras,
  inferirFormatoCodigoBarras,
  normalizarCodigoBarrasAlfanumerico,
} from '@/app/presentation/pages/admin/inventario/inventarioBarcodeUtils';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const MONEY = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export type InventarioSkuCatalogoModalProps = {
  open: boolean;
  saving?: boolean;
  productos: BackendProducto[];
  codigosRegistrados?: Set<string>;
  puedeGestionarSku?: boolean;
  /** Código pre-cargado al abrir (ej: desde pistola láser global) */
  initialFiltro?: string;
  onOpenChange: (open: boolean) => void;
  onSelectSku: (producto: BackendProducto) => void;
  onEditSku?: (producto: BackendProducto) => void;
  onDesactivarSku: (producto: BackendProducto) => Promise<void>;
  onEliminarSku: (producto: BackendProducto) => Promise<void>;
  onEliminarSkusMasivo?: (productos: BackendProducto[]) => Promise<void>;
  onGenerarCodigoBarras: (producto: BackendProducto) => Promise<void>;
  onRefresh?: () => Promise<void>;
  onExportarExcel?: () => Promise<void>;
  onImportarExcel?: (file: File) => Promise<{ total: number; insertados: number; errores: { fila: number; error: string }[] }>;
  onGenerarCodigosMasivo?: (asignaciones: Array<{ producto: BackendProducto; codigoBarras: string }>) => Promise<void>;
  onEliminarCodigoBarras?: (productos: BackendProducto[]) => Promise<void>;
};

export default function InventarioSkuCatalogoModal({
  open,
  saving = false,
  productos,
  codigosRegistrados,
  puedeGestionarSku = false,
  initialFiltro,
  onOpenChange,
  onSelectSku,
  onEditSku,
  onDesactivarSku,
  onEliminarSku,
  onEliminarSkusMasivo,
  onGenerarCodigoBarras,
  onRefresh,
  onExportarExcel,
  onImportarExcel,
  onGenerarCodigosMasivo,
  onEliminarCodigoBarras,
}: InventarioSkuCatalogoModalProps): React.ReactElement {
  const [filtro, setFiltro] = useState('');
  const [scannerActivo, setScannerActivo] = useState(false);
  const ultimoCambioRef = useRef<number>(0);
  const isScanRef = useRef(false);
  const scannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [barcodePreview, setBarcodePreview] = useState<BackendProducto | null>(null);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [generandoCodigos, setGenerandoCodigos] = useState(false);
  const [resultadoImport, setResultadoImport] = useState<{ total: number; insertados: number; errores: { fila: number; error: string }[] } | null>(null);
  const [confirmEliminar, setConfirmEliminar] = useState<BackendProducto[] | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [previewGeneracion, setPreviewGeneracion] = useState<Array<{ producto: BackendProducto; codigoBarras: string; formato: string | null }> | null>(null);
  const [confirmEliminarCodigo, setConfirmEliminarCodigo] = useState<BackendProducto[] | null>(null);
  const [eliminandoCodigo, setEliminandoCodigo] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const filtroInputRef = useRef<HTMLInputElement>(null);

  // Devuelve el foco al input de lectura tras cerrar un sub-diálogo o completar
  // una acción de la barra (Actualizar/Exportar/Importar), para que la pistola
  // láser no termine "presionando" un botón vecino en la siguiente lectura.
  const refocarInputFiltro = (): void => {
    requestAnimationFrame(() => filtroInputRef.current?.focus());
  };

  useEffect(() => {
    if (open) {
      setFiltro(initialFiltro ?? '');
      setBarcodePreview(null);
      setSeleccionados(new Set());
      setResultadoImport(null);
      setConfirmEliminar(null);
      setScannerActivo(false);
      isScanRef.current = false;
    }
    if (!open) {
      if (scannerTimeoutRef.current) clearTimeout(scannerTimeoutRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialFiltro]);

  useEffect(() => () => {
    if (scannerTimeoutRef.current) clearTimeout(scannerTimeoutRef.current);
  }, []);

  const handleFiltroChange = (valor: string): void => {
    const ahora = Date.now();
    const delta = ahora - ultimoCambioRef.current;
    ultimoCambioRef.current = ahora;

    // Pistola láser: 1 carácter nuevo y llegó muy rápido
    const esRapido = delta < 50 && valor.length === filtro.length + 1;

    if (esRapido) {
      isScanRef.current = true;
      setScannerActivo(true);
      if (scannerTimeoutRef.current) clearTimeout(scannerTimeoutRef.current);
      scannerTimeoutRef.current = setTimeout(() => {
        isScanRef.current = false;
        setScannerActivo(false);
      }, 500);
    } else if (delta > 150) {
      // Pausa larga → escritura manual
      isScanRef.current = false;
      setScannerActivo(false);
      if (scannerTimeoutRef.current) clearTimeout(scannerTimeoutRef.current);
    }
    setFiltro(valor);
  };

  const handleExportar = async (): Promise<void> => {
    if (!onExportarExcel || exportando) return;
    setExportando(true);
    try { await onExportarExcel(); } finally { setExportando(false); refocarInputFiltro(); }
  };

  const handleImportarArchivo = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file || !onImportarExcel) return;
    e.target.value = '';
    setImportando(true);
    setResultadoImport(null);
    try {
      const result = await onImportarExcel(file);
      setResultadoImport(result);
    } finally {
      setImportando(false);
      refocarInputFiltro();
    }
  };

  const productosFiltrados = useMemo(() => {
    const query = filtro.trim().toLowerCase();
    if (!query) return productos;
    const queryDigits = query.replace(/\D/g, '');
    return productos.filter((producto) => {
      const sku = String(producto.sku || '').toLowerCase();
      const nombre = String(producto.nombre || '').toLowerCase();
      const codigoBarras = String(producto.codigoBarras || '').toLowerCase();
      return sku.includes(query)
        || nombre.includes(query)
        || codigoBarras.includes(query)
        || (!!queryDigits && codigoBarras.includes(queryDigits));
    });
  }, [filtro, productos]);

  const toggleSeleccion = (id: string): void => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const todosSeleccionados = productosFiltrados.length > 0
    && productosFiltrados.every((p) => seleccionados.has(getProductoId(p)));

  const toggleTodos = (): void => {
    if (todosSeleccionados) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(productosFiltrados.map((p) => getProductoId(p))));
    }
  };

  const productosSeleccionados = useMemo(
    () => productos.filter((p) => seleccionados.has(getProductoId(p))),
    [productos, seleccionados],
  );

  const tieneCodigoRegistrado = (p: BackendProducto): boolean => {
    if (!String(p.codigoBarras || '').trim()) return false;
    if (!codigosRegistrados) return true;
    return codigosRegistrados.has(getProductoId(p));
  };

  const productosSeleccionadosSinCodigo = useMemo(
    () => productosSeleccionados.filter((p) => !tieneCodigoRegistrado(p)),
    [productosSeleccionados, codigosRegistrados],
  );

  const productosSeleccionadosConCodigo = useMemo(
    () => productosSeleccionados.filter((p) => tieneCodigoRegistrado(p)),
    [productosSeleccionados, codigosRegistrados],
  );

  const handleConfirmarEliminarCodigo = (): void => {
    if (!confirmEliminarCodigo || eliminandoCodigo || !onEliminarCodigoBarras) return;
    const productos = confirmEliminarCodigo;
    setConfirmEliminarCodigo(null);
    setEliminandoCodigo(true);
    onEliminarCodigoBarras(productos).finally(() => { setEliminandoCodigo(false); refocarInputFiltro(); });
  };

  // Calcula los códigos candidatos y muestra el preview antes de confirmar
  const handleAbrirPreview = (): void => {
    if (!onGenerarCodigosMasivo || generandoCodigos || productosSeleccionadosSinCodigo.length === 0) return;
    const usados = new Set(
      productos
        .filter((p) => tieneCodigoRegistrado(p))
        .map((p) => normalizarCodigoBarrasAlfanumerico(String(p.codigoBarras || '')))
        .filter(Boolean),
    );
    const preview = productosSeleccionadosSinCodigo.map((producto) => {
      const codigo = generarCodigoBarrasDesdeSkú(producto.sku || '', usados);
      usados.add(codigo);
      const formato = inferirFormatoCodigoBarras(codigo, null);
      return { producto, codigoBarras: codigo, formato: formato ?? null };
    });
    setPreviewGeneracion(preview);
  };

  const handleConfirmarGeneracion = (): void => {
    if (!previewGeneracion || !onGenerarCodigosMasivo) return;
    const asignaciones = previewGeneracion.map(({ producto, codigoBarras }) => ({ producto, codigoBarras }));
    setPreviewGeneracion(null); // cierra el dialog de preview de inmediato
    setGenerandoCodigos(true);
    onGenerarCodigosMasivo(asignaciones).finally(() => { setGenerandoCodigos(false); refocarInputFiltro(); });
  };

  const aplicarUnico = (): void => {
    if (productosSeleccionados.length !== 1) return;
    onSelectSku(productosSeleccionados[0]);
    setBarcodePreview(null);
    setSeleccionados(new Set());
  };

  const handleConfirmarEliminar = async (): Promise<void> => {
    if (!confirmEliminar || eliminando) return;
    setEliminando(true);
    try {
      if (confirmEliminar.length === 1) {
        await onEliminarSku(confirmEliminar[0]);
      } else if (onEliminarSkusMasivo) {
        await onEliminarSkusMasivo(confirmEliminar);
      } else {
        for (const p of confirmEliminar) {
          await onEliminarSku(p);
        }
      }
      const idsEliminados = new Set(confirmEliminar.map((p) => getProductoId(p)));
      setSeleccionados((prev) => {
        const next = new Set(prev);
        idsEliminados.forEach((id) => next.delete(id));
        return next;
      });
      setConfirmEliminar(null);
    } catch {
      // El padre ya muestra el toast de error
    } finally {
      setEliminando(false);
      refocarInputFiltro();
    }
  };

  // Label inteligente: muestra los SKUs si son 1 o 2, de lo contrario solo el conteo
  const labelSeleccionados = useMemo(() => {
    const n = productosSeleccionados.length;
    if (n === 0) return '';
    if (n <= 2) {
      return productosSeleccionados.map((p) => p.sku || p.nombre || getProductoId(p)).join(', ');
    }
    return `${n} SKUs seleccionados`;
  }, [productosSeleccionados]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100%-2rem)] max-h-[92dvh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Visualizador de SKU creados
            </DialogTitle>
            <DialogDescription>
              Escanea un codigo de barras o busca manualmente por SKU, codigo o nombre.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={filtroInputRef}
                  autoFocus
                  value={filtro}
                  onChange={(event) => handleFiltroChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    const query = filtro.trim().toUpperCase();
                    if (isScanRef.current && query) {
                      // Pistola: match exacto por código de barras primero, luego primer resultado
                      const exacto = productosFiltrados.find(
                        (p) => String(p.codigoBarras || '').toUpperCase() === query,
                      );
                      const target = exacto ?? (productosFiltrados.length >= 1 ? productosFiltrados[0] : null);
                      if (target) {
                        onSelectSku(target);
                        setFiltro('');
                        setScannerActivo(false);
                        isScanRef.current = false;
                      }
                      return;
                    }
                    if (productosFiltrados.length !== 1) return;
                    onSelectSku(productosFiltrados[0]);
                    setFiltro('');
                  }}
                  className={`pl-9 ${scannerActivo ? 'pr-32' : 'pr-3'}`}
                  placeholder="Escanea codigo de barras o escribe nombre/SKU"
                />
                {scannerActivo && (
                  <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-full border border-success bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                    <Zap className="h-3 w-3 animate-pulse" />
                    Escaneando...
                  </span>
                )}
              </div>
              <Badge variant="secondary" className="h-9 justify-center rounded-md px-3">
                {productosFiltrados.length} de {productos.length}
              </Badge>
              <div className="flex gap-2">
                {onRefresh && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={refrescando}
                    onClick={async () => {
                      setRefrescando(true);
                      try { await onRefresh(); } finally { setRefrescando(false); refocarInputFiltro(); }
                    }}
                    title="Actualizar lista desde la base de datos"
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${refrescando ? 'animate-spin' : ''}`} />
                    {refrescando ? 'Actualizando…' : 'Actualizar'}
                  </Button>
                )}
              </div>
              {(onExportarExcel || onImportarExcel) && (
                <div className="flex gap-2">
                  {onExportarExcel && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={exportando}
                      onClick={() => void handleExportar()}
                      title="Exportar catalogo a Excel"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {exportando ? 'Exportando…' : 'Exportar'}
                    </Button>
                  )}
                  {onImportarExcel && (
                    <>
                      <input
                        ref={importInputRef}
                        type="file"
                        accept=".xlsx"
                        className="hidden"
                        onChange={(e) => void handleImportarArchivo(e)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={importando}
                        onClick={() => importInputRef.current?.click()}
                        title="Importar productos desde Excel"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {importando ? 'Importando…' : 'Importar'}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

            {resultadoImport && (
              <div className={`rounded-md border px-4 py-3 text-sm ${resultadoImport.errores.length > 0 ? 'border-warning/30 bg-warning/10 text-warning' : 'border-success/30 bg-success/10 text-success'}`}>
                <p className="font-semibold">
                  Importacion completada: {resultadoImport.insertados} de {resultadoImport.total} insertados
                </p>
                {resultadoImport.errores.length > 0 && (
                  <ul className="mt-1 list-disc pl-4 text-xs">
                    {resultadoImport.errores.slice(0, 5).map((e) => (
                      <li key={e.fila}>Fila {e.fila}: {e.error}</li>
                    ))}
                    {resultadoImport.errores.length > 5 && (
                      <li>…y {resultadoImport.errores.length - 5} errores mas</li>
                    )}
                  </ul>
                )}
              </div>
            )}

            <div className="max-h-[52vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={todosSeleccionados}
                        onCheckedChange={toggleTodos}
                        aria-label="Seleccionar todos"
                      />
                    </TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Codigo de barras</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead className="text-right">Accion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productosFiltrados.map((producto) => {
                    const id = getProductoId(producto) || producto.sku || producto.nombre || '';
                    const checked = seleccionados.has(id);
                    return (
                      <TableRow
                        key={id}
                        data-state={checked ? 'selected' : undefined}
                        className={checked ? 'bg-primary/5' : undefined}
                      >
                        <TableCell>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleSeleccion(id)}
                            aria-label={`Seleccionar ${producto.sku || producto.nombre}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold">{producto.sku || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Barcode className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="space-y-2">
                              {tieneCodigoRegistrado(producto) ? (
                                <button
                                  type="button"
                                  className="rounded border border-transparent p-1 text-left transition hover:border-primary/40 hover:bg-background/70"
                                  title="Ver e imprimir codigo"
                                  onClick={() => setBarcodePreview(producto)}
                                >
                                  <BarcodePreview codigo={producto.codigoBarras} formato={producto.formatoCodigoBarras} />
                                </button>
                              ) : (
                                <BarcodePreview codigo={undefined} formato={undefined} />
                              )}
                              {!tieneCodigoRegistrado(producto) && puedeGestionarSku && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  disabled={saving}
                                  onClick={() => void onGenerarCodigoBarras(producto)}
                                >
                                  Generar codigo
                                </Button>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium">{producto.nombre}</p>
                            <p className="line-clamp-1 text-xs text-muted-foreground">{producto.descripcion || producto.descripcionCorta || 'Sin descripcion'}</p>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{producto.unidadMedida || 'UNIDAD'}</Badge></TableCell>
                        <TableCell>{MONEY.format(Number(producto.precio || 0))}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              title="Detalles del SKU"
                              onClick={() => setBarcodePreview(producto)}
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                            {puedeGestionarSku && (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  disabled={saving}
                                  title="Desactivar SKU"
                                  onClick={() => void onDesactivarSku(producto)}
                                >
                                  <AlertTriangle className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  disabled={saving}
                                  title="Eliminar SKU"
                                  onClick={() => setConfirmEliminar([producto])}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                {onEditSku && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    disabled={saving}
                                    title="Editar SKU"
                                    onClick={() => onEditSku(producto)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {productosFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                        No se encontraron SKU con ese filtro.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {seleccionados.size > 0 && (
              <div className="flex items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-2">
                <span className="min-w-0 truncate text-sm font-medium" title={labelSeleccionados}>
                  {labelSeleccionados}
                  {productosSeleccionadosSinCodigo.length > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({productosSeleccionadosSinCodigo.length} sin codigo)
                    </span>
                  )}
                </span>
                <div className="flex shrink-0 gap-2">
                  {seleccionados.size === 1 && (
                    <Button type="button" size="sm" onClick={aplicarUnico}>
                      Seleccionar
                    </Button>
                  )}
                  {onGenerarCodigosMasivo && productosSeleccionadosSinCodigo.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={generandoCodigos || saving}
                      onClick={handleAbrirPreview}
                    >
                      <Wand2 className="mr-2 h-4 w-4" />
                      {generandoCodigos
                        ? 'Generando…'
                        : `Generar ${productosSeleccionadosSinCodigo.length === 1 ? 'codigo' : `${productosSeleccionadosSinCodigo.length} codigos`}`}
                    </Button>
                  )}
                  {onEliminarCodigoBarras && productosSeleccionadosConCodigo.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      className="border-destructive/50 text-destructive hover:bg-destructive/10"
                      onClick={() => setConfirmEliminarCodigo(productosSeleccionadosConCodigo)}
                    >
                      <Barcode className="mr-2 h-4 w-4" />
                      {productosSeleccionadosConCodigo.length === 1
                        ? 'Eliminar codigo'
                        : `Eliminar ${productosSeleccionadosConCodigo.length} codigos`}
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => imprimirMultiplesCodigosBarras(productosSeleccionados)}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir {seleccionados.size} {seleccionados.size === 1 ? 'etiqueta' : 'etiquetas'}
                  </Button>
                  {puedeGestionarSku && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={saving}
                      onClick={() => setConfirmEliminar(productosSeleccionados)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar {seleccionados.size > 1 ? `(${seleccionados.size})` : ''}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de detalles del SKU */}
      <Dialog
        open={Boolean(barcodePreview)}
        onOpenChange={(nextOpen) => { if (!nextOpen) { setBarcodePreview(null); refocarInputFiltro(); } }}
      >
        <DialogContent className="w-[calc(100%-2rem)] max-h-[90dvh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Barcode className="h-5 w-5" />
              Detalles del SKU
            </DialogTitle>
            <DialogDescription>
              Visualiza la etiqueta antes de imprimirla.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border bg-white p-5 text-center text-slate-950">
              <p className="text-sm font-semibold">{barcodePreview?.sku || 'SKU'}</p>
              <p className="mb-1 text-xs font-medium uppercase">{barcodePreview?.nombre || 'Producto'}</p>
              <p className="mb-3 text-xs text-slate-500">{barcodePreview?.descripcion || barcodePreview?.descripcionCorta || ''}</p>
              <div className="mb-2 flex justify-center">
                <BarcodePreview
                  codigo={barcodePreview && tieneCodigoRegistrado(barcodePreview) ? barcodePreview.codigoBarras : undefined}
                  formato={barcodePreview && tieneCodigoRegistrado(barcodePreview) ? barcodePreview.formatoCodigoBarras : undefined}
                />
              </div>
              <div className="flex justify-center gap-4 text-xs text-slate-500">
                <span>Unidad: <strong>{barcodePreview?.unidadMedida || 'UNIDAD'}</strong></span>
                <span>Precio: <strong>{MONEY.format(Number(barcodePreview?.precio || 0))}</strong></span>
                <span>Tipo: <strong>{barcodePreview?.tipo || '-'}</strong></span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setBarcodePreview(null); refocarInputFiltro(); }}>
                Cerrar
              </Button>
              {barcodePreview ? (
                <Button type="button" onClick={() => imprimirCodigoBarrasSku(barcodePreview)}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir etiqueta
                </Button>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog
        open={Boolean(confirmEliminar)}
        onOpenChange={(isOpen) => { if (!isOpen && !eliminando) { setConfirmEliminar(null); refocarInputFiltro(); } }}
      >
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              {(confirmEliminar?.length ?? 0) > 1
                ? `Eliminar ${confirmEliminar?.length} SKUs`
                : 'Eliminar SKU'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {(confirmEliminar?.length ?? 0) === 1
                    ? 'Esta accion elimina definitivamente el SKU. No se puede deshacer.'
                    : `Esta accion elimina definitivamente ${confirmEliminar?.length} SKUs. No se puede deshacer.`}
                </p>
                {confirmEliminar && confirmEliminar.length > 0 && (
                  <div className="divide-y divide-destructive/10 rounded-md border border-destructive/20 bg-destructive/5">
                    {(confirmEliminar.length > 4
                      ? confirmEliminar.slice(0, 3)
                      : confirmEliminar
                    ).map((p) => (
                      <div key={getProductoId(p)} className="flex items-center gap-3 px-3 py-2">
                        <span className="font-mono text-xs font-bold text-destructive">{p.sku || '-'}</span>
                        <span className="min-w-0 truncate text-xs text-muted-foreground">{p.nombre}</span>
                      </div>
                    ))}
                    {confirmEliminar.length > 4 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        …y {confirmEliminar.length - 3} SKU{confirmEliminar.length - 3 !== 1 ? 's' : ''} mas
                      </div>
                    )}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={eliminando}
              onClick={(e) => { e.preventDefault(); void handleConfirmarEliminar(); }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {eliminando
                ? 'Eliminando…'
                : confirmEliminar && confirmEliminar.length > 1
                  ? `Eliminar ${confirmEliminar.length} SKUs`
                  : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmación de eliminación de códigos de barras */}
      <AlertDialog
        open={Boolean(confirmEliminarCodigo)}
        onOpenChange={(isOpen) => { if (!isOpen && !eliminandoCodigo) { setConfirmEliminarCodigo(null); refocarInputFiltro(); } }}
      >
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Barcode className="h-5 w-5" />
              {(confirmEliminarCodigo?.length ?? 0) > 1
                ? `Eliminar ${confirmEliminarCodigo?.length} códigos de barras`
                : 'Eliminar código de barras'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {(confirmEliminarCodigo?.length ?? 0) === 1
                    ? 'Se eliminará el código de barras del SKU. El producto se conserva.'
                    : `Se eliminarán los códigos de barras de ${confirmEliminarCodigo?.length} SKUs. Los productos se conservan.`}
                  {' '}Esta acción no se puede deshacer.
                </p>
                {confirmEliminarCodigo && confirmEliminarCodigo.length > 0 && (
                  <div className="max-h-44 overflow-y-auto rounded-md border border-destructive/20 bg-destructive/5">
                    {(confirmEliminarCodigo.length > 4
                      ? confirmEliminarCodigo.slice(0, 3)
                      : confirmEliminarCodigo
                    ).map((p) => (
                      <div key={getProductoId(p)} className="flex items-start gap-3 border-b border-destructive/10 px-3 py-2 last:border-0">
                        <span className="mt-0.5 shrink-0 font-mono text-xs font-bold text-destructive">{p.sku || '-'}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{p.nombre}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">{p.codigoBarras || ''}</p>
                        </div>
                      </div>
                    ))}
                    {confirmEliminarCodigo.length > 4 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        …y {confirmEliminarCodigo.length - 3} código{confirmEliminarCodigo.length - 3 !== 1 ? 's' : ''} más
                      </div>
                    )}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); handleConfirmarEliminarCodigo(); }}
            >
              <Barcode className="mr-2 h-4 w-4" />
              {confirmEliminarCodigo && confirmEliminarCodigo.length > 1
                ? `Eliminar ${confirmEliminarCodigo.length} códigos`
                : 'Eliminar código'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview de generación masiva de códigos */}
      <AlertDialog
        open={Boolean(previewGeneracion)}
        onOpenChange={(o) => { if (!o) { setPreviewGeneracion(null); refocarInputFiltro(); } }}
      >
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Vista previa — Generación de códigos
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Se asignarán <strong>{previewGeneracion?.length ?? 0}</strong> códigos de barras.
                  Verifica que los SKU y códigos sean correctos antes de confirmar.
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                    {previewGeneracion?.length ?? 0} a generar
                  </span>
                  {productosSeleccionados.length > (previewGeneracion?.length ?? 0) && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                      {productosSeleccionados.length - (previewGeneracion?.length ?? 0)} ya tienen código (se omiten)
                    </span>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-[40vh] overflow-auto rounded-md border text-sm">
            <table className="w-full caption-bottom">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">SKU</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Producto</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Código generado</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Formato</th>
                </tr>
              </thead>
              <tbody>
                {previewGeneracion?.map(({ producto, codigoBarras, formato }, idx) => (
                  <tr
                    key={getProductoId(producto) || idx}
                    className="border-b last:border-0 odd:bg-background even:bg-muted/30"
                  >
                    <td className="px-3 py-1.5 font-mono text-xs font-semibold">{producto.sku || '-'}</td>
                    <td className="max-w-[180px] truncate px-3 py-1.5 text-xs" title={producto.nombre}>{producto.nombre}</td>
                    <td className="px-3 py-1.5 font-mono text-xs tracking-wider text-primary">{codigoBarras}</td>
                    <td className="px-3 py-1.5">
                      {formato ? (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">{formato}</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleConfirmarGeneracion(); }}>
              {`Confirmar y generar ${previewGeneracion?.length ?? 0} códigos`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
