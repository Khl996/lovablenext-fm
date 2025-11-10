import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QrCode } from 'lucide-react';

type AssetQRCodeProps = {
  asset: {
    code: string;
    name: string;
    name_ar: string;
    category: string;
    status: string;
    building_id?: string;
    department_id?: string;
  };
};

export function AssetQRCode({ asset }: AssetQRCodeProps) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);

  const qrData = JSON.stringify({
    code: asset.code,
    name: language === 'ar' ? asset.name_ar : asset.name,
    category: asset.category,
    status: asset.status,
  });

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${language === 'ar' ? 'رمز QR للأصل' : 'Asset QR Code'} - ${asset.code}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 40px;
              }
              .qr-container {
                border: 2px solid #333;
                padding: 20px;
                display: inline-block;
                margin: 20px auto;
              }
              h1 { font-size: 24px; margin-bottom: 10px; }
              h2 { font-size: 18px; color: #666; margin-bottom: 20px; }
              img { max-width: 300px; height: auto; }
              .info { margin-top: 20px; text-align: left; }
              .info p { margin: 5px 0; }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <h1>${language === 'ar' ? asset.name_ar : asset.name}</h1>
              <h2>${asset.code}</h2>
              <img src="${qrCodeUrl}" alt="QR Code" />
              <div class="info">
                <p><strong>${language === 'ar' ? 'الفئة' : 'Category'}:</strong> ${asset.category}</p>
                <p><strong>${language === 'ar' ? 'الحالة' : 'Status'}:</strong> ${asset.status}</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <QrCode className="h-4 w-4 mr-2" />
        {language === 'ar' ? 'رمز QR' : 'QR Code'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'رمز QR للأصل' : 'Asset QR Code'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold">{language === 'ar' ? asset.name_ar : asset.name}</h3>
              <p className="text-sm text-muted-foreground">{asset.code}</p>
            </div>
            <div className="flex justify-center p-4 bg-muted rounded-lg">
              <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{language === 'ar' ? 'الفئة' : 'Category'}:</span>
                <span className="font-medium">{asset.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{language === 'ar' ? 'الحالة' : 'Status'}:</span>
                <span className="font-medium">{asset.status}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </Button>
              <Button onClick={handlePrint} className="flex-1">
                {language === 'ar' ? 'طباعة' : 'Print'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
