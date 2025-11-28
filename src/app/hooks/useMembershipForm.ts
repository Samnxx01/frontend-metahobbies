import { useState } from "react";

// Interface for form data structure
interface MembershipFormData {
  [step: string]: {
    [field: string]: any;
  };
}

// Type for the form change handler
type HandleFormChange = (step: string, field: string, value: any) => void;

// Return type for the hook
type UseMembershipFormReturn = [MembershipFormData, HandleFormChange];

export function useMembershipForm(initialState: MembershipFormData): UseMembershipFormReturn {
  const [formData, setFormData] = useState<MembershipFormData>(initialState);

  const handleFormChange: HandleFormChange = (step: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [step]: {
        ...prev[step],
        [field]: value
      }
    }));
  };

  return [formData, handleFormChange];
}
