import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Layout, ProtectedRoute } from '@/components/layout';
import { Home, Login, Register, CompanyRegister, CompanyList, CompanyDetail } from '@/pages';
import { Button } from '@/components/ui';

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
    // Get initial session
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);

        if (session?.user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setProfile(data);
        }
      } catch {
        // session/profile fetch failed
      } finally {
        setLoading(false);
      }
    })();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setProfile(data);
        } catch {
          // profile 조회 실패해도 계속 진행
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setProfile, setLoading]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Investor routes */}
          <Route element={<ProtectedRoute allowedRoles={['investor', 'admin']} />}>
            <Route path="/companies" element={<CompanyList />} />
            <Route path="/companies/:id" element={<CompanyDetail />} />
          </Route>

          {/* Startup routes */}
          <Route element={<ProtectedRoute allowedRoles={['startup', 'admin']} />}>
            <Route
              path="/dashboard"
              element={
                <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
                  <Link to="/company/register">
                    <Button size="lg">등록하기</Button>
                  </Link>
                </div>
              }
            />
            <Route path="/company/register" element={<CompanyRegister />} />
            <Route path="/company/edit" element={<div className="p-8">회사 정보 수정 (준비 중)</div>} />
          </Route>
        </Route>
      </Routes>
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
