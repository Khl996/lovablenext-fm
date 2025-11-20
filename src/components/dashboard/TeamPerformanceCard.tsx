import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users } from 'lucide-react';

interface TeamPerformance {
  name: string;
  name_ar: string;
  completed: number;
  total: number;
  percentage: number;
}

export function TeamPerformanceCard() {
  const { language } = useLanguage();
  const [teams, setTeams] = useState<TeamPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeamPerformance();
  }, []);

  const loadTeamPerformance = async () => {
    try {
      setLoading(true);

      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, name_ar')
        .eq('status', 'active')
        .limit(5);

      if (teamsError) throw teamsError;

      const performanceData = await Promise.all(
        (teamsData || []).map(async (team) => {
          const [completed, total] = await Promise.all([
            supabase
              .from('work_orders')
              .select('*', { count: 'exact', head: true })
              .eq('assigned_team', team.id)
              .eq('status', 'completed'),
            supabase
              .from('work_orders')
              .select('*', { count: 'exact', head: true })
              .eq('assigned_team', team.id),
          ]);

          const completedCount = completed.count || 0;
          const totalCount = total.count || 1;
          const percentage = Math.round((completedCount / totalCount) * 100);

          return {
            name: team.name,
            name_ar: team.name_ar,
            completed: completedCount,
            total: totalCount,
            percentage,
          };
        })
      );

      setTeams(performanceData.sort((a, b) => b.percentage - a.percentage));
    } catch (error) {
      console.error('Error loading team performance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {language === 'ar' ? 'أداء الفرق' : 'Team Performance'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
                <div className="h-2 bg-muted animate-pulse rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {language === 'ar' ? 'أداء الفرق' : 'Team Performance'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {teams.map((team) => (
            <div key={team.name} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {language === 'ar' ? team.name_ar : team.name}
                </span>
                <span className="text-muted-foreground">
                  {team.completed}/{team.total} ({team.percentage}%)
                </span>
              </div>
              <Progress value={team.percentage} className="h-2" />
            </div>
          ))}
          {teams.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {language === 'ar' ? 'لا توجد بيانات متاحة' : 'No data available'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
