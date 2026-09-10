import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { usePageMeta } from '../hooks/usePageMeta';

export default function NotFoundPage() {
  const { t, contentDir } = useI18n();
  usePageMeta({ title: '404', noindex: true });
  return (
    <div className="min-h-[70vh] bg-base-100 flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-md" dir={contentDir}>
        <h1 className="text-8xl font-black text-primary mb-4">404</h1>
        <h2 className="text-2xl font-bold mb-3">{t('الصفحة غير موجودة', 'Page Not Found')}</h2>
        <p className="text-sm text-base-content/70 mb-8 text-pretty">
          {t('الصفحة التي تبحث عنها غير موجودة.', "The page you're looking for doesn't exist.")}
        </p>
        <Link to="/" className="btn btn-primary gap-2 mx-auto">
          <Home size={14} />
          {t('العودة للرئيسية', 'Back to Home')}
        </Link>
      </div>
    </div>
  );
}
