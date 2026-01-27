import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, ChevronLeft, ChevronRight, Building2, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import {
  Button,
  Input,
  Select,
  Card,
  CardContent,
  CardHeader,
  Textarea,
  ImageUpload,
} from '@/components/ui';
import type { SelectOption } from '@/components/ui/Select';

// --- Options ---
const employeeCountOptions: SelectOption[] = [
  { value: '1~10', label: '1~10명' },
  { value: '10~100', label: '10~100명' },
  { value: '100~1000', label: '100~1,000명' },
  { value: '1000~10000', label: '1,000~10,000명' },
  { value: '10000+', label: '10,000명 이상' },
];

const categoryOptions: SelectOption[] = [
  { value: 'AI/ML', label: 'AI/ML' },
  { value: 'Fintech', label: 'Fintech' },
  { value: 'Edtech', label: 'Edtech' },
  { value: 'CleanTech', label: 'CleanTech' },
  { value: 'HealthTech', label: 'HealthTech' },
  { value: 'E-commerce', label: 'E-commerce' },
  { value: 'SaaS', label: 'SaaS' },
  { value: 'Other', label: '기타' },
];

const stageOptions: SelectOption[] = [
  { value: 'Pre-seed', label: 'Pre-seed' },
  { value: 'Seed', label: 'Seed' },
  { value: 'Series A', label: 'Series A' },
  { value: 'Series B', label: 'Series B' },
  { value: 'Series C+', label: 'Series C+' },
];

const executiveRoleOptions: SelectOption[] = [
  { value: 'CEO', label: 'CEO' },
  { value: 'CTO', label: 'CTO' },
  { value: 'COO', label: 'COO' },
  { value: 'CFO', label: 'CFO' },
  { value: 'CPO', label: 'CPO' },
];

// --- Schema ---
const executiveSchema = z.object({
  name: z.string().min(1, '이름을 입력하세요'),
  role: z.enum(['CEO', 'CTO', 'COO', 'CFO', 'CPO'], { message: '직책을 선택하세요' }),
  photo_url: z.string().nullable().optional(),
  bio: z.string().optional(),
  linkedin_url: z.string().url('유효한 URL을 입력하세요').or(z.literal('')).optional(),
  twitter_url: z.string().url('유효한 URL을 입력하세요').or(z.literal('')).optional(),
  education: z.string().optional(),
});

const companyRegisterSchema = z.object({
  // Step 1: Company info
  logo_url: z.string().min(1, '회사 로고를 업로드하세요'),
  name: z.string().min(1, '회사 이름을 입력하세요'),
  short_description: z
    .string()
    .min(10, '최소 10자 이상 입력하세요')
    .max(100, '최대 100자까지 입력 가능합니다'),
  founded_at: z.string().min(1, '창업 시기를 입력하세요'),
  location: z.string().min(1, '창업 위치를 입력하세요'),
  employee_count: z.enum(['1~10', '10~100', '100~1000', '1000~10000', '10000+'], {
    message: '직원 수를 선택하세요',
  }),
  description: z
    .string()
    .min(100, '최소 100자 이상 입력하세요')
    .max(10000, '최대 10,000자까지 입력 가능합니다'),
  category: z.enum(['AI/ML', 'Fintech', 'Edtech', 'CleanTech', 'HealthTech', 'E-commerce', 'SaaS', 'Other'], {
    message: '카테고리를 선택하세요',
  }),
  stage: z.enum(['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+'], {
    message: '성숙도를 선택하세요',
  }),
  // Optional links
  website_url: z.string().url('유효한 URL을 입력하세요').or(z.literal('')).optional(),
  github_url: z.string().url('유효한 URL을 입력하세요').or(z.literal('')).optional(),
  linkedin_url: z.string().url('유효한 URL을 입력하세요').or(z.literal('')).optional(),
  twitter_url: z.string().url('유효한 URL을 입력하세요').or(z.literal('')).optional(),
  youtube_url: z.string().url('유효한 URL을 입력하세요').or(z.literal('')).optional(),
  // Step 2: Executives
  executives: z.array(executiveSchema).min(1, '최소 1명의 경영진을 등록하세요'),
});

type CompanyRegisterForm = z.infer<typeof companyRegisterSchema>;

const defaultExecutive = (role: string = 'CEO') => ({
  name: '',
  role: role as CompanyRegisterForm['executives'][number]['role'],
  photo_url: null,
  bio: '',
  linkedin_url: '',
  twitter_url: '',
  education: '',
});

export function CompanyRegister() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<CompanyRegisterForm>({
    resolver: zodResolver(companyRegisterSchema),
    defaultValues: {
      logo_url: '',
      name: '',
      short_description: '',
      founded_at: '',
      location: '',
      employee_count: undefined,
      description: '',
      category: undefined,
      stage: undefined,
      website_url: '',
      github_url: '',
      linkedin_url: '',
      twitter_url: '',
      youtube_url: '',
      executives: [defaultExecutive('CEO')],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'executives',
  });

  const descriptionValue = watch('description') || '';

  const handleNext = async () => {
    const step1Fields = [
      'logo_url', 'name', 'short_description', 'founded_at', 'location',
      'employee_count', 'description', 'category', 'stage',
      'website_url', 'github_url', 'linkedin_url', 'twitter_url', 'youtube_url',
    ] as const;
    const valid = await trigger(step1Fields as unknown as (keyof CompanyRegisterForm)[]);
    if (valid) setStep(2);
  };

  const onSubmit = async (data: CompanyRegisterForm) => {
    if (!user) return;
    setSubmitError(null);

    // 1. Insert company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        user_id: user.id,
        name: data.name,
        logo_url: data.logo_url || null,
        short_description: data.short_description,
        description: data.description,
        founded_at: data.founded_at,
        location: data.location,
        employee_count: data.employee_count,
        category: data.category,
        stage: data.stage,
        website_url: data.website_url || null,
        github_url: data.github_url || null,
        linkedin_url: data.linkedin_url || null,
        twitter_url: data.twitter_url || null,
        youtube_url: data.youtube_url || null,
      })
      .select('id')
      .single();

    if (companyError || !company) {
      setSubmitError(companyError?.message || '회사 등록에 실패했습니다.');
      return;
    }

    // 2. Insert executives
    const executives = data.executives.map((exec) => ({
      company_id: company.id,
      name: exec.name,
      role: exec.role,
      photo_url: exec.photo_url || null,
      bio: exec.bio || null,
      linkedin_url: exec.linkedin_url || null,
      twitter_url: exec.twitter_url || null,
      education: exec.education || null,
    }));

    const { error: execError } = await supabase.from('executives').insert(executives);

    if (execError) {
      setSubmitError('경영진 등록에 실패했습니다. 회사 페이지에서 다시 추가해주세요.');
      return;
    }

    navigate('/dashboard');
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-warm-900 mb-2">회사 등록</h1>
      <p className="text-warm-600 mb-6">회사 정보를 입력하여 투자자에게 공개하세요.</p>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {[
          { num: 1, icon: Building2, label: '회사 정보' },
          { num: 2, icon: Users, label: '경영진' },
        ].map(({ num, icon: Icon, label }) => (
          <div key={num} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                step >= num
                  ? 'bg-primary-600 text-white'
                  : 'bg-warm-200 text-warm-500'
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <span className={`text-sm font-medium ${step >= num ? 'text-primary-700' : 'text-warm-400'}`}>
              {label}
            </span>
            {num < 2 && <div className={`w-12 h-0.5 ${step > num ? 'bg-primary-500' : 'bg-warm-200'}`} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Company Info */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-warm-900">회사 정보</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {/* Logo */}
                <Controller
                  control={control}
                  name="logo_url"
                  render={({ field }) => (
                    <ImageUpload
                      label="회사 로고"
                      required
                      bucket="company-assets"
                      path="logos"
                      value={field.value}
                      onChange={(url) => field.onChange(url || '')}
                      error={errors.logo_url?.message}
                      shape="square"
                      size="lg"
                    />
                  )}
                />

                <Input
                  label="회사 이름"
                  required
                  placeholder="예: 넥스트챌린저"
                  error={errors.name?.message}
                  {...register('name')}
                />

                <Input
                  label="한줄 설명"
                  required
                  placeholder="회사를 한 문장으로 소개하세요 (10~100자)"
                  error={errors.short_description?.message}
                  {...register('short_description')}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="창업 시기"
                    type="date"
                    required
                    error={errors.founded_at?.message}
                    {...register('founded_at')}
                  />
                  <Input
                    label="창업 위치"
                    required
                    placeholder="예: 서울특별시 강남구"
                    error={errors.location?.message}
                    {...register('location')}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Select
                    label="직원 수"
                    required
                    options={employeeCountOptions}
                    placeholder="선택하세요"
                    error={errors.employee_count?.message}
                    {...register('employee_count')}
                  />
                  <Select
                    label="카테고리"
                    required
                    options={categoryOptions}
                    placeholder="선택하세요"
                    error={errors.category?.message}
                    {...register('category')}
                  />
                  <Select
                    label="성숙도"
                    required
                    options={stageOptions}
                    placeholder="선택하세요"
                    error={errors.stage?.message}
                    {...register('stage')}
                  />
                </div>

                <Controller
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <Textarea
                      label="회사 소개"
                      required
                      placeholder="회사에 대해 자세히 소개해주세요 (1,000~10,000자)"
                      showCount
                      maxLength={10000}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      error={errors.description?.message}
                      className="min-h-[200px]"
                    />
                  )}
                />

                {/* Optional links */}
                <div>
                  <p className="text-sm font-medium text-warm-700 mb-3">회사 링크 (선택)</p>
                  <div className="space-y-3">
                    <Input label="Website" placeholder="https://example.com" error={errors.website_url?.message} {...register('website_url')} />
                    <Input label="GitHub" placeholder="https://github.com/..." error={errors.github_url?.message} {...register('github_url')} />
                    <Input label="LinkedIn" placeholder="https://linkedin.com/company/..." error={errors.linkedin_url?.message} {...register('linkedin_url')} />
                    <Input label="Twitter" placeholder="https://twitter.com/..." error={errors.twitter_url?.message} {...register('twitter_url')} />
                    <Input label="YouTube" placeholder="https://youtube.com/..." error={errors.youtube_url?.message} {...register('youtube_url')} />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="button" onClick={handleNext}>
                    다음: 경영진 <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Executives */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-warm-900">경영진 (C-level)</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append(defaultExecutive('CTO'))}
                >
                  <Plus className="w-4 h-4 mr-1" /> 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {fields.map((field, index) => {
                  const isCEO = index === 0;
                  return (
                    <div
                      key={field.id}
                      className="border border-warm-200 rounded-lg p-4 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-warm-700">
                          경영진 #{index + 1}
                        </span>
                        {!isCEO && (
                          <button
                            type="button"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label="이름"
                          required
                          placeholder="홍길동"
                          error={errors.executives?.[index]?.name?.message}
                          {...register(`executives.${index}.name`)}
                        />
                        <Select
                          label="직책"
                          required
                          options={isCEO ? [{ value: 'CEO', label: 'CEO' }] : executiveRoleOptions}
                          placeholder="선택하세요"
                          error={errors.executives?.[index]?.role?.message}
                          disabled={isCEO}
                          {...register(`executives.${index}.role`)}
                        />
                      </div>

                      <Controller
                        control={control}
                        name={`executives.${index}.photo_url`}
                        render={({ field: f }) => (
                          <ImageUpload
                            label="프로필 사진"
                            bucket="company-assets"
                            path={`executives`}
                            value={f.value || undefined}
                            onChange={(url) => f.onChange(url)}
                            shape="circle"
                            size="sm"
                          />
                        )}
                      />

                      <Input
                        label="소개"
                        placeholder="간단한 경력 소개"
                        error={errors.executives?.[index]?.bio?.message}
                        {...register(`executives.${index}.bio`)}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label="LinkedIn"
                          placeholder="https://linkedin.com/in/..."
                          error={errors.executives?.[index]?.linkedin_url?.message}
                          {...register(`executives.${index}.linkedin_url`)}
                        />
                        <Input
                          label="Twitter"
                          placeholder="https://twitter.com/..."
                          error={errors.executives?.[index]?.twitter_url?.message}
                          {...register(`executives.${index}.twitter_url`)}
                        />
                      </div>

                      <Input
                        label="학교 / 전공"
                        placeholder="예: 서울대학교 컴퓨터공학과"
                        error={errors.executives?.[index]?.education?.message}
                        {...register(`executives.${index}.education`)}
                      />
                    </div>
                  );
                })}

                {errors.executives?.root?.message && (
                  <p className="text-sm text-red-500">{errors.executives.root.message}</p>
                )}

                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    {submitError}
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> 이전
                  </Button>
                  <Button type="submit" isLoading={isSubmitting}>
                    회사 등록
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
