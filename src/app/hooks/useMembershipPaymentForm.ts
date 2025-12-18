import { useState } from "react";
import { toast } from "react-toastify";

// Interface for personal info step
interface PersonalInfo {
  email: string;
  phoneNumber?: string;
  fullName?: string;
}

// Interface for payment info step
interface PaymentInfo {
  paymentMethod: 'nequi' | 'card' | 'pse' | '';
  // Nequi fields
  nequiPhone?: string;
  // Card fields
  cardType?: 'credit' | 'debit';
  cardNumber?: string;
  cardName?: string;
  expiryDate?: string;
  cvv?: string;
  installments?: number;
  // PSE fields
  phoneNumber?: string;
  fullName?: string;
  pseUserType?: '0' | '1' | ''; // 0: Natural person, 1: Business
  pseLegalIdType?: 'CC' | 'CE' | 'NIT' | ''; // CC: Cédula, CE: Cédula de extranjería, NIT: NIT
  pseLegalId?: string; // Document number
  pseFinancialInstitution?: string; // Financial institution code
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
  purchaseMembership: _purchaseMembership, 
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
        const { email } = formData.personalInfo;
        const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
        return email.trim() !== "" && emailRegex.test(email);
      }
      case 1:
        return true;
      case 2: {
        const { paymentMethod, nequiPhone, cardType, cardNumber, cardName, expiryDate, cvv, installments, pseUserType, pseLegalIdType, pseLegalId, pseFinancialInstitution } = formData.paymentInfo;
        if (!paymentMethod) return false;
        
        if (paymentMethod === 'nequi') {
          // Validar teléfono colombiano: debe empezar con 3 y tener 10 dígitos
          const colombiaPhoneRegex = /^3\d{9}$/;
          return !!nequiPhone && colombiaPhoneRegex.test(nequiPhone);
        }
        
        if (paymentMethod === 'card') {
          const hasBasics = !!cardNumber && !!cardName && !!expiryDate && !!cvv &&
                 cardNumber.trim() !== "" && cardName.trim() !== "" &&
                 expiryDate.trim() !== "" && cvv.trim() !== "";
          if (!cardType) return false;
          if (cardType === 'credit') {
            const validInstallments = typeof installments === 'number' && installments > 0;
            return hasBasics && validInstallments;
          }
          // debit: no cuotas requeridas
          return hasBasics;
        }
        
        if (paymentMethod === 'pse') {
          return !!pseUserType && !!pseLegalIdType && !!pseLegalId && !!pseFinancialInstitution &&
                 pseLegalId.trim() !== "" && pseFinancialInstitution.trim() !== "";
        }
        
        return false;
      }
      default:
        return true;
    }
  };

  const getValidationErrorMessage = (step: number): string => {
    switch (step) {
      case 0: {
        const { email } = formData.personalInfo;
        if (!email.trim()) {
          return "Por favor ingresa tu correo electrónico";
        }
        const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
        if (!emailRegex.test(email)) {
          return "Por favor ingresa un correo electrónico válido";
        }
        return "Por favor completa la información de usuario";
      }
      case 2: {
        const { paymentMethod, nequiPhone, installments, cardType, phoneNumber, fullName } = formData.paymentInfo;
        if (!paymentMethod) {
          return "Por favor selecciona un método de pago";
        }
        
        if (paymentMethod === 'nequi') {
          if (!nequiPhone) {
            return "Por favor ingresa tu número de teléfono Nequi";
          }
          const colombiaPhoneRegex = /^3\d{9}$/;
          if (!colombiaPhoneRegex.test(nequiPhone)) {
            return "Por favor ingresa un número de teléfono colombiano válido (debe empezar con 3 y tener 10 dígitos)";
          }
        }
        
        if (paymentMethod === 'card') {
          if (!cardType) {
            return "Selecciona si la tarjeta es crédito o débito";
          }
          if (cardType === 'credit' && (!installments || installments <= 0)) {
            return "Selecciona el número de cuotas";
          }
          return "Por favor completa todos los datos de la tarjeta";
        }
        
        if (paymentMethod === 'pse') {
          if (!phoneNumber) {
            return "Por favor ingresa tu número de teléfono";
          }
          const colombiaPhoneRegex = /^3\d{9}$/;
          if (!colombiaPhoneRegex.test(phoneNumber)) {
            return "Por favor ingresa un número de teléfono colombiano válido (debe empezar con 3 y tener 10 dígitos)";
          }
          if (!fullName || !fullName.trim()) {
            return "Por favor ingresa tu nombre completo";
          }
          return "Por favor completa todos los datos de PSE";
        }
        
        return "Por favor completa la información de pago";
      }
      default:
        return "Por favor completa todos los campos requeridos";
    }
  };

  const handlePayment = async (): Promise<void> => {
    if (!validateStep(activeStep)) {
      toast.error(getValidationErrorMessage(activeStep));
      return;
    }

    // Verificar que existe el token de referido
    if (!token || token.trim() === '') {
      toast.error("No se encontró el token de referido. Por favor verifica el enlace de invitación.");
      return;
    }

    setLoading(true);
    try {
      let paymentData: any = {
        emailInvitado: formData.personalInfo.email,
      };

      // Preparar datos según el método de pago
      if (formData.paymentInfo.paymentMethod === 'nequi') {
        paymentData.payment_flow = 'API';
        paymentData.payment_method_type = 'NEQUI';
        paymentData.payment_method = {
          type: "NEQUI",
          phone_number: formData.paymentInfo.nequiPhone
        };
      } else if (formData.paymentInfo.paymentMethod === 'pse') {
        paymentData.payment_flow = 'CHECKOUT';
        paymentData.payment_method_type ='PSE';
        paymentData.payment_method = {
          type: "PSE",
          user_type: parseInt(formData.paymentInfo.pseUserType || '0'),
          user_legal_id_type: formData.paymentInfo.pseLegalIdType,
          user_legal_id: formData.paymentInfo.pseLegalId,
          financial_institution_code: formData.paymentInfo.pseFinancialInstitution,
          payment_description: `Membresía Premium - Ref: ${token.substring(0, 16)}`
        };
        paymentData.customer_data = {
          phone_number: formData.paymentInfo.phoneNumber,
          full_name: formData.paymentInfo.fullName
        };
      } else if (formData.paymentInfo.paymentMethod === 'card') {
        // Tokenizar la tarjeta con Wompi
        const wompiPublicKey = import.meta.env.VITE_WOMPI_PUBLIC_KEY;
        
        if (!wompiPublicKey) {
          throw new Error("Clave pública de Wompi no configurada");
        }

        // Separar mes y año de la fecha de expiración (MM/AA)
        const [expMonth, expYear] = formData.paymentInfo.expiryDate?.split('/') || ['', ''];
        
        if (!expMonth || !expYear) {
          throw new Error("Fecha de expiración inválida");
        }

        // Tokenizar tarjeta
        const tokenizeResponse = await fetch('https://production.wompi.co/v1/tokens/cards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${wompiPublicKey}`
          },
          body: JSON.stringify({
            number: formData.paymentInfo.cardNumber?.replace(/\s/g, ''),
            cvc: formData.paymentInfo.cvv,
            exp_month: expMonth,
            exp_year: expYear,
            card_holder: formData.paymentInfo.cardName
          })
        });

        if (!tokenizeResponse.ok) {
          const errorData = await tokenizeResponse.json().catch(() => ({ error: 'Error al tokenizar la tarjeta' }));
          throw new Error(errorData.error?.reason || errorData.error || 'Error al procesar la tarjeta');
        }

        const tokenData = await tokenizeResponse.json();
        
        if (!tokenData.data?.id) {
          throw new Error('No se pudo obtener el token de la tarjeta');
        }

        const installmentsToSend = formData.paymentInfo.cardType === 'debit'
          ? 1
          : (formData.paymentInfo.installments || 1);

        paymentData.payment_flow = 'API';
        paymentData.payment_method_type = 'CARD';
        paymentData.payment_method = {
          type: "CARD",
          installments: installmentsToSend,
          token: tokenData.data.id
        };
      }

      // Hacer petición al backend usando el token del referido
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
      const response = await fetch(
        `${API_BASE_URL}/membresia/seguridad/crear/crearmembresia/${token}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`, // Usar token del referido, no del usuario autenticado
          },
          body: JSON.stringify(paymentData)
        }
      );

      const data = await response.json();
      console.log('Respuesta del servidor:', data);

      // Verificar si hay un error con pago pendiente
      if (!response.ok || data.success === false) {
        const errorMsg = data.msg || data.message || `Error ${response.status}: ${response.statusText}`;
        throw new Error(errorMsg);
      }

      // Si el pago es PSE, redirigir al portal de Wompi
      if (formData.paymentInfo.paymentMethod === 'pse' && data?.wompiCheckoutUrl) {
        toast.success("Redirigiendo al portal de pago PSE...");
        window.location.href = data.wompiCheckoutUrl;
      } else {
        toast.success("¡Membresía creada exitosamente!");
        navigate("/membresia/dashboard");
      }
    } catch (error: any) {
      console.error("Error en el pago:", error);
      toast.error(error.message || "Error al procesar el pago. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = (): void => {
    if (!validateStep(activeStep)) {
      toast.error(getValidationErrorMessage(activeStep));
      return;
    }
    // En el último paso no avanzar, solo mostrar botón de pago
    if (activeStep < steps.length - 1) {
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
