import { createMembership } from '@/lib/membership/createMembership';
import type { 
   MembershipCheckoutOptions, 
  CheckoutParams,
  CreateMembershipResponse,
  } from '@/lib/types/wompi';

/**
 * Encapsula la lógica de validación, petición al backend y construcción 
 * de los parámetros para el checkout de Wompi.
 * 
 * @param personalInfo - Datos específicos para Wompi checkout (NO es el modelo User del backend)
 * @param price - Precio de la membresía
 * @param token - Token de autenticación del usuario logueado
 * @returns Parámetros listos para pasar a `generateCheckout` de Wompi
 */
export async function initiateMembershipCheckout({ 
  personalInfo, 
  price, 
  token 
}: MembershipCheckoutOptions): Promise<CheckoutParams> {
  const { nombre, apellido, email, telefono, legalId, legalIdType } = personalInfo;

  if (!email || !legalId || !legalIdType) {
    throw new Error('Faltan campos requeridos (email o identificación).');
  }
  if (typeof price !== 'number' || Number.isNaN(price)) {
    throw new Error('Precio inválido.');
  }

  // Llamada al "backend" (mock o real) que valida y crea la membresía en estado pendiente
  const response: CreateMembershipResponse = await createMembership({ personalInfo, price, token });

  if (!response.success) {
    throw new Error(response.msg || 'No es posible crear la membresía.');
  }

  const { data } = response;
  if (!data.referencia || !data.wompiLink) {
    throw new Error('La respuesta del servidor no incluye referencia o enlace de Wompi.');
  }

  const checkoutParams: CheckoutParams = {
    currency: 'COP',
    amountInCents: Math.round((price || 0) * 100),
    reference: data.referencia,
    redirectUrl: data.wompiLink,
    customerData: {
      email,
      fullName: `${nombre} ${apellido}`.trim(),
      phone_number: telefono??'',
      phoneNumberPrefix: '+57',
      legal_id: legalId || '',
      legal_id_type: legalIdType || 'CC',
    },
  };

  // El backend ya maneja la firma de Wompi internamente
  // No necesitamos signature o taxInCents aquí

  return checkoutParams;
}