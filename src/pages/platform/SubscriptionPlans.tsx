import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Eye, EyeOff, Star, MoveUp, MoveDown } from 'lucide-react';
import { toast } from 'sonner';
import type { SubscriptionPlan } from '@/types';

export default function SubscriptionPlans() {
  const { language } = useLanguage();
  const { plans } = useSubscriptionPlans();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {language === 'ar' ? 'خطط الاشتراك' : 'Subscription Plans'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {language === 'ar' ? 'إدارة خطط الاشتراك المتاحة' : 'Manage subscription plans'}
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {language === 'ar' ? 'إضافة خطة' : 'Add Plan'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans?.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <CardTitle>{language === 'ar' ? plan.name_ar : plan.name}</CardTitle>
              <CardDescription>{language === 'ar' ? plan.description_ar : plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>{language === 'ar' ? 'شهرياً:' : 'Monthly:'}</span>
                  <span>${plan.price_monthly?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{language === 'ar' ? 'سنوياً:' : 'Yearly:'}</span>
                  <span>${plan.price_yearly?.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
