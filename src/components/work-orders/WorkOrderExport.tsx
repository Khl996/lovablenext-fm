import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';

interface WorkOrderExportProps {
  onExport: () => void;
}

export function WorkOrderExport({ onExport }: WorkOrderExportProps) {
  const { language } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{language === 'ar' ? 'التصدير' : 'Export'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button variant="outline" className="w-full" onClick={onExport}>
          <Download className="h-4 w-4 mr-2" />
          {language === 'ar' ? 'تصدير PDF' : 'Export PDF'}
        </Button>
      </CardContent>
    </Card>
  );
}
