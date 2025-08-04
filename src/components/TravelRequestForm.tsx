import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CalendarDays, MapPin, DollarSign, FileText } from 'lucide-react';

const travelRequestSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().optional(),
  destination: z.string().min(1, 'El destino es requerido'),
  start_date: z.string().min(1, 'La fecha de inicio es requerida'),
  end_date: z.string().min(1, 'La fecha de fin es requerida'),
  estimated_amount: z.number().min(0, 'El monto estimado debe ser mayor a 0'),
});

type TravelRequestFormData = z.infer<typeof travelRequestSchema>;

interface TravelRequestFormProps {
  onSuccess?: () => void;
}

export const TravelRequestForm = ({ onSuccess }: TravelRequestFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<TravelRequestFormData>({
    resolver: zodResolver(travelRequestSchema),
    defaultValues: {
      title: '',
      description: '',
      destination: '',
      start_date: '',
      end_date: '',
      estimated_amount: 0,
    },
  });

  const onSubmit = async (data: TravelRequestFormData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Debes estar autenticado para crear una solicitud",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('travel_requests').insert({
        title: data.title,
        description: data.description,
        destination: data.destination,
        start_date: data.start_date,
        end_date: data.end_date,
        estimated_amount: data.estimated_amount,
        user_id: user.id,
        status: 'draft',
      });

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: "Solicitud de viáticos creada correctamente",
      });

      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating travel request:', error);
      toast({
        title: "Error",
        description: "Error al crear la solicitud de viáticos",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-elegant border-0 bg-gradient-to-br from-card to-card/90">
      <CardHeader className="pb-4 bg-gradient-to-r from-primary to-secondary text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-3 text-xl">
          <FileText className="w-6 h-6" />
          Nueva solicitud de viáticos
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Título de la solicitud
              </Label>
              <Input
                id="title"
                {...form.register('title')}
                placeholder="Ej: Viaje de trabajo a Guadalajara"
                className="bg-background"
              />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Destino
              </Label>
              <Input
                id="destination"
                {...form.register('destination')}
                placeholder="Ciudad, Estado"
                className="bg-background"
              />
              {form.formState.errors.destination && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.destination.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date" className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Fecha de inicio
              </Label>
              <Input
                id="start_date"
                type="date"
                {...form.register('start_date')}
                className="bg-background"
              />
              {form.formState.errors.start_date && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.start_date.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date" className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Fecha de fin
              </Label>
              <Input
                id="end_date"
                type="date"
                {...form.register('end_date')}
                className="bg-background"
              />
              {form.formState.errors.end_date && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.end_date.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_amount" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Monto estimado (MXN)
              </Label>
              <Input
                id="estimated_amount"
                type="number"
                step="0.01"
                {...form.register('estimated_amount', { valueAsNumber: true })}
                placeholder="0.00"
                className="bg-background"
              />
              {form.formState.errors.estimated_amount && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.estimated_amount.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Descripción (opcional)
            </Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Describe el propósito del viaje, actividades planeadas, etc."
              className="bg-background min-h-[100px]"
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={isSubmitting}
            >
              Limpiar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-primary to-secondary text-white hover:from-primary/90 hover:to-secondary/90"
            >
              {isSubmitting ? 'Creando...' : 'Crear solicitud'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};