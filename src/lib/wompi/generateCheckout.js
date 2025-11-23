/**
 * Abre el WidgetCheckout de Wompi con los parámetros dados.
 * @param {Object} params - Parámetros del checkout
 * @param {string} params.currency
 * @param {number} params.amountInCents
 * @param {string} params.reference
 * @param {string} params.redirectUrl
 * @param {Object} [params.customerData]
 * @param {Object} [params.shippingAddress]
 */

import { computeIntegrity } from './generateIntegrity';

export async function generateCheckout({
  currency,
  amountInCents,
  reference,
  redirectUrl,
  customerData = {},
   taxInCents,
  signature: providedSignature,
}) {
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
  let integrity = null;
  if (providedSignature) {
    // Accept either a string or an object like { integrity }
    if (typeof providedSignature === 'string') {
      integrity = providedSignature;
    } else if (providedSignature.integrity) {
      integrity = providedSignature.integrity;
    }
  } else {
    integrity = await computeIntegrity({ reference, amountInCents, currency, integritySecret });
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

  checkout.open(function (result) {
    var transaction = result.transaction;
    console.log("Transaction ID: ", transaction?.id);
    console.log("Transaction object: ", transaction);
  });
}
