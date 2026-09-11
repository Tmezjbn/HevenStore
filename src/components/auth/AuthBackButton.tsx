import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../lib/i18n';

export default function AuthBackButton() {
  const { t, contentDir } = useI18n();
  const ar = contentDir === 'rtl';
  const navigate = useNavigate();

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className={`btn btn-ghost gap-2.5 fixed top-[4.25rem] ${ar ? 'right-4 sm:right-6' : 'left-4 sm:left-6'} z-40 text-base font-medium border-transparent hover:border-transparent hover:bg-transparent hover:outline-none hover:opacity-60 transition-opacity duration-150 outline-none focus:outline-none focus:border-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/35`}
    >
      <ArrowLeft size={20} className={ar ? 'rotate-180' : undefined} aria-hidden />
      {t('العودة للصفحة السابقة', 'Go Back')}
    </button>
  );
}
