import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Zone {
  id: string;
  name: string;
  description: string;
}

export interface ZoneExpenseLimit {
  id: string;
  zone_id: string;
  category: string;
  max_amount: number;
}

export interface ExpenseData {
  hospedaje: number;
  alimentos: number;
  lavanderia: number;
  transporte: number;
}

export interface TravelRequestData {
  title: string;
  description: string;
  destination: string;
  start_date: string;
  end_date: string;
  zone_id: string;
  expenses: ExpenseData;
}

export const useTravelRequestForm = () => {
  const { toast } = useToast();
  const [zones, setZones] = useState<Zone[]>([]);
  const [expenseLimits, setExpenseLimits] = useState<ZoneExpenseLimit[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<TravelRequestData>({
    title: '',
    description: '',
    destination: '',
    start_date: '',
    end_date: '',
    zone_id: '',
    expenses: {
      hospedaje: 0,
      alimentos: 0,
      lavanderia: 0,
      transporte: 0,
    }
  });

  useEffect(() => {
    fetchZones();
    fetchExpenseLimits();
  }, []);

  const fetchZones = async () => {
    try {
      const { data, error } = await supabase
        .from('zones')
        .select('*')
        .order('name');

      if (error) throw error;
      setZones(data || []);
    } catch (error) {
      console.error('Error fetching zones:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las zonas",
        variant: "destructive",
      });
    }
  };

  const fetchExpenseLimits = async () => {
    try {
      const { data, error } = await supabase
        .from('zone_expense_limits')
        .select('*');

      if (error) throw error;
      setExpenseLimits(data || []);
    } catch (error) {
      console.error('Error fetching expense limits:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los límites de gastos",
        variant: "destructive",
      });
    }
  };

  const getExpenseLimitsForZone = (zoneId: string) => {
    return expenseLimits.filter(limit => limit.zone_id === zoneId);
  };

  const getLimitForCategory = (zoneId: string, category: string): number => {
    const limit = expenseLimits.find(
      limit => limit.zone_id === zoneId && limit.category === category
    );
    return limit?.max_amount || 0;
  };

  const getTotalEstimatedAmount = (): number => {
    return Object.values(formData.expenses).reduce((total, amount) => total + amount, 0);
  };

  const validateExpenses = (zoneId: string, expenses: ExpenseData) => {
    const errors: string[] = [];
    
    Object.entries(expenses).forEach(([category, amount]) => {
      const limit = getLimitForCategory(zoneId, category);
      if (amount > limit) {
        errors.push(`${category}: $${amount} excede el límite de $${limit}`);
      }
    });

    return errors;
  };

  const submitTravelRequest = async (isDraft: boolean = false) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Validate expenses if not draft
      if (!isDraft) {
        const validationErrors = validateExpenses(formData.zone_id, formData.expenses);
        if (validationErrors.length > 0) {
          toast({
            title: "Errores de validación",
            description: validationErrors.join(', '),
            variant: "destructive",
          });
          return false;
        }
      }

      const totalAmount = getTotalEstimatedAmount();

      const { error } = await supabase
        .from('travel_requests')
        .insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          destination: formData.destination,
          start_date: formData.start_date,
          end_date: formData.end_date,
          zone_id: formData.zone_id,
          estimated_amount: totalAmount,
          status: isDraft ? 'draft' : 'pending'
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: isDraft ? "Solicitud guardada como borrador" : "Solicitud enviada correctamente",
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        destination: '',
        start_date: '',
        end_date: '',
        zone_id: '',
        expenses: {
          hospedaje: 0,
          alimentos: 0,
          lavanderia: 0,
          transporte: 0,
        }
      });

      return true;
    } catch (error) {
      console.error('Error submitting travel request:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la solicitud",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    setFormData,
    zones,
    expenseLimits,
    loading,
    getExpenseLimitsForZone,
    getLimitForCategory,
    getTotalEstimatedAmount,
    validateExpenses,
    submitTravelRequest,
  };
};