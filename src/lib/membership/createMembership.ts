import type { 
  MembershipCheckoutOptions, 
  CreateMembershipResponse 
} from '@/lib/types/wompi';

/**
 * Simula el comportamiento del endpoint backend que valida y crea una membresía en estado "pago pendiente".
 * - Valida campos mínimos de personalInfo (específicos para Wompi checkout)
 * - Genera referencia única y redirectUrl
 * - Genera la firma de integridad usando computeIntegrity
 * 
 * NOTA: personalInfo contiene datos para Wompi checkout, NO es el modelo User del backend
 * En producción, esta lógica debe vivir en el servidor.
 */
export async function createMembership({ 
  personalInfo, 
  price, 
  token 
}: MembershipCheckoutOptions): Promise<CreateMembershipResponse> {
  const { email, legalId, legalIdType } = personalInfo;

  // Usar token para futuras validaciones de autenticación si es necesario
  console.log('Token received:', token);

  if (!email || !legalId || !legalIdType) {
    return { 
      success: false, 
      msg: 'Faltan campos requeridos (email o identificación).', 
      data: {} as any 
    };
  }

  if (typeof price !== 'number' || Number.isNaN(price)) {
    return { 
      success: false, 
      msg: 'Precio inválido.', 
      data: {} as any 
    };
  }

  // Backend would create DB record here, check middleware, membership rules, referral links, etc.
  const timestamp = Date.now();
  const reference = `membership-${legalId}-${timestamp}`;
  const redirectUrl = 'https://transaction-redirect.wompi.co/check';

  // En la implementación real, el backend maneja toda la lógica de Wompi internamente
  return {
    success: true,
    msg: "Membresía creada, redirigiendo al portal de pago.",
    data: {
      referencia: reference,
      correoCliente: email,
      usuarioId: `user_${timestamp}`, // Mock ID
      membresiaId: `membership_${timestamp}`,
      wompiTransactionId: `tx_${timestamp}`,
      wompiStatusInicial: 'PENDING',
      wompiLink: redirectUrl,
    },
  };
}