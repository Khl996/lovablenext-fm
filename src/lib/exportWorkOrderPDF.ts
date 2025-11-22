import { format } from 'date-fns';
import type { WorkOrder, OperationLog, WorkOrderLocation, WorkOrderAsset } from '@/types/workOrder';

interface ExportPDFParams {
  workOrder: WorkOrder;
  operations: OperationLog[];
  asset: WorkOrderAsset | null;
  location: WorkOrderLocation;
  reporterName: string;
  assignedTechnicianName: string;
  supervisorName: string;
  engineerName: string;
  managerName: string;
  assignedTeamName: string;
  hospital: any;
  company: any;
  statusName: string;
  priorityName: string;
  language: 'ar' | 'en';
}

export function exportWorkOrderPDF(params: ExportPDFParams) {
  const {
    workOrder,
    operations,
    asset,
    location,
    reporterName,
    assignedTechnicianName,
    supervisorName,
    engineerName,
    managerName,
    hospital,
    company,
    statusName,
    priorityName,
    language
  } = params;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const locationStr = [
    location.building ? (language === 'ar' ? location.building.name_ar : location.building.name) : '',
    location.floor ? (language === 'ar' ? location.floor.name_ar : location.floor.name) : '',
    location.department ? (language === 'ar' ? location.department.name_ar : location.department.name) : '',
    location.room ? (language === 'ar' ? location.room.name_ar : location.room.name) : '',
  ].filter(Boolean).join(' - ');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="${language === 'ar' ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="UTF-8">
      <title>${workOrder.code} - ${language === 'ar' ? 'بلاغ صيانة - نظام مُتقَن' : 'Maintenance Report - Mutqan System'}</title>
      <style>
        @media print {
          @page { size: A4; margin: 8mm; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          padding: 8px; 
          line-height: 1.3;
          color: #333;
        }
        
        .pdf-header {
          display: grid;
          grid-template-columns: 90px 1fr 90px;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
          padding: 8px 12px;
          background: #ffffff;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
        }
        
        .logo-container { display: flex; align-items: center; justify-content: center; }
        .logo-img { width: 90px; height: 90px; object-fit: contain; background: #ffffff; }
        .header-center { text-align: center; padding: 0 8px; }
        .system-title { font-size: 12px; color: #1e293b; margin-bottom: 3px; font-weight: 700; }
        .report-code { font-size: 13px; font-weight: 700; color: #2563eb; margin-bottom: 3px; }
        
        .status-bar {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 5px;
          margin-bottom: 8px;
          padding: 6px;
          background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
          border-radius: 4px;
          border: 1px solid #e2e8f0;
        }
        .status-item { text-align: center; padding: 5px; background: white; border-radius: 3px; }
        .status-item .label { font-size: 7px; color: #64748b; text-transform: uppercase; font-weight: 600; }
        .status-item .value { font-size: 9px; font-weight: bold; color: #1e293b; }
        
        .section { margin: 6px 0; background: white; padding: 5px; border: 1px solid #e2e8f0; border-radius: 3px; }
        .section-title { font-size: 9px; font-weight: bold; color: #1e293b; margin-bottom: 4px; padding-bottom: 3px; border-bottom: 1px solid #e2e8f0; }
        
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; margin-top: 4px; }
        .info-item { padding: 4px; background: #f8fafc; border-radius: 3px; }
        .label { font-weight: 600; color: #64748b; font-size: 7px; text-transform: uppercase; }
        .value { color: #1e293b; font-size: 8px; font-weight: 500; }
        
        .workflow-timeline { margin: 4px 0; position: relative; padding-${language === 'ar' ? 'right' : 'left'}: 12px; }
        .workflow-item { padding: 4px 8px; margin: 3px 0; background: white; border: 1px solid #e2e8f0; border-radius: 3px; }
        .step-title { font-weight: 600; color: #1e293b; margin-bottom: 2px; font-size: 8px; }
        
        table { width: 100%; border-collapse: collapse; margin: 4px 0; background: white; }
        th, td { border: 1px solid #e2e8f0; padding: 4px; text-align: ${language === 'ar' ? 'right' : 'left'}; }
        th { background: #f8fafc; font-weight: 600; color: #475569; font-size: 7px; }
        td { color: #1e293b; font-size: 8px; }
        
        .pdf-footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px; }
        
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
          .section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="pdf-header">
        <div class="logo-container">
          ${hospital?.logo_url ? `<img src="${hospital.logo_url}" alt="Hospital Logo" class="logo-img" />` : ''}
        </div>
        <div class="header-center">
          <div class="system-title">${language === 'ar' ? 'نظام مُتقَن لإدارة الصيانة' : 'Mutqan Maintenance System'}</div>
          <div class="report-code">${workOrder.code}</div>
        </div>
        <div class="logo-container">
          ${company?.logo_url ? `<img src="${company.logo_url}" alt="Company Logo" class="logo-img" />` : ''}
        </div>
      </div>

      <div class="status-bar">
        <div class="status-item">
          <div class="label">${language === 'ar' ? 'الحالة' : 'Status'}</div>
          <div class="value">${statusName}</div>
        </div>
        <div class="status-item">
          <div class="label">${language === 'ar' ? 'الأولوية' : 'Priority'}</div>
          <div class="value">${priorityName}</div>
        </div>
        <div class="status-item">
          <div class="label">${language === 'ar' ? 'تاريخ البلاغ' : 'Reported'}</div>
          <div class="value">${format(new Date(workOrder.reported_at), 'dd/MM/yyyy')}</div>
        </div>
        <div class="status-item">
          <div class="label">${language === 'ar' ? 'المبلغ' : 'Reporter'}</div>
          <div class="value">${reporterName}</div>
        </div>
      </div>

      ${locationStr ? `
        <div class="section">
          <h3 class="section-title">${language === 'ar' ? 'الموقع' : 'Location'}</h3>
          <div class="info-item"><div class="value">${locationStr}</div></div>
        </div>
      ` : ''}

      <div class="section">
        <h3 class="section-title">${language === 'ar' ? 'معلومات البلاغ' : 'Report Information'}</h3>
        <div class="info-grid">
          <div class="info-item"><div class="label">${language === 'ar' ? 'نوع البلاغ' : 'Issue Type'}</div><div class="value">${workOrder.issue_type}</div></div>
          ${assignedTechnicianName ? `<div class="info-item"><div class="label">${language === 'ar' ? 'الفني' : 'Technician'}</div><div class="value">${assignedTechnicianName}</div></div>` : ''}
        </div>
        <div style="margin-top: 8px;">
          <div class="label">${language === 'ar' ? 'الوصف' : 'Description'}</div>
          <div class="value" style="margin-top: 4px; padding: 8px; background: #f8fafc; border-radius: 3px;">${workOrder.description}</div>
        </div>
      </div>

      ${asset ? `
        <div class="section">
          <h3 class="section-title">${language === 'ar' ? 'معلومات الأصل' : 'Asset Information'}</h3>
          <div class="info-grid">
            <div class="info-item"><div class="label">${language === 'ar' ? 'اسم الأصل' : 'Asset Name'}</div><div class="value">${language === 'ar' ? asset.name_ar : asset.name}</div></div>
            ${asset.code ? `<div class="info-item"><div class="label">${language === 'ar' ? 'الرمز' : 'Code'}</div><div class="value">${asset.code}</div></div>` : ''}
          </div>
        </div>
      ` : ''}

      <div class="section">
        <h3 class="section-title">${language === 'ar' ? 'سير العمل' : 'Workflow'}</h3>
        <div class="workflow-timeline">
          ${workOrder.start_time ? `
            <div class="workflow-item">
              <div class="step-title">${language === 'ar' ? 'بدء العمل' : 'Work Started'}</div>
              <div class="value">${format(new Date(workOrder.start_time), 'dd/MM/yyyy HH:mm')}</div>
              ${assignedTechnicianName ? `<div class="label">${language === 'ar' ? 'بواسطة:' : 'By:'} ${assignedTechnicianName}</div>` : ''}
            </div>
          ` : ''}
          ${workOrder.technician_completed_at ? `
            <div class="workflow-item">
              <div class="step-title">${language === 'ar' ? 'إنهاء الفني' : 'Technician Completed'}</div>
              <div class="value">${format(new Date(workOrder.technician_completed_at), 'dd/MM/yyyy HH:mm')}</div>
              ${workOrder.technician_notes ? `<div class="label" style="margin-top: 2px;">${language === 'ar' ? 'ملاحظات:' : 'Notes:'} ${workOrder.technician_notes}</div>` : ''}
            </div>
          ` : ''}
          ${workOrder.supervisor_approved_at ? `
            <div class="workflow-item">
              <div class="step-title">${language === 'ar' ? 'موافقة المشرف' : 'Supervisor Approved'}</div>
              <div class="value">${format(new Date(workOrder.supervisor_approved_at), 'dd/MM/yyyy HH:mm')}</div>
              ${supervisorName ? `<div class="label">${language === 'ar' ? 'بواسطة:' : 'By:'} ${supervisorName}</div>` : ''}
              ${workOrder.supervisor_notes ? `<div class="label" style="margin-top: 2px;">${language === 'ar' ? 'ملاحظات:' : 'Notes:'} ${workOrder.supervisor_notes}</div>` : ''}
            </div>
          ` : ''}
          ${workOrder.engineer_approved_at ? `
            <div class="workflow-item">
              <div class="step-title">${language === 'ar' ? 'مراجعة المهندس' : 'Engineer Reviewed'}</div>
              <div class="value">${format(new Date(workOrder.engineer_approved_at), 'dd/MM/yyyy HH:mm')}</div>
              ${engineerName ? `<div class="label">${language === 'ar' ? 'بواسطة:' : 'By:'} ${engineerName}</div>` : ''}
              ${workOrder.engineer_notes ? `<div class="label" style="margin-top: 2px;">${language === 'ar' ? 'ملاحظات:' : 'Notes:'} ${workOrder.engineer_notes}</div>` : ''}
            </div>
          ` : ''}
          ${workOrder.customer_reviewed_at ? `
            <div class="workflow-item">
              <div class="step-title">${language === 'ar' ? 'إغلاق المبلغ' : 'Reporter Closed'}</div>
              <div class="value">${format(new Date(workOrder.customer_reviewed_at), 'dd/MM/yyyy HH:mm')}</div>
              ${reporterName ? `<div class="label">${language === 'ar' ? 'بواسطة:' : 'By:'} ${reporterName}</div>` : ''}
              ${workOrder.reporter_notes ? `<div class="label" style="margin-top: 2px;">${language === 'ar' ? 'ملاحظات:' : 'Notes:'} ${workOrder.reporter_notes}</div>` : ''}
            </div>
          ` : ''}
          ${workOrder.auto_closed_at ? `
            <div class="workflow-item">
              <div class="step-title">${language === 'ar' ? 'إغلاق تلقائي' : 'Auto Closed'}</div>
              <div class="value">${format(new Date(workOrder.auto_closed_at), 'dd/MM/yyyy HH:mm')}</div>
              <div class="label">${language === 'ar' ? 'بواسطة النظام' : 'By System'}</div>
            </div>
          ` : ''}
          ${workOrder.maintenance_manager_approved_at ? `
            <div class="workflow-item">
              <div class="step-title">${language === 'ar' ? 'موافقة مدير الصيانة' : 'Manager Approved'}</div>
              <div class="value">${format(new Date(workOrder.maintenance_manager_approved_at), 'dd/MM/yyyy HH:mm')}</div>
              ${managerName ? `<div class="label">${language === 'ar' ? 'بواسطة:' : 'By:'} ${managerName}</div>` : ''}
              ${workOrder.maintenance_manager_notes ? `<div class="label" style="margin-top: 2px;">${language === 'ar' ? 'ملاحظات:' : 'Notes:'} ${workOrder.maintenance_manager_notes}</div>` : ''}
            </div>
          ` : ''}
          ${workOrder.rejected_at ? `
            <div class="workflow-item" style="border-color: #ef4444;">
              <div class="step-title" style="color: #ef4444;">${language === 'ar' ? 'مرفوض' : 'Rejected'}</div>
              <div class="value">${format(new Date(workOrder.rejected_at), 'dd/MM/yyyy HH:mm')}</div>
              <div class="label">${language === 'ar' ? 'مرحلة الرفض:' : 'Stage:'} ${workOrder.rejection_stage}</div>
              ${workOrder.rejection_reason ? `<div class="label" style="margin-top: 2px;">${language === 'ar' ? 'السبب:' : 'Reason:'} ${workOrder.rejection_reason}</div>` : ''}
            </div>
          ` : ''}
        </div>
      </div>

      ${operations.length > 0 ? `
        <div class="section">
          <h3 class="section-title">${language === 'ar' ? 'سجل الإجراءات' : 'Action History'}</h3>
          <table>
            <thead><tr><th>${language === 'ar' ? 'التاريخ' : 'Date'}</th><th>${language === 'ar' ? 'النوع' : 'Type'}</th></tr></thead>
            <tbody>
              ${operations.map(op => `<tr><td>${format(new Date(op.timestamp), 'dd/MM/yyyy HH:mm')}</td><td>${op.type}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <div class="pdf-footer">
        <p>${language === 'ar' ? 'نظام مُتقَن لإدارة الصيانة' : 'Mutqan Maintenance Management System'}</p>
        <p>${language === 'ar' ? 'تاريخ الطباعة:' : 'Print Date:'} ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
      </div>

      <div class="no-print" style="margin-top: 30px; text-align: center; padding: 20px;">
        <button onclick="window.print()" style="padding: 12px 30px; background: #2563eb; color: white; border: none; cursor: pointer; border-radius: 6px; font-size: 16px; margin: 0 10px;">
          ${language === 'ar' ? 'طباعة' : 'Print'}
        </button>
        <button onclick="window.close()" style="padding: 12px 30px; background: #64748b; color: white; border: none; cursor: pointer; border-radius: 6px; font-size: 16px; margin: 0 10px;">
          ${language === 'ar' ? 'إغلاق' : 'Close'}
        </button>
      </div>
    </body>
    </html>
  `);
  
  printWindow.document.close();
}
