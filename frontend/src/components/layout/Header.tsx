import { LogOut, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/features/auth';

export function Header() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between bg-white px-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        {/* Breadcrumb area */}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-1.5 text-sm text-gray-600">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-primary-600">
            <UserIcon className="h-3.5 w-3.5" />
          </div>
          <span className="font-medium">{user?.fullName || user?.username}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors duration-150"
          title="Sign out"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
