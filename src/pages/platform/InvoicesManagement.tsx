import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInvoices } from '@/hooks/useInvoices';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, FileText } from 'lucide-react';
import { format } from 'date-fns';
import type { Invoice } from '@/types';

export default function InvoicesManagement() {
  const { language } = useLanguage();
  const { invoices } = useInvoices();

  const getStatusBadge = (status: Invoice['status']) => {
    const config = {
      draft: { label: language === 'ar' ? 'مسودة' : 'Draft', variant: 'secondary' as const },
      sent: { label: language === 'ar' ? 'مرسلة' : 'Sent', variant: 'default' as const },
      paid: { label: language === 'ar' ? 'مدفوعة' : 'Paid', variant: 'default' as const },
      overdue: { label: language === 'ar' ? 'متأخرة' : 'Overdue', variant: 'destructive' as const },
      cancelled: { label: language === 'ar' ? 'ملغاة' : 'Cancelled', variant: 'secondary' as const },
      refunded: { label: language === 'ar' ? 'مستردة' : 'Refunded', variant: 'secondary' as const },
    };
    const item = config[status] || config.draft;
    return <Badge variant={item.variant}>{item.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {language === 'ar' ? 'إدارة الفواتير' : 'Invoices Management'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {language === 'ar' ? 'عرض وإدارة الفواتير' : 'View and manage invoices'}
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {language === 'ar' ? 'إنشاء فاتورة' : 'Create Invoice'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{language === 'ar' ? 'الفواتير' : 'Invoices'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === 'ar' ? 'رقم الفاتورة' : 'Invoice Number'}</TableHead>
                <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {language === 'ar' ? 'لا توجد فواتير' : 'No invoices found'}
                  </TableCell>
                </TableRow>
              ) : (
                invoices?.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>
                      {invoice.invoice_date ? format(new Date(invoice.invoice_date), 'MMM dd, yyyy') : '-'}
                    </TableCell>
                    <TableCell>${invoice.total?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
