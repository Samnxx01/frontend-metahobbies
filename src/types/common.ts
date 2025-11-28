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
  estadoMembresia: boolean;
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
  id: UserId;
  nombre: string;
  apellido: string;
  correo: string;
  provisional?: boolean;
  rol: string;
  estado: string;
  role?: string; // Campo normalizado para consistencia
  telefono?: string;
  direccion?: string;
  fechaCreacion?: string;
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