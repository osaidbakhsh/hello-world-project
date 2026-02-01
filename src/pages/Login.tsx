import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Server, Loader2, Eye, EyeOff, Mail } from 'lucide-react';
import { useLoginBackground } from '@/hooks/useLoginBackground';
import { supabase } from '@/integrations/supabase/client';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  
  const { signIn, user, profile, isLoading: authLoading } = useAuth();
  const { t, dir } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { backgroundUrl } = useLoginBackground();

  // Redirect only when both user + profile are ready (ProtectedRoute requires both).
  useEffect(() => {
    if (!authLoading && user && profile) {
      navigate('/', { replace: true });
    }
  }, [authLoading, user, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await signIn(email, password, rememberMe);

      if (error) {
        toast({
          title: t('common.error'),
          description: error.message === 'Invalid login credentials' 
            ? t('auth.invalidCredentials')
            : error.message,
          variant: 'destructive',
        });
        setIsSubmitting(false);
      } else {
        toast({
          title: t('common.success'),
          description: t('auth.loginSuccess'),
        });
        // Do not navigate immediately; wait for AuthContext to finish loading profile.
      }
    } catch (err) {
      console.error('Login error:', err);
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast({
        title: t('common.error'),
        description: t('auth.emailRequired'),
        variant: 'destructive',
      });
      return;
    }

    setIsSendingReset(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      // Always show success message for security (don't reveal if email exists)
      toast({
        title: t('auth.resetEmailSent'),
        description: t('auth.resetEmailSentDesc'),
      });
      setShowForgotPassword(false);
      setForgotEmail('');
    } catch (error) {
      // Same message for security
      toast({
        title: t('auth.resetEmailSent'),
        description: t('auth.resetEmailSentDesc'),
      });
    }
    
    setIsSendingReset(false);
  };

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
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-black/20 to-black/60" />
      
      <Card className="w-full max-w-md shadow-2xl relative z-10 border-primary/30 bg-card/90 backdrop-blur-lg">
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
              {t('auth.loginSubtitle')}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                    disabled={isSubmitting}
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
            
            {/* Remember Me + Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                <Label htmlFor="remember" className="text-sm cursor-pointer">
                  {t('auth.rememberMe')}
                </Label>
              </div>
              
              <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
                <DialogTrigger asChild>
                  <Button variant="link" className="text-sm p-0 h-auto text-muted-foreground hover:text-primary">
                    {t('auth.forgotPassword')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t('auth.resetPassword')}</DialogTitle>
                    <DialogDescription>
                      {t('auth.enterEmailForReset')}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">{t('auth.email')}</Label>
                      <div className="relative">
                        <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="forgot-email"
                          type="email"
                          placeholder="example@company.com"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          required
                          disabled={isSendingReset}
                          className="ps-10"
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSendingReset}
                    >
                      {isSendingReset ? (
                        <>
                          <Loader2 className="w-4 h-4 me-2 animate-spin" />
                          {t('auth.sending')}
                        </>
                      ) : (
                        t('auth.sendResetLink')
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {t('auth.loggingIn')}
                </>
              ) : (
                t('auth.login')
              )}
            </Button>
          </form>
        </CardContent>
        {/* Registration link removed - employees are added by admin only */}
      </Card>
    </div>
  );
};

export default Login;
