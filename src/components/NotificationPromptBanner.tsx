import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';

export function NotificationPromptBanner() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [hasToken, setHasToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkNotificationStatus();
  }, [user]);

  const checkNotificationStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('push_notification_tokens')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking notification token:', error);
        return;
      }

      setHasToken(!!data);
    } catch (error) {
      console.error('Error in checkNotificationStatus:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  const handleEnable = () => {
    navigate('/notifications-settings');
  };

  // Don't show banner if: loading, has token, or user dismissed it temporarily
  if (loading || hasToken || dismissed) {
    return null;
  }

  return (
    <Alert className="mb-6 border-primary/50 bg-primary/5">
      <Bell className="h-5 w-5 text-primary" />
      <AlertDescription className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="font-semibold mb-1">
            {language === 'ar' 
              ? 'فعّل الإشعارات الفورية' 
              : 'Enable Push Notifications'}
          </p>
          <p className="text-sm text-muted-foreground">
            {language === 'ar'
              ? 'لتصلك إشعارات فورية عند تحديث أوامر العمل والمهام العاجلة'
              : 'Get instant notifications for work order updates and urgent tasks'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleEnable}
            size="sm"
            className="shrink-0"
          >
            {language === 'ar' ? 'تفعيل الآن' : 'Enable Now'}
          </Button>
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
