import { XMLUploader } from '@/components/XMLUploader';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const ReporteViaticos = () => {
  const navigate = useNavigate();

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
              Procesa tus facturas XML para generar reportes detallados
            </p>
          </div>
          
          <XMLUploader />
        </div>
      </div>
    </div>
  );
};

export default ReporteViaticos;
