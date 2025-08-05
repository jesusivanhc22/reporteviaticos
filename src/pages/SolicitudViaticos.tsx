import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';

const SolicitudViaticos = () => {
  const navigate = useNavigate();

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

          {/* Coming Soon Card */}
          <Card className="shadow-elegant border-0 bg-gradient-to-br from-card to-card/90">
            <CardHeader className="pb-4 bg-gradient-to-r from-primary to-secondary text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Construction className="w-6 h-6" />
                Próximamente disponible
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <Construction className="w-24 h-24 text-primary mx-auto mb-4 opacity-50" />
                <h3 className="text-2xl font-semibold text-primary mb-4">
                  Funcionalidad en desarrollo
                </h3>
                <p className="text-muted-foreground text-lg">
                  Estamos trabajando en esta funcionalidad para permitirte crear y gestionar 
                  solicitudes de viáticos de manera eficiente.
                </p>
              </div>
              
              <div className="space-y-4 text-left max-w-md mx-auto">
                <h4 className="font-semibold text-primary">Características que incluirá:</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Formulario de solicitud de viáticos</li>
                  <li>• Carga de documentos de respaldo</li>
                  <li>• Seguimiento de estado de solicitudes</li>
                  <li>• Aprobaciones y rechazos</li>
                  <li>• Historial de solicitudes</li>
                </ul>
              </div>

              <div className="mt-8">
                <Button 
                  onClick={() => navigate('/')}
                  className="bg-gradient-to-r from-primary to-secondary text-white hover:from-primary/90 hover:to-secondary/90"
                >
                  Volver al menú principal
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SolicitudViaticos;