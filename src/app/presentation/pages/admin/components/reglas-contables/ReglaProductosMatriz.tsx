import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import reglasContablesService, {
  type AplicaEnRegla,
  type ProductoEnCategoria,
} from '@/app/services/reglasContablesService';

type ReglaProductosMatrizProps = {
  codigo: string;
  categorias: string[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  /** Ámbito de la regla; `COMPRA` usa el catálogo general de productos en vez del catálogo de venta. */
  ambito?: AplicaEnRegla;
  /** Fuente explícita de productos: 'GENERAL' (catálogo completo, para resolver OC) o 'VENTA' (ProductoVentaRelacion). */
  catalogo?: 'GENERAL' | 'VENTA';
};

const pid = (p: ProductoEnCategoria): string =>
  String(p.iud || p._id || '');

const pNombre = (p: ProductoEnCategoria): string =>
  p.nombre || p.productoVentaId?.nombre || pid(p);

export default function ReglaProductosMatriz({
  codigo,
  categorias,
  selectedIds,
  onChange,
  disabled = false,
  ambito,
  catalogo,
}: ReglaProductosMatrizProps): React.ReactElement | null {
  const [productos, setProductos] = useState<ProductoEnCategoria[]>([]);
  const [loading, setLoading] = useState(false);
  const categoriasKey = categorias.slice().sort().join(',');
  const prevKey = useRef('');
  /** El catálogo general de productos puede listarse sin filtrar por categoría. */
  const permiteSinCategorias = catalogo === 'GENERAL' || (!catalogo && ambito === 'COMPRA');

  useEffect(() => {
    if (!codigo || (categorias.length === 0 && !permiteSinCategorias)) {
      setProductos([]);
      prevKey.current = '';
      return;
    }
    const key = `${categoriasKey}::${ambito ?? ''}::${catalogo ?? ''}`;
    if (key === prevKey.current) return;
    prevKey.current = key;
    setLoading(true);
    reglasContablesService
      .listarProductosPorRegla(codigo, categorias, ambito, catalogo)
      .then((data) => setProductos(data))
      .catch(() => setProductos([]))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo, categoriasKey, ambito, catalogo, permiteSinCategorias]);

  if (categorias.length === 0 && !permiteSinCategorias) return null;

  if (loading) {
    return <p className="text-xs text-muted-foreground">Cargando productos…</p>;
  }

  if (productos.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No hay productos en las categorías seleccionadas.
      </p>
    );
  }

  const toggle = (id: string, checked: boolean): void => {
    const set = new Set(selectedIds);
    if (checked) set.add(id);
    else set.delete(id);
    onChange(Array.from(set));
  };

  const selAll = (): void => onChange(productos.map(pid).filter(Boolean));
  const clearAll = (): void => onChange([]);

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Sin selección = se aplica a todos los productos de las categorías elegidas.
        </p>
        <div className="flex gap-3 text-xs">
          <button type="button" onClick={selAll} disabled={disabled} className="text-primary hover:underline disabled:opacity-50">
            Todos
          </button>
          <button type="button" onClick={clearAll} disabled={disabled} className="text-muted-foreground hover:underline disabled:opacity-50">
            Ninguno
          </button>
        </div>
      </div>
      <div className="max-h-52 overflow-auto rounded-md border border-border">
        {productos.map((producto) => {
          const id = pid(producto);
          const checked = selectedIds.includes(id);
          return (
            <label
              key={id}
              className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0 hover:bg-muted/30"
            >
              <Checkbox
                checked={checked}
                disabled={disabled}
                onCheckedChange={(v) => toggle(id, v === true)}
              />
              <span className="min-w-0 flex-1 truncate">{pNombre(producto)}</span>
              {producto.tieneRegla && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  Con regla
                </Badge>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
