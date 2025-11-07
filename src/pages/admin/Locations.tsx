import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Building, Layers, Home, DoorOpen, Plus, Edit, Trash2, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type Hospital = {
  id: string;
  name: string;
  name_ar: string;
};

type Building = {
  id: string;
  hospital_id: string;
  code: string;
  name: string;
  name_ar: string;
  description: string | null;
  created_at: string;
};

type Floor = {
  id: string;
  building_id: string;
  code: string;
  level: number;
  name: string;
  name_ar: string;
};

type Department = {
  id: string;
  floor_id: string;
  code: string;
  name: string;
  name_ar: string;
};

type Room = {
  id: string;
  department_id: string;
  code: string;
  name: string;
  name_ar: string;
  coordinates_x: number | null;
  coordinates_y: number | null;
};

export default function Locations() {
  const { t, language } = useLanguage();
  const { user, primaryRole, permissions } = useCurrentUser();
  const { toast } = useToast();

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('');
  
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [buildingDialog, setBuildingDialog] = useState(false);
  const [buildingForm, setBuildingForm] = useState({ id: '', code: '', name: '', name_ar: '', description: '' });
  const [buildingSearch, setBuildingSearch] = useState('');

  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string>('');
  const [floorDialog, setFloorDialog] = useState(false);
  const [floorForm, setFloorForm] = useState({ id: '', code: '', level: 0, name: '', name_ar: '' });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [departmentDialog, setDepartmentDialog] = useState(false);
  const [departmentForm, setDepartmentForm] = useState({ id: '', code: '', name: '', name_ar: '' });

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomDialog, setRoomDialog] = useState(false);
  const [roomForm, setRoomForm] = useState({ id: '', code: '', name: '', name_ar: '', coordinates_x: '', coordinates_y: '' });

  const [loading, setLoading] = useState(true);

  const canManageLocations = permissions.hasPermission('manage_locations');

  useEffect(() => {
    loadHospitals();
  }, []);

  useEffect(() => {
    if (selectedHospitalId) {
      loadBuildings();
    }
  }, [selectedHospitalId]);

  useEffect(() => {
    if (selectedBuildingId) {
      loadFloors();
    } else {
      setFloors([]);
      setSelectedFloorId('');
    }
  }, [selectedBuildingId]);

  useEffect(() => {
    if (selectedFloorId) {
      loadDepartments();
    } else {
      setDepartments([]);
      setSelectedDepartmentId('');
    }
  }, [selectedFloorId]);

  useEffect(() => {
    if (selectedDepartmentId) {
      loadRooms();
    } else {
      setRooms([]);
    }
  }, [selectedDepartmentId]);

  const loadHospitals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('hospitals')
        .select('id, name, name_ar')
        .order('name');

      if (error) throw error;
      setHospitals(data || []);
      if (data && data.length > 0 && !selectedHospitalId) {
        setSelectedHospitalId(data[0].id);
      }
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBuildings = async () => {
    if (!selectedHospitalId) return;
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .eq('hospital_id', selectedHospitalId)
        .order('code');

      if (error) throw error;
      setBuildings(data || []);
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const loadFloors = async () => {
    if (!selectedBuildingId) return;
    try {
      const { data, error } = await supabase
        .from('floors')
        .select('*')
        .eq('building_id', selectedBuildingId)
        .order('level');

      if (error) throw error;
      setFloors(data || []);
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const loadDepartments = async () => {
    if (!selectedFloorId) return;
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('floor_id', selectedFloorId)
        .order('code');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const loadRooms = async () => {
    if (!selectedDepartmentId) return;
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('department_id', selectedDepartmentId)
        .order('code');

      if (error) throw error;
      setRooms(data || []);
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Building handlers
  const handleSaveBuilding = async () => {
    if (!buildingForm.code || !buildingForm.name || !buildingForm.name_ar) {
      toast({
        title: t('error'),
        description: language === 'ar' ? 'الرجاء ملء جميع الحقول المطلوبة' : 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (buildingForm.id) {
        const { error } = await supabase
          .from('buildings')
          .update({
            code: buildingForm.code,
            name: buildingForm.name,
            name_ar: buildingForm.name_ar,
            description: buildingForm.description || null,
          })
          .eq('id', buildingForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('buildings')
          .insert({
            hospital_id: selectedHospitalId,
            code: buildingForm.code,
            name: buildingForm.name,
            name_ar: buildingForm.name_ar,
            description: buildingForm.description || null,
          });
        if (error) throw error;
      }

      toast({
        title: t('success'),
        description: buildingForm.id 
          ? (language === 'ar' ? 'تم تحديث المبنى بنجاح' : 'Building updated successfully')
          : (language === 'ar' ? 'تم إضافة المبنى بنجاح' : 'Building added successfully'),
      });

      setBuildingDialog(false);
      setBuildingForm({ id: '', code: '', name: '', name_ar: '', description: '' });
      loadBuildings();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Floor handlers
  const handleSaveFloor = async () => {
    if (!floorForm.code || !floorForm.name || !floorForm.name_ar) {
      toast({
        title: t('error'),
        description: language === 'ar' ? 'الرجاء ملء جميع الحقول المطلوبة' : 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (floorForm.id) {
        const { error } = await supabase
          .from('floors')
          .update({
            code: floorForm.code,
            level: floorForm.level,
            name: floorForm.name,
            name_ar: floorForm.name_ar,
          })
          .eq('id', floorForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('floors')
          .insert({
            building_id: selectedBuildingId,
            code: floorForm.code,
            level: floorForm.level,
            name: floorForm.name,
            name_ar: floorForm.name_ar,
          });
        if (error) throw error;
      }

      toast({
        title: t('success'),
        description: floorForm.id 
          ? (language === 'ar' ? 'تم تحديث الطابق بنجاح' : 'Floor updated successfully')
          : (language === 'ar' ? 'تم إضافة الطابق بنجاح' : 'Floor added successfully'),
      });

      setFloorDialog(false);
      setFloorForm({ id: '', code: '', level: 0, name: '', name_ar: '' });
      loadFloors();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Department handlers
  const handleSaveDepartment = async () => {
    if (!departmentForm.code || !departmentForm.name || !departmentForm.name_ar) {
      toast({
        title: t('error'),
        description: language === 'ar' ? 'الرجاء ملء جميع الحقول المطلوبة' : 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (departmentForm.id) {
        const { error } = await supabase
          .from('departments')
          .update({
            code: departmentForm.code,
            name: departmentForm.name,
            name_ar: departmentForm.name_ar,
          })
          .eq('id', departmentForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('departments')
          .insert({
            floor_id: selectedFloorId,
            code: departmentForm.code,
            name: departmentForm.name,
            name_ar: departmentForm.name_ar,
          });
        if (error) throw error;
      }

      toast({
        title: t('success'),
        description: departmentForm.id 
          ? (language === 'ar' ? 'تم تحديث القسم بنجاح' : 'Department updated successfully')
          : (language === 'ar' ? 'تم إضافة القسم بنجاح' : 'Department added successfully'),
      });

      setDepartmentDialog(false);
      setDepartmentForm({ id: '', code: '', name: '', name_ar: '' });
      loadDepartments();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Room handlers
  const handleSaveRoom = async () => {
    if (!roomForm.code || !roomForm.name || !roomForm.name_ar) {
      toast({
        title: t('error'),
        description: language === 'ar' ? 'الرجاء ملء جميع الحقول المطلوبة' : 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (roomForm.id) {
        const { error } = await supabase
          .from('rooms')
          .update({
            code: roomForm.code,
            name: roomForm.name,
            name_ar: roomForm.name_ar,
            coordinates_x: roomForm.coordinates_x ? parseFloat(roomForm.coordinates_x) : null,
            coordinates_y: roomForm.coordinates_y ? parseFloat(roomForm.coordinates_y) : null,
          })
          .eq('id', roomForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('rooms')
          .insert({
            department_id: selectedDepartmentId,
            code: roomForm.code,
            name: roomForm.name,
            name_ar: roomForm.name_ar,
            coordinates_x: roomForm.coordinates_x ? parseFloat(roomForm.coordinates_x) : null,
            coordinates_y: roomForm.coordinates_y ? parseFloat(roomForm.coordinates_y) : null,
          });
        if (error) throw error;
      }

      toast({
        title: t('success'),
        description: roomForm.id 
          ? (language === 'ar' ? 'تم تحديث الغرفة بنجاح' : 'Room updated successfully')
          : (language === 'ar' ? 'تم إضافة الغرفة بنجاح' : 'Room added successfully'),
      });

      setRoomDialog(false);
      setRoomForm({ id: '', code: '', name: '', name_ar: '', coordinates_x: '', coordinates_y: '' });
      loadRooms();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredBuildings = buildings.filter(b => 
    b.code.toLowerCase().includes(buildingSearch.toLowerCase()) ||
    b.name.toLowerCase().includes(buildingSearch.toLowerCase()) ||
    b.name_ar.includes(buildingSearch)
  );

  if (loading) {
    return <div className="flex justify-center items-center h-96">{t('loading')}</div>;
  }

  if (!canManageLocations) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('accessDenied')}</CardTitle>
            <CardDescription>
              {language === 'ar' 
                ? 'ليس لديك صلاحية الوصول إلى هذه الصفحة' 
                : 'You do not have permission to access this page'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('facilityLocations')}</h1>
          <p className="text-muted-foreground">{t('manageFacilityStructure')}</p>
        </div>
      </div>

      {/* Hospital Selector */}
      <Card>
        <CardHeader>
          <CardTitle>{t('selectHospital')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedHospitalId} onValueChange={setSelectedHospitalId}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {hospitals.map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {language === 'ar' ? h.name_ar : h.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedHospitalId && (
        <Tabs defaultValue="buildings" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="buildings">
              <Building className="w-4 h-4 mr-2" />
              {t('buildings')}
            </TabsTrigger>
            <TabsTrigger value="floors" disabled={!selectedBuildingId}>
              <Layers className="w-4 h-4 mr-2" />
              {t('floors')}
            </TabsTrigger>
            <TabsTrigger value="departments" disabled={!selectedFloorId}>
              <Home className="w-4 h-4 mr-2" />
              {t('departments')}
            </TabsTrigger>
            <TabsTrigger value="rooms" disabled={!selectedDepartmentId}>
              <DoorOpen className="w-4 h-4 mr-2" />
              {t('rooms')}
            </TabsTrigger>
          </TabsList>

          {/* Buildings Tab */}
          <TabsContent value="buildings">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{t('buildings')}</CardTitle>
                  <Button onClick={() => { setBuildingForm({ id: '', code: '', name: '', name_ar: '', description: '' }); setBuildingDialog(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('addBuilding')}
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t('search')}
                    value={buildingSearch}
                    onChange={(e) => setBuildingSearch(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('code')}</TableHead>
                      <TableHead>{t('name')}</TableHead>
                      <TableHead>{t('nameArabic')}</TableHead>
                      <TableHead>{t('description')}</TableHead>
                      <TableHead>{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBuildings.map((building) => (
                      <TableRow 
                        key={building.id}
                        className={selectedBuildingId === building.id ? 'bg-muted' : 'cursor-pointer hover:bg-muted/50'}
                        onClick={() => setSelectedBuildingId(building.id)}
                      >
                        <TableCell className="font-medium">{building.code}</TableCell>
                        <TableCell>{building.name}</TableCell>
                        <TableCell>{building.name_ar}</TableCell>
                        <TableCell>{building.description || '-'}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBuildingForm({
                                id: building.id,
                                code: building.code,
                                name: building.name,
                                name_ar: building.name_ar,
                                description: building.description || '',
                              });
                              setBuildingDialog(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Floors Tab */}
          <TabsContent value="floors">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{t('floors')}</CardTitle>
                  <Button onClick={() => { setFloorForm({ id: '', code: '', level: 0, name: '', name_ar: '' }); setFloorDialog(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('addFloor')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('code')}</TableHead>
                      <TableHead>{t('level')}</TableHead>
                      <TableHead>{t('name')}</TableHead>
                      <TableHead>{t('nameArabic')}</TableHead>
                      <TableHead>{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {floors.map((floor) => (
                      <TableRow 
                        key={floor.id}
                        className={selectedFloorId === floor.id ? 'bg-muted' : 'cursor-pointer hover:bg-muted/50'}
                        onClick={() => setSelectedFloorId(floor.id)}
                      >
                        <TableCell className="font-medium">{floor.code}</TableCell>
                        <TableCell>{floor.level}</TableCell>
                        <TableCell>{floor.name}</TableCell>
                        <TableCell>{floor.name_ar}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFloorForm({
                                id: floor.id,
                                code: floor.code,
                                level: floor.level,
                                name: floor.name,
                                name_ar: floor.name_ar,
                              });
                              setFloorDialog(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{t('departments')}</CardTitle>
                  <Button onClick={() => { setDepartmentForm({ id: '', code: '', name: '', name_ar: '' }); setDepartmentDialog(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('addDepartment')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('code')}</TableHead>
                      <TableHead>{t('name')}</TableHead>
                      <TableHead>{t('nameArabic')}</TableHead>
                      <TableHead>{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((dept) => (
                      <TableRow 
                        key={dept.id}
                        className={selectedDepartmentId === dept.id ? 'bg-muted' : 'cursor-pointer hover:bg-muted/50'}
                        onClick={() => setSelectedDepartmentId(dept.id)}
                      >
                        <TableCell className="font-medium">{dept.code}</TableCell>
                        <TableCell>{dept.name}</TableCell>
                        <TableCell>{dept.name_ar}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDepartmentForm({
                                id: dept.id,
                                code: dept.code,
                                name: dept.name,
                                name_ar: dept.name_ar,
                              });
                              setDepartmentDialog(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rooms Tab */}
          <TabsContent value="rooms">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{t('rooms')}</CardTitle>
                  <Button onClick={() => { setRoomForm({ id: '', code: '', name: '', name_ar: '', coordinates_x: '', coordinates_y: '' }); setRoomDialog(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('addRoom')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('code')}</TableHead>
                      <TableHead>{t('name')}</TableHead>
                      <TableHead>{t('nameArabic')}</TableHead>
                      <TableHead>{t('coordinates')}</TableHead>
                      <TableHead>{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rooms.map((room) => (
                      <TableRow key={room.id}>
                        <TableCell className="font-medium">{room.code}</TableCell>
                        <TableCell>{room.name}</TableCell>
                        <TableCell>{room.name_ar}</TableCell>
                        <TableCell>
                          {room.coordinates_x !== null && room.coordinates_y !== null ? (
                            <Badge variant="secondary">
                              ({room.coordinates_x}, {room.coordinates_y})
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRoomForm({
                                id: room.id,
                                code: room.code,
                                name: room.name,
                                name_ar: room.name_ar,
                                coordinates_x: room.coordinates_x?.toString() || '',
                                coordinates_y: room.coordinates_y?.toString() || '',
                              });
                              setRoomDialog(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Building Dialog */}
      <Dialog open={buildingDialog} onOpenChange={setBuildingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{buildingForm.id ? t('editBuilding') : t('addBuilding')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('code')} *</Label>
              <Input value={buildingForm.code} onChange={(e) => setBuildingForm({ ...buildingForm, code: e.target.value })} />
            </div>
            <div>
              <Label>{t('name')} *</Label>
              <Input value={buildingForm.name} onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })} />
            </div>
            <div>
              <Label>{t('nameArabic')} *</Label>
              <Input value={buildingForm.name_ar} onChange={(e) => setBuildingForm({ ...buildingForm, name_ar: e.target.value })} />
            </div>
            <div>
              <Label>{t('description')}</Label>
              <Input value={buildingForm.description} onChange={(e) => setBuildingForm({ ...buildingForm, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuildingDialog(false)}>{t('cancel')}</Button>
            <Button onClick={handleSaveBuilding}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floor Dialog */}
      <Dialog open={floorDialog} onOpenChange={setFloorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{floorForm.id ? t('editFloor') : t('addFloor')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('code')} *</Label>
              <Input value={floorForm.code} onChange={(e) => setFloorForm({ ...floorForm, code: e.target.value })} />
            </div>
            <div>
              <Label>{t('level')} *</Label>
              <Input type="number" value={floorForm.level} onChange={(e) => setFloorForm({ ...floorForm, level: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>{t('name')} *</Label>
              <Input value={floorForm.name} onChange={(e) => setFloorForm({ ...floorForm, name: e.target.value })} />
            </div>
            <div>
              <Label>{t('nameArabic')} *</Label>
              <Input value={floorForm.name_ar} onChange={(e) => setFloorForm({ ...floorForm, name_ar: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFloorDialog(false)}>{t('cancel')}</Button>
            <Button onClick={handleSaveFloor}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Department Dialog */}
      <Dialog open={departmentDialog} onOpenChange={setDepartmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{departmentForm.id ? t('editDepartment') : t('addDepartment')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('code')} *</Label>
              <Input value={departmentForm.code} onChange={(e) => setDepartmentForm({ ...departmentForm, code: e.target.value })} />
            </div>
            <div>
              <Label>{t('name')} *</Label>
              <Input value={departmentForm.name} onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })} />
            </div>
            <div>
              <Label>{t('nameArabic')} *</Label>
              <Input value={departmentForm.name_ar} onChange={(e) => setDepartmentForm({ ...departmentForm, name_ar: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepartmentDialog(false)}>{t('cancel')}</Button>
            <Button onClick={handleSaveDepartment}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Room Dialog */}
      <Dialog open={roomDialog} onOpenChange={setRoomDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{roomForm.id ? t('editRoom') : t('addRoom')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('code')} *</Label>
              <Input value={roomForm.code} onChange={(e) => setRoomForm({ ...roomForm, code: e.target.value })} />
            </div>
            <div>
              <Label>{t('name')} *</Label>
              <Input value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} />
            </div>
            <div>
              <Label>{t('nameArabic')} *</Label>
              <Input value={roomForm.name_ar} onChange={(e) => setRoomForm({ ...roomForm, name_ar: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('coordinateX')}</Label>
                <Input type="number" step="0.1" value={roomForm.coordinates_x} onChange={(e) => setRoomForm({ ...roomForm, coordinates_x: e.target.value })} />
              </div>
              <div>
                <Label>{t('coordinateY')}</Label>
                <Input type="number" step="0.1" value={roomForm.coordinates_y} onChange={(e) => setRoomForm({ ...roomForm, coordinates_y: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoomDialog(false)}>{t('cancel')}</Button>
            <Button onClick={handleSaveRoom}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}