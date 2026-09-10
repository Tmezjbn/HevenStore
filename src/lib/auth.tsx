import React, { useEffect } from 'react';
import { supabase } from './supabase';
import { useAuthStore } from '../stores/authStore';
import { isAccountSwitchInFlight } from './accountSwitch';

async function loadProfileOrKick(userId: string, fullName: string) {
  const { fetchProfile, signOut } = useAuthStore.getState();
  await fetchProfile(userId, fullName);
  const next = useAuthStore.getState().profile;
  if (next && !next.is_active) {
    await signOut();
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        void loadProfileOrKick(
          session.user.id,
          (session.user.user_metadata?.full_name as string | undefined) ?? '',
        );
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      // Account switch can emit a transient null while tokens swap — do not
      // clear the live user (Dashboard would flash /auth/login).
      if (!session && isAccountSwitchInFlight()) return;

      setSession(session);
      if (session?.user) {
        void loadProfileOrKick(
          session.user.id,
          (session.user.user_metadata?.full_name as string | undefined) ?? '',
        );
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, fetchProfile]);

  return <>{children}</>;
}
