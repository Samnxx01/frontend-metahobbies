import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMembership } from '../../../providers/MembershipProvider';
import MembershipStepContent from '@/components/membership/MembershipStepContent';
import { useMembershipPaymentForm } from '@/app/hooks/useMembershipPaymentForm';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, ArrowRight, ArrowLeft, CreditCard, Sparkles } from 'lucide-react';

const steps = [
    { title: 'Email', icon: '📧' },
    { title: 'Resumen', icon: '📋' },
    { title: 'Pago', icon: '💳' }
];

export default function MembershipPayment(): React.ReactElement {
    const navigate = useNavigate();
    const { token } = useParams<{ token: string }>();
    const { purchaseMembership: originalPurchaseMembership } = useMembership();
    const [membershipPrice, setMembershipPrice] = useState<number | null>(null);

    useEffect(() => {
        async function loadPrice() {
            setMembershipPrice(1500);
        }
        loadPrice();
    }, []);

    const purchaseMembershipWrapper = async (userToken: string, email: string, authToken: string): Promise<void> => {
        const paymentData = { email, authToken } as any;
        await originalPurchaseMembership(paymentData, userToken);
    };

    const {
        activeStep,
        loading,
        formData,
        handleFormChange,
        handleNext,
        handleBack,
        handlePayment,
    } = useMembershipPaymentForm({
        initialFormData: {
            personalInfo: {
                email: '',
            },
            paymentInfo: {
                paymentMethod: '',
                cardType: undefined,
                nequiPhone: '',
                cardNumber: '',
                cardName: '',
                expiryDate: '',
                cvv: '',
                installments: 1,
                phoneNumber: '',
                fullName: '',
                pseUserType: '',
                pseLegalIdType: '',
                pseLegalId: '',
                pseFinancialInstitution: ''
            }
        },
        steps,
        purchaseMembership: purchaseMembershipWrapper,
        navigate,
        token: token || '',
    });

    const isLastStep = activeStep === steps.length - 1;

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8 sm:py-12 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header con Badge Premium */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-sm font-semibold">Membresía Premium</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                        Activa tu Membresía
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-base">
                        Solo {steps.length} pasos para desbloquear todos los beneficios
                    </p>
                </div>

                {/* Stepper Minimalista */}
                <div className="mb-8">
                    <div className="flex items-center justify-between max-w-md mx-auto">
                        {steps.map((step, index) => (
                            <React.Fragment key={step.title}>
                                {/* Step Circle */}
                                <div className="flex flex-col items-center gap-2">
                                    <div
                                        className={`
                                            w-12 h-12 rounded-full flex items-center justify-center text-xl
                                            transition-all duration-300 border-2
                                            ${index === activeStep
                                                ? 'bg-primary border-primary text-primary-foreground scale-110 shadow-lg'
                                                : index < activeStep
                                                    ? 'bg-primary/20 border-primary text-primary'
                                                    : 'bg-muted border-muted-foreground/20 text-muted-foreground'
                                            }
                                        `}
                                    >
                                        {index < activeStep ? '✓' : step.icon}
                                    </div>
                                    <span
                                        className={`
                                            text-xs font-medium transition-colors
                                            ${index === activeStep ? 'text-foreground' : 'text-muted-foreground'}
                                        `}
                                    >
                                        {step.title}
                                    </span>
                                </div>

                                {/* Connector Line */}
                                {index < steps.length - 1 && (
                                    <div
                                        className={`
                                            flex-1 h-0.5 mx-2 transition-colors duration-300
                                            ${index < activeStep ? 'bg-primary' : 'bg-muted-foreground/20'}
                                        `}
                                    />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Content Card */}
                <Card className="shadow-lg border-0 overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-b border-border/40 pb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <span className="text-2xl">{steps[activeStep].icon}</span>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                                    Paso {activeStep + 1} de {steps.length}
                                </p>
                                <h2 className="text-xl font-semibold text-foreground">
                                    {steps[activeStep].title}
                                </h2>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6 sm:p-8">
                        {/* Step Content */}
                        <div className="mb-8">
                            <MembershipStepContent
                                step={activeStep}
                                formData={formData as any}
                                handleFormChange={handleFormChange}
                                MEMBERSHIP_PRICE={membershipPrice}
                                token={token || ''}
                            />
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex items-center justify-between gap-4 pt-6 border-t border-border/40">
                            {activeStep !== 0 ? (
                                <Button
                                    variant="ghost"
                                    onClick={handleBack}
                                    disabled={loading}
                                    className="gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Anterior
                                </Button>
                            ) : (
                                <div />
                            )}

                            <Button
                                onClick={isLastStep ? handlePayment : handleNext}
                                disabled={loading}
                                size="lg"
                                className={`
                                    gap-2 min-w-[160px] font-semibold
                                    ${isLastStep ? 'bg-gradient-to-r from-primary to-primary/80 shadow-lg' : ''}
                                `}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Procesando...
                                    </>
                                ) : isLastStep ? (
                                    <>
                                        <CreditCard className="w-4 h-4" />
                                        Pagar Membresía
                                    </>
                                ) : (
                                    <>
                                        Continuar
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer con beneficios */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-muted-foreground">
                        🔒 Pago 100% seguro • ⚡ Activación inmediata • 💎 Acceso de por vida
                    </p>
                </div>
            </div>
        </div>
    );
}