import { apiFetch } from './api';
import type { UserId, ApiResponse, CurrentMembershipData } from '../../types/common';

export interface PaymentData {
    amountInCents: number;
    customerEmail: string;
    reference: string;
}

export interface PaymentResponseData {
    referencia: string;
    correoCliente: string;
    usuarioId: UserId;
    membresiaId: string;
    wompiTransactionId: string;
    wompiStatusInicial: string;
    wompiLink: string;
}

export interface MembershipPaymentResponse extends ApiResponse {
    msg: string;
    data: PaymentResponseData;
}
/**
 * Processes the membership payment through Wompi.
 * This function communicates with the backend to create a Wompi payment transaction
 * and returns the URL to redirect the user for payment.
 *
 * @param {object} paymentData - The payment data.
 * @param {number} paymentData.amountInCents - The amount in COP cents.
 * @param {string} paymentData.customerEmail - The customer's email.
 * @param {string} paymentData.reference - The unique payment reference.
 * @param {string} token - The user's auth token.
 * @returns {Promise<{ wompiRedirectUrl: string }>} The response from the server containing the Wompi URL.
 */
export const processMembershipPayment = async (paymentData: PaymentData, token: string): Promise<MembershipPaymentResponse> => {
    const data = await apiFetch('/pagos/crear-transaccion-wompi', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: paymentData,
    });
    return data;
};

/**
 * Extracts the Wompi payment link from the membership payment response.
 * @param {MembershipPaymentResponse} paymentResponse - The payment response from the API.
 * @returns {string} The Wompi payment link.
 */
export const getWompiLinkFromResponse = (paymentResponse: MembershipPaymentResponse): string => {
    return paymentResponse.data.wompiLink;
};

/**
 * Redirects the user to the Wompi payment gateway.
 * @param {string} wompiRedirectUrl - The URL to redirect to.
 */
export const redirectToWompi = (wompiRedirectUrl: string) => {
    if (wompiRedirectUrl) {
        window.location.href = wompiRedirectUrl;
    } else {
        console.error('No Wompi redirect URL provided.');
        throw new Error('No se pudo redirigir a Wompi. URL no válida.');
    }
};

/**
 * Creates a new membership parameterization (type).
 * @param {object} parametrizationData - The data for the new membership type.
 * @param {string} parametrizationData.nombreMembresia - The name of the membership.
 * @param {string} parametrizationData.descripcion - The description of the membership.
 * @param {number} parametrizationData.precioMembresia - The price of the membership.
 * @param {string} metasploitToken - The custom security token for the 'metasploit' header.
 * @returns {Promise<any>} The response from the server.
 */
export interface MembershipParametrizationData {
    nombreMembresia: string;
    descripcion: string;
    precioMembresia: number;
}

export const createMembershipParametrization = async (parametrizationData: MembershipParametrizationData, metasploitToken: string): Promise<ApiResponse> => {
    const data = await apiFetch('/membresia/seguridad/crear/parametrizacion/membresia', {
        method: 'POST',
        headers: {
            'metasploit': metasploitToken,
        },
        body: parametrizationData,
    });
    return data;
};

/**
 * Gets the current user's membership data.
 * This is a placeholder and returns mock data.
 * @returns {Promise<CurrentMembershipData>} The membership data.
 */
export const getCurrentMembership = async (): Promise<CurrentMembershipData> => {
    // Simulate an API call
    await new Promise(resolve => setTimeout(resolve, 500));

    // Return mock data
    return {
        status: 'active',
        user: {
            name: 'John Doe',
            email: 'john.doe@example.com',
        },
        membershipType: 'Premium',
        startDate: '2023-01-01',
        endDate: '2024-01-01',
    };
};