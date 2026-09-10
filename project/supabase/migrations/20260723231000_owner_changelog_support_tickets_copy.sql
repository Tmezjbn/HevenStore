-- Refresh owner log copy for Support live-chat MVP if the earlier insert already landed.
UPDATE public.owner_changelog_entries
SET
  entry_date = '2026-07-23'::date,
  title_ar = 'دعم مباشر وتذاكر داخل اللوحة',
  summary_ar = 'رتبة دعم جديدة للدردشة المباشرة، تذاكر يدّعيها الفريق ويتصاعد المهم منها، قناة بائعين، ومشرفون يركّزون على التصعيد والتقييمات بدل المنتجات.',
  summary_en = 'A new Support role for live chat, tickets the team can claim and escalate when needed, a Sellers channel, and moderators focused on escalations and reviews—not products.',
  lesson_json = '{
    "what_ar": "أضفنا رتبة «الدعم» لدردشة التذاكر من لوحة التحكم (الدعم). الفريق يأخذ التذكرة، يرد بالمحادثة، ويرفع الحالات المهمة. فيه قناة بائعين لمشتري ذلك البائع، وصندوق بائعين يظهر لفريق الدعم. المشرف لم يعد يدير المنتجات — يتعامل مع التذاكر المصعّدة ومراجعة التقييمات. لكل وكيل دعم مستوى ثقة يبدأ من ١٠٠؛ رفض التصعيد غير المناسب يخصم ١٥، وإذا وصل ٤٠ أو أقل يتوقف عن التصعيد حتى يعيد المالك أو الأدمن الضبط.",
    "what_en": "We added a Support staff role for live chat tickets in the dashboard (Support). Agents claim a ticket, chat with the customer, and escalate important cases. Sellers get a channel for buyers of their shop, and Support sees a Sellers bin. Moderators no longer manage products — they handle escalated tickets and review moderation. Each support agent starts with a trust score of 100; a rejected escalation drops it by 15, and at 40 or below they cannot escalate until an owner or admin resets it.",
    "why_ar": "الدعم لازم يعيش داخل المتجر بصلاحيات واضحة: رد سريع للحالات العادية، وتصعيد منظّم لما يحتاج رتب أعلى — مو رسائل مشتتة خارج اللوحة.",
    "why_en": "Help should live inside the store with clear roles: fast replies for everyday cases, and orderly handoff when something needs a higher rank — not scattered messages outside the dashboard.",
    "how_ar": "لوحة التحكم ← الدعم. امنح رتبة دعم من المستخدمون. الوكيل يأخذ التذكرة ويرد؛ الحالات المهمة تُرفع، والرتب الأعلى تقدر ترفض التصعيد غير المناسب. قناة البائع لمشتريه فقط. راجع مستوى ثقة الدعم من المستخدمون عند الحاجة وأعد الضبط.",
    "how_en": "Dashboard → Support. Grant the Support role from Users. Agents claim and reply; important cases get escalated, and higher ranks can reject a bad escalation. The seller channel is only for that seller’s buyers. Check support trust from Users when needed and reset it.",
    "benefits_ar": "رد أسرع للزبائن، تصعيد أوضح للمهم، بائعون يساعدون مشتريهم، ومشرفون على الشكاوى الحساسة والتقييمات بدل تشتيت المنتجات.",
    "benefits_en": "Faster customer replies, clearer handoff for important cases, sellers helping their own buyers, and moderators on sensitive tickets and reviews instead of product busywork."
  }'::jsonb,
  update_scale = 'big',
  sort_order = 1784851200000
WHERE title_en = 'Live support tickets in the dashboard';
