// Common types used across the application

// Basic ID types
export type UserId = string;
export type ImageId = string;
export type ProductId = string;
export type CategoryId = string;
export type MembershipId = string;
export type AuditId = string;
export type LevelId = string;
export type ReferralId = string;

// Membership interfaces
export interface Membership {
  _id: MembershipId;
  usuarioId: UserId;
  valorMembresia: string; // ObjectId as string
  estadoTransaccionMembresiaWompi: AuditId;
  nivel: LevelId;
  referido?: ReferralId;
  referidoMabs: string;
  estado: boolean;
  referidoCodigo?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MembershipListResponse extends ApiResponse {
  total: number;
  membresias: Membership[];
}

export interface CurrentMembershipData {
  status: 'active' | 'inactive' | 'expired' | 'pending';
  user: {
    name: string;
    email: string;
  };
  membershipType: string;
  startDate: string;
  endDate: string;
}

// Product Color interface
export interface ProductColor {
  pantone: string;
  name: string;
  hex: string;
}

// Product interface
export interface Product {
  id: ProductId;
  name: string;
  description: string;
  price: number;
  image: string;
  category: CategoryId;
  color?: ProductColor;
  stock: number;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

// Cart item interface (Product + quantity)
export interface CartItem extends Product {
  quantity: number;
  addedAt: string;
  /** _id del subdocumento en el carrito del backend (necesario para update/delete) */
  backendItemId?: string;
}

// Cart summary interface
export interface CartSummary {
  totalItems: number;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

// User interface
export interface User {
 _id: UserId;
  nombre: string;
  apellido: string;
  correo: string;
  provisional?: boolean;
  rol: string;
  estado: string | boolean; // Puede venir como string o boolean del backend
  role?: string; // Campo normalizado para consistencia
  telefono?: string;
  direccion?: string;
  fechaCreacion?: string;
  tenantSuperAdminId?: string | null;
  tenantGlobalId?: string | null;
  tenantCorporativoId?: string | null;
  auth?: {
    tenantScope?: {
      tenantSuperAdminId?: string | null;
      tenantGlobalId?: string | null;
      tenantCorporativoId?: string | null;
    };
  };
}

// Tipos para respuestas de API
export interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  data?: T;
}

// Tipos para autenticación
export interface AuthToken {
  token: string;
  user: User;
}

// Tipos para imágenes de perfil
export interface ProfileImage {
  id: ImageId;
  usuario: UserId;
  url?: string;
}

// Tipos para perfil de cliente
export interface ClientProfile {
  nombre_cliente: string;
  apellido: string;
  genero: string;
  tipoDeIntendidad: string;
  fecha_nacimiento: string;
  documentoIntentidad: number;
  telefono: number;
  nacionalidad?: string;
  prefijo?: string;
  paisId: string;
  departamentoId: string;
  ciudadId: string;
}

export interface BankAccountType {
  codigo: string;
  nombre: string;
  iud?: string;
}

export interface WompiBankCatalogItem {
  iud: string;
  wompiBankId: string;
  nombre: string;
  codigo?: string | null;
  estado: boolean;
}

export interface BankAccount {
  iud: string;
  nombre_titular: string;
  tipo_documento?: {
    iud?: string;
    _id?: string;
    tipos?: string;
    nombreDocumento?: string;
  } | string | null;
  numero_documento: string;
  banco: string;
  banco_codigo?: string | null;
  tipo_cuenta_codigo: 'AHORROS' | 'CORRIENTE';
  numero_cuenta: string;
  numero_cuenta_mascara?: string;
  correo_titular?: string | null;
  telefono_titular?: string | null;
  es_principal: boolean;
  permite_pago_automatico: boolean;
  estado: boolean;
  creadoEl?: string;
  actualizadoEl?: string;
}
