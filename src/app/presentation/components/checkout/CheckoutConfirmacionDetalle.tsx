import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Check, Download, Loader2, ShoppingCart } from 'lucide-react';
import { descargarComprobantePedidoPdfAlmacenado } from '@/app/utils/checkoutComprobantePdf';
import CartItemColores from '@/app/presentation/components/carrito/CartItemColores';
import type { CheckoutConfirmacionPedido } from '@/app/types/checkoutConfirmacion';

interface Props {
  pedido: CheckoutConfirmacionPedido;
  onSeguirComprando: () => void;
}

const metodoLabel = (m: string): string => {
  if (m === 'nequi') return 'Nequi';
  if (m === 'card') return 'Tarjeta';
  if (m === 'pse') return 'PSE';
  return m || '—';
};

function FacturacionResumen({ pedido }: { pedido: CheckoutConfirmacionPedido }) {
  const d = pedido.datosFacturacion;
  if (!d) {
    return <p className="text-sm text-muted-foreground">Sin datos de facturación.</p>;
  }
  const nombre =
    d.tipoPersona === 'JURIDICA' ? d.razonSocial : d.nombreCompleto;
  return (
    <dl className="text-sm space-y-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
      <div>
        <dt className="text-muted-foreground">Tipo</dt>
        <dd>{d.tipoPersona === 'JURIDICA' ? 'Persona jurídica' : 'Persona natural'}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Documento</dt>
        <dd>
          {d.tipoDocumento} {d.numeroDocumento}
          {d.tipoPersona === 'JURIDICA' && d.dv ? `-${d.dv}` : ''}
        </dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-muted-foreground">Nombre / Razón social</dt>
        <dd className="font-medium">{nombre}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Correo</dt>
        <dd>{d.email}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Teléfono</dt>
        <dd>{d.telefono || '—'}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-muted-foreground">Dirección</dt>
        <dd>
          {d.direccion}, {d.ciudad}, {d.departamento}
        </dd>
      </div>
    </dl>
  );
}

export default function CheckoutConfirmacionDetalle({
  pedido,
  onSeguirComprando,
}: Props): React.ReactElement {
  const [descargandoPdf, setDescargandoPdf] = useState(false);

  const handleDescargarPdf = async (): Promise<void> => {
    setDescargandoPdf(true);
    try {
      await descargarComprobantePedidoPdfAlmacenado(pedido);
      toast.success('Comprobante PDF descargado (documento almacenado de forma permanente).');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo generar el PDF');
    } finally {
      setDescargandoPdf(false);
    }
  };

  return (
    <div className="w-full max-w-2xl text-left">
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 shadow-xl">
          <Check className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold">¡Pedido confirmado!</h2>
        <p className="text-muted-foreground mt-2">
          Tu pago fue aprobado. Guarda el comprobante con el ID de transacción.
        </p>
      </div>

      <section className="rounded-lg border bg-muted/30 p-4 mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-primary mb-3">
          Pago
        </h3>
        <dl className="text-sm grid grid-cols-1 gap-2 font-mono">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
            <dt className="text-muted-foreground font-sans">ID transacción Wompi</dt>
            <dd className="break-all font-semibold text-foreground">
              {pedido.transactionId || '—'}
            </dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
            <dt className="text-muted-foreground font-sans">Consecutivo factura</dt>
            <dd className="font-semibold">{pedido.facturaId || '—'}</dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
            <dt className="text-muted-foreground font-sans">Método</dt>
            <dd className="font-sans">{metodoLabel(pedido.metodoPago)}</dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
            <dt className="text-muted-foreground font-sans">Total pagado</dt>
            <dd className="font-sans font-bold text-primary">
              ${pedido.monto.toLocaleString('es-CO')} {pedido.moneda}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border p-4 mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide mb-3">
          Facturación
        </h3>
        <FacturacionResumen pedido={pedido} />
      </section>

      <section className="rounded-lg border p-4 mb-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide mb-3">
          Productos
        </h3>
        <ul className="space-y-3">
          {pedido.items.map((item) => (
            <li
              key={`${item.id}-${item.color?.pantone || ''}`}
              className="flex gap-3 text-sm"
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-12 h-12 rounded object-cover shrink-0"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded bg-muted shrink-0 flex items-center justify-center text-[10px] text-muted-foreground text-center px-0.5"
                  aria-hidden
                >
                  Sin foto
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.name}</p>
                {item.color?.name ? (
                  <p className="text-muted-foreground">
                    Color: {item.color.name} · Cantidad: {item.quantity}
                  </p>
                ) : (
                  <p className="text-muted-foreground">Cantidad: {item.quantity}</p>
                )}
                <CartItemColores item={item} className="mt-1" compact />
              </div>
              <p className="font-semibold shrink-0">
                ${(item.price * item.quantity).toLocaleString('es-CO')}
              </p>
            </li>
          ))}
        </ul>
        <Separator className="my-4" />
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span className="text-primary">${pedido.total.toLocaleString('es-CO')}</span>
        </div>
      </section>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          variant="outline"
          size="lg"
          disabled={descargandoPdf}
          onClick={() => void handleDescargarPdf()}
        >
          {descargandoPdf ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Download className="w-5 h-5 mr-2" />
          )}
          {descargandoPdf ? 'Generando PDF…' : 'Descargar PDF'}
        </Button>
        <Button size="lg" onClick={onSeguirComprando}>
          <ShoppingCart className="w-5 h-5 mr-2" />
          Seguir comprando
        </Button>
      </div>
    </div>
  );
}
