import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_MODE,
  DEFAULT_SKIN,
  normalizeSkinId,
  resolveTheme,
  type Mode,
  type SkinId,
} from '../lib/appearance';
import {
  withViewTransition,
  type ViewTransitionOrigin,
} from '../lib/viewTransition';

function withThemeTransition(update: () => void, origin?: ViewTransitionOrigin, theme?: string) {
  void withViewTransition(update, 'theme-switching', { origin, theme });
}

interface AppearanceStore {
  skin: SkinId;
  mode: Mode;
  /** False until visitor picks a skin — then follow owner default_skin. */
  hasUserPickedSkin: boolean;
  /** False until visitor toggles light/dark. */
  hasUserPickedMode: boolean;
  setSkin: (skin: SkinId) => void;
  /** Apply owner default without marking a personal choice (no transition). */
  syncSiteDefault: (skin: SkinId) => void;
  /** Apply account prefs without transition (login hydrate). */
  hydrateFromAccount: (skin: SkinId | null, mode: Mode | null) => void;
  setMode: (mode: Mode, origin?: ViewTransitionOrigin) => void;
  toggleMode: (origin?: ViewTransitionOrigin) => void;
}

export const useAppearanceStore = create<AppearanceStore>()(
  persist(
    (set, get) => ({
      skin: DEFAULT_SKIN,
      mode: DEFAULT_MODE,
      hasUserPickedSkin: false,
      hasUserPickedMode: false,
      setSkin: (skin) => {
        const next = normalizeSkinId(skin);
        withThemeTransition(
          () => set({ skin: next, hasUserPickedSkin: true }),
          undefined,
          resolveTheme(next, get().mode),
        );
      },
      syncSiteDefault: (skin) => {
        const next = normalizeSkinId(skin);
        if (get().skin === next) return;
        set({ skin: next });
      },
      hydrateFromAccount: (skin, mode) => {
        const patch: Partial<AppearanceStore> = {};
        if (skin) {
          patch.skin = normalizeSkinId(skin);
          patch.hasUserPickedSkin = true;
        }
        if (mode === 'light' || mode === 'dark') {
          patch.mode = mode;
          patch.hasUserPickedMode = true;
        }
        if (Object.keys(patch).length) set(patch);
      },
      setMode: (mode, origin) =>
        withThemeTransition(
          () => set({ mode, hasUserPickedMode: true }),
          origin,
          resolveTheme(get().skin, mode),
        ),
      toggleMode: (origin) => {
        const next: Mode = get().mode === 'dark' ? 'light' : 'dark';
        withThemeTransition(
          () => set({ mode: next, hasUserPickedMode: true }),
          origin,
          resolveTheme(get().skin, next),
        );
      },
    }),
    {
      name: 'heven-appearance',
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppearanceStore>;
        return {
          ...current,
          ...p,
          skin: normalizeSkinId(p.skin),
          mode: p.mode === 'light' || p.mode === 'dark' ? p.mode : current.mode,
          hasUserPickedSkin: Boolean(p.hasUserPickedSkin),
          hasUserPickedMode: Boolean(p.hasUserPickedMode),
        };
      },
    }
  )
);
