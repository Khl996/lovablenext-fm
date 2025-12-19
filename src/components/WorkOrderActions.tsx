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
import { CheckCircle2, XCircle, MessageSquare, RefreshCw, Ban, RotateCcw } from 'lucide-react';
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
  const { user, permissions, roles, customRoles, roleConfig, hospitalId } = useCurrentUser();
  
  const [notes, setNotes] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReturnToPendingDialog, setShowReturnToPendingDialog] = useState(false);
  const [rejectStage, setRejectStage] = useState('');
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [checkingTeamMembership, setCheckingTeamMembership] = useState(true);
  const [isAssignedToBuilding, setIsAssignedToBuilding] = useState(false);
  const [dialogNotes, setDialogNotes] = useState('');

  // Get user roles for state machine - extract actual user roles
  const baseUserRoles: string[] = [
    ...roles.map((r) => r.role),
    // Normalize custom role codes like 'eng' to match workflow roles
    ...customRoles.map((r) => (r.role_code.toLowerCase() === 'eng' ? 'engineer' : r.role_code)),
  ];
  const isReporter = user?.id === workOrder?.reported_by;

  // Treat any member of the assigned team as a technician if they have no explicit role
  const workflowRoles: string[] = [...baseUserRoles];
  if (isTeamMember && workflowRoles.length === 0) {
    workflowRoles.push('technician');
  }

  const { state } = useWorkOrderState({
    workOrder,
    userRoles: workflowRoles,
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

  // Check if user is assigned to the building
  useEffect(() => {
    const checkBuildingAssignment = async () => {
      if (!workOrder.building_id || !user?.id) return;
      
      const { data } = await supabase
        .from('supervisor_buildings')
        .select('id')
        .eq('user_id', user.id)
        .eq('building_id', workOrder.building_id)
        .maybeSingle();
      
      setIsAssignedToBuilding(!!data);
    };

    checkBuildingAssignment();
  }, [workOrder.building_id, user?.id]);

  // Determine what actions are available using roleConfig
  const status = workOrder.status;

  // Check roleConfig permissions - strictly per roleConfig only
  const canStartWork = !!(roleConfig?.modules.workOrders.startWork) && isTeamMember && (state?.can.start ?? false);
  const canCompleteWork = !!(roleConfig?.modules.workOrders.completeWork) && isTeamMember && (state?.can.complete ?? false);
  const canApproveAsSupervisor = !!(roleConfig?.modules.workOrders.approve) && (isTeamMember || isAssignedToBuilding) && (state?.can.approve ?? false);
  const canReviewAsEngineer = !!(roleConfig?.modules.workOrders.reviewAsEngineer) && (state?.can.review ?? false);
  const canCloseAsReporter = isReporter && (state?.can.close ?? false);
  // Reporter can reject when in pending_reporter_closure status
  const canRejectAsReporter = isReporter && status === 'pending_reporter_closure';

  // Technician can reject from assigned status (before starting work)
  const canRejectFromAssigned = isTeamMember && status === 'assigned';

  const canFinalApprove =
    !!(roleConfig?.modules.workOrders.finalApprove) &&
    permissions.hasPermission('work_orders.final_approve', hospitalId) &&
    (workOrder.customer_reviewed_at || status === 'auto_closed') &&
    !workOrder.maintenance_manager_approved_at;

  // Manager can add notes at any stage before final approval
  const canAddManagerNotes = 
    permissions.hasPermission('work_orders.final_approve', hospitalId) &&
    !workOrder.maintenance_manager_approved_at &&
    status !== 'completed' && status !== 'cancelled';

  const canReject = !!(roleConfig?.modules.workOrders.reject) && isTeamMember && (state?.can.reject ?? false);

  const canReassign = !!(roleConfig?.modules.workOrders.reassign) && (state?.can.reassign ?? (
    permissions.hasPermission('work_orders.approve', hospitalId) ||
    permissions.hasPermission('work_orders.manage', hospitalId)
  ));

  const canAddUpdate = !!(roleConfig?.modules.workOrders.update) && (state?.can.update ?? (
    isTeamMember &&
    workOrder.assigned_team &&
    (status === 'assigned' || status === 'pending' || status === 'in_progress')
  ));

  // Check if supervisor/manager can handle rejected_by_technician status
  const isRejectedByTechnician = status === 'rejected_by_technician';
  const canCancelWorkOrder = isRejectedByTechnician && (state?.can.cancel ?? false);
  const canReturnToPending = isRejectedByTechnician && (state?.can.returnToPending ?? false);

  // Debug logging
  console.log('🎯 Action permissions:', {
    status,
    isTeamMember,
    isReporter,
    workflowRoles,
    canStartWork,
    canCompleteWork,
    canApproveAsSupervisor,
    canReviewAsEngineer,
    canCloseAsReporter,
    canRejectAsReporter,
    canRejectFromAssigned,
    canFinalApprove,
    canAddManagerNotes,
    canReject,
    canReassign,
    canAddUpdate,
    canCancelWorkOrder,
    canReturnToPending,
    isRejectedByTechnician,
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

  const handleAddManagerNotes = () => {
    actions.addManagerNotes({ workOrderId: workOrder.id, notes });
    setNotes('');
  };

  const handleCancelWorkOrder = () => {
    actions.cancelWorkOrder({ workOrderId: workOrder.id, notes: dialogNotes });
    setShowCancelDialog(false);
    setDialogNotes('');
  };

  const handleReturnToPending = () => {
    actions.returnToPending({ workOrderId: workOrder.id, notes: dialogNotes });
    setShowReturnToPendingDialog(false);
    setDialogNotes('');
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
      !canCloseAsReporter && !canFinalApprove && !canAddManagerNotes && !canRejectFromAssigned &&
      !isRejectedByTechnician) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            {isRejectedByTechnician && (language === 'ar' ? 'معالجة الرفض' : 'Handle Rejection')}
            {!isRejectedByTechnician && canStartWork && (language === 'ar' ? 'بدء العمل' : 'Start Work')}
            {!isRejectedByTechnician && canCompleteWork && (language === 'ar' ? 'إكمال العمل' : 'Complete Work')}
            {!isRejectedByTechnician && canApproveAsSupervisor && (language === 'ar' ? 'اعتماد المشرف' : 'Supervisor Approval')}
            {!isRejectedByTechnician && canReviewAsEngineer && (language === 'ar' ? 'مراجعة المهندس' : 'Engineer Review')}
            {!isRejectedByTechnician && canCloseAsReporter && (language === 'ar' ? 'إغلاق البلاغ' : 'Close Work Order')}
            {!isRejectedByTechnician && canFinalApprove && (language === 'ar' ? 'الاعتماد النهائي' : 'Final Approval')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show rejection info for rejected_by_technician status */}
          {isRejectedByTechnician && workOrder.rejection_reason && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm font-medium text-destructive mb-1">
                {language === 'ar' ? 'سبب رفض الفني:' : 'Technician rejection reason:'}
              </p>
              <p className="text-sm text-muted-foreground">{workOrder.rejection_reason}</p>
            </div>
          )}

          {!canStartWork && !isRejectedByTechnician && (
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
              <>
                <Button
                  onClick={handleStartWork}
                  disabled={actions.loading}
                  className="flex-1"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'بدء العمل' : 'Start Work'}
                </Button>
                {canRejectFromAssigned && (
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
                    {language === 'ar' ? 'رفض' : 'Reject'}
                  </Button>
                )}
              </>
            )}

            {!canStartWork && canRejectFromAssigned && (
              <Button
                onClick={() => {
                  setRejectStage('technician');
                  setShowRejectDialog(true);
                }}
                disabled={actions.loading}
                variant="destructive"
                className="w-full"
              >
                <XCircle className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'رفض أمر العمل' : 'Reject Work Order'}
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
              <>
                <Button
                  onClick={handleReporterClosure}
                  disabled={actions.loading}
                  className="flex-1"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'إغلاق' : 'Close'}
                </Button>
                <Button
                  onClick={() => {
                    setRejectStage('reporter');
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

            {canAddManagerNotes && !canFinalApprove && (
              <Button
                onClick={handleAddManagerNotes}
                disabled={actions.loading || !notes.trim()}
                variant="secondary"
                className="flex-1"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'إضافة ملاحظة المدير' : 'Add Manager Note'}
              </Button>
            )}
          </div>

          {/* Actions for rejected_by_technician status */}
          {isRejectedByTechnician && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-sm font-medium text-muted-foreground mb-3">
                {language === 'ar' ? 'اختر الإجراء المناسب:' : 'Choose an action:'}
              </p>
              
              {canReassign && (
                <Button
                  variant="default"
                  onClick={() => setShowReassignDialog(true)}
                  disabled={actions.loading}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'إعادة تعيين لفني آخر' : 'Reassign to Another Technician'}
                </Button>
              )}
              
              {canReturnToPending && (
                <Button
                  variant="secondary"
                  onClick={() => setShowReturnToPendingDialog(true)}
                  disabled={actions.loading}
                  className="w-full"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'إرجاع للتوزيع التلقائي' : 'Return to Auto-Distribution'}
                </Button>
              )}
              
              {canCancelWorkOrder && (
                <Button
                  variant="destructive"
                  onClick={() => setShowCancelDialog(true)}
                  disabled={actions.loading}
                  className="w-full"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'إلغاء أمر العمل' : 'Cancel Work Order'}
                </Button>
              )}
            </div>
          )}

          {!isRejectedByTechnician && canReassign && (
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

      {/* Cancel Work Order Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ar' ? 'تأكيد الإلغاء' : 'Confirm Cancellation'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                {language === 'ar'
                  ? 'هل أنت متأكد من إلغاء أمر العمل نهائيًا؟'
                  : 'Are you sure you want to permanently cancel this work order?'}
              </p>
              <div className="space-y-2">
                <Label>
                  {language === 'ar' ? 'سبب الإلغاء' : 'Cancellation Reason'}
                </Label>
                <Textarea
                  value={dialogNotes}
                  onChange={(e) => setDialogNotes(e.target.value)}
                  placeholder={language === 'ar' ? 'اكتب سبب الإلغاء...' : 'Enter cancellation reason...'}
                  rows={4}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDialogNotes('')}>
              {language === 'ar' ? 'تراجع' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelWorkOrder} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!dialogNotes.trim()}
            >
              {language === 'ar' ? 'إلغاء أمر العمل' : 'Cancel Work Order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Return to Pending Dialog */}
      <AlertDialog open={showReturnToPendingDialog} onOpenChange={setShowReturnToPendingDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ar' ? 'إرجاع للتوزيع التلقائي' : 'Return to Auto-Distribution'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                {language === 'ar'
                  ? 'سيتم إزالة الفريق المعين وإرجاع الأمر لقائمة الانتظار للتوزيع على فريق آخر تلقائيًا'
                  : 'The assigned team will be removed and the work order will be returned to the queue for automatic distribution'}
              </p>
              <div className="space-y-2">
                <Label>
                  {language === 'ar' ? 'سبب الإرجاع' : 'Return Reason'}
                </Label>
                <Textarea
                  value={dialogNotes}
                  onChange={(e) => setDialogNotes(e.target.value)}
                  placeholder={language === 'ar' ? 'اكتب السبب...' : 'Enter reason...'}
                  rows={4}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDialogNotes('')}>
              {language === 'ar' ? 'تراجع' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReturnToPending}
              disabled={!dialogNotes.trim()}
            >
              {language === 'ar' ? 'إرجاع للتوزيع' : 'Return to Queue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
