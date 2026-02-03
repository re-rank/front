import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Building2,
  Users,
  Calendar,
  MapPin,
  Globe,
  ExternalLink,
  Play,
  BarChart3,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  ChevronLeft,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import type {
  Company,
  Executive,
  CompanyQnA,
  CompanyNews,
  CompanyVideo,
  CompanyMetric,
} from '@/types/database';

type TabStatus = 'pending' | 'accepted' | 'paid' | 'rejected';

interface CompanyWithDetails extends Company {
  executives?: Executive[];
  qna?: CompanyQnA[];
  news?: CompanyNews[];
  videos?: CompanyVideo[];
  metrics?: CompanyMetric[];
}

const tabConfig: { key: TabStatus; label: string; icon: typeof Clock }[] = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'accepted', label: 'Accepted', icon: CheckCircle },
  { key: 'paid', label: 'Paid', icon: CreditCard },
  { key: 'rejected', label: 'Rejected', icon: XCircle },
];

function getStatus(c: Company): TabStatus {
  if (c.is_visible && c.stripe_connected) return 'paid';
  if (c.is_visible) return 'accepted';
  // If is_visible=false and updated_at differs from created_at, consider it rejected
  // Simplified: is_visible=false with data means pending, not yet decided
  // Simple logic here: is_visible=false → pending (local state used to distinguish reject)
  return 'pending';
}

export function AdminDashboard() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabStatus>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch all companies
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });
      setCompanies(data ?? []);
      setLoading(false);
    })();
  }, []);

  // Filter by tab
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const status = rejectedIds.has(c.id) ? 'rejected' : getStatus(c);
      if (status !== activeTab) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [companies, activeTab, searchQuery, rejectedIds]);

  // Count per tab
  const tabCounts = useMemo(() => {
    const counts: Record<TabStatus, number> = { pending: 0, accepted: 0, paid: 0, rejected: 0 };
    companies.forEach((c) => {
      const status = rejectedIds.has(c.id) ? 'rejected' : getStatus(c);
      counts[status]++;
    });
    return counts;
  }, [companies, rejectedIds]);

  // Load company detail
  const loadDetail = async (company: Company) => {
    setDetailLoading(true);
    setSelectedCompany({ ...company });

    const [execRes, qnaRes, newsRes, videoRes, metricRes] = await Promise.all([
      supabase.from('executives').select('*').eq('company_id', company.id).order('created_at'),
      supabase.from('company_qna').select('*').eq('company_id', company.id).order('created_at'),
      supabase.from('company_news').select('*').eq('company_id', company.id).order('published_at', { ascending: false }),
      supabase.from('company_videos').select('*').eq('company_id', company.id).order('is_main', { ascending: false }),
      supabase.from('company_metrics').select('*').eq('company_id', company.id).order('month'),
    ]);

    setSelectedCompany({
      ...company,
      executives: execRes.data ?? [],
      qna: qnaRes.data ?? [],
      news: newsRes.data ?? [],
      videos: videoRes.data ?? [],
      metrics: metricRes.data ?? [],
    });
    setDetailLoading(false);
  };

  // Accept
  const handleAccept = async (companyId: string) => {
    await supabase.from('companies').update({ is_visible: true }).eq('id', companyId);
    setCompanies((prev) => prev.map((c) => (c.id === companyId ? { ...c, is_visible: true } : c)));
    setRejectedIds((prev) => {
      const next = new Set(prev);
      next.delete(companyId);
      return next;
    });
    setSelectedCompany(null);
  };

  // Reject
  const handleReject = async (companyId: string) => {
    await supabase.from('companies').update({ is_visible: false }).eq('id', companyId);
    setCompanies((prev) => prev.map((c) => (c.id === companyId ? { ...c, is_visible: false } : c)));
    setRejectedIds((prev) => new Set(prev).add(companyId));
    setSelectedCompany(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#171717' }}>
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#171717', color: '#e5e5e5' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Admin Dashboard
          </h1>
          <p className="text-neutral-400 mt-1">Manage and approve company submissions</p>
        </div>

        {selectedCompany ? (
          /* ─── Detail View ─── */
          <CompanyDetailView
            company={selectedCompany}
            loading={detailLoading}
            onBack={() => setSelectedCompany(null)}
            onAccept={handleAccept}
            onReject={handleReject}
            isRejected={rejectedIds.has(selectedCompany.id)}
          />
        ) : (
          /* ─── List View ─── */
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {tabConfig.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: activeTab === key ? '#3b82f6' : '#262626',
                    color: activeTab === key ? '#fff' : '#a3a3a3',
                  }}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  <span
                    className="ml-1 px-1.5 py-0.5 rounded text-xs"
                    style={{
                      background: activeTab === key ? 'rgba(255,255,255,0.2)' : '#404040',
                    }}
                  >
                    {tabCounts[key]}
                  </span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Search by name, category, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none"
                style={{
                  background: '#262626',
                  border: '1px solid #404040',
                  color: '#e5e5e5',
                }}
              />
            </div>

            {/* Company List */}
            {filteredCompanies.length === 0 ? (
              <div className="text-center py-20 text-neutral-500">
                No companies found with this status.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCompanies.map((c) => (
                  <CompanyCard key={c.id} company={c} onClick={() => loadDetail(c)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Company Card ─── */
function CompanyCard({ company, onClick }: { company: Company; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl p-4 transition-colors hover:border-blue-500"
      style={{
        background: '#262626',
        border: '1px solid #404040',
      }}
    >
      <div className="flex items-start gap-3">
        {company.logo_url ? (
          <img src={company.logo_url} alt={company.name} className="h-12 w-12 rounded-lg object-cover" />
        ) : (
          <div
            className="h-12 w-12 rounded-lg flex items-center justify-center text-lg font-bold"
            style={{ background: '#404040', color: '#a3a3a3' }}
          >
            {company.name[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{company.name}</h3>
          <p className="text-sm text-neutral-400 truncate">{company.short_description}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#1e3a5f', color: '#60a5fa' }}>
          {company.category}
        </span>
        <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#3b2f1e', color: '#fbbf24' }}>
          {company.stage}
        </span>
        <span className="text-xs text-neutral-500 flex items-center gap-1">
          <MapPin className="h-3 w-3" /> {company.location}
        </span>
      </div>
      <div className="flex items-center gap-3 mt-3 text-xs text-neutral-500">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" /> {new Date(company.created_at).toLocaleDateString('ko-KR')}
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" /> {company.employee_count}
        </span>
        {company.is_visible ? (
          <Eye className="h-3 w-3 text-green-500" />
        ) : (
          <EyeOff className="h-3 w-3 text-neutral-600" />
        )}
      </div>
    </button>
  );
}

/* ─── Detail View ─── */
function CompanyDetailView({
  company,
  loading,
  onBack,
  onAccept,
  onReject,
  isRejected,
}: {
  company: CompanyWithDetails;
  loading: boolean;
  onBack: () => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  isRejected: boolean;
}) {
  const currentStatus = isRejected ? 'rejected' : getStatus(company);
  const mainVideo = company.videos?.find((v) => v.is_main);

  return (
    <div className="space-y-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-neutral-400 hover:text-white transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back to List
        </button>
        <div className="flex gap-2">
          {currentStatus !== 'accepted' && currentStatus !== 'paid' && (
            <button
              onClick={() => onAccept(company.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: '#16a34a', color: '#fff' }}
            >
              <CheckCircle className="h-4 w-4" /> Accept
            </button>
          )}
          {currentStatus !== 'rejected' && (
            <button
              onClick={() => onReject(company.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: '#dc2626', color: '#fff' }}
            >
              <XCircle className="h-4 w-4" /> Reject
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Company Header */}
          <div className="rounded-xl p-6" style={{ background: '#262626', border: '1px solid #404040' }}>
            <div className="flex items-start gap-4">
              {company.logo_url ? (
                <img src={company.logo_url} alt={company.name} className="h-16 w-16 rounded-xl object-cover" />
              ) : (
                <div
                  className="h-16 w-16 rounded-xl flex items-center justify-center text-2xl font-bold"
                  style={{ background: '#404040', color: '#a3a3a3' }}
                >
                  {company.name[0]}
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">{company.name}</h2>
                <p className="text-neutral-400 mt-1">{company.short_description}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs px-2 py-1 rounded" style={{ background: '#1e3a5f', color: '#60a5fa' }}>
                    {company.category}
                  </span>
                  <span className="text-xs px-2 py-1 rounded" style={{ background: '#3b2f1e', color: '#fbbf24' }}>
                    {company.stage}
                  </span>
                  <span
                    className="text-xs px-2 py-1 rounded"
                    style={{
                      background: currentStatus === 'paid' ? '#052e16' : currentStatus === 'accepted' ? '#0c4a6e' : currentStatus === 'rejected' ? '#450a0a' : '#422006',
                      color: currentStatus === 'paid' ? '#4ade80' : currentStatus === 'accepted' ? '#38bdf8' : currentStatus === 'rejected' ? '#f87171' : '#fbbf24',
                    }}
                  >
                    {currentStatus.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-neutral-400">
              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Founded: {company.founded_at}</span>
              <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {company.employee_count} employees</span>
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {company.location}</span>
            </div>
            {/* External Links */}
            <div className="flex flex-wrap gap-2 mt-4">
              {company.website_url && (
                <a href={company.website_url} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 hover:opacity-80" style={{ background: '#404040', color: '#e5e5e5' }}>
                  <Globe className="h-3 w-3" /> Website
                </a>
              )}
              {company.github_url && (
                <a href={company.github_url} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 hover:opacity-80" style={{ background: '#404040', color: '#e5e5e5' }}>
                  <ExternalLink className="h-3 w-3" /> GitHub
                </a>
              )}
              {company.linkedin_url && (
                <a href={company.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 hover:opacity-80" style={{ background: '#404040', color: '#e5e5e5' }}>
                  <ExternalLink className="h-3 w-3" /> LinkedIn
                </a>
              )}
            </div>
          </div>

          {/* Video */}
          {mainVideo && (
            <div className="rounded-xl p-6" style={{ background: '#262626', border: '1px solid #404040' }}>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Play className="h-5 w-5" /> Pitch Video
              </h3>
              <div className="aspect-video rounded-lg overflow-hidden bg-black">
                <iframe src={mainVideo.video_url} title="Pitch video" className="w-full h-full" allowFullScreen />
              </div>
              {mainVideo.description && <p className="mt-3 text-sm text-neutral-400">{mainVideo.description}</p>}
            </div>
          )}

          {/* About */}
          <div className="rounded-xl p-6" style={{ background: '#262626', border: '1px solid #404040' }}>
            <h3 className="text-lg font-semibold text-white mb-3">About</h3>
            <p className="text-neutral-300 whitespace-pre-line leading-relaxed">{company.description}</p>
          </div>

          {/* Team */}
          {company.executives && company.executives.length > 0 && (
            <div className="rounded-xl p-6" style={{ background: '#262626', border: '1px solid #404040' }}>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" /> Team
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {company.executives.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#1a1a1a' }}>
                    {e.photo_url ? (
                      <img src={e.photo_url} alt={e.name} className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: '#404040', color: '#a3a3a3' }}>
                        {e.name[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-white">{e.name}</p>
                      <p className="text-xs text-neutral-400">{e.role}</p>
                      {e.bio && <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{e.bio}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metrics */}
          {company.metrics && company.metrics.length > 0 && (
            <div className="rounded-xl p-6" style={{ background: '#262626', border: '1px solid #404040' }}>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" /> Business Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <DarkMetricChart title="Monthly Revenue" data={company.metrics} dataKey="revenue" color="#6366f1" format={(v) => `₩${(v / 1_000_000).toFixed(0)}M`} />
                <DarkMetricChart title="MAU" data={company.metrics} dataKey="mau" color="#10b981" format={(v) => v.toLocaleString()} />
                <DarkMetricChart title="Retention" data={company.metrics} dataKey="retention" color="#f59e0b" format={(v) => `${v}%`} />
              </div>
            </div>
          )}

          {/* News */}
          {company.news && company.news.length > 0 && (
            <div className="rounded-xl p-6" style={{ background: '#262626', border: '1px solid #404040' }}>
              <h3 className="text-lg font-semibold text-white mb-4">News</h3>
              <div className="space-y-3">
                {company.news.map((n) => (
                  <a
                    key={n.id}
                    href={n.external_link ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 rounded-lg hover:opacity-80 transition-opacity"
                    style={{ background: '#1a1a1a' }}
                  >
                    {n.thumbnail_url && (
                      <img src={n.thumbnail_url} alt="" className="h-16 w-24 rounded object-cover flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-white text-sm">{n.title}</p>
                      {n.summary && <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{n.summary}</p>}
                      <p className="text-xs text-neutral-500 mt-1">{new Date(n.published_at).toLocaleDateString('ko-KR')}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Q&A */}
          {company.qna && company.qna.length > 0 && (
            <div className="rounded-xl p-6" style={{ background: '#262626', border: '1px solid #404040' }}>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5" /> Q&A
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {company.qna.map((q) => (
                  <div key={q.id} className="p-4 rounded-lg space-y-2" style={{ background: '#1a1a1a' }}>
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#1e3a5f', color: '#60a5fa' }}>
                      {q.category}
                    </span>
                    <p className="font-medium text-white text-sm">{q.question}</p>
                    <p className="text-xs text-neutral-400 whitespace-pre-line">{q.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Dark Chart ─── */
function DarkMetricChart({
  title,
  data,
  dataKey,
  color,
  format,
}: {
  title: string;
  data: CompanyMetric[];
  dataKey: 'revenue' | 'mau' | 'retention';
  color: string;
  format: (v: number) => string;
}) {
  const filtered = data.filter((d) => d[dataKey] != null);
  if (filtered.length === 0) return null;

  return (
    <div className="p-4 rounded-lg" style={{ background: '#1a1a1a' }}>
      <p className="text-sm font-medium text-neutral-300 mb-2">{title}</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={filtered}>
          <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#737373' }} />
          <YAxis tick={{ fontSize: 11, fill: '#737373' }} tickFormatter={(v) => format(v)} />
          <Tooltip
            formatter={(v) => format(v as number)}
            contentStyle={{ background: '#262626', border: '1px solid #404040', borderRadius: 8, color: '#e5e5e5' }}
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
