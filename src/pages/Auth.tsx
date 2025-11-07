import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Globe } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, user, loading } = useAuth();
  const { language, setLanguage, t, direction } = useLanguage();
  
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupFullName, setSignupFullName] = useState('');

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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { error } = await signUp(signupEmail, signupPassword, signupFullName);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Language Toggle */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className="gap-2"
          >
            <Globe className="h-4 w-4" />
            {language === 'ar' ? 'English' : 'العربية'}
          </Button>
        </div>

        {/* Logo and Title */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-primary/10 p-4 rounded-2xl">
              <Building2 className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">
            {language === 'ar' ? 'نظام إدارة المرافق' : 'Facility Management System'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'إدارة شاملة للمرافق والصيانة' : 'Comprehensive Facility and Maintenance Management'}
          </p>
        </div>

        {/* Auth Card */}
        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'مرحباً بك' : 'Welcome'}</CardTitle>
            <CardDescription>
              {language === 'ar' ? 'سجل الدخول أو أنشئ حساباً جديداً' : 'Login or create a new account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full" dir={direction}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">{t('login')}</TabsTrigger>
                <TabsTrigger value="signup">{t('signup')}</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
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
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">{t('fullName')}</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder={language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t('email')}</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder={language === 'ar' ? 'admin@hospital.com' : 'admin@hospital.com'}
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t('password')}</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      dir="ltr"
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? t('loading') : t('signup')}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          {language === 'ar' 
            ? 'للدعم الفني، تواصل مع فريق الدعم' 
            : 'For technical support, contact support team'}
        </p>
      </div>
    </div>
  );
}
