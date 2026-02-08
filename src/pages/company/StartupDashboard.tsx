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

  // Safety timeout: if auth stays loading for too long, force it to complete
  useEffect(() => {
    if (!authLoading) return;
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [authLoading]);

  useEffect(() => {
    // Wait for auth to finish loading before deciding
    if (authLoading) return;

    // If no user after auth is done, stop loading
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchTimeout = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 15000);

    (async () => {
      try {
        const { data: rows } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (cancelled) return;
        const data = rows?.[0] ?? null;
        if (data) {
          setCompany(data);
          const [execRes, videoRes, qnaRes, metricsRes] = await Promise.all([
            supabase.from('executives').select('*').eq('company_id', data.id).order('created_at')
              .then(r => r, () => ({ data: null })),
            supabase.from('company_videos').select('*').eq('company_id', data.id).eq('is_main', true).limit(1)
              .then(r => r, () => ({ data: null })),
            supabase.from('company_qna').select('*').eq('company_id', data.id).order('created_at')
              .then(r => r, () => ({ data: null })),
            supabase.from('company_metrics').select('*').eq('company_id', data.id).order('month', { ascending: false }).limit(6)
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

      {/* Business Metrics */}
      {metrics.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Business Metrics</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {(() => {
                const latest = metrics[0];
                return (
                  <>
                    {latest.revenue != null && (
                      <div className="p-4 rounded-lg bg-secondary/50 border border-border text-center">
                        <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                        <p className="font-semibold text-lg">${latest.revenue.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1">{latest.month}</p>
                      </div>
                    )}
                    {latest.mau != null && (
                      <div className="p-4 rounded-lg bg-secondary/50 border border-border text-center">
                        <p className="text-xs text-muted-foreground mb-1">MAU</p>
                        <p className="font-semibold text-lg">{latest.mau.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1">{latest.month}</p>
                      </div>
                    )}
                    {latest.retention != null && (
                      <div className="p-4 rounded-lg bg-secondary/50 border border-border text-center">
                        <p className="text-xs text-muted-foreground mb-1">Retention</p>
                        <p className="font-semibold text-lg">{latest.retention}%</p>
                        <p className="text-xs text-muted-foreground mt-1">{latest.month}</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Integration Status */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-3">Integrations</h3>
          <div className="flex gap-4">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${company.stripe_connected ? 'bg-green-500/10 text-green-400' : 'bg-secondary text-muted-foreground'}`}>
              {company.stripe_connected ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              Stripe {company.stripe_connected ? 'Connected' : 'Not Connected'}
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${company.ga4_connected ? 'bg-green-500/10 text-green-400' : 'bg-secondary text-muted-foreground'}`}>
              {company.ga4_connected ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              GA4 {company.ga4_connected ? 'Connected' : 'Not Connected'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
