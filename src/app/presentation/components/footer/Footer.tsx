import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Mail, Phone, Clock, Loader2 } from 'lucide-react';
import { apiFetch } from '@/app/services/api';
import type { FooterProps } from '@/types/components';

interface DireccionData {
    correo_empresa: string;
    telefono_empresa: string;
    horario_atencion: string;
    prefijo: {
        prefijoTelefonicoPais: string;
    };
}

interface PerfilData {
    razon_social: string;
    descripcion: string;
    titulo: string;
}

export default function Footer({ variant = 'default' }: FooterProps = {}): React.ReactElement {
    const isMinimal = variant === 'minimal';

    const [loading, setLoading] = useState(true);
    const [direccion, setDireccion] = useState<DireccionData | null>(null);
    const [perfil, setPerfil] = useState<PerfilData | null>(null);

    useEffect(() => {
        const fetchFooterData = async () => {
            try {

                const [direccionRes, perfilRes] = await Promise.all([
                    apiFetch('/api/config/parametrizacion/direccion/coporativa', { method: 'GET' }),
                    apiFetch('/api/configuracion/listar/user/coporativo/perfil/publico', { method: 'GET' })
                ]);

                if (direccionRes?.ok && direccionRes?.direcciones?.length > 0) {
                    setDireccion(direccionRes.direcciones[0]);
                }

                if (perfilRes?.ok && perfilRes?.perfil) {
                    setPerfil(perfilRes.perfil);
                }
            } catch (err) {
                console.error('❌ Error al cargar datos del footer:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchFooterData();
    }, []);

    const razonSocial = perfil?.razon_social || 'Belleza & Glam';
    const descripcion = perfil?.descripcion || 'Tu destino para accesorios de belleza y maquillaje de alta calidad. Descubre tu estilo y resalta tu belleza natural.';
    const correo = direccion?.correo_empresa || 'contacto@bellezayglam.com';
    const telefono = direccion?.telefono_empresa || '234 567 890';
    const prefijo = direccion?.prefijo?.prefijoTelefonicoPais || '+1';
    const horario = direccion?.horario_atencion || 'Lunes a Viernes: 9:00 AM - 6:00 PM';

    if (isMinimal) {
        return (
            <footer className="bg-muted py-4 mt-8">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-xs md:text-sm text-muted-foreground">
                        © {new Date().getFullYear()} {razonSocial}. Todos los derechos reservados.
                    </p>
                </div>
            </footer>
        );
    }

    if (loading) {
        return (
            <footer className="bg-pink-100 dark:bg-card py-8 md:py-12">
                <div className="container mx-auto px-4 flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </footer>
        );
    }

    return (
        <footer className="bg-pink-100 dark:bg-card py-8 md:py-12">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                    {/* Columna 1: Logo y Descripción */}
                    <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                        <h6 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-foreground">
                            {razonSocial}
                        </h6>
                        <p className="text-sm md:text-base text-muted-foreground mb-4 leading-relaxed">
                            {descripcion}
                        </p>
                        <div className="flex gap-3 mt-4">
                            <a
                                href="#"
                                className="text-foreground hover:text-primary transition-colors p-2 hover:bg-primary/10 rounded-full"
                                aria-label="Facebook"
                            >
                                <Facebook className="h-5 w-5" />
                            </a>
                            <a
                                href="#"
                                className="text-foreground hover:text-primary transition-colors p-2 hover:bg-primary/10 rounded-full"
                                aria-label="Instagram"
                            >
                                <Instagram className="h-5 w-5" />
                            </a>
                            <a
                                href="#"
                                className="text-foreground hover:text-primary transition-colors p-2 hover:bg-primary/10 rounded-full"
                                aria-label="Twitter"
                            >
                                <Twitter className="h-5 w-5" />
                            </a>
                        </div>
                    </div>

                    {/* Columna 2: Enlaces Rápidos */}
                    <div className="col-span-1">
                        <h6 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-foreground">
                            Enlaces Rápidos
                        </h6>
                        <nav className="flex flex-col gap-2 md:gap-2.5">
                            <Link
                                to="/productos"
                                className="text-sm md:text-base text-muted-foreground hover:text-primary hover:underline transition-colors"
                            >
                                Productos
                            </Link>
                            <Link
                                to="/nosotros"
                                className="text-sm md:text-base text-muted-foreground hover:text-primary hover:underline transition-colors"
                            >
                                Sobre Nosotros
                            </Link>
                            <Link
                                to="/contacto"
                                className="text-sm md:text-base text-muted-foreground hover:text-primary hover:underline transition-colors"
                            >
                                Contacto
                            </Link>
                            <Link
                                to="/envios"
                                className="text-sm md:text-base text-muted-foreground hover:text-primary hover:underline transition-colors"
                            >
                                Envíos y Devoluciones
                            </Link>
                            <Link
                                to="/politicas"
                                className="text-sm md:text-base text-muted-foreground hover:text-primary hover:underline transition-colors"
                            >
                                Política de Privacidad
                            </Link>
                        </nav>
                    </div>

                    {/* Columna 3: Contacto */}
                    <div className="col-span-1">
                        <h6 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-foreground">
                            Contacto
                        </h6>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-start gap-2">
                                <Mail className="h-4 w-4 md:h-5 md:w-5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                                <a
                                    href={`mailto:${correo}`}
                                    className="text-sm md:text-base text-muted-foreground hover:text-primary transition-colors break-all"
                                >
                                    {correo}
                                </a>
                            </div>
                            <div className="flex items-start gap-2">
                                <Phone className="h-4 w-4 md:h-5 md:w-5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                                <a
                                    href={`tel:${prefijo}${telefono}`}
                                    className="text-sm md:text-base text-muted-foreground hover:text-primary transition-colors"
                                >
                                    {prefijo} {telefono}
                                </a>
                            </div>
                            <div className="flex items-start gap-2">
                                <Clock className="h-4 w-4 md:h-5 md:w-5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                                <p className="text-sm md:text-base text-muted-foreground">
                                    {horario}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Columna 4: Newsletter */}
                    <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                        <h6 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-foreground">
                            Newsletter
                        </h6>
                        <p className="text-sm md:text-base text-muted-foreground mb-3">
                            Suscríbete para recibir ofertas exclusivas
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="email"
                                placeholder="Tu email"
                                className="flex-1 px-3 py-2 text-sm md:text-base border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <button className="px-4 py-2 text-sm md:text-base bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors whitespace-nowrap">
                                Suscribirse
                            </button>
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <div className="border-t border-border mt-8 md:mt-12 pt-6">
                    <p className="text-xs md:text-sm text-muted-foreground text-center">
                        © {new Date().getFullYear()} {razonSocial}. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </footer>
    );
}