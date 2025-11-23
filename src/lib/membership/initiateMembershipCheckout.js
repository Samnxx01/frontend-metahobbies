import { createMembership } from '@/lib/membership/createMembership';

/**
 * Encapsula la lógica de validación, petición al backend (mocked via createMembership)
 * y construcción de los parámetros para el checkout.
 * Devuelve un objeto listo para pasar a `generateCheckout`.
 *
 * @param {Object} options
 * @param {Object} options.personalInfo
 * @param {number} options.price
 * @param {string} [options.token]
 */
export async function initiateMembershipCheckout({ personalInfo = {}, price, token }) {
  const { nombre, apellido, email, telefono, legalId, legalIdType } = personalInfo;

  if (!email || !legalId || !legalIdType) {
    throw new Error('Faltan campos requeridos (email o identificación).');
  }
  if (typeof price !== 'number' || Number.isNaN(price)) {
    throw new Error('Precio inválido.');
  }

  // Llamada al "backend" (mock o real) que valida y crea la membresía en estado pendiente
  const data = await createMembership({ personalInfo, price, token });

  if (!data || data.canCreate === false) {
    throw new Error(data?.message || 'No es posible crear la membresía.');
  }

  if (!data.reference || !data.redirectUrl) {
    throw new Error('La respuesta del servidor no incluye referencia o URL de redirección.');
  }

  const checkoutParams = {
    currency: 'COP',
    amountInCents: Math.round((price || 0) * 100),
    reference: data.reference,
    redirectUrl: data.redirectUrl,
    customerData: {
      email,
      fullName: `${nombre} ${apellido}`.trim(),
      phoneNumber: telefono,
      phoneNumberPrefix: '+57',
      legalId: legalId || '',
      legalIdType: legalIdType || 'CC',
    },
  };

  if (data.signature) checkoutParams.signature = data.signature;
  if (data.taxInCents) checkoutParams.taxInCents = data.taxInCents;

  return checkoutParams;
}
