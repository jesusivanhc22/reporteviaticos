import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plane } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const travelRequestSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  destination: z.string().min(1, 'El destino es requerido'),
  description: z.string().optional(),
  startDate: z.date({
    required_error: 'La fecha de inicio es requerida',
  }),
  endDate: z.date({
    required_error: 'La fecha de fin es requerida',
  }),
  estimatedAmount: z.string().min(1, 'El monto estimado es requerido'),
  status: z.enum(['draft', 'pending', 'approved', 'rejected']),
}).refine((data) => data.endDate >= data.startDate, {
  message: 'La fecha de fin debe ser posterior a la fecha de inicio',
  path: ['endDate'],
});

type TravelRequestFormData = z.infer<typeof travelRequestSchema>;

interface TravelRequestFormProps {
  onSuccess?: () => void;
}

export const TravelRequestForm = ({ onSuccess }: TravelRequestFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<TravelRequestFormData>({
    resolver: zodResolver(travelRequestSchema),
    defaultValues: {
      title: '',
      destination: '',
      description: '',
      estimatedAmount: '',
      status: 'draft',
    },
  });

  const onSubmit = async (data: TravelRequestFormData) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('travel_requests')
        .insert({
          title: data.title,
          destination: data.destination,
          description: data.description,
          start_date: data.startDate.toISOString().split('T')[0],
          end_date: data.endDate.toISOString().split('T')[0],
          estimated_amount: parseFloat(data.estimatedAmount),
          status: data.status,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: 'Solicitud creada',
        description: 'La solicitud de viáticos ha sido creada exitosamente',
      });

      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating travel request:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la solicitud de viáticos',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="shadow-elegant border-0 bg-gradient-to-br from-card to-card/90">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center gap-3 text-xl">
          <Plane className="w-6 h-6 text-primary" />
          Nueva solicitud de viáticos
        </CardTitle>
        <CardDescription>
          Completa la información para crear una nueva solicitud de gastos de viaje
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Viaje de negocios a CDMX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destino</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Ciudad de México" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detalles adicionales sobre el viaje..." 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de inicio</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: es })
                            ) : (
                              <span>Selecciona una fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date()
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de fin</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: es })
                            ) : (
                              <span>Selecciona una fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date() || 
                            (form.watch('startDate') && date < form.watch('startDate'))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estimatedAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto estimado (MXN)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Borrador</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="approved">Aprobada</SelectItem>
                        <SelectItem value="rejected">Rechazada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                className="flex-1"
              >
                Limpiar
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="flex-1 bg-gradient-to-r from-primary to-secondary text-white hover:from-primary/90 hover:to-secondary/90"
              >
                {form.formState.isSubmitting ? 'Creando...' : 'Crear solicitud'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};