import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireSuperAdmin = false,
  requireAdmin = false 
}) => {
  const { user, profile, isLoading, isSuperAdmin, isAdmin } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex bg-background">
        {/* Sidebar Skeleton */}
        <div className="hidden md:flex w-64 bg-card border-e flex-col p-4 gap-4">
          <div className="h-10 bg-muted rounded animate-pulse" />
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-8 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        </div>
        {/* Content Skeleton */}
        <div className="flex-1 p-6 space-y-6">
          <div className="h-10 w-48 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Super Admin required but user is not
  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  // Admin required but user is not (employee trying to access admin page)
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
