import { useState } from "react";
import { toast } from "react-toastify";

// Interface for personal info step
interface PersonalInfo {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  legalId: string;
  legalIdType: string;
}

// Interface for payment info step
interface PaymentInfo {
  [key: string]: string;
}

// Interface for the complete form data
interface MembershipPaymentFormData {
  personalInfo: PersonalInfo;
  paymentInfo: PaymentInfo;
  [step: string]: any;
}

// Interface for step configuration
interface Step {
  title: string;
  description?: string;
  [key: string]: any;
}

// Type for navigation function
type NavigateFunction = (path: string) => void;

// Type for purchase membership function
type PurchaseMembershipFunction = (token: string, email: string, authToken: string) => Promise<void>;

// Interface for hook parameters
interface UseMembershipPaymentFormParams {
  initialFormData: MembershipPaymentFormData;
  steps: Step[];
  purchaseMembership: PurchaseMembershipFunction;
  navigate: NavigateFunction;
  token: string;
}

// Type for form change handler
type HandleFormChange = (step: string, field: string, value: any) => void;

// Interface for hook return value
interface UseMembershipPaymentFormReturn {
  activeStep: number;
  setActiveStep: (step: number) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  formData: MembershipPaymentFormData;
  handleFormChange: HandleFormChange;
  validateStep: (step: number) => boolean;
  handlePayment: () => Promise<void>;
  handleNext: () => void;
  handleBack: () => void;
}

export function useMembershipPaymentForm({ 
  initialFormData, 
  steps, 
  purchaseMembership, 
  navigate, 
  token 
}: UseMembershipPaymentFormParams): UseMembershipPaymentFormReturn {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState<MembershipPaymentFormData>(initialFormData);

  const handleFormChange: HandleFormChange = (step: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [step]: {
        ...prev[step],
        [field]: value
      }
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: {
        const { nombre, apellido, email, telefono, legalId, legalIdType } = formData.personalInfo;
        const allFilled = [nombre, apellido, email, telefono, legalId, legalIdType].every(v => v.trim() !== "");
        const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
        const emailValid = emailRegex.test(email);
        const telefonoValid = /^\d+$/.test(telefono);
        const legalIdValid = /^\d+$/.test(legalId);
        return allFilled && emailValid && telefonoValid && legalIdValid;
      }
      case 1:
        return true;
      case 2:
        return Object.values(formData.paymentInfo).every(value => value.trim() !== "");
      default:
        return true;
    }
  };

  const handlePayment = async (): Promise<void> => {
    if (!validateStep(activeStep)) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }
    setLoading(true);
    try {
      await purchaseMembership(
        token,
        formData.personalInfo.email,
        "Bearer placeholder-token"
      );
      toast.success("¡Pago procesado exitosamente!");
      navigate("/membresia/dashboard");
    } catch (error) {
      console.error("Error en el pago:", error);
      toast.error("Error al procesar el pago");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = (): void => {
    if (!validateStep(activeStep)) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }
    if (activeStep === steps.length - 1) {
      handlePayment();
    } else {
      setActiveStep(prevStep => prevStep + 1);
    }
  };

  const handleBack = (): void => {
    setActiveStep(prevStep => prevStep - 1);
  };

  return {
    activeStep,
    setActiveStep,
    loading,
    setLoading,
    formData,
    handleFormChange,
    validateStep,
    handlePayment,
    handleNext,
    handleBack,
  };
}
