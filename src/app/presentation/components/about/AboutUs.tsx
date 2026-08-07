import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    obtenerPublicidadesActivas,
    obtenerTiposPublicidad,
    type PublicidadModal,
    type TipoPublicidadVisual,
} from '@/app/services/contenidoDestacadoService';
import AboutUsView, {
    mapPublicidadToAboutUs,
    tieneContenidoRenderizable,
    type AboutUsContenido,
} from './AboutUsView';
import AboutUsWidget from './AboutUsWidget';
import AboutUsModal from './AboutUsModal';

/** Visualización por defecto cuando el tipo aún no está parametrizado. */
const VISUAL_POR_DEFECTO: TipoPublicidadVisual = {
    render: 'SECCION',
    flotante: false,
    posicion: 'INFERIOR_DERECHA',
    ancho: '22rem',
    cerrable: true,
};

/** Un contenido de la ruta junto al modo en que debe dibujarse. */
interface BloqueContenido {
    id: string;
    contenido: AboutUsContenido;
    visual: TipoPublicidadVisual;
}

export default function AboutUs(): React.ReactElement | null {
    const navigate = useNavigate();
    const location = useLocation();
    /** Todos los contenidos de la ruta: cada registro se dibuja por separado. */
    const [bloques, setBloques] = useState<BloqueContenido[]>([]);

    useEffect(() => {
        let activo = true;

        const consultar = (comoVisitante: boolean) => obtenerPublicidadesActivas({
            path: location.pathname,
            seccionPath: location.pathname,
            comoVisitante,
        });

        const cargarContenido = async (): Promise<void> => {
            const tipos = await obtenerTiposPublicidad();

            // El carrusel y el banner tienen sus propios componentes en la página.
            const tieneOtroComponente = (codigo?: string): boolean => {
                const render = tipos.find((tipo) => tipo.codigo === codigo)?.visual?.render;
                return render === 'CARRUSEL' || render === 'BANNER'
                    || codigo === 'CARRUSEL' || codigo === 'BANNER';
            };

            const aBloques = (publicidades: PublicidadModal[]): BloqueContenido[] => publicidades
                .filter((item) => item.estado && !tieneOtroComponente(item.presentacion))
                .map((item, indice) => ({
                    id: String(item.iud || item._id || item.etiqueta || indice),
                    contenido: mapPublicidadToAboutUs(item),
                    visual: {
                        ...VISUAL_POR_DEFECTO,
                        ...(tipos.find((tipo) => tipo.codigo === item.presentacion)?.visual || {}),
                    },
                }))
                .filter((bloque) => tieneContenidoRenderizable(bloque.contenido));

            let encontrados: BloqueContenido[] = [];

            // Con sesión, el contenido puede venir personalizado por tenant.
            try {
                encontrados = aBloques(await consultar(false));
            } catch (error) {
                console.error('No se pudo cargar el contenido de la sección con la sesión activa:', error);
            }

            // Es contenido público de la página: si la consulta con sesión falla o no
            // resuelve nada, se pide como visitante para que la sección no desaparezca.
            if (!encontrados.length) {
                try {
                    encontrados = aBloques(await consultar(true));
                } catch (error) {
                    console.error('No se pudo cargar el contenido público de la sección:', error);
                }
            }

            if (!activo) return;
            setBloques(encontrados);
        };

        void cargarContenido();

        return () => {
            activo = false;
        };
    }, [location.pathname]);

    // Sin registros activos no se muestra nada: no hay contenido de respaldo.
    if (!bloques.length) return null;

    const irAlDestino = (link: string): void => {
        if (!link) return;

        if (/^https?:\/\//i.test(link)) {
            window.location.assign(link);
            return;
        }

        navigate(link);
    };

    return (
        <>
            {bloques.map(({ id, contenido, visual }) => {
                const onBotonClick = () => irAlDestino(contenido.botonLink);

                if (visual.render === 'MODAL') {
                    return <AboutUsModal key={id} contenido={contenido} onBotonClick={onBotonClick} />;
                }

                // La tarjeta puede ir flotando en una esquina o plasmada en la página.
                if (visual.render === 'TARJETA') {
                    return (
                        <AboutUsWidget
                            key={id}
                            contenido={contenido}
                            onBotonClick={onBotonClick}
                            visual={visual}
                        />
                    );
                }

                return <AboutUsView key={id} contenido={contenido} onBotonClick={onBotonClick} />;
            })}
        </>
    );
}
