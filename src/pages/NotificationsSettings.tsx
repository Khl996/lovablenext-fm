import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { requestFCMToken } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function NotificationsSettings() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    checkExistingToken();
  }, [user]);

  const checkExistingToken = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('push_notification_tokens')
        .select('token')
        .eq('user_id', user.id)
        .limit(1);

      if (error) throw error;
      setHasToken(data && data.length > 0);
    } catch (error) {
      console.error('Error checking token:', error);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error(
        language === 'ar' 
          ? 'المتصفح لا يدعم الإشعارات'
          : 'Browser does not support notifications'
      );
      return;
    }

    setLoading(true);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        // Request FCM token with VAPID key
        const vapidKey = 'BG1maapDbVADD5Vs82i9fuTdBf1hYglOX928q0PFa5m0GznecFw-Pb7giBM1pc0V7Ue9oZ28xzPryBXGHDR8tgM';
        const fcmToken = await requestFCMToken(vapidKey);
        
        if (!fcmToken) {
          throw new Error('Unable to get FCM token');
        }
        
        const { error } = await supabase
          .from('push_notification_tokens')
          .upsert({
            user_id: user?.id,
            token: fcmToken,
            device_type: 'web'
          });

        if (error) throw error;

        setHasToken(true);
        
        toast.success(
          language === 'ar'
            ? 'تم تفعيل الإشعارات بنجاح!'
            : 'Notifications enabled successfully!'
        );

        // Show a test notification
        new Notification(
          language === 'ar' ? 'مرحباً!' : 'Welcome!',
          {
            body: language === 'ar' 
              ? 'سيتم إرسال الإشعارات المهمة إليك هنا'
              : 'Important notifications will be sent here',
            icon: '/icon-192.png'
          }
        );
      } else {
        toast.error(
          language === 'ar'
            ? 'تم رفض إذن الإشعارات'
            : 'Notification permission denied'
        );
      }
    } catch (error: any) {
      console.error('Error requesting notification permission:', error);
      toast.error(
        language === 'ar'
          ? 'حدث خطأ أثناء تفعيل الإشعارات'
          : 'Error enabling notifications'
      );
    } finally {
      setLoading(false);
    }
  };

  const disableNotifications = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('push_notification_tokens')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setHasToken(false);
      
      toast.success(
        language === 'ar'
          ? 'تم تعطيل الإشعارات'
          : 'Notifications disabled'
      );
    } catch (error: any) {
      console.error('Error disabling notifications:', error);
      toast.error(
        language === 'ar'
          ? 'حدث خطأ أثناء تعطيل الإشعارات'
          : 'Error disabling notifications'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-secondary/5">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            {permission === 'granted' ? (
              <Bell className="w-10 h-10 text-primary" />
            ) : (
              <BellOff className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
          <CardTitle className="text-3xl mb-2">
            {language === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings'}
          </CardTitle>
          <CardDescription className="text-base">
            {language === 'ar' 
              ? 'استلم تحديثات فورية عن أوامر العمل والصيانة'
              : 'Receive instant updates about work orders and maintenance'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Current Status */}
          <div className="p-4 rounded-lg bg-muted">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {permission === 'granted' && hasToken ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">
                    {language === 'ar' ? 'حالة الإشعارات:' : 'Notification Status:'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {permission === 'granted' && hasToken
                      ? (language === 'ar' ? 'مفعّلة' : 'Enabled')
                      : permission === 'denied'
                      ? (language === 'ar' ? 'محظورة' : 'Blocked')
                      : (language === 'ar' ? 'غير مفعّلة' : 'Disabled')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Enable/Disable Notifications */}
          {permission !== 'denied' && (
            <div className="space-y-4">
              {!hasToken ? (
                <Button 
                  onClick={requestNotificationPermission}
                  disabled={loading}
                  size="lg"
                  className="w-full gap-2"
                >
                  <Bell className="w-5 h-5" />
                  {loading 
                    ? (language === 'ar' ? 'جاري التفعيل...' : 'Enabling...')
                    : (language === 'ar' ? 'تفعيل الإشعارات' : 'Enable Notifications')}
                </Button>
              ) : (
                <Button 
                  onClick={disableNotifications}
                  disabled={loading}
                  variant="outline"
                  size="lg"
                  className="w-full gap-2"
                >
                  <BellOff className="w-5 h-5" />
                  {loading 
                    ? (language === 'ar' ? 'جاري التعطيل...' : 'Disabling...')
                    : (language === 'ar' ? 'تعطيل الإشعارات' : 'Disable Notifications')}
                </Button>
              )}
            </div>
          )}

          {/* Blocked Instructions */}
          {permission === 'denied' && (
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm font-medium mb-2 text-destructive">
                {language === 'ar' 
                  ? 'الإشعارات محظورة في المتصفح'
                  : 'Notifications are blocked in browser'}
              </p>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' 
                  ? 'لتفعيل الإشعارات، يجب تغيير إعدادات المتصفح والسماح بالإشعارات لهذا الموقع.'
                  : 'To enable notifications, change browser settings and allow notifications for this site.'}
              </p>
            </div>
          )}

          {/* Notification Types */}
          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-semibold">
              {language === 'ar' ? 'أنواع الإشعارات:' : 'Notification Types:'}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="work-orders" className="flex-1 cursor-pointer">
                  <span className="font-medium">
                    {language === 'ar' ? 'أوامر العمل' : 'Work Orders'}
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' 
                      ? 'عند تعيين أمر عمل جديد لك'
                      : 'When a new work order is assigned to you'}
                  </p>
                </Label>
                <Switch id="work-orders" checked={hasToken} disabled />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="maintenance" className="flex-1 cursor-pointer">
                  <span className="font-medium">
                    {language === 'ar' ? 'الصيانة الدورية' : 'Preventive Maintenance'}
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' 
                      ? 'تذكير بمواعيد الصيانة'
                      : 'Reminders for maintenance schedules'}
                  </p>
                </Label>
                <Switch id="maintenance" checked={hasToken} disabled />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="alerts" className="flex-1 cursor-pointer">
                  <span className="font-medium">
                    {language === 'ar' ? 'التنبيهات العاجلة' : 'Urgent Alerts'}
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' 
                      ? 'تنبيهات الطوارئ والحالات الحرجة'
                      : 'Emergency and critical situation alerts'}
                  </p>
                </Label>
                <Switch id="alerts" checked={hasToken} disabled />
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <Button 
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="w-full gap-2"
            size="lg"
          >
            {language === 'ar' ? 'انتقل إلى لوحة التحكم' : 'Go to Dashboard'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}