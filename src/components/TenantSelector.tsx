import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTenant } from '@/contexts/TenantContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building, X } from 'lucide-react';
import { Button } from './ui/button';

export function TenantSelector() {
  const { language } = useLanguage();
  const { profile } = useCurrentUser();
  const {
    selectedTenant,
    setSelectedTenant,
    availableTenants,
    loading,
    clearTenantSelection,
  } = useTenant();

  const isPlatformAdmin = profile?.role === 'platform_owner' ||
                          profile?.role === 'platform_admin' ||
                          profile?.is_super_admin;

  if (!isPlatformAdmin) return null;

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { variant: any; label: string; labelAr: string }> = {
      active: { variant: 'default', label: 'Active', labelAr: 'نشط' },
      trial: { variant: 'secondary', label: 'Trial', labelAr: 'تجريبي' },
      suspended: { variant: 'destructive', label: 'Suspended', labelAr: 'معلق' },
      expired: { variant: 'outline', label: 'Expired', labelAr: 'منتهي' },
    };

    const badge = badges[status] || badges.active;
    return (
      <Badge variant={badge.variant} className="text-xs">
        {language === 'ar' ? badge.labelAr : badge.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building className="h-4 w-4" />
        {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {selectedTenant ? (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-md border border-primary/20">
          <Building className="h-4 w-4 text-primary" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {language === 'ar' ? selectedTenant.name_ar : selectedTenant.name}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={clearTenantSelection}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Select
          value={selectedTenant?.id || ''}
          onValueChange={(value) => {
            const tenant = availableTenants.find((t) => t.id === value);
            if (tenant) setSelectedTenant(tenant);
          }}
        >
          <SelectTrigger className="w-[250px]">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <SelectValue
                placeholder={
                  language === 'ar'
                    ? 'اختر مؤسسة للعرض'
                    : 'Select tenant to view'
                }
              />
            </div>
          </SelectTrigger>
          <SelectContent>
            {availableTenants.map((tenant) => (
              <SelectItem key={tenant.id} value={tenant.id}>
                <div className="flex items-center justify-between gap-3 w-full">
                  <span className="font-medium">
                    {language === 'ar' ? tenant.name_ar : tenant.name}
                  </span>
                  {getStatusBadge(tenant.subscription_status)}
                </div>
              </SelectItem>
            ))}
            {availableTenants.length === 0 && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                {language === 'ar'
                  ? 'لا توجد مؤسسات'
                  : 'No tenants available'}
              </div>
            )}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
