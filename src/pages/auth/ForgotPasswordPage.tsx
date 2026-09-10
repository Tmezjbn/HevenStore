import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import { mapAuthError } from '../../lib/authErrors';
import AuthShell from '../../components/auth/AuthShell';

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    if (err) setError(mapAuthError(err, t));
    else setSent(true);
  };

  return (
    <AuthShell
      title={t('نسيت كلمة المرور؟', 'Forgot Password?')}
      subtitle={sent ? undefined : t('سنرسل لك رابط إعادة التعيين', "We'll send you a reset link")}
      footer={<Link to="/auth/login" className="link link-primary font-medium">{t('العودة لتسجيل الدخول', 'Back to Sign In')}</Link>}
    >
      {sent ? (
        <div className="text-center py-4">
          <CheckCircle size={44} className="text-success mx-auto mb-4" />
          <p className="font-medium mb-2">{t('أرسلنا رابط إعادة التعيين إلى بريدك', 'Link Sent!')}</p>
          <p className="text-sm opacity-60">{t('تحقق من بريدك الإلكتروني.', 'Check your email inbox.')}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div role="alert" className="alert alert-error text-sm">{error}</div>}
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
          <button type="submit" disabled={loading} className="btn btn-primary w-full gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            {t('إرسال رابط الاستعادة', 'Send Reset Link')}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
