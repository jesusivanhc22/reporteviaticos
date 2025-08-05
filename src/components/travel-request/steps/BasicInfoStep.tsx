import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TravelRequestData, Zone } from '@/hooks/useTravelRequestForm';

interface BasicInfoStepProps {
  formData: TravelRequestData;
  setFormData: (data: TravelRequestData) => void;
  zones: Zone[];
}

export const BasicInfoStep = ({ formData, setFormData, zones }: BasicInfoStepProps) => {
  const updateFormData = (field: keyof TravelRequestData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

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
          <Label htmlFor="destination">Destino *</Label>
          <Input
            id="destination"
            value={formData.destination}
            onChange={(e) => updateFormData('destination', e.target.value)}
            placeholder="Ej: Ciudad de México, CDMX"
            className="border-primary/20 focus:border-primary"
          />
        </div>

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

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="zone">Zona de viaje *</Label>
          <Select value={formData.zone_id} onValueChange={(value) => updateFormData('zone_id', value)}>
            <SelectTrigger className="border-primary/20 focus:border-primary">
              <SelectValue placeholder="Seleccione una zona" />
            </SelectTrigger>
            <SelectContent>
              {zones.map((zone) => (
                <SelectItem key={zone.id} value={zone.id}>
                  <div>
                    <div className="font-medium">{zone.name}</div>
                    <div className="text-sm text-muted-foreground">{zone.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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