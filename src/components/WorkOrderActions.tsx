import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, AlertCircle, MessageSquare, RefreshCw } from 'lucide-react';
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
import { WorkOrderReassignDialog } from '@/components/admin/WorkOrderReassignDialog';
import { WorkOrderUpdateDialog } from '@/components/admin/WorkOrderUpdateDialog';

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
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [rejectStage, setRejectStage] = useState('');

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
    permissions.hasPermission('work_orders.approve');
  
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

  const canReassign = permissions.hasPermission('work_orders.approve') || 
    permissions.hasPermission('work_orders.manage');

  const canAddUpdate = workOrder.assigned_team && 
    (workOrder.status === 'assigned' || workOrder.status === 'in_progress');

  const handleStartWork = async () => {
    try {
      setLoading(true);

      const { error } = await supabase.rpc('work_order_start_work', {
        _work_order_id: workOrder.id
      });

      if (error) {
        console.error('Error starting work:', error);
        throw error;
      }

      // Send email notification
      supabase.functions.invoke("send-work-order-email", {
        body: { workOrderId: workOrder.id, eventType: "work_started" },
      });

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم بدء العمل' : 'Work started',
      });

      onActionComplete();
    } catch (error: any) {
      console.error('Failed to start work:', error);
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

      const { error } = await supabase.rpc('work_order_complete_work', {
        _work_order_id: workOrder.id,
        _technician_notes: notes
      });

      if (error) throw error;

      // Send email notification
      supabase.functions.invoke("send-work-order-email", {
        body: { workOrderId: workOrder.id, eventType: "work_completed" },
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

      const { error } = await supabase.rpc('work_order_reject', {
        _work_order_id: workOrder.id,
        _rejection_reason: notes,
        _rejection_stage: rejectStage
      });

      if (error) throw error;

      // Add update log
      await supabase.from('work_order_updates').insert({
        work_order_id: workOrder.id,
        user_id: user?.id,
        update_type: 'issue',
        message: language === 'ar' 
          ? `تم الرفض من ${rejectStage === 'technician' ? 'الفني' : rejectStage === 'supervisor' ? 'المشرف' : 'المهندس'}: ${notes}`
          : `Rejected by ${rejectStage}: ${notes}`,
      });

      // Send email notification
      await supabase.functions.invoke('send-work-order-email', {
        body: { 
          workOrderId: workOrder.id, 
          eventType: 'rejected',
          rejectionStage: rejectStage
        },
      });

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم رفض أمر العمل وإرجاعه' : 'Work order rejected and returned',
      });

      setShowRejectDialog(false);
      setNotes('');
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

      const { error } = await supabase.rpc('work_order_supervisor_approve', {
        _work_order_id: workOrder.id,
        _supervisor_notes: notes
      });

      if (error) throw error;

      // Send email notification
      supabase.functions.invoke("send-work-order-email", {
        body: { workOrderId: workOrder.id, eventType: "supervisor_approved" },
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

      const { error } = await supabase.rpc('work_order_engineer_review', {
        _work_order_id: workOrder.id,
        _engineer_notes: notes
      });

      if (error) throw error;

      // Send email notification
      supabase.functions.invoke("send-work-order-email", {
        body: { workOrderId: workOrder.id, eventType: "engineer_approved" },
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

      const { error } = await supabase.rpc('work_order_reporter_closure', {
        _work_order_id: workOrder.id,
        _reporter_notes: notes || ''
      });

      if (error) throw error;

      // Send email notification
      supabase.functions.invoke("send-work-order-email", {
        body: { workOrderId: workOrder.id, eventType: "customer_reviewed" },
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

      const { error } = await supabase.rpc('work_order_final_approve', {
        _work_order_id: workOrder.id,
        _manager_notes: notes
      });

      if (error) throw error;

      // Send email notification
      supabase.functions.invoke("send-work-order-email", {
        body: { workOrderId: workOrder.id, eventType: "final_approved" },
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
                  onClick={() => {
                    setRejectStage('technician');
                    setShowRejectDialog(true);
                  }}
                  disabled={loading}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'رفض وإرجاع' : 'Reject & Return'}
                </Button>
              </>
            )}

            {canApproveAsSupervisor && (
              <>
                <Button
                  onClick={handleSupervisorApproval}
                  disabled={loading}
                  className="flex-1"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'اعتماد' : 'Approve'}
                </Button>
                <Button
                  onClick={() => {
                    setRejectStage('supervisor');
                    setShowRejectDialog(true);
                  }}
                  disabled={loading}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'رفض وإرجاع' : 'Reject & Return'}
                </Button>
              </>
            )}

            {canReviewAsEngineer && (
              <>
                <Button
                  onClick={handleEngineerReview}
                  disabled={loading}
                  className="flex-1"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'مراجعة واعتماد' : 'Review & Approve'}
                </Button>
                <Button
                  onClick={() => {
                    setRejectStage('engineer');
                    setShowRejectDialog(true);
                  }}
                  disabled={loading}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'رفض وإرجاع' : 'Reject & Return'}
                </Button>
              </>
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

          {canReassign && (
            <Button
              variant="outline"
              onClick={() => setShowReassignDialog(true)}
              disabled={loading}
              className="w-full mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'إعادة إسناد' : 'Reassign'}
            </Button>
          )}

          {canAddUpdate && (
            <Button
              variant="outline"
              onClick={() => setShowUpdateDialog(true)}
              disabled={loading}
              className="w-full mt-2"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'إضافة ملاحظة' : 'Add Update'}
            </Button>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ar' ? 'تأكيد الرفض' : 'Confirm Rejection'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                {language === 'ar'
                  ? 'هل أنت متأكد من رفض أمر العمل وإرجاعه للمرحلة السابقة؟'
                  : 'Are you sure you want to reject and return this work order?'}
              </p>
              <div className="space-y-2">
                <Label>
                  {language === 'ar' ? 'سبب الرفض' : 'Rejection Reason'}
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={language === 'ar' ? 'اكتب سبب الرفض...' : 'Enter rejection reason...'}
                  rows={4}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNotes('')}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {language === 'ar' ? 'رفض' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WorkOrderReassignDialog
        open={showReassignDialog}
        onOpenChange={setShowReassignDialog}
        workOrder={workOrder}
        onSuccess={onActionComplete}
      />

      <WorkOrderUpdateDialog
        open={showUpdateDialog}
        onOpenChange={setShowUpdateDialog}
        workOrderId={workOrder.id}
        onSuccess={onActionComplete}
      />
    </>
  );
}
