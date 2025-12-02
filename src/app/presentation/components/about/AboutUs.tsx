import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from 'lucide-react';
import type { AboutUsConfig, PuntoClaveItemProps } from "@/types/components";

const IMAGEN_MOCKUP: string = '/assets/logo.png';

const TITULO_SECUNDARIO: string = 'Desbloquea nuestra experiencia para impulsar el éxito en diversas industrias.';
const TEXTO_DESCRIPCION: string = 'En Mabs by Gabs, creemos firmemente que el maquillaje es una extensión de tu personalidad y una herramienta poderosa para expresar tu individualidad. Desde la base perfecta hasta el labial audaz, cada producto está seleccionado para realzar tu belleza natural y potenciar tu confianza. Nuestra misión es ofrecerte no solo productos de alta calidad, sino también inspiración y alegría en cada aplicación. ¡Descubre la magia de Mabs by Gabs y atrévete a brillar con luz propia!';

const PUNTOS_CLAVE: readonly string[] = [
    'Maquillaje de alta calidad',
    'Realza tu belleza natural',
    'Potencia tu confianza',
    'Inspiración y alegría',
    'Productos seleccionados',
    'Brilla con luz propia',
] as const;

// Componente para renderizar un punto clave individual
const PuntoClaveItem: React.FC<PuntoClaveItemProps> = ({ punto, index }) => (
    <div key={index} className="flex items-start gap-2">
        <CheckCircle className="w-5 h-5 flex-shrink-0 text-secondary mt-0.5" />
        <p className="font-medium leading-snug text-sm">
            {punto}
        </p>
    </div>
);

export default function AboutUs(): React.ReactElement {
    const aboutConfig: AboutUsConfig = {
        imagen: IMAGEN_MOCKUP,
        tituloSecundario: TITULO_SECUNDARIO,
        textoDescripcion: TEXTO_DESCRIPCION,
        puntosClave: PUNTOS_CLAVE as readonly string[],
    };

    return (
        <section className="py-12 md:py-24 bg-background">
            <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-center">

                    {/* Sección de la Imagen (Columna 1) */}
                    <div className="md:col-span-4 order-1 md:order-2 flex justify-center">
                        <div className="rounded-md overflow-hidden shadow-lg w-full max-w-sm bg-white h-[350px] sm:h-[550px]">
                            <img
                                src={aboutConfig.imagen}
                                alt="Logo Mabs by Gabs"
                                className="w-full h-full object-contain p-3 block"
                            />
                        </div>
                    </div>

                    {/* Sección del Contenido (Columna 2) */}
                    <div className="md:col-span-8 order-2 md:order-1">

                        {/* Chip / Badge */}
                        <Badge variant="default" className="mb-4 bg-primary/20 text-primary font-semibold hover:bg-primary/20">
                            Programa de Afiliados
                        </Badge>

                        {/* Título Principal */}
                        <h2 className="font-extrabold mt-2 mb-4 leading-tight text-foreground text-4xl sm:text-5xl">
                            {aboutConfig.tituloSecundario}
                        </h2>

                        {/* Descripción */}
                        <p className="text-muted-foreground mb-8 text-lg">
                            {aboutConfig.textoDescripcion}
                        </p>

                        {/* Puntos Clave */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                            {aboutConfig.puntosClave.map((punto: string, index: number) => (
                                <PuntoClaveItem key={index} punto={punto} index={index} />
                            ))}
                        </div>

                        {/* Botón */}
                        <div className="mt-10">
                            <Button className="rounded-3xl px-10 py-3 text-base font-semibold transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5">
                                Conoce Más de Nuestra Misión
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}