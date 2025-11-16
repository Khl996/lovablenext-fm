import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Globe } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, user, loading } = useAuth();
  const { language, setLanguage, t, direction } = useLanguage();
  
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { error } = await signIn(loginEmail, loginPassword);
      if (!error) {
        navigate('/dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Language Toggle */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="gap-2"
          >
            <Globe className="h-4 w-4" />
            {language === 'ar' ? 'English' : 'العربية'}
          </Button>
        </div>

        {/* Auth Card */}
        <Card className="border">
          <CardHeader className="space-y-2 text-center">
            <div className="flex justify-center mb-2">
              <div className="bg-primary/5 p-4 rounded-xl border border-border">
                <img src="/mutqan-logo.png" alt="Mutqan Logo" className="h-16 w-16" />
              </div>
            </div>
            <CardTitle className="text-2xl font-semibold">
              {t('login')}
            </CardTitle>
            <CardDescription>
              {language === 'ar' 
                ? 'الوصول إلى متقن' 
                : 'Access Mutqan'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">{t('email')}</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder={language === 'ar' ? 'admin@hospital.com' : 'admin@hospital.com'}
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">{t('password')}</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  dir="ltr"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('loading') : t('login')}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                {language === 'ar' 
                  ? 'للحصول على حساب، تواصل مع مدير النظام'
                  : 'Contact your system administrator for an account'}
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
