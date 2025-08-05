import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { TravelRequestsList } from '@/components/travel-request/TravelRequestsList';
import { TravelRequestForm } from '@/components/travel-request/TravelRequestForm';

const SolicitudViaticos = () => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);

  const handleCreateNew = () => {
    setShowForm(true);
  };

  const handleFormBack = () => {
    setShowForm(false);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
  };

  if (showForm) {
    return (
      <TravelRequestForm 
        onBack={handleFormBack}
        onSuccess={handleFormSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
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

          {/* Travel Requests List */}
          <TravelRequestsList onCreateNew={handleCreateNew} />
        </div>
      </div>
    </div>
  );
};

export default SolicitudViaticos;