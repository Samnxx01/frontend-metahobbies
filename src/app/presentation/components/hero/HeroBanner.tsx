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
        <div className="w-full bg-background py-4 md:py-8 relative overflow-hidden">
            <div className="container mx-auto px-4 lg:px-8 relative">
                <div
                    className="relative overflow-hidden rounded-lg bg-card min-h-auto sm:min-h-[50vh] md:min-h-[60vh] lg:min-h-[500px] flex items-center bg-linear-to-br from-card to-muted"
                >
                    <div
                        className="flex transition-transform duration-500 ease-in-out"
                        style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                    >
                        {slides.map((slide) => (
                            <div
                                key={slide.id}
                                className="min-w-full flex flex-col md:flex-row items-center p-6 md:p-12 min-h-[350px] md:min-h-[450px] text-foreground"
                            >
                                <div className="flex-1 pr-0 md:pr-12 mb-6 md:mb-0 text-center md:text-left z-10 relative">
                                    <span className="mb-4 px-3 py-1 bg-secondary text-secondary-foreground font-bold text-xs rounded-full h-8 flex items-center">
                                        {slide.badge}
                                    </span>
                                    <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
                                        {slide.title}
                                    </h1>
                                    <div className="flex items-center justify-center md:justify-start mb-6 gap-2">
                                        <Truck className="h-6 w-6 text-muted-foreground" />
                                        <p className="text-base md:text-lg text-muted-foreground font-medium">
                                            {slide.subtitle}
                                        </p>
                                    </div>
                                    <Button
                                        onClick={handleCtaClick}
                                        className="rounded-full px-8 py-3 text-base font-semibold shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1"
                                    >
                                        {slide.cta}
                                    </Button>
                                </div>

                                <div className="flex-1 text-center flex items-center justify-center relative z-0">
                                    <img
                                        src={slide.image}
                                        alt={slide.title}
                                        className="w-full max-h-[200px] sm:max-h-[300px] md:max-h-[80%] max-w-sm h-auto object-cover transform perspective-[1000px] rotate-y-[-5deg] transition-transform duration-300 ease-in-out hover:rotate-y-0"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-background/50 hover:bg-background/80"
                        onClick={prevSlide}
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-background/50 hover:bg-background/80"
                        onClick={nextSlide}
                    >
                        <ChevronRight className="h-6 w-6" />
                    </Button>
                </div>

                <div className="flex justify-center gap-2 mt-6">
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