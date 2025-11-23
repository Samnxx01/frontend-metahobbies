import { useState } from "react";

export function useMembershipForm(initialState) {
  const [formData, setFormData] = useState(initialState);

  const handleFormChange = (step, field, value) => {
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
