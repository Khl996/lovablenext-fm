import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];

interface InventoryTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem;
  onSuccess: () => void;
}

export function InventoryTransactionDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
}: InventoryTransactionDialogProps) {
  const { language, t } = useLanguage();
  const { hospitalId, user } = useCurrentUser();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    transaction_type: 'in' as 'in' | 'out' | 'adjustment',
    quantity: '',
    unit_cost: item.unit_cost?.toString() || '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      toast.error(language === 'ar' ? 'يرجى إدخال كمية صحيحة' : 'Please enter a valid quantity');
      return;
    }

    // Validate stock out quantity
    if (formData.transaction_type === 'out') {
      const requestedQty = parseFloat(formData.quantity);
      if (requestedQty > item.current_quantity) {
        toast.error(
          language === 'ar' 
            ? `مخزون غير كافي. الكمية المتاحة: ${item.current_quantity}` 
            : `Insufficient stock. Available: ${item.current_quantity}`
        );
        return;
      }
    }

    try {
      setSaving(true);

      const { error } = await supabase.from('inventory_transactions').insert([
        {
          hospital_id: hospitalId!,
          item_id: item.id,
          transaction_type: formData.transaction_type,
          quantity: parseFloat(formData.quantity),
          unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null,
          reference_type: 'manual',
          performed_by: user!.id,
          notes: formData.notes || null,
        },
      ]);

      if (error) throw error;

      toast.success(
        language === 'ar' ? 'تم تسجيل الحركة بنجاح' : 'Transaction recorded successfully'
      );

      onSuccess();
      onOpenChange(false);
      setFormData({
        transaction_type: 'in',
        quantity: '',
        unit_cost: item.unit_cost?.toString() || '',
        notes: '',
      });
    } catch (error: any) {
      console.error('Error saving transaction:', error);
      toast.error(error.message || t('errorOccurred'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'إضافة حركة مخزون' : 'Add Inventory Transaction'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            <span className="font-medium">
              {language === 'ar' ? item.name_ar : item.name}
            </span>
            <br />
            {language === 'ar' ? 'الكمية الحالية: ' : 'Current Quantity: '}
            <span className="font-semibold">{item.current_quantity.toString()}</span>{' '}
            {language === 'ar' ? item.unit_of_measure_ar : item.unit_of_measure}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="transaction_type">
              {language === 'ar' ? 'نوع الحركة' : 'Transaction Type'}
            </Label>
            <Select
              value={formData.transaction_type}
              onValueChange={(value: 'in' | 'out' | 'adjustment') =>
                setFormData({ ...formData, transaction_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in">
                  {language === 'ar' ? 'إدخال (وارد)' : 'Stock In'}
                </SelectItem>
                <SelectItem value="out">
                  {language === 'ar' ? 'إخراج (صادر)' : 'Stock Out'}
                </SelectItem>
                <SelectItem value="adjustment">
                  {language === 'ar' ? 'تعديل' : 'Adjustment'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">
              {language === 'ar' ? 'الكمية' : 'Quantity'} *
            </Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="0"
              dir="ltr"
            />
          </div>

          {formData.transaction_type === 'in' && (
            <div className="space-y-2">
              <Label htmlFor="unit_cost">
                {language === 'ar' ? 'سعر الوحدة' : 'Unit Cost'}
              </Label>
              <Input
                id="unit_cost"
                type="number"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                placeholder="0.00"
                dir="ltr"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder={
                language === 'ar'
                  ? 'سبب الحركة أو ملاحظات إضافية...'
                  : 'Reason for transaction or additional notes...'
              }
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? language === 'ar' ? 'جاري الحفظ...' : 'Saving...'
                : language === 'ar' ? 'تسجيل' : 'Record'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
