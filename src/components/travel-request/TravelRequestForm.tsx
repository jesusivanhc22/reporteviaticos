import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Save, Send } from 'lucide-react';
import { useTravelRequestForm } from '@/hooks/useTravelRequestForm';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { ExpensesStep } from './steps/ExpensesStep';
import { ReviewStep } from './steps/ReviewStep';

const STEPS = [
  { id: 1, title: 'Información básica', description: 'Datos del viaje' },
  { id: 2, title: 'Gastos estimados', description: 'Desglose por categoría' },
  { id: 3, title: 'Revisión', description: 'Confirmar y enviar' }
];

interface TravelRequestFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const TravelRequestForm = ({ onBack, onSuccess }: TravelRequestFormProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const {
    formData,
    setFormData,
    zones,
    mexicanStates,
    requestTypes,
    serviceTypes,
    loading,
    getLimitForCategory,
    getTotalLimitForCategory,
    calculateTripDays,
    calculateRecommendedExpenses,
    getTotalEstimatedAmount,
    validateExpenses,
    submitTravelRequest,
    getZoneForState,
    getDisplayZone,
  } = useTravelRequestForm();

  const progress = (currentStep / STEPS.length) * 100;

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.title && formData.destination && formData.start_date && 
                 formData.end_date && formData.zone_id && formData.request_type_id);
      case 2:
        return true; // Always can proceed from expenses step
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceedFromStep(currentStep) && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraft = async () => {
    const success = await submitTravelRequest(true);
    if (success) {
      onSuccess();
    }
  };

  const handleSubmit = async () => {
    const success = await submitTravelRequest(false);
    if (success) {
      onSuccess();
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInfoStep
            formData={formData}
            setFormData={setFormData}
            mexicanStates={mexicanStates}
            calculateTripDays={calculateTripDays}
            getZoneForState={getZoneForState}
            getDisplayZone={getDisplayZone}
            requestTypes={requestTypes}
            serviceTypes={serviceTypes}
          />
        );
      case 2:
        return (
          <ExpensesStep
            formData={formData}
            setFormData={setFormData}
            getLimitForCategory={getLimitForCategory}
            getTotalLimitForCategory={getTotalLimitForCategory}
            calculateTripDays={calculateTripDays}
            calculateRecommendedExpenses={calculateRecommendedExpenses}
            validateExpenses={validateExpenses}
          />
        );
      case 3:
        return (
          <ReviewStep
            formData={formData}
            zones={zones}
            requestTypes={requestTypes}
            serviceTypes={serviceTypes}
            getLimitForCategory={getLimitForCategory}
            getTotalEstimatedAmount={getTotalEstimatedAmount}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="outline" 
              onClick={onBack}
              className="border-primary text-primary hover:bg-primary hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Nueva solicitud de viáticos
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Complete los siguientes pasos para crear su solicitud
            </p>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              {STEPS.map((step) => (
                <div key={step.id} className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 border-2 ${
                    currentStep >= step.id 
                      ? 'bg-primary text-white border-primary' 
                      : 'bg-background text-muted-foreground border-muted'
                  }`}>
                    {step.id}
                  </div>
                  <div className="text-center">
                    <div className={`font-medium ${currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'}`}>
                      {step.title}
                    </div>
                    <div className="text-sm text-muted-foreground">{step.description}</div>
                  </div>
                </div>
              ))}
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Form Content */}
          <Card className="shadow-elegant border-0 bg-gradient-to-br from-card to-card/90 mb-8">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">
                {STEPS[currentStep - 1].title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {renderStep()}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <div>
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="border-primary text-primary hover:bg-primary hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Anterior
                </Button>
              )}
            </div>

            <div className="flex gap-4">
              {currentStep === STEPS.length ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={loading}
                    className="border-secondary text-secondary hover:bg-secondary hover:text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Guardar borrador
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-gradient-to-r from-primary to-secondary text-white hover:from-primary/90 hover:to-secondary/90"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Enviar solicitud
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!canProceedFromStep(currentStep)}
                  className="bg-gradient-to-r from-primary to-secondary text-white hover:from-primary/90 hover:to-secondary/90"
                >
                  Siguiente
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};