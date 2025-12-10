import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Smartphone, Download, Share, Chrome, Apple, Plus, Check, Monitor } from 'lucide-react';

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
          {/* Quick Install Button for supported browsers */}
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

          {/* Platform-specific Installation Instructions */}
          <Tabs defaultValue={isIOS ? 'ios' : 'android'} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="android" className="gap-2">
                <Chrome className="h-4 w-4" />
                {language === 'ar' ? 'أندرويد' : 'Android'}
              </TabsTrigger>
              <TabsTrigger value="ios" className="gap-2">
                <Apple className="h-4 w-4" />
                {language === 'ar' ? 'آيفون' : 'iPhone'}
              </TabsTrigger>
              <TabsTrigger value="windows" className="gap-2">
                <Monitor className="h-4 w-4" />
                {language === 'ar' ? 'ويندوز' : 'Windows'}
              </TabsTrigger>
            </TabsList>

            {/* Android Tab */}
            <TabsContent value="android" className="mt-4">
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Chrome className="h-5 w-5 text-primary" />
                    {language === 'ar' ? 'لأجهزة الأندرويد' : 'For Android Devices'}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    {language === 'ar' 
                      ? 'استخدم متصفح Chrome أو Edge للحصول على أفضل تجربة' 
                      : 'Use Chrome or Edge browser for the best experience'}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary text-primary-foreground p-2 rounded-lg font-bold min-w-[32px] h-8 flex items-center justify-center">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-lg">
                        {language === 'ar' ? 'افتح قائمة المتصفح' : 'Open browser menu'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {language === 'ar' 
                          ? 'اضغط على النقاط الثلاث (⋮) في أعلى يمين الشاشة' 
                          : 'Tap the three dots (⋮) at the top right of the screen'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-primary text-primary-foreground p-2 rounded-lg font-bold min-w-[32px] h-8 flex items-center justify-center">
                      2
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Download className="h-5 w-5 text-primary" />
                        <p className="font-medium text-lg">
                          {language === 'ar' ? 'اختر "تثبيت التطبيق"' : 'Select "Install app"'}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' 
                          ? 'قد يظهر كـ "إضافة إلى الشاشة الرئيسية" أو "Install app"' 
                          : 'May appear as "Add to Home screen" or "Install app"'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-primary text-primary-foreground p-2 rounded-lg font-bold min-w-[32px] h-8 flex items-center justify-center">
                      3
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Check className="h-5 w-5 text-primary" />
                        <p className="font-medium text-lg">
                          {language === 'ar' ? 'اضغط "تثبيت"' : 'Tap "Install"'}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' 
                          ? 'سيظهر التطبيق على شاشتك الرئيسية ✨' 
                          : 'The app will appear on your home screen ✨'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* iOS Tab */}
            <TabsContent value="ios" className="mt-4">
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Apple className="h-5 w-5 text-primary" />
                    {language === 'ar' ? 'للآيفون والآيباد (iOS)' : 'For iPhone and iPad (iOS)'}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    {language === 'ar' 
                      ? '⚠️ ملاحظة مهمة: يجب استخدام متصفح Safari فقط على iOS' 
                      : '⚠️ Important: You must use Safari browser on iOS'}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
              </Card>
            </TabsContent>

            {/* Windows Tab */}
            <TabsContent value="windows" className="mt-4">
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-primary" />
                    {language === 'ar' ? 'لأجهزة الكمبيوتر (Windows)' : 'For Desktop (Windows)'}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    {language === 'ar' 
                      ? 'استخدم متصفح Chrome أو Edge للتثبيت' 
                      : 'Use Chrome or Edge browser to install'}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="bg-primary/5 border-primary/20">
                    <AlertDescription>
                      <p className="font-medium mb-2">
                        {language === 'ar' ? 'الطريقة الأولى: من شريط العنوان' : 'Method 1: From Address Bar'}
                      </p>
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-start gap-3">
                    <div className="bg-primary text-primary-foreground p-2 rounded-lg font-bold min-w-[32px] h-8 flex items-center justify-center">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-lg">
                        {language === 'ar' ? 'ابحث عن أيقونة التثبيت' : 'Look for install icon'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {language === 'ar' 
                          ? 'في شريط العنوان، ابحث عن أيقونة الكمبيوتر مع السهم (⊕) أو أيقونة التثبيت' 
                          : 'In the address bar, look for a computer icon with arrow (⊕) or install icon'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-primary text-primary-foreground p-2 rounded-lg font-bold min-w-[32px] h-8 flex items-center justify-center">
                      2
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Download className="h-5 w-5 text-primary" />
                        <p className="font-medium text-lg">
                          {language === 'ar' ? 'اضغط على الأيقونة' : 'Click the icon'}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' 
                          ? 'اضغط على أيقونة التثبيت ثم اختر "تثبيت"' 
                          : 'Click the install icon then select "Install"'}
                      </p>
                    </div>
                  </div>

                  <Alert className="bg-muted border-muted-foreground/20 mt-4">
                    <AlertDescription>
                      <p className="font-medium mb-2">
                        {language === 'ar' ? 'الطريقة الثانية: من القائمة' : 'Method 2: From Menu'}
                      </p>
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-start gap-3">
                    <div className="bg-secondary text-secondary-foreground p-2 rounded-lg font-bold min-w-[32px] h-8 flex items-center justify-center">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-lg">
                        {language === 'ar' ? 'افتح قائمة المتصفح' : 'Open browser menu'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {language === 'ar' 
                          ? 'اضغط على النقاط الثلاث (⋮) أو (⋯) في أعلى يمين المتصفح' 
                          : 'Click the three dots (⋮) or (⋯) at the top right of the browser'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-secondary text-secondary-foreground p-2 rounded-lg font-bold min-w-[32px] h-8 flex items-center justify-center">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-lg">
                        {language === 'ar' ? 'اختر "تثبيت التطبيق"' : 'Select "Install app"'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {language === 'ar' 
                          ? 'في Chrome: "تثبيت متقن..." أو في Edge: "تطبيقات" ثم "تثبيت هذا الموقع كتطبيق"' 
                          : 'In Chrome: "Install Mutqan..." or in Edge: "Apps" then "Install this site as an app"'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-secondary text-secondary-foreground p-2 rounded-lg font-bold min-w-[32px] h-8 flex items-center justify-center">
                      3
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Check className="h-5 w-5 text-primary" />
                        <p className="font-medium text-lg">
                          {language === 'ar' ? 'اضغط "تثبيت"' : 'Click "Install"'}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' 
                          ? 'سيُضاف التطبيق إلى قائمة البداية وسطح المكتب ✨' 
                          : 'The app will be added to Start menu and Desktop ✨'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

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