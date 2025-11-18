import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bell, Mail, Smartphone, Save } from 'lucide-react';

type NotificationPreferences = {
  id?: string;
  user_id: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
  overdue_tasks: boolean;
  upcoming_tasks: boolean;
  task_assignments: boolean;
  task_completions: boolean;
  days_before_due: number;
};

export default function NotificationSettings() {
  const { t, language } = useLanguage();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    user_id: user?.id || '',
    email_enabled: true,
    in_app_enabled: true,
    overdue_tasks: true,
    upcoming_tasks: true,
    task_assignments: true,
    task_completions: true,
    days_before_due: 3,
  });

  useEffect(() => {
    if (user?.id) {
      loadPreferences();
    }
  }, [user?.id]);

  const loadPreferences = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences(data);
      }
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user?.id) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          ...preferences,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم الحفظ' : 'Saved',
        description: language === 'ar' ? 'تم حفظ إعدادات التنبيهات بنجاح' : 'Notification settings saved successfully',
      });
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8 text-muted-foreground">
          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{language === 'ar' ? 'إعدادات التنبيهات' : 'Notification Settings'}</h1>
        <p className="text-muted-foreground mt-1">
          {language === 'ar' ? 'تخصيص كيفية تلقي الإشعارات' : 'Customize how you receive notifications'}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Notification Channels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {language === 'ar' ? 'قنوات التنبيه' : 'Notification Channels'}
            </CardTitle>
            <CardDescription>
              {language === 'ar' ? 'اختر كيف تريد استلام التنبيهات' : 'Choose how you want to receive notifications'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="email-enabled">
                  {language === 'ar' ? 'البريد الإلكتروني' : 'Email Notifications'}
                </Label>
              </div>
              <Switch
                id="email-enabled"
                checked={preferences.email_enabled}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, email_enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="in-app-enabled">
                  {language === 'ar' ? 'داخل التطبيق' : 'In-App Notifications'}
                </Label>
              </div>
              <Switch
                id="in-app-enabled"
                checked={preferences.in_app_enabled}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, in_app_enabled: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Types */}
        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'أنواع التنبيهات' : 'Notification Types'}</CardTitle>
            <CardDescription>
              {language === 'ar' ? 'اختر نوع التنبيهات التي تريد استلامها' : 'Select which types of notifications you want to receive'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="overdue-tasks">
                {language === 'ar' ? 'المهام المتأخرة' : 'Overdue Tasks'}
              </Label>
              <Switch
                id="overdue-tasks"
                checked={preferences.overdue_tasks}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, overdue_tasks: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="upcoming-tasks">
                {language === 'ar' ? 'المهام القادمة' : 'Upcoming Tasks'}
              </Label>
              <Switch
                id="upcoming-tasks"
                checked={preferences.upcoming_tasks}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, upcoming_tasks: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="task-assignments">
                {language === 'ar' ? 'تعيين المهام' : 'Task Assignments'}
              </Label>
              <Switch
                id="task-assignments"
                checked={preferences.task_assignments}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, task_assignments: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="task-completions">
                {language === 'ar' ? 'إكمال المهام' : 'Task Completions'}
              </Label>
              <Switch
                id="task-completions"
                checked={preferences.task_completions}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, task_completions: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Timing Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'إعدادات التوقيت' : 'Timing Settings'}</CardTitle>
            <CardDescription>
              {language === 'ar' ? 'تحديد متى يتم إرسال التنبيهات' : 'Configure when notifications are sent'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="days-before">
                {language === 'ar' ? 'إرسال تنبيه قبل موعد الاستحقاق' : 'Send reminder before due date'}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="days-before"
                  type="number"
                  min="1"
                  max="30"
                  value={preferences.days_before_due}
                  onChange={(e) =>
                    setPreferences({ ...preferences, days_before_due: parseInt(e.target.value) || 3 })
                  }
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'أيام' : 'days'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={savePreferences} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving
            ? language === 'ar'
              ? 'جاري الحفظ...'
              : 'Saving...'
            : language === 'ar'
            ? 'حفظ الإعدادات'
            : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}