import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchSiteSettings,
  saveSiteSettings,
  SITE_SETTING_DEFAULTS,
  type SiteSettingsMap,
} from '../lib/siteSettings';

const QUERY_KEY = ['site-settings'];

export function useSiteSettings() {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchSiteSettings,
    staleTime: 1000 * 60 * 5,
    placeholderData: SITE_SETTING_DEFAULTS,
  });

  return {
    settings: query.data ?? SITE_SETTING_DEFAULTS,
    isLoading: query.isLoading,
    /** True while showing SITE_SETTING_DEFAULTS before the first fetch settles. */
    isPlaceholderData: query.isPlaceholderData,
    error: query.error,
  };
}

export function useSaveSiteSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ updates, userId }: { updates: Partial<SiteSettingsMap>; userId: string }) =>
      saveSiteSettings(updates, userId),
    onSuccess: (_data, variables) => {
      // Saved storefront controls should preview immediately, before refetch finishes.
      queryClient.setQueryData<SiteSettingsMap>(QUERY_KEY, (current) => ({
        ...(current ?? SITE_SETTING_DEFAULTS),
        ...variables.updates,
      }));
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
