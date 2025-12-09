import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string | null;
  setting_type: string;
}

interface SystemSettings {
  appName: string;
  appNameAr: string;
  appTagline: string;
  appTaglineAr: string;
  logoUrl: string | null;
  defaultLanguage: string;
  emailFromAddress: string;
  emailFromName: string;
  emailEnabled: boolean;
}

export function useSystemSettings() {
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value');
      
      if (error) throw error;
      return data as Pick<SystemSetting, 'setting_key' | 'setting_value'>[];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const getValue = (key: string): string | null => {
    return settings?.find(s => s.setting_key === key)?.setting_value || null;
  };

  const systemSettings: SystemSettings = {
    appName: getValue('app_name') || 'Mutqan FM',
    appNameAr: getValue('app_name_ar') || 'متقن FM',
    appTagline: getValue('app_tagline') || 'Hospital Facility and Maintenance Management',
    appTaglineAr: getValue('app_tagline_ar') || 'إدارة المرافق والصيانة للمستشفيات',
    logoUrl: getValue('app_logo_url'),
    defaultLanguage: getValue('default_language') || 'ar',
    emailFromAddress: getValue('email_from_address') || 'noreply@facility-management.space',
    emailFromName: getValue('email_from_name') || 'نظام الصيانة',
    emailEnabled: getValue('email_enabled') !== 'false',
  };

  return {
    ...systemSettings,
    isLoading,
    error,
  };
}
