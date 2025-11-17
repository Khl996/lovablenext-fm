import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type ExportButtonProps = {
  data: any[];
  filename: string;
  language: string;
};

export function ExportButton({ data, filename, language }: ExportButtonProps) {
  const { toast } = useToast();

  const exportToCSV = () => {
    if (data.length === 0) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export',
        variant: 'destructive',
      });
      return;
    }

    // Define headers
    const headers = [
      language === 'ar' ? 'الرمز' : 'Code',
      language === 'ar' ? 'الاسم' : 'Name',
      language === 'ar' ? 'النوع' : 'Type',
      language === 'ar' ? 'الحالة' : 'Status',
      language === 'ar' ? 'تاريخ البدء' : 'Start Date',
      language === 'ar' ? 'تاريخ الانتهاء' : 'End Date',
      language === 'ar' ? 'التقدم' : 'Progress'
    ];

    // Convert data to CSV format
    const csvContent = [
      headers.join(','),
      ...data.map(item => [
        item.code,
        language === 'ar' ? item.name_ar : item.name,
        item.type,
        item.status,
        format(new Date(item.start_date), 'dd/MM/yyyy'),
        format(new Date(item.end_date), 'dd/MM/yyyy'),
        `${item.progress || 0}%`
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: language === 'ar' ? 'تم التصدير' : 'Exported',
      description: language === 'ar' ? 'تم تصدير البيانات بنجاح' : 'Data exported successfully',
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportToCSV}
      className="gap-2"
    >
      <FileSpreadsheet className="h-4 w-4" />
      {language === 'ar' ? 'تصدير إلى Excel' : 'Export to Excel'}
    </Button>
  );
}
