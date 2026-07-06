import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-8 flex items-start justify-between pb-2">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm text-gray-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
