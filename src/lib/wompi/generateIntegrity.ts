import type { IntegrityParams } from '@/lib/types/wompi';

/**
 * Computes SHA-256 integrity hex for Wompi signature
 */
export async function computeIntegrity({ 
  reference, 
  amountInCents, 
  currency, 
  integritySecret 
}: IntegrityParams): Promise<string> {
  if (!reference || typeof amountInCents === 'undefined' || !currency || !integritySecret) {
    throw new Error('Missing parameters to compute integrity signature');
  }

  // Construir la cadena: "<Reference><Amount><Currency><IntegritySecret>"
  const cadenaConcatenada = `${reference}${amountInCents}${currency}${integritySecret}`;
  const encoded = new TextEncoder().encode(cadenaConcatenada);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const integrity = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return integrity;
}