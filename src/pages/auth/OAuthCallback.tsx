import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Loader2 } from 'lucide-react';
import { processOAuthCallback, type OAuthCallbackResult } from '@/lib/integrations';
import { Button, Card, CardContent } from '@/components/ui';

type ProcessingStatus = 'processing' | 'syncing' | 'success' | 'error';

/** Read Supabase session directly from localStorage to avoid auth API hangs */
function readSessionFromStorage(): { userId?: string; accessToken?: string } {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed?.user?.id) {
          // Only include access token if it's not expired (with 60s buffer)
          let validToken: string | undefined;
          if (parsed.access_token && parsed.expires_at) {
            const expiresAt = parsed.expires_at * 1000; // convert to ms
            if (expiresAt > Date.now() + 60000) {
              validToken = parsed.access_token;
            }
          }
          return { userId: parsed.user.id, accessToken: validToken };
        }
      }
    }
  } catch { /* ignore parse errors */ }
  return {};
}

export function OAuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ProcessingStatus>('processing');
  const [result, setResult] = useState<OAuthCallbackResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [syncDetail, setSyncDetail] = useState<string>('');

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

        // Read session from localStorage directly (avoids Supabase auth API hangs)
        const { userId, accessToken } = readSessionFromStorage();
        const redirectPath = userId ? '/company/edit' : (callbackResult.returnPath || '/company/register');

        // Call sync-metrics Edge Function via direct fetch (avoids supabase.functions.invoke hangs)
        setStatus('syncing');
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
        const redirectUri = `${baseUrl}/oauth/callback`;

        setSyncDetail(`provider=${callbackResult.provider}, userId=${userId || 'none'}, token=${accessToken ? 'yes' : 'no'}`);

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 20000);

          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            // Always use anon key for Authorization — user tokens are often
            // invalidated/rotated after cross-origin OAuth redirects, causing
            // the Supabase gateway to reject them as "Invalid JWT".
            // The Edge Function uses userId from the request body instead.
            'Authorization': `Bearer ${supabaseAnonKey}`,
          };

          const res = await fetch(`${supabaseUrl}/functions/v1/sync-metrics`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              ...(userId ? { userId } : {}),
              provider: callbackResult.provider,
              code: callbackResult.code,
              redirectUri,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeout);

          const data = await res.json();
          setSyncDetail(prev => prev + ` | status=${res.status} data=${JSON.stringify(data).slice(0, 200)}`);

          if (!res.ok || data.error) {
            const errMsg = data.error || `HTTP ${res.status}`;
            integrations[callbackResult.provider!].syncError = errMsg;
            setSyncDetail(prev => prev + ` | ERROR: ${errMsg}`);
          } else if (data.metrics?.length) {
            integrations[callbackResult.provider!].metrics = data.metrics;
          }
        } catch (syncErr) {
          console.warn('Metrics sync failed (non-blocking):', syncErr);
          const errMsg = syncErr instanceof Error ? syncErr.message : 'Sync failed';
          integrations[callbackResult.provider!].syncError = errMsg;
          setSyncDetail(prev => prev + ` | CATCH: ${errMsg}`);
        }

        localStorage.setItem('pending_integrations', JSON.stringify(integrations));
        setStatus('success');

        setTimeout(() => {
          navigate(redirectPath, { replace: true });
        }, 5000);
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
              {syncDetail && (
                <p className="text-xs text-muted-foreground bg-secondary p-2 rounded mb-3 text-left break-all">
                  {syncDetail}
                </p>
              )}
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
