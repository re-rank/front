import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';

const landingNavLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Videos', href: '#videos' },
  { label: 'Team', href: '#team' },
  { label: 'News', href: '#news' },
  { label: 'Analytics', href: '#analytics' },
  { label: 'Key Questions', href: '#questions' },
];

export function Header() {
  const { user, profile, logout, getRole } = useAuthStore();
  const role = getRole();

  const handleLogout = () => {
    logout();
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('sb-') || key === 'auth-storage') {
        localStorage.removeItem(key);
      }
    });
    supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    window.location.replace('/');
  };

  // Logged out: dark header + section navigation
  if (!user) {
    return (
      <header className="bg-neutral-950 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="IV" className="h-8 w-auto" />
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              {landingNavLinks.map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  className="text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  {label}
                </a>
              ))}
            </nav>

            <Link to="/login">
              <button className="text-sm font-medium text-white border border-neutral-600 rounded-lg px-4 py-1.5 hover:bg-neutral-800 transition-colors">
                Log in
              </button>
            </Link>
          </div>
        </div>
      </header>
    );
  }

  // Logged in: light header
  return (
    <header className="bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="IV" className="h-8 w-auto" />
          </Link>

          <nav className="flex items-center gap-4">
            {role === 'admin' && (
              <Link to="/admin" className="text-muted-foreground hover:text-foreground">
                Admin
              </Link>
            )}
            {(role === 'investor' || role === 'admin') && (
              <Link to="/companies" className="text-muted-foreground hover:text-foreground">
                Explore Startups
              </Link>
            )}
            {role === 'startup' && (
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
                Dashboard
              </Link>
            )}
            <div className="flex items-center gap-3 ml-4">
              <span className="text-sm text-muted-foreground">{profile?.full_name || user.email}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Log Out
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
