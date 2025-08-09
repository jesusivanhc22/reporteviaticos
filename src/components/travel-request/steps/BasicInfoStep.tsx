import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TravelRequestData, MexicanState, RequestType, ServiceType, Collaborator } from '@/hooks/useTravelRequestForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface BasicInfoStepProps {
  formData: TravelRequestData;
  setFormData: (data: TravelRequestData) => void;
  mexicanStates: MexicanState[];
  calculateTripDays: () => number;
  getZoneForState: (stateName: string) => string;
  getDisplayZone: (stateName: string) => string;
  requestTypes: RequestType[];
  serviceTypes: ServiceType[];
  availableCollaborators: Collaborator[];
}

export const BasicInfoStep = ({ 
  formData, 
  setFormData, 
  mexicanStates, 
  calculateTripDays,
  getZoneForState,
  getDisplayZone,
  requestTypes,
  serviceTypes,
  availableCollaborators
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
  const selectedRequestType = requestTypes.find((t) => t.id === formData.request_type_id);
  const isImplementacion = selectedRequestType?.name?.toLowerCase() === 'implementación' || selectedRequestType?.name?.toLowerCase() === 'implementacion';

  const selectedCollaborators = availableCollaborators.filter(c => (formData.collaborators || []).includes(c.id));
  const collCount = selectedCollaborators.length;
  const canShareWhenTwo = collCount === 2 && selectedCollaborators[0]?.gender === selectedCollaborators[1]?.gender && selectedCollaborators[0]?.gender !== 'other';

  const toggleCollaborator = (id: string, checked: boolean) => {
    const current = new Set(formData.collaborators || []);
    if (checked) current.add(id); else current.delete(id);
    const nextArr = Array.from(current);

    // default room calculation
    let nextRooms: number | null = null;
    if (nextArr.length === 2) {
      const sel = availableCollaborators.filter(c => nextArr.includes(c.id));
      nextRooms = 2; // default to 2; user can change to 1 if allowed
      const sameGender = sel[0]?.gender && sel[0]?.gender === sel[1]?.gender && sel[0]?.gender !== 'other';
      if (sameGender) {
        // keep 2 by default; switch lets choose 1
        nextRooms = 2;
      }
    } else if (nextArr.length > 2) {
      nextRooms = Math.ceil(nextArr.length / 2);
    }

    setFormData({
      ...formData,
      collaborators: nextArr,
      number_of_rooms: nextArr.length <= 1 ? null : nextRooms,
    });
  };

  const handleRoomsChange = (val: number) => {
    setFormData({ ...formData, number_of_rooms: val });
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

        {isImplementacion && (
          <div className="space-y-2">
            <Label htmlFor="service_type">Tipo de servicio (opcional)</Label>
            <Select value={formData.service_type_id} onValueChange={(val) => updateFormData('service_type_id', val)}>
              <SelectTrigger className="border-primary/20 focus:border-primary">
                <SelectValue placeholder="Seleccione un tipo de servicio" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border z-50">
                {serviceTypes.map((stype) => {
                  const raw = stype.name || '';
                  const lower = raw.toLowerCase();
                  const baseName = lower.includes('full') ? 'Full' : lower.includes('standard') ? 'Standard' : raw.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, '').trim();
                  const limit = baseName === 'Full' ? '$250,000.00' : baseName === 'Standard' ? '$150,000.00' : undefined;
                  return (
                    <SelectItem key={stype.id} value={stype.id}>
                      <div className="flex justify-between items-center w-full">
                        <span>{baseName}</span>
                        {limit && (
                          <span className="text-xs text-muted-foreground ml-2">
                            Límite de viáticos: {limit}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
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

        {/* Colaboradores */}
        <div className="space-y-2 md:col-span-2">
          <Label>Colaboradores</Label>
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-primary/20">
                  {selectedCollaborators.length ? `${selectedCollaborators.length} seleccionado(s)` : 'Seleccione colaboradores'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-background border border-border z-50 max-h-64 overflow-auto">
                {availableCollaborators.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={!!formData.collaborators?.includes(col.id)}
                    onCheckedChange={(v) => toggleCollaborator(col.id, Boolean(v))}
                  >
                    {col.full_name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {selectedCollaborators.map((c) => (
              <Badge key={c.id} variant="secondary">{c.full_name}</Badge>
            ))}
          </div>
        </div>

        {/* Número de habitaciones */}
        {collCount > 1 && (
          <div className="space-y-2 md:col-span-2">
            <Label>No. de habitaciones</Label>
            {collCount === 2 ? (
              canShareWhenTwo ? (
                <div className="flex items-center gap-3">
                  <Switch
                    id="share-room"
                    checked={formData.number_of_rooms === 1}
                    onCheckedChange={(v) => handleRoomsChange(v ? 1 : 2)}
                  />
                  <Label htmlFor="share-room" className="text-sm cursor-pointer">Comparten habitación</Label>
                  <div className="text-sm text-muted-foreground">Si no comparten, se asignan 2 habitaciones.</div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Input type="number" value={2} readOnly className="w-32" />
                  <div className="text-sm text-muted-foreground">Género mixto u otro: se requieren 2 habitaciones.</div>
                </div>
              )
            ) : (
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={Math.ceil(collCount / 2)}
                  max={collCount}
                  value={formData.number_of_rooms ?? Math.ceil(collCount / 2)}
                  onChange={(e) => {
                    const v = Math.max(Math.ceil(collCount / 2), Math.min(collCount, Number(e.target.value) || 0));
                    handleRoomsChange(v);
                  }}
                  className="w-32"
                />
                <div className="text-sm text-muted-foreground">Capacidad máxima 2 por habitación.</div>
              </div>
            )}
          </div>
        )}

        {/* Descripción */}
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