import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { getLookupName } from '@/hooks/useLookupTables';
import type { WorkOrder } from '@/types/workOrder';

interface WorkOrderHeaderProps {
  workOrder: WorkOrder;
  statusLookup: any;
  priorityLookup: any;
}

export function WorkOrderHeader({ workOrder, statusLookup, priorityLookup }: WorkOrderHeaderProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const getStatusBadge = () => {
    if (!statusLookup) return <Badge variant="outline">{workOrder.status}</Badge>;
    
    const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'open': 'outline',
      'in_progress': 'default',
      'completed': 'default',
      'cancelled': 'destructive',
    };
    
    return (
      <Badge variant={variantMap[statusLookup.category] || 'outline'}>
        {getLookupName(statusLookup, language)}
      </Badge>
    );
  };

  const getPriorityBadge = () => {
    if (!priorityLookup) return <Badge variant="outline">{workOrder.priority}</Badge>;
    
    const variantMap: Record<number, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      1: 'outline',      // Low
      2: 'secondary',    // Medium  
      3: 'default',      // High
      4: 'destructive',  // Critical/Urgent
    };
    
    return (
      <Badge variant={variantMap[priorityLookup.level || 0] || 'outline'}>
        {getLookupName(priorityLookup, language)}
      </Badge>
    );
  };

  return (
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
        {getStatusBadge()}
        {getPriorityBadge()}
      </div>
    </div>
  );
}
