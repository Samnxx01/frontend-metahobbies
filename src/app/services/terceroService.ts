import { apiFetchPublic } from './api';
import type { DatosFacturacionInvitado } from '@/app/presentation/components/carrito/DatosFacturacionInvitadoModal';

export type TerceroFacturacion = DatosFacturacionInvitado & { iud: string };

const terceroService = {
  async buscarPorDocumento(numeroDocumento: string): Promise<TerceroFacturacion | null> {
    const params = new URLSearchParams({ numeroDocumento });
    const response = await apiFetchPublic(`/api/terceros/buscar?${params.toString()}`, { method: 'GET' });
    return response?.encontrado ? response.data as TerceroFacturacion : null;
  },
};

export default terceroService;
