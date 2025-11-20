import React from "react";
import { Button } from "@/components/ui/button"; // Asume que tu ruta es @/components...
import { Badge } from "@/components/ui/badge"; // Asume que tu ruta es @/components...
import { CheckCircle } from 'lucide-react'; // El ícono de lucide-react

const IMAGEN_MOCKUP = '/assets/logo.png';

const TITULO_SECUNDARIO = 'Desbloquea nuestra experiencia para impulsar el éxito en diversas industrias.';
const TEXTO_DESCRIPCION = 'En Mabs by Gabs, creemos firmemente que el maquillaje es una extensión de tu personalidad y una herramienta poderosa para expresar tu individualidad. Desde la base perfecta hasta el labial audaz, cada producto está seleccionado para realzar tu belleza natural y potenciar tu confianza. Nuestra misión es ofrecerte no solo productos de alta calidad, sino también inspiración y alegría en cada aplicación. ¡Descubre la magia de Mabs by Gabs y atrévete a brillar con luz propia!';

const PUNTOS_CLAVE = [
    'Maquillaje de alta calidad',
    'Realza tu belleza natural',
    'Potencia tu confianza',
    'Inspiración y alegría',
    'Productos seleccionados',
    'Brilla con luz propia',
];

export default function AboutUs() {
    // Ya no se necesita useTheme
    // const theme = useTheme(); 

    return (
        <section className="py-12 md:py-24 bg-background"> {/* Reemplaza Box y theme.palette.background.default */}
            <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"> {/* Reemplaza Container maxWidth="xl" */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-center"> {/* Reemplaza Box con display:grid y gap */}

                    {/* Sección de la Imagen (Columna 1) */}
                    <div className="md:col-span-4 order-1 md:order-2 flex justify-center"> {/* Reemplaza Box con gridColumn y order */}
                        <div className="rounded-md overflow-hidden shadow-lg w-full max-w-sm bg-white h-[350px] sm:h-[550px]"> {/* Reemplaza Box con borderRadius, overflow, boxShadow, width, height, y maxWidth */}
                            <img
                                src={IMAGEN_MOCKUP}
                                alt="Logo Mabs by Gabs"
                                className="w-full h-full object-contain p-3 block"
                            /> {/* Reemplaza Box component="img" y sus estilos */}
                        </div>
                    </div>

                    {/* Sección del Contenido (Columna 2) */}
                    <div className="md:col-span-8 order-2 md:order-1"> {/* Reemplaza Box con gridColumn y order */}

                        {/* Chip / Badge */}
                        <Badge variant="default" className="mb-4 bg-primary/20 text-primary font-semibold hover:bg-primary/20"> {/* Reemplaza Chip. Ajusta 'bg-primary/20 text-primary' según tu theme. */}
                            Programa de Afiliados
                        </Badge>

                        {/* Título Principal */}
                        <h2 className="font-extrabold mt-2 mb-4 leading-tight text-foreground text-4xl sm:text-5xl"> {/* Reemplaza Typography variant="h4" y sus estilos */}
                            {TITULO_SECUNDARIO}
                        </h2>

                        {/* Descripción */}
                        <p className="text-muted-foreground mb-8 text-lg"> {/* Reemplaza Typography variant="body1" y sus estilos */}
                            {TEXTO_DESCRIPCION}
                        </p>

                        {/* Puntos Clave - Reemplaza Grid con un Flex/Grid simple de Tailwind */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                            {PUNTOS_CLAVE.map((punto, index) => (
                                <div key={index} className="flex items-start gap-2"> {/* Reemplaza Grid item y Box */}
                                    <CheckCircle className="w-5 h-5 flex-shrink-0 text-secondary mt-0.5" /> {/* Reemplaza CheckCircleIcon. Ajusta 'text-secondary' según tu color. */}
                                    <p className="font-medium leading-snug text-sm"> {/* Reemplaza Typography variant="body2" */}
                                        {punto}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Botón */}
                        <div className="mt-10"> {/* Reemplaza Box con mt: 5 */}
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