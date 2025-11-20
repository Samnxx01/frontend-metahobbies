import { Link } from 'react-router-dom'
import { Facebook, Instagram, Twitter, Mail, Phone } from 'lucide-react' // Importamos iconos de lucide-react

export default function Footer() {
    return (
        <footer className="bg-pink-100 py-8 mt-16">
            <div className="container mx-auto px-4 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="col-span-1 md:col-span-2 lg:col-span-1">
                        <h6 className="text-lg font-bold mb-4">Belleza & Glam</h6>
                        <p className="text-sm text-muted-foreground mb-4">
                            Tu destino para accesorios de belleza y maquillaje de alta calidad.
                            Descubre tu estilo y resalta tu belleza natural.
                        </p>
                        <div className="flex gap-2 mt-4">
                            <a href="#" className="text-foreground hover:text-primary transition-colors">
                                <Facebook className="h-5 w-5" />
                            </a>
                            <a href="#" className="text-foreground hover:text-primary transition-colors">
                                <Instagram className="h-5 w-5" />
                            </a>
                            <a href="#" className="text-foreground hover:text-primary transition-colors">
                                <Twitter className="h-5 w-5" />
                            </a>
                        </div>
                    </div>

                    <div>
                        <h6 className="text-lg font-semibold mb-4">Enlaces Rápidos</h6>
                        <nav className="flex flex-col gap-2">
                            <Link to="/productos" className="text-foreground hover:underline">
                                Productos
                            </Link>
                            <Link to="/nosotros" className="text-foreground hover:underline">
                                Sobre Nosotros
                            </Link>
                            <Link to="/contacto" className="text-foreground hover:underline">
                                Contacto
                            </Link>
                            <Link to="/envios" className="text-foreground hover:underline">
                                Envíos y Devoluciones
                            </Link>
                            <Link to="/politicas" className="text-foreground hover:underline">
                                Política de Privacidad
                            </Link>
                        </nav>
                    </div>

                    <div>
                        <h6 className="text-lg font-semibold mb-4">Contacto</h6>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                <p className="text-sm text-muted-foreground">
                                    contacto@bellezayglam.com
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <p className="text-sm text-muted-foreground">
                                    +1 234 567 890
                                </p>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                                Lunes a Viernes: 9:00 AM - 6:00 PM
                            </p>
                        </div>
                    </div>
                </div>

                <div className="border-t border-border mt-8 pt-4">
                    <p className="text-sm text-muted-foreground text-center">
                        © {new Date().getFullYear()} Belleza & Glam. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </footer>
    )
}