// Wompi Transaction Types
export type TransactionStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';

export type PaymentMethodType = 
  | 'CARD' 
  | 'NEQUI' 
  | 'PSE' 
  | 'BANCOLOMBIA' 
  | 'BANCOLOMBIA_TRANSFER' 
  | 'BANCOLOMBIA_COLLECT' 
  | 'BANCOLOMBIA_QR';

// Extended legal ID types for Colombia
export type LegalIdType = 'CC' | 'NIT' | 'TI' | 'CE' | 'PPN';

export type Currency = 'COP' | 'USD';

// Customer Data Interface
export interface WompiCustomerData {
  email?: string;
  full_name?: string;
  phone_number?: string;
  legal_id?: string;
  legal_id_type?: LegalIdType;
}

// Shipping Address Interface
export interface WompiShippingAddress {
  address_line_1: string;
  country: string;
  region: string;
  city: string;
  phone_number?: number;
}

// Payment Method Interface
export interface WompiPaymentMethod {
  type: PaymentMethodType;
  phone_number?: number;
  [key: string]: any;
}

// Transaction Interface (from Wompi API)
export interface WompiTransaction {
  id: string;
  created_at: string;
  amount_in_cents: number;
  status: TransactionStatus;
  reference: string;
  customer_email: string;
  currency: Currency;
  payment_method_type: PaymentMethodType;
  payment_method: WompiPaymentMethod;
  shipping_address?: WompiShippingAddress;
  redirect_url?: string;
  payment_link_id?: string;
}

// Checkout Parameters Interface
export interface WompiCheckoutParams {
  currency: Currency;
  amountInCents: number;
  reference: string;
  redirectUrl: string;
  customerData?: WompiCustomerData;
  shippingAddress?: WompiShippingAddress;
  taxInCents?: number;
  signature?: string | { integrity: string };
}

// Widget Checkout Constructor Options
export interface WidgetCheckoutOptions {
  currency: Currency;
  amountInCents: number;
  reference: string;
  publicKey: string;
  signature: { integrity: string };
  taxInCents?: number;
  customerData?: WompiCustomerData;
  shippingAddress?: WompiShippingAddress;
}

// Widget Checkout Result
export interface WidgetCheckoutResult {
  transaction?: WompiTransaction;
}

// Widget Checkout Class (for window.WidgetCheckout)
export interface WidgetCheckout {
  new (options: WidgetCheckoutOptions): {
    open(callback: (result: WidgetCheckoutResult) => void): void;
  };
}

// Extend Window interface for WidgetCheckout
declare global {
  interface Window {
    WidgetCheckout: WidgetCheckout;
  }
}

// Integrity computation parameters
export interface IntegrityParams {
  reference: string;
  amountInCents: number;
  currency: Currency;
  integritySecret: string;
}

// Personal Information Interface específica para Wompi checkout
// NO es el mismo modelo que User del backend
export interface PersonalInfo {
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  legalId: string;
  legalIdType: LegalIdType;
}

// Parámetros para iniciar checkout de membresía con Wompi
export interface MembershipCheckoutOptions {
  personalInfo: PersonalInfo; // Datos específicos para Wompi, no modelo User
  price: number;
  token?: string; // Token de autenticación del usuario logueado
}

// Respuesta del backend al crear membresía (estructura real del endpoint)
export interface CreateMembershipResponse {
  success: boolean;
  msg: string;
  data: {
    referencia: string;
    correoCliente: string;
    usuarioId: string;
    membresiaId: string;
    wompiTransactionId: string;
    wompiStatusInicial: string;
    wompiLink: string;
  };
}

// Full Checkout Parameters (extends basic Wompi params)
export interface CheckoutParams extends WompiCheckoutParams {
  customerData: WompiCustomerData & {
    fullName: string;
    phoneNumberPrefix?: string;
  };
}