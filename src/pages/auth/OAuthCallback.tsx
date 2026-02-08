import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Loader2 } from 'lucide-react';
import { processOAuthCallback, type OAuthCallbackResult } from '@/lib/integrations';
import { supabase } from '@/lib/supabase';
import { Button, Card, CardContent } from '@/components/ui';

type ProcessingStatus = 'processing' | 'syncing' | 'success' | 'error';

export function OAuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ProcessingStatus>('processing');
  const [result, setResult] = useState<OAuthCallbackResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    async function handleCallback() {
      const callbackResult = processOAuthCallback();
      setResult(callbackResult);

      if (!callbackResult.success) {
        setStatus('error');
        setErrorMessage(callbackResult.error || 'OAuth authentication failed');
        return;
      }

      try {
        // Store basic integration info
        const integrations = JSON.parse(localStorage.getItem('pending_integrations') || '{}');
        integrations[callbackResult.provider!] = {
          code: callbackResult.code,
          timestamp: Date.now(),
          status: 'connected',
        };

        // Determine redirect path: check if company exists
        let redirectPath = callbackResult.returnPath || '/company/register';
        const { data: { session } } = await supabase.auth.getSession();

        let companyId: string | undefined;
        if (session) {
          const { data: companyRows } = await supabase
            .from('companies')
            .select('id')
            .eq('user_id', session.user.id)
            .limit(1);

          companyId = companyRows?.[0]?.id;
          if (companyId) {
            redirectPath = '/company/edit';
          }
        }

        // Always call sync-metrics: with companyId (save mode) or without (preview mode)
        setStatus('syncing');
        const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
        const redirectUri = `${baseUrl}/oauth/callback`;
        try {
          const syncResult = await Promise.race([
            supabase.functions.invoke('sync-metrics', {
              body: {
                ...(companyId ? { companyId } : {}),
                provider: callbackResult.provider,
                code: callbackResult.code,
                redirectUri,
              },
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Sync timed out')), 15000)
            ),
          ]);

          // supabase.functions.invoke returns { data, error } — handle both
          if (syncResult.error) {
            console.warn('sync-metrics error:', syncResult.error);
            integrations[callbackResult.provider!].syncError = syncResult.error.message || 'Edge Function error';
          } else {
            // data may be string or object depending on client version
            const parsed = typeof syncResult.data === 'string'
              ? JSON.parse(syncResult.data)
              : syncResult.data;
            if (parsed?.metrics?.length) {
              integrations[callbackResult.provider!].metrics = parsed.metrics;
            } else if (parsed?.error) {
              integrations[callbackResult.provider!].syncError = parsed.error;
            }
          }
        } catch (syncErr) {
          console.warn('Metrics sync failed (non-blocking):', syncErr);
          integrations[callbackResult.provider!].syncError =
            syncErr instanceof Error ? syncErr.message : 'Sync failed';
        }

        localStorage.setItem('pending_integrations', JSON.stringify(integrations));
        setStatus('success');

        setTimeout(() => {
          navigate(redirectPath, { replace: true });
        }, 2000);
      } catch (err) {
        console.error('Failed to process OAuth callback:', err);
        // Still mark as connected even if sync fails
        const integrations = JSON.parse(localStorage.getItem('pending_integrations') || '{}');
        integrations[callbackResult.provider!] = {
          code: callbackResult.code,
          timestamp: Date.now(),
          status: 'connected',
        };
        localStorage.setItem('pending_integrations', JSON.stringify(integrations));

        setStatus('success');
        setTimeout(() => {
          // Fallback: check returnPath, default to dashboard
          navigate(callbackResult.returnPath || '/dashboard', { replace: true });
        }, 2000);
      }
    }

    handleCallback();
  }, [navigate]);

  const providerName = result?.provider === 'stripe' ? 'Stripe' : 'Google Analytics';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {(status === 'processing' || status === 'syncing') && (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h2 className="text-xl font-semibold mb-2">
                {status === 'processing' ? 'Processing' : 'Syncing Metrics'}
              </h2>
              <p className="text-muted-foreground">
                {status === 'processing'
                  ? 'Connecting your account...'
                  : `Fetching your ${providerName} data...`}
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Connected!</h2>
              <p className="text-muted-foreground mb-4">
                {providerName} has been successfully connected.
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting you back...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Connection Failed</h2>
              <p className="text-muted-foreground mb-4">
                {errorMessage}
              </p>
              <Button
                onClick={() => navigate(result?.returnPath || '/company/register', { replace: true })}
              >
                Go Back
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
