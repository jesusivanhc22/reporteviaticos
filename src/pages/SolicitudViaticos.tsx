import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { TravelRequestForm } from '@/components/TravelRequestForm';
import { TravelRequestList } from '@/components/TravelRequestList';
import { ArrowLeft, Plus, List } from 'lucide-react';

const SolicitudViaticos = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleFormSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

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
            Debes iniciar sesión para acceder a las solicitudes de viáticos
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
          {/* Header */}
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
              Solicitud de viáticos
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Crea y gestiona tus solicitudes de gastos de viaje
            </p>
          </div>

          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8">
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="w-4 h-4" />
                Mis solicitudes
              </TabsTrigger>
              <TabsTrigger value="create" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nueva solicitud
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-6">
              <TravelRequestList refreshTrigger={refreshTrigger} />
            </TabsContent>

            <TabsContent value="create" className="space-y-6">
              <TravelRequestForm onSuccess={handleFormSuccess} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default SolicitudViaticos;