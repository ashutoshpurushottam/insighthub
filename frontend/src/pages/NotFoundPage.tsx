import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <h1 className="text-2xl font-semibold text-gray-900">Page not found</h1>
      <p className="text-sm text-gray-500">The page you requested does not exist.</p>
      <Link to="/" className="btn-primary">
        Back to dashboard
      </Link>
    </div>
  );
}
