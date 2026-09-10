import { useEffect, useRef, type CSSProperties } from 'react';
import {
  imageTransformsEnabled,
  isVideoUrl,
  storageImageSrcSet,
  storageImageUrl,
} from '../../lib/mediaUrl';

type Props = {
  src: string;
  alt?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  /** Hint for LCP hero / above-fold thumbs. */
  fetchPriority?: 'high' | 'low' | 'auto';
  /** Target display width for Supabase image transforms (omit to skip). */
  width?: number;
  sizes?: string;
  /** When true, video stays muted/looping (product cards, banners). */
  autoPlay?: boolean;
};

/** Muted looping video that only decodes while on screen — product grids
 *  can hold dozens of MP4 thumbnails without running N decoders at once. */
export function InViewVideo({
  src,
  className,
  alt = '',
  style,
}: {
  src: string;
  className?: string;
  alt?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => { /* autoplay blocked */ });
        else video.pause();
      },
      { rootMargin: '100px' },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      className={className}
      style={style}
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={alt || undefined}
    />
  );
}

/** Renders product image, GIF, or MP4 from a storage/public URL. */
export default function ProductMedia({
  src,
  alt = '',
  className,
  loading = 'lazy',
  fetchPriority,
  width,
  sizes,
  autoPlay = true,
}: Props) {
  if (isVideoUrl(src)) {
    if (autoPlay) return <InViewVideo src={src} className={className} alt={alt} />;
    return (
      <video
        src={src}
        className={className}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={alt || undefined}
      />
    );
  }
  const transforms = imageTransformsEnabled();
  const href = width && transforms ? storageImageUrl(src, width) : src;
  const srcSet =
    width && transforms
      ? storageImageSrcSet(src, [Math.round(width * 0.5), width, Math.round(width * 1.5)])
      : '';
  // Cards use aspect 5/4 — reserve height to cut CLS when CSS late.
  const height = width ? Math.round((width * 4) / 5) : undefined;
  return (
    <img
      src={href}
      srcSet={srcSet || undefined}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
      sizes={sizes}
      width={width}
      height={height}
    />
  );
}
