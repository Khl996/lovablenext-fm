import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type WorkOrderReassignDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrder: any;
  onSuccess: () => void;
};

export function WorkOrderReassignDialog({
  open,
  onOpenChange,
  workOrder,
  onSuccess,
}: WorkOrderReassignDialogProps) {
  const { language } = useLanguage();
  const { user, hospitalId } = useCurrentUser();
  const { toast } = useToast();

  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && hospitalId) {
      loadTeams();
    }
  }, [open, hospitalId]);

  const loadTeams = async () => {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('hospital_id', hospitalId)
      .eq('status', 'active');

    if (error) {
      console.error('Error loading teams:', error);
      return;
    }

    setTeams(data || []);
  };

  const handleReassign = async () => {
    if (!selectedTeam || !reason.trim()) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' 
          ? 'يرجى اختيار الفريق وكتابة السبب' 
          : 'Please select team and enter reason',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      // Update work order with new team
      const { error } = await supabase
        .from('work_orders')
        .update({
          assigned_team: selectedTeam,
          reassignment_count: (workOrder.reassignment_count || 0) + 1,
          last_reassigned_at: new Date().toISOString(),
          last_reassigned_by: user?.id,
          reassignment_reason: reason,
          status: 'assigned' as any,
        })
        .eq('id', workOrder.id);

      if (error) throw error;

      // Add update log
      await supabase.from('work_order_updates').insert({
        work_order_id: workOrder.id,
        user_id: user?.id,
        update_type: 'note',
        message: language === 'ar' 
          ? `تم إعادة الإسناد: ${reason}`
          : `Reassigned: ${reason}`,
      });

      // Send notification
      await supabase.functions.invoke('send-work-order-email', {
        body: { 
          workOrderId: workOrder.id, 
          eventType: 'reassigned',
          reason: reason
        },
      });

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' 
          ? 'تم إعادة إسناد أمر العمل' 
          : 'Work order reassigned successfully',
      });

      onSuccess();
      onOpenChange(false);
      setSelectedTeam('');
      setReason('');
    } catch (error: any) {
      console.error('Error reassigning work order:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'إعادة إسناد أمر العمل' : 'Reassign Work Order'}
          </DialogTitle>
          <DialogDescription>
            {language === 'ar'
              ? 'قم بتحديد الفريق الجديد وسبب إعادة الإسناد'
              : 'Select the new team and reason for reassignment'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>
              {language === 'ar' ? 'الفريق الجديد' : 'New Team'}
            </Label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'ar' ? 'اختر الفريق' : 'Select team'} />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {language === 'ar' ? team.name_ar : team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              {language === 'ar' ? 'سبب إعادة الإسناد' : 'Reason for Reassignment'}
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={language === 'ar' 
                ? 'مثال: الفريق الحالي غير متخصص في هذا النوع من الأعطال'
                : 'Example: Current team not specialized in this type of issue'}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleReassign} disabled={loading}>
            {loading 
              ? (language === 'ar' ? 'جاري الإسناد...' : 'Reassigning...')
              : (language === 'ar' ? 'إعادة الإسناد' : 'Reassign')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
