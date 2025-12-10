import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Users, Zap, Target, Eye, Heart, Award, CheckCircle2, Phone, UserPlus } from 'lucide-react';

export default function SobreNosotros() {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-primary/10 via-background to-background py-20 md:py-32">
                <div className="container mx-auto px-4 max-w-5xl">
                    <div className="text-center space-y-6">
                        <h1 className="text-4xl md:text-6xl font-bold text-foreground tracking-tight">
                            Construimos tu éxito,
                            <span className="block text-primary mt-2">un referido a la vez</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                            La plataforma que transforma tu red en ingresos reales, con tecnología de pago segura y un sistema de membresías diseñado para crecer contigo.
                        </p>
                        
                        {/* Bullets con beneficios */}
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

            {/* Quiénes Somos */}
            <section className="py-16 md:py-24 bg-muted/30">
                <div className="container mx-auto px-4 max-w-5xl">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                                Quiénes Somos
                            </h2>
                            <div className="space-y-4 text-muted-foreground leading-relaxed">
                                <p>
                                    MABS nació en [INSERTAR_AÑO] con una visión clara: democratizar el acceso a programas de membresías y sistemas de referidos que realmente funcionen. Fundada por un equipo de emprendedores y tecnólogos, nuestra plataforma ha ayudado a [INSERTAR_DATO: miles de usuarios] a monetizar sus redes de contacto.
                                </p>
                                <p>
                                    Desde nuestros inicios, hemos procesado más de [INSERTAR_DATO: millones en transacciones] y conectado a comunidades enteras a través de un modelo de negocio justo, transparente y escalable.
                                </p>
                            </div>

                            {/* Misión y Visión */}
                            <div className="space-y-4 pt-4">
                                <Card className="border-l-4 border-l-primary bg-card">
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <Target className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                                            <div>
                                                <h3 className="font-semibold text-foreground mb-1">Misión</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Empoderar a emprendedores y comunidades para crear fuentes de ingresos sostenibles mediante tecnología accesible y sistemas de referidos transparentes.
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-l-4 border-l-primary bg-card">
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <Eye className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                                            <div>
                                                <h3 className="font-semibold text-foreground mb-1">Visión</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Ser la plataforma líder en Latinoamérica para membresías y economía colaborativa, transformando millones de vidas a través de la tecnología.
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                <Heart className="h-32 w-32 text-primary/40" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Qué Hacemos */}
            <section className="py-16 md:py-24">
                <div className="container mx-auto px-4 max-w-5xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                            Qué Hacemos
                        </h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Ofrecemos una suite completa de herramientas para gestionar, monetizar y hacer crecer tu red
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <Card className="bg-card hover:shadow-lg transition-shadow">
                            <CardContent className="p-6 space-y-4">
                                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Award className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="text-xl font-semibold text-foreground">Membresías Premium</h3>
                                <p className="text-muted-foreground">
                                    Planes flexibles con beneficios exclusivos: acceso a cursos, herramientas profesionales y comisiones mejoradas por referidos.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-card hover:shadow-lg transition-shadow">
                            <CardContent className="p-6 space-y-4">
                                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Users className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="text-xl font-semibold text-foreground">Panel de Referidos</h3>
                                <p className="text-muted-foreground">
                                    Dashboard intuitivo para rastrear tus referidos, comisiones ganadas, gráficos de desempeño y proyecciones de ingresos en tiempo real.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-card hover:shadow-lg transition-shadow">
                            <CardContent className="p-6 space-y-4">
                                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Shield className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="text-xl font-semibold text-foreground">Pagos Seguros</h3>
                                <p className="text-muted-foreground">
                                    Integración con Wompi. Retiros rápidos, encriptación de extremo a extremo y soporte 24/7.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

         

         

            {/* FAQs */}
            <section className="py-16 md:py-24">
                <div className="container mx-auto px-4 max-w-3xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                            Preguntas Frecuentes
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {[
                            {
                                q: '¿Cómo funciona el sistema de referidos?',
                                a: 'Cada vez que alguien se registra usando tu enlace único y compra una membresía, ganas una comisión automática. Las ganancias se reflejan en tu dashboard en tiempo real.'
                            },
                            {
                                q: '¿Qué métodos de pago aceptan?',
                                a: 'Aceptamos tarjetas de crédito/débito, PSE, Nequi y otros métodos locales a través de nuestras integraciones pasarelas de pago.'
                            },
                            {
                                q: '¿Hay costos ocultos o permanencia mínima?',
                                a: 'No. El único costo es tu membresía mensual, sin cargos sorpresa. Puedes cancelar en cualquier momento sin penalizaciones.'
                            }
                        ].map((faq, index) => (
                            <Card key={index} className="bg-card">
                                <CardContent className="p-6">
                                    <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                                    <p className="text-sm text-muted-foreground">{faq.a}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className="py-20 md:py-32 bg-gradient-to-br from-primary/10 via-background to-background">
                <div className="container mx-auto px-4 max-w-4xl text-center space-y-8">
                    <h2 className="text-3xl md:text-5xl font-bold text-foreground">
                        ¿Listo para Construir tu Red?
                    </h2>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                        Únete a miles de emprendedores que ya están generando ingresos con MABS
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <Button asChild size="lg" className="text-lg px-8">
                            <Link to="/registro">
                                <UserPlus className="mr-2 h-5 w-5" />
                                Crear Cuenta Gratis
                            </Link>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="text-lg px-8">
                            <Link to="/contacto">
                                <Phone className="mr-2 h-5 w-5" />
                                Hablar con un Asesor
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
