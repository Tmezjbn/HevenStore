import { useEffect, useState, type ReactNode } from 'react';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { useAuthStore } from '../../stores/authStore';
import RouteLoadingScreen from './RouteLoadingScreen';

/** Max hold so a slow network never traps shoppers on the splash. */
const BOOT_MAX_MS = 1800;

/**
 * Covers first paint until auth session + site settings leave placeholder.
 * Avoids live content pop-in (hero card, nav auth, section order).
 */
export default function AppBootGate({ children }: { children: ReactNode }) {
  const authLoading = useAuthStore((s) => s.loading);
  const { isPlaceholderData } = useSiteSettings();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setTimedOut(true), BOOT_MAX_MS);
    return () => window.clearTimeout(id);
  }, []);

  const ready = timedOut || (!authLoading && !isPlaceholderData);
  if (!ready) return <RouteLoadingScreen />;
  return children;
}
