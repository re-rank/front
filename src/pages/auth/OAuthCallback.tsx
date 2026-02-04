import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Loader2 } from 'lucide-react';
import { processOAuthCallback, type OAuthCallbackResult } from '@/lib/integrations';
import { Button, Card, CardContent } from '@/components/ui';

type ProcessingStatus = 'processing' | 'success' | 'error';

export function OAuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ProcessingStatus>('processing');
  const [result, setResult] = useState<OAuthCallbackResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    async function handleCallback() {
      // Process OAuth callback
      const callbackResult = processOAuthCallback();
      setResult(callbackResult);

      if (!callbackResult.success) {
        setStatus('error');
        setErrorMessage(callbackResult.error || 'OAuth authentication failed');
        return;
      }

      try {
        // Store integration info in localStorage temporarily
        // The actual connection status will be saved when the company is registered
        const integrations = JSON.parse(localStorage.getItem('pending_integrations') || '{}');
        integrations[callbackResult.provider!] = {
          code: callbackResult.code,
          timestamp: Date.now(),
          status: 'connected',
        };
        localStorage.setItem('pending_integrations', JSON.stringify(integrations));

        setStatus('success');

        // Redirect back after a short delay
        setTimeout(() => {
          navigate(callbackResult.returnPath || '/company/register', { replace: true });
        }, 2000);
      } catch (err) {
        console.error('Failed to process OAuth callback:', err);
        setStatus('error');
        setErrorMessage('Failed to save integration data');
      }
    }

    handleCallback();
  }, [navigate]);

  const providerName = result?.provider === 'stripe' ? 'Stripe' : 'Google Analytics';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {status === 'processing' && (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Processing</h2>
              <p className="text-muted-foreground">
                Connecting your account...
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
