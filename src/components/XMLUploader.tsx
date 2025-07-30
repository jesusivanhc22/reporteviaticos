import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface XMLData {
  rfc?: string;
  uuid?: string;
  emisorRfc?: string;
  receptorRfc?: string;
  fileName: string;
}

export const XMLUploader = () => {
  const [xmlData, setXmlData] = useState<XMLData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const parseXML = (xmlString: string, fileName: string): XMLData => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
    // Buscar RFC y UUID en diferentes posibles ubicaciones del XML
    let rfc = '';
    let uuid = '';
    let emisorRfc = '';
    let receptorRfc = '';

    // Buscar UUID (TimbreFiscalDigital o atributo UUID)
    const timbreFiscal = xmlDoc.querySelector('TimbreFiscalDigital');
    if (timbreFiscal) {
      uuid = timbreFiscal.getAttribute('UUID') || '';
    }
    
    // También buscar en el nodo raíz
    const comprobante = xmlDoc.querySelector('Comprobante');
    if (comprobante && !uuid) {
      uuid = comprobante.getAttribute('UUID') || '';
    }

    // Buscar RFC del emisor
    const emisor = xmlDoc.querySelector('Emisor');
    if (emisor) {
      emisorRfc = emisor.getAttribute('Rfc') || emisor.getAttribute('rfc') || '';
      rfc = emisorRfc; // Por defecto, usar el RFC del emisor
    }

    // Buscar RFC del receptor
    const receptor = xmlDoc.querySelector('Receptor');
    if (receptor) {
      receptorRfc = receptor.getAttribute('Rfc') || receptor.getAttribute('rfc') || '';
    }

    return {
      rfc,
      uuid,
      emisorRfc,
      receptorRfc,
      fileName
    };
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    const newXmlData: XMLData[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.name.toLowerCase().endsWith('.xml')) {
        toast({
          title: "Error",
          description: `${file.name} no es un archivo XML válido`,
          variant: "destructive",
        });
        continue;
      }

      try {
        const text = await file.text();
        const data = parseXML(text, file.name);
        newXmlData.push(data);
      } catch (error) {
        toast({
          title: "Error",
          description: `Error al procesar ${file.name}`,
          variant: "destructive",
        });
      }
    }

    setXmlData(prev => [...prev, ...newXmlData]);
    setIsLoading(false);

    if (newXmlData.length > 0) {
      toast({
        title: "Éxito",
        description: `Se procesaron ${newXmlData.length} archivo(s) XML correctamente`,
      });
    }
  }, [toast]);

  const clearData = () => {
    setXmlData([]);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0" style={{ boxShadow: 'var(--shadow-elegant)' }}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <FileText className="w-5 h-5 text-primary" />
            Subir Archivos XML
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Click para subir</span> o arrastra archivos XML
                </p>
                <p className="text-xs text-muted-foreground">XML (facturas electrónicas)</p>
              </div>
              <Input
                type="file"
                accept=".xml"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                disabled={isLoading}
              />
            </label>
          </div>
          
          {xmlData.length > 0 && (
            <div className="flex justify-between items-center">
              <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                {xmlData.length} archivo(s) procesado(s)
              </Badge>
              <Button variant="outline" size="sm" onClick={clearData}>
                Limpiar todo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {xmlData.length > 0 && (
        <Card className="shadow-lg border-0" style={{ boxShadow: 'var(--shadow-elegant)' }}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <CheckCircle className="w-5 h-5 text-success" />
              Datos Extraídos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {xmlData.map((data, index) => (
                <div key={index} className="p-4 bg-muted/30 rounded-lg border border-muted-foreground/10">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm text-foreground">{data.fileName}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">RFC Emisor</label>
                      <div className="flex items-center gap-2 mt-1">
                        {data.emisorRfc ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-success" />
                            <span className="font-mono text-sm bg-background px-2 py-1 rounded border">
                              {data.emisorRfc}
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-destructive" />
                            <span className="text-sm text-muted-foreground">No encontrado</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">RFC Receptor</label>
                      <div className="flex items-center gap-2 mt-1">
                        {data.receptorRfc ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-success" />
                            <span className="font-mono text-sm bg-background px-2 py-1 rounded border">
                              {data.receptorRfc}
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-destructive" />
                            <span className="text-sm text-muted-foreground">No encontrado</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">UUID</label>
                      <div className="flex items-center gap-2 mt-1">
                        {data.uuid ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-success" />
                            <span className="font-mono text-sm bg-background px-2 py-1 rounded border break-all">
                              {data.uuid}
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-destructive" />
                            <span className="text-sm text-muted-foreground">No encontrado</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};