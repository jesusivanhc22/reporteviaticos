import { XMLUploader } from '@/components/XMLUploader';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Reporte de viáticos
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            </p>
          </div>
          
          <XMLUploader />
        </div>
      </div>
    </div>
  );
};

export default Index;
