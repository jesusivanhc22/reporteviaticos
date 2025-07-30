import { XMLUploader } from '@/components/XMLUploader';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
              Extractor de RFC y UUID
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Sube tus archivos XML de facturas electrónicas para extraer automáticamente 
              los datos de RFC y UUID de manera rápida y segura.
            </p>
          </div>
          
          <XMLUploader />
        </div>
      </div>
    </div>
  );
};

export default Index;
