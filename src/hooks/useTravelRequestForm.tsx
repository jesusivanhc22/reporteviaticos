import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Zone {
  id: string;
  name: string;
  description: string;
}

export interface MexicanState {
  id: string;
  name: string;
  zone_type: 'A' | 'B';
}

export interface ZoneExpenseLimit {
  id: string;
  zone_id: string;
  category: string;
  max_amount: number;
}

export interface RequestType {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
}

export interface ServiceType {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  daily_allowance: number;
}

export interface Collaborator {
  id: string;
  full_name: string;
  gender: 'male' | 'female' | 'other';
  is_active: boolean;
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
  request_type_id: string;
  service_type_id: string;
  collaborators: string[]; // selected collaborator IDs
  number_of_rooms: number | null;
  expenses: ExpenseData;
}

export const useTravelRequestForm = () => {
  const { toast } = useToast();
  const [zones, setZones] = useState<Zone[]>([]);
  const [mexicanStates, setMexicanStates] = useState<MexicanState[]>([]);
  const [expenseLimits, setExpenseLimits] = useState<ZoneExpenseLimit[]>([]);
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [availableCollaborators, setAvailableCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<TravelRequestData>({
    title: '',
    description: '',
    destination: '',
    start_date: '',
    end_date: '',
    zone_id: '',
    request_type_id: '',
    service_type_id: '',
    collaborators: [],
    number_of_rooms: null,
    expenses: {
      hospedaje: 0,
      alimentos: 0,
      lavanderia: 0,
      transporte: 0,
    }
  });

  useEffect(() => {
    fetchZones();
    fetchMexicanStates();
    fetchExpenseLimits();
    fetchRequestTypes();
    fetchServiceTypes();
    fetchCollaborators();
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

  const fetchMexicanStates = async () => {
    try {
      const { data, error } = await supabase
        .from('mexican_states')
        .select('*')
        .order('name');

      if (error) throw error;
      setMexicanStates(data?.map(state => ({
        id: state.id,
        name: state.name,
        zone_type: state.zone_type as 'A' | 'B'
      })) || []);
    } catch (error) {
      console.error('Error fetching Mexican states:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los estados",
        variant: "destructive",
      });
    }
  };

  const fetchRequestTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('request_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setRequestTypes(data || []);
    } catch (error) {
      console.error('Error fetching request types:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los tipos de solicitud',
        variant: 'destructive',
      });
    }
  };

  const fetchServiceTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('service_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setServiceTypes(data || []);
    } catch (error) {
      console.error('Error fetching service types:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los tipos de servicio',
        variant: 'destructive',
      });
    }
  };

  const fetchCollaborators = async () => {
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select('id, full_name, gender, is_active')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setAvailableCollaborators(data || []);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los colaboradores',
        variant: 'destructive',
      });
    }
  };

  const getZoneForState = (stateName: string): string => {
    const state = mexicanStates.find(s => s.name === stateName);
    if (!state) return '';
    
    // Find the zone with the matching zone type
    const zone = zones.find(z => 
      (state.zone_type === 'A' && z.name.includes('A')) ||
      (state.zone_type === 'B' && z.name.includes('B'))
    );
    return zone?.id || '';
  };

  const getDisplayZone = (stateName: string): string => {
    const state = mexicanStates.find(s => s.name === stateName);
    return state ? `Zona ${state.zone_type}` : '';
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

  const calculateTripDays = (): number => {
    if (!formData.start_date || !formData.end_date) return 0;
    
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    const dayMs = 1000 * 60 * 60 * 24;
    // Normalize to midnight to avoid TZ issues and count both start and end days (+1)
    const startMid = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
    const endMid = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
    const diffTime = Math.abs(endMid - startMid);
    const diffDays = Math.floor(diffTime / dayMs) + 1;
    
    return Math.max(1, diffDays);
  };

  const calculateRecommendedExpenses = (): ExpenseData => {
    if (!formData.zone_id || !formData.start_date || !formData.end_date) {
      return { hospedaje: 0, alimentos: 0, lavanderia: 0, transporte: 0 };
    }

    const days = calculateTripDays();
    const categories = ['hospedaje', 'alimentos', 'lavanderia', 'transporte'] as const;
    
    const recommended: ExpenseData = {
      hospedaje: 0,
      alimentos: 0,
      lavanderia: 0,
      transporte: 0,
    };

    categories.forEach(category => {
      const dailyLimit = getLimitForCategory(formData.zone_id, category);
      if (category === 'lavanderia') {
        if (days > 5) {
          const perDayLaundry = dailyLimit / 5; // e.g., 350/5 = 70
          recommended.lavanderia = perDayLaundry * days; // e.g., 13 * 70 = 910
        } else {
          recommended.lavanderia = 0;
        }
      } else {
        recommended[category] = dailyLimit * days;
      }
    });

    return recommended;
  };

  const getTotalLimitForCategory = (zoneId: string, category: string): number => {
    const dailyLimit = getLimitForCategory(zoneId, category);
    const days = calculateTripDays();
    return dailyLimit * days;
  };

  const validateExpenses = (zoneId: string, expenses: ExpenseData) => {
    const errors: string[] = [];
    
    Object.entries(expenses).forEach(([category, amount]) => {
      const totalLimit = getTotalLimitForCategory(zoneId, category);
      if (amount > totalLimit) {
        const dailyLimit = getLimitForCategory(zoneId, category);
        const days = calculateTripDays();
        errors.push(`${category}: $${amount.toLocaleString()} excede el límite total de $${totalLimit.toLocaleString()} ($${dailyLimit.toLocaleString()}/día × ${days} días)`);
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

      const { data: inserted, error } = await supabase
        .from('travel_requests')
        .insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          destination: formData.destination,
          start_date: formData.start_date,
          end_date: formData.end_date,
          zone_id: formData.zone_id,
          request_type_id: formData.request_type_id || null,
          service_type_id: formData.service_type_id ? formData.service_type_id : null,
          number_of_rooms: formData.number_of_rooms ?? null,
          estimated_amount: totalAmount,
          status: isDraft ? 'draft' : 'pending'
        })
        .select('id')
        .single();

      if (error) throw error;

      const requestId = inserted?.id;

      if (requestId && formData.collaborators && formData.collaborators.length > 0) {
        const rows = formData.collaborators.map((cid) => ({
          travel_request_id: requestId,
          collaborator_id: cid,
        }));
        const { error: linkErr } = await supabase.from('travel_request_collaborators').insert(rows);
        if (linkErr) throw linkErr;
      }

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
        request_type_id: '',
        service_type_id: '',
        collaborators: [],
        number_of_rooms: null,
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
    mexicanStates,
    requestTypes,
    serviceTypes,
    availableCollaborators,
    expenseLimits,
    loading,
    getExpenseLimitsForZone,
    getLimitForCategory,
    getTotalEstimatedAmount,
    calculateTripDays,
    calculateRecommendedExpenses,
    getTotalLimitForCategory,
    validateExpenses,
    submitTravelRequest,
    getZoneForState,
    getDisplayZone,
  };
};