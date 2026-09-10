import { resolveBadgeIcon } from '../../lib/badgeIcons';

type Props = {
  icon: string | null | undefined;
  size?: number;
  className?: string;
  title?: string;
};

/** Unique visual chip for a badge icon id. */
export default function BadgeIcon({ icon, size = 14, className = '', title }: Props) {
  const meta = resolveBadgeIcon(icon);
  const Icon = meta.Icon;
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ring-1 shrink-0 ${meta.tone} ${className}`}
      title={title}
      aria-hidden={title ? undefined : true}
    >
      <Icon size={size} strokeWidth={2.25} />
    </span>
  );
}
