import {
  Activity,
  BarChart3,
  Calendar,
  Database,
  FolderOpen,
  KeyRound,
  LayoutDashboard,
  Layers,
  Lock,
  Mail,
  Settings,
  Shield,
  Users,
  Users2,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { useAuthStore } from '@/features/auth';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string; // required permission to show this item
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Reports', href: '/reports', icon: BarChart3, permission: 'view_reports' },
  { label: 'Report Groups', href: '/report-groups', icon: FolderOpen, permission: 'configure_report_groups' },
  { label: 'Dashboards', href: '/dashboards', icon: Layers },
  { label: 'Datasources', href: '/datasources', icon: Database, permission: 'configure_datasources' },
  { label: 'Users', href: '/users', icon: Users, permission: 'configure_users' },
  { label: 'User Groups', href: '/user-groups', icon: Users2, permission: 'configure_user_groups' },
  { label: 'Roles', href: '/roles', icon: Shield, permission: 'configure_roles' },
  { label: 'Access Rights', href: '/access-rights', icon: KeyRound, permission: 'configure_access_rights' },
  { label: 'Schedules', href: '/schedules', icon: Calendar, permission: 'configure_schedules' },
  { label: 'Jobs', href: '/jobs', icon: Settings, permission: 'configure_jobs' },
  { label: 'Running Jobs', href: '/jobs/running', icon: Activity, permission: 'configure_jobs' },
  { label: 'SMTP Servers', href: '/smtp-servers', icon: Mail, permission: 'configure_smtp_servers' },
  { label: 'Encryptors', href: '/encryptors', icon: Lock, permission: 'configure_encryptors' },
];

export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const permissions = user?.permissions ?? [];
  const isAdmin = (user?.accessLevel ?? 0) >= 10;

  // Filter nav items based on user's permissions
  const visibleItems = navItems.filter((item) => {
    if (!item.permission) return true; // always show items without permission requirement
    if (isAdmin) return true; // admins see everything
    return permissions.includes(item.permission);
  });

  return (
    <aside className="fixed inset-y-0 left-0 z-10 flex w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <h1 className="text-xl font-bold text-primary-600">InsightHub</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 px-6 py-4">
        <p className="text-xs text-gray-500">InsightHub v1.0</p>
        {isAdmin && (
          <p className="text-xs text-primary-600 mt-0.5">Admin</p>
        )}
      </div>
    </aside>
  );
}
