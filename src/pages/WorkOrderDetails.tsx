import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { WorkOrderDetailsSkeleton } from '@/components/LoadingSkeleton';
import { WorkOrderWorkflow } from '@/components/WorkOrderWorkflow';
import { WorkOrderActions } from '@/components/WorkOrderActions';
import { WorkOrderHeader } from '@/components/work-orders/WorkOrderHeader';
import { WorkOrderInfo } from '@/components/work-orders/WorkOrderInfo';
import { WorkOrderOperationsLog } from '@/components/work-orders/WorkOrderOperationsLog';
import { WorkOrderQuickInfo } from '@/components/work-orders/WorkOrderQuickInfo';
import { WorkOrderAssetLocation } from '@/components/work-orders/WorkOrderAssetLocation';
import { WorkOrderExport } from '@/components/work-orders/WorkOrderExport';
import { useLookupTables, getLookupName } from '@/hooks/useLookupTables';
import { exportWorkOrderPDF } from '@/lib/exportWorkOrderPDF';
import { handleApiError } from '@/lib/errorHandler';
import type { WorkOrder, OperationLog, WorkOrderLocation, WorkOrderAsset } from '@/types/workOrder';

export default function WorkOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { lookups, loading: lookupsLoading } = useLookupTables(['work_order_statuses', 'priorities']);

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [operations, setOperations] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [reporterName, setReporterName] = useState<string>('');
  const [supervisorName, setSupervisorName] = useState<string>('');
  const [assignedTechnicianName, setAssignedTechnicianName] = useState<string>('');
  const [engineerName, setEngineerName] = useState<string>('');
  const [managerName, setManagerName] = useState<string>('');
  const [assignedTeamName, setAssignedTeamName] = useState<string>('');
  const [asset, setAsset] = useState<WorkOrderAsset | null>(null);
  const [location, setLocation] = useState<WorkOrderLocation>({});
  const [hospital, setHospital] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadWorkOrder();
      loadOperations();
    }
  }, [id]);

  // Realtime subscription
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
          
          loadWorkOrder();
          loadOperations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, language, lookups]);

  const loadWorkOrder = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (!data) {
        throw new Error('Work order not found');
      }
      
      setWorkOrder(data);

      // Load all related data
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

      // Load asset
      if (data.asset_id) {
        const { data: assetData } = await supabase
          .from('assets')
          .select('*')
          .eq('id', data.asset_id)
          .single();
        if (assetData) setAsset(assetData as WorkOrderAsset);
      }

      // Load location
      const locationData: WorkOrderLocation = {};
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

      // Load hospital
      if ((data as any).hospital_id) {
        const { data: hospitalData } = await supabase
          .from('hospitals')
          .select('name, name_ar, logo_url')
          .eq('id', (data as any).hospital_id)
          .single();
        if (hospitalData) setHospital(hospitalData);
      }

      // Load company
      if ((data as any).company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('name, name_ar, logo_url')
          .eq('id', (data as any).company_id)
          .single();
        if (companyData) setCompany(companyData);
      }
    } catch (error: any) {
      handleApiError(error, toast, language);
      navigate('/admin/work-orders');
    } finally {
      setLoading(false);
    }
  }, [id, language, navigate, toast]);

  const loadOperations = useCallback(async () => {
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
  }, [id]);

  const handleExportPDF = () => {
    if (!workOrder) return;
    
    const statusLookup = lookups.work_order_statuses?.find(s => s.code === workOrder.status);
    const statusName = statusLookup ? getLookupName(statusLookup, language) : workOrder.status;
    
    const priorityLookup = lookups.priorities?.find(p => p.code === workOrder.priority);
    const priorityName = priorityLookup ? getLookupName(priorityLookup, language) : workOrder.priority;

    exportWorkOrderPDF({
      workOrder,
      operations,
      asset,
      location,
      reporterName,
      assignedTechnicianName,
      supervisorName,
      engineerName,
      managerName,
      assignedTeamName,
      hospital,
      company,
      statusName,
      priorityName,
      language
    });
  };

  if (loading || lookupsLoading) {
    return <WorkOrderDetailsSkeleton />;
  }

  if (!workOrder) {
    return null;
  }

  const statusLookup = lookups.work_order_statuses?.find(s => s.code === workOrder.status);
  const priorityLookup = lookups.priorities?.find(p => p.code === workOrder.priority);

  return (
    <ErrorBoundary>
      <div className="space-y-6 p-6">
      <WorkOrderHeader 
        workOrder={workOrder}
        statusLookup={statusLookup || null}
        priorityLookup={priorityLookup || null}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <WorkOrderInfo workOrder={workOrder} reporterName={reporterName} />
          
          <WorkOrderWorkflow
            workOrder={workOrder}
            reporterName={reporterName}
            assignedTechnicianName={assignedTechnicianName}
            supervisorName={supervisorName}
            engineerName={engineerName}
            managerName={managerName}
            assignedTeamName={assignedTeamName}
          />

          <WorkOrderOperationsLog operations={operations} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <WorkOrderQuickInfo
            workOrder={workOrder}
            reporterName={reporterName}
            assignedTechnicianName={assignedTechnicianName}
            supervisorName={supervisorName}
          />

          <WorkOrderAssetLocation asset={asset} location={location} />

          <WorkOrderActions 
            workOrder={workOrder}
            onActionComplete={() => {
              loadWorkOrder();
              loadOperations();
            }}
          />

          <WorkOrderExport onExport={handleExportPDF} />
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}
