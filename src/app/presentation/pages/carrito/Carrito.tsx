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

import { Trash2, Minus, Plus, ArrowLeft, Info, Tag, X, RefreshCw, AlertTriangle } from 'lucide-react';
import type { CartItem } from '../../../../types/common';

interface CartItemComponentProps {
  item: CartItem;
}

export default function Carrito(): React.ReactElement {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    cartSummary,
    descuentoAplicado,
    totalDescuentoCodigo,
    totalBackend,
    alertas,
    loading,
    aplicarDescuento,
    removerDescuento,
    sincronizar,
  } = useCart();

  const { user } = useAuth();
  const navigate = useNavigate();

  const [codigoInput, setCodigoInput] = useState('');
  const [applyingCode, setApplyingCode] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Usar total del backend cuando está disponible, si no calcular local
  const subtotal = cartSummary.subtotal;
  const totalFinal = totalBackend > 0 ? totalBackend : cartSummary.total;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleQuantityChange = async (item: CartItem, newQuantity: number): Promise<void> => {
    if (newQuantity < 1) return;
    try {
      await updateQuantity(item.id, item.color?.pantone, newQuantity);
      toast.success('Cantidad actualizada', { autoClose: 1000 });
    } catch (err: any) {
      toast.error(err.message || 'Error actualizando cantidad');
    }
  };

  const handleRemoveItem = async (item: CartItem): Promise<void> => {
    const result = await Swal({
      title: '¿Estás seguro?',
      text: '¿Deseas eliminar este producto del carrito?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      try {
        await removeFromCart(item.id, item.color?.pantone);
        toast.success('Producto eliminado del carrito');
      } catch {
        toast.error('Error eliminando producto');
      }
    }
  };

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

  const handleSincronizar = async (): Promise<void> => {
    setSyncing(true);
    try {
      await sincronizar();
      toast.success('Carrito sincronizado con inventario');
    } catch {
      toast.error('Error sincronizando carrito');
    } finally {
      setSyncing(false);
    }
  };

  const handleProceedToCheckout = async (): Promise<void> => {
    if (!user) {
      const result = await Swal({
        title: 'Iniciar Sesión Requerido',
        text: 'Necesitas iniciar sesión para continuar con la compra.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Ir a Login',
        cancelButtonText: 'Cancelar',
      });
      if (result.isConfirmed) navigate('/login', { state: { returnUrl: '/checkout' } });
      return;
    }
    navigate('/checkout');
  };

  // ── Item component ────────────────────────────────────────────────────────

  const CartItemComponent = ({ item }: CartItemComponentProps): React.ReactElement => {
    const alerta = alertas.find(a => a.sku === (item as any).sku);
    return (
      <div className="p-4 flex items-start sm:items-center gap-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors">
        <img
          src={item.image}
          alt={item.name}
          className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            const t = e.target as HTMLImageElement;
            t.onerror = null;
            t.src = 'https://placehold.co/80x80/f3f4f6/a3a3a3?text=IMG';
          }}
        />

        <div className="flex-1 space-y-1 sm:space-y-0 sm:flex sm:justify-between sm:items-center">
          <div>
            <h3 className="text-base font-semibold">{item.name}</h3>
            {item.color?.name && (
              <p className="text-sm text-muted-foreground">Tono: {item.color.name}</p>
            )}
            {!item.available && (
              <Badge variant="destructive" className="text-xs mt-1">Stock insuficiente</Badge>
            )}
            {alerta && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {alerta.mensaje}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-2 sm:mt-0">
            <div className="flex items-center border border-input rounded-md">
              <Button
                onClick={() => handleQuantityChange(item, item.quantity - 1)}
                variant="ghost" size="icon" className="h-8 w-8 rounded-r-none"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="px-3 text-sm font-semibold min-w-[30px] text-center">{item.quantity}</span>
              <Button
                onClick={() => handleQuantityChange(item, item.quantity + 1)}
                variant="ghost" size="icon" className="h-8 w-8 rounded-l-none"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <p className="text-base font-bold w-24 text-right">
                ${(item.price * item.quantity).toLocaleString('es-CO')}
              </p>
              <Button
                variant="ghost" size="icon"
                className="text-destructive hover:bg-destructive/10 h-8 w-8"
                onClick={() => handleRemoveItem(item)}
              >
                <Trash2 className="h-4 w-4" />
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

      <div className="flex items-center gap-3 mb-8 border-b pb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/productos')}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold">Carrito de Compras</h1>
        {loading && <span className="text-sm text-muted-foreground">Cargando...</span>}
      </div>

      {/* Alertas de sincronización */}
      {alertas.length > 0 && (
        <Alert className="mb-4 border-amber-300 bg-amber-50 text-amber-800">
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
        <Alert className="bg-blue-50 border-blue-200 text-blue-700">
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
                {cartItems.map((item: CartItem) => (
                  <CartItemComponent key={String(item.id) + (item.color?.pantone || '')} item={item} />
                ))}
              </CardContent>
            </Card>

            <Button
              variant="outline" size="sm"
              onClick={handleSincronizar}
              disabled={syncing}
              className="text-muted-foreground"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Verificar precios y stock
            </Button>
          </div>

          {/* ── Resumen ── */}
          <div className="md:col-span-4">
            <Card className="shadow-xl border rounded-xl sticky top-8">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-semibold border-b pb-3">Resumen de la Orden</h2>

                {/* Código de descuento */}
                {descuentoAplicado ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 text-green-700 text-sm">
                      <Tag className="w-4 h-4" />
                      <span className="font-mono font-semibold">{descuentoAplicado.codigo}</span>
                      <span className="text-xs">
                        ({descuentoAplicado.tipo === 'PORCENTAJE'
                          ? `${descuentoAplicado.valor}%`
                          : `$${descuentoAplicado.valor.toLocaleString('es-CO')}`})
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-green-700 hover:bg-green-100" onClick={handleRemoverCodigo}>
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
                    <p className="font-medium">${subtotal.toLocaleString('es-CO')}</p>
                  </div>

                  {totalDescuentoCodigo > 0 && (
                    <div className="flex justify-between text-green-600">
                      <p>Descuento ({descuentoAplicado?.codigo})</p>
                      <p className="font-medium">-${totalDescuentoCodigo.toLocaleString('es-CO')}</p>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between pt-1">
                    <p className="text-lg font-bold">Total</p>
                    <p className="text-lg font-bold text-primary">
                      ${totalFinal.toLocaleString('es-CO')}
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
