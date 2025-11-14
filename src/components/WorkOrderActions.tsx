import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type WorkOrderActionsProps = {
  workOrder: any;
  onActionComplete: () => void;
};

export function WorkOrderActions({ workOrder, onActionComplete }: WorkOrderActionsProps) {
  const { language } = useLanguage();
  const { user, permissions } = useCurrentUser();
  const { toast } = useToast();
  
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // Determine what action the current user can take
  const canStartWork = workOrder.assigned_team && 
    (workOrder.status === 'pending' || workOrder.status === 'assigned') &&
    !workOrder.start_time;
  
  const canCompletework = workOrder.assigned_team && 
    workOrder.status === 'in_progress' &&
    !workOrder.technician_completed_at;
  
  const canReject = workOrder.assigned_team && 
    workOrder.status === 'in_progress' &&
    !workOrder.technician_completed_at;
  
  const canApproveAsSupervisor = workOrder.technician_completed_at && 
    !workOrder.supervisor_approved_at &&
    workOrder.status !== 'rejected_by_technician' &&
    permissions.hasPermission('work_orders.approve_as_supervisor');
  
  const canReviewAsEngineer = workOrder.supervisor_approved_at && 
    !workOrder.engineer_approved_at &&
    permissions.hasPermission('work_orders.review_as_engineer');
  
  const canCloseAsReporter = workOrder.reported_by === user?.id && 
    workOrder.engineer_approved_at && 
    !workOrder.customer_reviewed_at &&
    workOrder.status !== 'auto_closed';
  
  const canFinalApprove = (workOrder.customer_reviewed_at || workOrder.status === 'auto_closed') && 
    !workOrder.maintenance_manager_approved_at &&
    permissions.hasPermission('work_orders.final_approve');

  const handleStartWork = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('work_orders')
        .update({
          status: 'in_progress' as any,
          start_time: new Date().toISOString(),
        })
        .eq('id', workOrder.id);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم بدء العمل' : 'Work started',
      });

      onActionComplete();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteWork = async () => {
    if (!notes.trim()) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى إضافة ملاحظات' : 'Please add notes',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('work_orders')
        .update({
          status: 'pending_supervisor_approval' as any,
          technician_completed_at: new Date().toISOString(),
          technician_notes: notes,
        })
        .eq('id', workOrder.id);

      if (error) throw error;

      // Send notification
      await supabase.functions.invoke('notify-work-order-updates', {
        body: {
          workOrderId: workOrder.id,
          action: 'completed',
          performedBy: user?.id,
        },
      });

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم إكمال العمل بنجاح' : 'Work completed successfully',
      });

      onActionComplete();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!notes.trim()) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى إضافة سبب الرفض' : 'Please add rejection reason',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('work_orders')
        .update({
          status: 'rejected_by_technician' as any,
          technician_notes: notes,
          redirect_reason: notes,
          is_redirected: true,
        })
        .eq('id', workOrder.id);

      if (error) throw error;

      // Send notification to engineers
      await supabase.functions.invoke('notify-work-order-updates', {
        body: {
          workOrderId: workOrder.id,
          action: 'rejected_by_technician',
          performedBy: user?.id,
        },
      });

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم رفض البلاغ' : 'Work order rejected',
      });

      setShowRejectDialog(false);
      onActionComplete();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSupervisorApproval = async () => {
    if (!notes.trim()) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى إضافة ملاحظات' : 'Please add notes',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('work_orders')
        .update({
          status: 'pending_engineer_review' as any,
          supervisor_approved_at: new Date().toISOString(),
          supervisor_approved_by: user?.id,
          supervisor_notes: notes,
        })
        .eq('id', workOrder.id);

      if (error) throw error;

      await supabase.functions.invoke('notify-work-order-updates', {
        body: {
          workOrderId: workOrder.id,
          action: 'supervisor_approved',
          performedBy: user?.id,
        },
      });

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم اعتماد البلاغ' : 'Work order approved',
      });

      onActionComplete();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEngineerReview = async () => {
    if (!notes.trim()) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى إضافة ملاحظات' : 'Please add notes',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('work_orders')
        .update({
          status: 'pending_reporter_closure' as any,
          engineer_approved_at: new Date().toISOString(),
          engineer_approved_by: user?.id,
          engineer_notes: notes,
        })
        .eq('id', workOrder.id);

      if (error) throw error;

      await supabase.functions.invoke('notify-work-order-updates', {
        body: {
          workOrderId: workOrder.id,
          action: 'engineer_approved',
          performedBy: user?.id,
        },
      });

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تمت المراجعة بنجاح' : 'Review completed successfully',
      });

      onActionComplete();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReporterClosure = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('work_orders')
        .update({
          status: 'closed' as any,
          customer_reviewed_at: new Date().toISOString(),
          customer_reviewed_by: user?.id,
          reporter_notes: notes,
        })
        .eq('id', workOrder.id);

      if (error) throw error;

      await supabase.functions.invoke('notify-work-order-updates', {
        body: {
          workOrderId: workOrder.id,
          action: 'customer_reviewed',
          performedBy: user?.id,
        },
      });

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم إغلاق البلاغ' : 'Work order closed',
      });

      onActionComplete();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFinalApproval = async () => {
    if (!notes.trim()) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى إضافة ملاحظات' : 'Please add notes',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('work_orders')
        .update({
          status: 'completed' as any,
          maintenance_manager_approved_at: new Date().toISOString(),
          maintenance_manager_approved_by: user?.id,
          maintenance_manager_notes: notes,
        })
        .eq('id', workOrder.id);

      if (error) throw error;

      await supabase.functions.invoke('notify-work-order-updates', {
        body: {
          workOrderId: workOrder.id,
          action: 'final_approved',
          performedBy: user?.id,
        },
      });

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم الاعتماد النهائي' : 'Final approval completed',
      });

      onActionComplete();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // If no action is available, don't render
  if (!canStartWork && !canCompletework && !canApproveAsSupervisor && !canReviewAsEngineer && 
      !canCloseAsReporter && !canFinalApprove) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            {canStartWork && (language === 'ar' ? 'بدء العمل' : 'Start Work')}
            {canCompletework && (language === 'ar' ? 'إكمال العمل' : 'Complete Work')}
            {canApproveAsSupervisor && (language === 'ar' ? 'اعتماد المشرف' : 'Supervisor Approval')}
            {canReviewAsEngineer && (language === 'ar' ? 'مراجعة المهندس' : 'Engineer Review')}
            {canCloseAsReporter && (language === 'ar' ? 'إغلاق البلاغ' : 'Close Work Order')}
            {canFinalApprove && (language === 'ar' ? 'الاعتماد النهائي' : 'Final Approval')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canStartWork && (
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الملاحظات' : 'Notes'} *</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={language === 'ar' ? 'أضف ملاحظاتك...' : 'Add your notes...'}
                rows={4}
                required
              />
            </div>
          )}

          <div className="flex gap-2">
            {canStartWork && (
              <Button
                onClick={handleStartWork}
                disabled={loading}
                className="w-full"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'بدء العمل' : 'Start Work'}
              </Button>
            )}

            {canCompletework && (
              <>
                <Button
                  onClick={handleCompleteWork}
                  disabled={loading}
                  className="flex-1"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'إكمال' : 'Complete'}
                </Button>
                <Button
                  onClick={() => setShowRejectDialog(true)}
                  disabled={loading}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'رفض' : 'Reject'}
                </Button>
              </>
            )}

            {canApproveAsSupervisor && (
              <Button
                onClick={handleSupervisorApproval}
                disabled={loading}
                className="flex-1"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'اعتماد' : 'Approve'}
              </Button>
            )}

            {canReviewAsEngineer && (
              <Button
                onClick={handleEngineerReview}
                disabled={loading}
                className="flex-1"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'مراجعة واعتماد' : 'Review & Approve'}
              </Button>
            )}

            {canCloseAsReporter && (
              <Button
                onClick={handleReporterClosure}
                disabled={loading}
                className="flex-1"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </Button>
            )}

            {canFinalApprove && (
              <Button
                onClick={handleFinalApproval}
                disabled={loading}
                className="flex-1"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'اعتماد نهائي' : 'Final Approve'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ar' ? 'تأكيد الرفض' : 'Confirm Rejection'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' 
                ? 'هل أنت متأكد من رفض هذا البلاغ؟ سيتم إعادة توجيهه إلى المهندس.' 
                : 'Are you sure you want to reject this work order? It will be redirected to the engineer.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={loading}>
              {language === 'ar' ? 'تأكيد الرفض' : 'Confirm Rejection'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
