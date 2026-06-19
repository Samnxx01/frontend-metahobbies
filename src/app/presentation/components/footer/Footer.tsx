import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Mail, Phone, Clock, Loader2 } from 'lucide-react';
import { apiFetch } from '@/app/services/api';
import { useAuth } from '@/app/providers/AuthProvider';
import { getNavbarNavigationRoutes } from '@/app/services/routeService';
import { appendPublicAttributionToInternalPath } from '@/app/services/publicAttributionParams';
import type { FooterProps } from '@/types/components';

interface PerfilData {
    razon_social: string;
    descripcion: string;
    titulo: string;
    regisUsuario?: {
        correo?: string;
    };
    movil_corporativo?: number;
    direccion_empresa_relacion?: {
        telefono_empresa?: string;
        correo_empresa?: string;
        horario_atencion?: string;
        prefijo?: {
            prefijoTelefonicoPais?: string;
        };
    };
}

export default function Footer({ variant = 'default' }: FooterProps = {}): React.ReactElement {
    const isMinimal = variant === 'minimal';
    const { user, token } = useAuth();

    const [loading, setLoading] = useState(true);
    const [perfil, setPerfil] = useState<PerfilData | null>(null);
    const [quickLinks, setQuickLinks] = useState<Array<{ path: string; label: string }>>([]);

    // Carga perfil publico al montar: no envia JWT
    useEffect(() => {
        let active = true;

        const fetchPublicPerfil = async () => {
            try {
                const [perfilRes, dynamicLinks] = await Promise.all([
                    apiFetch('/api/configuracion/listar/coporativo/perfil/publico', {
                        method: 'GET',
                        useAuth: false,
                    }),
                    getNavbarNavigationRoutes(false)
                ]);

                if (!active) return;

                if (Array.isArray(dynamicLinks) && dynamicLinks.length > 0) {
                    setQuickLinks(dynamicLinks.map((item) => ({
                        path: item.path,
                        label: item.label
                    })));
                }

                if (perfilRes?.ok && perfilRes?.perfil) {
                    setPerfil(perfilRes.perfil);
                }
            } catch (err) {
                console.error('Error al cargar perfil publico del footer:', err);
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        fetchPublicPerfil();

        return () => {
            active = false;
        };
    }, []);

    // Si hay sesion/token, intenta perfil privado sin forzar logout en 401
    useEffect(() => {
        if (!user || !token) return;

        let active = true;

        const fetchPrivatePerfil = async () => {
            try {
                const [perfilRes, dynamicLinks] = await Promise.all([
                    apiFetch('/api/configuracion/listar/user/coporativo/perfil/publico', {
                        method: 'GET',
                        useAuth: true,
                        logoutOn401: false,
                    }),
                    getNavbarNavigationRoutes(true)
                ]);

                if (!active) return;

                if (Array.isArray(dynamicLinks) && dynamicLinks.length > 0) {
                    setQuickLinks(dynamicLinks.map((item) => ({
                        path: item.path,
                        label: item.label
                    })));
                }

                if (perfilRes?.ok && perfilRes?.perfil) {
                    setPerfil(perfilRes.perfil);
                }
            } catch (err) {
                console.error('Error al cargar perfil privado del footer, se mantiene publico:', err);
            }
        };

        fetchPrivatePerfil();

        return () => {
            active = false;
        };
    }, [user, token]);

    const fallbackQuickLinks = [
        { path: '/productos', label: 'Productos' },
        { path: '/sobre-nosotros', label: 'Sobre Nosotros' },
        { path: '/contacto', label: 'Contacto' },
        { path: '/modelo-negocio', label: 'Modelo de Negocio' },
        { path: '/posts', label: 'Blog' },
    ];

    const linksToRender = quickLinks.length > 0 ? quickLinks : fallbackQuickLinks;

    const razonSocial = perfil?.razon_social || 'Belleza & Glam';
    const descripcion =
        perfil?.descripcion ||
        'Tu destino para accesorios de belleza y maquillaje de alta calidad. Descubre tu estilo y resalta tu belleza natural.';
    const correo =
        perfil?.direccion_empresa_relacion?.correo_empresa ||
        perfil?.regisUsuario?.correo ||
        'contacto@bellezayglam.com';
    const telefono =
        perfil?.direccion_empresa_relacion?.telefono_empresa ||
        perfil?.movil_corporativo?.toString() ||
        '234 567 890';
    const prefijo = perfil?.direccion_empresa_relacion?.prefijo?.prefijoTelefonicoPais || '+57';
    const horario = perfil?.direccion_empresa_relacion?.horario_atencion || 'Lunes a Viernes: 9:00 AM - 6:00 PM';

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
            <footer className="bg-muted/50 py-8 md:py-12">
                <div className="container mx-auto px-4 flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </footer>
        );
    }

    return (
        <footer className="bg-muted/50 py-8 md:py-12">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                    <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                        <h6 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-foreground">{razonSocial}</h6>
                        <p className="text-sm md:text-base text-muted-foreground mb-4 leading-relaxed">{descripcion}</p>
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

                    <div className="col-span-1">
                        <h6 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-foreground">Enlaces Rapidos</h6>
                        <nav className="flex flex-col gap-2 md:gap-2.5">
                            {linksToRender.map((link) => (
                                <Link key={`${link.path}-${link.label}`} to={appendPublicAttributionToInternalPath(link.path)} className="text-sm md:text-base text-muted-foreground hover:text-primary hover:underline transition-colors">
                                    {link.label}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    <div className="col-span-1">
                        <h6 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-foreground">Contacto</h6>
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
                                <p className="text-sm md:text-base text-muted-foreground">{horario}</p>
                            </div>
                        </div>
                    </div>

                    <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                        <h6 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-foreground">Newsletter</h6>
                        <p className="text-sm md:text-base text-muted-foreground mb-3">Suscribete para recibir ofertas exclusivas</p>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="email"
                                placeholder="Tu email"
                                className="flex-1 px-3 py-2 text-sm md:text-base border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <button className="px-4 py-2 text-sm md:text-base bg-button text-button-foreground rounded-md hover:bg-button/90 transition-colors whitespace-nowrap">
                                Suscribirse
                            </button>
                        </div>
                    </div>
                </div>

                <div className="border-t border-border mt-8 md:mt-12 pt-6">
                    <p className="text-xs md:text-sm text-muted-foreground text-center">
                        © {new Date().getFullYear()} {razonSocial}. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </footer>
    );
}

// PR hecho por Gustavo Pereira el 13-02-2026
