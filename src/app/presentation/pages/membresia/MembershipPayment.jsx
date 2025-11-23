import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useMembership } from '../../../providers/MembershipProvider';
// generateCheckout is used by MembershipStepContent
// step content and checkout handled in separate component
import CustomStepper from '@/components/common/CustomStepper';
import MembershipStepContent from '@/components/membership/MembershipStepContent';
import { useMembershipPaymentForm } from '@/hooks/useMembershipPaymentForm';
import React, { useState, useEffect } from 'react';
// Shadcn UI components
import { Button } from "@/components/ui/button";

// Lucide icons
import { Loader2 } from 'lucide-react';

const steps = ['Información Personal', 'Resumen', 'Pago'];

 
export default function MembershipPayment() {
    const navigate = useNavigate();
    const { token } = useParams();
    const { purchaseMembership } = useMembership();
    // Membership price is loaded here so it can be replaced by an API call later.
    const [membershipPrice, setMembershipPrice] = useState(null);

    useEffect(() => {
        // TODO: replace with real API call, e.g. fetch('/api/memberships/price')
        async function loadPrice() {
            // placeholder fixed price for now
            setMembershipPrice(1500);
        }
        loadPrice();
    }, []);
    const {
        activeStep,
        loading,
        formData,
        handleFormChange,
        handleNext,
        handleBack,
    } = useMembershipPaymentForm({
        initialFormData: {
            personalInfo: {
                nombre: '',
                apellido: '',
                email: '',
                telefono: '',
                legalId: '',
                legalIdType: '',
            },
            paymentInfo: {
                cardNumber: '',
                expiryDate: '',
                cvv: '',
                cardName: ''
            }
        },
        steps,
        purchaseMembership,
        navigate,
        token,
    });

 
    return (
        <div className="container max-w-3xl mx-auto py-12"> {/* Reemplaza Container maxWidth="md" y sx={{ py: 4 }} */}
            <div className="bg-card p-6 sm:p-8 rounded-xl shadow-lg border"> {/* Reemplaza Paper sx={{ p: 4, borderRadius: 2 }} */}

                <h1 className="text-2xl sm:text-3xl font-bold text-center mb-8"> {/* Reemplaza Typography variant="h4" */}
                    Membresía Premium
                </h1>

                 <CustomStepper activeStep={activeStep} steps={steps} />

                                 <MembershipStepContent
                                    step={activeStep}
                                    formData={formData}
                                    handleFormChange={handleFormChange}
                                                MEMBERSHIP_PRICE={membershipPrice}
                                                token={token}
                                />

                 <div className="flex justify-end mt-8 gap-4"> 
                    {activeStep !== 0 && (
                        <Button
                            variant="outline"
                            onClick={handleBack}
                        >
                            Atrás
                        </Button>
                    )}
                    {activeStep !== steps.length - 1 && (
                        <Button
                            onClick={handleNext}
                            disabled={loading}
                        >
                            {loading ? (
                                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                'Siguiente'
                            )}
                            {loading ? 'Procesando...' : ''}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}