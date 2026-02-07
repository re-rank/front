import { useEffect, lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Layout, ProtectedRoute } from '@/components/layout';
import { Home } from '@/pages';

// Lazy load pages for better initial load performance
const Login = lazy(() => import('@/pages/auth/Login').then(m => ({ default: m.Login })));
const RegisterForm = lazy(() => import('@/pages/auth/RegisterForm').then(m => ({ default: m.RegisterForm })));
const SelectRole = lazy(() => import('@/pages/auth/SelectRole').then(m => ({ default: m.SelectRole })));
const CompanyRegister = lazy(() => import('@/pages/company/CompanyRegister').then(m => ({ default: m.CompanyRegister })));
const CompanyEdit = lazy(() => import('@/pages/company/CompanyEdit').then(m => ({ default: m.CompanyEdit })));
const CompanyList = lazy(() => import('@/pages/investor/CompanyList').then(m => ({ default: m.CompanyList })));
const CompanyDetail = lazy(() => import('@/pages/investor/CompanyDetail').then(m => ({ default: m.CompanyDetail })));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const StartupDashboard = lazy(() => import('@/pages/company/StartupDashboard').then(m => ({ default: m.StartupDashboard })));
const OAuthCallback = lazy(() => import('@/pages/auth/OAuthCallback').then(m => ({ default: m.OAuthCallback })));
const Terms = lazy(() => import('@/pages/legal/Terms').then(m => ({ default: m.Terms })));
const Privacy = lazy(() => import('@/pages/legal/Privacy').then(m => ({ default: m.Privacy })));
const Policies = lazy(() => import('@/pages/legal/Policies').then(m => ({ default: m.Policies })));

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-background">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

// Auth loading skeleton - shows page structure while checking auth
function AuthLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-16 border-b border-border bg-background" />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-4 bg-muted rounded w-72" />
          <div className="h-10 bg-muted rounded w-full mt-6" />
          <div className="space-y-3 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Redirect logged-in users without a role to /select-role */
function RequireRole({ children }: { children: React.ReactNode }) {
  const { user, isLoading, getRole, setLoading } = useAuthStore();
  const location = useLocation();
  const role = getRole();
  const [timedOut, setTimedOut] = useState(false);

  // Timeout for auth loading - redirect after 2s if still loading
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      setTimedOut(true);
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [isLoading, setLoading]);

  // Public pages - show immediately
  const publicPaths = ['/', '/login', '/register/company', '/register/member', '/oauth/callback', '/terms', '/privacy', '/policies'];
  if (publicPaths.includes(location.pathname)) {
    return <>{children}</>;
  }

  // Protected routes - redirect to login if not authenticated or timed out
  if ((!isLoading && !user) || (timedOut && !user)) {
    return <Navigate to="/login" replace />;
  }

  // Show skeleton while checking auth
  if (isLoading) {
    return <AuthLoadingSkeleton />;
  }

  const allowedWithoutRole = ['/select-role', '/login', '/register', '/register/company', '/register/member'];
  if (user && !role && !allowedWithoutRole.includes(location.pathname)) {
    return <Navigate to="/select-role" replace />;
  }

  return <>{children}</>;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function AppContent() {
  const { setUser, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    let cancelled = false;

    // Safety timeout: force loading to false if auth takes too long
    const timeout = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 3000);

    // Get initial session
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;

        // 서버에서 유저 존재 여부를 검증
        if (session?.user) {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (cancelled) return;

          if (userError || !user) {
            // 유저가 삭제됨 → 세션 정리
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
            return;
          }

          setUser(user);
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          if (cancelled) return;
          setProfile(data);
        } else {
          setUser(null);
        }
      } catch {
        // session/profile fetch failed
      } finally {
        clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      }
    })();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;

      if (session?.user) {
        // 서버에서 유저 존재 여부 검증
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (cancelled) return;

        if (userError || !user) {
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          if (!cancelled) setLoading(false);
          return;
        }

        setUser(user);

        // Google OAuth 회원가입 시 저장된 role 자동 적용
        const pendingRole = localStorage.getItem('pending_oauth_role');
        if (pendingRole && (pendingRole === 'startup' || pendingRole === 'investor')) {
          localStorage.removeItem('pending_oauth_role');

          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          if (cancelled) return;

          // 기존 프로필이 없거나 role이 없는 경우에만 설정
          if (!existingProfile?.role) {
            const { data: newProfile } = await supabase
              .from('profiles')
              .upsert(
                {
                  id: user.id,
                  email: user.email!,
                  role: pendingRole,
                  full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
                  avatar_url: user.user_metadata?.avatar_url || null,
                },
                { onConflict: 'id' }
              )
              .select()
              .single();
            if (cancelled) return;
            await supabase.auth.updateUser({ data: { role: pendingRole } });
            setProfile(newProfile);
            if (!cancelled) setLoading(false);
            return;
          }
        }

        try {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          if (cancelled) return;
          setProfile(data);
        } catch {
          // Continue even if profile fetch fails
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [setUser, setProfile, setLoading]);

  return (
    <BrowserRouter>
      <RequireRole>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<Layout />}>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register/company" element={<RegisterForm role="startup" />} />
              <Route path="/register/member" element={<RegisterForm role="investor" />} />
              <Route path="/select-role" element={<SelectRole />} />
              <Route path="/oauth/callback" element={<OAuthCallback />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/policies" element={<Policies />} />

            {/* Investor routes */}
            <Route element={<ProtectedRoute allowedRoles={['investor', 'admin']} />}>
              <Route path="/companies" element={<CompanyList />} />
              <Route path="/companies/:id" element={<CompanyDetail />} />
            </Route>

            {/* Admin routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            {/* Startup routes */}
            <Route element={<ProtectedRoute allowedRoles={['startup', 'admin']} />}>
              <Route path="/dashboard" element={<StartupDashboard />} />
              <Route path="/company/register" element={<CompanyRegister />} />
              <Route path="/company/edit" element={<CompanyEdit />} />
            </Route>
          </Route>
          </Routes>
        </Suspense>
      </RequireRole>
    </BrowserRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
