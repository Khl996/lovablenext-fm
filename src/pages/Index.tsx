import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Building2, ArrowRight } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { language } = useLanguage();

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
          <div className="bg-primary/5 p-8 rounded-2xl border border-border">
            <Building2 className="h-16 w-16 text-primary" />
          </div>
        </div>

        {/* Main Heading */}
        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            {language === 'ar' 
              ? 'نظام إدارة المرافق' 
              : 'Facility Management System'}
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            {language === 'ar' 
              ? 'إدارة المرافق والصيانة للمستشفيات' 
              : 'Hospital Facility and Maintenance Management'}
          </p>
        </div>

        {/* CTA Button */}
        <div className="pt-2">
          <Button 
            size="lg" 
            className="gap-2 px-8"
            onClick={() => navigate('/auth')}
          >
            {language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
