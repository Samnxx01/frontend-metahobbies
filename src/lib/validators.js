export function validateEmail(email) {
  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  return emailRegex.test(email);
}

export function validateNumbers(value) {
  return /^\d+$/.test(value);
}
