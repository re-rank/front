import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Trash2, Building2, Users, Video, BarChart3, MessageSquare,
  Check, ArrowLeft, ArrowRight, Upload, Globe, Github, Linkedin, Youtube, FileText,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { initiateStripeConnect, initiateGoogleOAuth } from '@/lib/integrations';
import { useAuthStore } from '@/stores/authStore';
import {
  Button,
  Input,
  Select,
  Card,
  CardContent,
  Textarea,
  ImageUpload,
  Label,
  Progress,
} from '@/components/ui';
import type { SelectOption } from '@/components/ui/Select';

// X Icon
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Stripe Icon
const StripeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
  </svg>
);

// Google Analytics Icon
const GA4Icon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.84 2.998v17.958c0 1.2-.6 2.1-1.5 2.7-.9.6-2.1.6-3 0l-6.6-3.9v-4.2l6.6 3.9v-12l-6.6 3.9v-4.2l6.6-3.9c.9-.6 2.1-.6 3 0 .9.6 1.5 1.5 1.5 2.7z" />
    <path d="M8.04 12.898v8.1c0 1.2-.6 2.1-1.5 2.7-.9.6-2.1.6-3 0-.9-.6-1.5-1.5-1.5-2.7v-8.1c0-1.2.6-2.1 1.5-2.7.9-.6 2.1-.6 3 0 .9.6 1.5 1.5 1.5 2.7z" />
    <circle cx="4.54" cy="4.998" r="3" />
  </svg>
);

// Integration status type
interface IntegrationStatus {
  stripe: 'disconnected' | 'connected' | 'loading';
  ga4: 'disconnected' | 'connected' | 'loading';
}

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
const STEPS = [
  { id: 1, title: 'Basic Info', icon: Building2 },
  { id: 2, title: 'Team', icon: Users },
  { id: 3, title: 'Video', icon: Video },
  { id: 4, title: 'Metrics', icon: BarChart3 },
  { id: 5, title: 'Q&A', icon: MessageSquare },
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
  logo_url: z.string().optional(),
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
  // Step 5: Questions
  selected_questions: z.array(z.string()).optional(),
  question_answers: z.record(z.string(), z.string()).optional(),
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

  // Step 1: Company Deck
  const [companyDeck, setCompanyDeck] = useState<{ name: string; url: string } | null>(null);
  const [deckUploading, setDeckUploading] = useState(false);

  // Step 5: Questions
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});

  // Step 4: Integrations
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    stripe: 'disconnected',
    ga4: 'disconnected',
  });

  // Check for existing integrations and restore step on mount
  useEffect(() => {
    // Restore step from localStorage (after OAuth redirect)
    const savedStep = localStorage.getItem('company_register_step');
    if (savedStep) {
      const stepNum = parseInt(savedStep, 10);
      if (stepNum >= 1 && stepNum <= STEPS.length) {
        setStep(stepNum);
      }
      localStorage.removeItem('company_register_step');
    }

    // Check localStorage for pending integrations (connected via OAuth)
    const pendingIntegrations = localStorage.getItem('pending_integrations');
    if (pendingIntegrations) {
      try {
        const integrations = JSON.parse(pendingIntegrations);
        setIntegrationStatus((prev) => ({
          stripe: integrations.stripe?.status === 'connected' ? 'connected' : prev.stripe,
          ga4: integrations.ga4?.status === 'connected' ? 'connected' : prev.ga4,
        }));
      } catch (e) {
        console.error('Failed to parse integrations:', e);
      }
    }
  }, []);

  // Handle Stripe Connect
  const handleStripeConnect = () => {
    // Save current step before OAuth redirect
    localStorage.setItem('company_register_step', String(step));
    setIntegrationStatus((prev) => ({ ...prev, stripe: 'loading' }));
    initiateStripeConnect();
  };

  // Handle GA4 Connect
  const handleGA4Connect = () => {
    // Save current step before OAuth redirect
    localStorage.setItem('company_register_step', String(step));
    setIntegrationStatus((prev) => ({ ...prev, ga4: 'loading' }));
    initiateGoogleOAuth();
  };

  // Disconnect integration
  const handleDisconnect = (provider: 'stripe' | 'ga4') => {
    const pendingIntegrations = localStorage.getItem('pending_integrations');
    if (pendingIntegrations) {
      const integrations = JSON.parse(pendingIntegrations);
      delete integrations[provider];
      localStorage.setItem('pending_integrations', JSON.stringify(integrations));
    }
    setIntegrationStatus((prev) => ({ ...prev, [provider]: 'disconnected' }));
  };

  const {
    register,
    control,
    handleSubmit,
    trigger,
    watch,
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
      selected_questions: [],
      question_answers: {},
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'executives',
  });

  const watchDescription = watch('description');
  const watchShortDesc = watch('short_description');
  const watchIntroVideo = watch('intro_video_url');

  // --- Step validation ---
  const step1Fields = [
    'logo_url', 'name', 'short_description', 'founded_at', 'location',
    'employee_count', 'description', 'category', 'stage',
  ] as const;

  const handleNext = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (step === 1) {
      const valid = await trigger(step1Fields as unknown as (keyof CompanyRegisterForm)[]);
      if (!valid) return;
    }
    if (step === 2) {
      const valid = await trigger('executives');
      if (!valid) return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const handlePrev = () => setStep((s) => Math.max(s - 1, 1));

  // --- Deck upload handler ---
  const handleDeckUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PDF, PPT, or PPTX file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB.');
      return;
    }

    setDeckUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `decks/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      setCompanyDeck({ name: file.name, url: publicUrl });
    } catch (error) {
      console.error('Deck upload failed:', error);
      alert('Failed to upload deck. Please try again.');
    } finally {
      setDeckUploading(false);
    }
  };

  // --- Questions helpers ---
  const toggleQuestion = (q: string) => {
    setSelectedQuestions((prev) =>
      prev.includes(q) ? prev.filter((x) => x !== q) : prev.length < 5 ? [...prev, q] : prev
    );
  };

  // --- Submit ---
  const onSubmit = async (data: CompanyRegisterForm) => {
    console.log('onSubmit called', data);
    if (!user) {
      console.log('No user found');
      return;
    }
    setSubmitError(null);

    try {
      console.log('Inserting company...');
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
          deck_url: companyDeck?.url || null,
          stripe_connected: integrationStatus.stripe === 'connected',
          ga4_connected: integrationStatus.ga4 === 'connected',
        })
        .select('id')
        .single();

      console.log('Company insert result:', { company, companyError });
      if (companyError || !company) {
        console.error('Company insert failed:', companyError);
        setSubmitError(companyError?.message || 'Failed to register company.');
        return;
      }

      console.log('Inserting executives...');
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
      console.log('Executives insert result:', { execError });

      if (execError) {
        console.error('Executives insert failed:', execError);
        setSubmitError('Failed to register executives.');
        return;
      }

      // Clear pending integrations from localStorage
      localStorage.removeItem('pending_integrations');
      console.log('Success! Navigating to dashboard...');
      navigate('/dashboard');
    } catch (error) {
      console.error('Unexpected error during submission:', error);
      setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred.');
    }
  };

  const progress = (step / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-serif">Company Registration</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <Button variant="ghost" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Step {step} of {STEPS.length}
            </span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isCompleted = step > s.id;
            const isCurrent = step === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => { if (s.id <= step) setStep(s.id); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isCurrent
                    ? 'bg-primary text-primary-foreground'
                    : isCompleted
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                <span className="text-sm font-medium hidden sm:inline">{s.title}</span>
              </button>
            );
          })}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit, (errors) => console.log('Validation errors:', errors))}>
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <Card className="mb-8">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-serif mb-2">Basic Information</h2>
                  <p className="text-muted-foreground">Tell us about your company</p>
                </div>

                {/* Logo */}
                <div className="space-y-2">
                  <Label>Company Logo</Label>
                  <Controller
                    control={control}
                    name="logo_url"
                    render={({ field }) => (
                      <ImageUpload
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
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Company Name */}
                  <div className="space-y-2 sm:col-span-2">
                    <Label required>Company Name</Label>
                    <Input
                      placeholder="Enter company name"
                      error={errors.name?.message}
                      className="bg-secondary border-border"
                      {...register('name')}
                    />
                  </div>

                  {/* Tagline */}
                  <div className="space-y-2 sm:col-span-2">
                    <Label required>Tagline (10-100 characters)</Label>
                    <Input
                      placeholder="Brief description of what you do"
                      maxLength={100}
                      error={errors.short_description?.message}
                      className="bg-secondary border-border"
                      {...register('short_description')}
                    />
                    <p className={`text-xs ${(watchShortDesc?.length || 0) < 10 ? 'text-red-400' : 'text-muted-foreground'}`}>
                      {watchShortDesc?.length || 0}/100 characters {(watchShortDesc?.length || 0) < 10 && '(minimum 10)'}
                    </p>
                  </div>

                  {/* Founded Date */}
                  <div className="space-y-2">
                    <Label required>Founded Date</Label>
                    <Input
                      type="month"
                      error={errors.founded_at?.message}
                      className="bg-secondary border-border"
                      {...register('founded_at')}
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label required>Location</Label>
                    <Input
                      placeholder="e.g. San Francisco, CA"
                      error={errors.location?.message}
                      className="bg-secondary border-border"
                      {...register('location')}
                    />
                  </div>

                  {/* Employee Count */}
                  <div className="space-y-2">
                    <Label required>Employee Count</Label>
                    <Select
                      options={employeeCountOptions}
                      placeholder="Select range"
                      error={errors.employee_count?.message}
                      className="bg-secondary border-border"
                      {...register('employee_count')}
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label required>Category</Label>
                    <Select
                      options={categoryOptions}
                      placeholder="Select category"
                      error={errors.category?.message}
                      className="bg-secondary border-border"
                      {...register('category')}
                    />
                  </div>

                  {/* Stage */}
                  <div className="space-y-2 sm:col-span-2">
                    <Label required>Company Stage</Label>
                    <Select
                      options={stageOptions}
                      placeholder="Select stage"
                      error={errors.stage?.message}
                      className="bg-secondary border-border"
                      {...register('stage')}
                    />
                  </div>
                </div>

                {/* IR Deck */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4" /> IR Deck
                    <span className="text-xs text-muted-foreground">(Optional)</span>
                  </Label>
                  <label className="block">
                    <div
                      className={`border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${
                        companyDeck ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'
                      }`}
                    >
                      {deckUploading ? (
                        <div className="text-center py-2">
                          <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Uploading...</p>
                        </div>
                      ) : companyDeck ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="w-10 h-10 text-primary flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{companyDeck.name}</p>
                              <p className="text-xs text-muted-foreground">Click to replace</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setCompanyDeck(null);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm font-medium text-foreground">Upload your pitch deck</p>
                          <p className="text-xs text-muted-foreground mt-1">PDF, PPT, PPTX (Max 10MB)</p>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.ppt,.pptx"
                      className="hidden"
                      onChange={handleDeckUpload}
                      disabled={deckUploading}
                    />
                  </label>
                </div>

                {/* Company Links */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <div>
                    <h3 className="text-lg font-medium mb-1">Company Links</h3>
                    <p className="text-sm text-muted-foreground">Recommended - Add your online presence</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Globe className="w-4 h-4" /> Website</Label>
                      <Input placeholder="https://yourcompany.com" className="bg-secondary border-border" {...register('website_url')} />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Github className="w-4 h-4" /> GitHub</Label>
                      <Input placeholder="https://github.com/yourcompany" className="bg-secondary border-border" {...register('github_url')} />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Linkedin className="w-4 h-4" /> LinkedIn</Label>
                      <Input placeholder="https://linkedin.com/company/..." className="bg-secondary border-border" {...register('linkedin_url')} />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><XIcon className="w-4 h-4" /> X</Label>
                      <Input placeholder="https://x.com/company" className="bg-secondary border-border" {...register('twitter_url')} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="flex items-center gap-2"><Youtube className="w-4 h-4" /> YouTube</Label>
                      <Input placeholder="https://youtube.com/@yourcompany" className="bg-secondary border-border" {...register('youtube_url')} />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2 pt-4 border-t border-border">
                  <Label required>Company Description (100-10,000 characters)</Label>
                  <Controller
                    control={control}
                    name="description"
                    render={({ field }) => (
                      <Textarea
                        placeholder="Describe your company, product, vision, market opportunity..."
                        showCount
                        maxLength={10000}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        error={errors.description?.message}
                        className="bg-secondary border-border min-h-[200px]"
                      />
                    )}
                  />
                  <p className={`text-xs ${(watchDescription?.length || 0) < 100 ? 'text-red-400' : 'text-muted-foreground'}`}>
                    {(watchDescription?.length || 0).toLocaleString()}/10,000 characters {(watchDescription?.length || 0) < 100 && `(minimum 100 - need ${100 - (watchDescription?.length || 0)} more)`}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Team */}
          {step === 2 && (
            <Card className="mb-8">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-serif mb-2">Leadership Team</h2>
                  <p className="text-muted-foreground">Add your C-Level executives. CEO is required.</p>
                </div>

                {fields.map((field, index) => {
                  const isCEO = index === 0;
                  return (
                    <Card key={field.id} className="bg-secondary/50">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium flex items-center gap-2">
                            {isCEO ? 'CEO' : field.role}
                            {isCEO && <span className="text-red-400 text-sm">*</span>}
                          </h3>
                          {!isCEO && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        <div className="flex items-start gap-4">
                          <Controller
                            control={control}
                            name={`executives.${index}.photo_url`}
                            render={({ field: f }) => (
                              <div className="w-20 h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden flex-shrink-0 bg-background">
                                {f.value ? (
                                  <img src={f.value} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="text-center">
                                    <Upload className="w-5 h-5 mx-auto text-muted-foreground" />
                                    <span className="text-[10px] text-muted-foreground">Photo</span>
                                  </div>
                                )}
                              </div>
                            )}
                          />
                          <div className="flex-1 grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label required={isCEO}>Full Name</Label>
                              <Input
                                placeholder="Enter full name"
                                error={errors.executives?.[index]?.name?.message}
                                className="bg-background border-border"
                                {...register(`executives.${index}.name`)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label required>Role</Label>
                              <Select
                                options={isCEO ? [{ value: 'CEO', label: 'CEO' }] : executiveRoleOptions}
                                placeholder="Select"
                                disabled={isCEO}
                                error={errors.executives?.[index]?.role?.message}
                                className="bg-background border-border"
                                {...register(`executives.${index}.role`)}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Bio</Label>
                          <Textarea
                            placeholder="Brief introduction..."
                            className="bg-background border-border min-h-[80px]"
                            {...register(`executives.${index}.bio`)}
                          />
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Education</Label>
                            <Input
                              placeholder="e.g. Stanford University, CS"
                              className="bg-background border-border"
                              {...register(`executives.${index}.education`)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2"><Linkedin className="w-3 h-3" /> LinkedIn</Label>
                            <Input
                              placeholder="LinkedIn profile URL"
                              className="bg-background border-border"
                              {...register(`executives.${index}.linkedin_url`)}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {fields.length < 5 && (
                  <div className="space-y-2">
                    <Label>Add C-Level Executive (Optional)</Label>
                    <div className="flex flex-wrap gap-2">
                      {executiveRoleOptions
                        .filter((opt) => !fields.find((f) => f.role === opt.value))
                        .map((opt) => (
                          <Button key={opt.value} type="button" variant="outline" size="sm" onClick={() => append(defaultExecutive(opt.value))} className="gap-1">
                            <Plus className="w-3 h-3" /> {opt.label}
                          </Button>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Video */}
          {step === 3 && (
            <Card className="mb-8">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-serif mb-2">Company Introduction Video</h2>
                  <p className="text-muted-foreground">Upload a video introducing your company to potential investors.</p>
                </div>

                <Card className="bg-secondary/50">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Video className="w-5 h-5" />
                      <h3 className="font-medium">5-Minute Intro Video</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Share your story, product demo, and vision.</p>

                    <div className="space-y-2">
                      <Label>Video URL (YouTube, Vimeo, or Loom)</Label>
                      <Input
                        placeholder="https://youtube.com/watch?v=..."
                        className="bg-background border-border"
                        {...register('intro_video_url')}
                      />
                    </div>

                    {watchIntroVideo && (
                      <div className="aspect-video rounded-lg overflow-hidden bg-background">
                        <iframe
                          src={
                            watchIntroVideo.includes('youtube.com')
                              ? watchIntroVideo.replace('watch?v=', 'embed/')
                              : watchIntroVideo.includes('vimeo.com')
                                ? watchIntroVideo.replace('vimeo.com', 'player.vimeo.com/video')
                                : watchIntroVideo
                          }
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}

                    <div className="p-4 rounded-lg bg-background border border-border">
                      <h4 className="font-medium mb-2">Tips for a great intro video:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                        <li>Keep it under 5 minutes</li>
                        <li>Introduce yourself and your team</li>
                        <li>Explain the problem you're solving</li>
                        <li>Demo your product if possible</li>
                        <li>Share your traction and metrics</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Metrics */}
          {step === 4 && (
            <Card className="mb-8">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-serif mb-2">Business Metrics</h2>
                  <p className="text-muted-foreground">Connect your accounts to automatically sync your metrics and showcase your traction to investors.</p>
                </div>

                {/* Stripe Connect Section */}
                <Card className="bg-secondary/50">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#635BFF]/10 flex items-center justify-center">
                          <StripeIcon className="w-5 h-5 text-[#635BFF]" />
                        </div>
                        <div>
                          <h3 className="font-medium">Stripe Connect</h3>
                          <p className="text-sm text-muted-foreground">Revenue & payment metrics</p>
                        </div>
                      </div>
                      {integrationStatus.stripe === 'connected' ? (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 text-sm text-green-500">
                            <Check className="w-4 h-4" />
                            Connected
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDisconnect('stripe')}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            Disconnect
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleStripeConnect}
                          disabled={integrationStatus.stripe === 'loading'}
                          className="gap-2"
                        >
                          {integrationStatus.stripe === 'loading' ? (
                            <>
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <StripeIcon className="w-4 h-4" />
                              Connect Stripe
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {integrationStatus.stripe === 'connected' && (
                      <div className="grid sm:grid-cols-3 gap-3 pt-2">
                        <div className="p-3 rounded-lg bg-background border border-border text-center">
                          <p className="text-xs text-muted-foreground mb-1">Monthly MRR</p>
                          <p className="font-semibold text-lg">Syncing...</p>
                        </div>
                        <div className="p-3 rounded-lg bg-background border border-border text-center">
                          <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
                          <p className="font-semibold text-lg">Syncing...</p>
                        </div>
                        <div className="p-3 rounded-lg bg-background border border-border text-center">
                          <p className="text-xs text-muted-foreground mb-1">Active Subs</p>
                          <p className="font-semibold text-lg">Syncing...</p>
                        </div>
                      </div>
                    )}

                    {integrationStatus.stripe === 'disconnected' && (
                      <div className="p-4 rounded-lg bg-muted/50 border border-border">
                        <h4 className="text-sm font-medium mb-2">What you'll get:</h4>
                        <ul className="text-sm text-muted-foreground space-y-1.5">
                          <li className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-primary" />
                            Automatic MRR & ARR tracking
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-primary" />
                            Revenue growth charts
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-primary" />
                            Customer & subscription counts
                          </li>
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Google Analytics Section */}
                <Card className="bg-secondary/50">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#F9AB00]/10 flex items-center justify-center">
                          <GA4Icon className="w-5 h-5 text-[#F9AB00]" />
                        </div>
                        <div>
                          <h3 className="font-medium">Google Analytics 4</h3>
                          <p className="text-sm text-muted-foreground">Traffic & user engagement</p>
                        </div>
                      </div>
                      {integrationStatus.ga4 === 'connected' ? (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 text-sm text-green-500">
                            <Check className="w-4 h-4" />
                            Connected
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDisconnect('ga4')}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            Disconnect
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleGA4Connect}
                          disabled={integrationStatus.ga4 === 'loading'}
                          className="gap-2"
                        >
                          {integrationStatus.ga4 === 'loading' ? (
                            <>
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <GA4Icon className="w-4 h-4" />
                              Connect GA4
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {integrationStatus.ga4 === 'connected' && (
                      <div className="grid sm:grid-cols-3 gap-3 pt-2">
                        <div className="p-3 rounded-lg bg-background border border-border text-center">
                          <p className="text-xs text-muted-foreground mb-1">Monthly Users</p>
                          <p className="font-semibold text-lg">Syncing...</p>
                        </div>
                        <div className="p-3 rounded-lg bg-background border border-border text-center">
                          <p className="text-xs text-muted-foreground mb-1">Page Views</p>
                          <p className="font-semibold text-lg">Syncing...</p>
                        </div>
                        <div className="p-3 rounded-lg bg-background border border-border text-center">
                          <p className="text-xs text-muted-foreground mb-1">Avg. Session</p>
                          <p className="font-semibold text-lg">Syncing...</p>
                        </div>
                      </div>
                    )}

                    {integrationStatus.ga4 === 'disconnected' && (
                      <div className="p-4 rounded-lg bg-muted/50 border border-border">
                        <h4 className="text-sm font-medium mb-2">What you'll get:</h4>
                        <ul className="text-sm text-muted-foreground space-y-1.5">
                          <li className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-primary" />
                            Monthly active users tracking
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-primary" />
                            Traffic & engagement metrics
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-primary" />
                            User retention analytics
                          </li>
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Summary Card */}
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-start gap-3">
                    <BarChart3 className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm mb-1">Why connect your metrics?</h4>
                      <p className="text-sm text-muted-foreground">
                        Verified metrics from Stripe and GA4 build trust with investors. Companies with connected metrics receive 3x more investor interest on average.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Q&A */}
          {step === 5 && (
            <Card className="mb-8">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-serif mb-2">Investor Q&A</h2>
                  <p className="text-muted-foreground">Select up to 5 questions and provide thoughtful answers.</p>
                  <p className="text-sm text-muted-foreground mt-1">Selected: {selectedQuestions.length}/5</p>
                </div>

                <div className="space-y-4">
                  {investorQuestionOptions.map((q) => {
                    const isSelected = selectedQuestions.includes(q);
                    return (
                      <Card key={q} className={`transition-colors ${isSelected ? 'bg-primary/10 border-primary/50' : 'bg-secondary/50'}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleQuestion(q)}
                              disabled={!isSelected && selectedQuestions.length >= 5}
                              className="mt-1 h-4 w-4 rounded border-border"
                            />
                            <div className="flex-1 space-y-3">
                              <p className="font-medium leading-relaxed">{q}</p>
                              {isSelected && (
                                <Textarea
                                  placeholder="Write your answer here..."
                                  value={questionAnswers[q] || ''}
                                  onChange={(e) => setQuestionAnswers((prev) => ({ ...prev, [q]: e.target.value }))}
                                  className="bg-background border-border min-h-[120px]"
                                />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {submitError && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
                    {submitError}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" onClick={step === 1 ? () => navigate(-1) : handlePrev} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              {step === 1 ? 'Cancel' : 'Back'}
            </Button>

            {step < STEPS.length ? (
              <Button type="button" onClick={handleNext} className="gap-2">
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button type="submit" isLoading={isSubmitting} className="gap-2">
                Submit for Review
                <Check className="w-4 h-4" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
