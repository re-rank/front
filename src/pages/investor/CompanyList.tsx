import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Calendar,
  Users,
  Search,
  MapPin,
  Bookmark,
  BookmarkCheck,
  Filter,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Badge, Button, Select } from '@/components/ui';
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

export function CompanyList() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [stage, setStage] = useState('');
  const [employeeCount, setEmployeeCount] = useState('');
  const [savedCompanies, setSavedCompanies] = useState<Set<string>>(new Set());
  const [showSavedOnly, setShowSavedOnly] = useState(false);

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

  const toggleSaveCompany = (companyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedCompanies((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(companyId)) {
        newSet.delete(companyId);
      } else {
        newSet.add(companyId);
      }
      return newSet;
    });
  };

  const filteredCompanies = companies.filter((company) => {
    const matchesSearch =
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (company.short_description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesSaved = !showSavedOnly || savedCompanies.has(company.id);
    return matchesSearch && matchesSaved;
  });

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
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      {/* Header */}
      <div className="mb-8 space-y-4">
        <h1 className="text-3xl font-serif">Discover Startups</h1>
        <p className="text-muted-foreground text-sm">
          Browse companies with real-time Stripe & GA4 metrics
        </p>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-secondary border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button
              variant={showSavedOnly ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setShowSavedOnly(!showSavedOnly)}
              className="gap-2"
            >
              <BookmarkCheck className="w-4 h-4" />
              Saved ({savedCompanies.size})
            </Button>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select
                options={categoryOptions}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <Select
              options={stageOptions}
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-[140px]"
            />
            <Select
              options={employeeOptions}
              value={employeeCount}
              onChange={(e) => setEmployeeCount(e.target.value)}
              className="w-[140px]"
            />
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {filteredCompanies.length} companies found
        </p>
      </div>

      {/* Company List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No companies found</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border border border-border rounded-xl bg-card overflow-hidden">
          {filteredCompanies.map((company) => (
            <div
              key={company.id}
              className="flex items-start gap-5 p-5 hover:bg-secondary/50 transition-colors cursor-pointer group border-l-4 border-l-transparent hover:border-l-primary"
              onClick={() => handleView(company.id)}
            >
              {/* Company Logo */}
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                {company.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={company.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="w-8 h-8 text-muted-foreground" />
                )}
              </div>

              {/* Company Info */}
              <div className="flex-1 min-w-0">
                {/* Name & Location */}
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                    {company.name}
                  </h3>
                  {company.location && (
                    <span className="text-muted-foreground text-sm flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {company.location}
                    </span>
                  )}
                </div>

                {/* Tagline / Description */}
                <p className="text-foreground mt-1 line-clamp-2">{company.short_description}</p>

                {/* Tags */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {company.founded_at && (
                    <Badge variant="secondary" className="text-xs font-medium gap-1">
                      <Calendar className="w-3 h-3" />
                      {company.founded_at}
                    </Badge>
                  )}
                  {company.employee_count && (
                    <Badge variant="secondary" className="text-xs font-medium gap-1">
                      <Users className="w-3 h-3" />
                      {company.employee_count}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs font-medium uppercase">
                    {company.category}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-medium uppercase">
                    {company.stage}
                  </Badge>
                </div>
              </div>

              {/* Save Button */}
              <Button
                variant="ghost"
                size="sm"
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                onClick={(e) => toggleSaveCompany(company.id, e)}
              >
                {savedCompanies.has(company.id) ? (
                  <BookmarkCheck className="w-5 h-5 text-primary" />
                ) : (
                  <Bookmark className="w-5 h-5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
