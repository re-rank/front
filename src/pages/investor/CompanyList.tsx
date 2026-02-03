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
import { Button, Select } from '@/components/ui';
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

  // Generate abbreviation for company logo placeholder
  const getAbbreviation = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-serif text-foreground mb-2">Discover Startups</h1>
        <p className="text-muted-foreground">
          Browse companies with real-time Stripe & GA4 metrics
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
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
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={showSavedOnly ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setShowSavedOnly(!showSavedOnly)}
            className="h-11 px-4 gap-2"
          >
            <BookmarkCheck className="w-4 h-4" />
            Saved ({savedCompanies.size})
          </Button>
          <div className="flex items-center gap-2 h-11 px-3 bg-secondary/50 border border-border rounded-lg">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select
              options={categoryOptions}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border-0 bg-transparent h-9 min-w-[140px]"
            />
          </div>
          <Select
            options={stageOptions}
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="h-11 min-w-[120px]"
          />
        </div>
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground mb-6">
        {filteredCompanies.length} companies found
      </p>

      {/* Company List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="text-center py-16 border border-border rounded-xl bg-card">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2 text-foreground">No companies found</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          {filteredCompanies.map((company, index) => (
            <div
              key={company.id}
              className={`flex items-start gap-4 p-5 hover:bg-secondary/30 transition-colors cursor-pointer group ${
                index !== filteredCompanies.length - 1 ? 'border-b border-border' : ''
              }`}
              onClick={() => handleView(company.id)}
            >
              {/* Company Logo */}
              <div className="w-14 h-14 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                {company.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={company.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-medium text-neutral-400">
                    {getAbbreviation(company.name)}
                  </span>
                )}
              </div>

              {/* Company Info */}
              <div className="flex-1 min-w-0">
                {/* Name & Location */}
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {company.name}
                  </h3>
                  {company.location && (
                    <span className="text-muted-foreground text-sm">
                      {company.location}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-muted-foreground text-sm mb-3 line-clamp-1">
                  {company.short_description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap items-center gap-2">
                  {company.founded_at && (
                    <span className="px-2.5 py-1 text-xs font-medium text-muted-foreground border border-border rounded-md">
                      {company.founded_at}
                    </span>
                  )}
                  {company.category && (
                    <span className="px-2.5 py-1 text-xs font-medium text-muted-foreground border border-border rounded-md uppercase">
                      {company.category}
                    </span>
                  )}
                  {company.stage && (
                    <span className="px-2.5 py-1 text-xs font-medium text-muted-foreground border border-border rounded-md uppercase">
                      {company.stage}
                    </span>
                  )}
                </div>
              </div>

              {/* Save Button - visible on hover */}
              <button
                className="flex-shrink-0 p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all"
                onClick={(e) => toggleSaveCompany(company.id, e)}
              >
                {savedCompanies.has(company.id) ? (
                  <BookmarkCheck className="w-5 h-5 text-primary" />
                ) : (
                  <Bookmark className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
