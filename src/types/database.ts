export type UserRole = 'investor' | 'startup' | 'admin';

export type EmployeeCount = '1~10' | '10~100' | '100~1000' | '1000~10000' | '10000+';

export type CompanyCategory =
  | 'AI/ML'
  | 'Fintech'
  | 'Edtech'
  | 'CleanTech'
  | 'HealthTech'
  | 'E-commerce'
  | 'SaaS'
  | 'Other';

export type CompanyStage =
  | 'Pre-seed'
  | 'Seed'
  | 'Series A'
  | 'Series B'
  | 'Series C+';

export type ExecutiveRole = 'CEO' | 'CTO' | 'COO' | 'CFO' | 'CPO';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type QnACategory =
  | 'Team Cohesion'
  | 'Competitive Advantage'
  | 'Capability Gap'
  | 'Acquisition Offer'
  | 'Competitive Landscape'
  | 'Basis of Conviction';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      companies: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          logo_url: string | null;
          short_description: string;
          description: string;
          founded_at: string;
          location: string;
          employee_count: EmployeeCount;
          category: CompanyCategory;
          stage: CompanyStage;
          website_url: string | null;
          github_url: string | null;
          linkedin_url: string | null;
          twitter_url: string | null;
          youtube_url: string | null;
          deck_url: string | null;
          is_visible: boolean;
          approval_status: ApprovalStatus;
          reviewed_at: string | null;
          reviewed_by: string | null;
          rejection_reason: string | null;
          stripe_connected: boolean;
          ga4_connected: boolean;
          last_data_update: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'id' | 'created_at' | 'updated_at' | 'is_visible' | 'approval_status' | 'reviewed_at' | 'reviewed_by' | 'rejection_reason' | 'stripe_connected' | 'ga4_connected' | 'last_data_update'>;
        Update: Partial<Database['public']['Tables']['companies']['Insert']> & { is_visible?: boolean; approval_status?: ApprovalStatus; reviewed_at?: string; reviewed_by?: string | null; rejection_reason?: string | null; stripe_connected?: boolean; ga4_connected?: boolean };
        Relationships: [];
      };
      executives: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          role: ExecutiveRole;
          photo_url: string | null;
          bio: string | null;
          linkedin_url: string | null;
          twitter_url: string | null;
          education: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['executives']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['executives']['Insert']>;
        Relationships: [];
      };
      company_qna: {
        Row: {
          id: string;
          company_id: string;
          category: QnACategory;
          question: string;
          answer: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['company_qna']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['company_qna']['Insert']>;
        Relationships: [];
      };
      company_news: {
        Row: {
          id: string;
          company_id: string;
          title: string;
          summary: string | null;
          thumbnail_url: string | null;
          external_link: string | null;
          published_at: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['company_news']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['company_news']['Insert']>;
        Relationships: [];
      };
      company_videos: {
        Row: {
          id: string;
          company_id: string;
          video_url: string;
          description: string | null;
          is_main: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['company_videos']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['company_videos']['Insert']>;
        Relationships: [];
      };
      company_metrics: {
        Row: {
          id: string;
          company_id: string;
          month: string;
          revenue: number | null;
          mau: number | null;
          retention: number | null;
          source: 'stripe' | 'ga4' | 'manual';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['company_metrics']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['company_metrics']['Insert']>;
        Relationships: [];
      };
      view_logs: {
        Row: {
          id: string;
          investor_id: string;
          company_id: string;
          viewed_at: string;
        };
        Insert: Omit<Database['public']['Tables']['view_logs']['Row'], 'id' | 'viewed_at'>;
        Update: Partial<Database['public']['Tables']['view_logs']['Insert']>;
        Relationships: [];
      };
      monthly_submissions: {
        Row: {
          id: string;
          company_id: string;
          year_month: string;
          stripe_status: boolean;
          ga4_status: boolean;
          comment: string | null;
          submitted_at: string;
        };
        Insert: Omit<Database['public']['Tables']['monthly_submissions']['Row'], 'id' | 'submitted_at'>;
        Update: Partial<Database['public']['Tables']['monthly_submissions']['Insert']>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          target_type: string;
          target_id: string;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Company = Database['public']['Tables']['companies']['Row'];
export type Executive = Database['public']['Tables']['executives']['Row'];
export type CompanyQnA = Database['public']['Tables']['company_qna']['Row'];
export type CompanyNews = Database['public']['Tables']['company_news']['Row'];
export type CompanyVideo = Database['public']['Tables']['company_videos']['Row'];
export type CompanyMetric = Database['public']['Tables']['company_metrics']['Row'];
export type ViewLog = Database['public']['Tables']['view_logs']['Row'];
export type MonthlySubmission = Database['public']['Tables']['monthly_submissions']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
