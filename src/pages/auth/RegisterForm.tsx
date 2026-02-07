import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Building2, User } from 'lucide-react';
import { ConsentForm } from '@/components/consent/ConsentForm';
import { userConsentItems, founderConsentItems } from '@/lib/consent-data';
import type { UserRole } from '@/types/database';

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

type Step = 'consent' | 'form';

export function RegisterForm({ role }: { role: UserRole }) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('consent');
  const [error, setError] = useState<string | null>(null);

  const isCompany = role === 'startup';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const handleConsentComplete = () => {
    setStep('form');
  };

  const handleConsentBack = () => {
    navigate('/');
  };

  const onSubmit = async (data: RegisterFormData) => {
    setError(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          role,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    navigate('/');
  };

  const handleGoogleLogin = async () => {
    localStorage.setItem('pending_oauth_role', role);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  const inputClass = 'w-full h-12 px-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent';

  if (step === 'consent') {
    return (
      <ConsentForm
        type={isCompany ? 'founder' : 'user'}
        items={isCompany ? founderConsentItems : userConsentItems}
        onBack={handleConsentBack}
        onComplete={handleConsentComplete}
      />
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 mb-6 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-lg">
          <div className="px-6 pt-8 pb-4 text-center space-y-4">
            <div className="mx-auto">
              <img src="/logo-dark.jpg" alt="IV Logo" className="w-[60px] h-[60px] mx-auto rounded-lg" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-serif font-semibold text-white">
                {isCompany ? 'Join as Company' : 'Join as Member'}
              </h1>
              <p className="flex items-center justify-center gap-2 text-sm text-neutral-400">
                <span className="flex items-center gap-1.5 px-2 py-1 bg-neutral-800 rounded-full text-xs text-neutral-300">
                  {isCompany ? (
                    <><Building2 className="w-3 h-3" /> Company Account</>
                  ) : (
                    <><User className="w-3 h-3" /> Member Account</>
                  )}
                </span>
              </p>
            </div>
          </div>

          <div className="px-6 pb-8 space-y-6">
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Google Login Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full h-12 inline-flex items-center justify-center gap-3 bg-transparent border border-neutral-700 rounded-lg text-white hover:bg-neutral-800 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-neutral-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-neutral-900 px-2 text-neutral-500">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-300">Full Name</label>
                <input placeholder="John Doe" className={inputClass} {...register('fullName')} />
                {errors.fullName && <p className="text-sm text-red-400">{errors.fullName.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-300">Email</label>
                <input type="email" placeholder="name@example.com" className={inputClass} {...register('email')} />
                {errors.email && <p className="text-sm text-red-400">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-300">Password</label>
                <input type="password" placeholder="••••••••" className={inputClass} {...register('password')} />
                {errors.password && <p className="text-sm text-red-400">{errors.password.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-300">Confirm Password</label>
                <input type="password" placeholder="••••••••" className={inputClass} {...register('confirmPassword')} />
                {errors.confirmPassword && <p className="text-sm text-red-400">{errors.confirmPassword.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 inline-flex items-center justify-center font-medium rounded-lg bg-white text-black hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <p className="text-xs text-center text-neutral-500">
              By continuing, you agree to IV&apos;s Terms of Service and Privacy Policy.
            </p>

            <p className="text-sm text-center text-neutral-400">
              Already have an account?{' '}
              <Link to="/login" className="text-white hover:underline font-medium">
                Log In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
