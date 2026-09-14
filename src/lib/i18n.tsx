import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { withViewTransition } from './viewTransition';

type Lang = 'ar' | 'en';
type ContentDir = 'ltr' | 'rtl';

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (ar: string, en: string) => string;
  /** Chrome/layout direction — always LTR so the shell never flips. */
  dir: 'ltr';
  /** Text/prose direction — RTL when Arabic is active. */
  contentDir: ContentDir;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'ar',
  setLang: () => {},
  t: (ar) => ar,
  dir: 'ltr',
  contentDir: 'rtl',
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    // Storage can throw (privacy mode / denied) — fall back to the default.
    try {
      return (localStorage.getItem('heven-lang') as Lang) || 'ar';
    } catch {
      return 'ar';
    }
  });
  const busyRef = useRef(false);

  const setLang = useCallback(
    (l: Lang) => {
      if (l === lang || busyRef.current) return;
      busyRef.current = true;
      // Failsafe — never leave the toggle dead if a transition promise stalls.
      const unlock = () => {
        busyRef.current = false;
      };
      // Longer veil settle on Blink — keep failsafe above worst-case fade+hold.
      const failSafe = window.setTimeout(unlock, 3_000);
      void withViewTransition(() => {
        setLangState(l);
        localStorage.setItem('heven-lang', l);
        // Sync document lang inside the veiled update — avoid post-fade useEffect layout.
        document.documentElement.lang = l;
        document.documentElement.dir = 'ltr';
      }, 'lang-switching').finally(() => {
        window.clearTimeout(failSafe);
        unlock();
      });
    },
    [lang],
  );

  const contentDir: ContentDir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    // Hydrate / external sync only — setLang already writes these under the veil.
    document.documentElement.lang = lang;
    // Layout stays LTR so UI chrome never jumps sides when switching AR/EN.
    // Prose uses contentDir via components (see useI18n().contentDir).
    document.documentElement.dir = 'ltr';
  }, [lang]);

  const t = useCallback((ar: string, en: string) => (lang === 'ar' ? ar : en), [lang]);

  const value = useMemo(
    (): I18nContextValue => ({ lang, setLang, t, dir: 'ltr', contentDir }),
    [lang, setLang, t, contentDir],
  );

  return (
    <I18nContext.Provider value={value}>
      <div className="lang-transition min-h-full" data-lang={lang}>
        {children}
      </div>
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
