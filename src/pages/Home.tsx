import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { FileText, PlusCircle, Receipt } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  const menuOptions = [
    {
      id: 1,
      title: "Solicitud de viáticos",
      description: "Crear nueva solicitud de gastos de viaje",
      icon: PlusCircle,
      action: () => navigate('/solicitud-viaticos'),
      color: "from-primary to-secondary"
    },
    {
      id: 2,
      title: "Reporte de viáticos",
      description: "Procesar facturas XML y generar reportes",
      icon: Receipt,
      action: () => navigate('/reporte-viaticos'),
      color: "from-secondary to-accent"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Sistema de Viáticos
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Gestiona tus solicitudes y reportes de gastos de viaje de manera eficiente
            </p>
          </div>

          {/* Menu Options */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {menuOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <Card 
                  key={option.id}
                  className="shadow-elegant border-0 bg-gradient-to-br from-card to-card/90 hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer group"
                  onClick={option.action}
                >
                  <CardHeader className={`pb-4 bg-gradient-to-r ${option.color} text-white rounded-t-lg`}>
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <IconComponent className="w-8 h-8" />
                      {option.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8">
                    <p className="text-muted-foreground text-lg mb-6">
                      {option.description}
                    </p>
                    <Button 
                      className="w-full bg-gradient-to-r from-primary to-secondary text-white hover:from-primary/90 hover:to-secondary/90 shadow-lg transition-all duration-300 hover:shadow-xl group-hover:scale-105"
                      size="lg"
                    >
                      <IconComponent className="w-5 h-5 mr-2" />
                      Acceder
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Additional Info */}
          <div className="mt-16 text-center">
            <Card className="shadow-elegant border-0 bg-gradient-to-r from-primary/5 to-secondary/5 max-w-2xl mx-auto">
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <FileText className="w-6 h-6 text-primary" />
                  <h3 className="text-lg font-semibold text-primary">Sistema Integrado</h3>
                </div>
                <p className="text-muted-foreground">
                  Plataforma completa para la gestión de viáticos empresariales con 
                  procesamiento automático de facturas XML y generación de reportes detallados.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;