import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Loader2 } from "lucide-react";

import type { AffiliateBannerProps } from '@/types/components';
import {
    esTokenReferidoAtribucionValido,
    persistAttributionForReferidosFlow,
    resolvePublicAttributionContext,
} from "@/app/services/publicAttributionParams";
import {
    buildMembresiaReferidosPath,
    validarTokenReferidoMembresia,
} from "@/app/services/referralAttributionService";

const AFFILIATE_BANNER_IMAGE = "/assets/images/banner.jpg";

export default function AffiliateBanner({
    title = "Transforma tu Pasión en Ganancias",
    description = "¿Te encanta el maquillaje y sueñas con tener tu propio negocio? Únete a nuestro programa de afiliados y obtén comisiones atractivas, capacitación constante y acceso a productos de éxito.",
    ctaText = "Quiero Unirme",
    onCtaClick
}: AffiliateBannerProps = {}): React.ReactElement {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);

    const handleCtaClick = async (): Promise<void> => {
        if (onCtaClick) {
            onCtaClick();
            return;
        }

        const ctx = resolvePublicAttributionContext(
            searchParams.toString() ? `?${searchParams.toString()}` : window.location.search,
        );

        if (!ctx.ref) {
            toast.info(
                'Para unirte al programa necesitas un enlace de invitación. Solicítalo a quien te refirió.',
            );
            navigate("/modelo-negocio");
            return;
        }

        if (!esTokenReferidoAtribucionValido(ctx.ref)) {
            toast.error('El enlace de referido no tiene un formato válido.');
            return;
        }

        setLoading(true);
        try {
            const tokenValido = await validarTokenReferidoMembresia(
                ctx.ref,
                ctx.guestSessionId || undefined,
            );
            if (!tokenValido) {
                toast.error('El enlace de referido no es válido o expiró. Pide uno nuevo a tu patrocinador.');
                return;
            }

            persistAttributionForReferidosFlow(ctx);

            navigate(
                buildMembresiaReferidosPath({
                    jwtReferido: ctx.ref,
                    guestSessionId: ctx.guestSessionId,
                    originType: ctx.originType || 'membresia',
                    originId: ctx.originId || null,
                }),
            );
        } finally {
            setLoading(false);
        }
    };

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
        const target = e.target as HTMLImageElement;
        target.onerror = null;
        target.src = "https://placehold.co/800x450/f3f4f6/a3a3a3?text=BANNER";
    };

    return (
        <div className="py-12 md:py-24   bg-background">
            <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div
                    className="
                        grid grid-cols-1 md:grid-cols-2 
                        gap-8 md:gap-12 
                        items-center 
                        bg-card dark:bg-card rounded-xl 
                        shadow-2xl overflow-hidden
                    "
                >
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
                            onError={handleImageError}
                        />
                    </div>

                    <div
                        className="
                            p-6 md:p-12 
                            order-2 
                            text-center md:text-left
                            space-y-4
                        "
                    >
                        <Badge
                            className="
                                mb-2 font-semibold 
                                border-primary/20 bg-primary/20 text-primary hover:bg-primary/30 
                                transition-colors
                            "
                            variant="outline"
                        >
                            Programa de Afiliados
                        </Badge>

                        <h2
                            className="
                                text-3xl md:text-4xl 
                                font-extrabold 
                                leading-tight 
                                text-foreground dark:text-foreground
                            "
                        >
                            {title}
                        </h2>

                        <p
                            className="
                                text-base text-muted-foreground dark:text-muted-foreground 
                                pb-4 
                                max-w-xl mx-auto md:mx-0
                            "
                        >
                            {description}
                        </p>

                        <Button
                            onClick={() => void handleCtaClick()}
                            disabled={loading}
                            className="
                                rounded-lg 
                                px-6 py-3 h-auto 
                                text-base font-semibold
                            "
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Validando enlace…
                                </>
                            ) : (
                                <>
                                    {ctaText}
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
