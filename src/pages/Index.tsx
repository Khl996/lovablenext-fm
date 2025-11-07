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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="container max-w-4xl mx-auto px-4 text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="bg-primary/10 p-6 rounded-3xl">
            <Building2 className="h-20 w-20 text-primary" />
          </div>
        </div>

        {/* Main Heading */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            {language === 'ar' 
              ? 'نظام إدارة المرافق' 
              : 'Facility Management System'}
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            {language === 'ar' 
              ? 'حل شامل لإدارة المرافق والصيانة للمستشفيات' 
              : 'Comprehensive Facility and Maintenance Management for Hospitals'}
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div className="bg-card/50 backdrop-blur p-6 rounded-xl border">
            <div className="text-3xl mb-3">🏗️</div>
            <h3 className="font-semibold mb-2">
              {language === 'ar' ? 'إدارة الأصول' : 'Asset Management'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' 
                ? 'تتبع وإدارة جميع الأصول مع رموز QR' 
                : 'Track and manage all assets with QR codes'}
            </p>
          </div>

          <div className="bg-card/50 backdrop-blur p-6 rounded-xl border">
            <div className="text-3xl mb-3">📋</div>
            <h3 className="font-semibold mb-2">
              {language === 'ar' ? 'أوامر العمل' : 'Work Orders'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' 
                ? 'إدارة كاملة لدورة حياة أوامر العمل' 
                : 'Complete work order lifecycle management'}
            </p>
          </div>

          <div className="bg-card/50 backdrop-blur p-6 rounded-xl border">
            <div className="text-3xl mb-3">⚙️</div>
            <h3 className="font-semibold mb-2">
              {language === 'ar' ? 'الصيانة الدورية' : 'Preventive Maintenance'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' 
                ? 'جدولة وتخطيط الصيانة الوقائية' 
                : 'Schedule and plan preventive maintenance'}
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="pt-4">
          <Button 
            size="lg" 
            className="gap-2 text-lg px-8 py-6"
            onClick={() => navigate('/auth')}
          >
            {language === 'ar' ? 'ابدأ الآن' : 'Get Started'}
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Footer Info */}
        <p className="text-sm text-muted-foreground">
          {language === 'ar' 
            ? 'نظام متعدد اللغات مع دعم العربية والإنجليزية' 
            : 'Multi-language system with Arabic and English support'}
        </p>
      </div>
    </div>
  );
};

export default Index;
