import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';
import { TravelRequestData, ExpenseData } from '@/hooks/useTravelRequestForm';

interface ExpensesStepProps {
  formData: TravelRequestData;
  setFormData: (data: TravelRequestData) => void;
  getLimitForCategory: (zoneId: string, category: string) => number;
  validateExpenses: (zoneId: string, expenses: ExpenseData) => string[];
}

const EXPENSE_CATEGORIES = [
  { key: 'hospedaje', label: 'Hospedaje', description: 'Hotel, hostal, o alojamiento' },
  { key: 'alimentos', label: 'Alimentos', description: 'Comidas y bebidas' },
  { key: 'lavanderia', label: 'Lavandería', description: 'Servicios de lavandería' },
  { key: 'transporte', label: 'Transporte', description: 'Taxi, metro, autobús, etc.' }
];

export const ExpensesStep = ({ formData, setFormData, getLimitForCategory, validateExpenses }: ExpensesStepProps) => {
  const updateExpense = (category: keyof ExpenseData, value: string) => {
    const numericValue = parseFloat(value) || 0;
    setFormData({
      ...formData,
      expenses: {
        ...formData.expenses,
        [category]: numericValue
      }
    });
  };

  const validationErrors = formData.zone_id ? validateExpenses(formData.zone_id, formData.expenses) : [];
  const totalAmount = Object.values(formData.expenses).reduce((sum, amount) => sum + amount, 0);

  if (!formData.zone_id) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Primero debe seleccionar una zona en el paso anterior para ver los límites de gastos.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {EXPENSE_CATEGORIES.map((category) => {
          const limit = getLimitForCategory(formData.zone_id, category.key);
          const currentAmount = formData.expenses[category.key as keyof ExpenseData];
          const isOverLimit = currentAmount > limit;

          return (
            <div key={category.key} className="space-y-2">
              <Label htmlFor={category.key} className="flex items-center justify-between">
                <span>{category.label}</span>
                <span className="text-sm text-muted-foreground">
                  Límite: ${limit.toLocaleString()}
                </span>
              </Label>
              <Input
                id={category.key}
                type="number"
                min="0"
                step="0.01"
                value={currentAmount || ''}
                onChange={(e) => updateExpense(category.key as keyof ExpenseData, e.target.value)}
                placeholder="0.00"
                className={`border-primary/20 focus:border-primary ${
                  isOverLimit ? 'border-destructive focus:border-destructive' : ''
                }`}
              />
              <p className="text-sm text-muted-foreground">{category.description}</p>
              {isOverLimit && (
                <p className="text-sm text-destructive">
                  Excede el límite por ${(currentAmount - limit).toLocaleString()}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Total Amount */}
      <div className="bg-muted/50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-primary">Total estimado:</span>
          <span className="text-2xl font-bold text-primary">
            ${totalAmount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-semibold">Errores de validación:</p>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Zone Limits Info */}
      <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
        <h4 className="font-semibold text-primary mb-3">
          Límites para {formData.zone_id === 'zona-a' ? 'Zona A' : 'Zona B'}:
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {EXPENSE_CATEGORIES.map((category) => {
            const limit = getLimitForCategory(formData.zone_id, category.key);
            return (
              <div key={category.key} className="text-center">
                <div className="font-medium text-primary">{category.label}</div>
                <div className="text-muted-foreground">${limit.toLocaleString()}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};