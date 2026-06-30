import { useParams, useSearchParams } from 'react-router-dom';
import RecuperarContrasena from '@/app/presentation/pages/recuperar-contrasena/RecuperarContrasena';
import RecuperarContrasenaToken from '@/app/presentation/pages/recuperar-contrasena/RecuperarContrasenaToken';

/** Solicitud de enlace vs formulario con token (?fantasma= o /recuperar/:token). */
export default function RecuperarContrasenaEntry() {
    const { token } = useParams();
    const [params] = useSearchParams();
    const tokenUrl = String(token || params.get('fantasma') || params.get('token') || '').trim();

    if (tokenUrl) {
        return <RecuperarContrasenaToken />;
    }

    return <RecuperarContrasena />;
}
