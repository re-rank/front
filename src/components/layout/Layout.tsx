import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { useAuthStore } from '@/stores/authStore';

export function Layout() {
  const { user } = useAuthStore();

  return (
    <div className={`min-h-screen ${user ? 'bg-background' : 'bg-neutral-950'}`}>
      <Header />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
