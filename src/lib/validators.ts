// Email validation function
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  return emailRegex.test(email);
}

// Numbers only validation
export function validateNumbers(value: string): boolean {
  return /^\d+$/.test(value);
}

// Phone number validation (Colombian format)
export function validatePhone(phone: string): boolean {
  // Colombian phone: 10 digits, starts with 3
  const phoneRegex = /^3\d{9}$/;
  return phoneRegex.test(phone);
}

// Colombian ID validation (Cédula)
export function validateColombiannId(id: string): boolean {
  return /^\d{7,10}$/.test(id);
}

// Password strength validation
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('La contraseña debe tener al menos una mayúscula');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('La contraseña debe tener al menos una minúscula');
  }
  
  if (!/\d/.test(password)) {
    errors.push('La contraseña debe tener al menos un número');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Required field validation
export function validateRequired(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && value.trim() !== '';
}

// Length validation
export function validateLength(value: string, min: number, max?: number): boolean {
  if (max) {
    return value.length >= min && value.length <= max;
  }
  return value.length >= min;
}

// URL validation
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}