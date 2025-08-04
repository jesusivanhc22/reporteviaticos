import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Receipt, DollarSign, Calendar, FileText, Tag } from 'lucide-react';

const expenseSchema = z.object({
  category: z.enum(['accommodation', 'transportation', 'meals', 'other']),
  amount: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  expense_date: z.string().min(1, 'La fecha es requerida'),
  description: z.string().min(1, 'La descripción es requerida'),
  receipt_url: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  travelRequestId: string;
  onSuccess?: () => void;
}

const categoryLabels = {
  accommodation: 'Hospedaje',
  transportation: 'Transporte',
  meals: 'Alimentación',
  other: 'Otros'
};

export const ExpenseForm = ({ travelRequestId, onSuccess }: ExpenseFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: 'other',
      amount: 0,
      expense_date: new Date().toISOString().split('T')[0],
      description: '',
      receipt_url: '',
    },
  });

  const onSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('travel_expenses').insert({
        travel_request_id: travelRequestId,
        category: data.category,
        amount: data.amount,
        expense_date: data.expense_date,
        description: data.description,
        receipt_url: data.receipt_url || null,
      });

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: "Gasto registrado correctamente",
      });

      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating expense:', error);
      toast({
        title: "Error",
        description: "Error al registrar el gasto",
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
          <Receipt className="w-6 h-6" />
          Registrar gasto
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Categoría
              </Label>
              <Select
                value={form.watch('category')}
                onValueChange={(value) => form.setValue('category', value as any)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.category && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.category.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Monto (MXN)
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...form.register('amount', { valueAsNumber: true })}
                placeholder="0.00"
                className="bg-background"
              />
              {form.formState.errors.amount && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.amount.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense_date" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Fecha del gasto
            </Label>
            <Input
              id="expense_date"
              type="date"
              {...form.register('expense_date')}
              className="bg-background"
            />
            {form.formState.errors.expense_date && (
              <p className="text-sm text-destructive">
                {form.formState.errors.expense_date.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Descripción
            </Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Describe el gasto..."
              className="bg-background"
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt_url" className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              URL del recibo (opcional)
            </Label>
            <Input
              id="receipt_url"
              type="url"
              {...form.register('receipt_url')}
              placeholder="https://..."
              className="bg-background"
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
              {isSubmitting ? 'Registrando...' : 'Registrar gasto'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};