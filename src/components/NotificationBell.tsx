import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

type Notification = {
  id: string;
  title: string;
  title_ar: string;
  message: string;
  message_ar: string;
  type: string;
  related_task_id: string | null;
  is_read: boolean;
  created_at: string;
};

export function NotificationBell() {
  const { language } = useLanguage();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const loadNotifications = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error: any) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id);
    
    if (notification.related_task_id) {
      setOpen(false);
      navigate('/maintenance');
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);

      toast({
        title: language === 'ar' ? 'تم تحديث الإشعارات' : 'Notifications Updated',
        description: language === 'ar' ? 'تم تعليم جميع الإشعارات كمقروءة' : 'All notifications marked as read',
      });
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'overdue_task':
        return '🔴';
      case 'upcoming_task':
        return '📅';
      case 'task_assigned':
        return '📋';
      case 'task_completed':
        return '✅';
      default:
        return '🔔';
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side={language === 'ar' ? 'left' : 'right'} className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>
              {language === 'ar' ? 'الإشعارات' : 'Notifications'}
            </SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                {language === 'ar' ? 'تعليم الكل كمقروء' : 'Mark all as read'}
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] mt-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    notification.is_read
                      ? 'bg-background hover:bg-muted/50'
                      : 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1 space-y-1">
                      <p className="font-semibold text-sm">
                        {language === 'ar' ? notification.title_ar : notification.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' ? notification.message_ar : notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(notification.created_at), 'PPp')}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}