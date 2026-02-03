import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Users,
  MapPin,
  Globe,
  Play,
  BarChart3,
  MessageSquare,
  Github,
  Linkedin,
  Youtube,
  GraduationCap,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, Badge } from '@/components/ui';
import type {
  Company,
  Executive,
  CompanyVideo,
  CompanyMetric,
  CompanyQnA,
} from '@/types/database';

// X (formerly Twitter) icon component
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

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
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-muted-foreground">
        Company not found.
      </div>
    );
  }

  const mainVideo = videos.find((v) => v.is_main);
  const extraVideos = videos.filter((v) => !v.is_main);

  const linkButtons = [
    { url: company.website_url, icon: Globe, label: 'Website' },
    { url: company.github_url, icon: Github, label: 'GitHub' },
    { url: company.linkedin_url, icon: Linkedin, label: 'LinkedIn' },
    { url: company.twitter_url, icon: XIcon, label: 'X' },
    { url: company.youtube_url, icon: Youtube, label: 'YouTube' },
  ].filter((l) => l.url);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-10">
      {/* Back */}
      <Link
        to="/companies"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Companies
      </Link>

      {/* Company Header */}
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        <div className="w-28 h-28 rounded-2xl bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl font-bold text-muted-foreground">{company.name[0]}</span>
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-4xl font-serif mb-3">{company.name}</h1>
          <p className="text-xl text-muted-foreground mb-5">{company.short_description}</p>
          <div className="flex flex-wrap gap-3 mb-4">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {company.category}
            </Badge>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {company.stage}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            {company.location && (
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {company.location}
              </span>
            )}
            {company.founded_at && (
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Founded {company.founded_at}
              </span>
            )}
            {company.employee_count && (
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {company.employee_count} employees
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Company Links */}
      {linkButtons.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {linkButtons.map((l) => (
            <a
              key={l.label}
              href={l.url!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm"
            >
              <l.icon className="w-4 h-4" />
              {l.label}
            </a>
          ))}
        </div>
      )}

      {/* Intro Video */}
      {mainVideo && (
        <section>
          <h2 className="text-2xl font-serif mb-6 flex items-center gap-3">
            <Play className="w-6 h-6" /> Company Introduction
          </h2>
          <div className="aspect-video rounded-2xl overflow-hidden bg-secondary max-w-4xl">
            <iframe
              src={mainVideo.video_url}
              title="Company Introduction"
              className="w-full h-full"
              allowFullScreen
            />
          </div>
          {mainVideo.description && (
            <p className="mt-4 text-muted-foreground">{mainVideo.description}</p>
          )}
        </section>
      )}

      {/* About */}
      <section>
        <h2 className="text-2xl font-serif mb-6">About</h2>
        <div className="prose prose-invert prose-lg max-w-none">
          <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {company.description}
          </p>
        </div>
      </section>

      {/* Leadership Team */}
      {executives.length > 0 && (
        <section>
          <h2 className="text-2xl font-serif mb-6">Leadership Team</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {executives.map((exec) => (
              <Card key={exec.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start gap-5">
                    <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                      {exec.photo_url ? (
                        <img
                          src={exec.photo_url}
                          alt={exec.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Badge variant="outline" className="text-xs mb-2">
                        {exec.role}
                      </Badge>
                      <h3 className="font-semibold text-lg">{exec.name}</h3>
                      {exec.education && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                          <GraduationCap className="w-4 h-4 flex-shrink-0" />
                          <span>{exec.education}</span>
                        </p>
                      )}
                      {exec.bio && (
                        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                          {exec.bio}
                        </p>
                      )}
                      <div className="flex gap-2 mt-4">
                        {exec.linkedin_url && (
                          <a
                            href={exec.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-xs"
                          >
                            <Linkedin className="w-3.5 h-3.5" />
                            LinkedIn
                          </a>
                        )}
                        {exec.twitter_url && (
                          <a
                            href={exec.twitter_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-xs"
                          >
                            <XIcon className="w-3.5 h-3.5" />
                            X
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Extra Videos */}
      {extraVideos.length > 0 && (
        <section>
          <h2 className="text-2xl font-serif mb-6">More Videos</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {extraVideos.map((v) => (
              <Card key={v.id}>
                <CardContent className="p-6">
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <iframe src={v.video_url} title="Video" className="w-full h-full" allowFullScreen />
                  </div>
                  {v.description && (
                    <p className="mt-3 text-sm text-muted-foreground">{v.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Business Metrics */}
      {metrics.length > 0 && (
        <section>
          <h2 className="text-2xl font-serif mb-2 flex items-center gap-3">
            <BarChart3 className="w-6 h-6" /> Business Metrics
          </h2>
          <p className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
            Verified Data
            {company.stripe_connected && <Badge variant="secondary">Stripe</Badge>}
            {company.ga4_connected && <Badge variant="secondary">GA4</Badge>}
            {company.last_data_update && (
              <span className="ml-2">Last updated: {company.last_data_update}</span>
            )}
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <MetricChart
              title="Monthly Revenue"
              data={metrics}
              dataKey="revenue"
              color="oklch(0.75 0.15 160)"
              format={(v) => `$${(v / 1000).toFixed(0)}K`}
              type="area"
            />
            <MetricChart
              title="Active Users"
              data={metrics}
              dataKey="mau"
              color="oklch(0.65 0.2 250)"
              format={(v) => v.toLocaleString()}
              type="line"
            />
            <MetricChart
              title="Retention Rate"
              data={metrics}
              dataKey="retention"
              color="oklch(0.7 0.18 30)"
              format={(v) => `${v}%`}
              type="bar"
            />
          </div>
        </section>
      )}

      {/* Q&A */}
      {qna.length > 0 && (
        <section>
          <h2 className="text-2xl font-serif mb-6 flex items-center gap-3">
            <MessageSquare className="w-6 h-6" /> Investor Q&A
          </h2>
          <div className="space-y-6">
            {qna.map((q) => (
              <Card key={q.id}>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4">{q.question}</h3>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {q.answer}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* Chart Component */
function MetricChart({
  title,
  data,
  dataKey,
  color,
  format,
  type = 'line',
}: {
  title: string;
  data: CompanyMetric[];
  dataKey: 'revenue' | 'mau' | 'retention';
  color: string;
  format: (v: number) => string;
  type?: 'line' | 'area' | 'bar';
}) {
  const filtered = data.filter((d) => d[dataKey] != null);
  if (filtered.length === 0) return null;

  const latestValue = filtered[filtered.length - 1]?.[dataKey];

  const chartStyle = {
    grid: 'oklch(0.28 0 0)',
    text: 'oklch(0.65 0 0)',
    tooltip: {
      backgroundColor: 'oklch(0.16 0 0)',
      border: '1px solid oklch(0.28 0 0)',
      borderRadius: '8px',
      color: 'oklch(0.98 0 0)',
    },
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-sm text-muted-foreground mb-2">{title}</h3>
        <p className="text-2xl font-semibold mb-4">
          {latestValue != null ? format(latestValue) : '-'}
        </p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            {type === 'area' ? (
              <AreaChart data={filtered}>
                <defs>
                  <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: chartStyle.text, fontSize: 10 }}
                  axisLine={{ stroke: chartStyle.grid }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: chartStyle.text, fontSize: 10 }}
                  axisLine={{ stroke: chartStyle.grid }}
                  tickLine={false}
                  tickFormatter={(v) => format(v)}
                />
                <Tooltip contentStyle={chartStyle.tooltip} formatter={(v) => format(v as number)} />
                <Area
                  type="monotone"
                  dataKey={dataKey}
                  stroke={color}
                  fill={`url(#gradient-${dataKey})`}
                  strokeWidth={2}
                />
              </AreaChart>
            ) : type === 'bar' ? (
              <BarChart data={filtered}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: chartStyle.text, fontSize: 10 }}
                  axisLine={{ stroke: chartStyle.grid }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: chartStyle.text, fontSize: 10 }}
                  axisLine={{ stroke: chartStyle.grid }}
                  tickLine={false}
                  tickFormatter={(v) => format(v)}
                />
                <Tooltip contentStyle={chartStyle.tooltip} formatter={(v) => format(v as number)} />
                <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={filtered}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: chartStyle.text, fontSize: 10 }}
                  axisLine={{ stroke: chartStyle.grid }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: chartStyle.text, fontSize: 10 }}
                  axisLine={{ stroke: chartStyle.grid }}
                  tickLine={false}
                  tickFormatter={(v) => format(v)}
                />
                <Tooltip contentStyle={chartStyle.tooltip} formatter={(v) => format(v as number)} />
                <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
