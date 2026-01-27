import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Users,
  MapPin,
  Globe,
  ExternalLink,
  Play,
  BarChart3,
  MessageSquare,
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
import { Card, CardContent, CardHeader, Badge, Button } from '@/components/ui';
import type {
  Company,
  Executive,
  CompanyVideo,
  CompanyMetric,
  CompanyQnA,
} from '@/types/database';

const qnaCategoryVariant: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
  '팀 결속력': 'primary',
  '경쟁 우위': 'success',
  '역량 결핍': 'danger',
  '인수 제안': 'warning',
  '경쟁 상황': 'default',
  '확신의 근거': 'primary',
};

export function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [videos, setVideos] = useState<CompanyVideo[]>([]);
  const [metrics, setMetrics] = useState<CompanyMetric[]>([]);
  const [qna, setQna] = useState<CompanyQnA[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    Promise.all([
      supabase.from('companies').select('*').eq('id', id).single(),
      supabase.from('executives').select('*').eq('company_id', id).order('created_at'),
      supabase.from('company_videos').select('*').eq('company_id', id).order('is_main', { ascending: false }),
      supabase.from('company_metrics').select('*').eq('company_id', id).order('month'),
      supabase.from('company_qna').select('*').eq('company_id', id).order('created_at'),
    ]).then(([companyRes, execRes, videoRes, metricRes, qnaRes]) => {
      if (cancelled) return;
      setCompany(companyRes.data);
      setExecutives(execRes.data ?? []);
      setVideos(videoRes.data ?? []);
      setMetrics(metricRes.data ?? []);
      setQna(qnaRes.data ?? []);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-warm-500">
        회사를 찾을 수 없습니다.
      </div>
    );
  }

  const mainVideo = videos.find((v) => v.is_main);
  const extraVideos = videos.filter((v) => !v.is_main);

  const linkButtons = [
    { url: company.website_url, icon: Globe, label: '웹사이트' },
    { url: company.github_url, icon: ExternalLink, label: 'GitHub' },
    { url: company.linkedin_url, icon: ExternalLink, label: 'LinkedIn' },
    { url: company.twitter_url, icon: ExternalLink, label: 'Twitter' },
    { url: company.youtube_url, icon: Play, label: 'YouTube' },
  ].filter((l) => l.url);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* 뒤로 */}
      <Link to="/companies" className="inline-flex items-center gap-1 text-sm text-warm-500 hover:text-warm-700">
        <ArrowLeft className="h-4 w-4" />
        목록으로
      </Link>

      {/* ── 헤더 ── */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="h-16 w-16 rounded-xl object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-warm-200 flex items-center justify-center text-2xl font-bold text-warm-500">
                {company.name[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-warm-900">{company.name}</h1>
              <p className="text-warm-600 mt-1">{company.short_description}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="primary">{company.category}</Badge>
                <Badge variant="warning">{company.stage}</Badge>
              </div>
            </div>
          </div>

          {/* 메타 정보 */}
          <div className="flex flex-wrap gap-4 text-sm text-warm-600">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-4 w-4" /> {company.founded_at}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-4 w-4" /> {company.employee_count}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" /> {company.location}
            </span>
          </div>

          {/* 외부 링크 */}
          {linkButtons.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {linkButtons.map((l) => (
                <a key={l.label} href={l.url!} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <l.icon className="h-4 w-4 mr-1" />
                    {l.label}
                  </Button>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 개요 ── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader><h2 className="font-semibold text-warm-900">회사 소개</h2></CardHeader>
            <CardContent>
              <p className="text-warm-700 whitespace-pre-line leading-relaxed">{company.description}</p>
            </CardContent>
          </Card>
        </div>

        {executives.length > 0 && (
          <Card>
            <CardHeader><h2 className="font-semibold text-warm-900">경영진</h2></CardHeader>
            <CardContent className="space-y-4">
              {executives.map((e) => (
                <div key={e.id} className="flex items-center gap-3">
                  {e.photo_url ? (
                    <img src={e.photo_url} alt={e.name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-warm-200 flex items-center justify-center text-sm font-bold text-warm-500">
                      {e.name[0]}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-warm-900">{e.name}</p>
                    <p className="text-xs text-warm-500">{e.role}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Pitch Video ── */}
      {videos.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-warm-900 mb-4 flex items-center gap-2">
            <Play className="h-5 w-5" /> Pitch Video
          </h2>
          {mainVideo && (
            <Card className="mb-4">
              <CardContent>
                <div className="aspect-video rounded-lg overflow-hidden bg-black">
                  <iframe
                    src={mainVideo.video_url}
                    title="Main pitch video"
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
                {mainVideo.description && (
                  <p className="mt-3 text-sm text-warm-600">{mainVideo.description}</p>
                )}
              </CardContent>
            </Card>
          )}
          {extraVideos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {extraVideos.map((v) => (
                <Card key={v.id}>
                  <CardContent>
                    <div className="aspect-video rounded-lg overflow-hidden bg-black">
                      <iframe src={v.video_url} title="Video" className="w-full h-full" allowFullScreen />
                    </div>
                    {v.description && <p className="mt-2 text-sm text-warm-600">{v.description}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── 비즈니스 지표 ── */}
      {metrics.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-warm-900 mb-1 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> 비즈니스 지표
          </h2>
          <p className="text-xs text-warm-500 mb-4">
            검증된 데이터 &middot;
            {company.stripe_connected && <Badge variant="success" className="ml-1">Stripe</Badge>}
            {company.ga4_connected && <Badge variant="success" className="ml-1">GA4</Badge>}
            {company.last_data_update && (
              <span className="ml-2">마지막 업데이트: {company.last_data_update}</span>
            )}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricChart title="월별 매출" data={metrics} dataKey="revenue" color="#6366f1" format={(v) => `₩${(v / 1_000_000).toFixed(0)}M`} />
            <MetricChart title="MAU" data={metrics} dataKey="mau" color="#10b981" format={(v) => v.toLocaleString()} />
            <MetricChart title="Retention" data={metrics} dataKey="retention" color="#f59e0b" format={(v) => `${v}%`} />
          </div>
        </section>
      )}

      {/* ── Q&A ── */}
      {qna.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-warm-900 mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> Q&A
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {qna.map((q) => (
              <Card key={q.id}>
                <CardContent className="space-y-2">
                  <Badge variant={qnaCategoryVariant[q.category] ?? 'default'}>{q.category}</Badge>
                  <p className="font-medium text-warm-900">{q.question}</p>
                  <p className="text-sm text-warm-600 whitespace-pre-line">{q.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ── 차트 컴포넌트 ── */
function MetricChart({
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
    <Card>
      <CardContent>
        <p className="text-sm font-medium text-warm-700 mb-2">{title}</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={filtered}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => format(v)} />
            <Tooltip formatter={(v: number) => format(v)} />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
