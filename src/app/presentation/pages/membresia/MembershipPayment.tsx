import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMembership } from '../../../providers/MembershipProvider';
import CustomStepper from '@/components/common/CustomStepper';
import MembershipStepContent from '@/components/membership/MembershipStepContent';
import { useMembershipPaymentForm } from '@/app/hooks/useMembershipPaymentForm';

// Shadcn UI components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Lucide icons
import { Loader2 } from 'lucide-react';

const steps = [
    { title: 'Email' },
    { title: 'Resumen' },
    { title: 'Pago' }
];

export default function MembershipPayment(): React.ReactElement {
    const navigate = useNavigate();
    const { token } = useParams<{ token: string }>();
    const { purchaseMembership: originalPurchaseMembership } = useMembership();
    const [membershipPrice, setMembershipPrice] = useState<number | null>(null);

    useEffect(() => {
        async function loadPrice() {
            // TODO: replace with real API call, e.g. fetch('/api/memberships/price')
            setMembershipPrice(1500);
        }
        loadPrice();
    }, []);

    // Wrapper function to match the expected signature
    const purchaseMembershipWrapper = async (userToken: string, email: string, authToken: string): Promise<void> => {
        // This is a placeholder - the actual implementation depends on the PaymentData structure
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

    return (
        <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <Card className="shadow-sm border-0 bg-card">
                    <CardHeader className="text-center pb-6">
                        <CardTitle className="text-2xl sm:text-3xl font-bold">
                            Membresía Premium
                        </CardTitle>
                        <p className="text-muted-foreground mt-2">
                            Completa tu registro para activar todos los beneficios
                        </p>
                    </CardHeader>

                    <CardContent className="space-y-8">
                        <CustomStepper activeStep={activeStep} steps={steps.map(s => s.title)} />

                        <MembershipStepContent
                            step={activeStep}
                            formData={formData as any}
                            handleFormChange={handleFormChange}
                            MEMBERSHIP_PRICE={membershipPrice}
                            token={token || ''}
                        />

                        <div className="flex justify-between items-center pt-6 border-t border-border/40">
                            {activeStep !== 0 ? (
                                <Button
                                    variant="outline"
                                    onClick={handleBack}
                                    className="min-w-[100px]"
                                    disabled={loading}
                                >
                                    Atrás
                                </Button>
                            ) : (
                                <div />
                            )}
                            
                            <Button
                                onClick={activeStep === steps.length - 1 ? handlePayment : handleNext}
                                disabled={loading}
                                className="min-w-[120px]"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    activeStep === steps.length - 1 ? 'Pagar Membresía' : 'Siguiente'
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
