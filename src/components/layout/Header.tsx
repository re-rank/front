import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export function Header() {
  const { user, profile, logout, getRole } = useAuthStore();
  const role = getRole();

  const handleLogout = () => {
    // 1) zustand persist & Supabase 로컬 토큰 즉시 제거
    logout();
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('sb-') || key === 'auth-storage') {
        localStorage.removeItem(key);
      }
    });
    // 2) Supabase signOut (비동기, 실패해도 무관)
    supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    // 3) 전체 페이지 리로드로 상태 초기화
    window.location.replace('/');
  };

  return (
    <header className="bg-warm-50 border-b border-warm-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="IV" className="h-8 w-auto" />
          </Link>

          <nav className="flex items-center gap-4">
            {user ? (
              <>
                {role === 'investor' && (
                  <Link to="/companies" className="text-warm-600 hover:text-warm-900">
                    스타트업 탐색
                  </Link>
                )}
                {role === 'startup' && (
                  <Link to="/dashboard" className="text-warm-600 hover:text-warm-900">
                    대시보드
                  </Link>
                )}
                <div className="flex items-center gap-3 ml-4">
                  <span className="text-sm text-warm-600">{profile?.full_name || user.email}</span>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    로그아웃
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">로그인</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">회원가입</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
