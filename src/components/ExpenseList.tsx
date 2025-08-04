import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Receipt, DollarSign, Calendar, ExternalLink, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Expense {
  id: string;
  category: 'accommodation' | 'transportation' | 'meals' | 'other';
  amount: number;
  expense_date: string;
  description: string;
  receipt_url: string | null;
  created_at: string;
}

interface ExpenseListProps {
  travelRequestId: string;
  refreshTrigger?: number;
}

const categoryLabels = {
  accommodation: 'Hospedaje',
  transportation: 'Transporte',
  meals: 'Alimentación',
  other: 'Otros'
};

const categoryColors = {
  accommodation: 'bg-blue-100 text-blue-800',
  transportation: 'bg-green-100 text-green-800',
  meals: 'bg-orange-100 text-orange-800',
  other: 'bg-gray-100 text-gray-800'
};

export const ExpenseList = ({ travelRequestId, refreshTrigger }: ExpenseListProps) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('travel_expenses')
        .select('*')
        .eq('travel_request_id', travelRequestId)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast({
        title: "Error",
        description: "Error al cargar los gastos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from('travel_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: "Gasto eliminado correctamente",
      });

      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Error",
        description: "Error al eliminar el gasto",
        variant: "destructive",
      });
    }
  };

  const getTotalExpenses = () => {
    return expenses.reduce((total, expense) => total + expense.amount, 0);
  };

  useEffect(() => {
    fetchExpenses();
  }, [travelRequestId, refreshTrigger]);

  if (isLoading) {
    return (
      <Card className="shadow-elegant border-0 bg-gradient-to-br from-card to-card/90">
        <CardContent className="p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4 mx-auto"></div>
            <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-elegant border-0 bg-gradient-to-br from-card to-card/90">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-3 text-xl">
            <Receipt className="w-6 h-6 text-primary" />
            Gastos registrados
          </CardTitle>
          {expenses.length > 0 && (
            <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg">
              <DollarSign className="w-5 h-5 text-primary" />
              <span className="font-semibold text-primary">
                Total: ${getTotalExpenses().toLocaleString('es-MX', { 
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2 
                })}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <div className="text-center py-8">
            <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              No hay gastos registrados
            </h3>
            <p className="text-muted-foreground">
              Registra tus primeros gastos para esta solicitud
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Recibo</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Badge className={categoryColors[expense.category]}>
                        {categoryLabels[expense.category]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{expense.description}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        {format(new Date(expense.expense_date), 'dd/MM/yyyy', { locale: es })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-primary" />
                        ${expense.amount.toLocaleString('es-MX', { 
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2 
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {expense.receipt_url ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(expense.receipt_url!, '_blank')}
                          className="h-8 p-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sin recibo</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteExpense(expense.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};