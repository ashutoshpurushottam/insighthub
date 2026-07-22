import {
  Activity,
  BarChart3,
  Calendar,
  Database,
  Filter,
  FolderOpen,
  KeyRound,
  LayoutDashboard,
  Layers,
  ListChecks,
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
  permission?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard },
      { label: 'Dashboards', href: '/dashboards', icon: Layers },
    ],
  },
  {
    title: 'Reports',
    items: [
      { label: 'Reports', href: '/reports', icon: BarChart3, permission: 'view_reports' },
      { label: 'Report Groups', href: '/report-groups', icon: FolderOpen, permission: 'configure_report_groups' },
      { label: 'Datasources', href: '/datasources', icon: Database, permission: 'configure_datasources' },
    ],
  },
  {
    title: 'Admin',
    items: [
      { label: 'Users', href: '/users', icon: Users, permission: 'configure_users' },
      { label: 'User Groups', href: '/user-groups', icon: Users2, permission: 'configure_user_groups' },
      { label: 'Roles', href: '/roles', icon: Shield, permission: 'configure_roles' },
      { label: 'Access Rights', href: '/access-rights', icon: KeyRound, permission: 'configure_access_rights' },
      { label: 'Rules', href: '/rules', icon: Filter, permission: 'configure_rules' },
      { label: 'Rule Values', href: '/rule-values', icon: ListChecks, permission: 'configure_rules' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Schedules', href: '/schedules', icon: Calendar, permission: 'configure_schedules' },
      { label: 'Jobs', href: '/jobs', icon: Settings, permission: 'configure_jobs' },
      { label: 'Running Jobs', href: '/jobs/running', icon: Activity, permission: 'configure_jobs' },
      { label: 'SMTP Servers', href: '/smtp-servers', icon: Mail, permission: 'configure_smtp_servers' },
      { label: 'Encryptors', href: '/encryptors', icon: Lock, permission: 'configure_encryptors' },
    ],
  },
];

export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const permissions = user?.permissions ?? [];
  const isAdmin = (user?.accessLevel ?? 0) >= 10;

  const filterItems = (items: NavItem[]) =>
    items.filter((item) => {
      if (!item.permission) return true;
      if (isAdmin) return true;
      return permissions.includes(item.permission);
    });

  return (
    <aside className="fixed inset-y-0 left-0 z-10 flex w-64 flex-col bg-[#0D0B2A]">
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 via-accent-500 to-accent-400 shadow-lg shadow-accent-500/20">
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-white">
            InsightHub
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {navSections.map((section, index) => {
          const visibleItems = filterItems(section.items);
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title}>
              {index > 0 && (
                <div className="mx-3 my-3 border-t border-white/[0.04]" />
              )}
              <p className="mb-1 px-3 pt-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    end={item.href === '/'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200',
                        isActive
                          ? 'border-l-2 border-primary-400 bg-white/[0.08] text-white ml-0 pl-[10px]'
                          : 'text-gray-400 hover:bg-white/[0.05] hover:text-white',
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/[0.04] px-6 py-4">
        <p className="text-[11px] text-gray-500">InsightHub v1.0</p>
        {isAdmin && (
          <p className="mt-0.5 text-[11px] font-medium text-primary-400">
            Admin
          </p>
        )}
      </div>
    </aside>
  );
}
