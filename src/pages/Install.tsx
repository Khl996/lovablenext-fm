import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Smartphone, Download, Share, Chrome, Apple, Plus, Check } from 'lucide-react';

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
    await deferredPrompt.userChoice;
    
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
            <img src="/mutqan-logo.png" alt="Mutqan Logo" className="h-12 w-12" />
          </div>
          <CardTitle className="text-3xl mb-2">
            {language === 'ar' ? 'ثبّت متقن' : 'Install Mutqan'}
          </CardTitle>
          <CardDescription className="text-base">
            {language === 'ar' 
              ? 'استخدم نظام متقن بسهولة من الشاشة الرئيسية لهاتفك'
              : 'Use Mutqan system easily from your phone home screen'}
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
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  {language === 'ar' ? 'للآيفون والآيباد (iOS)' : 'For iPhone and iPad (iOS)'}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  {language === 'ar' 
                    ? '⚠️ ملاحظة مهمة: يجب استخدام متصفح Safari فقط على iOS' 
                    : '⚠️ Important: You must use Safari browser on iOS'}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-primary/5 border-primary/20">
                  <AlertDescription>
                    <p className="font-medium mb-2">
                      {language === 'ar' ? 'خطوات التثبيت:' : 'Installation Steps:'}
                    </p>
                  </AlertDescription>
                </Alert>

                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground p-2 rounded-lg font-bold min-w-[32px] h-8 flex items-center justify-center">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-lg">
                      {language === 'ar' ? 'افتح Safari' : 'Open Safari'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {language === 'ar' 
                        ? 'يجب استخدام متصفح Safari فقط - لن يعمل من Chrome أو Firefox على الآيفون' 
                        : 'Must use Safari browser only - will not work from Chrome or Firefox on iPhone'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground p-2 rounded-lg font-bold min-w-[32px] h-8 flex items-center justify-center">
                    2
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Share className="h-5 w-5 text-primary" />
                      <p className="font-medium text-lg">
                        {language === 'ar' ? 'اضغط على زر المشاركة' : 'Tap the Share button'}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' 
                        ? 'الزر يشبه مربع بسهم للأعلى 📤 في أسفل الشاشة أو في شريط العنوان' 
                        : 'The button looks like a box with an arrow pointing up 📤 at the bottom or in the address bar'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground p-2 rounded-lg font-bold min-w-[32px] h-8 flex items-center justify-center">
                    3
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Plus className="h-5 w-5 text-primary" />
                      <p className="font-medium text-lg">
                        {language === 'ar' ? 'اختر "إضافة إلى الشاشة الرئيسية"' : 'Select "Add to Home Screen"'}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' 
                        ? 'مرّر للأسفل في قائمة الخيارات حتى تجد "إضافة إلى الشاشة الرئيسية" (Add to Home Screen)' 
                        : 'Scroll down in the options menu until you find "Add to Home Screen"'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground p-2 rounded-lg font-bold min-w-[32px] h-8 flex items-center justify-center">
                    4
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Check className="h-5 w-5 text-primary" />
                      <p className="font-medium text-lg">
                        {language === 'ar' ? 'اضغط "إضافة"' : 'Tap "Add"'}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' 
                        ? 'اضغط زر "إضافة" في الزاوية العلوية - سيظهر التطبيق على شاشتك الرئيسية مثل أي تطبيق آخر ✨' 
                        : 'Tap "Add" button in the top corner - the app will appear on your home screen like any other app ✨'}
                    </p>
                  </div>
                </div>

                <Alert className="bg-green-500/10 border-green-500/20 mt-4">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-sm">
                    {language === 'ar' 
                      ? '💡 بعد التثبيت، ستتمكن من استقبال الإشعارات والوصول للتطبيق بسرعة من الشاشة الرئيسية!' 
                      : '💡 After installation, you can receive notifications and access the app quickly from home screen!'}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
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