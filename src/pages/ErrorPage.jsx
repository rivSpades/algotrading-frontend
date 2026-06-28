/**
 * Error Page Component
 * Displays route errors
 */

import { useRouteError, Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export default function ErrorPage() {
  const error = useRouteError();

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="max-w-md w-full bg-surface rounded-lg shadow-lg p-8 text-center">
        <AlertCircle className="w-16 h-16 text-loss mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-ink mb-2">Oops!</h1>
        <p className="text-ink-secondary mb-4">
          {error?.statusText || error?.message || 'An unexpected error occurred'}
        </p>
        {error?.status && (
          <p className="text-sm text-ink-tertiary mb-6">Status: {error.status}</p>
        )}
        <Link
          to="/"
          className="inline-block px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}

