import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Plus, Trash2, Upload, Globe, Github, Linkedin, Youtube, FileText,
  Check, ArrowLeft, Video, MessageSquare,
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
} from '@/components/ui';
import {
  companyRegisterSchema,
  employeeCountOptions,
  categoryOptions,
  stageOptions,
  executiveRoleOptions,
  defaultExecutive,
} from './companySchema';
import type { CompanyRegisterForm } from './companySchema';
import type { Company, Executive, CompanyVideo, CompanyNews, CompanyQnA, CompanyMetric, QnACategory } from '@/types/database';

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

const investorQuestionOptions = [
  'What is your current revenue scale?',
  'What differentiates you from competitors?',
  'What is your funding plan for the next 12 months?',
  'What are the barriers to entry for your core technology?',
  'Do you have key customers or partners?',
  "What are your team's core competencies?",
  'What is your biggest challenge right now?',
  'Do you have an exit strategy?',
];

const questionCategoryMap: Record<string, string> = {
  'What is your current revenue scale?': 'Competitive Advantage',
  'What differentiates you from competitors?': 'Competitive Landscape',
  'What is your funding plan for the next 12 months?': 'Basis of Conviction',
  'What are the barriers to entry for your core technology?': 'Competitive Advantage',
  'Do you have key customers or partners?': 'Competitive Advantage',
  "What are your team's core competencies?": 'Team Cohesion',
  'What is your biggest challenge right now?': 'Capability Gap',
  'Do you have an exit strategy?': 'Acquisition Offer',
};

export function CompanyEdit() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // Deck state
  const [companyDeck, setCompanyDeck] = useState<{ name: string; url: string } | null>(null);
  const [deckUploading, setDeckUploading] = useState(false);

  // News state
  const [newsItems, setNewsItems] = useState<CompanyNews[]>([]);
  const [deletingNewsId, setDeletingNewsId] = useState<string | null>(null);

  // Q&A state
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});

  // Metrics state
  const [metrics, setMetrics] = useState<CompanyMetric[]>([]);

  // Integration disconnect state
  const [disconnectLoading, setDisconnectLoading] = useState<'stripe' | 'ga4' | null>(null);

  // 타임아웃 래퍼 (Supabase 콜드 스타트 대비 30초)
  const withTimeout = <T,>(promise: PromiseLike<T> | Promise<T>, ms = 30000): Promise<T> =>
    Promise.race([
      Promise.resolve(promise),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timed out. Please try again.')), ms)),
    ]);

  const {
    register,
    control,
    watch,
    getValues,
    reset,
    formState: { errors },
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
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'executives',
  });

  const watchDescription = watch('description');
  const watchShortDesc = watch('short_description');
  const watchIntroVideo = watch('intro_video_url');

  const toggleQuestion = (q: string) => {
    setSelectedQuestions((prev) =>
      prev.includes(q) ? prev.filter((x) => x !== q) : prev.length < 5 ? [...prev, q] : prev
    );
  };

  // Fetch existing company data
  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // Fetch company
        const { data: rows } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (cancelled) return;
        const companyData = rows?.[0] ?? null;

        if (!companyData) {
          navigate('/company/register', { replace: true });
          return;
        }

        // Check for pending OAuth integrations from localStorage
        const pendingRaw = localStorage.getItem('pending_integrations');
        if (pendingRaw) {
          try {
            const pending = JSON.parse(pendingRaw);
            const updates: Record<string, boolean> = {};
            if (pending.stripe?.status === 'connected' && !companyData.stripe_connected) {
              updates.stripe_connected = true;
            }
            if (pending.ga4?.status === 'connected' && !companyData.ga4_connected) {
              updates.ga4_connected = true;
            }
            if (Object.keys(updates).length > 0) {
              const { error: integrationError } = await supabase
                .from('companies')
                .update(updates)
                .eq('id', companyData.id);
              if (integrationError) {
                console.error('Failed to update integration status:', integrationError);
              } else {
                Object.assign(companyData, updates);
              }
            }
            localStorage.removeItem('pending_integrations');
          } catch (e) {
            console.error('Failed to process pending integrations:', e);
          }
        }

        setCompany(companyData);

        // Fetch related data in parallel
        const [execRes, videoRes, newsRes, qnaRes, metricsRes] = await Promise.all([
          supabase.from('executives').select('*').eq('company_id', companyData.id).order('created_at')
            .then(r => r, () => ({ data: null, error: true })),
          supabase.from('company_videos').select('*').eq('company_id', companyData.id).eq('is_main', true).limit(1).then(r => r, () => ({ data: null, error: true })),
          supabase.from('company_news').select('*').eq('company_id', companyData.id).order('published_at', { ascending: false }).then(r => r, () => ({ data: null, error: true })),
          supabase.from('company_qna').select('*').eq('company_id', companyData.id).order('created_at').then(r => r, () => ({ data: null, error: true })),
          supabase.from('company_metrics').select('*').eq('company_id', companyData.id).order('month', { ascending: false }).limit(6)
            .then(r => r, () => ({ data: null, error: true })),
        ]);

        if (cancelled) return;

        const executives: Executive[] = execRes.data ?? [];
        const mainVideo: CompanyVideo | null = videoRes.data?.[0] ?? null;
        if (!cancelled) setNewsItems((newsRes.data as CompanyNews[] | null) ?? []);
        if (!cancelled) setMetrics((metricsRes.data as CompanyMetric[] | null) ?? []);

        // Restore Q&A state
        const qnaItems = (qnaRes.data as CompanyQnA[] | null) ?? [];
        if (!cancelled && qnaItems.length > 0) {
          setSelectedQuestions(qnaItems.map((q) => q.question));
          const answers: Record<string, string> = {};
          for (const q of qnaItems) {
            answers[q.question] = q.answer;
          }
          setQuestionAnswers(answers);
        }

        // Set deck
        if (companyData.deck_url) {
          setCompanyDeck({ name: 'Current Deck', url: companyData.deck_url });
        }

        // Reset form with existing data
        reset({
          logo_url: companyData.logo_url || '',
          name: companyData.name,
          short_description: companyData.short_description,
          founded_at: companyData.founded_at,
          location: companyData.location,
          employee_count: companyData.employee_count,
          description: companyData.description,
          category: companyData.category,
          stage: companyData.stage,
          website_url: companyData.website_url || '',
          github_url: companyData.github_url || '',
          linkedin_url: companyData.linkedin_url || '',
          twitter_url: companyData.twitter_url || '',
          youtube_url: companyData.youtube_url || '',
          executives: executives.length > 0
            ? executives.map((e) => ({
                name: e.name,
                role: e.role as CompanyRegisterForm['executives'][number]['role'],
                photo_url: e.photo_url || null,
                bio: e.bio || '',
                linkedin_url: e.linkedin_url || '',
                twitter_url: e.twitter_url || '',
                education: e.education || '',
              }))
            : [defaultExecutive('CEO')],
          intro_video_url: mainVideo?.video_url || '',
        });
      } catch (err) {
        console.error('CompanyEdit fetch error:', err);
        setSubmitError('Failed to load company data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id, authLoading, navigate, reset]);

  // Deck upload handler
  const handleDeckUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      setSubmitError('Please log in again to upload files.');
      return;
    }

    const allowedTypes = ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
    if (!allowedTypes.includes(file.type)) {
      setSubmitError('Please upload a PDF, PPT, or PPTX file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setSubmitError('File size must be less than 10MB.');
      return;
    }

    setDeckUploading(true);
    setSubmitError(null);

    try {
      let { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { data: refreshData } = await supabase.auth.refreshSession();
        session = refreshData.session;
      }
      if (!session) {
        setSubmitError('Session expired. Please log in again.');
        setDeckUploading(false);
        return;
      }

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
      setSubmitError(error instanceof Error ? `Upload failed: ${error.message}` : 'Failed to upload deck. Please try again.');
    } finally {
      setDeckUploading(false);
    }
  };

  // Delete news item
  const handleDeleteNews = async (newsId: string) => {
    if (!company) return;
    setDeletingNewsId(newsId);
    try {
      await supabase.from('company_news').delete().eq('id', newsId);
      setNewsItems((prev) => prev.filter((n) => n.id !== newsId));
    } catch { /* table may not exist */ } finally {
      setDeletingNewsId(null);
    }
  };

  // Remove news thumbnail
  const handleRemoveNewsThumbnail = async (newsId: string) => {
    try {
      await supabase.from('company_news').update({ thumbnail_url: null }).eq('id', newsId);
      setNewsItems((prev) =>
        prev.map((n) => (n.id === newsId ? { ...n, thumbnail_url: null } : n))
      );
    } catch { /* table may not exist */ }
  };

  // Disconnect integration
  const handleDisconnectIntegration = async (provider: 'stripe' | 'ga4') => {
    if (!company) return;
    setDisconnectLoading(provider);
    const field = provider === 'stripe' ? 'stripe_connected' : 'ga4_connected';
    try {
      const { error } = await supabase
        .from('companies')
        .update({ [field]: false })
        .eq('id', company.id);
      if (!error) {
        setCompany({ ...company, [field]: false });
      }
    } catch (err) {
      console.error(`Failed to disconnect ${provider}:`, err);
    } finally {
      setDisconnectLoading(null);
    }
  };

  // Submit handler
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualSubmitting(true);
    setValidationErrors([]);
    setSubmitError(null);

    try {
      const values = getValues();
      const result = companyRegisterSchema.safeParse(values);

      if (!result.success) {
        const messages: string[] = [];
        const fieldLabels: Record<string, string> = {
          name: 'Company Name',
          short_description: 'Tagline',
          founded_at: 'Founded Date',
          location: 'Location',
          employee_count: 'Employee Count',
          description: 'Company Description',
          category: 'Category',
          stage: 'Company Stage',
          executives: 'Leadership Team',
          intro_video_url: 'Introduction Video',
        };
        for (const issue of result.error.issues) {
          const key = String(issue.path[0] || '');
          const label = fieldLabels[key] || key;
          messages.push(`${label}: ${issue.message}`);
        }
        setValidationErrors(messages);
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        return;
      }

      const data = result.data as CompanyRegisterForm;

      if (!user || !company) {
        setSubmitError('Please log in again to submit.');
        return;
      }

      // Ensure session is valid (server-side validation)
      const { data: { user: validatedUser }, error: userError } = await withTimeout(
        supabase.auth.getUser()
      );
      if (userError || !validatedUser) {
        const { data: refreshData } = await withTimeout(supabase.auth.refreshSession());
        if (!refreshData.session) {
          setSubmitError('Session expired. Please log in again.');
          return;
        }
      }

      // 1. Update company
      const { error: companyError } = await withTimeout(
        supabase
          .from('companies')
          .update({
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
          })
          .eq('id', company.id)
      );

      if (companyError) {
        setSubmitError(`Failed to update company: ${companyError.message}`);
        return;
      }

      // 2. Delete-then-insert executives
      const { error: deleteExecError } = await withTimeout(
        supabase.from('executives').delete().eq('company_id', company.id)
      );

      if (deleteExecError) {
        setSubmitError(`Failed to delete executives: ${deleteExecError.message}`);
        return;
      }

      // Verify deletion actually worked (RLS may silently block it)
      const { data: remaining } = await withTimeout(
        supabase.from('executives').select('id').eq('company_id', company.id)
      );

      if (remaining && remaining.length > 0) {
        for (const row of remaining) {
          await withTimeout(supabase.from('executives').delete().eq('id', row.id));
        }
        const { data: stillRemaining } = await withTimeout(
          supabase.from('executives').select('id').eq('company_id', company.id)
        );
        if (stillRemaining && stillRemaining.length > 0) {
          setSubmitError('Unable to update leadership team. Please check database permissions (RLS DELETE policy on executives table).');
          return;
        }
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

      const { error: insertExecError } = await withTimeout(
        supabase.from('executives').insert(executives)
      );
      if (insertExecError) {
        setSubmitError(`Failed to insert executives: ${insertExecError.message}`);
        return;
      }

      // 3. Delete-then-insert main video
      try {
        await withTimeout(
          supabase.from('company_videos').delete().eq('company_id', company.id).eq('is_main', true)
        );

        if (data.intro_video_url) {
          await withTimeout(
            supabase.from('company_videos').insert({
              company_id: company.id,
              video_url: data.intro_video_url,
              description: 'Company Introduction',
              is_main: true,
            })
          );
        }
      } catch { /* table may not exist yet */ }

      // 4. Delete-then-insert Q&A
      try {
        await withTimeout(
          supabase.from('company_qna').delete().eq('company_id', company.id)
        );

        const qnaRows = selectedQuestions
          .filter((q) => questionAnswers[q]?.trim())
          .map((q) => ({
            company_id: company.id,
            category: (questionCategoryMap[q] || 'Competitive Advantage') as QnACategory,
            question: q,
            answer: questionAnswers[q].trim(),
          }));

        if (qnaRows.length > 0) {
          await withTimeout(
            supabase.from('company_qna').insert(qnaRows)
          );
        }
      } catch { /* table may not exist yet */ }

      navigate('/dashboard');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setManualSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!company) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-serif">Edit Company Info</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              Cancel
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <form onSubmit={handleManualSubmit} noValidate className="space-y-8">

          {/* Section 1: Basic Info */}
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-serif mb-2">Basic Information</h2>
                <p className="text-muted-foreground">Update your company details</p>
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
                  <div className="relative">
                    <Input
                      type="month"
                      error={errors.founded_at?.message}
                      className="bg-secondary border-border [&::-webkit-datetime-edit-fields-wrapper]:opacity-0 [&::-webkit-calendar-picker-indicator]:invert"
                      {...register('founded_at')}
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none">
                      {watch('founded_at')
                        ? new Date(watch('founded_at') + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
                        : <span className="text-muted-foreground">Select date</span>}
                    </span>
                  </div>
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

          {/* Section 2: Links */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="text-2xl font-serif mb-2">Company Links</h2>
                <p className="text-muted-foreground">Add your online presence</p>
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
            </CardContent>
          </Card>

          {/* Section 3: IR Deck */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="text-2xl font-serif mb-2">IR Deck</h2>
                <p className="text-muted-foreground">Upload or replace your pitch deck</p>
              </div>

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
                  onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                  onChange={handleDeckUpload}
                  disabled={deckUploading}
                />
              </label>
            </CardContent>
          </Card>

          {/* Section 4: Leadership Team */}
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-serif mb-2">Leadership Team</h2>
                <p className="text-muted-foreground">Update your C-Level executives. CEO is required.</p>
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
                            <ImageUpload
                              bucket="company-assets"
                              path="executives"
                              value={f.value ?? undefined}
                              onChange={(url) => f.onChange(url)}
                              shape="circle"
                              size="sm"
                              className="!w-20 flex-shrink-0"
                            />
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

              {fields.length < 11 && (
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

          {/* Section 5: Intro Video */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="text-2xl font-serif mb-2">Introduction Video</h2>
                <p className="text-muted-foreground">Share your company intro video</p>
              </div>

              <div className="space-y-2">
                <Label required className="flex items-center gap-2"><Video className="w-4 h-4" /> Video URL (YouTube, Vimeo, or Loom)</Label>
                <Input
                  placeholder="https://youtube.com/watch?v=..."
                  error={errors.intro_video_url?.message}
                  className="bg-secondary border-border"
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
            </CardContent>
          </Card>

          {/* Section 6: Integrations */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="text-2xl font-serif mb-2">Integrations</h2>
                <p className="text-muted-foreground">Connect your accounts to sync metrics</p>
              </div>

              <div className="space-y-4">
                {/* Stripe */}
                <div className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                  company.stripe_connected
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-secondary border-border text-muted-foreground'
                }`}>
                  <div className="flex items-center gap-3">
                    <StripeIcon className="w-5 h-5" />
                    <div>
                      <p className="text-sm font-medium">Stripe</p>
                      <p className="text-xs opacity-80">
                        {company.stripe_connected ? 'Connected' : 'Not Connected'}
                      </p>
                    </div>
                  </div>
                  {company.stripe_connected ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnectIntegration('stripe')}
                      disabled={disconnectLoading === 'stripe'}
                      className="text-red-400 hover:text-red-300"
                    >
                      {disconnectLoading === 'stripe' ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : 'Disconnect'}
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={() => initiateStripeConnect()} className="gap-2">
                      <StripeIcon className="w-4 h-4" />
                      Connect Stripe
                    </Button>
                  )}
                </div>

                {/* GA4 */}
                <div className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                  company.ga4_connected
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-secondary border-border text-muted-foreground'
                }`}>
                  <div className="flex items-center gap-3">
                    <GA4Icon className="w-5 h-5" />
                    <div>
                      <p className="text-sm font-medium">Google Analytics 4</p>
                      <p className="text-xs opacity-80">
                        {company.ga4_connected ? 'Connected' : 'Not Connected'}
                      </p>
                    </div>
                  </div>
                  {company.ga4_connected ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnectIntegration('ga4')}
                      disabled={disconnectLoading === 'ga4'}
                      className="text-red-400 hover:text-red-300"
                    >
                      {disconnectLoading === 'ga4' ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : 'Disconnect'}
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={() => initiateGoogleOAuth()} className="gap-2">
                      <GA4Icon className="w-4 h-4" />
                      Connect GA4
                    </Button>
                  )}
                </div>
              </div>

              {/* Metrics Summary */}
              {metrics.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-medium mb-3">Latest Metrics</h3>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {(() => {
                      const latest = metrics[0];
                      return (
                        <>
                          {latest.revenue != null && (
                            <div className="p-3 rounded-lg bg-background border border-border text-center">
                              <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                              <p className="font-semibold">${latest.revenue.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground mt-1">{latest.month}</p>
                            </div>
                          )}
                          {latest.mau != null && (
                            <div className="p-3 rounded-lg bg-background border border-border text-center">
                              <p className="text-xs text-muted-foreground mb-1">MAU</p>
                              <p className="font-semibold">{latest.mau.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground mt-1">{latest.month}</p>
                            </div>
                          )}
                          {latest.retention != null && (
                            <div className="p-3 rounded-lg bg-background border border-border text-center">
                              <p className="text-xs text-muted-foreground mb-1">Retention</p>
                              <p className="font-semibold">{latest.retention}%</p>
                              <p className="text-xs text-muted-foreground mt-1">{latest.month}</p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 7: Investor Q&A */}
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-serif mb-2 flex items-center gap-2">
                  <MessageSquare className="w-6 h-6" />
                  Investor Q&A
                </h2>
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
            </CardContent>
          </Card>

          {/* Section 8: News Management */}
          {newsItems.length > 0 && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h2 className="text-2xl font-serif mb-2">News</h2>
                  <p className="text-muted-foreground">Manage your company news articles</p>
                </div>

                <div className="space-y-3">
                  {newsItems.map((news) => (
                    <div key={news.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                      {news.thumbnail_url && (
                        <div className="relative flex-shrink-0">
                          <img src={news.thumbnail_url} alt="" className="h-16 w-24 rounded object-cover" />
                          <button
                            type="button"
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                            onClick={() => handleRemoveNewsThumbnail(news.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{news.title}</p>
                        {news.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{news.summary}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(news.published_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteNews(news.id)}
                        disabled={deletingNewsId === news.id}
                        className="text-muted-foreground hover:text-destructive flex-shrink-0"
                      >
                        {deletingNewsId === news.id ? (
                          <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {validationErrors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-sm text-destructive">
              <p className="font-medium mb-2">Please fix the following errors:</p>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>
          )}
          {submitError && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
              {submitError}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pb-8">
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard')} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <Button type="submit" isLoading={manualSubmitting} className="gap-2">
              Save Changes
              <Check className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
