import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { ArrowRight, Download } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useSystemSettings } from '@/hooks/useSystemSettings';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { language } = useLanguage();
  const { isInstalled } = usePWAInstall();
  const { appName, appNameAr, logoUrl } = useSystemSettings();

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="container max-w-3xl mx-auto px-6 text-center space-y-12">
        {/* Logo */}
        <div className="flex justify-center">
          <img 
            src={logoUrl || '/mutqan-logo.png'} 
            alt="App Logo" 
            className="h-32 w-32 object-contain" 
          />
        </div>

        {/* Main Heading */}
        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            {language === 'ar' ? appNameAr : appName}
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            {language === 'ar' 
              ? 'إدارة المرافق والصيانة للمستشفيات' 
              : 'Hospital Facility and Maintenance Management'}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="pt-2 flex flex-col items-center gap-3">
          <Button 
            size="lg" 
            className="gap-2 px-8"
            onClick={() => navigate('/auth')}
          >
            {language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
            <ArrowRight className="h-4 w-4" />
          </Button>
          
          {!isInstalled && (
            <Button 
              size="sm" 
              variant="outline"
              className="gap-2"
              onClick={() => navigate('/install')}
            >
              <Download className="h-4 w-4" />
              {language === 'ar' ? 'ثبّت التطبيق' : 'Install App'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
