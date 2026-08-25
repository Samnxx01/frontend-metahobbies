import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { swalFire as Swal } from '@/lib/sweetalert';
import { useCart } from '../../../providers/CartProvider';
import { useAuth } from '../../../providers/AuthProvider';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getGovernedLoginPath } from '@/app/services/governedNavigation';
import {
  buildCheckoutNavigationState,
  CHECKOUT_PAYMENT_PATH,
  getCheckoutPaymentPath,
} from '@/app/services/checkoutNavigation';
import { formatCOP } from '@/lib/utils';
import DatosFacturacionInvitadoModal from '@/app/presentation/components/carrito/DatosFacturacionInvitadoModal';
import carritoService from '@/app/services/carritoService';
import { hydrateGeneradorEnlaceVentasAttribution } from '@/app/services/generadorEnlaceVentasFlow';

import CartItemVariantQuantities from '@/app/presentation/components/carrito/CartItemVariantQuantities';
import { groupCartItemsByProduct } from '@/app/presentation/components/carrito/cartColorQtyCache';
import { Loader2, Trash2, ArrowLeft, Info, Tag, X, AlertTriangle } from 'lucide-react';
import type { CartItem } from '../../../../types/common';

interface CartProductGroupProps {
  lines: CartItem[];
  name: string;
  image: string;
  removing: boolean;
  onRemove: () => void;
}

export default function Carrito(): React.ReactElement {
  const {
    cartItems,
    removeFromCart,
    updateVariantQuantity,
    addColorVariant,
    getAvailableColors,
    cartSummary,
    descuentoAplicado,
    totalDescuentoCodigo,
    totalImpuestos,
    detalleImpuestos,
    backendCartId,
    totalBackend,
    alertas,
    loading,
    aplicarDescuento,
    removerDescuento,
  } = useCart();

  const { user } = useAuth();
  const navigate = useNavigate();

  const [codigoInput, setCodigoInput] = useState('');
  const [applyingCode, setApplyingCode] = useState(false);
  const [billingGuestOpen, setBillingGuestOpen] = useState(false);
  const [removingProductId, setRemovingProductId] = useState<string | null>(null);
  const [pendingVariant, setPendingVariant] = useState<{ itemId: string; pantone: string } | null>(null);

  // Usar total del backend cuando está disponible, si no calcular local
  const subtotal = cartSummary.subtotal;
  const totalFinal = totalBackend > 0 ? totalBackend : cartSummary.total;
  const impuestos = totalBackend > 0 ? totalImpuestos : cartSummary.tax;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleVariantQuantityChange = async (
    line: CartItem,
    color: NonNullable<CartItem['color']>,
    newQuantity: number,
  ): Promise<void> => {
    const key = { itemId: line.backendItemId || String(line.id), pantone: color.pantone };
    if (pendingVariant && pendingVariant.itemId === key.itemId && pendingVariant.pantone === key.pantone) {
      return; // ya hay una petición en curso para esta línea: ignora el clic extra
    }
    setPendingVariant(key);
    try {
      await updateVariantQuantity(line, color, newQuantity);
      if (newQuantity < 1) {
        toast.success('Tono eliminado del carrito', { autoClose: 1000 });
      } else {
        toast.success('Cantidad actualizada', { autoClose: 1000 });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error actualizando cantidad');
    } finally {
      setPendingVariant(null);
    }
  };

  const handleAddColorVariant = async (
    line: CartItem,
    color: NonNullable<CartItem['color']>,
  ): Promise<void> => {
    const key = { itemId: line.backendItemId || String(line.id), pantone: color.pantone };
    if (pendingVariant && pendingVariant.itemId === key.itemId && pendingVariant.pantone === key.pantone) return;
    setPendingVariant(key);
    try {
      await addColorVariant(line, color, 1);
      toast.success(`Se agregó ${color.name} al carrito`, { autoClose: 1500 });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error agregando el color');
    } finally {
      setPendingVariant(null);
    }
  };

  const handleRemoveGroup = async (productId: string, lines: CartItem[]): Promise<void> => {
    if (removingProductId) return; // ya hay una eliminación en curso: evita disparos duplicados
    const result = await Swal({
      title: '¿Estás seguro?',
      text: `¿Deseas eliminar ${lines[0]?.name || 'este producto'} del carrito?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      setRemovingProductId(productId);
      try {
        for (const line of lines) {
          await removeFromCart(line.id, line.color?.pantone, line.backendItemId);
        }
        toast.success('Producto eliminado del carrito');
      } catch {
        toast.error('Error eliminando producto');
      } finally {
        setRemovingProductId(null);
      }
    }
  };

  const cartGroups = groupCartItemsByProduct(cartItems);

  const handleAplicarCodigo = async (): Promise<void> => {
    if (!codigoInput.trim()) return;
    setApplyingCode(true);
    try {
      await aplicarDescuento(codigoInput.trim());
      toast.success('Código de descuento aplicado');
      setCodigoInput('');
    } catch (err: any) {
      toast.error(err.message || 'Código inválido o expirado');
    } finally {
      setApplyingCode(false);
    }
  };

  const handleRemoverCodigo = async (): Promise<void> => {
    try {
      await removerDescuento();
      toast.info('Código de descuento removido');
    } catch {
      toast.error('Error removiendo descuento');
    }
  };

  const handleProceedToCheckout = async (): Promise<void> => {
    if (!user) {
      const esGenerador = await hydrateGeneradorEnlaceVentasAttribution(window.location.search);
      if (esGenerador) {
        setBillingGuestOpen(true);
        return;
      }

      const result = await Swal({
        title: 'Iniciar Sesión Requerido',
        text: 'Necesitas iniciar sesión para continuar con la compra.',
        icon: 'info',
        showCloseButton: true,
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Ir a Login',
        cancelButtonText: 'Seguir sin registrarse',
      });
      if (result.isConfirmed) navigate(getGovernedLoginPath(), { state: { returnUrl: '/checkout' } });
      if (result.isDismissed && result.dismiss === 'cancel') setBillingGuestOpen(true);
      return;
    }
    navigate('/checkout');
  };

  // ── Item component ────────────────────────────────────────────────────────

  const CartProductGroupRow = ({ lines, name, image, removing, onRemove }: CartProductGroupProps): React.ReactElement => {
    const groupTotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const stockAlert = lines.some((line) => !line.available);
    const alerta = alertas.find((a) => lines.some((line) => a.sku === (line as { sku?: string }).sku));
    return (
      <div className="p-4 flex items-start sm:items-center gap-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors">
        <img
          src={image}
          alt={name}
          className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            const t = e.target as HTMLImageElement;
            t.onerror = null;
            t.src = 'https://placehold.co/80x80/f3f4f6/a3a3a3?text=IMG';
          }}
        />

        <div className="flex-1 space-y-1 sm:space-y-0 sm:flex sm:justify-between sm:items-center">
          <div>
            <h3 className="text-base font-semibold">{name}</h3>
            {stockAlert && (
              <Badge variant="destructive" className="text-xs mt-1">Stock insuficiente</Badge>
            )}
            {lines[0]?.purchaseLimit != null ? (
              <p className="text-xs text-muted-foreground">Cantidad máxima por compra: {lines[0].purchaseLimit}</p>
            ) : lines[0]?.stock != null ? (
              <p className="text-xs text-muted-foreground">Disponible para venta: {lines[0].stock}</p>
            ) : null}
            {alerta && (
              <p className="text-xs text-primary mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {alerta.mensaje}
              </p>
            )}
            <div className="mt-2 space-y-2">
              {lines.map((line) => (
                <CartItemVariantQuantities
                  key={line.backendItemId || `${line.id}-${line.color?.pantone || 'default'}`}
                  item={line}
                  max={
                    line.stock != null && line.purchaseLimit != null
                      ? Math.min(line.stock, line.purchaseLimit)
                      : line.purchaseLimit ?? line.stock ?? null
                  }
                  onQuantityChange={(color, newQuantity) => {
                    void handleVariantQuantityChange(line, color, newQuantity);
                  }}
                  availableColors={getAvailableColors(line.id)}
                  onAddColor={(color) => { void handleAddColorVariant(line, color); }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-2 sm:mt-0">
            <div className="flex items-center gap-2">
              <p className="text-base font-bold w-24 text-right">
                {formatCOP(groupTotal)}
              </p>
              <Button
                variant="ghost" size="icon"
                className="text-destructive hover:bg-destructive/10 h-8 w-8"
                disabled={removing}
                onClick={onRemove}
              >
                {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <DatosFacturacionInvitadoModal
        open={billingGuestOpen}
        onOpenChange={setBillingGuestOpen}
        persistDraft={false}
        onContinue={async (datosFacturacion) => {
          setBillingGuestOpen(false);
          navigate(getCheckoutPaymentPath(), {
            state: buildCheckoutNavigationState({ datosFacturacion }),
          });
        }}
      />

      <div className="flex items-center gap-3 mb-8 border-b pb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/productos')}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold">Carrito de Compras</h1>
        {loading && <span className="text-sm text-muted-foreground">Cargando...</span>}
      </div>

      {/* Alertas de sincronización */}
      {alertas.length > 0 && (
        <Alert variant="warning" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Actualizaciones en tu carrito</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside text-sm mt-1 space-y-1">
              {alertas.map((a, i) => <li key={i}>{a.mensaje}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {cartItems.length === 0 ? (
        <Alert variant="info">
          <Info className="h-4 w-4" />
          <AlertTitle>Carrito Vacío</AlertTitle>
          <AlertDescription>Tu carrito está vacío. ¡Agrega productos para comenzar!</AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

          {/* ── Ítems ── */}
          <div className="md:col-span-8 space-y-4">
            <Card className="shadow-lg border rounded-xl overflow-hidden">
              <CardContent className="p-0">
                {cartGroups.map((group) => (
                  <CartProductGroupRow
                    key={group.productId}
                    lines={group.lines}
                    name={group.name}
                    image={group.image}
                    removing={removingProductId === group.productId}
                    onRemove={() => { void handleRemoveGroup(group.productId, group.lines); }}
                  />
                ))}
              </CardContent>
            </Card>
          </div>

          {/* ── Resumen ── */}
          <div className="md:col-span-4">
            <Card className="shadow-xl border rounded-xl sticky top-8">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-semibold border-b pb-3">Resumen de la Orden</h2>

                {/* Código de descuento */}
                {descuentoAplicado ? (
                  <div className="flex items-center justify-between bg-secondary/20 border border-secondary/40 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 text-secondary-foreground text-sm">
                      <Tag className="w-4 h-4" />
                      <span className="font-mono font-semibold">{descuentoAplicado.codigo}</span>
                      <span className="text-xs">
                        ({descuentoAplicado.tipo === 'PORCENTAJE'
                          ? `${descuentoAplicado.valor}%`
                          : formatCOP(descuentoAplicado.valor)})
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-secondary-foreground hover:bg-secondary/20" onClick={handleRemoverCodigo}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Código de descuento"
                      value={codigoInput}
                      onChange={e => setCodigoInput(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && handleAplicarCodigo()}
                      className="h-9 text-sm"
                    />
                    <Button
                      size="sm" variant="outline"
                      onClick={handleAplicarCodigo}
                      disabled={applyingCode || !codigoInput.trim()}
                      className="shrink-0"
                    >
                      <Tag className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                <Separator />

                {/* Líneas de totales */}
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <p className="text-muted-foreground">Subtotal</p>
                    <p className="font-medium">{formatCOP(subtotal)}</p>
                  </div>

                  {totalDescuentoCodigo > 0 && (
                    <div className="flex justify-between text-primary">
                      <p>Descuento ({descuentoAplicado?.codigo})</p>
                      <p className="font-medium">-{formatCOP(totalDescuentoCodigo)}</p>
                    </div>
                  )}

                  {detalleImpuestos.length > 0 ? (
                    <div className="space-y-1 rounded-lg border border-primary/20 bg-primary/5 p-2">
                      <p className="text-xs font-semibold text-muted-foreground">Detalle IVA</p>
                      {detalleImpuestos.map((regla) => (
                        <div key={regla.codigo} className="flex justify-between gap-3 text-xs">
                          <span className="truncate">
                            {regla.nombre.split('_')[0]} ({Number(regla.tarifa || 0).toFixed(2)}%)
                          </span>
                          <span className="font-medium">{formatCOP(regla.valor)}</span>
                        </div>
                      ))}
                    </div>
                  ) : impuestos > 0 ? (
                    <div className="flex justify-between">
                      <p className="text-muted-foreground">IVA / impuestos</p>
                      <p className="font-medium">{formatCOP(impuestos)}</p>
                    </div>
                  ) : null}

                  <Separator />

                  <div className="flex justify-between pt-1">
                    <p className="text-lg font-bold">Total</p>
                    <p className="text-lg font-bold text-primary">
                      {formatCOP(totalFinal)}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleProceedToCheckout}
                  className="w-full h-12 text-base font-semibold"
                  disabled={cartItems.length === 0 || cartItems.some(i => !i.available)}
                >
                  Proceder al Pago
                </Button>

                <Button variant="outline" onClick={() => navigate('/productos')} className="w-full h-12 text-base">
                  Continuar Comprando
                </Button>
              </CardContent>
            </Card>
          </div>

        </div>
      )}
    </div>
  );
}
