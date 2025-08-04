import { useState, useEffect } from 'react';
import { XMLUploader } from '@/components/XMLUploader';
import { ExpenseForm } from '@/components/ExpenseForm';
import { ExpenseList } from '@/components/ExpenseList';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Upload, Receipt, FileText } from 'lucide-react';

interface TravelRequest {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
}

const ReporteViaticos = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [travelRequests, setTravelRequests] = useState<TravelRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleExpenseSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const fetchTravelRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('travel_requests')
        .select('id, title, destination, start_date, end_date')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTravelRequests(data || []);
      
      // Auto-select first request if available
      if (data && data.length > 0 && !selectedRequestId) {
        setSelectedRequestId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching travel requests:', error);
    }
  };

  useEffect(() => {
    fetchTravelRequests();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-muted rounded w-32 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <h2 className="text-2xl font-bold mb-4">Acceso requerido</h2>
          <p className="text-muted-foreground mb-6">
            Debes iniciar sesión para acceder a los reportes de viáticos
          </p>
          <Button onClick={() => navigate('/auth')} className="bg-gradient-to-r from-primary to-secondary">
            Iniciar sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Navigation */}
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="border-primary text-primary hover:bg-primary hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Button>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Reporte de viáticos
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Registra gastos y procesa facturas XML para generar reportes detallados
            </p>
          </div>

          {travelRequests.length === 0 ? (
            <Card className="shadow-elegant border-0 bg-gradient-to-br from-card to-card/90">
              <CardContent className="p-8 text-center">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  No hay solicitudes de viáticos
                </h3>
                <p className="text-muted-foreground mb-6">
                  Primero crea una solicitud de viáticos para poder registrar gastos
                </p>
                <Button 
                  onClick={() => navigate('/solicitud-viaticos')}
                  className="bg-gradient-to-r from-primary to-secondary text-white hover:from-primary/90 hover:to-secondary/90"
                >
                  Crear solicitud
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Travel Request Selector */}
              <Card className="shadow-elegant border-0 bg-gradient-to-br from-card to-card/90 mb-6">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <FileText className="w-5 h-5 text-primary" />
                    Seleccionar solicitud de viáticos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedRequestId} onValueChange={setSelectedRequestId}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecciona una solicitud de viáticos" />
                    </SelectTrigger>
                    <SelectContent>
                      {travelRequests.map((request) => (
                        <SelectItem key={request.id} value={request.id}>
                          {request.title} - {request.destination}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {selectedRequestId && (
                <Tabs defaultValue="expenses" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto mb-8">
                    <TabsTrigger value="expenses" className="flex items-center gap-2">
                      <Receipt className="w-4 h-4" />
                      Gastos
                    </TabsTrigger>
                    <TabsTrigger value="add-expense" className="flex items-center gap-2">
                      <Receipt className="w-4 h-4" />
                      Agregar
                    </TabsTrigger>
                    <TabsTrigger value="xml" className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      XML
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="expenses" className="space-y-6">
                    <ExpenseList 
                      travelRequestId={selectedRequestId} 
                      refreshTrigger={refreshTrigger} 
                    />
                  </TabsContent>

                  <TabsContent value="add-expense" className="space-y-6">
                    <ExpenseForm 
                      travelRequestId={selectedRequestId} 
                      onSuccess={handleExpenseSuccess} 
                    />
                  </TabsContent>

                  <TabsContent value="xml" className="space-y-6">
                    <XMLUploader />
                  </TabsContent>
                </Tabs>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReporteViaticos;
