import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Server, Loader2, Eye, EyeOff } from 'lucide-react';
import { useLoginBackground } from '@/hooks/useLoginBackground';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      {/* Lighter overlay to let the dark server room show through */}
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60" />
      
      <Card className="w-full max-w-md shadow-2xl relative z-10 border-primary/20 bg-card/95 backdrop-blur-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl stat-primary flex items-center justify-center shadow-lg">
            <Server className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">
              IT <span className="text-accent">Infrastructure</span>
            </CardTitle>
            <CardDescription className="mt-2">
              تسجيل الدخول إلى نظام إدارة البنية التحتية
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
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
              <Label htmlFor="password">كلمة المرور</Label>
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
            
            {/* Remember Me Checkbox */}
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
