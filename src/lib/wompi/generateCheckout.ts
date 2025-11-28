import { computeIntegrity } from './generateIntegrity';
import type { 
  CheckoutParams, 
  WidgetCheckoutResult 
} from '@/lib/types/wompi';

/**
 * Abre el WidgetCheckout de Wompi con los parámetros dados.
 */
export async function generateCheckout({
  currency,
  amountInCents,
  reference,
  redirectUrl,
  customerData,
  taxInCents,
  signature: providedSignature,
}: CheckoutParams): Promise<void> {
  const publicKey = import.meta.env.VITE_WOMPI_PUBLIC_KEY;
  const integritySecret = import.meta.env.VITE_WOMPI_INTEGRITY_SECRET;
  
  console.log(publicKey);
  console.log(integritySecret);
  
  if (!publicKey) {
    throw new Error(
      "No se encontró la variable de entorno VITE_WOMPI_PUBLIC_KEY"
    );
  }
  
  // integritySecret is only required if a signature is not provided by the server
  if (!providedSignature && !integritySecret) {
    throw new Error("Falta el parámetro integritySecret para la firma y no se proporcionó una firma desde el servidor");
  }
  
  if (!window.WidgetCheckout) {
    throw new Error(
      "WidgetCheckout no está disponible en window. Asegúrate de cargar el script https://checkout.wompi.co/widget.js antes de llamar a esta función."
    );
  }
  
  let integrity: string | null = null;
  
  if (providedSignature) {
    // Accept either a string or an object like { integrity }
    if (typeof providedSignature === 'string') {
      integrity = providedSignature;
    } else if (typeof providedSignature === 'object' && providedSignature.integrity) {
      integrity = providedSignature.integrity;
    }
  } else if (integritySecret) {
    integrity = await computeIntegrity({ reference, amountInCents, currency, integritySecret });
  }
  
  if (!integrity) {
    throw new Error('No se pudo generar o encontrar la firma de integridad');
  }

  console.log({
    currency,
    amountInCents,
    reference,
    publicKey: publicKey,
    signature: { integrity },
    taxInCents,
    customerData,
  });
  
  // redirectUrl may be used by your backend flow; log it to avoid unused variable lint
  console.log('redirectUrl:', redirectUrl);

  const checkout = new window.WidgetCheckout({
    currency,
    amountInCents,
    reference,
    publicKey: publicKey,
    signature: { integrity },
    taxInCents,
    customerData,
  });

  checkout.open(function (result: WidgetCheckoutResult) {
    const transaction = result.transaction;
    console.log("Transaction ID: ", transaction?.id);
    console.log("Transaction object: ", transaction);
  });
}