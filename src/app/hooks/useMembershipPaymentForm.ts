import { useState } from 'react';
import { toast } from 'react-toastify';
import type { ResultadoPago } from '@/app/presentation/pages/membresia/MembershipPayment';

interface PersonalInfo {
  email: string;
  phoneNumber?: string;
  fullName?: string;
}

interface PaymentInfo {
  paymentMethod: 'nequi' | 'card' | 'pse' | '';
  nequiPhone?: string;
  cardType?: 'credit' | 'debit';
  cardNumber?: string;
  cardName?: string;
  expiryDate?: string;
  cvv?: string;
  installments?: number;
  phoneNumber?: string;
  fullName?: string;
  pseUserType?: '0' | '1' | '';
  pseLegalIdType?: 'CC' | 'CE' | 'NIT' | '';
  pseLegalId?: string;
  pseFinancialInstitution?: string;
}

interface MembershipPaymentFormData {
  personalInfo: PersonalInfo;
  paymentInfo: PaymentInfo;
  [step: string]: any;
}

interface Step {
  title: string;
  description?: string;
  [key: string]: any;
}

type NavigateFunction = (path: string) => void;
type PurchaseMembershipFunction = (token: string, email: string, authToken: string) => Promise<void>;

interface UseMembershipPaymentFormParams {
  initialFormData: MembershipPaymentFormData;
  steps: Step[];
  purchaseMembership: PurchaseMembershipFunction;
  navigate: NavigateFunction;
  token: string;
  /** Callback que recibe el resultado del pago para mostrar el modal */
  onPagoTerminado?: (resultado: ResultadoPago) => void;
}

type HandleFormChange = (step: string, field: string, value: any) => void;

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

// Mapea status de Wompi → EstadoTx del modal
function wompiStatusToEstado(status: string): 'aprobada' | 'pendiente' | 'rechazada' {
  const s = status?.toUpperCase();
  if (s === 'APPROVED') return 'aprobada';
  if (s === 'PENDING') return 'pendiente';
  return 'rechazada';
}

export function useMembershipPaymentForm({
  initialFormData,
  steps,
  purchaseMembership: _purchaseMembership,
  navigate,
  token,
  onPagoTerminado,
}: UseMembershipPaymentFormParams): UseMembershipPaymentFormReturn {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState<MembershipPaymentFormData>(initialFormData);

  const handleFormChange: HandleFormChange = (step, field, value) => {
    setFormData(prev => ({
      ...prev,
      [step]: { ...prev[step], [field]: value },
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: {
        const { email } = formData.personalInfo;
        return email.trim() !== '' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
      }
      case 1:
        return true;
      case 2: {
        const {
          paymentMethod, nequiPhone, cardType, cardNumber, cardName,
          expiryDate, cvv, installments, pseUserType, pseLegalIdType,
          pseLegalId, pseFinancialInstitution,
        } = formData.paymentInfo;
        if (!paymentMethod) return false;
        if (paymentMethod === 'nequi') return !!nequiPhone && /^3\d{9}$/.test(nequiPhone);
        if (paymentMethod === 'card') {
          const ok = !!cardNumber && !!cardName && !!expiryDate && !!cvv;
          if (!cardType) return false;
          return cardType === 'credit' ? ok && !!installments && installments > 0 : ok;
        }
        if (paymentMethod === 'pse') {
          return !!pseUserType && !!pseLegalIdType &&
            !!pseLegalId?.trim() && !!pseFinancialInstitution?.trim();
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
        if (!email.trim()) return 'Por favor ingresa tu correo electrónico';
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return 'Por favor ingresa un correo electrónico válido';
        return 'Por favor completa la información de usuario';
      }
      case 2: {
        const { paymentMethod, nequiPhone, cardType, installments, phoneNumber, fullName } = formData.paymentInfo;
        if (!paymentMethod) return 'Por favor selecciona un método de pago';
        if (paymentMethod === 'nequi') {
          if (!nequiPhone) return 'Por favor ingresa tu número de teléfono Nequi';
          if (!/^3\d{9}$/.test(nequiPhone)) return 'Ingresa un número colombiano válido (empieza con 3, 10 dígitos)';
        }
        if (paymentMethod === 'card') {
          if (!cardType) return 'Selecciona si la tarjeta es crédito o débito';
          if (cardType === 'credit' && (!installments || installments <= 0)) return 'Selecciona el número de cuotas';
          return 'Por favor completa todos los datos de la tarjeta';
        }
        if (paymentMethod === 'pse') {
          if (!phoneNumber) return 'Por favor ingresa tu número de teléfono';
          if (!/^3\d{9}$/.test(phoneNumber)) return 'Ingresa un número colombiano válido (empieza con 3, 10 dígitos)';
          if (!fullName?.trim()) return 'Por favor ingresa tu nombre completo';
          return 'Por favor completa todos los datos de PSE';
        }
        return 'Por favor completa la información de pago';
      }
      default:
        return 'Por favor completa todos los campos requeridos';
    }
  };

  const handlePayment = async (): Promise<void> => {
    if (!validateStep(activeStep)) {
      toast.error(getValidationErrorMessage(activeStep));
      return;
    }
    if (!token?.trim()) {
      toast.error('No se encontró el token de referido. Verifica el enlace de invitación.');
      return;
    }

    setLoading(true);
    try {
      let paymentData: any = {
        emailInvitado: formData.personalInfo.email,
      };

      // Nequi
      if (formData.paymentInfo.paymentMethod === 'nequi') {
        paymentData.payment_flow = 'API';
        paymentData.payment_method_type = 'NEQUI';
        paymentData.payment_method = {
          type: 'NEQUI',
          phone_number: formData.paymentInfo.nequiPhone,
        };

        // PSE
      } else if (formData.paymentInfo.paymentMethod === 'pse') {
        paymentData.payment_flow = 'CHECKOUT';
        paymentData.payment_method_type = 'PSE';
        paymentData.payment_method = {
          type: 'PSE',
          user_type: parseInt(formData.paymentInfo.pseUserType || '0'),
          user_legal_id_type: formData.paymentInfo.pseLegalIdType,
          user_legal_id: formData.paymentInfo.pseLegalId,
          financial_institution_code: formData.paymentInfo.pseFinancialInstitution,
          payment_description: `Membresía Premium - Ref: ${token.substring(0, 16)}`,
        };
        paymentData.customer_data = {
          phone_number: formData.paymentInfo.phoneNumber,
          full_name: formData.paymentInfo.fullName,
        };

        // Tarjeta
      } else if (formData.paymentInfo.paymentMethod === 'card') {
        const wompiPublicKey = import.meta.env.VITE_WOMPI_PUBLIC_KEY;
        if (!wompiPublicKey) throw new Error('Clave pública de Wompi no configurada');

        const [expMonth, expYear] = formData.paymentInfo.expiryDate?.split('/') || ['', ''];
        if (!expMonth || !expYear) throw new Error('Fecha de expiración inválida');

        const tokenizeResponse = await fetch('https://production.wompi.co/v1/tokens/cards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${wompiPublicKey}`,
          },
          body: JSON.stringify({
            number: formData.paymentInfo.cardNumber?.replace(/\s/g, ''),
            cvc: formData.paymentInfo.cvv,
            exp_month: expMonth,
            exp_year: expYear,
            card_holder: formData.paymentInfo.cardName,
          }),
        });

        if (!tokenizeResponse.ok) {
          const errData = await tokenizeResponse.json().catch(() => ({}));
          throw new Error(errData.error?.reason || errData.error || 'Error al procesar la tarjeta');
        }

        const tokenData = await tokenizeResponse.json();
        if (!tokenData.data?.id) throw new Error('No se pudo obtener el token de la tarjeta');

        const installmentsToSend = formData.paymentInfo.cardType === 'debit'
          ? 1
          : (formData.paymentInfo.installments || 1);

        paymentData.payment_flow = 'API';
        paymentData.payment_method_type = 'CARD';
        paymentData.payment_method = {
          type: 'CARD',
          installments: installmentsToSend,
          token: tokenData.data.id,
        };
      }

      // Llamada al backend
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
      const response = await fetch(
        `${API_BASE_URL}/membresia/seguridad/crear/crearmembresia/${token}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(paymentData),
        }
      );

      const data = await response.json();
      console.log('Respuesta del servidor:', data);

      if (!response.ok || data.success === false) {
        throw new Error(data.msg || data.message || `Error ${response.status}`);
      }

      // PSE: redirigir al portal del banco (Wompi maneja el retorno)
      // El botón "Regresar al comercio" de Wompi usa el redirect_url
      // configurado en el backend → llega a /login con params
      if (formData.paymentInfo.paymentMethod === 'pse') {
        const checkoutUrl = data?.wompiCheckoutUrl ?? data?.data?.wompiCheckoutUrl;
        if (checkoutUrl) {
          toast.success('Redirigiendo al portal de pago PSE...');
          window.location.href = checkoutUrl;
          return;
        }
      }

      // Nequi / Tarjeta: leer estado final y abrir modal
      const wompiStatus: string =
        data?.transaccion?.status ??
        data?.data?.transaccion?.status ??
        data?.data?.status ??
        data?.status ??
        'PENDING';

      const referencia: string =
        data?.transaccion?.reference ??
        data?.data?.reference ??
        data?.referencia ??
        data?.reference ??
        '';

      const montoRaw: number =
        data?.transaccion?.amount_in_cents ??
        data?.data?.amount_in_cents ??
        data?.monto ??
        0;

      const moneda: string =
        data?.transaccion?.currency ??
        data?.data?.currency ??
        'COP';

      const estado = wompiStatusToEstado(wompiStatus);

      // Abrir modal con el voucher — si no hay callback, fallback a navigate
      if (onPagoTerminado) {
        onPagoTerminado({
          estado,
          referencia,
          monto: montoRaw > 0 ? montoRaw / 100 : undefined, // centavos → COP
          moneda,
          email: formData.personalInfo.email,
        });
      } else {
        // Fallback por si el hook se usa sin el modal
        navigate('/admin/gestor-rutas/administracion/dashboardadmin');
      }

    } catch (error: any) {
      console.error('Error en el pago:', error);
      toast.error(error.message || 'Error al procesar el pago. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = (): void => {
    if (!validateStep(activeStep)) {
      toast.error(getValidationErrorMessage(activeStep));
      return;
    }
    if (activeStep < steps.length - 1) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = (): void => {
    setActiveStep(prev => prev - 1);
  };

  return {
    activeStep, setActiveStep,
    loading, setLoading,
    formData, handleFormChange,
    validateStep, handlePayment,
    handleNext, handleBack,
  };
}