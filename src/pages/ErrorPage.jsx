/**
 * Error Page Component
 * Displays route errors
 */

import { useRouteError, Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export default function ErrorPage() {
  const error = useRouteError();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h1>
        <p className="text-gray-600 mb-4">
          {error?.statusText || error?.message || 'An unexpected error occurred'}
        </p>
        {error?.status && (
          <p className="text-sm text-gray-500 mb-6">Status: {error.status}</p>
        )}
        <Link
          to="/"
          className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}

