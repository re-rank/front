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
  { value: '1~10', label: '1-10' },
  { value: '10~100', label: '10-100' },
  { value: '100~1000', label: '100-1,000' },
  { value: '1000~10000', label: '1,000-10,000' },
  { value: '10000+', label: '10,000+' },
];

const categoryOptions: SelectOption[] = [
  { value: 'AI/ML', label: 'AI/ML' },
  { value: 'Fintech', label: 'Fintech' },
  { value: 'Edtech', label: 'Edtech' },
  { value: 'CleanTech', label: 'CleanTech' },
  { value: 'HealthTech', label: 'HealthTech' },
  { value: 'E-commerce', label: 'E-commerce' },
  { value: 'SaaS', label: 'SaaS' },
  { value: 'Other', label: 'Other' },
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
  'What is your current revenue scale?',
  'What differentiates you from competitors?',
  'What is your funding plan for the next 12 months?',
  'What are the barriers to entry for your core technology?',
  'Do you have key customers or partners?',
  'What are your team\'s core competencies?',
  'What is your biggest challenge right now?',
  'Do you have an exit strategy?',
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
  name: z.string().min(1, 'Please enter a name'),
  role: z.enum(['CEO', 'CTO', 'COO', 'CFO', 'CPO'], { message: 'Please select a role' }),
  photo_url: z.string().nullable().optional(),
  bio: z.string().optional(),
  linkedin_url: z.string().url('Please enter a valid URL').or(z.literal('')).optional(),
  twitter_url: z.string().url('Please enter a valid URL').or(z.literal('')).optional(),
  education: z.string().optional(),
});

const companyRegisterSchema = z.object({
  // Step 1: Profile
  logo_url: z.string().min(1, 'Please upload a company logo'),
  name: z.string().min(1, 'Please enter a company name'),
  short_description: z
    .string()
    .min(10, 'Minimum 10 characters required')
    .max(100, 'Maximum 100 characters allowed'),
  founded_at: z.string().min(1, 'Please enter the founding date'),
  location: z.string().min(1, 'Please enter the location'),
  employee_count: z.enum(['1~10', '10~100', '100~1000', '1000~10000', '10000+'], {
    message: 'Please select employee count',
  }),
  description: z
    .string()
    .min(100, 'Minimum 100 characters required')
    .max(10000, 'Maximum 10,000 characters allowed'),
  category: z.enum(['AI/ML', 'Fintech', 'Edtech', 'CleanTech', 'HealthTech', 'E-commerce', 'SaaS', 'Other'], {
    message: 'Please select a category',
  }),
  stage: z.enum(['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+'], {
    message: 'Please select a stage',
  }),
  website_url: z.string().url('Please enter a valid URL').or(z.literal('')).optional(),
  github_url: z.string().url('Please enter a valid URL').or(z.literal('')).optional(),
  linkedin_url: z.string().url('Please enter a valid URL').or(z.literal('')).optional(),
  twitter_url: z.string().url('Please enter a valid URL').or(z.literal('')).optional(),
  youtube_url: z.string().url('Please enter a valid URL').or(z.literal('')).optional(),
  // Step 2: Team
  executives: z.array(executiveSchema).min(1, 'At least one executive is required'),
  // Step 3: Media
  intro_video_url: z.string().url('Please enter a valid URL').or(z.literal('')).optional(),
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
      setSubmitError(companyError?.message || 'Failed to register company.');
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
      setSubmitError('Failed to register executives. Please add them again from the company page.');
      return;
    }

    navigate('/dashboard');
  };

  // --- Step Indicator ---
  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {steps.map(({ num, icon: Icon, label }, idx) => (
        <div key={num} className="flex items-center flex-1 last:flex-none">
          <button
            type="button"
            onClick={() => {
              if (num <= step) setStep(num);
            }}
            className="flex flex-col items-center gap-1 cursor-pointer"
          >
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                step > num
                  ? 'bg-primary text-primary-foreground'
                  : step === num
                    ? 'bg-primary text-primary-foreground ring-2 ring-ring'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {step > num ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
            </div>
            <span
              className={`text-[10px] font-medium whitespace-nowrap ${
                step >= num ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {label}
            </span>
          </button>
          {idx < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-1 ${
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
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </Button>
      ) : (
        <div />
      )}
      {showSubmit ? (
        <Button type="submit" isLoading={isSubmitting}>
          Register Company
        </Button>
      ) : step < 7 ? (
        <Button type="button" onClick={handleNext}>
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      ) : (
        <Button type="submit" isLoading={isSubmitting}>
          Register Company
        </Button>
      )}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-foreground mb-2">Register Company</h1>
      <p className="text-muted-foreground mb-6">Enter your company info to showcase to investors.</p>

      {renderStepIndicator()}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Profile */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground">Company Info</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <Controller
                  control={control}
                  name="logo_url"
                  render={({ field }) => (
                    <ImageUpload
                      label="Company Logo"
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
                  label="Company Name"
                  required
                  placeholder="e.g. NextChallenger"
                  error={errors.name?.message}
                  {...register('name')}
                />

                <Input
                  label="Short Description"
                  required
                  placeholder="Describe your company in one sentence (10-100 chars)"
                  error={errors.short_description?.message}
                  {...register('short_description')}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Founded"
                    type="date"
                    required
                    error={errors.founded_at?.message}
                    {...register('founded_at')}
                  />
                  <Input
                    label="Location"
                    required
                    placeholder="e.g. San Francisco, CA"
                    error={errors.location?.message}
                    {...register('location')}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Select
                    label="Employees"
                    required
                    options={employeeCountOptions}
                    placeholder="Select"
                    error={errors.employee_count?.message}
                    {...register('employee_count')}
                  />
                  <Select
                    label="Category"
                    required
                    options={categoryOptions}
                    placeholder="Select"
                    error={errors.category?.message}
                    {...register('category')}
                  />
                  <Select
                    label="Stage"
                    required
                    options={stageOptions}
                    placeholder="Select"
                    error={errors.stage?.message}
                    {...register('stage')}
                  />
                </div>

                <Controller
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <Textarea
                      label="About"
                      required
                      placeholder="Tell us about your company in detail (100-10,000 chars)"
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
                  <p className="text-sm font-medium text-secondary-foreground mb-3">Company Links (Optional)</p>
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
                <h2 className="text-lg font-semibold text-foreground">Executives (C-level)</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append(defaultExecutive('CTO'))}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
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
                          Executive #{index + 1}
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
                          label="Name"
                          required
                          placeholder="John Doe"
                          error={errors.executives?.[index]?.name?.message}
                          {...register(`executives.${index}.name`)}
                        />
                        <Select
                          label="Role"
                          required
                          options={isCEO ? [{ value: 'CEO', label: 'CEO' }] : executiveRoleOptions}
                          placeholder="Select"
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
                            label="Profile Photo"
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
                        label="Bio"
                        placeholder="Brief career introduction"
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
                        label="Education"
                        placeholder="e.g. Stanford University, Computer Science"
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
              <h2 className="text-lg font-semibold text-foreground">Media</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <Input
                  label="Introduction Video URL"
                  placeholder="https://youtube.com/watch?v=..."
                  error={errors.intro_video_url?.message}
                  {...register('intro_video_url')}
                />

                <div>
                  <p className="text-sm font-medium text-secondary-foreground mb-3">Additional Videos</p>
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
                        placeholder="Enter video URL"
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
              <h2 className="text-lg font-semibold text-foreground">News</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  Add news articles about your company.
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
                  <p className="text-sm font-medium text-secondary-foreground">Add New Article</p>
                  <Input
                    label="Title"
                    required
                    placeholder="Article title"
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
                      label="Source"
                      placeholder="e.g. TechCrunch"
                      value={newsForm.source}
                      onChange={(e) => setNewsForm((f) => ({ ...f, source: e.target.value }))}
                    />
                    <Input
                      label="Date"
                      type="date"
                      value={newsForm.date}
                      onChange={(e) => setNewsForm((f) => ({ ...f, date: e.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={addNewsItem}>
                      <Plus className="w-4 h-4 mr-1" /> Add
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
                  <p className="text-sm font-medium text-secondary-foreground mb-1">Stripe / GA4 Integration</p>
                  <p className="text-xs text-muted-foreground">
                    Automatic sync of revenue, traffic, and key metrics coming soon.
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
              <h2 className="text-lg font-semibold text-foreground">Investor Questions</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  Select frequently asked investor questions and prepare your answers.
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
                              placeholder="Write your answer..."
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
              <h2 className="text-lg font-semibold text-foreground">Settings</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Subscription</h3>
                  <p className="text-xs text-muted-foreground">Current plan: Free</p>
                  <Button type="button" variant="outline" size="sm" disabled>
                    Upgrade Plan (Coming Soon)
                  </Button>
                </div>

                <div className="border border-border rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Account</h3>
                  <p className="text-xs text-muted-foreground">
                    You can edit your info from the dashboard after registration.
                  </p>
                </div>

                <div className="border border-destructive/30 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-destructive">Delete Company</h3>
                  <p className="text-xs text-muted-foreground">
                    You can delete your company from the company page after registration.
                  </p>
                  <Button type="button" variant="danger" size="sm" disabled>
                    Delete Company (Available after registration)
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
