-- Owner internal log: fresh cart prices + bigger catalog + skip link.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-14'::date,
  'سلة محدّثة ومتجر بلا سقف ٥٠٠',
  'Fresh cart prices and larger catalog',
  'السلة والمفضلة تحدّث السعر والمخزون من السيرفر، والمتجر يقدر يعرض أكثر من ٥٠٠ منتج، وفيه رابط «تخطَّ إلى المحتوى» للكيبورد.',
  'Cart and wishlist refresh price and stock from the server, the store can show more than 500 products, and there’s a keyboard Skip to content link.',
  '',
  '',
  '{
    "what_ar": "لما الزبون يفتح السلة أو المفضلة، الأسعار والمخزون تنسحب من جديد — منتج انحذف أو خلص ما يبقى معلّق ببيانات قديمة. قائمة المتجر ما عاد تقف عند ٥٠٠ منتج. وفيه رابط مخفي يظهر بالكيبورد للقفز لمتن الصفحة.",
    "what_en": "When a shopper opens the cart or wishlist, prices and stock refresh — deleted or sold-out items no longer stick with stale data. The store list no longer stops at 500 products. A hidden keyboard link jumps straight to the page content.",
    "why_ar": "سعر قديم في السلة = مفاجأة عند الدفع أو رفض الطلب. سقف ٥٠٠ يخفي منتجات جديدة. مستخدمو الكيبورد يحتاجون يتخطّون القائمة.",
    "why_en": "A stale cart price surprises at checkout or fails the order. A 500-product ceiling hides new items. Keyboard users need to skip past the nav.",
    "how_ar": "تشتغل تلقائياً. جرّب Tab في أول تحميل الصفحة — يظهر «تخطَّ إلى المحتوى».",
    "how_en": "Works automatically. Press Tab on first page load — you’ll see Skip to content.",
    "benefits_ar": "للزبون: سعر صحيح ومنتجات ظاهرة كلها. لك: أقل شكاوى «السعر تغيّر» ومتجر يكبر بدون سقف وهمي.",
    "benefits_en": "For shoppers: correct prices and a full catalog. For you: fewer “the price changed” complaints and room for the catalog to grow."
  }'::jsonb,
  1030
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Fresh cart prices and larger catalog'
);
