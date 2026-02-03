import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Calendar, Users, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, Badge, Button, Select } from '@/components/ui';
import type { Company, CompanyCategory, CompanyStage, EmployeeCount } from '@/types/database';

const categoryOptions = [
  { value: '', label: 'All Categories' },
  { value: 'AI/ML', label: 'AI/ML' },
  { value: 'Fintech', label: 'Fintech' },
  { value: 'Edtech', label: 'Edtech' },
  { value: 'CleanTech', label: 'CleanTech' },
  { value: 'HealthTech', label: 'HealthTech' },
  { value: 'E-commerce', label: 'E-commerce' },
  { value: 'SaaS', label: 'SaaS' },
  { value: 'Other', label: 'Other' },
];

const stageOptions = [
  { value: '', label: 'All Stages' },
  { value: 'Pre-seed', label: 'Pre-seed' },
  { value: 'Seed', label: 'Seed' },
  { value: 'Series A', label: 'Series A' },
  { value: 'Series B', label: 'Series B' },
  { value: 'Series C+', label: 'Series C+' },
];

const employeeOptions = [
  { value: '', label: 'All Sizes' },
  { value: '1~10', label: '1-10' },
  { value: '10~100', label: '10-100' },
  { value: '100~1000', label: '100-1,000' },
  { value: '1000~10000', label: '1,000-10,000' },
  { value: '10000+', label: '10,000+' },
];

const stageVariant: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
  'Pre-seed': 'default',
  'Seed': 'warning',
  'Series A': 'primary',
  'Series B': 'success',
  'Series C+': 'danger',
};

export function CompanyList() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [stage, setStage] = useState('');
  const [employeeCount, setEmployeeCount] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchCompanies() {
      setLoading(true);
      try {
        let query = supabase
          .from('companies')
          .select('*')
          .eq('is_visible', true)
          .order('created_at', { ascending: false });

        if (category) query = query.eq('category', category as CompanyCategory);
        if (stage) query = query.eq('stage', stage as CompanyStage);
        if (employeeCount) query = query.eq('employee_count', employeeCount as EmployeeCount);

        const { data } = await query;
        if (!cancelled) setCompanies(data ?? []);
      } catch {
        if (!cancelled) setCompanies([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCompanies();
    return () => { cancelled = true; };
  }, [category, stage, employeeCount]);

  async function handleView(companyId: string) {
    if (user) {
      await supabase.from('view_logs').insert({
        investor_id: user.id,
        company_id: companyId,
      });
    }
    navigate(`/companies/${companyId}`);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Explore Startups</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filter Panel */}
        <aside className="w-full lg:w-64 shrink-0 space-y-4">
          <Card>
            <CardContent className="space-y-4">
              <h2 className="font-semibold text-foreground">Filters</h2>
              <Select
                label="Category"
                options={categoryOptions}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
              <Select
                label="Stage"
                options={stageOptions}
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              />
              <Select
                label="Employees"
                options={employeeOptions}
                value={employeeCount}
                onChange={(e) => setEmployeeCount(e.target.value)}
              />
            </CardContent>
          </Card>
        </aside>

        {/* Company Grid */}
        <section className="flex-1">
          <p className="text-sm text-muted-foreground mb-4">
            <span className="font-semibold text-foreground">{companies.length}</span> startups
          </p>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Search className="mx-auto mb-3 h-10 w-10" />
              <p>No startups match your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map((c) => (
                <Card key={c.id} className="flex flex-col hover:shadow-md transition-shadow">
                  <CardContent className="flex-1 flex flex-col gap-3">
                    {/* Logo + Name */}
                    <div className="flex items-center gap-3">
                      {c.logo_url ? (
                        <img
                          src={c.logo_url}
                          alt={c.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-bold">
                          {c.name[0]}
                        </div>
                      )}
                      <h3 className="font-semibold text-foreground truncate">{c.name}</h3>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2">{c.short_description}</p>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {c.founded_at}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {c.employee_count}
                      </span>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="primary">{c.category}</Badge>
                      <Badge variant={stageVariant[c.stage] ?? 'default'}>{c.stage}</Badge>
                    </div>

                    {/* Button */}
                    <div className="mt-auto pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleView(c.id)}
                      >
                        <Eye className="h-4 w-4 mr-1.5" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
