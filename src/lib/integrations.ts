/**
 * Stripe Connect & Google Analytics 4 Integration Utilities
 */

// --- Constants ---
const STRIPE_CONNECT_BASE_URL = 'https://connect.stripe.com/oauth/authorize';
const GOOGLE_OAUTH_BASE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

// --- Types ---
export interface IntegrationState {
  provider: 'stripe' | 'ga4';
  returnPath: string;
  companyId?: string;
}

export interface StripeConnectConfig {
  clientId: string;
  redirectUri: string;
  scope?: 'read_write' | 'read_only';
}

export interface GoogleOAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes?: string[];
}

// --- Stripe Connect ---
export function getStripeConnectUrl(config: StripeConnectConfig): string {
  const state = generateState({
    provider: 'stripe',
    returnPath: window.location.pathname,
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    scope: config.scope || 'read_only',
    redirect_uri: config.redirectUri,
    state,
  });

  return `${STRIPE_CONNECT_BASE_URL}?${params.toString()}`;
}

export function initiateStripeConnect(): void {
  const clientId = import.meta.env.VITE_STRIPE_CLIENT_ID;

  if (!clientId) {
    console.error('VITE_STRIPE_CLIENT_ID is not configured');
    alert('Stripe integration is not configured. Please contact support.');
    return;
  }

  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  const redirectUri = `${baseUrl}/oauth/callback`;
  const url = getStripeConnectUrl({
    clientId,
    redirectUri,
    scope: 'read_write',
  });

  window.location.href = url;
}

// --- Google Analytics (GA4) ---
export function getGoogleOAuthUrl(config: GoogleOAuthConfig): string {
  const state = generateState({
    provider: 'ga4',
    returnPath: window.location.pathname,
  });

  const defaultScopes = [
    'https://www.googleapis.com/auth/analytics.readonly',
  ];

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: (config.scopes || defaultScopes).join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `${GOOGLE_OAUTH_BASE_URL}?${params.toString()}`;
}

export function initiateGoogleOAuth(): void {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    console.error('VITE_GOOGLE_CLIENT_ID is not configured');
    alert('Google Analytics integration is not configured. Please contact support.');
    return;
  }

  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  const redirectUri = `${baseUrl}/oauth/callback`;
  const url = getGoogleOAuthUrl({
    clientId,
    redirectUri,
  });

  window.location.href = url;
}

// --- State Management ---
function generateState(data: IntegrationState): string {
  const stateData = {
    ...data,
    nonce: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  const stateString = JSON.stringify(stateData);
  const encodedState = btoa(stateString);

  // Store in localStorage (sessionStorage is lost after cross-origin OAuth redirects)
  localStorage.setItem('oauth_state', encodedState);

  return encodedState;
}

export function parseOAuthState(state: string): IntegrationState | null {
  try {
    const storedState = localStorage.getItem('oauth_state');

    // CSRF protection: verify state matches
    if (storedState !== state) {
      console.error('OAuth state mismatch - possible CSRF attack');
      return null;
    }

    const decoded = atob(state);
    const parsed = JSON.parse(decoded);

    // Verify timestamp (state should be less than 10 minutes old)
    const tenMinutes = 10 * 60 * 1000;
    if (Date.now() - parsed.timestamp > tenMinutes) {
      console.error('OAuth state expired');
      return null;
    }

    // Clear stored state
    localStorage.removeItem('oauth_state');

    return {
      provider: parsed.provider,
      returnPath: parsed.returnPath,
      companyId: parsed.companyId,
    };
  } catch (error) {
    console.error('Failed to parse OAuth state:', error);
    return null;
  }
}

// --- OAuth Callback Processing ---
export interface OAuthCallbackResult {
  success: boolean;
  provider: 'stripe' | 'ga4' | null;
  code?: string;
  error?: string;
  returnPath?: string;
}

export function processOAuthCallback(): OAuthCallbackResult {
  const params = new URLSearchParams(window.location.search);

  const code = params.get('code');
  const state = params.get('state');
  const error = params.get('error');
  const errorDescription = params.get('error_description');

  // Handle error from OAuth provider
  if (error) {
    return {
      success: false,
      provider: null,
      error: errorDescription || error,
    };
  }

  // Validate state and code
  if (!state || !code) {
    return {
      success: false,
      provider: null,
      error: 'Missing required OAuth parameters',
    };
  }

  // Parse and validate state
  const stateData = parseOAuthState(state);
  if (!stateData) {
    return {
      success: false,
      provider: null,
      error: 'Invalid or expired OAuth state',
    };
  }

  return {
    success: true,
    provider: stateData.provider,
    code,
    returnPath: stateData.returnPath,
  };
}
