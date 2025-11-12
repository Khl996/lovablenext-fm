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
  building_id: string | null;
  floor_id: string | null;
  department_id: string | null;
  room_id: string | null;
  work_notes: string | null;
  supervisor_notes: string | null;
  customer_feedback: string | null;
  customer_rating: number | null;
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
  const [updating, setUpdating] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');
  const [teams, setTeams] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');
  const [reporterName, setReporterName] = useState<string>('');
  const [supervisorName, setSupervisorName] = useState<string>('');
  const [assignedTechnicianName, setAssignedTechnicianName] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (id) {
      loadWorkOrder();
      loadOperations();
      loadTeams();
      loadTechnicians();
    }
  }, [id]);

  const loadTechnicians = async () => {
    if (!hospitalId) return;
    try {
      // Get users from the hospital
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('hospital_id', hospitalId);
      
      if (error) throw error;
      setTechnicians(profiles || []);
    } catch (error) {
      console.error('Error loading technicians:', error);
    }
  };

  const loadTeams = async () => {
    if (!hospitalId) return;
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, name_ar')
        .eq('hospital_id', hospitalId)
        .eq('status', 'active');
      
      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

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
      setNewStatus(data.status);
      setSelectedTeam(data.assigned_team || '');
      setSelectedTechnician(data.assigned_to || '');

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateStatus = async () => {
    if (!workOrder || !newStatus) return;

    try {
      setUpdating(true);
      
      const updates: any = { 
        status: newStatus as any,
      };

      if (newNote) {
        updates.work_notes = workOrder.work_notes 
          ? `${workOrder.work_notes}\n\n[${format(new Date(), 'dd/MM/yyyy HH:mm')}]: ${newNote}`
          : newNote;
      }

      if (selectedTeam && selectedTeam !== workOrder.assigned_team) {
        updates.assigned_team = selectedTeam;
      }

      if (selectedTechnician && selectedTechnician !== workOrder.assigned_to) {
        updates.assigned_to = selectedTechnician;
      }

      // TODO: Implement photo upload to storage bucket
      // For now, we'll just note in the log that photos were added
      if (selectedFiles.length > 0) {
        updates.work_notes = (updates.work_notes || workOrder.work_notes || '') + 
          `\n[${selectedFiles.length} ${language === 'ar' ? 'صور مرفقة' : 'photos attached'}]`;
      }

      const { error } = await supabase
        .from('work_orders')
        .update(updates)
        .eq('id', workOrder.id);

      if (error) throw error;

      // Log the action in operations_log
      if (user && hospitalId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        const logDescription = [];
        if (newStatus !== workOrder.status) {
          logDescription.push(`${language === 'ar' ? 'الحالة من' : 'Status from'} ${workOrder.status} ${language === 'ar' ? 'إلى' : 'to'} ${newStatus}`);
        }
        if (selectedTeam && selectedTeam !== workOrder.assigned_team) {
          logDescription.push(`${language === 'ar' ? 'الفريق المعين' : 'Team assigned'}`);
        }
        if (selectedTechnician && selectedTechnician !== workOrder.assigned_to) {
          logDescription.push(`${language === 'ar' ? 'الفني المعين' : 'Technician assigned'}`);
        }
        if (selectedFiles.length > 0) {
          logDescription.push(`${selectedFiles.length} ${language === 'ar' ? 'صور مرفقة' : 'photos attached'}`);
        }

        await supabase.from('operations_log').insert({
          hospital_id: hospitalId,
          related_work_order: workOrder.id,
          type: 'adjustment',
          code: `OP-${Date.now()}`,
          system_type: 'Work Order',
          asset_name: workOrder.code,
          location: workOrder.building_id || 'N/A',
          technician_name: profile?.full_name || 'Unknown',
          reason: logDescription.join(', '),
          description: newNote || logDescription.join(', '),
          notes: newNote,
          performed_by: user.id,
        });
      }

      toast({
        title: language === 'ar' ? 'تم التحديث' : 'Updated',
        description: language === 'ar' ? 'تم تحديث أمر العمل بنجاح' : 'Work order updated successfully',
      });

      loadWorkOrder();
      loadOperations();
      setNewNote('');
      setSelectedFiles([]);
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleExportPDF = async () => {
    if (!workOrder) return;

    // This is a placeholder - you'll need to implement actual PDF generation
    // using a library like jsPDF or by calling a backend endpoint
    toast({
      title: language === 'ar' ? 'قريباً' : 'Coming Soon',
      description: language === 'ar' ? 'سيتم إضافة تصدير PDF قريباً' : 'PDF export feature coming soon',
    });
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

          {/* Update Status & Actions */}
          {permissions.hasPermission('manage_work_orders') && (
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'الإجراءات' : 'Actions'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الحالة الجديدة' : 'New Status'}</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {lookups.work_order_statuses?.filter(s => s.is_active).map((status) => (
                        <SelectItem key={status.code} value={status.code}>
                          {getLookupName(status, language)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'تعيين الفريق' : 'Assign Team'}</Label>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'اختر فريق' : 'Select team'} />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {language === 'ar' ? team.name_ar : team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'تعيين الفني' : 'Assign Technician'}</Label>
                  <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'اختر فني' : 'Select technician'} />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'إضافة ملاحظة' : 'Add Note'}</Label>
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder={language === 'ar' ? 'أضف ملاحظة...' : 'Add a note...'}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'إضافة صور' : 'Add Photos'}</Label>
                  <div className="border-2 border-dashed rounded-lg p-4">
                    <input
                      type="file"
                      id="file-upload"
                      multiple
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label 
                      htmlFor="file-upload"
                      className="flex flex-col items-center justify-center cursor-pointer"
                    >
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'اضغط لإضافة صور' : 'Click to upload photos'}
                      </span>
                    </label>
                  </div>
                  
                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" />
                            <span className="text-sm">{file.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleUpdateStatus}
                  disabled={updating}
                >
                  {updating ? (language === 'ar' ? 'جاري التحديث...' : 'Updating...') : (language === 'ar' ? 'حفظ التغييرات' : 'Save Changes')}
                </Button>
              </CardContent>
            </Card>
          )}

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
