import React from "react";
import { useNavigate } from "react-router-dom";

// Shadcn UI components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Lucide icons
import { ArrowRight } from "lucide-react";

const AFFILIATE_BANNER_IMAGE = "/assets/images/banner.jpg";

export default function AffiliateBanner() {
    // Eliminamos useTheme, ya que los colores se manejan con clases de Tailwind
    const navigate = useNavigate();

    return (
        <div className="py-12 md:py-24 bg-background"> {/* Reemplaza Box y sus paddings */}
            <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"> {/* Reemplaza Container */}
                <div
                    className="
                        grid grid-cols-1 md:grid-cols-2 
                        gap-8 md:gap-12 
                        items-center 
                        bg-card rounded-xl 
                        shadow-2xl overflow-hidden
                    "
                >
                    {/* Columna Izquierda: Imagen */}
                    <div
                        className="
                            w-full h-[250px] md:h-full 
                            min-h-[450px] 
                            order-1 
                            bg-muted/50
                        "
                    >
                        <img
                            src={AFFILIATE_BANNER_IMAGE}
                            alt="Únete a nuestro programa de afiliados"
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/800x450/f3f4f6/a3a3a3?text=BANNER"; }}
                        />
                    </div>

                    {/* Columna Derecha: Contenido */}
                    <div
                        className="
                            p-6 md:p-12 
                            order-2 
                            text-center md:text-left
                            space-y-4
                        "
                    >
                        {/* Chip / Badge */}
                        <Badge
                            className="
                                mb-2 font-semibold 
                                bg-primary/20 text-primary hover:bg-primary/30 
                                transition-colors
                            "
                            variant="default"
                        >
                            Programa de Afiliados
                        </Badge>

                        {/* Título */}
                        <h2
                            className="
                                text-3xl md:text-4xl 
                                font-extrabold 
                                leading-tight 
                                text-foreground
                            "
                        >
                            Transforma tu Pasión en Ganancias
                        </h2>

                        {/* Descripción */}
                        <p
                            className="
                                text-base text-muted-foreground 
                                pb-4 
                                max-w-xl mx-auto md:mx-0
                            "
                        >
                            ¿Te encanta el maquillaje y sueñas con tener tu propio negocio? Únete a nuestro programa de afiliados y obtén comisiones atractivas, capacitación constante y acceso a productos de éxito.
                        </p>

                        {/* Botón */}
                        <Button
                            onClick={() => navigate("/afiliacion")}
                            className="
                                rounded-lg 
                                px-6 py-3 h-auto 
                                text-base font-semibold
                            "
                        >
                            Quiero Unirme
                            <ArrowRight className="h-4 w-4 ml-2" /> {/* Reemplaza ArrowForward */}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}