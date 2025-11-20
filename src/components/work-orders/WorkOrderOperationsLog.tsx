import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { OperationLog } from '@/types/workOrder';

interface WorkOrderOperationsLogProps {
  operations: OperationLog[];
}

export function WorkOrderOperationsLog({ operations }: WorkOrderOperationsLogProps) {
  const { language } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {language === 'ar' ? 'سجل الإجراءات' : 'Action History'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {operations.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {language === 'ar' ? 'لا توجد إجراءات مسجلة' : 'No actions recorded'}
          </p>
        ) : (
          <div className="space-y-4">
            {operations.map((op) => (
              <div key={op.id} className="flex gap-3 pb-4 border-b last:border-0">
                <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary" />
                <div className="flex-1">
                  <p className="font-medium">{op.type}</p>
                  <p className="text-sm text-muted-foreground">{op.description}</p>
                  {op.notes && (
                    <p className="text-sm mt-1">{op.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(op.timestamp), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
