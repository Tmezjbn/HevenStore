import { Link } from 'react-router-dom';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** When false, render a mark (no link) — e.g. decorative hero watermark. */
  link?: boolean;
}

const sizes = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-4xl md:text-5xl',
};

export default function BrandLogo({ className = '', size = 'md', link = true }: BrandLogoProps) {
  const mark = (
    <>
      <span className="text-base-content">HEVEN</span>
      <span className="text-base-content">.</span>
      <span className="text-base-content">FUN</span>
    </>
  );
  const cls = `font-black tracking-tight ${sizes[size]} ${className}`;
  if (!link) return <span className={cls}>{mark}</span>;
  return (
    <Link to="/" className={cls}>
      {mark}
    </Link>
  );
}
