import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Truck } from "lucide-react";
import type { HeroBannerProps } from '@/types/components';

interface Slide {
    id: number;
    title: string;
    subtitle: string;
    discount: string;
    description: string;
    image: string;
    cta: string;
    badge: string;
}

const slides: readonly Slide[] = [
    {
        id: 1,
        title: "Descubre tu Tono Perfecto de Base",
        subtitle: "Envío Gratis en todos los pedidos de bases y correctores.",
        discount: "30% OFF",
        description: "Encuentra la base ideal para tu tipo de piel con nuestra colección exclusiva.",
        image: "/assets/images/products/product1.png",
        cta: "Comprar Bases",
        badge: "Nueva Colección",
    },
    {
        id: 2,
        title: "Labios de Impacto: Colores Vibrantes",
        subtitle: "Obtén un delineador de labios de regalo en tu compra.",
        discount: "40% OFF",
        description: "Una gama completa de labiales para un acabado profesional que dura todo el día.",
        image: "/assets/images/products/product2.png",
        cta: "Ver Labiales",
        badge: "Oferta Flash",
    },
    {
        id: 3,
        title: "Pinceles Esenciales para un Maquillaje Pro",
        subtitle: "Envío rápido en todas las compras de sets de brochas.",
        discount: "20% OFF",
        description: "Herramientas de calidad premium para una aplicación impecable.",
        image: "/assets/images/products/product4.png",
        cta: "Comprar Brochas",
        badge: "Top Ventas",
    },
] as const;

export default function HeroBanner({
    onCtaClick
}: HeroBannerProps = {}): React.ReactElement {
    const [activeSlide, setActiveSlide] = useState<number>(0);
    const navigate = useNavigate();

    const nextSlide = (): void => {
        setActiveSlide((prev) => (prev + 1) % slides.length);
    };

    const prevSlide = (): void => {
        setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
    };

    const handleCtaClick = (): void => {
        if (onCtaClick) {
            onCtaClick();
        } else {
            navigate("/productos");
        }
    };

    useEffect(() => {
        const interval = setInterval(nextSlide, 5000);
        return () => clearInterval(interval);
    }, [activeSlide]);

    return (
        <div className="relative w-full overflow-hidden bg-background py-4 md:py-8">
            <div className="relative mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-8">
                <div
                    className="relative flex min-h-[470px] w-full items-center overflow-hidden rounded-lg bg-card bg-linear-to-br from-card to-muted sm:min-h-[500px] md:min-h-[520px]"
                >
                    <div
                        className="flex w-full transition-transform duration-500 ease-in-out"
                        style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                    >
                        {slides.map((slide) => (
                            <div
                                key={slide.id}
                                className="flex min-h-[470px] min-w-full max-w-full flex-col items-center justify-center gap-5 overflow-hidden px-12 py-6 text-foreground sm:min-h-[500px] sm:px-16 md:min-h-[520px] md:flex-row md:gap-8 md:px-14 md:py-10 lg:px-20"
                            >
                                <div className="relative z-10 flex min-w-0 w-full flex-1 flex-col items-center text-center md:items-start md:text-left">
                                    <span className="mb-3 inline-flex min-h-7 max-w-full items-center rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
                                        {slide.badge}
                                    </span>
                                    <h1 className="mb-3 max-w-full break-words text-[clamp(1.65rem,8vw,2.25rem)] font-bold leading-tight sm:text-4xl md:text-5xl lg:text-6xl">
                                        {slide.title}
                                    </h1>
                                    <div className="mb-4 flex max-w-full items-start justify-center gap-2 md:justify-start">
                                        <Truck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground md:h-6 md:w-6" />
                                        <p className="min-w-0 break-words text-sm font-medium text-muted-foreground sm:text-base md:text-lg">
                                            {slide.subtitle}
                                        </p>
                                    </div>
                                    <Button
                                        onClick={handleCtaClick}
                                        className="max-w-full rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 sm:px-8 sm:py-3 sm:text-base"
                                    >
                                        {slide.cta}
                                    </Button>
                                </div>

                                <div className="relative z-0 flex min-w-0 w-full flex-1 items-center justify-center">
                                    <img
                                        src={slide.image}
                                        alt={slide.title}
                                        className="h-auto max-h-[180px] w-full max-w-[260px] object-contain transition-transform duration-300 ease-in-out sm:max-h-[230px] sm:max-w-xs md:max-h-[340px] md:max-w-sm md:perspective-[1000px] md:rotate-y-[-5deg] md:hover:rotate-y-0"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 z-20 -translate-y-1/2 bg-background/70 hover:bg-background/90 sm:left-4"
                        onClick={prevSlide}
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 z-20 -translate-y-1/2 bg-background/70 hover:bg-background/90 sm:right-4"
                        onClick={nextSlide}
                    >
                        <ChevronRight className="h-6 w-6" />
                    </Button>
                </div>

                <div className="mt-4 flex justify-center gap-2 sm:mt-6">
                    {slides.map((_, index) => (
                        <div
                            key={index}
                            onClick={() => setActiveSlide(index)}
                            className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-300 ease-in-out ${index === activeSlide ? "bg-primary w-4 h-4" : "bg-muted-foreground/30"}
                                hover:scale-125`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
