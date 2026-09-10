import React, { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AtSign, Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useI18n } from '../../lib/i18n';
import { ensureOwnProfile } from '../../lib/ensureProfile';
import { mapAuthError, passwordScore } from '../../lib/authErrors';
import { safeAppPath } from '../../lib/authRedirect';
import { isValidUsername, normalizeUsername } from '../../lib/username';
import AuthShell from '../../components/auth/AuthShell';

export default function RegisterPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const afterAuth = safeAppPath(params.get('next'));
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmSent, setConfirmSent] = useState(false);

  const score = useMemo(() => passwordScore(password), [password]);
  const scoreLabel = [
    t('ضعيفة جداً', 'Very weak'),
    t('ضعيفة', 'Weak'),
    t('متوسطة', 'Fair'),
    t('جيدة', 'Good'),
    t('قوية', 'Strong'),
  ][score];
  const scoreColor = ['bg-error', 'bg-error', 'bg-warning', 'bg-info', 'bg-success'][score];

  // Already signed in? Honor ?next= — never open-redirect.
  if (!authLoading && user && !confirmSent) return <Navigate to={afterAuth} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const handle = normalizeUsername(username);
    if (!isValidUsername(handle)) {
      setError(
        t(
          'اسم المستخدم: 3–24 حرفاً (حروف إنجليزية وأرقام و_)',
          'Username: 3–24 chars (a–z, 0–9, _)',
        ),
      );
      return;
    }
    if (password.length < 8) {
      setError(t('كلمة المرور يجب أن تكون 8 أحرف على الأقل.', 'Password must be at least 8 characters.'));
      return;
    }

    setLoading(true);
    const { data: taken, error: takenErr } = await supabase.rpc('username_taken', {
      p_username: handle,
    });
    if (takenErr?.message?.includes('RATE_LIMITED')) {
      setLoading(false);
      setError(t('محاولات كثيرة. انتظر دقيقة ثم حاول مجدداً.', 'Too many attempts. Wait a minute and try again.'));
      return;
    }
    if (taken === true) {
      setLoading(false);
      setError(t('اسم المستخدم مستخدم مسبقاً', 'Username is already taken'));
      return;
    }

    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), username: handle },
        emailRedirectTo:
          afterAuth !== '/'
            ? `${window.location.origin}/auth/login?next=${encodeURIComponent(afterAuth)}`
            : `${window.location.origin}/auth/login`,
      },
    });

    if (err) {
      setLoading(false);
      setError(mapAuthError(err, t));
      return;
    }

    // Supabase returns a user with empty identities when the email already exists
    // (and confirmations are on). Treat that as "already registered".
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setLoading(false);
      setError(t('هذا البريد مسجّل مسبقاً. سجّل الدخول بدلاً من ذلك.', 'This email is already registered. Try signing in instead.'));
      return;
    }

    // If we already have a session (confirmations off), create the profile now.
    if (data.session && data.user) {
      const ensured = await ensureOwnProfile(fullName.trim(), data.user, handle);
      setLoading(false);
      if (!ensured.ok) {
        setError(t('تعذر حفظ اسم المستخدم', 'Could not save username'));
        return;
      }
      navigate(afterAuth);
      return;
    }

    // Confirmations on: no session yet. Profile is created on first login.
    setLoading(false);
    setConfirmSent(true);
  };

  if (confirmSent) {
    return (
      <AuthShell
        title={t('تحقق من بريدك', 'Check your email')}
        footer={
          <Link
            to={afterAuth !== '/' ? `/auth/login?next=${encodeURIComponent(afterAuth)}` : '/auth/login'}
            className="link link-primary font-medium"
          >
            {t('العودة لتسجيل الدخول', 'Back to Sign In')}
          </Link>
        }
      >
        <div className="text-center py-4">
          <CheckCircle size={44} className="text-success mx-auto mb-4" />
          <p className="font-medium mb-2">{t('أرسلنا لك رابط التأكيد', 'We sent you a confirmation link')}</p>
          <p className="text-sm opacity-60">
            {t('افتح الرابط في بريدك لتفعيل حسابك ثم سجّل الدخول.', 'Open the link in your inbox to activate your account, then sign in.')}
          </p>
          <p className="text-sm opacity-60 mt-2 font-medium">{email}</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t('إنشاء حساب جديد', 'Create your account')}
      subtitle={t('أنشئ حسابك في دقائق', 'Join HEVEN.FUN in seconds')}
      footer={
        <>
          {t('لديك حساب بالفعل؟', 'Already have an account?')}{' '}
          <Link
            to={afterAuth !== '/' ? `/auth/login?next=${encodeURIComponent(afterAuth)}` : '/auth/login'}
            className="link link-primary font-medium"
          >
            {t('تسجيل الدخول', 'Sign In')}
          </Link>
        </>
      }
    >
      {error && <div role="alert" className="alert alert-error text-sm mb-2">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-control w-full">
          <span className="label py-1 px-0">
            <span className="label-text text-sm font-medium">{t('الاسم الكامل', 'Full name')}</span>
          </span>
          <label className="input input-bordered flex items-center gap-2 w-full">
            <User size={15} className="opacity-50" aria-hidden />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t('اسمك الكامل', 'Your full name')}
              aria-label={t('الاسم الكامل', 'Full Name')}
              className="grow bg-transparent"
              autoComplete="name"
            />
          </label>
        </div>

        <div className="form-control w-full">
          <span className="label py-1 px-0">
            <span className="label-text text-sm font-medium">{t('اسم المستخدم', 'Username')}</span>
          </span>
          <label className="input input-bordered flex items-center gap-2 w-full">
            <AtSign size={15} className="opacity-50" aria-hidden />
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(normalizeUsername(e.target.value))}
              placeholder={t('اسم المستخدم', 'Username')}
              aria-label={t('اسم المستخدم', 'Username')}
              className="grow bg-transparent"
              autoComplete="username"
              minLength={3}
              maxLength={24}
              pattern="[a-z0-9_]{3,24}"
              title={t('3–24: a-z و أرقام و _', '3–24: a-z, digits, _')}
            />
          </label>
        </div>

        <div className="form-control w-full">
          <span className="label py-1 px-0">
            <span className="label-text text-sm font-medium">{t('البريد الإلكتروني', 'Email')}</span>
          </span>
          <label className="input input-bordered flex items-center gap-2 w-full">
            <Mail size={15} className="opacity-50" aria-hidden />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label={t('البريد الإلكتروني', 'Email')}
              className="grow bg-transparent"
              autoComplete="email"
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
              autoComplete="new-password"
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
          <p className="text-xs text-base-content/70 mt-1.5">
            {t('8 أحرف على الأقل', 'At least 8 characters')}
          </p>

          {password.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${i < score ? scoreColor : 'bg-base-300'}`}
                  />
                ))}
              </div>
              <span className="text-xs text-base-content/70 w-16 text-end">{scoreLabel}</span>
            </div>
          )}
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary w-full gap-2 mt-2">
          {loading && <Loader2 size={14} className="animate-spin" />}
          {t('إنشاء الحساب', 'Create Account')}
        </button>
      </form>
    </AuthShell>
  );
}
