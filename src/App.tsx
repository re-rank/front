import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Layout, ProtectedRoute } from '@/components/layout';
import { Home } from '@/pages';
import { Button } from '@/components/ui';
import { Building2 } from 'lucide-react';

// Lazy load pages for better initial load performance
const Login = lazy(() => import('@/pages/auth/Login').then(m => ({ default: m.Login })));
const RegisterForm = lazy(() => import('@/pages/auth/RegisterForm').then(m => ({ default: m.RegisterForm })));
const SelectRole = lazy(() => import('@/pages/auth/SelectRole').then(m => ({ default: m.SelectRole })));
const CompanyRegister = lazy(() => import('@/pages/company/CompanyRegister').then(m => ({ default: m.CompanyRegister })));
const CompanyList = lazy(() => import('@/pages/investor/CompanyList').then(m => ({ default: m.CompanyList })));
const CompanyDetail = lazy(() => import('@/pages/investor/CompanyDetail').then(m => ({ default: m.CompanyDetail })));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

/** Redirect logged-in users without a role to /select-role */
function RequireRole({ children }: { children: React.ReactNode }) {
  const { user, isLoading, getRole } = useAuthStore();
  const location = useLocation();
  const role = getRole();

  // Public pages that don't need to wait for auth
  const publicPaths = ['/', '/login', '/register/company', '/register/member'];
  const isPublicPage = publicPaths.includes(location.pathname);

  // Show public pages immediately without waiting for auth
  if (isPublicPage && isLoading) {
    return <>{children}</>;
  }

  // For protected routes, wait for auth check
  if (isLoading) return null;

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

    // Get initial session
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        setUser(session?.user ?? null);

        if (session?.user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (cancelled) return;
          setProfile(data);
        }
      } catch {
        // session/profile fetch failed
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);

      if (session?.user) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (cancelled) return;
          setProfile(data);
        } catch {
          // Continue even if profile fetch fails
        }
      } else {
        setProfile(null);
      }
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
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
              <Route
                path="/dashboard"
                element={
                  <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center gap-4 text-center px-4">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-2">
                      <Building2 className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground">No company registered yet</h2>
                    <p className="text-muted-foreground max-w-md">
                      You haven't registered a company yet. Get started by creating your company profile to showcase to investors.
                    </p>
                    <Link to="/company/register">
                      <Button size="lg">Register Company</Button>
                    </Link>
                  </div>
                }
              />
              <Route path="/company/register" element={<CompanyRegister />} />
              <Route path="/company/edit" element={<div className="p-8">Edit Company Info (Coming Soon)</div>} />
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
