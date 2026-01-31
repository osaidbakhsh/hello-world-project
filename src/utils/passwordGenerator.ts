export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

const AMBIGUOUS_CHARS = 'O0l1I|';

export function generatePassword(options: PasswordOptions): string {
  let chars = '';
  
  if (options.uppercase) chars += UPPERCASE;
  if (options.lowercase) chars += LOWERCASE;
  if (options.numbers) chars += NUMBERS;
  if (options.symbols) chars += SYMBOLS;

  if (options.excludeAmbiguous) {
    chars = chars.split('').filter(c => !AMBIGUOUS_CHARS.includes(c)).join('');
  }

  if (!chars) {
    chars = LOWERCASE + NUMBERS;
  }

  const array = new Uint32Array(options.length);
  crypto.getRandomValues(array);

  let password = '';
  for (let i = 0; i < options.length; i++) {
    password += chars[array[i] % chars.length];
  }

  return password;
}

export interface PasswordStrength {
  score: number; // 0-4
  label: 'weak' | 'fair' | 'medium' | 'strong' | 'very_strong';
  color: string;
}

export function checkPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: 'weak', color: 'bg-destructive' };
  }

  let score = 0;
  
  // Length scoring
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  
  // Character diversity
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  // Penalize common patterns
  if (/(.)\1{2,}/.test(password)) score--; // Repeated chars
  if (/^[a-zA-Z]+$/.test(password)) score--; // Only letters
  if (/^[0-9]+$/.test(password)) score--; // Only numbers

  // Clamp score
  score = Math.max(0, Math.min(4, score));

  const labels: PasswordStrength['label'][] = ['weak', 'fair', 'medium', 'strong', 'very_strong'];
  const colors = [
    'bg-destructive',
    'bg-orange-500',
    'bg-warning',
    'bg-success',
    'bg-green-600',
  ];

  return {
    score,
    label: labels[score],
    color: colors[score],
  };
}

export const defaultPasswordOptions: PasswordOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: true,
};
