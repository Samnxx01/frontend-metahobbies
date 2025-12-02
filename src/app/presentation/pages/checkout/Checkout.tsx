import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Lucide icons
import { Check, Truck, CreditCard, ShoppingCart } from 'lucide-react';

interface SimpleInputFieldProps {
    label: string;
    type?: string;
}

interface CustomStepperProps {
    activeStep: number;
    steps: string[];
}

// Componente simulado para campos de formulario
const SimpleInputField = ({ label, type = 'text' }: SimpleInputFieldProps): React.ReactElement => (
    <div className="space-y-2">
        <Label>{label}</Label>
        <Input type={type} placeholder={`Ingresa ${label.toLowerCase()}`} className="w-full" />
    </div>
);

// Componente Stepper reutilizado y adaptado
const steps = ['Dirección de Envío', 'Método de Pago', 'Confirmación'];

const CustomStepper = ({ activeStep, steps }: CustomStepperProps): React.ReactElement => (
    <div className="flex justify-between items-center mb-10 relative after:absolute after:inset-x-0 after:top-[18px] after:h-0.5 after:-translate-y-1/2 after:bg-border after:z-0">
        {steps.map((label, index) => {
            const isCompleted = index < activeStep;
            const isActive = index === activeStep;

            return (
                <div key={label} className="flex flex-col items-center w-full z-10">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ring-4 ring-background 
                        ${isCompleted ? 'bg-primary text-primary-foreground' :
                            isActive ? 'bg-primary border-2 border-primary text-primary-foreground' :
                                'bg-card text-muted-foreground border border-input'}`
                    }>
                        {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                    </div>
                    <span className={`mt-2 text-center text-xs sm:text-sm font-medium transition-colors duration-300 ${isActive ? 'text-primary font-semibold' : 'text-foreground'}`}>
                        {label}
                    </span>
                </div>
            );
        })}
    </div>
);


export default function Checkout(): React.ReactElement {
    const [activeStep, setActiveStep] = useState<number>(0);

    const nextStep = (): void => setActiveStep((prev) => prev + 1);
    const backStep = (): void => setActiveStep((prev) => prev - 1);

    return (
        <div className="container max-w-4xl mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-8 text-center">
                Finalizar Compra
            </h1>

            {/* Stepper */}
            <CustomStepper activeStep={activeStep} steps={steps} />

            <div className="flex justify-center">

                {activeStep === 0 && (
                    <Card className="w-full max-w-2xl shadow-xl border">
                        <CardContent className="p-6 sm:p-8">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <Truck className='w-5 h-5 text-primary' /> Datos de Envío
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">

                                <SimpleInputField label="Nombre completo" />
                                <SimpleInputField label="Teléfono" type="tel" />

                                <div className="col-span-full">
                                    <SimpleInputField label="Dirección" />
                                </div>

                                <SimpleInputField label="Ciudad" />
                                <SimpleInputField label="Código Postal" />
                                <div className="col-span-full">
                                    <SimpleInputField label="País" />
                                </div>

                                <div className="col-span-full pt-4">
                                    <Button className="w-full h-12 text-base" onClick={nextStep}>
                                        Continuar
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeStep === 1 && (
                    <Card className="w-full max-w-2xl shadow-xl border">
                        <CardContent className="p-6 sm:p-8">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <CreditCard className='w-5 h-5 text-primary' /> Método de Pago
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                <div className='col-span-full'>
                                    <SimpleInputField label="Nombre del titular" />
                                </div>
                                <div className='col-span-full'>
                                    <SimpleInputField label="Número de tarjeta" />
                                </div>
                                <div className='sm:col-span-4'>
                                    <SimpleInputField label="Fecha de vencimiento" />
                                </div>
                                <div className='sm:col-span-2'>
                                    <SimpleInputField label="CVV" />
                                </div>

                                <div className="col-span-full pt-4 flex gap-4">
                                    <Button variant="outline" onClick={backStep} className="flex-1 h-12 text-base">
                                        Volver
                                    </Button>
                                    <Button onClick={nextStep} className="flex-1 h-12 text-base">
                                        Continuar
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeStep === 2 && (
                    <Card className="w-full max-w-2xl shadow-xl border">
                        <CardContent className="p-8 sm:p-10 text-center">

                            {/* Icono de Confirmación */}
                            <div
                                className="w-20 h-20 rounded-full bg-green-500 text-white flex items-center justify-center mx-auto mb-6 shadow-xl"
                            >
                                <Check className='w-10 h-10' />
                            </div>

                            <h2 className="text-2xl font-bold mb-2">
                                ¡Pedido Confirmado!
                            </h2>
                            <p className="text-muted-foreground mb-1">
                                Gracias por tu compra. Tu pedido ha sido procesado exitosamente.
                            </p>
                            <p className="text-sm text-muted-foreground mb-6 font-mono">
                                Número de pedido: #123456
                            </p>
                            <Button size="lg" onClick={() => console.log('Navegar a pedidos')}>
                                <ShoppingCart className='w-5 h-5 mr-2' />
                                Ver Mis Pedidos
                            </Button>
                        </CardContent>
                    </Card>
                )}

            </div>
        </div>
    );
}
