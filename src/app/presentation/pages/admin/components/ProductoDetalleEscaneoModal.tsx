import React, { useEffect, useState } from 'react';
import { AlertTriangle, Barcode, Loader2, Package, Tag, Warehouse } from 'lucide-react';
import productosService, {
  type BackendCategoria,
  type ProductoConStock,
} from '@/app/services/productosService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const MONEY = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const nombreCategoria = (categoria: BackendCategoria | string | null | undefined): string => {
  if (!categoria) return 'Sin categoría';
  if (typeof categoria === 'string') return categoria;
  return categoria.nombre || 'Sin categoría';
};

export type ProductoDetalleEscaneoModalProps = {
  /** Código de barras recién escaneado. null/'' = modal cerrado. */
  codigoBarras: string | null;
  onClose: () => void;
};

export default function ProductoDetalleEscaneoModal({
  codigoBarras,
  onClose,
}: ProductoDetalleEscaneoModalProps): React.ReactElement {
  const [cargando, setCargando] = useState(false);
  const [producto, setProducto] = useState<ProductoConStock | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!codigoBarras) {
      setProducto(null);
      setError(null);
      return;
    }
    let cancelado = false;
    setCargando(true);
    setError(null);
    setProducto(null);
    productosService.buscarProductoPorCodigoBarras(codigoBarras)
      .then((data) => { if (!cancelado) setProducto(data); })
      .catch((err: Error) => { if (!cancelado) setError(err.message || 'No se encontró el producto'); })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [codigoBarras]);

  const venta = producto?.productoVentaRelacion;
  const stock = producto?.stockDisponible;

  return (
    <Dialog open={Boolean(codigoBarras)} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="w-[calc(100%-2rem)] max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Producto escaneado
          </DialogTitle>
          <DialogDescription className="font-mono text-xs tracking-wider">
            {codigoBarras}
          </DialogDescription>
        </DialogHeader>

        {cargando && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Buscando producto…</span>
          </div>
        )}

        {!cargando && error && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 py-10 text-center text-destructive">
            <AlertTriangle className="h-6 w-6" />
            <span className="text-sm font-medium">{error}</span>
            <span className="text-xs text-muted-foreground">
              No hay ningún producto registrado con este código de barras.
            </span>
          </div>
        )}

        {!cargando && !error && producto && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{producto.nombre}</p>
                <p className="text-xs text-muted-foreground">SKU: {producto.sku || '-'}</p>
              </div>
              <Badge variant={producto.estadoCatalogo === 'ACTIVO' ? 'secondary' : 'outline'}>
                {producto.estadoCatalogo}
              </Badge>
            </div>

            {producto.imagenes?.[0] && (
              <img
                src={producto.imagenes[0]}
                alt={producto.nombre}
                className="h-40 w-full rounded-md border object-contain bg-card"
              />
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" /> Categoría
                </p>
                <p className="mt-1 font-medium">{nombreCategoria(producto.categoria)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Precio</p>
                <p className="mt-1 font-medium">{MONEY.format(Number(producto.precio || 0))}</p>
              </div>
            </div>

            {venta && (
              <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
                <p className="mb-2 flex items-center gap-1.5 font-medium text-primary">
                  <Barcode className="h-3.5 w-3.5" /> Ficha de venta
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Nombre comercial</p>
                    <p className="font-medium">{venta.nombre || producto.nombre}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Precio de venta</p>
                    <p className="font-medium">{MONEY.format(Number(venta.precio || 0))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Maneja ventas</p>
                    <p className="font-medium">{venta.manejaVentas ? 'Sí' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Destacado</p>
                    <p className="font-medium">{venta.destacado ? 'Sí' : 'No'}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-md border p-3 text-sm">
              <p className="mb-2 flex items-center justify-between font-medium">
                <span className="flex items-center gap-1.5">
                  <Warehouse className="h-3.5 w-3.5" /> Stock disponible
                </span>
                <Badge variant={(stock?.total ?? 0) > 0 ? 'secondary' : 'destructive'}>
                  {stock?.total ?? 0} en total
                </Badge>
              </p>
              {stock && stock.porBodega.length > 0 ? (
                <div className="divide-y">
                  {stock.porBodega.map((s) => (
                    <div key={s.bodega} className="flex items-center justify-between py-1.5 text-xs">
                      <span className="text-muted-foreground">{s.bodega}</span>
                      <span className="font-medium">{s.cantidadDisponible}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Sin stock registrado en ninguna bodega.</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
