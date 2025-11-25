import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Clock, CheckCircle2 } from 'lucide-react';

interface SimpleDashboardProps {
  userId: string;
  viewType: 'team' | 'own';
}

export function SimpleDashboard({ userId, viewType }: SimpleDashboardProps) {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [stats, setStats] = useState({
    myOrders: 0,
    inProgress: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [userId, viewType]);

  const loadStats = async () => {
    try {
      setLoading(true);

      if (viewType === 'own') {
        // Reporter: only their own orders
        const [myOrders, inProgress, completed] = await Promise.all([
          supabase
            .from('work_orders')
            .select('*', { count: 'exact', head: true })
            .eq('reported_by', userId),
          supabase
            .from('work_orders')
            .select('*', { count: 'exact', head: true })
            .eq('reported_by', userId)
            .in('status', ['assigned', 'in_progress']),
          supabase
            .from('work_orders')
            .select('*', { count: 'exact', head: true })
            .eq('reported_by', userId)
            .eq('status', 'completed'),
        ]);

        setStats({
          myOrders: myOrders.count || 0,
          inProgress: inProgress.count || 0,
          completed: completed.count || 0,
        });
      } else {
        // Technician/Supervisor: team orders
        // First get user's teams
        const { data: teamData } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', userId);

        const teamIds = teamData?.map(t => t.team_id) || [];

        if (teamIds.length > 0) {
          const [myOrders, inProgress, completed] = await Promise.all([
            supabase
              .from('work_orders')
              .select('*', { count: 'exact', head: true })
              .in('assigned_team', teamIds),
            supabase
              .from('work_orders')
              .select('*', { count: 'exact', head: true })
              .in('assigned_team', teamIds)
              .in('status', ['assigned', 'in_progress']),
            supabase
              .from('work_orders')
              .select('*', { count: 'exact', head: true })
              .in('assigned_team', teamIds)
              .eq('status', 'completed'),
          ]);

          setStats({
            myOrders: myOrders.count || 0,
            inProgress: inProgress.count || 0,
            completed: completed.count || 0,
          });
        }
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {viewType === 'own'
            ? (language === 'ar' ? 'أوامر العمل الخاصة بك' : 'Your Work Orders')
            : (language === 'ar' ? 'أوامر عمل الفريق' : 'Team Work Orders')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-primary"
          onClick={() => navigate('/admin/work-orders')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {viewType === 'own'
                ? (language === 'ar' ? 'أوامري' : 'My Orders')
                : (language === 'ar' ? 'أوامر الفريق' : 'Team Orders')}
            </CardTitle>
            <ClipboardList className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 bg-muted animate-pulse rounded"></div>
            ) : (
              <>
                <div className="text-3xl font-bold">{stats.myOrders}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'ar' ? 'إجمالي' : 'Total'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-warning"
          onClick={() => navigate('/admin/work-orders?status=in_progress')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === 'ar' ? 'قيد العمل' : 'In Progress'}
            </CardTitle>
            <Clock className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 bg-muted animate-pulse rounded"></div>
            ) : (
              <>
                <div className="text-3xl font-bold">{stats.inProgress}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'ar' ? 'نشط' : 'Active'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-success"
          onClick={() => navigate('/admin/work-orders?status=completed')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === 'ar' ? 'مكتمل' : 'Completed'}
            </CardTitle>
            <CheckCircle2 className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 bg-muted animate-pulse rounded"></div>
            ) : (
              <>
                <div className="text-3xl font-bold text-success">{stats.completed}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'ar' ? 'منجز' : 'Done'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {language === 'ar' ? 'الإجراءات السريعة' : 'Quick Actions'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <button
            onClick={() => navigate('/admin/work-orders')}
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">
                  {language === 'ar' ? 'عرض أوامر العمل' : 'View Work Orders'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {viewType === 'own'
                    ? (language === 'ar' ? 'إدارة أوامري' : 'Manage my orders')
                    : (language === 'ar' ? 'إدارة أوامر الفريق' : 'Manage team orders')}
                </p>
              </div>
            </div>
          </button>

          {viewType === 'team' && (
            <button
              onClick={() => navigate('/admin/inventory')}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">
                    {language === 'ar' ? 'المخزون' : 'Inventory'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'عرض قطع الغيار' : 'View spare parts'}
                  </p>
                </div>
              </div>
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
