import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useWorkOrderActions } from '@/hooks/useWorkOrderActions';
import { useWorkOrderState } from '@/hooks/useWorkOrderState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, MessageSquare, RefreshCw } from 'lucide-react';
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
  const { user, permissions, roles, customRoles } = useCurrentUser();
  
  const [notes, setNotes] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [rejectStage, setRejectStage] = useState('');
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [checkingTeamMembership, setCheckingTeamMembership] = useState(true);

  // Get user roles for state machine - extract actual user roles
  const userRoles: string[] = [
    ...roles.map(r => r.role),
    ...customRoles.map(r => r.role_code),
  ];
  const isReporter = user?.id === workOrder?.reported_by;
  
  const { state } = useWorkOrderState({
    workOrder,
    userRoles,
    isReporter,
  });

  const actions = useWorkOrderActions(onActionComplete);

  // Check if current user is a member of the assigned team
  useEffect(() => {
    const checkTeamMembership = async () => {
      console.log('🔍 Checking team membership:', {
        userId: user?.id,
        assignedTeam: workOrder.assigned_team,
        workOrderStatus: workOrder.status
      });

      if (!user?.id || !workOrder.assigned_team) {
        console.log('❌ Missing user or team:', { userId: user?.id, teamId: workOrder.assigned_team });
        setIsTeamMember(false);
        setCheckingTeamMembership(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('team_members')
          .select('id')
          .eq('team_id', workOrder.assigned_team)
          .eq('user_id', user.id)
          .maybeSingle();

        console.log('✅ Team membership check result:', { data, error, isMember: !!data });

        if (error) {
          console.error('Error checking team membership:', error);
          setIsTeamMember(false);
        } else {
          setIsTeamMember(!!data);
        }
      } catch (error) {
        console.error('Error checking team membership:', error);
        setIsTeamMember(false);
      } finally {
        setCheckingTeamMembership(false);
      }
    };

    checkTeamMembership();
  }, [user?.id, workOrder.assigned_team]);

  // Determine what actions are available
  const status = workOrder.status;

  const canStartWork =
    (status === 'assigned' || status === 'pending') && isTeamMember;

  const canCompleteWork =
    status === 'in_progress' && isTeamMember;

  const canApproveAsSupervisor =
    status === 'pending_supervisor_approval' &&
    permissions.hasPermission('work_orders.approve');

  const canReviewAsEngineer =
    status === 'pending_engineer_review' &&
    permissions.hasPermission('work_orders.review_as_engineer');

  const canCloseAsReporter =
    status === 'pending_reporter_closure' && isReporter;

  const canFinalApprove =
    permissions.hasPermission('work_orders.final_approve') &&
    (workOrder.customer_reviewed_at || status === 'auto_closed') &&
    !workOrder.maintenance_manager_approved_at;

  const canReject =
    (status === 'in_progress' && isTeamMember) ||
    (status === 'pending_supervisor_approval' && permissions.hasPermission('work_orders.approve')) ||
    (status === 'pending_engineer_review' && permissions.hasPermission('work_orders.review_as_engineer'));

  const canReassign =
    permissions.hasPermission('work_orders.approve') ||
    permissions.hasPermission('work_orders.manage');

  const canAddUpdate =
    workOrder.assigned_team &&
    (status === 'assigned' || status === 'pending' || status === 'in_progress');

  // Debug logging
  console.log('🎯 Action permissions:', {
    status,
    isTeamMember,
    isReporter,
    userRoles,
    canStartWork,
    canCompleteWork,
    canApproveAsSupervisor,
    canReviewAsEngineer,
    canCloseAsReporter,
    canFinalApprove,
    canReject,
    canReassign,
    canAddUpdate
  });

  // Action handlers using the new hooks
  const handleStartWork = () => {
    actions.startWork({ workOrderId: workOrder.id });
  };

  const handleCompleteWork = () => {
    actions.completeWork({ workOrderId: workOrder.id, notes });
  };

  const handleSupervisorApproval = () => {
    actions.approveAsSupervisor({ workOrderId: workOrder.id, notes });
  };

  const handleEngineerReview = () => {
    actions.reviewAsEngineer({ workOrderId: workOrder.id, notes });
  };

  const handleReporterClosure = () => {
    actions.closeAsReporter({ workOrderId: workOrder.id, notes });
  };

  const handleFinalApproval = () => {
    actions.finalApprove({ workOrderId: workOrder.id, notes });
  };

  const handleReject = () => {
    actions.reject({ 
      workOrderId: workOrder.id, 
      notes, 
      rejectStage 
    });
    setShowRejectDialog(false);
    setNotes('');
  };

  // Show loading while checking team membership
  if (checkingTeamMembership) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  // If no action is available, don't render
  if (!canStartWork && !canCompleteWork && !canApproveAsSupervisor && !canReviewAsEngineer && 
      !canCloseAsReporter && !canFinalApprove) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            {canStartWork && (language === 'ar' ? 'بدء العمل' : 'Start Work')}
            {canCompleteWork && (language === 'ar' ? 'إكمال العمل' : 'Complete Work')}
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
                disabled={actions.loading}
                className="w-full"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'بدء العمل' : 'Start Work'}
              </Button>
            )}

            {canCompleteWork && (
              <>
                <Button
                  onClick={handleCompleteWork}
                  disabled={actions.loading}
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
                  disabled={actions.loading}
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
                  disabled={actions.loading}
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
                  disabled={actions.loading}
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
                  disabled={actions.loading}
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
                  disabled={actions.loading}
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
                disabled={actions.loading}
                className="flex-1"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </Button>
            )}

            {canFinalApprove && (
              <Button
                onClick={handleFinalApproval}
                disabled={actions.loading}
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
              disabled={actions.loading}
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
              disabled={actions.loading}
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
