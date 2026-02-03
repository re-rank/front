import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Trash2, ChevronLeft, ChevronRight, Building2, Users,
  Video, Newspaper, BarChart3, HelpCircle, Settings, Check,
} from 'lucide-react';
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

const investorQuestionOptions = [
  '현재 매출 규모는 어느 정도인가요?',
  '주요 경쟁사 대비 차별점은 무엇인가요?',
  '향후 12개월 자금 운용 계획은?',
  '핵심 기술의 진입 장벽은 무엇인가요?',
  '주요 고객 또는 파트너사가 있나요?',
  '팀의 핵심 역량은 무엇인가요?',
  '현재 가장 큰 도전 과제는?',
  'Exit 전략이 있나요?',
];

// --- Steps Config ---
const steps = [
  { num: 1, icon: Building2, label: 'Profile' },
  { num: 2, icon: Users, label: 'Team' },
  { num: 3, icon: Video, label: 'Media' },
  { num: 4, icon: Newspaper, label: 'News' },
  { num: 5, icon: BarChart3, label: 'Metrics' },
  { num: 6, icon: HelpCircle, label: 'Questions' },
  { num: 7, icon: Settings, label: 'Settings' },
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
  // Step 1: Profile
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
  website_url: z.string().url('유효한 URL을 입력하세요').or(z.literal('')).optional(),
  github_url: z.string().url('유효한 URL을 입력하세요').or(z.literal('')).optional(),
  linkedin_url: z.string().url('유효한 URL을 입력하세요').or(z.literal('')).optional(),
  twitter_url: z.string().url('유효한 URL을 입력하세요').or(z.literal('')).optional(),
  youtube_url: z.string().url('유효한 URL을 입력하세요').or(z.literal('')).optional(),
  // Step 2: Team
  executives: z.array(executiveSchema).min(1, '최소 1명의 경영진을 등록하세요'),
  // Step 3: Media
  intro_video_url: z.string().url('유효한 URL을 입력하세요').or(z.literal('')).optional(),
  additional_videos: z.array(z.string()).optional(),
  // Step 6: Questions
  selected_questions: z.array(z.string()).optional(),
  question_answers: z.record(z.string(), z.string()).optional(),
});

type CompanyRegisterForm = z.infer<typeof companyRegisterSchema>;

// --- News item type (local state) ---
interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  date: string;
}

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

  // Step 3: Media - additional videos
  const [newVideoUrl, setNewVideoUrl] = useState('');

  // Step 4: News - local state
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsForm, setNewsForm] = useState({ title: '', url: '', source: '', date: '' });

  // Step 6: Questions
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});

  const {
    register,
    control,
    handleSubmit,
    trigger,
    getValues,
    setValue,
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
      intro_video_url: '',
      additional_videos: [],
      selected_questions: [],
      question_answers: {},
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'executives',
  });

  // --- Step validation ---
  const step1Fields = [
    'logo_url', 'name', 'short_description', 'founded_at', 'location',
    'employee_count', 'description', 'category', 'stage',
    'website_url', 'github_url', 'linkedin_url', 'twitter_url', 'youtube_url',
  ] as const;

  const handleNext = async () => {
    if (step === 1) {
      const valid = await trigger(step1Fields as unknown as (keyof CompanyRegisterForm)[]);
      if (!valid) return;
    }
    if (step === 2) {
      const valid = await trigger('executives');
      if (!valid) return;
    }
    // Steps 3~7 have no required validation
    setStep((s) => Math.min(s + 1, 7));
  };

  const handlePrev = () => setStep((s) => Math.max(s - 1, 1));

  // --- News helpers ---
  const addNewsItem = () => {
    if (!newsForm.title || !newsForm.url) return;
    setNewsItems((prev) => [
      ...prev,
      { ...newsForm, id: crypto.randomUUID() },
    ]);
    setNewsForm({ title: '', url: '', source: '', date: '' });
  };

  const removeNewsItem = (id: string) => {
    setNewsItems((prev) => prev.filter((n) => n.id !== id));
  };

  // --- Questions helpers ---
  const toggleQuestion = (q: string) => {
    setSelectedQuestions((prev) =>
      prev.includes(q) ? prev.filter((x) => x !== q) : [...prev, q]
    );
  };

  // --- Additional video helpers ---
  const addVideo = () => {
    if (!newVideoUrl) return;
    const current = getValues('additional_videos') || [];
    setValue('additional_videos', [...current, newVideoUrl]);
    setNewVideoUrl('');
  };

  const removeVideo = (index: number) => {
    const current = getValues('additional_videos') || [];
    setValue('additional_videos', current.filter((_, i) => i !== index));
  };

  // --- Submit (Step 1~2 data only) ---
  const onSubmit = async (data: CompanyRegisterForm) => {
    if (!user) return;
    setSubmitError(null);

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

  // --- Step Indicator ---
  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
      {steps.map(({ num, icon: Icon, label }, idx) => (
        <div key={num} className="flex items-center">
          <button
            type="button"
            onClick={() => {
              // Only allow navigating to completed or current step
              if (num <= step) setStep(num);
            }}
            className="flex flex-col items-center gap-1 min-w-[64px] cursor-pointer"
          >
            <div
              className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-colors ${
                step > num
                  ? 'bg-primary text-primary-foreground'
                  : step === num
                    ? 'bg-primary text-primary-foreground ring-2 ring-ring'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {step > num ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
            </div>
            <span
              className={`text-xs font-medium whitespace-nowrap ${
                step >= num ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {label}
            </span>
          </button>
          {idx < steps.length - 1 && (
            <div
              className={`w-8 sm:w-12 h-0.5 mx-1 ${
                step > num ? 'bg-primary' : 'bg-muted'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  // --- Navigation Buttons ---
  const renderNavButtons = (showSubmit = false) => (
    <div className="flex justify-between pt-4">
      {step > 1 ? (
        <Button type="button" variant="outline" onClick={handlePrev}>
          <ChevronLeft className="w-4 h-4 mr-1" /> 이전
        </Button>
      ) : (
        <div />
      )}
      {showSubmit ? (
        <Button type="submit" isLoading={isSubmitting}>
          회사 등록
        </Button>
      ) : step < 7 ? (
        <Button type="button" onClick={handleNext}>
          다음 <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      ) : (
        <Button type="submit" isLoading={isSubmitting}>
          회사 등록
        </Button>
      )}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-foreground mb-2">회사 등록</h1>
      <p className="text-muted-foreground mb-6">회사 정보를 입력하여 투자자에게 공개하세요.</p>

      {renderStepIndicator()}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Profile */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground">회사 정보</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
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
                      placeholder="회사에 대해 자세히 소개해주세요 (100~10,000자)"
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

                <div>
                  <p className="text-sm font-medium text-secondary-foreground mb-3">회사 링크 (선택)</p>
                  <div className="space-y-3">
                    <Input label="Website" placeholder="https://example.com" error={errors.website_url?.message} {...register('website_url')} />
                    <Input label="GitHub" placeholder="https://github.com/..." error={errors.github_url?.message} {...register('github_url')} />
                    <Input label="LinkedIn" placeholder="https://linkedin.com/company/..." error={errors.linkedin_url?.message} {...register('linkedin_url')} />
                    <Input label="Twitter" placeholder="https://twitter.com/..." error={errors.twitter_url?.message} {...register('twitter_url')} />
                    <Input label="YouTube" placeholder="https://youtube.com/..." error={errors.youtube_url?.message} {...register('youtube_url')} />
                  </div>
                </div>

                {renderNavButtons()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Team */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">경영진 (C-level)</h2>
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
                      className="border border-border rounded-lg p-4 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-secondary-foreground">
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
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
                    {submitError}
                  </div>
                )}

                {renderNavButtons()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Media */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground">미디어</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <Input
                  label="소개 영상 URL"
                  placeholder="https://youtube.com/watch?v=..."
                  error={errors.intro_video_url?.message}
                  {...register('intro_video_url')}
                />

                <div>
                  <p className="text-sm font-medium text-secondary-foreground mb-3">추가 영상</p>
                  <div className="space-y-3">
                    {(getValues('additional_videos') || []).map((url, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="flex-1 text-sm text-secondary-foreground bg-background border border-border rounded-lg px-3 py-2 truncate">
                          {url}
                        </div>
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => removeVideo(idx)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        placeholder="영상 URL을 입력하세요"
                        value={newVideoUrl}
                        onChange={(e) => setNewVideoUrl(e.target.value)}
                      />
                      <Button type="button" variant="outline" onClick={addVideo}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {renderNavButtons()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: News */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground">뉴스</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  회사 관련 뉴스 기사를 추가하세요.
                </p>

                {newsItems.map((item) => (
                  <div
                    key={item.id}
                    className="border border-border rounded-lg p-4 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.url}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.source} {item.date && `| ${item.date}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-red-500 hover:text-red-700 shrink-0"
                      onClick={() => removeNewsItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <div className="border border-border rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-secondary-foreground">새 뉴스 추가</p>
                  <Input
                    label="제목"
                    required
                    placeholder="기사 제목"
                    value={newsForm.title}
                    onChange={(e) => setNewsForm((f) => ({ ...f, title: e.target.value }))}
                  />
                  <Input
                    label="URL"
                    required
                    placeholder="https://..."
                    value={newsForm.url}
                    onChange={(e) => setNewsForm((f) => ({ ...f, url: e.target.value }))}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="출처"
                      placeholder="예: TechCrunch"
                      value={newsForm.source}
                      onChange={(e) => setNewsForm((f) => ({ ...f, source: e.target.value }))}
                    />
                    <Input
                      label="날짜"
                      type="date"
                      value={newsForm.date}
                      onChange={(e) => setNewsForm((f) => ({ ...f, date: e.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={addNewsItem}>
                      <Plus className="w-4 h-4 mr-1" /> 추가
                    </Button>
                  </div>
                </div>

                {renderNavButtons()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Metrics */}
        {step === 5 && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground">Metrics</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <div className="bg-background border border-border rounded-lg p-6 text-center">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium text-secondary-foreground mb-1">Stripe / GA4 연동</p>
                  <p className="text-xs text-muted-foreground">
                    매출, 트래픽 등 핵심 지표를 자동으로 가져오는 기능이 곧 제공됩니다.
                  </p>
                </div>

                {renderNavButtons()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 6: Questions */}
        {step === 6 && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground">투자자 질문</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  투자자가 자주 묻는 질문을 선택하고 답변을 미리 작성하세요.
                </p>

                <div className="space-y-2">
                  {investorQuestionOptions.map((q) => {
                    const isSelected = selectedQuestions.includes(q);
                    return (
                      <div key={q}>
                        <button
                          type="button"
                          onClick={() => toggleQuestion(q)}
                          className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                            isSelected
                              ? 'border-ring bg-accent text-accent-foreground'
                              : 'border-border bg-card text-secondary-foreground hover:bg-accent'
                          }`}
                        >
                          {q}
                        </button>
                        {isSelected && (
                          <div className="mt-2 ml-4">
                            <textarea
                              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
                              placeholder="답변을 작성하세요..."
                              value={questionAnswers[q] || ''}
                              onChange={(e) =>
                                setQuestionAnswers((prev) => ({
                                  ...prev,
                                  [q]: e.target.value,
                                }))
                              }
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {renderNavButtons()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 7: Settings */}
        {step === 7 && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground">설정</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">구독 관리</h3>
                  <p className="text-xs text-muted-foreground">현재 플랜: Free</p>
                  <Button type="button" variant="outline" size="sm" disabled>
                    플랜 업그레이드 (준비 중)
                  </Button>
                </div>

                <div className="border border-border rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">계정 관리</h3>
                  <p className="text-xs text-muted-foreground">
                    회사 등록 후 대시보드에서 정보를 수정할 수 있습니다.
                  </p>
                </div>

                <div className="border border-destructive/30 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-destructive">회사 삭제</h3>
                  <p className="text-xs text-muted-foreground">
                    등록 후 회사 페이지에서 삭제할 수 있습니다.
                  </p>
                  <Button type="button" variant="danger" size="sm" disabled>
                    회사 삭제 (등록 후 가능)
                  </Button>
                </div>

                {submitError && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
                    {submitError}
                  </div>
                )}

                {renderNavButtons(true)}
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
