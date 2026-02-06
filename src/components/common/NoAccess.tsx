import React from 'react';
import { AlertTriangle, ShieldX, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface NoAccessProps {
  title?: string;
  message?: string;
  requiredPermission?: string;
  suggestedAction?: string;
}

const NoAccess: React.FC<NoAccessProps> = ({
  title = "Access Denied",
  message = "You don't have permission to access this page.",
  requiredPermission,
  suggestedAction = "Contact your Site Administrator to request access.",
}) => {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldX className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {requiredPermission && (
            <div className="text-sm text-center p-3 bg-muted rounded-lg">
              <span className="text-muted-foreground">Required permission: </span>
              <code className="text-xs bg-background px-2 py-1 rounded">{requiredPermission}</code>
            </div>
          )}
          
          <p className="text-sm text-muted-foreground text-center">
            {suggestedAction}
          </p>

          <div className="flex justify-center pt-4">
            <Button asChild>
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NoAccess;
