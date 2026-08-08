import React, { memo, useDeferredValue, useMemo, useState } from 'react';
import type { BackendProducto } from '@/app/services/productosService';
import { getProductoId } from '@/app/presentation/pages/admin/inventario/inventarioBarcodeUtils';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** Valor interno del select cuando no hay SKU filtrado (Radix Select no admite value vacío). */
const SIN_SKU = '__SIN_SKU__';

/**
 * Tope de opciones pintadas en el desplegable. Radix monta un `SelectItem` por
 * entrada, así que con catálogos grandes el `open` del select se convierte en un
 * long task. El buscador de arriba es el mecanismo para llegar al resto.
 */
const MAX_OPCIONES = 150;

export type InventarioSkuStockSelectProps = {
  /** Catálogo completo de SKU (ya ordenado por el padre). */
  skuOptions: BackendProducto[];
  /** SKU actualmente filtrado ('' = todos). */
  value: string;
  onChange: (sku: string) => void;
};

/**
 * Buscador + selector de SKU del tab de Stock.
 *
 * El texto de búsqueda es **estado local**: antes vivía en `Inventario.tsx`, así que
 * cada tecla re-renderizaba el módulo completo (63 estados, 7 tabs, 15 modales) y la
 * tabla de stock sin paginar — la causa principal del INP alto en esta pantalla.
 *
 * Además el filtrado se hace sobre `useDeferredValue`: el navegador pinta la letra
 * tecleada antes de recalcular la lista, que es justo lo que mide INP.
 */
function InventarioSkuStockSelect({
  skuOptions,
  value,
  onChange,
}: InventarioSkuStockSelectProps): React.ReactElement {
  const [query, setQuery] = useState('');
  const queryDiferida = useDeferredValue(query);

  const { opciones, totalCoincidencias } = useMemo(() => {
    const q = queryDiferida.trim().toUpperCase();
    const coincidencias = q
      ? skuOptions.filter((producto) => {
        const sku = String(producto.sku || '').trim().toUpperCase();
        const nombre = String(producto.nombre || '').trim().toUpperCase();
        return sku.includes(q) || nombre.includes(q);
      })
      : skuOptions;

    const visibles = coincidencias.slice(0, MAX_OPCIONES);

    // El SKU seleccionado debe existir siempre entre los items montados; si el
    // recorte lo dejó fuera, Radix pintaría el trigger vacío.
    const seleccionado = String(value || '').trim();
    if (seleccionado && !visibles.some((producto) => producto.sku === seleccionado)) {
      const actual = skuOptions.find((producto) => producto.sku === seleccionado);
      if (actual) visibles.unshift(actual);
    }

    return { opciones: visibles, totalCoincidencias: coincidencias.length };
  }, [skuOptions, queryDiferida, value]);

  const nombreSeleccionado = useMemo(
    () => (value ? skuOptions.find((producto) => producto.sku === value)?.nombre || value : 'Todos los SKU'),
    [skuOptions, value],
  );

  const hayRecorte = totalCoincidencias > MAX_OPCIONES;

  return (
    <div className="space-y-2">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar SKU o nombre..."
      />
      <Select
        value={value || SIN_SKU}
        onValueChange={(next) => onChange(next === SIN_SKU ? '' : next)}
      >
        <SelectTrigger className="border-input bg-background" title={nombreSeleccionado}>
          <SelectValue placeholder={skuOptions.length ? 'Selecciona SKU' : 'Sin SKUs'} />
        </SelectTrigger>
        <SelectContent className="max-h-72 border-border bg-popover">
          <SelectItem value={SIN_SKU}>Todos</SelectItem>
          {opciones.map((producto) => (
            <SelectItem
              key={getProductoId(producto) || producto.sku}
              value={producto.sku || ''}
              title={`Producto: ${producto.nombre || 'Sin nombre'}`}
              aria-label={`${producto.sku}. ${producto.nombre || 'Sin nombre'}`}
              className="group items-start"
            >
              <span className="flex min-w-0 flex-col">
                <span className="font-medium">{producto.sku}</span>
                <span className="hidden whitespace-normal pt-0.5 text-xs text-muted-foreground group-hover:block group-focus:block group-data-[highlighted]:block">
                  Producto: {producto.nombre || 'Sin nombre'}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hayRecorte ? (
        <p className="text-xs text-muted-foreground">
          Mostrando {MAX_OPCIONES} de {totalCoincidencias} SKU. Escribe para acotar la búsqueda.
        </p>
      ) : null}
    </div>
  );
}

export default memo(InventarioSkuStockSelect);
