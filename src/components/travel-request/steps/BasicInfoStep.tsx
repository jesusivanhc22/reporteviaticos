import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TravelRequestData, MexicanState, RequestType, ServiceType } from '@/hooks/useTravelRequestForm';

interface BasicInfoStepProps {
  formData: TravelRequestData;
  setFormData: (data: TravelRequestData) => void;
  mexicanStates: MexicanState[];
  calculateTripDays: () => number;
  getZoneForState: (stateName: string) => string;
  getDisplayZone: (stateName: string) => string;
  requestTypes: RequestType[];
  serviceTypes: ServiceType[];
}

export const BasicInfoStep = ({ 
  formData, 
  setFormData, 
  mexicanStates, 
  calculateTripDays,
  getZoneForState,
  getDisplayZone 
  , requestTypes, serviceTypes
}: BasicInfoStepProps) => {
  const updateFormData = (field: keyof TravelRequestData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleStateChange = (stateName: string) => {
    const zoneId = getZoneForState(stateName);
    setFormData({ 
      ...formData, 
      destination: stateName,
      zone_id: zoneId 
    });
  };

  const handleRequestTypeChange = (requestTypeId: string) => {
    setFormData({
      ...formData,
      request_type_id: requestTypeId,
      service_type_id: '' // reset service type when request type changes
    });
  };

  const tripDays = calculateTripDays();
  const displayZone = formData.destination ? getDisplayZone(formData.destination) : '';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="title">Título de la solicitud *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => updateFormData('title', e.target.value)}
            placeholder="Ej: Viaje a conferencia en Ciudad de México"
            className="border-primary/20 focus:border-primary"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="destination">Estado destino *</Label>
          <Select value={formData.destination} onValueChange={handleStateChange}>
            <SelectTrigger className="border-primary/20 focus:border-primary">
              <SelectValue placeholder="Seleccione un estado" />
            </SelectTrigger>
            <SelectContent className="bg-background border border-border z-50">
              {mexicanStates.map((state) => (
                <SelectItem key={state.id} value={state.name}>
                  <div className="flex justify-between items-center w-full">
                    <span>{state.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">Zona {state.zone_type}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="request_type">Tipo de solicitud *</Label>
          <Select value={formData.request_type_id} onValueChange={handleRequestTypeChange}>
            <SelectTrigger className="border-primary/20 focus:border-primary">
              <SelectValue placeholder="Seleccione un tipo de solicitud" />
            </SelectTrigger>
            <SelectContent className="bg-background border border-border z-50">
              {requestTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  <div className="flex flex-col w-full">
                    <span>{type.name}</span>
                    {type.description && (
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formData.request_type_id && (
          <div className="space-y-2">
            <Label htmlFor="service_type">Tipo de servicio (opcional)</Label>
            <Select value={formData.service_type_id} onValueChange={(val) => updateFormData('service_type_id', val)}>
              <SelectTrigger className="border-primary/20 focus:border-primary">
                <SelectValue placeholder="Seleccione un tipo de servicio" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border z-50">
                {serviceTypes.map((stype) => (
                  <SelectItem key={stype.id} value={stype.id}>
                    <div className="flex justify-between items-center w-full">
                      <span>{stype.name}</span>
                      {typeof stype.daily_allowance === 'number' && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ${'{'}stype.daily_allowance.toLocaleString(){'}'} /día
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}


        <div className="space-y-2">
          <Label htmlFor="start_date">Fecha de inicio *</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => updateFormData('start_date', e.target.value)}
            className="border-primary/20 focus:border-primary"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_date">Fecha de fin *</Label>
          <Input
            id="end_date"
            type="date"
            value={formData.end_date}
            onChange={(e) => updateFormData('end_date', e.target.value)}
            min={formData.start_date}
            className="border-primary/20 focus:border-primary"
          />
        </div>

        {displayZone && (
          <div className="space-y-2">
            <Label>Zona asignada</Label>
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
              <span className="font-medium text-primary">{displayZone}</span>
            </div>
          </div>
        )}

        {tripDays > 0 && (
          <div className="space-y-2">
            <Label>Duración del viaje</Label>
            <div className="p-3 bg-muted/50 border border-border rounded-md">
              <span className="font-medium">{tripDays} día{tripDays !== 1 ? 's' : ''}</span>
            </div>
          </div>
        )}

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => updateFormData('description', e.target.value)}
            placeholder="Describa el propósito del viaje, actividades a realizar, etc."
            className="border-primary/20 focus:border-primary min-h-[100px]"
          />
        </div>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg">
        <h4 className="font-semibold text-primary mb-2">Información sobre las zonas:</h4>
        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Zona A:</strong> Ciudades con mayor costo de vida (CDMX, Monterrey, Guadalajara, etc.)</p>
          <p><strong>Zona B:</strong> Ciudades con costo de vida estándar (resto del país)</p>
        </div>
      </div>
    </div>
  );
};