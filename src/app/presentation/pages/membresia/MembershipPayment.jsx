import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useMembership } from '../../../providers/MembershipProvider'; // Asumiendo que esta ruta sigue siendo válida
import { generateCheckout } from '@/lib/wompi/generateCheckout';

// Shadcn UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Lucide icons
import { Loader2, Check } from 'lucide-react';

const steps = ['Información Personal', 'Resumen', 'Pago'];
const MEMBERSHIP_PRICE = 1500;

// Componente utilitario para campos de formulario
const FormField = ({ id, label, value, onChange, type = 'text', required = false, placeholder = '' }) => (
    <div className="space-y-2">
        <Label htmlFor={id}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Input
            id={id}
            type={type}
            required={required}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full"
        />
    </div>
);

export default function MembershipPayment() {
    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { token } = useParams();
    const { purchaseMembership } = useMembership();
    const [formData, setFormData] = useState({
        personalInfo: {
            nombre: '',
            apellido: '',
            email: '',
            telefono: ''
        },
        paymentInfo: {
            cardNumber: '',
            expiryDate: '',
            cvv: '',
            cardName: ''
        }
    });

    const handleFormChange = (step, field, value) => {
        setFormData(prev => ({
            ...prev,
            [step]: {
                ...prev[step],
                [field]: value
            }
        }));
    };

    const validateStep = (step) => {
        switch (step) {
            case 0:
                return Object.values(formData.personalInfo).every(value => value.trim() !== '');
            case 1:
                return true; // El resumen no necesita validación
            case 2:
                // Validación básica: asegura que todos los campos no estén vacíos
                return Object.values(formData.paymentInfo).every(value => value.trim() !== '');
            default:
                return true;
        }
    };

    const handlePayment = async () => {
        if (!validateStep(activeStep)) {
            toast.error('Por favor completa todos los campos requeridos');
            return;
        }

        setLoading(true);
        try {
            await purchaseMembership(
                token,
                formData.personalInfo.email,
                'Bearer placeholder-token'
            );
            toast.success('¡Pago procesado exitosamente!');
            navigate('/membresia/dashboard');
        } catch (error) {
            console.error('Error en el pago:', error);
            toast.error('Error al procesar el pago');
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (!validateStep(activeStep)) {
            toast.error('Por favor completa todos los campos requeridos');
            return;
        }

        if (activeStep === steps.length - 1) {
            handlePayment();
        } else {
            setActiveStep((prevStep) => prevStep + 1);
        }
    };

    const handleBack = () => {
        setActiveStep((prevStep) => prevStep - 1);
    };

    // Componente custom para el Stepper (reemplaza MUI Stepper)
    const CustomStepper = ({ activeStep, steps }) => (
        <div className="flex justify-between items-center mb-8 relative after:absolute after:inset-x-0 after:top-1/2 after:h-0.5 after:-translate-y-1/2 after:bg-border after:z-0">
            {steps.map((label, index) => {
                const isCompleted = index < activeStep;
                const isActive = index === activeStep;

                return (
                    <div key={label} className="flex flex-col items-center w-full z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ring-4 ring-background 
                            ${isCompleted ? 'bg-primary text-primary-foreground' :
                                isActive ? 'bg-primary border-2 border-primary text-primary-foreground' :
                                    'bg-card text-muted-foreground border border-input'}`
                        }>
                            {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                        </div>
                        <span className={`mt-2 text-center text-xs sm:text-sm font-medium transition-colors duration-300 ${isActive ? 'text-primary' : 'text-foreground'}`}>
                            {label}
                        </span>
                    </div>
                );
            })}
        </div>
    );

    const renderStepContent = (step) => {
        switch (step) {
            case 0:
                // ...existing code...
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* ...campos personales... */}
                        <FormField
                            id="nombre"
                            label="Nombre"
                            required
                            value={formData.personalInfo.nombre}
                            onChange={(e) => handleFormChange('personalInfo', 'nombre', e.target.value)}
                        />
                        <FormField
                            id="apellido"
                            label="Apellido"
                            required
                            value={formData.personalInfo.apellido}
                            onChange={(e) => handleFormChange('personalInfo', 'apellido', e.target.value)}
                        />
                        <div className="sm:col-span-2">
                            <FormField
                                id="email"
                                label="Email"
                                type="email"
                                required
                                value={formData.personalInfo.email}
                                onChange={(e) => handleFormChange('personalInfo', 'email', e.target.value)}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <FormField
                                id="telefono"
                                label="Teléfono"
                                required
                                value={formData.personalInfo.telefono}
                                onChange={(e) => handleFormChange('personalInfo', 'telefono', e.target.value)}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <FormField
                                id="legalId"
                                label="Identificación (Legal ID)"
                                required
                                value={formData.personalInfo.legalId || ''}
                                onChange={(e) => handleFormChange('personalInfo', 'legalId', e.target.value)}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <FormField
                                id="legalIdType"
                                label="Tipo de Identificación (ID Type)"
                                required
                                value={formData.personalInfo.legalIdType || ''}
                                onChange={(e) => handleFormChange('personalInfo', 'legalIdType', e.target.value)}
                                placeholder="CC, CE, NIT, etc."
                            />
                        </div>
                    </div>
                );
            case 1:
                // ...existing code...
                return (
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold mb-4">
                            Resumen de la Membresía
                        </h3>
                        <div className="border rounded-lg p-4 bg-card shadow-sm">
                            <p className="text-lg font-semibold mb-1">
                                Membresía Premium
                            </p>
                            <p className="text-muted-foreground">• Acceso a descuentos exclusivos</p>
                            <p className="text-muted-foreground">• Programa de referidos</p>
                            <p className="text-muted-foreground">• Ganancias por referencias</p>
                            <div className="h-px bg-border my-4" />
                            <div className="flex justify-between items-center">
                                <p className="text-lg font-bold">Total:</p>
                                <p className="text-xl font-bold text-primary">
                                    COP ${MEMBERSHIP_PRICE.toLocaleString('es-CO')}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            case 2:
                // Solo botón para llamar a generateCheckout
                return (
                    <div className="flex flex-col items-center justify-center space-y-6">
                        <Button
                            size="lg"
                            className="w-full max-w-xs"
                            onClick={() => {
                                generateCheckout({
                                    currency: 'COP',
                                    amountInCents: MEMBERSHIP_PRICE * 100, // Puedes ajustar según MEMBERSHIP_PRICE
                                    reference: `membership-${formData.personalInfo.legalId}`,
                                    redirectUrl: 'https://transaction-redirect.wompi.co/check',
                                    customerData: {
                                        email: formData.personalInfo.email,
                                        fullName: `${formData.personalInfo.nombre} ${formData.personalInfo.apellido}`,
                                        phoneNumber: formData.personalInfo.telefono,
                                        phoneNumberPrefix: '+57',
                                        legalId: formData.personalInfo.legalId || '',
                                        legalIdType: formData.personalInfo.legalIdType || 'CC'
                                    },

                                });
                            }}
                        >
                            Pagar Membresía
                        </Button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="container max-w-3xl mx-auto py-12"> {/* Reemplaza Container maxWidth="md" y sx={{ py: 4 }} */}
            <div className="bg-card p-6 sm:p-8 rounded-xl shadow-lg border"> {/* Reemplaza Paper sx={{ p: 4, borderRadius: 2 }} */}

                <h1 className="text-2xl sm:text-3xl font-bold text-center mb-8"> {/* Reemplaza Typography variant="h4" */}
                    Membresía Premium
                </h1>

                {/* Stepper Custom */}
                <CustomStepper activeStep={activeStep} steps={steps} />

                {/* Contenido del Paso Actual */}
                {renderStepContent(activeStep)}

                {/* Controles de Navegación */}
                <div className="flex justify-end mt-8 gap-4"> {/* Reemplaza Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4, gap: 2 }} */}
                    {activeStep !== 0 && (
                        <Button
                            variant="outline"
                            onClick={handleBack}
                        >
                            Atrás
                        </Button>
                    )}
                    <Button
                        onClick={handleNext}
                        disabled={loading}
                    >
                        {loading ? (
                            // Reemplaza CircularProgress con Loader2 de Lucide
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            activeStep === steps.length - 1 ? 'Pagar' : 'Siguiente'
                        )}
                        {loading ? 'Procesando...' : ''}
                    </Button>
                </div>
            </div>
        </div>
    );
}