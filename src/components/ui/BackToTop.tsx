import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { smoothScrollWindowTo } from '../../lib/smoothScroll';

export default function BackToTop() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => smoothScrollWindowTo(0)}
      aria-label={t('العودة للأعلى', 'Back to top')}
      className={`btn btn-circle btn-primary shadow-lg fixed bottom-6 end-6 z-40 transition-[opacity,transform] duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none invisible'
      }`}
    >
      <ArrowUp size={18} />
    </button>
  );
}
