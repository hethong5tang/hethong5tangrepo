export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    specialChar: boolean;
  };
}

export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    specialChar: /[!@#$%^&*]/.test(password),
  };

  if (!checks.length) errors.push('Mật khẩu phải có ít nhất 8 ký tự.');
  if (!checks.uppercase) errors.push('Mật khẩu phải chứa ít nhất một chữ hoa.');
  if (!checks.lowercase) errors.push('Mật khẩu phải chứa ít nhất một chữ thường.');
  if (!checks.number) errors.push('Mật khẩu phải chứa ít nhất một chữ số.');
  if (!checks.specialChar) errors.push('Mật khẩu phải chứa ít nhất một ký tự đặc biệt (ví dụ: !@#$%^&*).');
  
  const isValid = Object.values(checks).every(Boolean);

  return { isValid, errors, checks };
};
