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

export async function generateCheckout({
  currency,
  amountInCents,
  reference,
  redirectUrl,
  customerData = {},
   taxInCents,
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
  if (!integritySecret) {
    throw new Error("Falta el parámetro integritySecret para la firma");
  }
  if (!window.WidgetCheckout) {
    throw new Error(
      "WidgetCheckout no está disponible en window. Asegúrate de cargar el script https://checkout.wompi.co/widget.js antes de llamar a esta función."
    );
  }

  // Construir la cadena para la firma
  //   "<Reference><Amount><Currency><IntegritySecret>"
  const cadenaConcatenada = `${reference}${amountInCents}${currency}${integritySecret}`;
  const encondedText = new TextEncoder().encode(cadenaConcatenada);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encondedText);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const integrity = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  console.log(cadenaConcatenada);
  console.log({
    currency,
    amountInCents,
    reference,
    publicKey: publicKey,
  signature: {integrity},  
    taxInCents,
    customerData,
  });
   const checkout = new window.WidgetCheckout({
    currency,
    amountInCents,
    reference,
    publicKey: publicKey,
  signature: {integrity},  
    taxInCents,
    customerData,
  });

  checkout.open(function (result) {
    var transaction = result.transaction;
    console.log("Transaction ID: ", transaction?.id);
    console.log("Transaction object: ", transaction);
  });
}
