import React from 'react';
import { Loader2, RefreshCw, Save, ShoppingCart, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { ProductoCatalogoLimites } from '@/app/services/productosService';
import { DEFAULT_PRODUCTO_CATALOGO_LIMITES } from '@/app/hooks/useProductoCatalogoConfig';

type Props = {
  value: ProductoCatalogoLimites;
  onChange: (partial: Partial<ProductoCatalogoLimites>) => void;
  onSave: () => void | Promise<void>;
  onReload?: () => void | Promise<void>;
  saving?: boolean;
  loading?: boolean;
  compact?: boolean;
};

function FieldHint({ children }: { children: React.ReactNode }): React.ReactElement {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

export default function ConfigCatalogoProductosPanel({
  value,
  onChange,
  onSave,
  onReload,
  saving = false,
  loading = false,
  compact = false,
}: Props): React.ReactElement {
  const wrap = compact
    ? ({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) => (
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
        {children}
      </div>
    )
    : ({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) => (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{desc}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    );

  const TextosSection = wrap({
    title: 'Límites de texto del catálogo',
    desc: 'Máximo de caracteres permitidos al crear o editar productos de venta.',
    children: (
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="cfg-nombre-max">Nombre del producto</Label>
          <Input
            id="cfg-nombre-max"
            type="number"
            min={10}
            max={500}
            disabled={loading || saving}
            value={value.nombreMax}
            onChange={(e) => onChange({ nombreMax: Number(e.target.value || DEFAULT_PRODUCTO_CATALOGO_LIMITES.nombreMax) })}
          />
          <FieldHint>Rango permitido: 10 – 500</FieldHint>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cfg-descripcion-max">Descripción</Label>
          <Input
            id="cfg-descripcion-max"
            type="number"
            min={50}
            max={10000}
            disabled={loading || saving}
            value={value.descripcionMax}
            onChange={(e) => onChange({ descripcionMax: Number(e.target.value || DEFAULT_PRODUCTO_CATALOGO_LIMITES.descripcionMax) })}
          />
          <FieldHint>Rango permitido: 50 – 10.000</FieldHint>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cfg-descripcion-corta-max">Descripción corta</Label>
          <Input
            id="cfg-descripcion-corta-max"
            type="number"
            min={20}
            max={5000}
            disabled={loading || saving}
            value={value.descripcionCortaMax}
            onChange={(e) => onChange({
              descripcionCortaMax: Number(e.target.value || DEFAULT_PRODUCTO_CATALOGO_LIMITES.descripcionCortaMax),
            })}
          />
          <FieldHint>Rango permitido: 20 – 5.000</FieldHint>
        </div>
      </div>
    ),
  });

  const MiniCartSection = wrap({
    title: 'Mini-carrito (navbar)',
    desc: 'Comportamiento del carrito flotante en la tienda pública.',
    children: (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cfg-mini-cart-umbral">Panel lateral tras N productos</Label>
          <Input
            id="cfg-mini-cart-umbral"
            type="number"
            min={1}
            max={20}
            disabled={loading || saving}
            value={value.miniCartSidePanelThreshold}
            onChange={(e) => onChange({
              miniCartSidePanelThreshold: Number(e.target.value || DEFAULT_PRODUCTO_CATALOGO_LIMITES.miniCartSidePanelThreshold),
            })}
          />
          <FieldHint>Si hay más productos distintos que este número, se abre panel a la derecha.</FieldHint>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cfg-mini-cart-max">Máx. productos visibles</Label>
          <Input
            id="cfg-mini-cart-max"
            type="number"
            min={1}
            max={50}
            disabled={loading || saving}
            value={value.miniCartMaxProductos}
            onChange={(e) => onChange({
              miniCartMaxProductos: Number(e.target.value || DEFAULT_PRODUCTO_CATALOGO_LIMITES.miniCartMaxProductos),
            })}
          />
          <FieldHint>En el preview del carrito; el resto se ve en la página /carrito.</FieldHint>
        </div>
      </div>
    ),
  });

  return (
    <div className="space-y-4">
      {!compact ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Type className="h-5 w-5 text-primary" />
              Parametrización del catálogo de productos
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Valores persistidos en <code className="text-xs">productoCatalogoConfigs</code> y aplicados al guardar productos y al mini-carrito.
            </p>
          </div>
          <div className="flex gap-2">
            {onReload ? (
              <Button type="button" variant="outline" size="sm" disabled={loading || saving} onClick={() => { void onReload(); }}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ml-2">Recargar</span>
              </Button>
            ) : null}
            <Button type="button" size="sm" disabled={loading || saving} onClick={() => { void onSave(); }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="ml-2">Guardar cambios</span>
            </Button>
          </div>
        </div>
      ) : null}

      {TextosSection}

      {!compact ? <Separator /> : <div className="pt-2" />}

      <div className={compact ? '' : 'relative'}>
        {!compact ? (
          <ShoppingCart className="absolute right-4 top-4 h-5 w-5 text-muted-foreground/40 pointer-events-none hidden sm:block" />
        ) : null}
        {MiniCartSection}
      </div>

      {compact ? (
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          {onReload ? (
            <Button type="button" variant="outline" disabled={loading || saving} onClick={() => { void onReload(); }}>
              Recargar
            </Button>
          ) : null}
          <Button type="button" disabled={loading || saving} onClick={() => { void onSave(); }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
