import type { AuthError } from '@supabase/supabase-js';

type T = (ar: string, en: string) => string;

/** Map a Supabase auth error to a friendly bilingual message. */
export function mapAuthError(err: AuthError | { message?: string; code?: string; status?: number } | null, t: T): string {
  if (!err) return '';
  const msg = (err.message ?? '').toLowerCase();
  const code = (err as { code?: string }).code ?? '';

  if (code === 'user_already_exists' || msg.includes('already registered') || msg.includes('already been registered')) {
    return t('هذا البريد مسجّل مسبقاً. سجّل الدخول بدلاً من ذلك.', 'This email is already registered. Try signing in instead.');
  }
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    return t('لم يتم تأكيد بريدك بعد. تحقق من صندوق الوارد أو أعد إرسال رابط التأكيد.', 'Your email is not confirmed yet. Check your inbox or resend the confirmation link.');
  }
  if (code === 'invalid_credentials' || msg.includes('invalid login') || msg.includes('invalid credentials')) {
    // Same copy as LoginPage when username resolve fails — no account-enumeration oracle.
    return t(
      'البريد أو اسم المستخدم أو كلمة المرور غير صحيحة.',
      'Invalid email, username, or password.',
    );
  }
  if (code === 'weak_password' || msg.includes('password should be')) {
    return t('كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل.', 'Password is too weak. Use at least 8 characters.');
  }
  if (code === 'over_email_send_rate_limit' || msg.includes('rate limit') || msg.includes('too many requests')) {
    return t('محاولات كثيرة. انتظر قليلاً ثم حاول مجدداً.', 'Too many attempts. Please wait a moment and try again.');
  }
  if (code === 'signup_disabled' || msg.includes('signups not allowed') || msg.includes('signup is disabled')) {
    return t('التسجيل معطّل حالياً. تواصل مع الدعم.', 'Sign-ups are currently disabled. Please contact support.');
  }
  if (msg.includes('database error')) {
    return t(
      'تعذّر إنشاء الحساب بسبب مشكلة في الخادم. حاول مرة أخرى بعد قليل.',
      'We could not create your account due to a server issue. Please try again shortly.'
    );
  }
  if (msg.includes('failed to fetch') || msg.includes('network')) {
    return t('تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت.', 'Could not reach the server. Check your internet connection.');
  }
  // Never leak raw provider English to the UI.
  return t('حدث خطأ غير متوقع.', 'An unexpected error occurred.');
}

/** Rate a password 0-4 for the strength meter. */
export function passwordScore(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}
