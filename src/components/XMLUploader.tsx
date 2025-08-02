import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, CheckCircle, AlertCircle, Copy, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface XMLData {
  rfc?: string;
  uuid?: string;
  emisorRfc?: string;
  receptorRfc?: string;
  fecha?: string;
  subtotal?: string;
  impuestoIVA?: string;
  impuestoISH?: string;
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
    let fecha = '';
    let subtotal = '';
    let impuestoIVA = '';
    let impuestoISH = '';

    // Buscar UUID (TimbreFiscalDigital o atributo UUID)
    const timbreFiscal = xmlDoc.querySelector('TimbreFiscalDigital');
    if (timbreFiscal) {
      uuid = timbreFiscal.getAttribute('UUID') || '';
    }
    
    // También buscar en el nodo raíz
    const comprobante = xmlDoc.querySelector('Comprobante');
    if (comprobante) {
      if (!uuid) {
        uuid = comprobante.getAttribute('UUID') || '';
      }
      // Extraer fecha y subtotal del Comprobante
      fecha = comprobante.getAttribute('Fecha') || comprobante.getAttribute('fecha') || '';
      subtotal = comprobante.getAttribute('SubTotal') || comprobante.getAttribute('subtotal') || '';
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

    // ====== ENHANCED GENERIC ISH EXTRACTION WITH HIERARCHICAL SEARCH ======
    
    // Enhanced ISH value validation
    const isValidISHValue = (value: string): boolean => {
      const numericValue = parseFloat(value);
      return !isNaN(numericValue) && numericValue >= 10 && numericValue <= 1000;
    };

    // Enhanced IVA value validation
    const isValidIVAValue = (value: string): boolean => {
      const numericValue = parseFloat(value);
      return !isNaN(numericValue) && numericValue >= 100 && numericValue <= 10000;
    };

    // STEP 1: Identify IVA values first to avoid conflicts
    console.log('=== PASO 1: Identificando valores IVA ===');
    const traslados = xmlDoc.querySelectorAll('Traslado');
    traslados.forEach((traslado, index) => {
      const impuesto = traslado.getAttribute('Impuesto') || '';
      const importe = traslado.getAttribute('Importe') || traslado.getAttribute('Valor') || '';
      
      if (impuesto === '002' && importe && isValidIVAValue(importe)) {
        impuestoIVA = importe;
        console.log(`✅ IVA encontrado: ${importe} en Traslado ${index + 1}`);
      }
    });

    // STEP 2: Execute hierarchical ISH search
    console.log('=== PASO 2: Búsqueda jerárquica de ISH ===');
    
    const findISHValue = (): string => {
      const candidateValues: Array<{ 
        value: string; 
        context: string; 
        source: string; 
        priority: number;
      }> = [];
      
      const isNotIVAValue = (value: string): boolean => {
        return value !== impuestoIVA;
      };

      const logCandidate = (value: string, source: string, context: string, priority: number) => {
        const priorityLabel = priority >= 80 ? '🔥 ALTA' : 
                             priority >= 40 ? '📍 MEDIA' : 
                             priority >= 0 ? '📋 BAJA' : '❌ NEGATIVA';
        console.log(`${priorityLabel} (${priority}): ${value} | ${source} | ${context}`);
      };

      // PHASE 1: Search for explicit ISH fiscal structures (highest priority)
      console.log('--- FASE 1: Estructuras fiscales explícitas de ISH ---');
      
      // Look for implocal:ImpuestosLocales with ImpLocTraslado="ISH"
      const impuestosLocales = xmlDoc.querySelectorAll('ImpuestosLocales, implocal\\:ImpuestosLocales');
      impuestosLocales.forEach((impLocal, index) => {
        const traslados = impLocal.querySelectorAll('ImpLocTraslado, implocal\\:ImpLocTraslado');
        traslados.forEach((traslado) => {
          const tipoTraslado = traslado.getAttribute('ImpLocTraslado') || '';
          const importe = traslado.getAttribute('Importe') || '';
          
          if (tipoTraslado.toUpperCase() === 'ISH' && importe && isValidISHValue(importe) && isNotIVAValue(importe)) {
            candidateValues.push({
              value: importe,
              context: `ImpuestosLocales[${index}].ImpLocTraslado[ISH]`,
              source: 'Estructura fiscal explícita ISH',
              priority: 100
            });
            logCandidate(importe, 'Estructura fiscal explícita ISH', `ImpuestosLocales[${index}]`, 100);
          }
        });
      });

      // PHASE 2: Search by tax code 003 (ISH identifier)
      if (candidateValues.filter(c => c.priority >= 90).length === 0) {
        console.log('--- FASE 2: Código de impuesto 003 ---');
        
        traslados.forEach((traslado, index) => {
          const impuesto = traslado.getAttribute('Impuesto') || '';
          const importe = traslado.getAttribute('Importe') || traslado.getAttribute('Valor') || '';
          
          if (impuesto === '003' && importe && isValidISHValue(importe) && isNotIVAValue(importe)) {
            candidateValues.push({
              value: importe,
              context: `Traslado[${index}].Impuesto=003`,
              source: 'Código de impuesto 003',
              priority: 90
            });
            logCandidate(importe, 'Código de impuesto 003', `Traslado[${index}]`, 90);
          }
        });
      }

      // PHASE 3: Semantic context search
      if (candidateValues.filter(c => c.priority >= 70).length === 0) {
        console.log('--- FASE 3: Contexto semántico ---');
        
        const allElements = xmlDoc.querySelectorAll('*');
        allElements.forEach((element) => {
          const elementText = element.outerHTML.toLowerCase();
          let priority = 0;
          
          // Calculate semantic priority
          if (elementText.includes('impuestoslocales') || elementText.includes('implocal:')) priority += 80;
          if (elementText.includes('hospedaje')) priority += 70;
          if (elementText.includes('ish')) priority += 60;
          if (elementText.includes('turismo') || elementText.includes('tourism')) priority += 50;
          if (elementText.includes('hotel') || elementText.includes('alojamiento')) priority += 40;
          
          // Negative priority for IVA indicators
          if (elementText.includes('impuesto="002"') || elementText.includes("impuesto='002'")) priority -= 100;
          if (elementText.includes('iva') || elementText.includes('valor agregado')) priority -= 50;
          
          if (priority > 0) {
            Array.from(element.attributes || []).forEach((attr) => {
              if (isValidISHValue(attr.value) && isNotIVAValue(attr.value)) {
                candidateValues.push({
                  value: attr.value,
                  context: `${element.tagName}.${attr.name}`,
                  source: 'Contexto semántico',
                  priority: priority
                });
                logCandidate(attr.value, 'Contexto semántico', `${element.tagName}.${attr.name}`, priority);
              }
            });
          }
        });
      }

      // PHASE 4: Range-based fallback
      if (candidateValues.filter(c => c.priority >= 20).length === 0) {
        console.log('--- FASE 4: Búsqueda de respaldo ---');
        
        const allElements = xmlDoc.querySelectorAll('*');
        allElements.forEach((element) => {
          Array.from(element.attributes || []).forEach((attr) => {
            if (isValidISHValue(attr.value) && isNotIVAValue(attr.value)) {
              const numericValue = parseFloat(attr.value);
              const rangeScore = numericValue >= 50 && numericValue <= 400 ? 20 : 10;
              
              candidateValues.push({
                value: attr.value,
                context: `${element.tagName}.${attr.name}`,
                source: 'Búsqueda de respaldo',
                priority: rangeScore
              });
              logCandidate(attr.value, 'Búsqueda de respaldo', `${element.tagName}.${attr.name}`, rangeScore);
            }
          });
        });
      }

      // Select best candidate
      if (candidateValues.length > 0) {
        candidateValues.sort((a, b) => {
          if (a.priority !== b.priority) return b.priority - a.priority;
          
          // If same priority, prefer values closer to typical ISH range
          const aValue = parseFloat(a.value);
          const bValue = parseFloat(b.value);
          const aDist = Math.abs(aValue - 200);
          const bDist = Math.abs(bValue - 200);
          return aDist - bDist;
        });
        
        const bestCandidate = candidateValues[0];
        console.log(`✅ ISH SELECCIONADO: ${bestCandidate.value} (prioridad: ${bestCandidate.priority})`);
        console.log(`   Fuente: ${bestCandidate.source}`);
        console.log(`   Contexto: ${bestCandidate.context}`);
        
        return bestCandidate.value;
      }
      
      console.log('❌ No se encontró valor ISH válido');
      return '';
    };

    // Execute ISH search
    impuestoISH = findISHValue();

    // Final validation and conflict resolution
    if (impuestoISH && impuestoISH === impuestoIVA) {
      console.log('⚠️ CONFLICTO: ISH = IVA, limpiando ISH');
      impuestoISH = '';
    }
    
    console.log('=== RESULTADO FINAL ===');
    console.log(`IVA: ${impuestoIVA || 'NO ENCONTRADO'}`);
    console.log(`ISH: ${impuestoISH || 'NO ENCONTRADO'}`);

    return {
      rfc,
      uuid,
      emisorRfc,
      receptorRfc,
      fecha,
      subtotal,
      impuestoIVA,
      impuestoISH,
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "Texto copiado al portapapeles",
    });
  };

  const exportToExcel = () => {
    if (xmlData.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay datos para exportar",
        variant: "destructive",
      });
      return;
    }

    // Preparar los datos para Excel
    const excelData = xmlData.map((data, index) => ({
      'No.': index + 1,
      'Archivo': data.fileName,
      'RFC Emisor': data.emisorRfc || 'No encontrado',
      'RFC Receptor': data.receptorRfc || 'No encontrado',
      'UUID': data.uuid || 'No encontrado',
      'Fecha': data.fecha || 'No encontrado',
      'Subtotal': data.subtotal || 'No encontrado',
      'Impuesto IVA': data.impuestoIVA || 'No encontrado',
      'Impuesto ISH': data.impuestoISH || 'No encontrado'
    }));

    // Crear el libro de trabajo
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Datos XML");

    // Ajustar el ancho de las columnas
    const columnWidths = [
      { wch: 5 },   // No.
      { wch: 30 },  // Archivo
      { wch: 15 },  // RFC Emisor
      { wch: 15 },  // RFC Receptor
      { wch: 40 },  // UUID
      { wch: 20 },  // Fecha
      { wch: 15 },  // Subtotal
      { wch: 15 },  // Impuesto IVA
      { wch: 20 }   // Impuesto ISH
    ];
    worksheet['!cols'] = columnWidths;

    // Generar el nombre del archivo con fecha y hora
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
    const fileName = `datos_xml_${timestamp}.xlsx`;

    // Descargar el archivo
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Exportación exitosa",
      description: `Archivo Excel descargado: ${fileName}`,
    });
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
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <CheckCircle className="w-5 h-5 text-success" />
                Datos Extraídos
              </CardTitle>
              <Button 
                onClick={exportToExcel}
                className="bg-success hover:bg-success/90 text-success-foreground"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar a Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-muted">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-muted/50">
                    <TableHead className="font-semibold">Archivo</TableHead>
                    <TableHead className="font-semibold">RFC Emisor</TableHead>
                    <TableHead className="font-semibold">RFC Receptor</TableHead>
                    <TableHead className="font-semibold">UUID</TableHead>
                    <TableHead className="font-semibold">Fecha</TableHead>
                    <TableHead className="font-semibold">Subtotal</TableHead>
                    <TableHead className="font-semibold">Impuesto IVA</TableHead>
                    <TableHead className="font-semibold">Impuesto ISH</TableHead>
                    <TableHead className="w-[100px] font-semibold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {xmlData.map((data, index) => (
                    <TableRow key={index} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          <span className="text-sm">{data.fileName}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {data.emisorRfc ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-success" />
                              <span className="font-mono text-sm bg-background px-2 py-1 rounded border">
                                {data.emisorRfc}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copyToClipboard(data.emisorRfc!)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-destructive" />
                              <span className="text-sm text-muted-foreground">No encontrado</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          {data.receptorRfc ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-success" />
                              <span className="font-mono text-sm bg-background px-2 py-1 rounded border">
                                {data.receptorRfc}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copyToClipboard(data.receptorRfc!)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-destructive" />
                              <span className="text-sm text-muted-foreground">No encontrado</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2 max-w-xs">
                          {data.uuid ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                              <span className="font-mono text-sm bg-background px-2 py-1 rounded border truncate">
                                {data.uuid}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 flex-shrink-0"
                                onClick={() => copyToClipboard(data.uuid!)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-destructive" />
                              <span className="text-sm text-muted-foreground">No encontrado</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          {data.fecha ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-success" />
                              <span className="font-mono text-sm bg-background px-2 py-1 rounded border">
                                {data.fecha}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copyToClipboard(data.fecha!)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-destructive" />
                              <span className="text-sm text-muted-foreground">No encontrado</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          {data.subtotal ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-success" />
                              <span className="font-mono text-sm bg-background px-2 py-1 rounded border">
                                ${data.subtotal}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copyToClipboard(data.subtotal!)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-destructive" />
                              <span className="text-sm text-muted-foreground">No encontrado</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          {data.impuestoIVA ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-success" />
                              <span className="font-mono text-sm bg-background px-2 py-1 rounded border">
                                ${data.impuestoIVA}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copyToClipboard(data.impuestoIVA!)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-destructive" />
                              <span className="text-sm text-muted-foreground">No encontrado</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          {data.impuestoISH ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-success" />
                              <span className="font-mono text-sm bg-background px-2 py-1 rounded border">
                                ${data.impuestoISH}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copyToClipboard(data.impuestoISH!)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-destructive" />
                              <span className="text-sm text-muted-foreground">No encontrado</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const allData = `Archivo: ${data.fileName}\nRFC Emisor: ${data.emisorRfc || 'No encontrado'}\nRFC Receptor: ${data.receptorRfc || 'No encontrado'}\nUUID: ${data.uuid || 'No encontrado'}\nFecha: ${data.fecha || 'No encontrado'}\nSubtotal: ${data.subtotal || 'No encontrado'}\nImpuesto IVA: ${data.impuestoIVA || 'No encontrado'}\nImpuesto ISH: ${data.impuestoISH || 'No encontrado'}`;
                            copyToClipboard(allData);
                          }}
                        >
                          Copiar todo
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};