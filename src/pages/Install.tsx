import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Download, Share, Chrome, Apple } from 'lucide-react';

export default function Install() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  if (isStandalone) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-secondary/5">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              {language === 'ar' ? 'التطبيق مثبّت بنجاح!' : 'App Installed Successfully!'}
            </CardTitle>
            <CardDescription>
              {language === 'ar' 
                ? 'يمكنك الآن استخدام التطبيق من الشاشة الرئيسية'
                : 'You can now use the app from your home screen'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/dashboard')} 
              className="w-full"
              size="lg"
            >
              {language === 'ar' ? 'انتقل إلى لوحة التحكم' : 'Go to Dashboard'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-secondary/5">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Download className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-3xl mb-2">
            {language === 'ar' ? 'ثبّت التطبيق' : 'Install the App'}
          </CardTitle>
          <CardDescription className="text-base">
            {language === 'ar' 
              ? 'استخدم التطبيق بسهولة من الشاشة الرئيسية لهاتفك'
              : 'Use the app easily from your phone home screen'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Android/Chrome Installation */}
          {isInstallable && (
            <div className="space-y-4">
              <Button 
                onClick={handleInstallClick}
                size="lg"
                className="w-full gap-2"
              >
                <Download className="w-5 h-5" />
                {language === 'ar' ? 'ثبّت التطبيق الآن' : 'Install App Now'}
              </Button>
            </div>
          )}

          {/* iOS Installation Instructions */}
          {isIOS && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Apple className="w-6 h-6 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">
                    {language === 'ar' ? 'للآيفون والآيباد:' : 'For iPhone & iPad:'}
                  </h3>
                  <ol className="text-sm space-y-2 list-decimal list-inside">
                    <li>
                      {language === 'ar' 
                        ? 'اضغط على زر المشاركة' 
                        : 'Tap the Share button'}
                      <Share className="inline-block w-4 h-4 mx-1" />
                    </li>
                    <li>
                      {language === 'ar' 
                        ? 'اختر "إضافة إلى الشاشة الرئيسية"'
                        : 'Select "Add to Home Screen"'}
                    </li>
                    <li>
                      {language === 'ar' 
                        ? 'اضغط "إضافة"'
                        : 'Tap "Add"'}
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Chrome Installation Instructions */}
          {!isInstallable && !isIOS && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Chrome className="w-6 h-6 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">
                    {language === 'ar' ? 'للأندرويد:' : 'For Android:'}
                  </h3>
                  <ol className="text-sm space-y-2 list-decimal list-inside">
                    <li>
                      {language === 'ar' 
                        ? 'اضغط على قائمة المتصفح (⋮)'
                        : 'Tap the browser menu (⋮)'}
                    </li>
                    <li>
                      {language === 'ar' 
                        ? 'اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"'
                        : 'Select "Install app" or "Add to Home screen"'}
                    </li>
                    <li>
                      {language === 'ar' 
                        ? 'اضغط "تثبيت"'
                        : 'Tap "Install"'}
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Features */}
          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-semibold text-center mb-4">
              {language === 'ar' ? 'مميزات التطبيق:' : 'App Features:'}
            </h3>
            <div className="grid gap-3">
              <div className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>
                  {language === 'ar' 
                    ? 'يعمل بدون اتصال بالإنترنت'
                    : 'Works offline'}
                </span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>
                  {language === 'ar' 
                    ? 'تحميل سريع وأداء ممتاز'
                    : 'Fast loading and excellent performance'}
                </span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>
                  {language === 'ar' 
                    ? 'إشعارات فورية للتحديثات المهمة'
                    : 'Instant notifications for important updates'}
                </span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>
                  {language === 'ar' 
                    ? 'لا يحتاج إلى مساحة كبيرة'
                    : 'Minimal storage space required'}
                </span>
              </div>
            </div>
          </div>

          {/* Skip Button */}
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')}
            className="w-full"
          >
            {language === 'ar' ? 'تخطي وانتقل إلى لوحة التحكم' : 'Skip and go to Dashboard'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}