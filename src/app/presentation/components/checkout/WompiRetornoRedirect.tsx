import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  buildRutaCheckoutRetornoWompi,
  esRetornoWompiEnSearch,
  esRutaCheckoutConfirmacion,
} from '@/app/utils/wompiRetornoRedirect';

/**
 * Si Wompi devuelve al home (u otra ruta pública) con ?wompi=retorno&id=…,
 * reenvía a finalizar-compra donde Checkout procesa el pago y muestra confirmación.
 */
export default function WompiRetornoRedirect(): null {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!esRetornoWompiEnSearch(location.search)) return;
    if (esRutaCheckoutConfirmacion(location.pathname)) return;

    navigate(buildRutaCheckoutRetornoWompi(location.search), { replace: true });
  }, [location.pathname, location.search, navigate]);

  return null;
}
