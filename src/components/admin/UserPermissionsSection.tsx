import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, X, Shield } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Permission = Database['public']['Tables']['permissions']['Row'];
type UserPermission = Database['public']['Tables']['user_permissions']['Row'];

interface UserPermissionsSectionProps {
  userId: string;
  hospitals: Array<{ id: string; name: string; name_ar: string }>;
  userHospitalId: string | null;
  isGlobalAdmin: boolean;
}

export function UserPermissionsSection({ userId, hospitals, userHospitalId, isGlobalAdmin }: UserPermissionsSectionProps) {
  const { language, t } = useLanguage();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    permissionKey: '',
    effect: 'grant' as 'grant' | 'deny',
    hospitalId: '',
  });

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [permsResult, userPermsResult] = await Promise.all([
        supabase.from('permissions').select('*').order('category').order('name'),
        supabase.from('user_permissions').select('*').eq('user_id', userId),
      ]);

      if (permsResult.error) throw permsResult.error;
      if (userPermsResult.error) throw userPermsResult.error;

      setPermissions(permsResult.data || []);
      setUserPermissions(userPermsResult.data || []);
    } catch (error: any) {
      console.error('Error loading permissions:', error);
      toast.error(t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddPermission = async () => {
    if (!formData.permissionKey) {
      toast.error(language === 'ar' ? 'يرجى اختيار صلاحية' : 'Please select a permission');
      return;
    }

    try {
      const { error } = await supabase.from('user_permissions').insert([
        {
          user_id: userId,
          permission_key: formData.permissionKey,
          effect: formData.effect,
          hospital_id: formData.hospitalId || null,
        },
      ]);

      if (error) throw error;

      toast.success(language === 'ar' ? 'تمت إضافة الصلاحية بنجاح' : 'Permission added successfully');
      setShowAddForm(false);
      setFormData({ permissionKey: '', effect: 'grant', hospitalId: '' });
      loadData();
    } catch (error: any) {
      console.error('Error adding permission:', error);
      toast.error(error.message || t('errorOccurred'));
    }
  };

  const handleRemovePermission = async (permissionId: string) => {
    try {
      const { error } = await supabase.from('user_permissions').delete().eq('id', permissionId);

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم حذف الصلاحية بنجاح' : 'Permission removed successfully');
      loadData();
    } catch (error: any) {
      console.error('Error removing permission:', error);
      toast.error(error.message || t('errorOccurred'));
    }
  };

  const getPermissionName = (key: string) => {
    const perm = permissions.find((p) => p.key === key);
    return perm ? (language === 'ar' ? perm.name_ar : perm.name) : key;
  };

  const getHospitalName = (hospitalId: string | null) => {
    if (!hospitalId) return language === 'ar' ? 'عام (جميع المستشفيات)' : 'Global (All Hospitals)';
    const hospital = hospitals.find((h) => h.id === hospitalId);
    return hospital ? (language === 'ar' ? hospital.name_ar : hospital.name) : hospitalId;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">
            {language === 'ar' ? 'صلاحيات إضافية' : 'Additional Permissions'}
          </h3>
        </div>
        {!showAddForm && (
          <Button size="sm" onClick={() => setShowAddForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {language === 'ar' ? 'إضافة صلاحية' : 'Add Permission'}
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {language === 'ar'
          ? 'الصلاحيات الإضافية تُطبق على المستخدم بشكل فردي، بغض النظر عن دوره'
          : 'Additional permissions are applied to the user individually, regardless of their role'}
      </p>

      {showAddForm && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الصلاحية' : 'Permission'}</Label>
            <Select value={formData.permissionKey} onValueChange={(value) => setFormData({ ...formData, permissionKey: value })}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'ar' ? 'اختر صلاحية' : 'Select permission'} />
              </SelectTrigger>
              <SelectContent>
                {permissions.map((perm) => (
                  <SelectItem key={perm.key} value={perm.key}>
                    {language === 'ar' ? perm.name_ar : perm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'التأثير' : 'Effect'}</Label>
            <Select value={formData.effect} onValueChange={(value: 'grant' | 'deny') => setFormData({ ...formData, effect: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grant">{language === 'ar' ? 'منح' : 'Grant'}</SelectItem>
                <SelectItem value="deny">{language === 'ar' ? 'منع' : 'Deny'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isGlobalAdmin && (
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المستشفى (اختياري)' : 'Hospital (Optional)'}</Label>
              <Select value={formData.hospitalId} onValueChange={(value) => setFormData({ ...formData, hospitalId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'جميع المستشفيات' : 'All hospitals'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{language === 'ar' ? 'جميع المستشفيات' : 'All hospitals'}</SelectItem>
                  {hospitals.map((hospital) => (
                    <SelectItem key={hospital.id} value={hospital.id}>
                      {language === 'ar' ? hospital.name_ar : hospital.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
              {t('cancel')}
            </Button>
            <Button size="sm" onClick={handleAddPermission}>
              {language === 'ar' ? 'إضافة' : 'Add'}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {userPermissions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {language === 'ar' ? 'لا توجد صلاحيات إضافية' : 'No additional permissions'}
          </p>
        ) : (
          userPermissions.map((up) => (
            <div key={up.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{getPermissionName(up.permission_key)}</span>
                  <Badge variant={up.effect === 'grant' ? 'default' : 'destructive'}>
                    {up.effect === 'grant' ? (language === 'ar' ? 'منح' : 'Grant') : language === 'ar' ? 'منع' : 'Deny'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{getHospitalName(up.hospital_id)}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleRemovePermission(up.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
