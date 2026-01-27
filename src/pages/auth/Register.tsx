import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { Button, Input, Card, CardContent, CardHeader } from '@/components/ui';
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
  const defaultRole = (searchParams.get('role') as UserRole) || 'investor';

  const [role, setRole] = useState<UserRole>(defaultRole);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">가입 완료!</h2>
            <p className="text-warm-600 mb-6">
              이메일로 발송된 인증 링크를 확인해주세요.
            </p>
            <Link to="/login">
              <Button>로그인 페이지로</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-bold text-center">회원가입</h1>
        </CardHeader>
        <CardContent>
          {/* Role Selection */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setRole('investor')}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                role === 'investor'
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-warm-200 hover:border-warm-300'
              }`}
            >
              <div className="font-medium">투자자</div>
              <div className="text-sm text-warm-500">스타트업 탐색</div>
            </button>
            <button
              type="button"
              onClick={() => setRole('startup')}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                role === 'startup'
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-warm-200 hover:border-warm-300'
              }`}
            >
              <div className="font-medium">스타트업</div>
              <div className="text-sm text-warm-500">회사 등록</div>
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <Input
              label="이름"
              placeholder="홍길동"
              error={errors.fullName?.message}
              {...register('fullName')}
            />

            <Input
              label="이메일"
              type="email"
              placeholder="name@company.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="비밀번호"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <Input
              label="비밀번호 확인"
              type="password"
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              회원가입
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-warm-600">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="text-primary-600 hover:underline font-medium">
              로그인
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
