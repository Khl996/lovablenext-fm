import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, User, AlertCircle, UserCog } from 'lucide-react';
import { format } from 'date-fns';
import type { WorkOrder } from '@/types/workOrder';

interface WorkOrderQuickInfoProps {
  workOrder: WorkOrder;
  reporterName: string;
  assignedTechnicianName: string;
  supervisorName: string;
}

export function WorkOrderQuickInfo({
  workOrder,
  reporterName,
  assignedTechnicianName,
  supervisorName
}: WorkOrderQuickInfoProps) {
  const { language } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{language === 'ar' ? 'معلومات سريعة' : 'Quick Info'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{language === 'ar' ? 'تاريخ البلاغ:' : 'Reported:'}</span>
          <span className="font-medium">
            {format(new Date(workOrder.reported_at), 'dd/MM/yyyy')}
          </span>
        </div>

        {reporterName && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{language === 'ar' ? 'المبلغ:' : 'Reporter:'}</span>
            <span className="font-medium">{reporterName}</span>
          </div>
        )}

        {assignedTechnicianName && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{language === 'ar' ? 'الفني المعين:' : 'Assigned To:'}</span>
            <span className="font-medium">{assignedTechnicianName}</span>
          </div>
        )}

        {workOrder.urgency && (
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{language === 'ar' ? 'النوع:' : 'Type:'}</span>
            <span className="font-medium">{workOrder.urgency}</span>
          </div>
        )}

        {supervisorName && (
          <div className="flex items-center gap-2 text-sm">
            <UserCog className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{language === 'ar' ? 'المشرف:' : 'Supervisor:'}</span>
            <span className="font-medium">{supervisorName}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
