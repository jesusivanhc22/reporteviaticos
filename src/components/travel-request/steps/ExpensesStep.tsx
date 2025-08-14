import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info, Calculator, Zap } from 'lucide-react';
import { TravelRequestData, ExpenseData } from '@/hooks/useTravelRequestForm';

interface ExpensesStepProps {
  formData: TravelRequestData;
  setFormData: (data: TravelRequestData) => void;
  getLimitForCategory: (zoneId: string, category: string) => number;
  getTotalLimitForCategory: (zoneId: string, category: string) => number;
  calculateTripDays: () => number;
  calculateHotelNights: () => number;
  calculateRecommendedExpenses: () => ExpenseData;
  validateExpenses: (zoneId: string, expenses: ExpenseData) => string[];
}

const EXPENSE_CATEGORIES = [
  { key: 'hospedaje', label: 'Hospedaje', description: 'Hotel, hostal, o alojamiento' },
  { key: 'alimentos', label: 'Alimentos', description: 'Comidas y bebidas' },
  { key: 'lavanderia', label: 'Lavandería', description: 'Servicios de lavandería' },
  { key: 'transporte', label: 'Transporte', description: 'Taxi, metro, autobús, etc.' }
];

export const ExpensesStep = ({ 
  formData, 
  setFormData, 
  getLimitForCategory, 
  getTotalLimitForCategory, 
  calculateTripDays, 
  calculateHotelNights,
  calculateRecommendedExpenses, 
  validateExpenses 
}: ExpensesStepProps) => {
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
  const tripDays = calculateTripDays();
  const hotelNights = calculateHotelNights();
  const recommendedExpenses = calculateRecommendedExpenses();
  
  const handleAutoFill = () => {
    setFormData({
      ...formData,
      expenses: recommendedExpenses
    });
  };

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
      {/* Trip calculation info and auto-fill */}
      {formData.zone_id && tripDays > 0 && (
        <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <h4 className="font-semibold text-primary">
                Cálculo automático para {tripDays} día{tripDays > 1 ? 's' : ''} ({hotelNights} noche{hotelNights !== 1 ? 's' : ''} de hotel)
              </h4>
            </div>
            <Button 
              onClick={handleAutoFill}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              Usar valores recomendados
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {EXPENSE_CATEGORIES.map((category) => {
              const dailyLimit = getLimitForCategory(formData.zone_id, category.key);
              const recommendedTotal = recommendedExpenses[category.key as keyof ExpenseData];
              return (
                <div key={category.key} className="text-center">
                  <div className="font-medium text-primary">{category.label}</div>
                  <div className="text-muted-foreground">
                    ${dailyLimit.toLocaleString()}/{category.key === 'hospedaje' ? 'noche' : 'día'}
                  </div>
                  <div className="font-semibold text-primary">
                    Total: ${recommendedTotal.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {EXPENSE_CATEGORIES.map((category) => {
          const dailyLimit = getLimitForCategory(formData.zone_id, category.key);
          const totalLimit = getTotalLimitForCategory(formData.zone_id, category.key);
          const currentAmount = formData.expenses[category.key as keyof ExpenseData];
          const isOverLimit = currentAmount > totalLimit;

          return (
            <div key={category.key} className="space-y-2">
              <Label htmlFor={category.key} className="flex items-center justify-between">
                <span>{category.label}</span>
                <span className="text-sm text-muted-foreground">
                  {tripDays > 0 ? (
                    category.key === 'hospedaje' 
                      ? `${dailyLimit.toLocaleString()}/noche × ${hotelNights} = $${totalLimit.toLocaleString()}`
                      : `${dailyLimit.toLocaleString()}/día × ${tripDays} = $${totalLimit.toLocaleString()}`
                  ) : (
                    category.key === 'hospedaje'
                      ? `Límite por noche: $${dailyLimit.toLocaleString()}`
                      : `Límite diario: $${dailyLimit.toLocaleString()}`
                  )}
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
                  Excede el límite total por ${(currentAmount - totalLimit).toLocaleString()}
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
      <div className="bg-muted/50 p-4 rounded-lg">
        <h4 className="font-semibold text-foreground mb-3">
          Límites diarios para {formData.zone_id === 'zona-a' ? 'Zona A' : 'Zona B'}:
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {EXPENSE_CATEGORIES.map((category) => {
            const dailyLimit = getLimitForCategory(formData.zone_id, category.key);
            const totalLimit = getTotalLimitForCategory(formData.zone_id, category.key);
            return (
              <div key={category.key} className="text-center">
                <div className="font-medium">{category.label}</div>
                <div className="text-muted-foreground">
                  ${dailyLimit.toLocaleString()}/{category.key === 'hospedaje' ? 'noche' : 'día'}
                </div>
                {tripDays > 0 && (
                  <div className="font-semibold text-primary">
                    Total: ${totalLimit.toLocaleString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};