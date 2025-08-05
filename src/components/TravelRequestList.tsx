import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MapPin, Calendar, DollarSign, FileText, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface TravelRequest {
  id: string;
  title: string;
  destination: string;
  description: string | null;
  start_date: string;
  end_date: string;
  estimated_amount: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'completed';
  created_at: string;
}

interface TravelRequestListProps {
  refreshTrigger?: number;
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800 border-gray-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  completed: 'bg-blue-100 text-blue-800 border-blue-200',
};

const statusLabels = {
  draft: 'Borrador',
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  completed: 'Completada',
};

export const TravelRequestList = ({ refreshTrigger }: TravelRequestListProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    if (!user) return;

    try {
      setLoading(true);
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
        title: 'Error',
        description: 'No se pudieron cargar las solicitudes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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
        title: 'Solicitud eliminada',
        description: 'La solicitud ha sido eliminada exitosamente',
      });

      fetchRequests();
    } catch (error) {
      console.error('Error deleting travel request:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la solicitud',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user, refreshTrigger]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="shadow-elegant border-0 bg-gradient-to-br from-card to-card/90">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-muted rounded w-1/3"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card className="shadow-elegant border-0 bg-gradient-to-br from-card to-card/90">
        <CardContent className="p-8 text-center">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            No hay solicitudes de viáticos
          </h3>
          <p className="text-muted-foreground">
            Crea tu primera solicitud usando la pestaña "Nueva solicitud"
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id} className="shadow-elegant border-0 bg-gradient-to-br from-card to-card/90 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-xl">{request.title}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {request.destination}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(request.start_date), 'dd MMM', { locale: es })} - {format(new Date(request.end_date), 'dd MMM yyyy', { locale: es })}
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    ${request.estimated_amount.toLocaleString('es-MX')} MXN
                  </div>
                </div>
              </div>
              <Badge 
                variant="secondary" 
                className={statusColors[request.status]}
              >
                {statusLabels[request.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {request.description && (
              <p className="text-muted-foreground mb-4 text-sm">{request.description}</p>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Creada el {format(new Date(request.created_at), 'dd/MM/yyyy', { locale: es })}
              </span>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/reporte-viaticos?request=${request.id}`)}
                  className="hover:bg-primary hover:text-white"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Ver reportes
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="hover:bg-destructive hover:text-white border-destructive text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Eliminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar solicitud?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Se eliminará permanentemente la solicitud "{request.title}" y todos sus gastos asociados.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteRequest(request.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};