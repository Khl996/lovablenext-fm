import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { WorkOrderWorkflow } from '@/components/WorkOrderWorkflow';
import { WorkOrderActions } from '@/components/WorkOrderActions';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  MapPin, 
  FileText, 
  AlertCircle,
  Clock,
  CheckCircle2,
  Download,
  MessageSquare,
  Users,
  UserCog,
  Upload,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { useLookupTables, getLookupName } from '@/hooks/useLookupTables';

type WorkOrder = {
  id: string;
  code: string;
  issue_type: string;
  description: string;
  status: string;
  priority: string;
  urgency: string | null;
  reported_at: string;
  reported_by: string;
  assigned_to: string | null;
  assigned_team: string | null;
  asset_id: string | null;
  building_id: string | null;
  floor_id: string | null;
  department_id: string | null;
  room_id: string | null;
  work_notes: string | null;
  supervisor_notes: string | null;
  customer_feedback: string | null;
  customer_rating: number | null;
  technician_completed_at: string | null;
  technician_notes: string | null;
  supervisor_approved_by: string | null;
  supervisor_approved_at: string | null;
  engineer_approved_by: string | null;
  engineer_approved_at: string | null;
  engineer_notes: string | null;
  customer_reviewed_by: string | null;
  customer_reviewed_at: string | null;
  maintenance_manager_approved_by: string | null;
  maintenance_manager_approved_at: string | null;
  maintenance_manager_notes: string | null;
};

type OperationLog = {
  id: string;
  timestamp: string;
  performed_by: string;
  type: string;
  description: string;
  notes: string | null;
};

export default function WorkOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { permissions, user, hospitalId } = useCurrentUser();
  const { toast } = useToast();
  const { lookups, loading: lookupsLoading } = useLookupTables(['work_order_statuses', 'priorities', 'work_types']);

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [operations, setOperations] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [reporterName, setReporterName] = useState<string>('');
  const [supervisorName, setSupervisorName] = useState<string>('');
  const [assignedTechnicianName, setAssignedTechnicianName] = useState<string>('');
  const [engineerName, setEngineerName] = useState<string>('');
  const [managerName, setManagerName] = useState<string>('');
  const [assignedTeamName, setAssignedTeamName] = useState<string>('');
  const [asset, setAsset] = useState<any>(null);
  const [location, setLocation] = useState<any>({});
  const [hospital, setHospital] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadWorkOrder();
      loadOperations();
    }
  }, [id]);

  const loadWorkOrder = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setWorkOrder(data);

      // Load reporter, supervisor, and assigned technician names
      if (data.reported_by) {
        const { data: reporter } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.reported_by)
          .single();
        if (reporter) setReporterName(reporter.full_name);
      }

      if (data.supervisor_approved_by) {
        const { data: supervisor } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.supervisor_approved_by)
          .single();
        if (supervisor) setSupervisorName(supervisor.full_name);
      }

      if (data.assigned_to) {
        const { data: technician } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.assigned_to)
          .single();
        if (technician) setAssignedTechnicianName(technician.full_name);
      }

      if (data.engineer_approved_by) {
        const { data: engineer } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.engineer_approved_by)
          .single();
        if (engineer) setEngineerName(engineer.full_name);
      }

      if (data.maintenance_manager_approved_by) {
        const { data: manager } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.maintenance_manager_approved_by)
          .single();
        if (manager) setManagerName(manager.full_name);
      }

      if (data.assigned_team) {
        const { data: team } = await supabase
          .from('teams')
          .select('name, name_ar')
          .eq('id', data.assigned_team)
          .single();
        if (team) setAssignedTeamName(language === 'ar' ? team.name_ar : team.name);
      }

      // Load asset info
      if (data.asset_id) {
        const { data: assetData } = await supabase
          .from('assets')
          .select('*, buildings(name, name_ar), floors(name, name_ar), departments(name, name_ar), rooms(name, name_ar)')
          .eq('id', data.asset_id)
          .single();
        if (assetData) setAsset(assetData);
      }

      // Load location info
      const locationData: any = {};
      if (data.building_id) {
        const { data: building } = await supabase
          .from('buildings')
          .select('name, name_ar')
          .eq('id', data.building_id)
          .single();
        locationData.building = building;
      }
      if (data.floor_id) {
        const { data: floor } = await supabase
          .from('floors')
          .select('name, name_ar')
          .eq('id', data.floor_id)
          .single();
        locationData.floor = floor;
      }
      if (data.department_id) {
        const { data: department } = await supabase
          .from('departments')
          .select('name, name_ar')
          .eq('id', data.department_id)
          .single();
        locationData.department = department;
      }
      if (data.room_id) {
        const { data: room } = await supabase
          .from('rooms')
          .select('name, name_ar')
          .eq('id', data.room_id)
          .single();
        locationData.room = room;
      }
      setLocation(locationData);

      // Load hospital data
      if (data.hospital_id) {
        const { data: hospitalData } = await supabase
          .from('hospitals')
          .select('name, name_ar, logo_url')
          .eq('id', data.hospital_id)
          .single();
        if (hospitalData) setHospital(hospitalData);
      }

      // Load company data
      if ((data as any).company_id) {
        const { data: companyData } = await (supabase as any)
          .from('companies')
          .select('name, name_ar, logo_url')
          .eq('id', (data as any).company_id)
          .single();
        if (companyData) setCompany(companyData);
      }
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
      navigate('/admin/work-orders');
    } finally {
      setLoading(false);
    }
  };

  const loadOperations = async () => {
    try {
      const { data, error } = await supabase
        .from('operations_log')
        .select('*')
        .eq('related_work_order', id)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      setOperations(data || []);
    } catch (error: any) {
      console.error('Error loading operations:', error);
    }
  };

  const handleExportPDF = () => {
    if (!workOrder) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const locationStr = [
      location.building ? (language === 'ar' ? location.building.name_ar : location.building.name) : '',
      location.floor ? (language === 'ar' ? location.floor.name_ar : location.floor.name) : '',
      location.department ? (language === 'ar' ? location.department.name_ar : location.department.name) : '',
      location.room ? (language === 'ar' ? location.room.name_ar : location.room.name) : '',
    ].filter(Boolean).join(' - ');

    // Get status and priority names
    const statusLookup = lookups.work_order_statuses?.find(s => s.code === workOrder.status);
    const statusName = statusLookup ? (language === 'ar' ? statusLookup.name_ar : statusLookup.name) : workOrder.status;
    
    const priorityLookup = lookups.priorities?.find(p => p.code === workOrder.priority);
    const priorityName = priorityLookup ? (language === 'ar' ? priorityLookup.name_ar : priorityLookup.name) : workOrder.priority;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${language === 'ar' ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <title>${workOrder.code} - ${language === 'ar' ? 'بلاغ صيانة' : 'Maintenance Report'}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            padding: 40px; 
            line-height: 1.8;
            color: #333;
          }
          
          /* Custom Header with Logo Placeholders */
          .pdf-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2563eb;
          }
          .logo-section {
            flex: 1;
          }
          .logo-placeholder {
            width: 120px;
            height: 60px;
            border: 2px dashed #cbd5e1;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            color: #94a3b8;
            margin-bottom: 10px;
            border-radius: 4px;
          }
          .pdf-header h1 {
            font-size: 20px;
            color: #1e293b;
            margin-bottom: 5px;
          }
          .pdf-header p {
            font-size: 14px;
            color: #64748b;
          }
          .pdf-header .report-info {
            text-align: ${language === 'ar' ? 'left' : 'right'};
          }
          .pdf-header .report-info .code {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
          }
          .pdf-header .report-info .date {
            font-size: 12px;
            color: #666;
          }

          /* Status Bar */
          .status-bar {
            display: flex;
            gap: 15px;
            margin-bottom: 30px;
            padding: 15px;
            background: #f8fafc;
            border-radius: 8px;
          }
          .status-item {
            flex: 1;
            text-align: center;
            padding: 10px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
          }
          .status-item .label {
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 5px;
          }
          .status-item .value {
            font-size: 16px;
            font-weight: bold;
            color: #1e293b;
          }
          
          /* Sections */
          .section { 
            margin: 30px 0; 
            page-break-inside: avoid;
            background: white;
            padding: 20px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
          }
          .section-title { 
            font-size: 18px; 
            font-weight: bold; 
            color: #1e293b;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-top: 15px;
          }
          .info-item {
            padding: 12px;
            background: #f8fafc;
            border-radius: 6px;
          }
          .label { 
            font-weight: 600; 
            color: #64748b; 
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 6px;
          }
          .value { 
            color: #1e293b;
            font-size: 15px;
            font-weight: 500;
          }
          
          /* Workflow */
          .workflow-timeline { 
            margin: 20px 0;
            position: relative;
            padding-${language === 'ar' ? 'right' : 'left'}: 30px;
          }
          .workflow-timeline::before {
            content: '';
            position: absolute;
            ${language === 'ar' ? 'right' : 'left'}: 10px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: #e2e8f0;
          }
          .workflow-item { 
            padding: 15px 20px;
            margin: 15px 0;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            position: relative;
          }
          .workflow-item::before {
            content: '';
            position: absolute;
            ${language === 'ar' ? 'right' : 'left'}: -25px;
            top: 20px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: white;
            border: 3px solid #cbd5e1;
          }
          .workflow-item.completed::before { 
            background: #22c55e;
            border-color: #22c55e;
          }
          .workflow-item .step-title {
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 8px;
          }
          .workflow-item .step-detail {
            font-size: 13px;
            color: #64748b;
            margin: 4px 0;
          }
          
          /* Table */
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
            background: white;
          }
          th, td { 
            border: 1px solid #e2e8f0; 
            padding: 12px; 
            text-align: ${language === 'ar' ? 'right' : 'left'};
          }
          th { 
            background: #f8fafc;
            font-weight: 600;
            color: #475569;
            font-size: 13px;
            text-transform: uppercase;
          }
          td {
            color: #1e293b;
            font-size: 14px;
          }
          
          /* Footer */
          .pdf-footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            color: #94a3b8;
            font-size: 12px;
          }
          
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <!-- Custom Header with Logo Placeholders -->
        <div class="pdf-header">
          <div class="logo-section">
            ${hospital?.logo_url ? `
              <img src="${hospital.logo_url}" alt="Hospital Logo" style="max-height: 80px; max-width: 180px; object-fit: contain; margin-bottom: 10px;" />
            ` : `
              <div class="logo-placeholder">
                ${language === 'ar' ? 'شعار المستشفى' : 'Hospital Logo'}
              </div>
            `}
            <h1>${language === 'ar' ? 'نظام إدارة الصيانة' : 'Maintenance Management System'}</h1>
            <p>${language === 'ar' ? 'بلاغ صيانة' : 'Maintenance Report'}</p>
          </div>
          <div class="logo-section" style="text-align: ${language === 'ar' ? 'left' : 'right'};">
            ${company?.logo_url ? `
              <img src="${company.logo_url}" alt="Company Logo" style="max-height: 80px; max-width: 180px; object-fit: contain; margin-bottom: 10px; margin-${language === 'ar' ? 'right' : 'left'}: auto;" />
            ` : `
              <div class="logo-placeholder" style="margin-${language === 'ar' ? 'right' : 'left'}: auto;">
                ${language === 'ar' ? 'شعار شركة الصيانة' : 'Maintenance Company Logo'}
              </div>
            `}
            <div class="report-info">
              <div class="code">${workOrder.code}</div>
              <div class="date">${language === 'ar' ? 'تاريخ الطباعة:' : 'Print Date:'} ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
            </div>
          </div>
        </div>

        <!-- Status Summary Bar -->
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
            <div class="label">${language === 'ar' ? 'تاريخ البلاغ' : 'Reported Date'}</div>
            <div class="value">${format(new Date(workOrder.reported_at), 'dd/MM/yyyy')}</div>
          </div>
        </div>

        <!-- Basic Information -->
        <div class="section">
          <h3 class="section-title">${language === 'ar' ? 'معلومات البلاغ' : 'Report Information'}</h3>
          <div class="info-grid">
            <div class="info-item">
              <div class="label">${language === 'ar' ? 'نوع البلاغ' : 'Issue Type'}</div>
              <div class="value">${workOrder.issue_type}</div>
            </div>
            ${reporterName ? `
            <div class="info-item">
              <div class="label">${language === 'ar' ? 'المبلغ' : 'Reporter'}</div>
              <div class="value">${reporterName}</div>
            </div>
            ` : ''}
            ${assignedTechnicianName ? `
            <div class="info-item">
              <div class="label">${language === 'ar' ? 'الفني المعين' : 'Assigned Technician'}</div>
              <div class="value">${assignedTechnicianName}</div>
            </div>
            ` : ''}
            ${supervisorName ? `
            <div class="info-item">
              <div class="label">${language === 'ar' ? 'المشرف' : 'Supervisor'}</div>
              <div class="value">${supervisorName}</div>
            </div>
            ` : ''}
          </div>
          <div style="margin-top: 15px;">
            <div class="label">${language === 'ar' ? 'الوصف' : 'Description'}</div>
            <div class="value" style="margin-top: 8px; padding: 12px; background: #f8fafc; border-radius: 6px;">
              ${workOrder.description}
            </div>
          </div>
        </div>

        <!-- Asset Information -->
        ${asset ? `
          <div class="section">
            <h3 class="section-title">${language === 'ar' ? 'معلومات الأصل' : 'Asset Information'}</h3>
            <div class="info-grid">
              <div class="info-item">
                <div class="label">${language === 'ar' ? 'اسم الأصل' : 'Asset Name'}</div>
                <div class="value">${language === 'ar' ? asset.name_ar : asset.name}</div>
              </div>
              ${asset.code ? `
              <div class="info-item">
                <div class="label">${language === 'ar' ? 'رقم الأصل' : 'Asset Code'}</div>
                <div class="value">${asset.code}</div>
              </div>
              ` : ''}
              ${asset.serial_number ? `
              <div class="info-item">
                <div class="label">${language === 'ar' ? 'الرقم التسلسلي' : 'Serial Number'}</div>
                <div class="value">${asset.serial_number}</div>
              </div>
              ` : ''}
              ${asset.model ? `
              <div class="info-item">
                <div class="label">${language === 'ar' ? 'الموديل' : 'Model'}</div>
                <div class="value">${asset.model}</div>
              </div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        <!-- Location -->
        ${locationStr ? `
          <div class="section">
            <h3 class="section-title">${language === 'ar' ? 'الموقع' : 'Location'}</h3>
            <div class="info-item">
              <div class="value">${locationStr}</div>
            </div>
          </div>
        ` : ''}

        <!-- Workflow Timeline -->
        <div class="section">
          <h3 class="section-title">${language === 'ar' ? 'سير العمل والموافقات' : 'Workflow & Approvals'}</h3>
          <div class="workflow-timeline">
            ${workOrder.technician_completed_at ? `
              <div class="workflow-item completed">
                <div class="step-title">${language === 'ar' ? 'إنهاء الفني' : 'Technician Completed'}</div>
                <div class="step-detail">${format(new Date(workOrder.technician_completed_at), 'dd/MM/yyyy HH:mm')}</div>
                ${workOrder.technician_notes ? `<div class="step-detail">${workOrder.technician_notes}</div>` : ''}
              </div>
            ` : ''}
            ${workOrder.supervisor_approved_at ? `
              <div class="workflow-item completed">
                <div class="step-title">${language === 'ar' ? 'موافقة المشرف' : 'Supervisor Approved'}</div>
                <div class="step-detail">${format(new Date(workOrder.supervisor_approved_at), 'dd/MM/yyyy HH:mm')}</div>
                ${workOrder.supervisor_notes ? `<div class="step-detail">${workOrder.supervisor_notes}</div>` : ''}
              </div>
            ` : ''}
            ${workOrder.engineer_approved_at ? `
              <div class="workflow-item completed">
                <div class="step-title">${language === 'ar' ? 'موافقة المهندس' : 'Engineer Approved'}</div>
                <div class="step-detail">${format(new Date(workOrder.engineer_approved_at), 'dd/MM/yyyy HH:mm')}</div>
                ${workOrder.engineer_notes ? `<div class="step-detail">${workOrder.engineer_notes}</div>` : ''}
              </div>
            ` : ''}
            ${workOrder.customer_reviewed_at ? `
              <div class="workflow-item completed">
                <div class="step-title">${language === 'ar' ? 'مراجعة المبلغ' : 'Customer Reviewed'}</div>
                <div class="step-detail">${format(new Date(workOrder.customer_reviewed_at), 'dd/MM/yyyy HH:mm')}</div>
                <div class="step-detail">${language === 'ar' ? 'بواسطة' : 'By'}: ${reporterName}</div>
                ${workOrder.customer_feedback ? `<div class="step-detail">${workOrder.customer_feedback}</div>` : ''}
              </div>
            ` : ''}
            ${workOrder.maintenance_manager_approved_at ? `
              <div class="workflow-item completed">
                <div class="step-title">${language === 'ar' ? 'الاعتماد النهائي' : 'Final Approval'}</div>
                <div class="step-detail">${format(new Date(workOrder.maintenance_manager_approved_at), 'dd/MM/yyyy HH:mm')}</div>
                ${workOrder.maintenance_manager_notes ? `<div class="step-detail">${workOrder.maintenance_manager_notes}</div>` : ''}
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Action History -->
        ${operations.length > 0 ? `
          <div class="section">
            <h3 class="section-title">${language === 'ar' ? 'سجل الإجراءات' : 'Action History'}</h3>
            <table>
              <thead>
                <tr>
                  <th>${language === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th>${language === 'ar' ? 'النوع' : 'Type'}</th>
                  <th>${language === 'ar' ? 'الوصف' : 'Description'}</th>
                </tr>
              </thead>
              <tbody>
                ${operations.map(op => `
                  <tr>
                    <td>${format(new Date(op.timestamp), 'dd/MM/yyyy HH:mm')}</td>
                    <td>${op.type}</td>
                    <td>${op.description || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <!-- Footer -->
        <div class="pdf-footer">
          <p>${language === 'ar' ? 'تم إنشاء هذا التقرير تلقائيًا بواسطة نظام إدارة الصيانة' : 'This report was automatically generated by Maintenance Management System'}</p>
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
  };

  const getStatusBadge = (statusCode: string) => {
    const status = lookups.work_order_statuses?.find(s => s.code === statusCode);
    if (!status) return <Badge variant="outline">{statusCode}</Badge>;
    
    const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'open': 'outline',
      'in_progress': 'default',
      'completed': 'default',
      'cancelled': 'destructive',
    };
    
    return (
      <Badge variant={variantMap[status.category] || 'outline'}>
        {getLookupName(status, language)}
      </Badge>
    );
  };

  const getPriorityBadge = (priorityCode: string) => {
    const priority = lookups.priorities?.find(p => p.code === priorityCode);
    if (!priority) return <Badge variant="outline">{priorityCode}</Badge>;
    
    const variantMap: Record<number, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      1: 'outline',      // Low
      2: 'secondary',    // Medium  
      3: 'default',      // High
      4: 'destructive',  // Critical/Urgent
    };
    
    return (
      <Badge variant={variantMap[priority.level || 0] || 'outline'}>
        {getLookupName(priority, language)}
      </Badge>
    );
  };

  if (loading || lookupsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!workOrder) {
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/work-orders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{workOrder.code}</h1>
            <p className="text-muted-foreground">{workOrder.issue_type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(workOrder.status)}
          {getPriorityBadge(workOrder.priority)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {language === 'ar' ? 'تفاصيل البلاغ' : 'Report Details'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">
                  {language === 'ar' ? 'الوصف' : 'Description'}
                </Label>
                <p className="mt-1">{workOrder.description}</p>
              </div>

              {workOrder.work_notes && (
                <div>
                  <Label className="text-muted-foreground">
                    {language === 'ar' ? 'ملاحظات العمل' : 'Work Notes'}
                  </Label>
                  <p className="mt-1">{workOrder.work_notes}</p>
                </div>
              )}

              {workOrder.supervisor_notes && (
                <div>
                  <Label className="text-muted-foreground">
                    {language === 'ar' ? 'ملاحظات المشرف' : 'Supervisor Notes'}
                  </Label>
                  <p className="mt-1">{workOrder.supervisor_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>


          {/* Approval Workflow - Using new component */}
          <WorkOrderWorkflow
            workOrder={workOrder}
            reporterName={reporterName}
            supervisorName={supervisorName}
            engineerName={engineerName}
            managerName={managerName}
            assignedTeamName={assignedTeamName}
          />

          {/* Operations Log */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {language === 'ar' ? 'سجل الإجراءات' : 'Action History'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {operations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {language === 'ar' ? 'لا توجد إجراءات مسجلة' : 'No actions recorded'}
                </p>
              ) : (
                <div className="space-y-4">
                  {operations.map((op) => (
                    <div key={op.id} className="flex gap-3 pb-4 border-b last:border-0">
                      <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary" />
                      <div className="flex-1">
                        <p className="font-medium">{op.type}</p>
                        <p className="text-sm text-muted-foreground">{op.description}</p>
                        {op.notes && (
                          <p className="text-sm mt-1">{op.notes}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(op.timestamp), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'معلومات سريعة' : 'Quick Info'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{language === 'ar' ? 'تاريخ البلاغ:' : 'Reported:'}</span>
                <span className="font-medium">
                  {format(new Date(workOrder.reported_at), 'dd/MM/yyyy')}
                </span>
              </div>

              {reporterName && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{language === 'ar' ? 'المبلغ:' : 'Reporter:'}</span>
                  <span className="font-medium">{reporterName}</span>
                </div>
              )}

               {assignedTechnicianName && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{language === 'ar' ? 'الفني المعين:' : 'Assigned To:'}</span>
                  <span className="font-medium">{assignedTechnicianName}</span>
                </div>
              )}

              {workOrder.urgency && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{language === 'ar' ? 'النوع:' : 'Type:'}</span>
                  <span className="font-medium">{workOrder.urgency}</span>
                </div>
              )}

              {supervisorName && (
                <div className="flex items-center gap-2 text-sm">
                  <UserCog className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{language === 'ar' ? 'المشرف:' : 'Supervisor:'}</span>
                  <span className="font-medium">{supervisorName}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Asset & Location Info */}
          {(asset || Object.keys(location).length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {language === 'ar' ? 'الأصل والموقع' : 'Asset & Location'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {asset && (
                  <>
                    <div>
                      <Label className="text-muted-foreground">{language === 'ar' ? 'اسم الأصل' : 'Asset Name'}</Label>
                      <p className="font-medium">{language === 'ar' ? asset.name_ar : asset.name}</p>
                    </div>
                    {asset.code && (
                      <div>
                        <Label className="text-muted-foreground">{language === 'ar' ? 'رمز الأصل' : 'Asset Code'}</Label>
                        <p className="font-medium">{asset.code}</p>
                      </div>
                    )}
                    {asset.serial_number && (
                      <div>
                        <Label className="text-muted-foreground">{language === 'ar' ? 'الرقم التسلسلي' : 'Serial Number'}</Label>
                        <p className="font-medium">{asset.serial_number}</p>
                      </div>
                    )}
                    {asset.model && (
                      <div>
                        <Label className="text-muted-foreground">{language === 'ar' ? 'الموديل' : 'Model'}</Label>
                        <p className="font-medium">{asset.model}</p>
                      </div>
                    )}
                    <Separator />
                  </>
                )}
                {Object.keys(location).length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">{language === 'ar' ? 'الموقع' : 'Location'}</Label>
                    <p className="font-medium">
                      {[
                        location.building ? (language === 'ar' ? location.building.name_ar : location.building.name) : '',
                        location.floor ? (language === 'ar' ? location.floor.name_ar : location.floor.name) : '',
                        location.department ? (language === 'ar' ? location.department.name_ar : location.department.name) : '',
                        location.room ? (language === 'ar' ? location.room.name_ar : location.room.name) : '',
                      ].filter(Boolean).join(' - ')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Workflow Actions - Using new component */}
          <WorkOrderActions 
            workOrder={workOrder}
            onActionComplete={() => {
              loadWorkOrder();
              loadOperations();
            }}
          />

          {/* Export */}
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'التصدير' : 'Export'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full" onClick={handleExportPDF}>
                <Download className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'تصدير PDF' : 'Export PDF'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                {language === 'ar' 
                  ? 'يتضمن ترويسة المستشفى والشعارات وسجل الإجراءات الكامل' 
                  : 'Includes hospital header, logos, and full action history'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
