-- FundBridge Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('investor', 'startup', 'admin')),
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COMPANIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  short_description TEXT NOT NULL CHECK (char_length(short_description) BETWEEN 10 AND 100),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1000 AND 10000),
  founded_at DATE NOT NULL,
  location TEXT NOT NULL,
  employee_count TEXT NOT NULL CHECK (employee_count IN ('1~10', '10~100', '100~1000', '1000~10000', '10000+')),
  category TEXT NOT NULL CHECK (category IN ('AI/ML', 'Fintech', 'Edtech', 'CleanTech', 'HealthTech', 'E-commerce', 'SaaS', 'Other')),
  stage TEXT NOT NULL CHECK (stage IN ('Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+')),
  website_url TEXT,
  github_url TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,
  youtube_url TEXT,
  is_visible BOOLEAN DEFAULT true,
  stripe_connected BOOLEAN DEFAULT false,
  ga4_connected BOOLEAN DEFAULT false,
  last_data_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EXECUTIVES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.executives (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('CEO', 'CTO', 'COO', 'CFO', 'CPO')),
  photo_url TEXT,
  bio TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,
  education TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COMPANY Q&A TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.company_qna (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('팀 결속력', '경쟁 우위', '역량 결핍', '인수 제안', '경쟁 상황', '확신의 근거')),
  question TEXT NOT NULL,
  answer TEXT NOT NULL CHECK (char_length(answer) BETWEEN 500 AND 1000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COMPANY NEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.company_news (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  thumbnail_url TEXT,
  external_link TEXT,
  published_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COMPANY VIDEOS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.company_videos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  video_url TEXT NOT NULL,
  description TEXT,
  is_main BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COMPANY METRICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.company_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL,
  revenue BIGINT,
  mau INTEGER,
  retention DECIMAL(5,2),
  source TEXT NOT NULL CHECK (source IN ('stripe', 'ga4', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, month, source)
);

-- ============================================
-- VIEW LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.view_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  investor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MONTHLY SUBMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.monthly_submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  year_month TEXT NOT NULL, -- Format: '2024-01'
  stripe_status BOOLEAN DEFAULT false,
  ga4_status BOOLEAN DEFAULT false,
  comment TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, year_month)
);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'investor'),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_company_qna_updated_at
  BEFORE UPDATE ON public.company_qna
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_qna ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.view_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Companies policies
CREATE POLICY "Anyone can view visible companies" ON public.companies
  FOR SELECT USING (is_visible = true);

CREATE POLICY "Startup owners can manage their company" ON public.companies
  FOR ALL USING (auth.uid() = user_id);

-- Executives policies
CREATE POLICY "Anyone can view executives of visible companies" ON public.executives
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND is_visible = true)
  );

CREATE POLICY "Company owners can manage executives" ON public.executives
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
  );

-- Q&A policies
CREATE POLICY "Anyone can view Q&A of visible companies" ON public.company_qna
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND is_visible = true)
  );

CREATE POLICY "Company owners can manage Q&A" ON public.company_qna
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
  );

-- News policies
CREATE POLICY "Anyone can view news of visible companies" ON public.company_news
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND is_visible = true)
  );

CREATE POLICY "Company owners can manage news" ON public.company_news
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
  );

-- Videos policies
CREATE POLICY "Anyone can view videos of visible companies" ON public.company_videos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND is_visible = true)
  );

CREATE POLICY "Company owners can manage videos" ON public.company_videos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
  );

-- Metrics policies
CREATE POLICY "Investors can view metrics after view log" ON public.company_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.view_logs
      WHERE company_id = company_metrics.company_id
      AND investor_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE id = company_metrics.company_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Company owners can manage metrics" ON public.company_metrics
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
  );

-- View logs policies
CREATE POLICY "Investors can create view logs" ON public.view_logs
  FOR INSERT WITH CHECK (auth.uid() = investor_id);

CREATE POLICY "Users can view their own view logs" ON public.view_logs
  FOR SELECT USING (auth.uid() = investor_id);

CREATE POLICY "Company owners can view their company's view logs" ON public.view_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
  );

-- Monthly submissions policies
CREATE POLICY "Company owners can manage submissions" ON public.monthly_submissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
  );

-- Audit logs policies (admin only for viewing)
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_companies_user_id ON public.companies(user_id);
CREATE INDEX idx_companies_category ON public.companies(category);
CREATE INDEX idx_companies_stage ON public.companies(stage);
CREATE INDEX idx_companies_is_visible ON public.companies(is_visible);
CREATE INDEX idx_executives_company_id ON public.executives(company_id);
CREATE INDEX idx_company_qna_company_id ON public.company_qna(company_id);
CREATE INDEX idx_company_news_company_id ON public.company_news(company_id);
CREATE INDEX idx_company_videos_company_id ON public.company_videos(company_id);
CREATE INDEX idx_company_metrics_company_id ON public.company_metrics(company_id);
CREATE INDEX idx_view_logs_investor_id ON public.view_logs(investor_id);
CREATE INDEX idx_view_logs_company_id ON public.view_logs(company_id);
CREATE INDEX idx_monthly_submissions_company_id ON public.monthly_submissions(company_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
