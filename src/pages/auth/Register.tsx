import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types/database';

const registerSchema = z.object({
  email: z.string().email('유효한 이메일을 입력하세요'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
  confirmPassword: z.string(),
  fullName: z.string().min(2, '이름은 2자 이상이어야 합니다'),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export function Register() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const defaultRole = (searchParams.get('role') as UserRole) || 'investor';

  const [role, setRole] = useState<UserRole>(defaultRole);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          role: role,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      return;
    }

    if (authData.user) {
      navigate('/');
    }
  };

  const inputClass = 'w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent';

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl shadow-lg">
        <div className="px-6 py-5 border-b border-neutral-800">
          <h1 className="text-2xl font-bold text-center text-white">회원가입</h1>
        </div>
        <div className="px-6 py-6">
          {/* Role Selection */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setRole('investor')}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                role === 'investor'
                  ? 'border-white bg-white/10 text-white'
                  : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
              }`}
            >
              <div className="font-medium">투자자</div>
              <div className="text-sm opacity-60">스타트업 탐색</div>
            </button>
            <button
              type="button"
              onClick={() => setRole('startup')}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                role === 'startup'
                  ? 'border-white bg-white/10 text-white'
                  : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
              }`}
            >
              <div className="font-medium">스타트업</div>
              <div className="text-sm opacity-60">회사 등록</div>
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="w-full">
              <label className="block text-sm font-medium text-neutral-300 mb-1">이름</label>
              <input
                placeholder="홍길동"
                className={inputClass}
                {...register('fullName')}
              />
              {errors.fullName && <p className="mt-1 text-sm text-red-400">{errors.fullName.message}</p>}
            </div>

            <div className="w-full">
              <label className="block text-sm font-medium text-neutral-300 mb-1">이메일</label>
              <input
                type="email"
                placeholder="name@company.com"
                className={inputClass}
                {...register('email')}
              />
              {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
            </div>

            <div className="w-full">
              <label className="block text-sm font-medium text-neutral-300 mb-1">비밀번호</label>
              <input
                type="password"
                placeholder="••••••••"
                className={inputClass}
                {...register('password')}
              />
              {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>}
            </div>

            <div className="w-full">
              <label className="block text-sm font-medium text-neutral-300 mb-1">비밀번호 확인</label>
              <input
                type="password"
                placeholder="••••••••"
                className={inputClass}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center font-medium rounded-lg px-4 py-2.5 bg-white text-black hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              회원가입
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-400">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="text-white hover:underline font-medium">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
