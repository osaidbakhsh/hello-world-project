import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Server, Loader2, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLoginBackground } from '@/hooks/useLoginBackground';

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const { t, dir } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { backgroundUrl } = useLoginBackground();

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // Supabase sets a session when the user clicks the recovery link
      setIsValidSession(!!session);
      setIsCheckingSession(false);
    };

    checkSession();

    // Listen for auth state changes (recovery link clicked)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: t('common.error'),
        description: t('auth.passwordMismatch'),
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: t('common.error'),
        description: t('auth.passwordTooShort'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast({
          title: t('common.error'),
          description: t('auth.resetFailed'),
          variant: 'destructive',
        });
      } else {
        setIsSuccess(true);
        toast({
          title: t('common.success'),
          description: t('auth.passwordChanged'),
        });
        // Sign out and redirect to login after 2 seconds
        setTimeout(async () => {
          await supabase.auth.signOut();
          navigate('/login', { replace: true });
        }, 2000);
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('auth.resetFailed'),
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir={dir}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4 relative" 
        dir={dir}
        style={{
          backgroundImage: `url(${backgroundUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60" />
        
        <Card className="w-full max-w-md shadow-2xl relative z-10 border-primary/20 bg-card/95 backdrop-blur-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl stat-primary flex items-center justify-center shadow-lg">
              <Server className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">
                <span className="text-accent">IT</span>{' '}
                <span className="text-primary">Infrastructure</span>
              </CardTitle>
              <CardDescription className="mt-2 text-destructive">
                {t('auth.invalidToken')}
              </CardDescription>
            </div>
          </CardHeader>
          <CardFooter className="flex flex-col gap-4">
            <Link to="/login" className="w-full">
              <Button variant="outline" className="w-full gap-2">
                <ArrowRight className="w-4 h-4" />
                {t('auth.backToLogin')}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4 relative" 
        dir={dir}
        style={{
          backgroundImage: `url(${backgroundUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60" />
        
        <Card className="w-full max-w-md shadow-2xl relative z-10 border-primary/20 bg-card/95 backdrop-blur-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-success/20 flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-success">
                {t('auth.passwordChanged')}
              </CardTitle>
              <CardDescription className="mt-2">
                {t('auth.redirectingToLogin')}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative" 
      dir={dir}
      style={{
        backgroundImage: `url(${backgroundUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60" />
      
      <Card className="w-full max-w-md shadow-2xl relative z-10 border-primary/20 bg-card/95 backdrop-blur-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl stat-primary flex items-center justify-center shadow-lg">
            <Server className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">
              <span className="text-accent">IT</span>{' '}
              <span className="text-primary">Infrastructure</span>
            </CardTitle>
            <CardDescription className="mt-2">
              {t('auth.resetPassword')}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('auth.newPassword')}</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pe-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute end-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('auth.confirmNewPassword')}</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                t('auth.setNewPassword')
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline font-medium">
              {t('auth.backToLogin')}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ResetPassword;
