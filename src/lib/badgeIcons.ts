import {
  Anchor,
  Award,
  Badge,
  BadgeCheck,
  BookOpen,
  Brain,
  CircleDot,
  Coins,
  Compass,
  Crown,
  Diamond,
  Dice5,
  Eye,
  Feather,
  Flag,
  Flame,
  Gamepad2,
  Gem,
  Ghost,
  Gift,
  Globe,
  GraduationCap,
  Heart,
  HeartHandshake,
  Hexagon,
  Hourglass,
  KeyRound,
  Leaf,
  Lightbulb,
  Lock,
  Medal,
  Moon,
  Mountain,
  Music,
  Orbit,
  Palette,
  PawPrint,
  Puzzle,
  Ribbon,
  Rocket,
  ScrollText,
  Shield,
  Snowflake,
  Sparkle,
  Sparkles,
  Star,
  Sun,
  Swords,
  Target,
  Ticket,
  Trophy,
  Wand2,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export type BadgeIconId =
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'Diamond'
  | 'Platinum'
  | 'Grandex'
  | 'HeartHandshake'
  | 'Sparkles'
  | 'Shield'
  | 'Trophy'
  | 'Star'
  | 'Zap'
  | 'Crown'
  | 'Flame'
  | 'Gem'
  | 'Rocket'
  | 'Target'
  | 'Medal'
  | 'Leaf'
  | 'Compass'
  | 'KeyRound'
  | 'Gift'
  | 'Award'
  | 'Heart'
  | 'Gamepad2'
  | 'Swords'
  | 'Ghost'
  | 'Music'
  | 'Palette'
  | 'Globe'
  | 'Lightbulb'
  | 'Lock'
  | 'Moon'
  | 'Sun'
  | 'Snowflake'
  | 'Mountain'
  | 'Anchor'
  | 'Brain'
  | 'BookOpen'
  | 'Coins'
  | 'Dice5'
  | 'Eye'
  | 'Feather'
  | 'Flag'
  | 'GraduationCap'
  | 'Hexagon'
  | 'Hourglass'
  | 'PawPrint'
  | 'Puzzle'
  | 'ScrollText'
  | 'Ticket'
  | 'Wand2'
  | 'BadgeCheck';

export type BadgeIconMeta = {
  id: BadgeIconId;
  Icon: LucideIcon;
  /** Daisy / Tailwind tone for the chip */
  tone: string;
  labelEn: string;
  labelAr: string;
};

/** Curated unique visuals — pick one per badge; never reuse. */
export const BADGE_ICON_CATALOG: BadgeIconMeta[] = [
  // Rank ladder — color encodes tier; glyphs climb medal → badge → ribbon → gem → spark → orbit
  { id: 'Bronze', Icon: CircleDot, tone: 'bg-[oklch(0.42_0.08_55/0.35)] text-[oklch(0.78_0.11_55)] ring-[oklch(0.62_0.1_55/0.5)]', labelEn: 'Bronze', labelAr: 'برونز' },
  { id: 'Silver', Icon: Badge, tone: 'bg-[oklch(0.72_0.02_250/0.22)] text-[oklch(0.9_0.015_250)] ring-[oklch(0.82_0.02_250/0.45)]', labelEn: 'Silver', labelAr: 'فضة' },
  { id: 'Gold', Icon: Ribbon, tone: 'bg-[oklch(0.72_0.14_85/0.22)] text-[oklch(0.88_0.14_90)] ring-[oklch(0.78_0.13_88/0.5)]', labelEn: 'Gold', labelAr: 'ذهب' },
  { id: 'Diamond', Icon: Gem, tone: 'bg-[oklch(0.78_0.1_195/0.2)] text-[oklch(0.9_0.08_195)] ring-[oklch(0.82_0.09_195/0.45)]', labelEn: 'Diamond', labelAr: 'ألماس' },
  { id: 'Platinum', Icon: Sparkle, tone: 'bg-[oklch(0.94_0.01_240/0.12)] text-[oklch(0.96_0.01_240)] ring-[oklch(0.92_0.02_240/0.4)]', labelEn: 'Platinum', labelAr: 'بلاتين' },
  { id: 'Grandex', Icon: Orbit, tone: 'bg-violet-500/20 text-violet-200 ring-violet-500/40', labelEn: 'Grandex', labelAr: 'غراندكس' },
  { id: 'HeartHandshake', Icon: HeartHandshake, tone: 'bg-primary/20 text-primary ring-primary/40', labelEn: 'Helper', labelAr: 'مساعِد' },
  { id: 'Sparkles', Icon: Sparkles, tone: 'bg-accent/20 text-accent ring-accent/40', labelEn: 'Sparkles', labelAr: 'بريق' },
  { id: 'Shield', Icon: Shield, tone: 'bg-info/20 text-info ring-info/40', labelEn: 'Shield', labelAr: 'درع' },
  { id: 'Trophy', Icon: Trophy, tone: 'bg-warning/20 text-warning ring-warning/40', labelEn: 'Trophy', labelAr: 'كأس' },
  { id: 'Star', Icon: Star, tone: 'bg-yellow-500/20 text-yellow-400 ring-yellow-500/40', labelEn: 'Star', labelAr: 'نجمة' },
  { id: 'Zap', Icon: Zap, tone: 'bg-cyan-500/20 text-cyan-300 ring-cyan-500/40', labelEn: 'Zap', labelAr: 'برق' },
  { id: 'Crown', Icon: Crown, tone: 'bg-amber-500/20 text-amber-300 ring-amber-500/40', labelEn: 'Crown', labelAr: 'تاج' },
  { id: 'Flame', Icon: Flame, tone: 'bg-orange-500/20 text-orange-400 ring-orange-500/40', labelEn: 'Flame', labelAr: 'لهب' },
  { id: 'Gem', Icon: Diamond, tone: 'bg-fuchsia-500/20 text-fuchsia-300 ring-fuchsia-500/40', labelEn: 'Gem', labelAr: 'جوهرة' },
  { id: 'Rocket', Icon: Rocket, tone: 'bg-sky-500/20 text-sky-300 ring-sky-500/40', labelEn: 'Rocket', labelAr: 'صاروخ' },
  { id: 'Target', Icon: Target, tone: 'bg-rose-500/20 text-rose-300 ring-rose-500/40', labelEn: 'Target', labelAr: 'هدف' },
  { id: 'Medal', Icon: Medal, tone: 'bg-lime-500/20 text-lime-300 ring-lime-500/40', labelEn: 'Medal', labelAr: 'ميدالية' },
  { id: 'Leaf', Icon: Leaf, tone: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/40', labelEn: 'Leaf', labelAr: 'ورقة' },
  { id: 'Compass', Icon: Compass, tone: 'bg-teal-500/20 text-teal-300 ring-teal-500/40', labelEn: 'Compass', labelAr: 'بوصلة' },
  { id: 'KeyRound', Icon: KeyRound, tone: 'bg-violet-500/20 text-violet-300 ring-violet-500/40', labelEn: 'Key', labelAr: 'مفتاح' },
  { id: 'Gift', Icon: Gift, tone: 'bg-pink-500/20 text-pink-300 ring-pink-500/40', labelEn: 'Gift', labelAr: 'هدية' },
  { id: 'Award', Icon: Award, tone: 'bg-base-content/10 text-base-content ring-base-content/20', labelEn: 'Award', labelAr: 'جائزة' },
  { id: 'Heart', Icon: Heart, tone: 'bg-red-500/20 text-red-400 ring-red-500/40', labelEn: 'Heart', labelAr: 'قلب' },
  { id: 'Gamepad2', Icon: Gamepad2, tone: 'bg-indigo-500/20 text-indigo-300 ring-indigo-500/40', labelEn: 'Gamer', labelAr: 'لاعب' },
  { id: 'Swords', Icon: Swords, tone: 'bg-slate-400/20 text-slate-300 ring-slate-400/40', labelEn: 'Swords', labelAr: 'سيوف' },
  { id: 'Ghost', Icon: Ghost, tone: 'bg-purple-400/20 text-purple-200 ring-purple-400/40', labelEn: 'Ghost', labelAr: 'شبح' },
  { id: 'Music', Icon: Music, tone: 'bg-blue-500/20 text-blue-300 ring-blue-500/40', labelEn: 'Music', labelAr: 'موسيقى' },
  { id: 'Palette', Icon: Palette, tone: 'bg-orange-400/20 text-orange-300 ring-orange-400/40', labelEn: 'Artist', labelAr: 'فنان' },
  { id: 'Globe', Icon: Globe, tone: 'bg-blue-400/20 text-blue-200 ring-blue-400/40', labelEn: 'Globe', labelAr: 'عالم' },
  { id: 'Lightbulb', Icon: Lightbulb, tone: 'bg-yellow-400/20 text-yellow-200 ring-yellow-400/40', labelEn: 'Idea', labelAr: 'فكرة' },
  { id: 'Lock', Icon: Lock, tone: 'bg-stone-400/20 text-stone-300 ring-stone-400/40', labelEn: 'Lock', labelAr: 'قفل' },
  { id: 'Moon', Icon: Moon, tone: 'bg-indigo-400/20 text-indigo-200 ring-indigo-400/40', labelEn: 'Moon', labelAr: 'قمر' },
  { id: 'Sun', Icon: Sun, tone: 'bg-amber-400/20 text-amber-200 ring-amber-400/40', labelEn: 'Sun', labelAr: 'شمس' },
  { id: 'Snowflake', Icon: Snowflake, tone: 'bg-sky-300/20 text-sky-200 ring-sky-300/40', labelEn: 'Snowflake', labelAr: 'ثلج' },
  { id: 'Mountain', Icon: Mountain, tone: 'bg-stone-500/20 text-stone-300 ring-stone-500/40', labelEn: 'Mountain', labelAr: 'جبل' },
  { id: 'Anchor', Icon: Anchor, tone: 'bg-cyan-600/20 text-cyan-400 ring-cyan-600/40', labelEn: 'Anchor', labelAr: 'مرساة' },
  { id: 'Brain', Icon: Brain, tone: 'bg-pink-400/20 text-pink-200 ring-pink-400/40', labelEn: 'Brain', labelAr: 'عقل' },
  { id: 'BookOpen', Icon: BookOpen, tone: 'bg-amber-600/20 text-amber-400 ring-amber-600/40', labelEn: 'Book', labelAr: 'كتاب' },
  { id: 'Coins', Icon: Coins, tone: 'bg-yellow-600/20 text-yellow-300 ring-yellow-600/40', labelEn: 'Coins', labelAr: 'عملات' },
  { id: 'Dice5', Icon: Dice5, tone: 'bg-red-400/20 text-red-300 ring-red-400/40', labelEn: 'Dice', labelAr: 'نرد' },
  { id: 'Eye', Icon: Eye, tone: 'bg-teal-400/20 text-teal-200 ring-teal-400/40', labelEn: 'Eye', labelAr: 'عين' },
  { id: 'Feather', Icon: Feather, tone: 'bg-lime-400/20 text-lime-200 ring-lime-400/40', labelEn: 'Feather', labelAr: 'ريشة' },
  { id: 'Flag', Icon: Flag, tone: 'bg-rose-400/20 text-rose-200 ring-rose-400/40', labelEn: 'Flag', labelAr: 'علم' },
  { id: 'GraduationCap', Icon: GraduationCap, tone: 'bg-violet-400/20 text-violet-200 ring-violet-400/40', labelEn: 'Graduate', labelAr: 'خريج' },
  { id: 'Hexagon', Icon: Hexagon, tone: 'bg-emerald-400/20 text-emerald-200 ring-emerald-400/40', labelEn: 'Hexagon', labelAr: 'سداسي' },
  { id: 'Hourglass', Icon: Hourglass, tone: 'bg-amber-500/20 text-amber-200 ring-amber-500/40', labelEn: 'Hourglass', labelAr: 'ساعة رملية' },
  { id: 'PawPrint', Icon: PawPrint, tone: 'bg-orange-300/20 text-orange-200 ring-orange-300/40', labelEn: 'Paw', labelAr: 'مخلب' },
  { id: 'Puzzle', Icon: Puzzle, tone: 'bg-fuchsia-400/20 text-fuchsia-200 ring-fuchsia-400/40', labelEn: 'Puzzle', labelAr: 'لغز' },
  { id: 'ScrollText', Icon: ScrollText, tone: 'bg-yellow-700/20 text-yellow-500 ring-yellow-700/40', labelEn: 'Scroll', labelAr: 'لفافة' },
  { id: 'Ticket', Icon: Ticket, tone: 'bg-rose-500/20 text-rose-400 ring-rose-500/40', labelEn: 'Ticket', labelAr: 'تذكرة' },
  { id: 'Wand2', Icon: Wand2, tone: 'bg-purple-500/20 text-purple-300 ring-purple-500/40', labelEn: 'Wand', labelAr: 'عصا' },
  { id: 'BadgeCheck', Icon: BadgeCheck, tone: 'bg-green-500/20 text-green-300 ring-green-500/40', labelEn: 'Verified', labelAr: 'موثّق' },
];

const BY_ID = Object.fromEntries(BADGE_ICON_CATALOG.map((m) => [m.id, m])) as Record<
  string,
  BadgeIconMeta
>;

export function resolveBadgeIcon(icon: string | null | undefined): BadgeIconMeta {
  if (icon && BY_ID[icon]) return BY_ID[icon];
  return BY_ID.Award;
}

export function takenBadgeIcons(badges: { id?: string; icon: string }[], exceptId?: string): Set<string> {
  const taken = new Set<string>();
  for (const b of badges) {
    if (exceptId && b.id === exceptId) continue;
    if (b.icon) taken.add(b.icon);
  }
  return taken;
}
