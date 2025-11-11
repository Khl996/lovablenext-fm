import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface Asset {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  status: string;
}

interface AssetActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Asset | null;
  onActionComplete: () => void;
}

type ActionType = 'status_change' | 'maintenance' | 'transfer' | 'inspection' | 'repair';

export function AssetActionsDialog({ open, onOpenChange, asset, onActionComplete }: AssetActionsDialogProps) {
  const { language } = useLanguage();
  const { user, hospitalId } = useCurrentUser();
  const { toast } = useToast();
  const [actionType, setActionType] = useState<ActionType>('status_change');
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!asset || !user || !hospitalId) return;

    setLoading(true);
    try {
      const actionMap = {
        status_change: language === 'ar' ? 'تغيير الحالة' : 'Status Change',
        maintenance: language === 'ar' ? 'صيانة' : 'Maintenance',
        transfer: language === 'ar' ? 'نقل' : 'Transfer',
        inspection: language === 'ar' ? 'فحص' : 'Inspection',
        repair: language === 'ar' ? 'إصلاح' : 'Repair',
      };

      let details = notes;
      let beforeData: any = { status: asset.status };
      let afterData: any = {};

      // If status change, update the asset
      if (actionType === 'status_change' && newStatus) {
        const { error: updateError } = await supabase
          .from('assets')
          .update({ status: newStatus as any })
          .eq('id', asset.id);

        if (updateError) throw updateError;

        afterData = { status: newStatus };
        details = `${language === 'ar' ? 'تم تغيير حالة الأصل من' : 'Changed asset status from'} "${asset.status}" ${language === 'ar' ? 'إلى' : 'to'} "${newStatus}". ${notes}`;
      }

      // Log the operation
      const { error: logError } = await supabase
        .from('operations_log')
        .insert({
          hospital_id: hospitalId,
          asset_id: asset.id,
          type: 'maintenance',
          code: `OP-${Date.now()}`,
          system_type: 'Asset Management',
          asset_name: language === 'ar' ? asset.name_ar : asset.name,
          location: '-',
          previous_status: asset.status,
          new_status: newStatus || asset.status,
          technician_name: user.email || 'Unknown',
          reason: actionMap[actionType],
          description: details,
          notes: notes,
          status: 'completed',
          performed_by: user.id,
        } as any);

      if (logError) throw logError;

      toast({
        title: language === 'ar' ? 'تم تسجيل العملية' : 'Operation Logged',
        description: language === 'ar'
          ? 'تم تسجيل العملية في سجل العمليات بنجاح'
          : 'Operation has been logged successfully',
      });

      onActionComplete();
      onOpenChange(false);
      setActionType('status_change');
      setNewStatus('');
      setNotes('');
    } catch (error: any) {
      console.error('Error logging operation:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'تسجيل عملية على الأصل' : 'Log Asset Operation'}
          </DialogTitle>
          <DialogDescription>
            {language === 'ar' ? 'سجل عملية جديدة على' : 'Log a new operation for'} {language === 'ar' ? asset.name_ar : asset.name} ({asset.code})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'نوع العملية' : 'Operation Type'}</Label>
            <Select value={actionType} onValueChange={(v) => setActionType(v as ActionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="status_change">
                  {language === 'ar' ? 'تغيير الحالة' : 'Status Change'}
                </SelectItem>
                <SelectItem value="maintenance">
                  {language === 'ar' ? 'صيانة' : 'Maintenance'}
                </SelectItem>
                <SelectItem value="transfer">
                  {language === 'ar' ? 'نقل' : 'Transfer'}
                </SelectItem>
                <SelectItem value="inspection">
                  {language === 'ar' ? 'فحص' : 'Inspection'}
                </SelectItem>
                <SelectItem value="repair">
                  {language === 'ar' ? 'إصلاح' : 'Repair'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {actionType === 'status_change' && (
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الحالة الجديدة' : 'New Status'}</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر الحالة' : 'Select status'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{language === 'ar' ? 'نشط' : 'Active'}</SelectItem>
                  <SelectItem value="maintenance">{language === 'ar' ? 'صيانة' : 'Maintenance'}</SelectItem>
                  <SelectItem value="inactive">{language === 'ar' ? 'غير نشط' : 'Inactive'}</SelectItem>
                  <SelectItem value="retired">{language === 'ar' ? 'متقاعد' : 'Retired'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الملاحظات' : 'Notes'}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={language === 'ar' ? 'أدخل ملاحظات العملية...' : 'Enter operation notes...'}
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
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {language === 'ar' ? 'تسجيل' : 'Log Operation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}