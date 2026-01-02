import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Invoice, InvoiceStatus, Payment } from '@/types';
import { toast } from '@/hooks/use-toast';

export const useInvoices = () => {
  const [loading, setLoading] = useState(false);

  const getInvoices = async (tenantId?: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('invoices')
        .select(`
          *,
          tenant:tenant_id(name, name_ar)
        `)
        .order('invoice_date', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      toast({
        title: 'خطأ',
        description: 'فشل تحميل الفواتير',
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getInvoiceById = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          tenant:tenant_id(name, name_ar, email, address, phone)
        `)
        .eq('id', invoiceId)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      toast({
        title: 'خطأ',
        description: 'فشل تحميل الفاتورة',
        variant: 'destructive',
      });
      return null;
    }
  };

  const createInvoice = async (invoice: {
    tenant_id: string;
    invoice_date: string;
    due_date: string;
    subtotal: number;
    discount?: number;
    tax?: number;
    total: number;
    notes?: string;
    created_by: string;
  }) => {
    try {
      setLoading(true);

      const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const { data, error } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          ...invoice,
          status: 'draft' as InvoiceStatus
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'نجح',
        description: 'تم إنشاء الفاتورة بنجاح',
      });

      return data;
    } catch (err) {
      toast({
        title: 'خطأ',
        description: 'فشل إنشاء الفاتورة',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateInvoice = async (invoiceId: string, updates: Partial<Invoice>) => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'نجح',
        description: 'تم تحديث الفاتورة بنجاح',
      });

      return data;
    } catch (err) {
      toast({
        title: 'خطأ',
        description: 'فشل تحديث الفاتورة',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateInvoiceStatus = async (invoiceId: string, status: InvoiceStatus) => {
    try {
      const updates: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'paid') {
        updates.paid_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'نجح',
        description: 'تم تحديث حالة الفاتورة بنجاح',
      });

      return data;
    } catch (err) {
      toast({
        title: 'خطأ',
        description: 'فشل تحديث حالة الفاتورة',
        variant: 'destructive',
      });
      return null;
    }
  };

  const recordPayment = async (payment: {
    invoice_id: string;
    tenant_id: string;
    amount: number;
    payment_method: string;
    transaction_reference?: string;
    notes?: string;
    processed_by: string;
  }) => {
    try {
      setLoading(true);

      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          ...payment,
          payment_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      const { data: invoice } = await supabase
        .from('invoices')
        .select('total')
        .eq('id', payment.invoice_id)
        .single();

      if (invoice && payment.amount >= invoice.total) {
        await updateInvoiceStatus(payment.invoice_id, 'paid');

        const { data: invoiceData } = await supabase
          .from('invoices')
          .select('tenant_id')
          .eq('id', payment.invoice_id)
          .single();

        if (invoiceData) {
          const subscriptionEnds = new Date();
          subscriptionEnds.setMonth(subscriptionEnds.getMonth() + 1);

          await supabase
            .from('tenants')
            .update({
              subscription_status: 'active',
              last_payment_date: new Date().toISOString().split('T')[0],
              subscription_ends_at: subscriptionEnds.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', invoiceData.tenant_id);
        }
      }

      toast({
        title: 'نجح',
        description: 'تم تسجيل الدفع بنجاح',
      });

      return paymentData;
    } catch (err) {
      toast({
        title: 'خطأ',
        description: 'فشل تسجيل الدفع',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getInvoicePayments = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      toast({
        title: 'خطأ',
        description: 'فشل تحميل المدفوعات',
        variant: 'destructive',
      });
      return [];
    }
  };

  const deleteInvoice = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;

      toast({
        title: 'نجح',
        description: 'تم حذف الفاتورة بنجاح',
      });

      return true;
    } catch (err) {
      toast({
        title: 'خطأ',
        description: 'فشل حذف الفاتورة',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    loading,
    getInvoices,
    getInvoiceById,
    createInvoice,
    updateInvoice,
    updateInvoiceStatus,
    recordPayment,
    getInvoicePayments,
    deleteInvoice
  };
};
