import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import { mapAuthError, passwordScore } from '../../lib/authErrors';
import AuthShell from '../../components/auth/AuthShell';

type Gate = 'waiting' | 'ready' | 'invalid';

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [gate, setGate] = useState<Gate>('waiting');

  const score = useMemo(() => passwordScore(password), [password]);

  // Recovery link sets a session via the URL hash. Expire → show recovery CTA.
  // Only PASSWORD_RECOVERY (or hash type=recovery) — not a normal logged-in session.
  useEffect(() => {
    let settled = false;
    const markReady = () => {
      if (settled) return;
      settled = true;
      setGate('ready');
    };
    const markInvalid = () => {
      if (settled) return;
      settled = true;
      setGate('invalid');
    };

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const queryParams = new URLSearchParams(window.location.search);
    const isRecoveryLink =
      hashParams.get('type') === 'recovery' || queryParams.get('type') === 'recovery';

    if (isRecoveryLink) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) markReady();
      });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') markReady();
    });
    const timer = window.setTimeout(() => {
      if (!settled) markInvalid();
    }, 8000);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError(t('كلمة المرور يجب أن تكون 8 أحرف على الأقل.', 'Password must be at least 8 characters.'));
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) setError(mapAuthError(err, t));
    else {
      setDone(true);
      setTimeout(() => navigate('/auth/login'), 2000);
    }
  };

  return (
    <AuthShell
      title={t('تعيين كلمة مرور جديدة', 'Set a new password')}
      subtitle={
        done || gate === 'invalid'
          ? undefined
          : t('اختر كلمة مرور قوية لحسابك', 'Choose a strong password for your account')
      }
      footer={<Link to="/auth/login" className="link link-primary font-medium">{t('العودة لتسجيل الدخول', 'Back to Sign In')}</Link>}
    >
      {done ? (
        <div className="text-center py-4">
          <CheckCircle size={44} className="text-success mx-auto mb-4" />
          <p className="font-medium mb-2">{t('تم تحديث كلمة المرور!', 'Password updated!')}</p>
          <p className="text-sm opacity-60">{t('يتم تحويلك لتسجيل الدخول...', 'Redirecting you to sign in...')}</p>
        </div>
      ) : gate === 'waiting' ? (
        <div className="text-center py-6">
          <Loader2 size={28} className="animate-spin mx-auto mb-3 opacity-60" />
          <p className="text-sm opacity-60">{t('جارٍ التحقق من رابط الاستعادة...', 'Verifying your reset link...')}</p>
        </div>
      ) : gate === 'invalid' ? (
        <div className="text-center py-4 space-y-3" role="alert">
          <p className="font-medium">
            {t('رابط الاستعادة غير صالح أو منتهٍ.', 'This reset link is invalid or expired.')}
          </p>
          <Link to="/auth/forgot-password" className="btn btn-primary btn-sm">
            {t('طلب رابط جديد', 'Request a new link')}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div role="alert" className="alert alert-error text-sm">{error}</div>}
          <div className="form-control w-full">
            <span className="label py-1 px-0">
              <span className="label-text text-sm font-medium">
                {t('كلمة المرور الجديدة', 'New password')}
              </span>
            </span>
            <label className="input input-bordered flex items-center gap-2 w-full">
              <Lock size={15} className="opacity-50" aria-hidden />
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                aria-label={t('كلمة المرور الجديدة', 'New password')}
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
          </div>
          {password.length > 0 && (
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${i < score ? ['bg-error', 'bg-error', 'bg-warning', 'bg-info', 'bg-success'][score] : 'bg-base-300'}`}
                />
              ))}
            </div>
          )}
          <button type="submit" disabled={loading} className="btn btn-primary w-full gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            {t('حفظ كلمة المرور', 'Save Password')}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
