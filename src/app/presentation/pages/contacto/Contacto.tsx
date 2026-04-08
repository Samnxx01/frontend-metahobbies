import React, { useState, useEffect } from 'react';
import { ArrowRight, Mail, MapPin, Phone, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/app/services/api';

interface PerfilData {
    razon_social?: string;
    movil_corporativo?: number;
    direccion_empresa?: string;
    url_mapa?: string;
    regisUsuario?: {
        correo?: string;
    };
    direccion_empresa_relacion?: {
        telefono_empresa?: string;
        correo_empresa?: string;
        horario_atencion?: string;
        ciudad?: {
            nombre_ciudad?: string;
        };
        departamento_estado?: {
            nombre_Dapartamento?: string;
        };
        prefijo?: {
            prefijoTelefonicoPais?: string;
        };
    };
}

interface ContactInfo {
    phone: string;
    email: string;
    address: string;
    mapUrl: string;
}

const DEFAULT_MAP_URL = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d125406.10851897372!2d-74.871131!3d10.983984!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8ef42d44d41f5ccb%3A0x697e43676171440d!2sBarranquilla%2C%20Atl%C3%A1ntico!5e0!3m2!1ses!2sco!4v1700000000000!5m2!1ses!2sco';

const buildAddressLabel = (perfil: PerfilData): string => {
    const ciudad = perfil.direccion_empresa_relacion?.ciudad?.nombre_ciudad?.trim();
    const departamento = perfil.direccion_empresa_relacion?.departamento_estado?.nombre_Dapartamento?.trim();
    const direccion = perfil.direccion_empresa?.trim();

    return [direccion, ciudad, departamento].filter(Boolean).join(', ') || 'Colombia';
};

const buildPhoneLabel = (perfil: PerfilData): string => {
    const prefijo = perfil.direccion_empresa_relacion?.prefijo?.prefijoTelefonicoPais?.trim() || '+57';
    const telefono =
        perfil.direccion_empresa_relacion?.telefono_empresa?.trim() ||
        (perfil.movil_corporativo ? String(perfil.movil_corporativo) : '');

    return telefono ? `${prefijo} ${telefono}` : '+57 300 123 4567';
};

const buildEmailLabel = (perfil: PerfilData): string => {
    return (
        perfil.direccion_empresa_relacion?.correo_empresa?.trim() ||
        perfil.regisUsuario?.correo?.trim() ||
        'contacto@mabs.com'
    );
};

export default function Contacto(): React.ReactElement {
    const [info, setInfo] = useState<ContactInfo>({
        phone: '+57 300 123 4567',
        email: 'contacto@mabs.com',
        address: 'Colombia',
        mapUrl: DEFAULT_MAP_URL,
    });

    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchContactInfo = async () => {
            setLoading(true);
            try {
                const res = await apiFetch('/api/configuracion/listar/coporativo/perfil/publico', {
                    method: 'GET',
                    useAuth: false,
                    logoutOn401: false,
                });

                if (res?.ok && res.perfil) {
                    const perfil = res.perfil as PerfilData;

                    setInfo({
                        phone: buildPhoneLabel(perfil),
                        email: buildEmailLabel(perfil),
                        address: buildAddressLabel(perfil),
                        mapUrl: perfil.url_mapa || DEFAULT_MAP_URL,
                    });
                }
            } catch (error) {
                console.error('Error en contacto (usando fallback):', error);
            } finally {
                setLoading(false);
            }
        };

        fetchContactInfo();
    }, []);

    const contactMethods = [
        { icon: <Phone className="h-6 w-6 text-primary" />, title: 'Llamanos', value: info.phone },
        { icon: <Mail className="h-6 w-6 text-primary" />, title: 'Escribenos', value: info.email },
        { icon: <MapPin className="h-6 w-6 text-primary" />, title: 'Visitanos', value: info.address }
    ];

    return (
        <div className="container mx-auto py-8 lg:py-16">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold mb-4">Contactanos</h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Tienes alguna pregunta? Estamos aqui para ayudarte a escalar tu red de referidos.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {contactMethods.map((method, index) => (
                    <div key={index} className="flex flex-col items-center justify-center p-6 bg-card rounded-lg shadow-sm border border-border/40 transition-transform hover:-translate-y-1">
                        <div className="mb-4 bg-primary/10 p-3 rounded-full">{method.icon}</div>
                        <h3 className="text-xl font-semibold mb-2">{method.title}</h3>
                        <div className="text-muted-foreground text-center font-medium">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : method.value}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-card text-card-foreground rounded-lg shadow-sm p-8 border">
                    <div className="p-3">
                        <h3 className="text-2xl font-semibold mb-6">Nuestro Boletin</h3>
                        <p className="text-muted-foreground mb-6">Suscribete para recibir noticias sobre nuevas funciones.</p>
                        <div className="flex w-full items-center space-x-2">
                            <Input type="email" placeholder="Ingresa tu email" className="flex-1" />
                            <Button size="icon"><ArrowRight className="h-4 w-4" /></Button>
                        </div>
                    </div>
                </div>

                <div className="h-96 md:h-full min-h-[300px] rounded-lg overflow-hidden shadow-sm border bg-muted">
                    <iframe
                        src={info.mapUrl}
                        width="100%" height="100%" style={{ border: 0 }}
                        allowFullScreen loading="lazy" title="Ubicacion"
                    />
                </div>
            </div>
        </div>
    );
}

// PR hecho por Gustavo Pereira el 13-02-2026
