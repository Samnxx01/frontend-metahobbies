import { computeIntegrity } from '@/lib/wompi/generateIntegrity';

/**
 * Simula el comportamiento del endpoint backend que valida y crea una membresía en estado "pago pendiente".
 * - Valida campos mínimos
 * - Genera referencia y redirectUrl
 * - Genera la firma usando computeIntegrity
 *
 * En producción, esta lógica debe vivir en el servidor.
 */
export async function createMembership({ personalInfo = {}, price, token }) {
  const { nombre, apellido, email, telefono, legalId, legalIdType } = personalInfo;

  if (!email || !legalId || !legalIdType) {
    return { canCreate: false, message: 'Faltan campos requeridos (email o identificación).' };
  }

  if (typeof price !== 'number' || Number.isNaN(price)) {
    return { canCreate: false, message: 'Precio inválido.' };
  }

  // Backend would create DB record here, check middleware, membership rules, referral links, etc.
  const timestamp = Date.now();
  const reference = `membership-${legalId}-${timestamp}`;
  const redirectUrl = 'https://transaction-redirect.wompi.co/check';
  const amountInCents = Math.round(price * 100);

  // Use integrity secret from env (in production the server uses its secret)
  const integritySecret = import.meta.env.VITE_WOMPI_INTEGRITY_SECRET || 'mock_secret_for_local';

  const integrity = await computeIntegrity({ reference, amountInCents, currency: 'COP', integritySecret });

  return {
    canCreate: true,
    reference,
    redirectUrl,
    signature: { integrity },
    taxInCents: 0,
    // optionally add referralLink, membershipId, etc.
  };
}
