import { apiFetchPublic } from './api';
import type { DatosFacturacionInvitado } from '@/app/presentation/components/carrito/DatosFacturacionInvitadoModal';

export type TerceroFacturacion = DatosFacturacionInvitado & { iud?: string };

export type BuscarTerceroResultado = {
  data: TerceroFacturacion | null;
  tienePerfilCliente: boolean;
  edicionIdentidadBloqueada: boolean;
};

const terceroService = {
  async buscarPorDocumento(numeroDocumento: string): Promise<BuscarTerceroResultado> {
    const params = new URLSearchParams({ numeroDocumento });
    const response = await apiFetchPublic(`/api/terceros/buscar?${params.toString()}`, { method: 'GET' });
    return {
      data: response?.encontrado ? (response.data as TerceroFacturacion) : null,
      tienePerfilCliente: Boolean(response?.tienePerfilCliente),
      edicionIdentidadBloqueada: Boolean(response?.edicionIdentidadBloqueada),
    };
  },
};

export default terceroService;
