-- =============================================
-- Supabase Schema for NC Front
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUM Types
-- =============================================

CREATE TYPE user_role AS ENUM ('investor', 'startup', 'admin');
CREATE TYPE employee_count AS ENUM ('1~10', '10~100', '100~1000', '1000~10000', '10000+');
CREATE TYPE company_category AS ENUM ('AI/ML', 'Fintech', 'Edtech', 'CleanTech', 'HealthTech', 'E-commerce', 'SaaS', 'Other');
CREATE TYPE company_stage AS ENUM ('Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+');
CREATE TYPE executive_role AS ENUM ('CEO', 'CTO', 'COO', 'CFO', 'CPO');
CREATE TYPE qna_category AS ENUM ('Team Cohesion', 'Competitive Advantage', 'Capability Gap', 'Acquisition Offer', 'Competitive Landscape', 'Basis of Conviction');
CREATE TYPE metric_source AS ENUM ('stripe', 'ga4', 'manual');

-- =============================================
-- Tables
-- =============================================

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'investor',
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  short_description TEXT NOT NULL,
  description TEXT NOT NULL,
  founded_at TEXT NOT NULL,
  location TEXT NOT NULL,
  employee_count employee_count NOT NULL,
  category company_category NOT NULL,
  stage company_stage NOT NULL,
  website_url TEXT,
  github_url TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,
  youtube_url TEXT,
  deck_url TEXT,
  is_visible BOOLEAN DEFAULT false,
  stripe_connected BOOLEAN DEFAULT false,
  ga4_connected BOOLEAN DEFAULT false,
  last_data_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Executives table
CREATE TABLE executives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role executive_role NOT NULL,
  photo_url TEXT,
  bio TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,
  education TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company Q&A table
CREATE TABLE company_qna (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category qna_category NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company News table
CREATE TABLE company_news (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  thumbnail_url TEXT,
  external_link TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company Videos table
CREATE TABLE company_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  description TEXT,
  is_main BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company Metrics table
CREATE TABLE company_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  revenue NUMERIC,
  mau INTEGER,
  retention NUMERIC,
  source metric_source NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- View Logs table
CREATE TABLE view_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly Submissions table
CREATE TABLE monthly_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  stripe_status BOOLEAN DEFAULT false,
  ga4_status BOOLEAN DEFAULT false,
  comment TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Indexes
-- =============================================

CREATE INDEX idx_companies_user_id ON companies(user_id);
CREATE INDEX idx_companies_is_visible ON companies(is_visible);
CREATE INDEX idx_executives_company_id ON executives(company_id);
CREATE INDEX idx_company_qna_company_id ON company_qna(company_id);
CREATE INDEX idx_company_news_company_id ON company_news(company_id);
CREATE INDEX idx_company_videos_company_id ON company_videos(company_id);
CREATE INDEX idx_company_metrics_company_id ON company_metrics(company_id);
CREATE INDEX idx_view_logs_investor_id ON view_logs(investor_id);
CREATE INDEX idx_view_logs_company_id ON view_logs(company_id);
CREATE INDEX idx_monthly_submissions_company_id ON monthly_submissions(company_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE executives ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_qna ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE view_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies
-- =============================================

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Companies policies
CREATE POLICY "Anyone can view visible companies"
  ON companies FOR SELECT
  USING (is_visible = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own company"
  ON companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company"
  ON companies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own company"
  ON companies FOR DELETE
  USING (auth.uid() = user_id);

-- Executives policies
CREATE POLICY "Anyone can view executives of visible companies"
  ON executives FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = executives.company_id
      AND (companies.is_visible = true OR companies.user_id = auth.uid())
    )
  );

CREATE POLICY "Company owners can insert executives"
  ON executives FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = executives.company_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Company owners can update executives"
  ON executives FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = executives.company_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Company owners can delete executives"
  ON executives FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = executives.company_id
      AND companies.user_id = auth.uid()
    )
  );

-- Company Q&A policies
CREATE POLICY "Anyone can view Q&A of visible companies"
  ON company_qna FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_qna.company_id
      AND (companies.is_visible = true OR companies.user_id = auth.uid())
    )
  );

CREATE POLICY "Company owners can manage Q&A"
  ON company_qna FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_qna.company_id
      AND companies.user_id = auth.uid()
    )
  );

-- Company News policies
CREATE POLICY "Anyone can view news of visible companies"
  ON company_news FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_news.company_id
      AND (companies.is_visible = true OR companies.user_id = auth.uid())
    )
  );

CREATE POLICY "Company owners can manage news"
  ON company_news FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_news.company_id
      AND companies.user_id = auth.uid()
    )
  );

-- Company Videos policies
CREATE POLICY "Anyone can view videos of visible companies"
  ON company_videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_videos.company_id
      AND (companies.is_visible = true OR companies.user_id = auth.uid())
    )
  );

CREATE POLICY "Company owners can manage videos"
  ON company_videos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_videos.company_id
      AND companies.user_id = auth.uid()
    )
  );

-- Company Metrics policies
CREATE POLICY "Anyone can view metrics of visible companies"
  ON company_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_metrics.company_id
      AND (companies.is_visible = true OR companies.user_id = auth.uid())
    )
  );

CREATE POLICY "Company owners can manage metrics"
  ON company_metrics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_metrics.company_id
      AND companies.user_id = auth.uid()
    )
  );

-- View Logs policies
CREATE POLICY "Investors can insert view logs"
  ON view_logs FOR INSERT
  WITH CHECK (auth.uid() = investor_id);

CREATE POLICY "Company owners can view their view logs"
  ON view_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = view_logs.company_id
      AND companies.user_id = auth.uid()
    )
  );

-- Monthly Submissions policies
CREATE POLICY "Company owners can manage submissions"
  ON monthly_submissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = monthly_submissions.company_id
      AND companies.user_id = auth.uid()
    )
  );

-- Audit Logs policies
CREATE POLICY "Users can view their own audit logs"
  ON audit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- Triggers for updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_qna_updated_at
  BEFORE UPDATE ON company_qna
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Function to create profile on signup
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'investor');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
