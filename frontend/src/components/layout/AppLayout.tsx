import { Outlet } from 'react-router-dom';

import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-[#F7F8FA]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col pl-64">
        <Header />
        <main className="min-w-0 flex-1 overflow-hidden p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
