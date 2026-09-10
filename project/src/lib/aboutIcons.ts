import {
  Zap, Shield, Users, Globe, Bolt, Tag, ShieldCheck, Headphones,
  Gift, Crown, Star, Heart, Rocket, Award, Clock, CreditCard,
  type LucideIcon,
} from 'lucide-react';

// Allowlist of icons owners can pick for About items.
export const ABOUT_ICONS: Record<string, LucideIcon> = {
  Zap, Shield, ShieldCheck, Users, Globe, Bolt, Tag, Headphones,
  Gift, Crown, Star, Heart, Rocket, Award, Clock, CreditCard,
};

export const ABOUT_ICON_NAMES = Object.keys(ABOUT_ICONS);

export function getAboutIcon(name: string): LucideIcon {
  return ABOUT_ICONS[name] ?? Star;
}
