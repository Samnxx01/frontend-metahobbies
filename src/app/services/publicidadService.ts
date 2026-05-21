import { apiFetch, apiFetchPublic } from '@/app/services/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export type PublicidadModal = {
  iud?: string;
  _id?: string;
  tittle?: string;
  subtittle?: string;
  body?: string;
  price?: string | number;
  buttonText?: string;
  buttonLink?: string;
  estado?: boolean;
  prioridad?: number;
  scope?: {
    tipo?: 'GENERAL' | 'TENANT_RUTA';
    tenantGlobal?: any;
    tenantCorporativo?: any;
    rutasSeguridad?: any[];
    rutasPaths?: string[];
  };
  img?: {
    _id?: string;
    id?: string;
    nombre?: string;
    mimetype?: string;
    createdAt?: string;
  } | string | null;
};

const getPublicidadImageId = (publicidad: PublicidadModal): string => {
  if (!publicidad.img) return '';
  if (typeof publicidad.img === 'string') return publicidad.img;
  return publicidad.img._id || publicidad.img.id || '';
};

export const getPublicidadImageUrl = (publicidad: PublicidadModal): string => {
  const imageId = getPublicidadImageId(publicidad);
  return imageId ? `${API_BASE_URL}/configuration/publicidad/modal/imagen/${imageId}` : '';
};

export const obtenerPublicidadModalActiva = async (params?: { path?: string }): Promise<PublicidadModal | null> => {
  try {
    const search = new URLSearchParams();
    if (params?.path) search.set('path', params.path);
    const url = `${API_BASE_URL}/configuration/publicidad/modal/activa${search.toString() ? `?${search}` : ''}`;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = token
      ? await apiFetch(url, {
        method: 'GET',
        useAuth: true,
        logoutOn401: false,
      })
      : await apiFetchPublic(url, {
      method: 'GET',
    });
    return response?.publicidad ?? null;
  } catch (error: any) {
    if (String(error?.message || '').includes('[404]')) return null;
    throw error;
  }
};
