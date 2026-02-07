import { z } from 'zod';
import type { SelectOption } from '@/components/ui/Select';

// --- Options ---
export const employeeCountOptions: SelectOption[] = [
  { value: '1~10', label: '1-10' },
  { value: '10~100', label: '10-100' },
  { value: '100~1000', label: '100-1,000' },
  { value: '1000~10000', label: '1,000-10,000' },
  { value: '10000+', label: '10,000+' },
];

export const categoryOptions: SelectOption[] = [
  { value: 'AI/ML', label: 'AI/ML' },
  { value: 'Fintech', label: 'Fintech' },
  { value: 'Edtech', label: 'Edtech' },
  { value: 'CleanTech', label: 'CleanTech' },
  { value: 'HealthTech', label: 'HealthTech' },
  { value: 'E-commerce', label: 'E-commerce' },
  { value: 'SaaS', label: 'SaaS' },
  { value: 'Other', label: 'Other' },
];

export const stageOptions: SelectOption[] = [
  { value: 'Pre-seed', label: 'Pre-seed' },
  { value: 'Seed', label: 'Seed' },
  { value: 'Series A', label: 'Series A' },
  { value: 'Series B', label: 'Series B' },
  { value: 'Series C+', label: 'Series C+' },
];

export const executiveRoleOptions: SelectOption[] = [
  { value: 'CEO', label: 'CEO' },
  { value: 'CAO', label: 'CAO' },
  { value: 'CCO', label: 'CCO' },
  { value: 'CFO', label: 'CFO' },
  { value: 'CIO', label: 'CIO' },
  { value: 'CKO', label: 'CKO' },
  { value: 'COO', label: 'COO' },
  { value: 'CPO', label: 'CPO' },
  { value: 'CRO', label: 'CRO' },
  { value: 'CSO', label: 'CSO' },
  { value: 'CTO', label: 'CTO' },
];

// --- Schema ---
export const executiveSchema = z.object({
  name: z.string().min(1, 'Please enter a name'),
  role: z.enum(['CEO', 'CAO', 'CCO', 'CFO', 'CIO', 'CKO', 'COO', 'CPO', 'CRO', 'CSO', 'CTO'], { message: 'Please select a role' }),
  photo_url: z.string().nullable().optional(),
  bio: z.string().optional(),
  linkedin_url: z.string().url('Please enter a valid URL').or(z.literal('')).optional(),
  twitter_url: z.string().url('Please enter a valid URL').or(z.literal('')).optional(),
  education: z.string().optional(),
});

export const companyRegisterSchema = z.object({
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

export type CompanyRegisterForm = z.infer<typeof companyRegisterSchema>;

export const defaultExecutive = (role: string = 'CEO') => ({
  name: '',
  role: role as CompanyRegisterForm['executives'][number]['role'],
  photo_url: null,
  bio: '',
  linkedin_url: '',
  twitter_url: '',
  education: '',
});
