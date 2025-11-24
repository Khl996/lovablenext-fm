import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];
type InventoryTransaction = Database['public']['Tables']['inventory_transactions']['Row'] & {
  performer_name?: string;
};

interface InventoryTransactionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem;
}

export function InventoryTransactionHistoryDialog({
  open,
  onOpenChange,
  item,
}: InventoryTransactionHistoryDialogProps) {
  const { language } = useLanguage();
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && item) {
      loadTransactions();
    }
  }, [open, item]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select('*')
        .eq('item_id', item.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user names for performers
      const performerIds = [...new Set(data?.map(t => t.performed_by) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, full_name_ar')
        .in('id', performerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const enrichedData = data?.map(transaction => ({
        ...transaction,
        performer_name: language === 'ar' 
          ? profileMap.get(transaction.performed_by)?.full_name_ar || profileMap.get(transaction.performed_by)?.full_name
          : profileMap.get(transaction.performed_by)?.full_name
      })) || [];

      setTransactions(enrichedData);
    } catch (error: any) {
      console.error('Error loading transactions:', error);
      toast.error(language === 'ar' ? 'فشل تحميل السجل' : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      in: { ar: 'إدخال (وارد)', en: 'Stock In' },
      out: { ar: 'إخراج (صادر)', en: 'Stock Out' },
      adjustment: { ar: 'تعديل', en: 'Adjustment' },
    };
    return language === 'ar' ? labels[type]?.ar : labels[type]?.en;
  };

  const getTransactionVariant = (type: string): 'default' | 'secondary' | 'destructive' => {
    if (type === 'in') return 'default';
    if (type === 'out') return 'destructive';
    return 'secondary';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'سجل الحركات' : 'Transaction History'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">{language === 'ar' ? item.name_ar : item.name}</span>
            {' • '}
            {language === 'ar' ? 'الكود: ' : 'Code: '}
            {item.code}
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {language === 'ar' ? 'لا توجد حركات' : 'No transactions'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'الكمية' : 'Quantity'}</TableHead>
                  <TableHead className="text-end">{language === 'ar' ? 'التكلفة' : 'Cost'}</TableHead>
                  <TableHead>{language === 'ar' ? 'المستخدم' : 'Performed By'}</TableHead>
                  <TableHead>{language === 'ar' ? 'ملاحظات' : 'Notes'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(
                        new Date(transaction.created_at),
                        language === 'ar' ? 'dd/MM/yyyy HH:mm' : 'MM/dd/yyyy HH:mm',
                        { locale: language === 'ar' ? ar : undefined }
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTransactionVariant(transaction.transaction_type)}>
                        {getTransactionTypeLabel(transaction.transaction_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {transaction.transaction_type === 'out' && '-'}
                      {transaction.quantity}
                    </TableCell>
                    <TableCell className="text-end">
                      {transaction.unit_cost
                        ? (transaction.unit_cost * transaction.quantity).toLocaleString(
                            language === 'ar' ? 'ar-SA' : 'en-US',
                            { style: 'currency', currency: 'SAR' }
                          )
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {transaction.performer_name || '-'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {transaction.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
