import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@supabase/supabase-js';
import type { Profile, UserRole } from '@/types/database';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  /** profile.role이 없으면 user_metadata.role을 fallback으로 반환 */
  getRole: () => UserRole | null;
}

export const useAuthStore = create<AuthState>()(
  persist<AuthState>(
    (set, get) => ({
      user: null,
      profile: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, profile: null }),
      getRole: (): UserRole | null => {
        const state = get();
        return (
          state.profile?.role ??
          (state.user?.user_metadata?.role as UserRole) ??
          null
        );
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state: AuthState) => ({ user: state.user, profile: state.profile }) as unknown as AuthState,
    }
  )
);
