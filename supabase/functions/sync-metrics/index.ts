import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  companyId?: string;   // optional: skip DB save when absent (preview mode)
  userId?: string;      // fallback: used to look up company when auth token is stale
  provider: 'stripe' | 'ga4';
  code: string;
  redirectUri: string;
}

interface MetricRow {
  company_id: string;
  month: string;
  revenue: number | null;
  mau: number | null;
  retention: number | null;
  source: 'stripe' | 'ga4';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Soft auth: try to verify, but proceed even if token is stale (OAuth redirect scenario)
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        );
        if (!authError && user) {
          userId = user.id;
        } else {
          console.warn('Auth token invalid (may be stale after OAuth redirect):', authError?.message);
        }
      } catch (e) {
        console.warn('Auth verification failed:', e);
      }
    }

    const body: SyncRequest = await req.json();
    let { companyId } = body;
    const { userId: bodyUserId, provider, code, redirectUri } = body;

    // Use auth-verified userId if available, otherwise fall back to body userId
    if (!userId && bodyUserId) {
      userId = bodyUserId;
      console.log('Using userId from request body (auth token was stale)');
    }

    if (!provider || !code || !redirectUri) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no companyId but we have userId, look up the company
    if (!companyId && userId) {
      const { data: companyRows } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', userId)
        .limit(1);
      if (companyRows?.[0]?.id) {
        companyId = companyRows[0].id;
        console.log('Resolved companyId from userId:', companyId);
      }
    }

    // If companyId provided, verify ownership only when we have a valid userId
    if (companyId && userId) {
      const { data: company } = await supabase
        .from('companies')
        .select('id, user_id')
        .eq('id', companyId)
        .eq('user_id', userId)
        .single();

      if (!company) {
        return new Response(JSON.stringify({ success: false, error: 'Company not found or not owned by user' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else if (companyId && !userId) {
      // No valid auth but companyId given — verify company exists at minimum
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('id', companyId)
        .single();

      if (!company) {
        return new Response(JSON.stringify({ success: false, error: 'Company not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fetch metrics from external API
    const placeholder = companyId || 'preview';
    let metrics: MetricRow[] = [];

    if (provider === 'stripe') {
      metrics = await syncStripeMetrics(placeholder, code, redirectUri);
    } else if (provider === 'ga4') {
      metrics = await syncGA4Metrics(placeholder, code, redirectUri);
    }

    // Only save to DB if companyId is provided
    if (companyId && metrics.length > 0) {
      // Fix company_id in metrics
      const dbMetrics = metrics.map((m) => ({ ...m, company_id: companyId }));

      for (const metric of dbMetrics) {
        const { error: upsertError } = await supabase
          .from('company_metrics')
          .upsert(metric, { onConflict: 'company_id,month,source' });
        if (upsertError) {
          console.error('Metric upsert error:', upsertError);
        }
      }

      // Update company connection status
      const connectionField = provider === 'stripe' ? 'stripe_connected' : 'ga4_connected';
      await supabase
        .from('companies')
        .update({
          [connectionField]: true,
          last_data_update: new Date().toISOString(),
        })
        .eq('id', companyId);
    }

    return new Response(
      JSON.stringify({ success: true, metrics }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('sync-metrics error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// --- Stripe: code → token → balance transactions → monthly revenue ---
async function syncStripeMetrics(
  companyId: string,
  code: string,
  _redirectUri: string
): Promise<MetricRow[]> {
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeSecretKey) throw new Error('STRIPE_SECRET_KEY not configured');

  const tokenRes = await fetch('https://connect.stripe.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_secret: stripeSecretKey,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || tokenData.error) {
    throw new Error(tokenData.error_description || tokenData.error || 'Stripe token exchange failed');
  }

  const accessToken = tokenData.access_token;
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const txRes = await fetch(
    `https://api.stripe.com/v1/balance_transactions?created[gte]=${Math.floor(sixMonthsAgo.getTime() / 1000)}&limit=100&type=charge`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const txData = await txRes.json();
  if (!txRes.ok) throw new Error('Failed to fetch Stripe transactions');

  const monthlyRevenue: Record<string, number> = {};
  for (const tx of txData.data || []) {
    const date = new Date(tx.created * 1000);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (tx.amount / 100);
  }

  return Object.entries(monthlyRevenue).map(([month, revenue]) => ({
    company_id: companyId,
    month,
    revenue,
    mau: null,
    retention: null,
    source: 'stripe' as const,
  }));
}

// --- GA4: code → token → Analytics Data API → monthly MAU ---
async function syncGA4Metrics(
  companyId: string,
  code: string,
  redirectUri: string
): Promise<MetricRow[]> {
  const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
  if (!googleClientSecret || !googleClientId) {
    throw new Error('GOOGLE_CLIENT_SECRET or GOOGLE_CLIENT_ID not configured');
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: googleClientId,
      client_secret: googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || tokenData.error) {
    throw new Error(tokenData.error_description || tokenData.error || 'Google token exchange failed');
  }

  const accessToken = tokenData.access_token;

  // Try Analytics Admin API first, fall back to Analytics Data API discovery
  let propertyId: string | null = null;

  const accountsRes = await fetch(
    'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (accountsRes.ok) {
    const accountsData = await accountsRes.json();
    const firstProperty = accountsData.accountSummaries?.[0]?.propertySummaries?.[0];
    if (firstProperty) {
      propertyId = firstProperty.property.replace('properties/', '');
      console.log('Found GA4 property via Admin API:', propertyId);
    }
  } else {
    const errBody = await accountsRes.text();
    console.warn('GA4 Admin API failed (will try fallback):', accountsRes.status, errBody);
  }

  // If Admin API failed or returned no properties, try listing accessible properties
  if (!propertyId) {
    const propsRes = await fetch(
      'https://analyticsadmin.googleapis.com/v1beta/properties?filter=parent:accounts/-',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (propsRes.ok) {
      const propsData = await propsRes.json();
      const firstProp = propsData.properties?.[0];
      if (firstProp) {
        propertyId = firstProp.name.replace('properties/', '');
        console.log('Found GA4 property via properties list:', propertyId);
      }
    } else {
      const errBody = await propsRes.text();
      console.warn('GA4 properties list failed:', propsRes.status, errBody);
    }
  }

  if (!propertyId) {
    throw new Error('No GA4 property found. Make sure Google Analytics is set up for this account.');
  }

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const reportRes = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{
          startDate: `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`,
          endDate: 'today',
        }],
        dimensions: [{ name: 'yearMonth' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
        ],
      }),
    }
  );

  const reportData = await reportRes.json();
  if (!reportRes.ok) {
    console.error('GA4 report error:', JSON.stringify(reportData));
    throw new Error(`Failed to fetch GA4 report: ${reportData.error?.message || reportRes.status}`);
  }

  const metrics: MetricRow[] = [];
  for (const row of reportData.rows || []) {
    const yearMonth = row.dimensionValues?.[0]?.value;
    if (!yearMonth) continue;
    const month = `${yearMonth.slice(0, 4)}-${yearMonth.slice(4, 6)}`;
    const mau = parseInt(row.metricValues?.[0]?.value || '0', 10);

    metrics.push({
      company_id: companyId,
      month,
      revenue: null,
      mau,
      retention: null,
      source: 'ga4' as const,
    });
  }

  return metrics;
}
