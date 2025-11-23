import { useState } from "react";
import { toast } from "react-toastify";

export function useMembershipPaymentForm({ initialFormData, steps, purchaseMembership, navigate, token }) {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(initialFormData);

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

  const handlePayment = async () => {
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

  const handleNext = () => {
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

  const handleBack = () => {
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
