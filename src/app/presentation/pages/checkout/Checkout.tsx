import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Check, Truck, ShoppingCart, Loader2 } from 'lucide-react';
import { useCart } from '../../../providers/CartProvider';
import carritoService from '../../../services/carritoService';
import type { CartItem } from '../../../../types/common';

// ── Stepper ────────────────────────────────────────────────────────────────

const STEPS = ['Revisión del Pedido', 'Confirmación'];

interface StepperProps { activeStep: number }

const CustomStepper = ({ activeStep }: StepperProps): React.ReactElement => (
  <div className="flex justify-between items-center mb-10 relative after:absolute after:inset-x-0 after:top-[18px] after:h-0.5 after:-translate-y-1/2 after:bg-border after:z-0">
    {STEPS.map((label, index) => {
      const isCompleted = index < activeStep;
      const isActive = index === activeStep;
      return (
        <div key={label} className="flex flex-col items-center w-full z-10">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ring-4 ring-background transition-colors
            ${isCompleted || isActive ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground border border-input'}`}>
            {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
          </div>
          <span className={`mt-2 text-xs sm:text-sm font-medium ${isActive ? 'text-primary font-semibold' : 'text-foreground'}`}>
            {label}
          </span>
        </div>
      );
    })}
  </div>
);

// ── Checkout ───────────────────────────────────────────────────────────────

export default function Checkout(): React.ReactElement {
  const navigate = useNavigate();
  const {
    cartItems,
    cartSummary,
    backendCartId,
    descuentoAplicado,
    totalDescuentoCodigo,
    totalBackend,
    clearCart,
    sincronizar,
  } = useCart();

  const [activeStep, setActiveStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [ventaReferencia, setVentaReferencia] = useState('');

  const totalFinal = totalBackend > 0 ? totalBackend : cartSummary.total;

  const handleConfirmarPedido = async (): Promise<void> => {
    if (!backendCartId) {
      toast.error('No se encontró el carrito. Recarga la página e intenta de nuevo.');
      return;
    }

    setProcessing(true);
    try {
      // Sincronizar antes del checkout para detectar cambios de stock/precio
      await sincronizar();

      const sinStock = cartItems.filter(i => !i.available);
      if (sinStock.length > 0) {
        toast.error(`Stock insuficiente para: ${sinStock.map(i => i.name).join(', ')}`);
        return;
      }

      const result = await carritoService.checkout(backendCartId);
      setVentaReferencia(result.ventaReferencia);
      await clearCart();
      setActiveStep(1);
    } catch (err: any) {
      toast.error(err.message || 'Error procesando el pedido');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Finalizar Compra</h1>

      <CustomStepper activeStep={activeStep} />

      <div className="flex justify-center">

        {activeStep === 0 && (
          <Card className="w-full max-w-2xl shadow-xl border">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" /> Revisión del Pedido
              </h2>

              <div className="space-y-3 mb-6">
                {cartItems.map((item: CartItem) => (
                  <div key={String(item.id) + (item.color?.pantone || '')} className="flex items-center gap-3 text-sm">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded-md flex-shrink-0"
                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        const t = e.target as HTMLImageElement;
                        t.onerror = null;
                        t.src = 'https://placehold.co/48x48/f3f4f6/a3a3a3?text=IMG';
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      {item.color?.name && (
                        <p className="text-xs text-muted-foreground">Tono: {item.color.name}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold">${(item.price * item.quantity).toLocaleString('es-CO')}</p>
                      <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="mb-4" />

              <div className="space-y-2 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${cartSummary.subtotal.toLocaleString('es-CO')}</span>
                </div>
                {totalDescuentoCodigo > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Descuento ({descuentoAplicado?.codigo})</span>
                    <span>-${totalDescuentoCodigo.toLocaleString('es-CO')}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>Total</span>
                  <span className="text-primary">${totalFinal.toLocaleString('es-CO')}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-12" onClick={() => navigate('/carrito')}>
                  Volver al carrito
                </Button>
                <Button
                  className="flex-1 h-12 font-semibold"
                  onClick={handleConfirmarPedido}
                  disabled={processing || cartItems.length === 0}
                >
                  {processing
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
                    : 'Confirmar Pedido'
                  }
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeStep === 1 && (
          <Card className="w-full max-w-2xl shadow-xl border">
            <CardContent className="p-8 sm:p-10 text-center">
              <div className="w-20 h-20 rounded-full bg-green-500 text-white flex items-center justify-center mx-auto mb-6 shadow-xl">
                <Check className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold mb-2">¡Pedido Confirmado!</h2>
              <p className="text-muted-foreground mb-3">
                Tu pedido ha sido procesado y el inventario actualizado.
              </p>
              {ventaReferencia && (
                <p className="text-sm font-mono bg-muted rounded-md px-4 py-2 inline-block mb-6">
                  Referencia: <strong>{ventaReferencia}</strong>
                </p>
              )}
              <Button size="lg" onClick={() => navigate('/productos')}>
                <ShoppingCart className="w-5 h-5 mr-2" />
                Seguir Comprando
              </Button>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
