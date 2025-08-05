import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, MapPin, DollarSign, Building2 } from 'lucide-react';
import { TravelRequestData, Zone } from '@/hooks/useTravelRequestForm';

interface ReviewStepProps {
  formData: TravelRequestData;
  zones: Zone[];
  getLimitForCategory: (zoneId: string, category: string) => number;
  getTotalEstimatedAmount: () => number;
}

const EXPENSE_CATEGORIES = [
  { key: 'hospedaje', label: 'Hospedaje', icon: Building2 },
  { key: 'alimentos', label: 'Alimentos', icon: DollarSign },
  { key: 'lavanderia', label: 'Lavandería', icon: DollarSign },
  { key: 'transporte', label: 'Transporte', icon: DollarSign }
];

export const ReviewStep = ({ formData, zones, getLimitForCategory, getTotalEstimatedAmount }: ReviewStepProps) => {
  const selectedZone = zones.find(zone => zone.id === formData.zone_id);
  const totalAmount = getTotalEstimatedAmount();

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysDifference = () => {
    if (!formData.start_date || !formData.end_date) return 0;
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Include both start and end dates
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Información del viaje
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-primary mb-2">Título:</h4>
            <p className="text-muted-foreground">{formData.title || 'Sin título'}</p>
          </div>
          
          <div>
            <h4 className="font-semibold text-primary mb-2">Destino:</h4>
            <p className="text-muted-foreground">{formData.destination || 'Sin destino'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Fechas:
              </h4>
              <p className="text-muted-foreground">
                <strong>Inicio:</strong> {formatDate(formData.start_date)}
              </p>
              <p className="text-muted-foreground">
                <strong>Fin:</strong> {formatDate(formData.end_date)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Duración: {getDaysDifference()} días
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-primary mb-2">Zona:</h4>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedZone?.name || 'Sin zona'}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedZone?.description}
              </p>
            </div>
          </div>

          {formData.description && (
            <div>
              <h4 className="font-semibold text-primary mb-2">Descripción:</h4>
              <p className="text-muted-foreground">{formData.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expenses Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Desglose de gastos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {EXPENSE_CATEGORIES.map((category) => {
              const amount = formData.expenses[category.key as keyof typeof formData.expenses];
              const limit = formData.zone_id ? getLimitForCategory(formData.zone_id, category.key) : 0;
              const isOverLimit = amount > limit;

              return (
                <div key={category.key} className="flex justify-between items-center py-2">
                  <div className="flex items-center gap-3">
                    <category.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{category.label}</span>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${isOverLimit ? 'text-destructive' : 'text-foreground'}`}>
                      ${amount.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Límite: ${limit.toLocaleString()}
                    </div>
                    {isOverLimit && (
                      <div className="text-xs text-destructive">
                        Excede por ${(amount - limit).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            <Separator />
            
            <div className="flex justify-between items-center py-2 bg-primary/5 px-4 rounded-lg">
              <span className="text-lg font-bold text-primary">Total estimado:</span>
              <span className="text-2xl font-bold text-primary">
                ${totalAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Alert */}
      <div className="bg-muted/50 p-6 rounded-lg border border-primary/20">
        <h4 className="font-semibold text-primary mb-3">Resumen de la solicitud:</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Viaje a:</span>
            <span className="font-medium">{formData.destination}</span>
          </div>
          <div className="flex justify-between">
            <span>Duración:</span>
            <span className="font-medium">{getDaysDifference()} días</span>
          </div>
          <div className="flex justify-between">
            <span>Zona:</span>
            <span className="font-medium">{selectedZone?.name}</span>
          </div>
          <div className="flex justify-between">
            <span>Total solicitado:</span>
            <span className="font-bold text-primary">${totalAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};