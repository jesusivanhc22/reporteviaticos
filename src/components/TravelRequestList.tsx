import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Eye, 
  Edit, 
  Trash2, 
  MapPin, 
  CalendarDays, 
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TravelRequest {
  id: string;
  title: string;
  description: string | null;
  destination: string;
  start_date: string;
  end_date: string;
  estimated_amount: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'completed';
  created_at: string;
}

interface TravelRequestListProps {
  onEdit?: (request: TravelRequest) => void;
  refreshTrigger?: number;
}

export const TravelRequestList = ({ onEdit, refreshTrigger }: TravelRequestListProps) => {
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const statusConfig = {
    draft: { 
      label: 'Borrador', 
      icon: Clock, 
      variant: 'secondary' as const,
      color: 'text-muted-foreground'
    },
    pending: { 
      label: 'Pendiente', 
      icon: AlertCircle, 
      variant: 'default' as const,
      color: 'text-primary'
    },
    approved: { 
      label: 'Aprobado', 
      icon: CheckCircle, 
      variant: 'default' as const,
      color: 'text-green-600'
    },
    rejected: { 
      label: 'Rechazado', 
      icon: XCircle, 
      variant: 'destructive' as const,
      color: 'text-destructive'
    },
    completed: { 
      label: 'Completado', 
      icon: CheckCircle, 
      variant: 'default' as const,
      color: 'text-green-600'
    },
  };

  const fetchRequests = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('travel_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching travel requests:', error);
      toast({
        title: "Error",
        description: "Error al cargar las solicitudes de viáticos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRequest = async (id: string) => {
    try {
      const { error } = await supabase
        .from('travel_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: "Solicitud eliminada correctamente",
      });

      fetchRequests();
    } catch (error) {
      console.error('Error deleting travel request:', error);
      toast({
        title: "Error",
        description: "Error al eliminar la solicitud",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user, refreshTrigger]);

  if (isLoading) {
    return (
      <Card className="shadow-elegant border-0 bg-gradient-to-br from-card to-card/90">
        <CardContent className="p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4 mx-auto"></div>
            <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
            <div className="h-4 bg-muted rounded w-1/3 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-elegant border-0 bg-gradient-to-br from-card to-card/90">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <MapPin className="w-6 h-6 text-primary" />
          Mis solicitudes de viáticos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              No hay solicitudes de viáticos
            </h3>
            <p className="text-muted-foreground">
              Crea tu primera solicitud para comenzar
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Fechas</TableHead>
                  <TableHead>Monto estimado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => {
                  const statusInfo = statusConfig[request.status];
                  const StatusIcon = statusInfo.icon;

                  return (
                    <TableRow key={request.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.title}</div>
                          {request.description && (
                            <div className="text-sm text-muted-foreground">
                              {request.description.substring(0, 50)}
                              {request.description.length > 50 && '...'}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          {request.destination}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-4 h-4 text-primary" />
                          <div>
                            <div className="text-sm">
                              {format(new Date(request.start_date), 'dd/MM/yyyy', { locale: es })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              hasta {format(new Date(request.end_date), 'dd/MM/yyyy', { locale: es })}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-primary" />
                          ${request.estimated_amount.toLocaleString('es-MX', { 
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2 
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant} className="flex items-center gap-1 w-fit">
                          <StatusIcon className={`w-3 h-3 ${statusInfo.color}`} />
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit?.(request)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {request.status === 'draft' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEdit?.(request)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteRequest(request.id)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};