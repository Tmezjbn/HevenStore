-- Owner internal log: clearer text, safer footer links, bilingual confirms.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-14'::date,
  'نص أوضح وروابط آمنة وتأكيدات بالعربية',
  'Clearer text, safer links, bilingual confirms',
  'النصوص الخافتة صارت أسهل للقراءة، وروابط الفوتر الاجتماعية ترفض الروابط الخطرة، وحذف المنتجات والكوبونات صار بتأكيد داخل الموقع (عربي/إنجليزي) مو نافذة المتصفح.',
  'Muted text is easier to read, footer social links reject dangerous URLs, and deletes use an in-site bilingual confirm — not the browser’s English popup.',
  '',
  '',
  '{
    "what_ar": "حسّنّا وضوح النصوص الثانوية في الصفحات. روابط تويتر/يوتيوب/تيليجرام والفوتر ما عاد تقبل إلا https أو بريد أو مسار داخل الموقع. وأزرار الحذف في اللوحة تفتح نافذة تأكيد بلغتك.",
    "what_en": "Secondary copy on store pages is easier to read. Twitter/YouTube/Telegram and footer links only allow https, mailto, or in-site paths. Dashboard delete buttons open a confirm dialog in your language.",
    "why_ar": "نص باهت يتعب العين. رابط خبيث في إعدادات الفوتر يقدر يضر الزبون. نافذة المتصفح الإنجليزية تكسر تجربة العربية.",
    "why_en": "Faint text strains eyes. A malicious footer URL can hurt shoppers. The browser’s English confirm breaks the Arabic experience.",
    "how_ar": "من منشئ الموقع حط روابط https فقط للشبكات. الحذف في اللوحة يطلب تأكيدك داخل الصفحة.",
    "how_en": "In Website Builder, use https-only social URLs. Dashboard deletes ask for confirmation inside the page.",
    "benefits_ar": "للزبون: قراءة أوضح وروابط آمنة. لك: لوحة بلغة الموقع بدون نوافذ نظام غريبة.",
    "benefits_en": "For shoppers: clearer reading and safer links. For you: dashboard confirms in the site language, not OS popups."
  }'::jsonb,
  1050
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Clearer text, safer links, bilingual confirms'
);
