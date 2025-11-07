import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

type Hospital = {
  id: string;
  name: string;
  name_ar: string;
};

type Building = {
  id: string;
  code: string;
  name: string;
  name_ar: string;
};

type Floor = {
  id: string;
  code: string;
  level: number;
  name: string;
  name_ar: string;
};

type Department = {
  id: string;
  code: string;
  name: string;
  name_ar: string;
};

type Room = {
  id: string;
  code: string;
  name: string;
  name_ar: string;
};

export type LocationValue = {
  hospitalId: string | null;
  buildingId: string | null;
  floorId: string | null;
  departmentId: string | null;
  roomId: string | null;
};

type LocationPickerProps = {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  hospitalId?: string | null; // If provided, lock hospital selection
  showHospital?: boolean; // Show hospital selector
  showBuilding?: boolean;
  showFloor?: boolean;
  showDepartment?: boolean;
  showRoom?: boolean;
  required?: boolean;
};

export function LocationPicker({
  value,
  onChange,
  hospitalId: fixedHospitalId,
  showHospital = true,
  showBuilding = true,
  showFloor = true,
  showDepartment = true,
  showRoom = true,
  required = false,
}: LocationPickerProps) {
  const { t, language } = useLanguage();

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const effectiveHospitalId = fixedHospitalId || value.hospitalId;

  // Load hospitals
  useEffect(() => {
    if (showHospital && !fixedHospitalId) {
      loadHospitals();
    }
  }, [showHospital, fixedHospitalId]);

  // Load buildings when hospital changes
  useEffect(() => {
    if (effectiveHospitalId && showBuilding) {
      loadBuildings(effectiveHospitalId);
    } else {
      setBuildings([]);
      if (value.buildingId) {
        onChange({ ...value, buildingId: null, floorId: null, departmentId: null, roomId: null });
      }
    }
  }, [effectiveHospitalId, showBuilding]);

  // Load floors when building changes
  useEffect(() => {
    if (value.buildingId && showFloor) {
      loadFloors(value.buildingId);
    } else {
      setFloors([]);
      if (value.floorId) {
        onChange({ ...value, floorId: null, departmentId: null, roomId: null });
      }
    }
  }, [value.buildingId, showFloor]);

  // Load departments when floor changes
  useEffect(() => {
    if (value.floorId && showDepartment) {
      loadDepartments(value.floorId);
    } else {
      setDepartments([]);
      if (value.departmentId) {
        onChange({ ...value, departmentId: null, roomId: null });
      }
    }
  }, [value.floorId, showDepartment]);

  // Load rooms when department changes
  useEffect(() => {
    if (value.departmentId && showRoom) {
      loadRooms(value.departmentId);
    } else {
      setRooms([]);
      if (value.roomId) {
        onChange({ ...value, roomId: null });
      }
    }
  }, [value.departmentId, showRoom]);

  const loadHospitals = async () => {
    const { data } = await supabase
      .from('hospitals')
      .select('id, name, name_ar')
      .order('name');
    setHospitals(data || []);
  };

  const loadBuildings = async (hospitalId: string) => {
    const { data } = await supabase
      .from('buildings')
      .select('id, code, name, name_ar')
      .eq('hospital_id', hospitalId)
      .order('code');
    setBuildings(data || []);
  };

  const loadFloors = async (buildingId: string) => {
    const { data } = await supabase
      .from('floors')
      .select('id, code, level, name, name_ar')
      .eq('building_id', buildingId)
      .order('level');
    setFloors(data || []);
  };

  const loadDepartments = async (floorId: string) => {
    const { data } = await supabase
      .from('departments')
      .select('id, code, name, name_ar')
      .eq('floor_id', floorId)
      .order('code');
    setDepartments(data || []);
  };

  const loadRooms = async (departmentId: string) => {
    const { data } = await supabase
      .from('rooms')
      .select('id, code, name, name_ar')
      .eq('department_id', departmentId)
      .order('code');
    setRooms(data || []);
  };

  return (
    <div className="space-y-4">
      {showHospital && !fixedHospitalId && (
        <div>
          <Label>
            {t('hospital')}
            {required && ' *'}
          </Label>
          <Select
            value={value.hospitalId || 'none'}
            onValueChange={(v) => onChange({ 
              hospitalId: v === 'none' ? null : v, 
              buildingId: null, 
              floorId: null, 
              departmentId: null, 
              roomId: null 
            })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('selectHospital')} />
            </SelectTrigger>
            <SelectContent>
              {!required && <SelectItem value="none">-</SelectItem>}
              {hospitals.map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {language === 'ar' ? h.name_ar : h.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showBuilding && effectiveHospitalId && (
        <div>
          <Label>
            {t('building')}
            {required && ' *'}
          </Label>
          <Select
            value={value.buildingId || 'none'}
            onValueChange={(v) => onChange({ 
              ...value, 
              buildingId: v === 'none' ? null : v, 
              floorId: null, 
              departmentId: null, 
              roomId: null 
            })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('selectBuilding')} />
            </SelectTrigger>
            <SelectContent>
              {!required && <SelectItem value="none">-</SelectItem>}
              {buildings.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.code} - {language === 'ar' ? b.name_ar : b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showFloor && value.buildingId && (
        <div>
          <Label>
            {t('floor')}
            {required && ' *'}
          </Label>
          <Select
            value={value.floorId || 'none'}
            onValueChange={(v) => onChange({ 
              ...value, 
              floorId: v === 'none' ? null : v, 
              departmentId: null, 
              roomId: null 
            })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('selectFloor')} />
            </SelectTrigger>
            <SelectContent>
              {!required && <SelectItem value="none">-</SelectItem>}
              {floors.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {t('level')} {f.level} - {language === 'ar' ? f.name_ar : f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showDepartment && value.floorId && (
        <div>
          <Label>
            {t('department')}
            {required && ' *'}
          </Label>
          <Select
            value={value.departmentId || 'none'}
            onValueChange={(v) => onChange({ 
              ...value, 
              departmentId: v === 'none' ? null : v, 
              roomId: null 
            })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('selectDepartment')} />
            </SelectTrigger>
            <SelectContent>
              {!required && <SelectItem value="none">-</SelectItem>}
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.code} - {language === 'ar' ? d.name_ar : d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showRoom && value.departmentId && (
        <div>
          <Label>
            {t('room')}
            {required && ' *'}
          </Label>
          <Select
            value={value.roomId || 'none'}
            onValueChange={(v) => onChange({ 
              ...value, 
              roomId: v === 'none' ? null : v 
            })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('selectRoom')} />
            </SelectTrigger>
            <SelectContent>
              {!required && <SelectItem value="none">-</SelectItem>}
              {rooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.code} - {language === 'ar' ? r.name_ar : r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}