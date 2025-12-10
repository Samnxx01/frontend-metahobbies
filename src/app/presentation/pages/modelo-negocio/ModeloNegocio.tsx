import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Users, Shield, Clock, CheckCircle2, UserPlus, Briefcase } from 'lucide-react';

export default function ModeloNegocio() {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-primary/10 via-background to-background py-20 md:py-32">
                <div className="container mx-auto px-4 max-w-5xl">
                    <div className="text-center space-y-6">
                        <Badge variant="secondary" className="mb-4 text-sm px-4 py-1">
                            Modelo Transparente
                        </Badge>
                        <h1 className="text-4xl md:text-6xl font-bold text-foreground tracking-tight">
                            Cómo Funciona
                            <span className="block text-primary mt-2">Nuestro Modelo de Negocio</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                            Un ecosistema donde todos ganan: tú creces, nosotros crecemos, tu red prospera.
                        </p>
                    </div>
                </div>
            </section>

            {/* Resumen Ejecutivo */}
            <section className="py-16 md:py-24">
                <div className="container mx-auto px-4 max-w-4xl">
                    <Card className="bg-card border-2 border-primary/20">
                        <CardContent className="p-8">
                            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                                Resumen Ejecutivo
                            </h2>
                            <div className="space-y-4 text-muted-foreground leading-relaxed">
                                <p>
                                    MABS opera bajo un modelo de <strong className="text-foreground">membresías recurrentes + comisiones por referidos</strong>. Generamos valor al ofrecer herramientas profesionales, formación y una red colaborativa que permite a nuestros usuarios monetizar sus contactos.
                                </p>
                                <p>
                                    Nuestra sostenibilidad financiera proviene de las suscripciones mensuales, comisiones en transacciones de referidos y servicios adicionales (marketplace, upsells). A cambio, los usuarios obtienen acceso a tecnología premium, soporte dedicado y un sistema de ingresos pasivos escalable.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

        
            <section className="py-16 md:py-24">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                            Flujo Económico para un Usuario
                        </h2>
                        <p className="text-lg text-muted-foreground">
                            Paso a paso: de la inscripción a la monetización
                        </p>
                    </div>

                    <div className="space-y-4">
                        {[
                            {
                                step: '1. Registro',
                                description: 'El usuario crea su cuenta gratuita y recibe un enlace único de referido.'
                            },
                            {
                                step: '2. Compra de Membresía',
                                description: 'Selecciona un plan mensual (Basic/Pro/Premium) y paga de forma segura con tarjeta o PSE.'
                            },
                            {
                                step: '3. Uso de Herramientas',
                                description: 'Accede al dashboard, cursos, soporte y herramientas de marketing para promover su enlace.'
                            },
                            {
                                step: '4. Generación de Referidos',
                                description: 'Comparte su enlace. Cada nuevo usuario que compra una membresía genera una comisión.'
                            },
                            {
                                step: '5. Cobro de Comisiones',
                                description: 'Las comisiones se acumulan en su wallet interno. Puede retirarlas mensualmente a su cuenta bancaria o billetera digital.'
                            }
                        ].map((item, index) => (
                            <Card key={index} className="bg-card border-l-4 border-l-primary">
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <span className="text-primary font-bold">{index + 1}</span>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-foreground mb-1">{item.step}</h3>
                                            <p className="text-sm text-muted-foreground">{item.description}</p>
                                        </div>
                                    </div>
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
                        Empieza a Generar Ingresos Hoy
                    </h2>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                        Elige tu rol y comienza a construir tu futuro financiero
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <Button asChild size="lg" className="text-lg px-8">
                            <Link to="/registro">
                                <UserPlus className="mr-2 h-5 w-5" />
                                Registrarme como Cliente
                            </Link>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="text-lg px-8">
                            <Link to="/contacto">
                                <Briefcase className="mr-2 h-5 w-5" />
                                Ser Partner Afiliado
                            </Link>
                        </Button>
                    </div>

                    <p className="text-sm text-muted-foreground pt-4">
                        Sin permanencia mínima • Cancela cuando quieras • Soporte 24/7
                    </p>
                </div>
            </section>
        </div>
    );
}
