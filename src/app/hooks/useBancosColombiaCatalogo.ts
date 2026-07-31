import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/app/services/api';
import type { ColombiaBankCatalogItem } from '@/types/common';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export function useBancosColombiaCatalogo(): {
  bancos: ColombiaBankCatalogItem[];
  loading: boolean;
  recargar: () => Promise<void>;
} {
  const [bancos, setBancos] = useState<ColombiaBankCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const res = await apiFetch(`${API_BASE_URL}/perfil/seguridad/listar/bancos-colombia`, { method: 'GET' });
      if (res?.ok) setBancos(Array.isArray(res.bancos) ? res.bancos : []);
    } catch (error) {
      console.error('Error cargando catálogo de bancos de Colombia:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return { bancos, loading, recargar: cargar };
}
