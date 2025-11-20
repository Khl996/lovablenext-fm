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
      <CardContent className="space-y-6">
        {/* Description */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">
            {language === 'ar' ? 'وصف المشكلة' : 'Problem Description'}
          </Label>
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-foreground whitespace-pre-wrap leading-relaxed">
              {workOrder.description}
            </p>
          </div>
        </div>

        {/* Technician Notes */}
        {workOrder.technician_notes && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">
              {language === 'ar' ? 'ملاحظات الفني' : 'Technician Notes'}
            </Label>
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {workOrder.technician_notes}
              </p>
            </div>
          </div>
        )}

        {/* Work Notes */}
        {workOrder.work_notes && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">
              {language === 'ar' ? 'ملاحظات العمل' : 'Work Notes'}
            </Label>
            <div className="p-4 rounded-lg bg-muted/50 border">
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {workOrder.work_notes}
              </p>
            </div>
          </div>
        )}

        {/* Supervisor Notes */}
        {workOrder.supervisor_notes && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">
              {language === 'ar' ? 'ملاحظات المشرف' : 'Supervisor Notes'}
            </Label>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {workOrder.supervisor_notes}
              </p>
            </div>
          </div>
        )}

        {/* Engineer Notes */}
        {workOrder.engineer_notes && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">
              {language === 'ar' ? 'ملاحظات المهندس' : 'Engineer Notes'}
            </Label>
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900">
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {workOrder.engineer_notes}
              </p>
            </div>
          </div>
        )}

        {/* Manager Notes */}
        {workOrder.maintenance_manager_notes && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">
              {language === 'ar' ? 'ملاحظات مدير الصيانة' : 'Maintenance Manager Notes'}
            </Label>
            <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {workOrder.maintenance_manager_notes}
              </p>
            </div>
          </div>
        )}

        {/* Customer Feedback */}
        {workOrder.customer_feedback && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">
              {language === 'ar' ? 'ملاحظات العميل' : 'Customer Feedback'}
            </Label>
            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900">
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {workOrder.customer_feedback}
              </p>
              {workOrder.customer_rating && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {language === 'ar' ? 'التقييم:' : 'Rating:'}
                  </span>
                  <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                    {workOrder.customer_rating}/5 ⭐
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
