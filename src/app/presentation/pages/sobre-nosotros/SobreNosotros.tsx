import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Users, Zap, Target, Eye, Heart, Award, Phone, UserPlus, Building2, Loader2 } from 'lucide-react';
import { apiFetch } from "@/app/services/api";

interface EmpresaData {
    razon_social: string;
    descripcion: string;
    mision: string;
    vision: string;
}

export default function SobreNosotros() {
    const [empresa, setEmpresa] = useState<EmpresaData>({
        razon_social: 'Nuestra Empresa',
        descripcion: 'Dedicada al desarrollo de software empresarial y gestión de redes.',
        mision: 'Brindar soluciones tecnológicas innovadoras para el crecimiento de nuestros clientes.',
        vision: 'Ser líderes globales en transformación digital y sistemas de referidos.'
    });

    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const perfilRes = await apiFetch('/api/configuracion/listar/coporativo/perfil/publico', { method: 'GET' });

                if (perfilRes?.ok && perfilRes?.perfil) {
                    const p = perfilRes.perfil;
                    setEmpresa({
                        razon_social: p.razon_social || 'Nuestra Empresa',
                        descripcion: p.descripcion || 'Dedicada al desarrollo de software empresarial.',
                        mision: p.descripcion_mision_empresa || 'Brindar soluciones tecnológicas innovadoras.',
                        vision: p.descripcion_vision_empresa || 'Ser líderes en transformación digital.'
                    });
                }

                try {
                    const listaLogosRes = await apiFetch('/api/config/parametrizacion/listar/logos/coporativa', { method: 'GET' });
                    const logos = listaLogosRes?.logos || [];
                    if (logos.length > 0) {
                        const logoIdReal = logos[0].iud || logos[0]._id || logos[0].id;
                        const logoDetalleRes = await apiFetch(`/api/config/parametrizacion/listar/logos/coporativa/${logoIdReal}`, { method: 'GET' });

                        if (logoDetalleRes?.ok && logoDetalleRes?.logo) {
                            const { base64, mimetype } = logoDetalleRes.logo;
                            if (base64 && mimetype) {
                                setLogoUrl(`data:${mimetype};base64,${base64}`);
                            }
                        }
                    }
                } catch (logoErr) {
                    console.warn("No se pudo cargar el logo, se usará el icono por defecto.");
                }

            } catch (error) {
                console.error("Error cargando datos de Sobre Nosotros (usando valores por defecto):", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="min-h-screen bg-background">
            <section className="relative bg-gradient-to-br from-primary/10 via-background to-background py-20 md:py-32">
                <div className="container mx-auto px-4 max-w-5xl">
                    <div className="text-center space-y-6">
                        <h1 className="text-4xl md:text-6xl font-bold text-foreground tracking-tight">
                            {empresa.razon_social},
                            <span className="block text-primary mt-2">un referido a la vez</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                            La plataforma que transforma tu red en ingresos reales, con tecnología de pago segura.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 md:gap-6 pt-6">
                            <div className="flex items-center gap-2 text-sm md:text-base text-foreground font-medium">
                                <Shield className="h-5 w-5 text-primary" />
                                <span>Pagos 100% Seguros</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm md:text-base text-foreground font-medium">
                                <Users className="h-5 w-5 text-primary" />
                                <span>Red de Referidos Ilimitada</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm md:text-base text-foreground font-medium">
                                <Zap className="h-5 w-5 text-primary" />
                                <span>Dashboard en Tiempo Real</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-16 md:py-24 bg-muted/30">
                <div className="container mx-auto px-4 max-w-5xl">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Quiénes Somos</h2>
                            <div className="space-y-4 text-muted-foreground leading-relaxed text-lg">
                                <p>{empresa.descripcion}</p>
                            </div>
                            <div className="space-y-4 pt-4">
                                <Card className="border-l-4 border-l-primary">
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <Target className="h-6 w-6 text-primary mt-1" />
                                            <div>
                                                <h3 className="font-semibold text-foreground mb-1">Misión</h3>
                                                <p className="text-sm text-muted-foreground">{empresa.mision}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="border-l-4 border-l-primary">
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <Eye className="h-6 w-6 text-primary mt-1" />
                                            <div>
                                                <h3 className="font-semibold text-foreground mb-1">Visión</h3>
                                                <p className="text-sm text-muted-foreground">{empresa.vision}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        <div className="relative flex justify-center">
                            <div className="aspect-square w-full max-w-md rounded-2xl bg-white shadow-xl flex items-center justify-center p-8 overflow-hidden border border-border/50">
                                {loading ? (
                                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                ) : logoUrl ? (
                                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                ) : (
                                    <Building2 className="h-32 w-32 text-primary/20" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

// PR hecho por Gustavo Pereira el 13-02-2026