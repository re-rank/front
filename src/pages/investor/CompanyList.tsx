import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Search,
  Bookmark,
  BookmarkCheck,
  Filter,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Button, Badge, Select } from '@/components/ui';
import type { Company, CompanyCategory, CompanyStage } from '@/types/database';

const categoryOptions = [
  { value: '', label: 'All Categories' },
  { value: 'AI/ML', label: 'AI / Machine Learning' },
  { value: 'Fintech', label: 'Fintech' },
  { value: 'Edtech', label: 'Edtech' },
  { value: 'CleanTech', label: 'CleanTech' },
  { value: 'HealthTech', label: 'Healthcare' },
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

export function CompanyList() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [stage, setStage] = useState('');
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
  }, [category, stage]);

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
    <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      {/* Header */}
      <div className="mb-8 space-y-4">
        <h1 className="text-3xl font-serif">Discover Startups</h1>
        <p className="text-muted-foreground text-sm">
          Browse companies with real-time Stripe & GA4 metrics
        </p>

        {/* Search and Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-secondary/50 border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors"
            />
          </div>
          <Button
            variant={showSavedOnly ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setShowSavedOnly(!showSavedOnly)}
            className="h-11 gap-2 flex-shrink-0"
          >
            <BookmarkCheck className="w-4 h-4" />
            Saved ({savedCompanies.size})
          </Button>
          <div className="flex items-center gap-2 h-11 px-3 rounded-lg border bg-secondary/50 border-border flex-shrink-0">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select
              options={categoryOptions}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border-0 bg-transparent h-9 min-w-[130px] shadow-none focus:ring-0"
            />
          </div>
          <Select
            options={stageOptions}
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="h-11 w-[150px] bg-secondary/50 border-border rounded-lg flex-shrink-0"
          />
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
        <div className="text-center py-16 border border-border rounded-lg bg-card">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2 text-foreground">No companies found</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border border border-border rounded-lg bg-card">
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
                    <span className="text-muted-foreground text-sm">
                      {company.location}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-foreground mt-1">
                  {company.short_description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {company.founded_at && (
                    <Badge variant="secondary" className="text-xs font-medium bg-secondary/80 border-0">
                      {company.founded_at}
                    </Badge>
                  )}
                  {company.category && (
                    <Badge variant="outline" className="text-xs font-medium uppercase bg-transparent">
                      {company.category === 'AI/ML' ? 'AI / Machine Learning' : company.category}
                    </Badge>
                  )}
                  {company.stage && (
                    <Badge variant="outline" className="text-xs font-medium uppercase bg-transparent">
                      {company.stage}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <button
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-md hover:bg-accent hover:text-accent-foreground"
                onClick={(e) => toggleSaveCompany(company.id, e)}
              >
                {savedCompanies.has(company.id) ? (
                  <BookmarkCheck className="w-5 h-5 text-primary" />
                ) : (
                  <Bookmark className="w-5 h-5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
