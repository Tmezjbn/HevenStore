-- Owner can write site_settings (UI already allows owner into Settings/Builder).
-- Owner-only engineering changelog (not in public site_settings).

DROP POLICY IF EXISTS "site_settings_insert_admin" ON public.site_settings;
CREATE POLICY "site_settings_insert_staff" ON public.site_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "site_settings_update_admin" ON public.site_settings;
CREATE POLICY "site_settings_update_staff" ON public.site_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "site_settings_delete_admin" ON public.site_settings;
CREATE POLICY "site_settings_delete_staff" ON public.site_settings
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE TABLE IF NOT EXISTS public.owner_changelog_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  title_ar text NOT NULL DEFAULT '',
  title_en text NOT NULL DEFAULT '',
  body_ar text NOT NULL DEFAULT '',
  body_en text NOT NULL DEFAULT '',
  sort_order bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS owner_changelog_entries_sort_idx
  ON public.owner_changelog_entries (sort_order DESC, entry_date DESC);

ALTER TABLE public.owner_changelog_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_changelog_owner_all" ON public.owner_changelog_entries;
CREATE POLICY "owner_changelog_owner_all" ON public.owner_changelog_entries
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Seed: site audit / platform updates (owner-only). Idempotent by title_en.
INSERT INTO public.owner_changelog_entries (entry_date, title_ar, title_en, body_ar, body_en, sort_order)
SELECT * FROM (VALUES
  (
    '2026-07-11'::date,
    'تدقيق الأمان والطلبات (المراحل 1–3)',
    'Checkout & access audit (phases 1–3)',
    'سلطة الخادم للطلبات والمخزون عبر create_pending_order و finalize_paid_order، وتشديد صلاحيات الملفات، وتصحيح خصم المخزون اليدوي وصفحة النجاح.',
    'Server-authoritative orders and stock via create_pending_order / finalize_paid_order, tighter profile access, manual stock decrement fix, and honest checkout success states.',
    900::bigint
  ),
  (
    '2026-07-11'::date,
    'إصلاحات المتجر والأداء (4–5)',
    'Store fixes & performance (phases 4–5)',
    'صفحات الاشتراكات وبطاقات الهدايا، كوبونات، إيقاف فيديو خارج الشاشة، ترقيم المتجر، خطوط غير متزامنة، وتحميل كسول لمكونات الحركة.',
    'Subscriptions and gift-card catalog pages, coupons modal, off-screen video pause, store pagination, async fonts, and lazy motion-heavy components.',
    800::bigint
  ),
  (
    '2026-07-11'::date,
    'SEO وإمكانية الوصول والتنظيف (6–8)',
    'SEO, a11y & cleanup (phases 6–8)',
    'عناوين الصفحات وsitemap، نوافذ حوار مع فخ تركيز، تباين أفضل، وحذف مكوّنات UI الميتة.',
    'Page meta and sitemap, focus-trapped modals, contrast/labels, and removal of dead shadcn UI deadweight.',
    700::bigint
  ),
  (
    '2026-07-11'::date,
    'تشغيل الإنتاج (المرحلة 9)',
    'Production ops (phase 9)',
    'حدود أخطاء، رؤوس أمان، README، وفحوصات npm test للثوابت.',
    'Error boundary, security headers, README, and npm test invariant checks.',
    600::bigint
  ),
  (
    '2026-07-11'::date,
    'خصوصية قابلة للتحرير وسجلات التحديث',
    'Editable policies & changelogs',
    'سياسة الخصوصية وشروط الخدمة قابلة للتحرير من الإعدادات. سجل داخلي للمالك فقط، وسجل عام للمستخدمين تحت الموارد.',
    'Privacy and Terms editable from Settings. Owner-only internal changelog; public user changelog under Resources.',
    500::bigint
  )
) AS v(entry_date, title_ar, title_en, body_ar, body_en, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e WHERE e.title_en = v.title_en
);
