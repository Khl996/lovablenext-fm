import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { MapPin } from 'lucide-react';
import type { WorkOrderAsset, WorkOrderLocation } from '@/types/workOrder';

interface WorkOrderAssetLocationProps {
  asset: WorkOrderAsset | null;
  location: WorkOrderLocation;
}

export function WorkOrderAssetLocation({ asset, location }: WorkOrderAssetLocationProps) {
  const { language } = useLanguage();

  if (!asset && Object.keys(location).length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {language === 'ar' ? 'الأصل والموقع' : 'Asset & Location'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {asset && (
          <>
            <div>
              <Label className="text-muted-foreground">{language === 'ar' ? 'اسم الأصل' : 'Asset Name'}</Label>
              <p className="font-medium">{language === 'ar' ? asset.name_ar : asset.name}</p>
            </div>
            {asset.code && (
              <div>
                <Label className="text-muted-foreground">{language === 'ar' ? 'رمز الأصل' : 'Asset Code'}</Label>
                <p className="font-medium">{asset.code}</p>
              </div>
            )}
            {asset.serial_number && (
              <div>
                <Label className="text-muted-foreground">{language === 'ar' ? 'الرقم التسلسلي' : 'Serial Number'}</Label>
                <p className="font-medium">{asset.serial_number}</p>
              </div>
            )}
            {asset.model && (
              <div>
                <Label className="text-muted-foreground">{language === 'ar' ? 'الموديل' : 'Model'}</Label>
                <p className="font-medium">{asset.model}</p>
              </div>
            )}
            <Separator />
          </>
        )}
        {Object.keys(location).length > 0 && (
          <div>
            <Label className="text-muted-foreground">{language === 'ar' ? 'الموقع' : 'Location'}</Label>
            <p className="font-medium">
              {[
                location.building ? (language === 'ar' ? location.building.name_ar : location.building.name) : '',
                location.floor ? (language === 'ar' ? location.floor.name_ar : location.floor.name) : '',
                location.department ? (language === 'ar' ? location.department.name_ar : location.department.name) : '',
                location.room ? (language === 'ar' ? location.room.name_ar : location.room.name) : '',
              ].filter(Boolean).join(' - ')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
