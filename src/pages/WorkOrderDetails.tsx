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

  // Realtime subscription for work order updates
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel('work-order-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'work_orders',
          filter: `id=eq.${id}`
        },
        (payload) => {
          const newData = payload.new as WorkOrder;
          const oldData = payload.old as WorkOrder;
          
          // Check if status changed
          if (newData.status !== oldData.status) {
            const statusItem = lookups.work_order_statuses?.find(s => s.code === newData.status);
            const statusName = getLookupName(statusItem || null, language);
            toast({
              title: language === 'ar' ? 'تم تحديث حالة أمر العمل' : 'Work Order Status Updated',
              description: language === 'ar' 
                ? `تم تغيير الحالة إلى: ${statusName}`
                : `Status changed to: ${statusName}`,
            });
          }
          
          // Reload data to get updated information
          loadWorkOrder();
          loadOperations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, language, lookups]);

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
        <title>${workOrder.code} - ${language === 'ar' ? 'بلاغ صيانة - نظام مُتقَن' : 'Maintenance Report - Mutqan System'}</title>
        <style>
          @media print {
            @page {
              size: A4;
              margin: 8mm;
            }
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
          
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            padding: 8px; 
            line-height: 1.3;
            color: #333;
          }
          
          /* Professional Header with Hospital & Company Logos */
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
          
          .logo-container {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .logo-container.hospital {
            justify-self: start;
          }
          
          .logo-container.company {
            justify-self: end;
          }
          
          .logo-img {
            width: 90px;
            height: 90px;
            object-fit: contain;
            background: #ffffff;
          }
          
          .header-center {
            text-align: center;
            padding: 0 8px;
          }
          
          .system-title {
            font-size: 12px;
            color: #1e293b;
            margin-bottom: 3px;
            font-weight: 700;
            letter-spacing: -0.2px;
          }
          
          .report-subtitle {
            font-size: 9px;
            color: #64748b;
            font-weight: 500;
            margin-bottom: 4px;
          }
          
          .report-code {
            font-size: 13px;
            font-weight: 700;
            color: #2563eb;
            margin-bottom: 3px;
            letter-spacing: 0.5px;
          }
          
          .report-date {
            font-size: 8px;
            color: #64748b;
            background: white;
            padding: 3px 8px;
            border-radius: 3px;
            display: inline-block;
            border: 1px solid #e2e8f0;
          }

          /* Status Summary Bar */
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
          .status-item {
            text-align: center;
            padding: 5px;
            background: white;
            border-radius: 3px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 1px 2px rgba(0,0,0,0.03);
          }
          .status-item .label {
            font-size: 7px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 3px;
            letter-spacing: 0.2px;
          }
          .status-item .value {
            font-size: 9px;
            font-weight: bold;
            color: #1e293b;
          }
          .location-full {
            grid-column: span 4;
            text-align: ${language === 'ar' ? 'right' : 'left'};
            padding: 5px;
            background: white;
            border-radius: 3px;
            border: 1px solid #e2e8f0;
          }
          .location-full .label {
            font-size: 7px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 3px;
            letter-spacing: 0.2px;
          }
          .location-full .value {
            font-size: 9px;
            font-weight: 600;
            color: #2563eb;
          }
          
          /* Sections */
          .section { 
            margin: 6px 0; 
            background: white;
            padding: 5px;
            border: 1px solid #e2e8f0;
            border-radius: 3px;
          }
          .section-title { 
            font-size: 9px; 
            font-weight: bold; 
            color: #1e293b;
            margin-bottom: 4px;
            padding-bottom: 3px;
            border-bottom: 1px solid #e2e8f0;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 4px;
            margin-top: 4px;
          }
          .info-item {
            padding: 4px;
            background: #f8fafc;
            border-radius: 3px;
          }
          .label { 
            font-weight: 600; 
            color: #64748b; 
            font-size: 7px;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .value { 
            color: #1e293b;
            font-size: 8px;
            font-weight: 500;
          }
          
          /* Workflow */
          .workflow-timeline { 
            margin: 4px 0;
            position: relative;
            padding-${language === 'ar' ? 'right' : 'left'}: 12px;
          }
          .workflow-timeline::before {
            content: '';
            position: absolute;
            ${language === 'ar' ? 'right' : 'left'}: 5px;
            top: 0;
            bottom: 0;
            width: 1.5px;
            background: #e2e8f0;
          }
          .workflow-item { 
            padding: 4px 8px;
            margin: 3px 0;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 3px;
            position: relative;
          }
          .workflow-item::before {
            content: '';
            position: absolute;
            ${language === 'ar' ? 'right' : 'left'}: -8px;
            top: 8px;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: white;
            border: 1.5px solid #cbd5e1;
          }
          .workflow-item.completed::before { 
            background: #22c55e;
            border-color: #22c55e;
          }
          .workflow-item .step-title {
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 2px;
            font-size: 8px;
          }
          .workflow-item .step-detail {
            font-size: 7px;
            color: #64748b;
            margin: 1px 0;
          }
          
          /* Table */
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 4px 0;
            background: white;
          }
          th, td { 
            border: 1px solid #e2e8f0; 
            padding: 4px; 
            text-align: ${language === 'ar' ? 'right' : 'left'};
          }
          th { 
            background: #f8fafc;
            font-weight: 600;
            color: #475569;
            font-size: 7px;
            text-transform: uppercase;
          }
          td {
            color: #1e293b;
            font-size: 8px;
          }
          
          /* Photos */
          .photos-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 4px;
            margin-top: 4px;
          }
          .photo-item {
            border-radius: 3px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
          }
          .photo-img {
            width: 100%;
            height: 55px;
            object-fit: cover;
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
        <!-- Professional Header with Hospital & Company Logos -->
        <div class="pdf-header">
          <div class="logo-container hospital">
            ${hospital?.logo_url ? `<img src="${hospital.logo_url}" alt="Hospital Logo" class="logo-img" />` : `<div class="logo-img" style="background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 12px;">${language === 'ar' ? 'شعار المستشفى' : 'Hospital'}</div>`}
          </div>
          
          <div class="header-center">
            <div class="system-title">${language === 'ar' ? 'نظام مُتقَن لإدارة الصيانة' : 'Mutqan Maintenance System'}</div>
            <div class="report-subtitle">${language === 'ar' ? 'تقرير أمر عمل تفصيلي' : 'Detailed Work Order Report'}</div>
            <div class="report-code">${workOrder.code}</div>
            <div class="report-date">${language === 'ar' ? 'تاريخ الطباعة:' : 'Print Date:'} ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
          </div>
          
          <div class="logo-container company">
            ${company?.logo_url ? `<img src="${company.logo_url}" alt="Company Logo" class="logo-img" />` : `<div class="logo-img" style="background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 12px;">${language === 'ar' ? 'شعار الشركة' : 'Company'}</div>`}
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
          <div class="status-item">
            <div class="label">${language === 'ar' ? 'المبلغ' : 'Reporter'}</div>
            <div class="value">${reporterName}</div>
          </div>
        </div>

        <!-- Location Section -->
        ${locationStr ? `
        <div class="section">
          <h3 class="section-title">${language === 'ar' ? '📍 موقع البلاغ / الصيانة' : '📍 Report / Maintenance Location'}</h3>
          <div class="info-item" style="background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%); padding: 20px; border-radius: 10px; border: 2px solid #dbeafe;">
            <div class="value" style="font-size: 17px; font-weight: 600; color: #1e40af;">${locationStr}</div>
          </div>
        </div>
        ` : ''}

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
                ${assignedTechnicianName ? `<div class="step-detail">${language === 'ar' ? 'بواسطة' : 'By'}: ${assignedTechnicianName}</div>` : ''}
                ${workOrder.technician_notes ? `<div class="step-detail">${workOrder.technician_notes}</div>` : ''}
              </div>
            ` : ''}
            ${workOrder.supervisor_approved_at ? `
              <div class="workflow-item completed">
                <div class="step-title">${language === 'ar' ? 'موافقة المشرف' : 'Supervisor Approved'}</div>
                <div class="step-detail">${format(new Date(workOrder.supervisor_approved_at), 'dd/MM/yyyy HH:mm')}</div>
                ${supervisorName ? `<div class="step-detail">${language === 'ar' ? 'بواسطة' : 'By'}: ${supervisorName}</div>` : ''}
                ${workOrder.supervisor_notes ? `<div class="step-detail">${workOrder.supervisor_notes}</div>` : ''}
              </div>
            ` : ''}
            ${workOrder.engineer_approved_at ? `
              <div class="workflow-item completed">
                <div class="step-title">${language === 'ar' ? 'موافقة المهندس' : 'Engineer Approved'}</div>
                <div class="step-detail">${format(new Date(workOrder.engineer_approved_at), 'dd/MM/yyyy HH:mm')}</div>
                ${engineerName ? `<div class="step-detail">${language === 'ar' ? 'بواسطة' : 'By'}: ${engineerName}</div>` : ''}
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
                ${managerName ? `<div class="step-detail">${language === 'ar' ? 'بواسطة' : 'By'}: ${managerName}</div>` : ''}
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
          <p>${language === 'ar' ? 'تم إنشاء هذا التقرير تلقائيًا بواسطة نظام مُتقَن لإدارة الصيانة' : 'This report was automatically generated by Mutqan Maintenance Management System'}</p>
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
            assignedTechnicianName={assignedTechnicianName}
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
