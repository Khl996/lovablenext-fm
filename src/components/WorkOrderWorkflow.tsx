import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

type WorkflowStep = {
  title: string;
  titleAr: string;
  completed: boolean;
  timestamp?: string;
  userName?: string;
  notes?: string;
  rejected?: boolean;
  pending?: boolean;
};

type WorkOrderWorkflowProps = {
  workOrder: any;
  reporterName: string;
  supervisorName: string;
  engineerName: string;
  managerName: string;
  assignedTeamName: string;
};

export function WorkOrderWorkflow({
  workOrder,
  reporterName,
  supervisorName,
  engineerName,
  managerName,
  assignedTeamName,
}: WorkOrderWorkflowProps) {
  const { language } = useLanguage();

  const steps: WorkflowStep[] = [
    {
      title: 'Report Submitted',
      titleAr: 'تم إرسال البلاغ',
      completed: true,
      timestamp: workOrder.reported_at,
      userName: reporterName,
    },
    {
      title: 'Assigned to Team',
      titleAr: 'تم التعيين للفريق',
      completed: !!workOrder.assigned_team,
      timestamp: workOrder.assigned_at,
      userName: assignedTeamName,
      pending: !workOrder.assigned_team,
    },
    {
      title: 'Work Completed by Technician',
      titleAr: 'تم إنجاز العمل من الفني',
      completed: !!workOrder.technician_completed_at || workOrder.status === 'rejected_by_technician',
      timestamp: workOrder.technician_completed_at,
      notes: workOrder.technician_notes,
      rejected: workOrder.status === 'rejected_by_technician',
      pending: !workOrder.technician_completed_at && workOrder.assigned_team && workOrder.status !== 'rejected_by_technician',
    },
    {
      title: 'Supervisor Approval',
      titleAr: 'اعتماد المشرف',
      completed: !!workOrder.supervisor_approved_at,
      timestamp: workOrder.supervisor_approved_at,
      userName: supervisorName,
      notes: workOrder.supervisor_notes,
      pending: workOrder.technician_completed_at && !workOrder.supervisor_approved_at && workOrder.status !== 'rejected_by_technician',
    },
    {
      title: 'Engineer Review',
      titleAr: 'مراجعة المهندس',
      completed: !!workOrder.engineer_approved_at,
      timestamp: workOrder.engineer_approved_at,
      userName: engineerName,
      notes: workOrder.engineer_notes,
      pending: workOrder.supervisor_approved_at && !workOrder.engineer_approved_at,
    },
    {
      title: 'Reporter Closure',
      titleAr: 'إغلاق المبلغ',
      completed: !!workOrder.customer_reviewed_at || workOrder.status === 'auto_closed',
      timestamp: workOrder.customer_reviewed_at || workOrder.auto_closed_at,
      userName: reporterName,
      notes: workOrder.reporter_notes,
      pending: workOrder.engineer_approved_at && !workOrder.customer_reviewed_at && workOrder.status !== 'auto_closed',
    },
    {
      title: 'Final Approval',
      titleAr: 'الاعتماد النهائي',
      completed: !!workOrder.maintenance_manager_approved_at,
      timestamp: workOrder.maintenance_manager_approved_at,
      userName: managerName,
      notes: workOrder.maintenance_manager_notes,
      pending: (workOrder.customer_reviewed_at || workOrder.status === 'auto_closed') && !workOrder.maintenance_manager_approved_at,
    },
  ];

  const getStepIcon = (step: WorkflowStep) => {
    if (step.rejected) return <XCircle className="h-5 w-5 text-destructive" />;
    if (step.completed) return <CheckCircle2 className="h-5 w-5 text-success" />;
    if (step.pending) return <Clock className="h-5 w-5 text-warning" />;
    return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
  };

  const getStepStatus = (step: WorkflowStep) => {
    if (step.rejected) return <Badge variant="destructive">{language === 'ar' ? 'مرفوض' : 'Rejected'}</Badge>;
    if (step.completed) return <Badge variant="default">{language === 'ar' ? 'مكتمل' : 'Completed'}</Badge>;
    if (step.pending) return <Badge variant="outline">{language === 'ar' ? 'بالانتظار' : 'Pending'}</Badge>;
    return <Badge variant="secondary">{language === 'ar' ? 'لم يبدأ' : 'Not Started'}</Badge>;
  };

  // Calculate time remaining for auto-close
  const getAutoCloseWarning = () => {
    if (workOrder.status === 'pending_reporter_closure' && workOrder.pending_closure_since) {
      const pendingSince = new Date(workOrder.pending_closure_since);
      const autoCloseTime = new Date(pendingSince.getTime() + 24 * 60 * 60 * 1000);
      const now = new Date();
      const hoursRemaining = Math.max(0, Math.floor((autoCloseTime.getTime() - now.getTime()) / (1000 * 60 * 60)));
      
      if (hoursRemaining < 24) {
        return (
          <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning rounded-lg">
            <AlertCircle className="h-5 w-5 text-warning" />
            <p className="text-sm">
              {language === 'ar' 
                ? `سيتم إغلاق البلاغ تلقائياً بعد ${hoursRemaining} ساعة` 
                : `Work order will auto-close in ${hoursRemaining} hours`}
            </p>
          </div>
        );
      }
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{language === 'ar' ? 'مسار الموافقات' : 'Approval Workflow'}</CardTitle>
      </CardHeader>
      <CardContent>
        {getAutoCloseWarning()}
        
        <div className="space-y-4 mt-4">
          {steps.map((step, index) => (
            <div key={index} className="flex gap-4 items-start">
              <div className="flex flex-col items-center">
                {getStepIcon(step)}
                {index < steps.length - 1 && (
                  <div className={`w-0.5 h-12 mt-2 ${
                    step.completed ? 'bg-success' : 'bg-muted'
                  }`} />
                )}
              </div>
              
              <div className="flex-1 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">
                    {language === 'ar' ? step.titleAr : step.title}
                  </h4>
                  {getStepStatus(step)}
                </div>
                
                {step.timestamp && (
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(step.timestamp), 'dd/MM/yyyy HH:mm')}
                  </p>
                )}
                
                {step.userName && (
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'بواسطة' : 'By'}: {step.userName}
                  </p>
                )}
                
                {step.notes && (
                  <p className="text-sm mt-2 p-2 bg-muted rounded">
                    {step.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
