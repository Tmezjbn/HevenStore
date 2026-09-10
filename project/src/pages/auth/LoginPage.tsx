import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useI18n } from '../../lib/i18n';
import { mapAuthError } from '../../lib/authErrors';
import { safeAppPath } from '../../lib/authRedirect';
import { looksLikeEmail } from '../../lib/username';
import AuthShell from '../../components/auth/AuthShell';

export default function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const afterAuth = safeAppPath(params.get('next'));
  const addingAccount = params.get('add') === '1';
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [resent, setResent] = useState(false);
  const [resolvedEmail, setResolvedEmail] = useState('');

  // Already signed in? Honor ?next= (e.g. /cart) — never open-redirect.
  if (!authLoading && user) return <Navigate to={afterAuth} replace />;

  /** Same message for wrong password AND unknown username — no account-enumeration oracle. */
  const invalidLoginMsg = () =>
    t(
      'البريد أو اسم المستخدم أو كلمة المرور غير صحيحة.',
      'Invalid email, username, or password.',
    );

  const rateLimitedMsg = () =>
    t('محاولات كثيرة. انتظر دقيقة ثم حاول مجدداً.', 'Too many attempts. Wait a minute and try again.');

  const resolveEmail = async (raw: string): Promise<string | null | 'RATE_LIMITED'> => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (looksLikeEmail(trimmed)) return trimmed;
    const { data, error: rpcErr } = await supabase.rpc('resolve_login_email', { p_login: trimmed });
    if (rpcErr?.message?.includes('RATE_LIMITED')) return 'RATE_LIMITED';
    if (rpcErr || !data) return null;
    return typeof data === 'string' ? data : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNeedsConfirm(false);
    setResent(false);
    setLoading(true);
    const email = await resolveEmail(login);
    if (email === 'RATE_LIMITED') {
      setLoading(false);
      setError(rateLimitedMsg());
      return;
    }
    if (!email) {
      setLoading(false);
      setError(invalidLoginMsg());
      return;
    }
    setResolvedEmail(email);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(mapAuthError(err, t));
      const code = (err as { code?: string }).code ?? '';
      if (code === 'email_not_confirmed' || err.message.toLowerCase().includes('email not confirmed')) {
        setNeedsConfirm(true);
      }
      return;
    }
    navigate(afterAuth);
  };

  const resendConfirmation = async () => {
    setResent(false);
    const email = resolvedEmail || (await resolveEmail(login));
    if (email === 'RATE_LIMITED') {
      setError(rateLimitedMsg());
      return;
    }
    if (!email) {
      // Don't confirm whether the account exists.
      setError(invalidLoginMsg());
      return;
    }
    const { error: err } = await supabase.auth.resend({ type: 'signup', email });
    if (!err) setResent(true);
    else setError(mapAuthError(err, t));
  };

  return (
    <AuthShell
      title={t('مرحباً بعودتك', 'Welcome back')}
      subtitle={
        addingAccount
          ? t('سجّل دخول الحساب الثاني للتبديل لاحقاً', 'Sign in to the second account to switch later')
          : t('سجّل دخولك لمتابعة التسوق', 'Sign in to your account')
      }
      footer={
        <>
          {t('ليس لديك حساب؟', "Don't have an account?")}{' '}
          <Link
            to={afterAuth !== '/' ? `/auth/register?next=${encodeURIComponent(afterAuth)}` : '/auth/register'}
            className="link link-primary font-medium"
          >
            {t('إنشاء حساب جديد', 'Sign Up')}
          </Link>
        </>
      }
    >
      {addingAccount ? (
        <div className="alert alert-info text-sm mb-2">
          {t(
            'الحساب السابق محفوظ على هذا الجهاز. بعد الدخول يمكنك التبديل بينهما.',
            'Your previous account is parked on this device. After sign-in you can switch between them.',
          )}
        </div>
      ) : null}
      {error && <div role="alert" className="alert alert-error text-sm mb-2">{error}</div>}
      {needsConfirm && (
        <div className="alert alert-warning text-sm mb-2 flex-col items-start gap-2">
          <span>{t('حسابك غير مؤكَّد بعد.', 'Your account is not confirmed yet.')}</span>
          {resent ? (
            <span className="opacity-70">{t('تم إرسال رابط جديد.', 'A new link has been sent.')}</span>
          ) : (
            <button type="button" onClick={resendConfirmation} className="btn btn-xs btn-neutral">
              {t('إعادة إرسال رابط التأكيد', 'Resend confirmation link')}
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-control w-full">
          <span className="label py-1 px-0">
            <span className="label-text text-sm font-medium">
              {t('البريد أو اسم المستخدم', 'Email or username')}
            </span>
          </span>
          <label className="input input-bordered flex items-center gap-2 w-full">
            <Mail size={15} className="opacity-50" aria-hidden />
            <input
              type="text"
              required
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder={t('البريد أو اسم المستخدم', 'Email or username')}
              aria-label={t('البريد أو اسم المستخدم', 'Email or username')}
              className="grow bg-transparent"
              autoComplete="username"
            />
          </label>
        </div>

        <div className="form-control w-full">
          <span className="label py-1 px-0">
            <span className="label-text text-sm font-medium">{t('كلمة المرور', 'Password')}</span>
          </span>
          <label className="input input-bordered flex items-center gap-2 w-full">
            <Lock size={15} className="opacity-50" aria-hidden />
            <input
              type={showPass ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              aria-label={t('كلمة المرور', 'Password')}
              className="grow bg-transparent"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              className="btn btn-ghost btn-xs btn-square"
              aria-label={showPass ? t('إخفاء كلمة المرور', 'Hide password') : t('إظهار كلمة المرور', 'Show password')}
            >
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </label>
          <div className="text-end mt-1.5">
            <Link to="/auth/forgot-password" className="link link-primary text-xs">
              {t('نسيت كلمة المرور؟', 'Forgot password?')}
            </Link>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary w-full gap-2">
          {loading && <Loader2 size={14} className="animate-spin" />}
          {t('تسجيل الدخول', 'Sign In')}
        </button>
      </form>
    </AuthShell>
  );
}
