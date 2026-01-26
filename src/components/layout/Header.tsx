import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export function Header() {
  const { user, profile, logout } = useAuthStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">FB</span>
            </div>
            <span className="font-bold text-xl text-gray-900">FundBridge</span>
          </Link>

          <nav className="flex items-center gap-4">
            {user ? (
              <>
                {profile?.role === 'investor' && (
                  <Link to="/companies" className="text-gray-600 hover:text-gray-900">
                    스타트업 탐색
                  </Link>
                )}
                {profile?.role === 'startup' && (
                  <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
                    대시보드
                  </Link>
                )}
                <div className="flex items-center gap-3 ml-4">
                  <span className="text-sm text-gray-600">{profile?.full_name || user.email}</span>
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
