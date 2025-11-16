import { useState } from 'react';
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

type WorkOrderUpdateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderId: string;
  onSuccess: () => void;
};

export function WorkOrderUpdateDialog({
  open,
  onOpenChange,
  workOrderId,
  onSuccess,
}: WorkOrderUpdateDialogProps) {
  const { language } = useLanguage();
  const { user } = useCurrentUser();
  const { toast } = useToast();

  const [updateType, setUpdateType] = useState<'note' | 'delay' | 'progress' | 'issue'>('note');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const updateTypes = [
    { value: 'note', label: language === 'ar' ? 'ملاحظة عامة' : 'General Note' },
    { value: 'delay', label: language === 'ar' ? 'تأخير' : 'Delay' },
    { value: 'progress', label: language === 'ar' ? 'تقدم في العمل' : 'Progress Update' },
    { value: 'issue', label: language === 'ar' ? 'مشكلة' : 'Issue' },
  ];

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى كتابة الملاحظة' : 'Please enter a note',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from('work_order_updates').insert({
        work_order_id: workOrderId,
        user_id: user?.id,
        update_type: updateType,
        message: message,
        is_internal: false,
      });

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم إضافة الملاحظة' : 'Update added successfully',
      });

      onSuccess();
      onOpenChange(false);
      setMessage('');
      setUpdateType('note');
    } catch (error: any) {
      console.error('Error adding update:', error);
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
            {language === 'ar' ? 'إضافة ملاحظة' : 'Add Update'}
          </DialogTitle>
          <DialogDescription>
            {language === 'ar'
              ? 'أضف ملاحظة أو تحديث على أمر العمل بدون الحاجة لاعتماد'
              : 'Add a note or update to the work order without requiring approval'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>
              {language === 'ar' ? 'نوع التحديث' : 'Update Type'}
            </Label>
            <Select value={updateType} onValueChange={(value: any) => setUpdateType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {updateTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              {language === 'ar' ? 'الملاحظة' : 'Message'}
            </Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                updateType === 'delay'
                  ? language === 'ar'
                    ? 'مثال: تأخر العمل بسبب انتظار قطع الغيار'
                    : 'Example: Work delayed due to waiting for spare parts'
                  : updateType === 'progress'
                  ? language === 'ar'
                    ? 'مثال: تم إنجاز 50% من العمل'
                    : 'Example: 50% of work completed'
                  : language === 'ar'
                  ? 'اكتب الملاحظة هنا...'
                  : 'Enter your note here...'
              }
              rows={5}
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
            {loading
              ? language === 'ar' ? 'جاري الإضافة...' : 'Adding...'
              : language === 'ar' ? 'إضافة' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
