import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
  const { user, profile, isLoading, isSuperAdmin, isAdmin, userRole, authError, retryAuth } = useAuth();
  const location = useLocation();

  // Show error state with retry button
  if (authError && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="text-center p-6">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="mb-4 text-muted-foreground">{authError}</p>
            <Button onClick={retryAuth} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              إعادة المحاولة / Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  // Block if role not loaded for admin routes
  if ((requireSuperAdmin || requireAdmin) && userRole === null) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
