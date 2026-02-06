import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  FileText,
  Edit,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, Badge, Button } from '@/components/ui';
import type { Company, Executive } from '@/types/database';

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export function StartupDashboard() {
  const { user } = useAuthStore();
  const [company, setCompany] = useState<Company | null>(null);
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Get user from store or fallback to Supabase session
      let userId = user?.id;
      if (!userId) {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id;
      }
      if (!userId) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (cancelled) return;

      if (data) {
        setCompany(data);
        const { data: execs } = await supabase
          .from('executives')
          .select('*')
          .eq('company_id', data.id)
          .order('created_at');
        if (!cancelled) setExecutives(execs ?? []);
      }

      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user]);

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
  const statusInfo = company.is_visible
    ? { label: 'Approved', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle }
    : { label: 'Pending Review', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock };

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
        <Link to="/company/edit">
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </Link>
      </div>

      {/* Status Banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${statusInfo.color}`}>
        <statusInfo.icon className="w-5 h-5 flex-shrink-0" />
        <div>
          <p className="font-medium">{statusInfo.label}</p>
          <p className="text-sm opacity-80">
            {company.is_visible
              ? 'Your company is visible to investors.'
              : 'Your company profile is under review. It will be visible to investors once approved by an admin.'}
          </p>
        </div>
      </div>

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
            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {company.description}
            </p>
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
