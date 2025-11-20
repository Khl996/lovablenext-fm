import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { FileText } from 'lucide-react';
import type { WorkOrder } from '@/types/workOrder';

interface WorkOrderInfoProps {
  workOrder: WorkOrder;
}

export function WorkOrderInfo({ workOrder }: WorkOrderInfoProps) {
  const { language } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {language === 'ar' ? 'تفاصيل البلاغ' : 'Report Details'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-muted-foreground">
            {language === 'ar' ? 'الوصف' : 'Description'}
          </Label>
          <p className="mt-1">{workOrder.description}</p>
        </div>

        {workOrder.work_notes && (
          <div>
            <Label className="text-muted-foreground">
              {language === 'ar' ? 'ملاحظات العمل' : 'Work Notes'}
            </Label>
            <p className="mt-1">{workOrder.work_notes}</p>
          </div>
        )}

        {workOrder.supervisor_notes && (
          <div>
            <Label className="text-muted-foreground">
              {language === 'ar' ? 'ملاحظات المشرف' : 'Supervisor Notes'}
            </Label>
            <p className="mt-1">{workOrder.supervisor_notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
