import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth.js';

export function RequireAuth({ children }) {
  const { isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <p className="py-10 text-center text-sm text-parchment/55">Checking your account...</p>;
  }

  if (!user) {
    return <Navigate replace state={{ from: `${location.pathname}${location.search}` }} to="/auth/login" />;
  }

  return children;
}
