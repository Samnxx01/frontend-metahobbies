// Interfaces para componentes About/AboutUs

export interface AboutUsConfig {
  imagen: string;
  tituloSecundario: string;
  textoDescripcion: string;
  puntosClave: readonly string[];
}

export interface PuntoClaveItemProps {
  punto: string;
  index: number;
}

// Interfaces para componentes comunes

import { ReactNode } from 'react';
import type { Control, FieldValues } from 'react-hook-form';
import type { UserId } from './common';

// About component interfaces
import type { ButtonProps } from '@/components/ui/button';

export interface ButtonPrimaryProps extends ButtonProps {
  children: ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export interface InputFieldProps {
  label: string;
  fullWidth?: boolean;
  control: Control<FieldValues>;
  name: string;
  type?: 'text' | 'password' | 'email' | 'number' | 'tel';
  placeholder?: string;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
}

export interface Product {
  id: string ;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category?: string;
  brand?: string;
  description?: string;
  inStock?: boolean;
  color?: string; // Color individual para mostrar en el swatch
  colors?: string[]; // Array de colores disponibles
  rating?: number;
  reviewCount?: number;
  discount?: number;
}

export interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export interface CategoryCardProps {
  category: {
    id: string ;
    name: string;
    image: string;
  };
}

export interface SearchBarProps {
  placeholder?: string;
  onSearchChange?: (value: string) => void;
  onSearch?: (searchTerm: string) => void;
  value?: string;
  onChange?: (value: string) => void;
}

// Modal props
export interface ModalProps {
    open: boolean;
    title?: string;
    children: React.ReactNode;
    onClose: () => void;
    actions?: React.ReactNode;
}

// Admin component interfaces
export interface KpiCardProps {
    icon: React.ReactNode;
    label: string;
    value: string ;
    sub: string;
    subColor?: string;
    borderColor?: string;
    children?: React.ReactNode;
}

export interface User {
_id: UserId;
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
  // Campos adicionales para compatibilidad
  name?: string;
  email?: string;
  avatar?: string;
  status?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface QuickAccessCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'primary' | 'secondary';
}

export interface LatestOrdersCardProps {
    orders: Array<{
        id: string ;
        customer: string;
        amount: number;
        status: string;
        date: string | Date;
    }>;
    title?: string;
    onViewAll?: () => void;
}

export interface UserFormModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (userData: Partial<User>) => void;
    user?: User;
    title?: string;
}

export interface UserEditModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (userData: Partial<User>) => void;
    user: User;
}

export interface DataTableProps {
    data: any[];
    columns: Array<{
        key: string;
        label: string;
        render?: (value: any, row: any) => React.ReactNode;
    }>;
    onEdit?: (row: any) => void;
    onDelete?: (row: any) => void;
    loading?: boolean;
}

export interface AdminNavbarProps {
    mobileOpen?: boolean;
    setMobileOpen?: (open: boolean) => void;
    title?: string;
}

export interface AdminSidebarProps {
    mobileOpen: boolean;
    setMobileOpen?: (open: boolean) => void;
}

// Affiliate component interfaces
export interface AffiliateBannerProps {
    title?: string;
    description?: string;
    ctaText?: string;
    onCtaClick?: () => void;
}

// Navbar interfaces
export interface NavbarProps {
    transparent?: boolean;
}

// Footer interfaces
export interface FooterProps {
    variant?: 'default' | 'minimal';
}

// Hero interfaces
export interface HeroBannerProps {
    title?: string;
    subtitle?: string;
    ctaText?: string;
    onCtaClick?: () => void;
    backgroundImage?: string;
}

// Membership interfaces
export interface WelcomeModalProps {
    open: boolean;
    onClose: () => void;
    membershipType?: string;
}