import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlyrSiteConfig } from '../../lib/siteSettings';
import {
  DEFAULT_VIDEO_AUTOPLAY,
  DEFAULT_VIDEO_VOLUME,
  resolveShowcasePlayback,
} from '../../lib/videoPlayback';
import {
  isGenericEmbedUrl,
  isProgressiveVideoUrl,
  isStillImageUrl,
  vimeoId,
  youtubeId,
} from '../../lib/videoEmbed';
import { useI18n } from '../../lib/i18n';

type Props = {
  src: string;
  poster?: string | null;
  config: PlyrSiteConfig;
  className?: string;
  /** Default true. Honors prefers-reduced-motion. */
  autoplay?: boolean | null;
  /** 0–100. Default 25. Applied after muted autoplay; unmute best-effort. */
  volume?: number | null;
  /** Editor/tiny stage: native video or iframe — no Plyr chrome. */
  preview?: boolean;
};

/** Same-origin sprite — deploy CSP blocks cdn.plyr.io by default. */
const PLYR_ICON_URL = '/vendor/plyr.svg';
/**
 * Only for true dead embeds (Plyr never fires media events).
 * Do NOT use with preload=metadata — loadeddata/canplay often never fire → false fail.
 */
const PLYR_STUCK_MS = 30_000;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

type PlyrLike = {
  destroy: () => void;
  muted: boolean;
  volume: number;
  play: () => Promise<void> | void;
  on: (event: string, cb: () => void) => void;
  once?: (event: string, cb: () => void) => void;
};

function Unavailable({
  poster,
  className,
  label,
}: {
  poster?: string | null;
  className?: string;
  label: string;
}) {
  return (
    <div
      className={`relative flex h-full w-full items-center justify-center bg-base-300 ${className ?? ''}`}
      role="status"
    >
      {poster ? (
        <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
      ) : null}
      <p className="relative z-[1] max-w-[16rem] px-3 text-center text-sm font-medium text-base-content/80 text-pretty">
        {label}
      </p>
    </div>
  );
}

/** Drop third-party embed sockets — removing the node alone often leaves the host connected. */
function releaseIframe(el: HTMLIFrameElement | null) {
  if (!el) return;
  try {
    el.src = 'about:blank';
  } catch {
    /* ignore */
  }
}

function releaseVideoEl(el: HTMLVideoElement | null) {
  if (!el) return;
  try {
    el.pause();
    el.removeAttribute('src');
    el.load();
  } catch {
    /* ignore */
  }
}

function releaseEmbedSubtree(root: ParentNode | null) {
  if (!root) return;
  root.querySelectorAll('iframe').forEach((node) => releaseIframe(node));
  root.querySelectorAll('video').forEach((node) => releaseVideoEl(node));
}

function GenericEmbedFrame({
  src,
  className,
  title,
}: {
  src: string;
  className?: string;
  title: string;
}) {
  const ref = useRef<HTMLIFrameElement>(null);

  // Own src in the effect: Strict Mode runs cleanup→setup without remounting the
  // iframe, so blank-on-cleanup must be followed by re-assigning src on setup.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.src = src;
    return () => {
      releaseIframe(el);
    };
  }, [src]);

  return (
    <iframe
      ref={ref}
      className={className}
      title={title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}

function PreviewFileVideo({
  src,
  poster,
  className,
  onError,
}: {
  src: string;
  poster?: string | null;
  className?: string;
  onError: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.src = src;
    return () => releaseVideoEl(el);
  }, [src]);
  return (
    <video
      ref={ref}
      src={src}
      poster={poster || undefined}
      className={className}
      playsInline
      controls
      preload="metadata"
      onError={onError}
    />
  );
}

/**
 * Showcase: muted autoplay first (browser-safe), then set volume + try unmute.
 * Generic HTTPS embeds (non-YT/Vimeo/file) → iframe — never `<video>` (HTML pages fail).
 * ponytail: YT/Vimeo unmute after async Plyr load almost always blocked.
 */
export default function ProductVideoPlayer({
  src,
  poster,
  config,
  className,
  autoplay = DEFAULT_VIDEO_AUTOPLAY,
  volume = DEFAULT_VIDEO_VOLUME,
  preview = false,
}: Props) {
  const { t } = useI18n();
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<PlyrLike | null>(null);
  const userUnmuted = useRef(false);
  // Fail keyed to src — new URL clears fail sync (no useEffect race).
  const [failKey, setFailKey] = useState<string | null>(null);
  const failed = failKey === src;
  const markFail = useCallback(() => setFailKey(src), [src]);
  const reducedMotion = usePrefersReducedMotion();
  const playback = resolveShowcasePlayback({ autoplay, volume, reducedMotion });
  const yt = youtubeId(src);
  const vim = vimeoId(src);
  const provider = yt ? 'youtube' : vim ? 'vimeo' : null;
  const stillImage = !provider && isStillImageUrl(src);
  const iframeEmbed = !provider && !stillImage && isGenericEmbedUrl(src);
  // Progressive files only (.mp4/webm/mov) — HTML embed pages are iframeEmbed.
  const isFile = Boolean(src) && !provider && !stillImage && !iframeEmbed && isProgressiveVideoUrl(src);
  const usePlyr =
    !preview && config.enabled && Boolean(src) && (isFile || Boolean(provider)) && !iframeEmbed;
  const failLabel = t(
    'الفيديو غير متاح — الرابط انتهت صلاحيته أو فشل التحميل.',
    'Video unavailable — link expired or failed to load.',
  );
  const embedTitle = t('تضمين فيديو', 'Embedded video');

  useEffect(() => {
    if (!usePlyr || !wrapRef.current || failed) return;
    let cancelled = false;
    let settled = false;
    let loadTimer = 0;
    userUnmuted.current = false;

    (async () => {
      await import('plyr/dist/plyr.css');
      const { default: Plyr } = await import('plyr');
      if (cancelled || !wrapRef.current) return;

      const target = wrapRef.current.querySelector('video, div[data-plyr-provider]') as
        | HTMLElement
        | null;
      if (!target) return;

      const wantAutoplay = playback.autoplay;
      const player = new Plyr(target, {
        autoplay: wantAutoplay,
        muted: true,
        volume: playback.volume,
        iconUrl: PLYR_ICON_URL,
        controls: config.controls,
        tooltips: { controls: true, seek: config.seekTooltips },
        hideControls: true,
        clickToPlay: true,
        storage: { enabled: false },
        youtube: {
          noCookie: true,
          rel: 0,
          autoplay: wantAutoplay ? 1 : 0,
          mute: 1,
          playsinline: 1,
        },
        vimeo: {
          autoplay: wantAutoplay,
          muted: true,
          playsinline: true,
        },
      }) as unknown as PlyrLike;
      playerRef.current = player;

      wrapRef.current.style.setProperty('--plyr-color-main', config.accent);

      const markOk = () => {
        settled = true;
      };
      const markBad = () => {
        if (!cancelled && !settled) markFail();
      };

      player.on('volumechange', () => {
        if (!player.muted && (player.volume ?? 0) > 0) userUnmuted.current = true;
      });

      // loadedmetadata is the reliable signal with preload=metadata.
      player.on('loadedmetadata', markOk);
      player.on('loadeddata', markOk);
      player.on('canplay', markOk);
      if (provider) player.on('ready', markOk);
      player.on('error', markBad);
      loadTimer = window.setTimeout(markBad, PLYR_STUCK_MS);

      const applyVolumeAndMaybeUnmute = () => {
        player.volume = playback.volume;
        if (!playback.wantSound) return;
        player.muted = false;
        // Gesture-less unmute often blocked after async Plyr load — volume still set for UI unmute
        if (!player.muted) userUnmuted.current = true;
        else player.muted = true;
      };

      const tryAutoplay = async () => {
        if (!wantAutoplay || cancelled) return;
        player.volume = playback.volume;
        player.muted = true;
        try {
          await Promise.resolve(player.play());
          applyVolumeAndMaybeUnmute();
        } catch {
          player.muted = true;
          void Promise.resolve(player.play())
            .then(() => applyVolumeAndMaybeUnmute())
            .catch(() => {});
        }
      };

      player.on('ready', () => {
        void tryAutoplay();
      });
      void tryAutoplay();
    })();

    const wrapEl = wrapRef.current;
    return () => {
      cancelled = true;
      window.clearTimeout(loadTimer);
      try {
        playerRef.current?.destroy();
      } catch {
        /* plyr mid-load */
      }
      playerRef.current = null;
      releaseEmbedSubtree(wrapEl);
    };
  }, [
    usePlyr,
    failed,
    src,
    provider,
    config.enabled,
    config.accent,
    config.seekTooltips,
    config.controls,
    playback.autoplay,
    playback.volume,
    playback.wantSound,
    markFail,
  ]);

  // Drop file media only when leaving this src — not on volume/autoplay tweaks.
  useEffect(() => {
    if (usePlyr || preview || !isFile) return;
    const el = videoRef.current;
    if (!el) return;
    el.src = src;
    return () => releaseVideoEl(el);
  }, [usePlyr, preview, isFile, src]);

  useEffect(() => {
    if (usePlyr || preview || !isFile || !videoRef.current || failed) return;
    const el = videoRef.current;
    userUnmuted.current = false;
    el.volume = playback.volume;
    el.muted = true;
    const onErr = () => markFail();
    el.addEventListener('error', onErr);
    if (!playback.autoplay) {
      return () => el.removeEventListener('error', onErr);
    }

    const onVol = () => {
      if (!el.muted && el.volume > 0) userUnmuted.current = true;
    };
    el.addEventListener('volumechange', onVol);
    void el
      .play()
      .then(() => {
        if (!playback.wantSound) return;
        el.muted = false;
        if (!el.muted) userUnmuted.current = true;
        else el.muted = true;
      })
      .catch(() => {
        el.muted = true;
        void el.play().catch(() => {});
      });
    return () => {
      el.removeEventListener('volumechange', onVol);
      el.removeEventListener('error', onErr);
    };
  }, [usePlyr, preview, isFile, failed, src, playback.autoplay, playback.volume, playback.wantSound, markFail]);

  if (!src) return null;

  if (stillImage || (failed && (isFile || iframeEmbed))) {
    return <Unavailable poster={poster} className={className} label={failLabel} />;
  }

  // Editor preview: native controls / iframe — Plyr chrome is unusable in tiny stage.
  if (preview) {
    if (yt) {
      return (
        <GenericEmbedFrame
          className={className}
          title="YouTube"
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt)}`}
        />
      );
    }
    if (vim) {
      return (
        <GenericEmbedFrame
          className={className}
          title="Vimeo"
          src={`https://player.vimeo.com/video/${encodeURIComponent(vim)}`}
        />
      );
    }
    if (iframeEmbed) {
      return <GenericEmbedFrame src={src} className={className} title={embedTitle} />;
    }
    if (isFile) {
      return (
        <PreviewFileVideo
          src={src}
          poster={poster}
          className={className}
          onError={markFail}
        />
      );
    }
    return null;
  }

  if (iframeEmbed) {
    return <GenericEmbedFrame src={src} className={className} title={embedTitle} />;
  }

  if (!config.enabled && provider) {
    return (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className={`btn btn-outline btn-sm ${className ?? ''}`}
      >
        Watch video
      </a>
    );
  }

  if (usePlyr && provider) {
    return (
      <div ref={wrapRef} className={className}>
        <div data-plyr-provider={provider} data-plyr-embed-id={yt || vim || ''} />
      </div>
    );
  }

  if (usePlyr && isFile) {
    return (
      <div ref={wrapRef} className={className}>
        {/* Prefer src= over typed <source> — wrong MIME → forever plyr--loading */}
        <video
          key={src}
          src={src}
          playsInline
          muted
          loop
          autoPlay={playback.autoplay}
          poster={poster || undefined}
          className="w-full h-full"
          preload="metadata"
          onError={markFail}
        />
      </div>
    );
  }

  if (isFile) {
    return (
      <video
        key={src}
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        className={className}
        playsInline
        controls
        muted
        loop
        autoPlay={playback.autoplay}
        preload="metadata"
        onError={markFail}
      />
    );
  }

  return null;
}
