import { ArrowRight, Mail, MapPin, Phone } from 'lucide-react' // Importamos iconos de lucide-react
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const contactInfo = {
    phone: "+57 123 456 789",
    email: "contacto@mabs.com",
    address: "Bogotá, Colombia",
    mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d254508.51141489705!2d-74.107807!3d4.6482837!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e3f9bfd2da6cb29%3A0x239d635520a33914!2zQm9nb3TDoQ!5e0!3m2!1ses!2sco!4v1698538144010!5m2!1ses!2sco"
}

const contactMethods = [
    {
        icon: <Phone className="h-6 w-6 text-primary" />,
        title: 'Llámanos',
        value: contactInfo.phone
    },
    {
        icon: <Mail className="h-6 w-6 text-primary" />,
        title: 'Escríbenos',
        value: contactInfo.email
    },
    {
        icon: <MapPin className="h-6 w-6 text-primary" />,
        title: 'Visítanos',
        value: contactInfo.address
    }
]

export default function Contacto() {
    const handleSubmit = (e) => {
        e.preventDefault()
        // Aquí iría la lógica para enviar el formulario
    }

    return (
        <div className="container mx-auto py-8 lg:py-16">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold mb-4">Contáctanos</h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    ¿Tienes alguna pregunta o comentario? No dudes en contactarnos.
                    Estamos aquí para ayudarte.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {contactMethods.map((method, index) => (
                    <div
                        key={index}
                        className="flex flex-col items-center justify-center p-6 bg-card text-card-foreground rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:-translate-y-1"
                    >
                        <div className="mb-4">
                            {method.icon}
                        </div>
                        <h3 className="text-xl font-semibold mb-2">
                            {method.title}
                        </h3>
                        <p className="text-muted-foreground">
                            {method.value}
                        </p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Formulario */}
                <div className="bg-card text-card-foreground rounded-lg shadow-sm p-8">
                    <form onSubmit={handleSubmit} className="p-3">
                        <h3 className="text-2xl font-semibold mb-6">Nuestro Boletín</h3>
                        <p className="text-muted-foreground mb-6">
                            Suscríbete para recibir nuestras últimas novedades y ofertas especiales.
                        </p>

                        <div className="flex w-full items-center space-x-2">
                            <Label htmlFor="email" className="sr-only">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="Ingresa tu email"
                                className="flex-1"
                            />
                            <Button type="submit" size="icon" className="shrink-0">
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Mapa */}
                <div className="h-96 md:h-full min-h-[300px] rounded-lg overflow-hidden shadow-sm">
                    <iframe
                        src={contactInfo.mapUrl}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Ubicación de la empresa"
                    />
                </div>
            </div>
        </div>
    )
}