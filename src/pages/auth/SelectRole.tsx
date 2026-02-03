import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types/database';

export function SelectRole() {
  const navigate = useNavigate();
  const { user, setProfile } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectRole = async (role: UserRole) => {
    if (!user) return;
    setIsLoading(true);

    // upsert profile with selected role
    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: user.email!,
          role,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (error) {
      setIsLoading(false);
      return;
    }

    // update user_metadata
    await supabase.auth.updateUser({ data: { role } });

    setProfile(data);

    if (role === 'startup') {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/companies', { replace: true });
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-lg">
          <div className="px-6 pt-8 pb-4 text-center space-y-4">
            <div className="mx-auto">
              <img src="/logo.png" alt="IV Logo" className="w-[60px] h-[60px] mx-auto invert" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-serif font-semibold text-white">Welcome to IV</h1>
              <p className="text-sm text-neutral-400">Choose how you want to use IV</p>
            </div>
          </div>

          <div className="px-6 pb-8 space-y-4">
            <button
              onClick={() => handleSelectRole('startup')}
              disabled={isLoading}
              className="w-full flex items-center gap-4 p-5 rounded-xl border border-neutral-700 hover:border-white hover:bg-white/5 transition-colors group disabled:opacity-50"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-neutral-800 group-hover:bg-white/10 transition-colors">
                <Building2 className="w-6 h-6 text-neutral-300" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-white">Join as Company</p>
                <p className="text-sm text-neutral-400 mt-0.5">
                  Register your startup and showcase to investors
                </p>
              </div>
            </button>

            <button
              onClick={() => handleSelectRole('investor')}
              disabled={isLoading}
              className="w-full flex items-center gap-4 p-5 rounded-xl border border-neutral-700 hover:border-white hover:bg-white/5 transition-colors group disabled:opacity-50"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-neutral-800 group-hover:bg-white/10 transition-colors">
                <User className="w-6 h-6 text-neutral-300" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-white">Join as Member</p>
                <p className="text-sm text-neutral-400 mt-0.5">
                  Discover and evaluate promising startups
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
