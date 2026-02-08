import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  Calendar,
  Users,
  MapPin,
  Globe,
  Github,
  Linkedin,
  Youtube,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Edit,
  Trash2,
  Play,
  MessageSquare,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, Badge, Button } from '@/components/ui';
import type { Company, Executive, CompanyVideo, CompanyQnA, CompanyMetric } from '@/types/database';

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export function StartupDashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuthStore();
  const [company, setCompany] = useState<Company | null>(null);
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [videos, setVideos] = useState<CompanyVideo[]>([]);
  const [qna, setQna] = useState<CompanyQnA[]>([]);
  const [metrics, setMetrics] = useState<CompanyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteCompany = async () => {
    if (!company || !user) return;
    setDeleting(true);
    try {
      // 관련 데이터 삭제 (테이블이 없을 수 있으므로 개별 에러 무시)
      await supabase.from('company_qna').delete().eq('company_id', company.id).then(() => {}, () => {});
      await supabase.from('company_videos').delete().eq('company_id', company.id).then(() => {}, () => {});
      await supabase.from('company_news').delete().eq('company_id', company.id).then(() => {}, () => {});
      await supabase.from('executives').delete().eq('company_id', company.id).then(() => {}, () => {});

      // 회사 삭제 (핵심)
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', company.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Delete company failed:', error);
        alert(`Failed to delete: ${error.message}`);
        return;
      }

      setShowDeleteConfirm(false);
      navigate('/company/register', { replace: true });
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete company. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    // Wait for auth to finish loading before deciding
    if (authLoading) return;

    // If no user after auth is done, stop loading
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    // Safety timeout: guarantee loading ends no matter what
    const fetchTimeout = setTimeout(() => {
      if (!cancelled) {
        console.warn('Dashboard fetch timed out after 10s');
        setLoading(false);
      }
    }, 10000);

    // Per-query timeout wrapper
    const withTimeout = <T,>(promise: PromiseLike<T>, ms = 8000): Promise<T> =>
      Promise.race([
        Promise.resolve(promise),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Query timed out')), ms)
        ),
      ]);

    (async () => {
      try {
        const { data: rows } = await withTimeout(
          supabase
            .from('companies')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
        );

        if (cancelled) return;
        const data = rows?.[0] ?? null;
        if (data) {
          // Process pending OAuth integrations
          const pendingRaw = localStorage.getItem('pending_integrations');
          if (pendingRaw) {
            try {
              const pending = JSON.parse(pendingRaw);
              const updates: Record<string, boolean> = {};
              if (pending.stripe?.status === 'connected' && !data.stripe_connected) {
                updates.stripe_connected = true;
              }
              if (pending.ga4?.status === 'connected' && !data.ga4_connected) {
                updates.ga4_connected = true;
              }
              if (Object.keys(updates).length > 0) {
                const { error } = await withTimeout(
                  supabase.from('companies').update(updates).eq('id', data.id)
                );
                if (!error) Object.assign(data, updates);
              }
              localStorage.removeItem('pending_integrations');
            } catch (e) {
              console.error('Failed to process pending integrations:', e);
            }
          }

          setCompany(data);
          const [execRes, videoRes, qnaRes, metricsRes] = await Promise.all([
            withTimeout(supabase.from('executives').select('*').eq('company_id', data.id).order('created_at'))
              .then(r => r, () => ({ data: null })),
            withTimeout(supabase.from('company_videos').select('*').eq('company_id', data.id).eq('is_main', true).limit(1))
              .then(r => r, () => ({ data: null })),
            withTimeout(supabase.from('company_qna').select('*').eq('company_id', data.id).order('created_at'))
              .then(r => r, () => ({ data: null })),
            withTimeout(supabase.from('company_metrics').select('*').eq('company_id', data.id).order('month', { ascending: true }))
              .then(r => r, () => ({ data: null })),
          ]);
          if (!cancelled) {
            setExecutives(execRes.data ?? []);
            setVideos((videoRes.data as CompanyVideo[] | null) ?? []);
            setQna((qnaRes.data as CompanyQnA[] | null) ?? []);
            setMetrics((metricsRes.data as CompanyMetric[] | null) ?? []);
          }
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        clearTimeout(fetchTimeout);
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; clearTimeout(fetchTimeout); };
  }, [user?.id, authLoading]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // No company registered yet
  if (!company) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-2">
          <Building2 className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">No company registered yet</h2>
        <p className="text-muted-foreground max-w-md">
          You haven't registered a company yet. Get started by creating your company profile to showcase to investors.
        </p>
        <Link to="/company/register">
          <Button size="lg">Register Company</Button>
        </Link>
      </div>
    );
  }

  // Company exists - show dashboard
  const getStatusInfo = () => {
    if (company.approval_status === 'rejected') {
      return { label: 'Rejected', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle };
    }
    if (company.approval_status === 'approved') {
      return { label: 'Approved', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle };
    }
    return { label: 'Pending Review', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock };
  };
  const statusInfo = getStatusInfo();

  const linkButtons = [
    { url: company.website_url, icon: Globe, label: 'Website' },
    { url: company.github_url, icon: Github, label: 'GitHub' },
    { url: company.linkedin_url, icon: Linkedin, label: 'LinkedIn' },
    { url: company.twitter_url, icon: XIcon, label: 'X' },
    { url: company.youtube_url, icon: Youtube, label: 'YouTube' },
  ].filter((l) => l.url);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif font-semibold">My Company</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <Link to="/company/edit">
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-background border border-border rounded-xl p-6 max-w-md w-full mx-4 space-y-4">
            <h3 className="text-lg font-semibold text-destructive">Delete Company</h3>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{company.name}</strong>? This will permanently remove all company data, team members, videos, and news. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDeleteCompany} isLoading={deleting}>
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Status Banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${statusInfo.color}`}>
        <statusInfo.icon className="w-5 h-5 flex-shrink-0" />
        <div>
          <p className="font-medium">{statusInfo.label}</p>
          <p className="text-sm opacity-80">
            {company.approval_status === 'approved'
              ? 'Your company is visible to investors.'
              : company.approval_status === 'rejected'
              ? 'Your company profile has been rejected by an admin.'
              : 'Your company profile is under review. It will be visible to investors once approved by an admin.'}
          </p>
        </div>
      </div>

      {/* Rejection Reason */}
      {company.approval_status === 'rejected' && company.rejection_reason && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg border bg-red-500/10 border-red-500/30">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-400">Rejection Reason</p>
            <p className="text-sm text-red-300 mt-1">{company.rejection_reason}</p>
            {company.reviewed_at && (
              <p className="text-xs text-red-400/70 mt-2">
                {new Date(company.reviewed_at).toLocaleDateString('ko-KR')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Company Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
              {company.logo_url ? (
                <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-muted-foreground">{company.name[0]}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-serif font-semibold">{company.name}</h2>
              <p className="text-muted-foreground mt-1">{company.short_description}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary">{company.category}</Badge>
                <Badge variant="outline">{company.stage}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                {company.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> {company.location}
                  </span>
                )}
                {company.founded_at && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Founded {company.founded_at}
                  </span>
                )}
                {company.employee_count && (
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> {company.employee_count} employees
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      {company.description && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3">About</h3>
            <p className="text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
              {company.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Intro Video */}
      {videos.length > 0 && videos[0].video_url && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Play className="w-4 h-4" />
              Introduction Video
            </h3>
            <div className="aspect-video rounded-lg overflow-hidden bg-secondary">
              <iframe
                src={
                  videos[0].video_url.includes('youtube.com')
                    ? videos[0].video_url.replace('watch?v=', 'embed/')
                    : videos[0].video_url.includes('vimeo.com')
                      ? videos[0].video_url.replace('vimeo.com', 'player.vimeo.com/video')
                      : videos[0].video_url
                }
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Links */}
      {linkButtons.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3">Links</h3>
            <div className="flex flex-wrap gap-3">
              {linkButtons.map((l) => (
                <a
                  key={l.label}
                  href={l.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm"
                >
                  <l.icon className="w-4 h-4" />
                  {l.label}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* IR Deck */}
      {company.deck_url && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3">IR Deck</h3>
            <a
              href={company.deck_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <FileText className="w-4 h-4" />
              View IR Deck
            </a>
          </CardContent>
        </Card>
      )}

      {/* Team */}
      {executives.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Leadership Team</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {executives.map((exec) => (
                <div key={exec.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                    {exec.photo_url ? (
                      <img src={exec.photo_url} alt={exec.name} className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{exec.name}</p>
                    <p className="text-xs text-muted-foreground">{exec.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Q&A */}
      {qna.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Investor Q&A
            </h3>
            <div className="space-y-4">
              {qna.map((item) => (
                <div key={item.id} className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <div className="flex items-start gap-2 mb-2">
                    <Badge variant="outline" className="text-xs flex-shrink-0">{item.category}</Badge>
                  </div>
                  <p className="font-medium text-sm mb-2">{item.question}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.answer}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Integrations & Metrics */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Integrations</h3>
            <div className="flex gap-3">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${company.stripe_connected ? 'bg-green-500/10 text-green-400' : 'bg-secondary text-muted-foreground'}`}>
                {company.stripe_connected ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                Stripe
              </div>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${company.ga4_connected ? 'bg-green-500/10 text-green-400' : 'bg-secondary text-muted-foreground'}`}>
                {company.ga4_connected ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                GA4
              </div>
            </div>
          </div>

          {(() => {
            const stripeMetrics = metrics.filter((m) => m.source === 'stripe' && m.revenue != null);
            const ga4Metrics = metrics.filter((m) => m.source === 'ga4' && m.mau != null);
            const hasCharts = stripeMetrics.length > 0 || ga4Metrics.length > 0;

            if (!hasCharts) {
              if (!company.stripe_connected && !company.ga4_connected) {
                return (
                  <p className="text-sm text-muted-foreground">
                    Connect Stripe or Google Analytics to view your business metrics here.
                  </p>
                );
              }
              return (
                <p className="text-sm text-muted-foreground">
                  Connected but no metrics data yet. Metrics will appear once synced.
                </p>
              );
            }

            const latestStripe = stripeMetrics[stripeMetrics.length - 1];
            const latestGA4 = ga4Metrics[ga4Metrics.length - 1];

            return (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {latestStripe && (
                    <>
                      <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                        <p className="text-xs text-muted-foreground mb-0.5">Latest MRR</p>
                        <p className="font-semibold text-lg">${latestStripe.revenue!.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{latestStripe.month}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                        <p className="text-xs text-muted-foreground mb-0.5">Total Revenue</p>
                        <p className="font-semibold text-lg">
                          ${stripeMetrics.reduce((s, m) => s + (m.revenue || 0), 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">{stripeMetrics.length} months</p>
                      </div>
                    </>
                  )}
                  {latestGA4 && (
                    <>
                      <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                        <p className="text-xs text-muted-foreground mb-0.5">Latest MAU</p>
                        <p className="font-semibold text-lg">{latestGA4.mau!.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{latestGA4.month}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                        <p className="text-xs text-muted-foreground mb-0.5">Avg MAU</p>
                        <p className="font-semibold text-lg">
                          {Math.round(ga4Metrics.reduce((s, m) => s + (m.mau || 0), 0) / ga4Metrics.length).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">{ga4Metrics.length} months</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Revenue Chart */}
                {stripeMetrics.length > 1 && (
                  <div>
                    <p className="text-sm font-medium mb-3">Revenue Trend</p>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stripeMetrics.map((m) => ({ month: m.month, revenue: m.revenue }))} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#635BFF" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#635BFF" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="month"
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            axisLine={{ stroke: 'hsl(var(--border))' }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                          />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#635BFF"
                            strokeWidth={2}
                            fill="url(#revenueGrad)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* MAU Chart */}
                {ga4Metrics.length > 1 && (
                  <div>
                    <p className="text-sm font-medium mb-3">Monthly Active Users</p>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={ga4Metrics.map((m) => ({ month: m.month, mau: m.mau }))} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="mauGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#F9AB00" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#F9AB00" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="month"
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            axisLine={{ stroke: 'hsl(var(--border))' }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                            formatter={(value: number) => [value.toLocaleString(), 'MAU']}
                          />
                          <Area
                            type="monotone"
                            dataKey="mau"
                            stroke="#F9AB00"
                            strokeWidth={2}
                            fill="url(#mauGrad)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
