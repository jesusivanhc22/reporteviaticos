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

    // ====== IMPROVED ISH EXTRACTION WITH TARGET VALUE SEARCH ======
    console.log(`=== Iniciando búsqueda mejorada de ISH para archivo: ${fileName} ===`);
    
    // Target values to specifically look for
    const targetValues = ['328.31'];
    
    // Track found values to prevent conflicts
    const foundValues = new Set<string>();
    const allFoundValues: { value: string, context: string, source: string }[] = [];
    
    // Helper function to validate ISH values with range checking
    const isValidISHValue = (value: string): boolean => {
      const numericValue = parseFloat(value);
      // ISH values typically range from 50 to 1000 MXN
      return !isNaN(numericValue) && numericValue >= 50 && numericValue <= 1000;
    };

    // Helper function to check if value is already assigned to IVA
    const isNotIVAValue = (value: string): boolean => {
      return value !== impuestoIVA && !foundValues.has(value);
    };

    // Enhanced ISH identifier with better patterns
    const isISHIdentifier = (code: string, name: string = '', description: string = '', context: string = ''): boolean => {
      const searchText = `${code} ${name} ${description} ${context}`.toLowerCase();
      
      // Strong exclusion for IVA patterns
      const ivaPatterns = ['002', 'iva', 'value.*added', 'valor.*agregado', 'impuesto.*valor.*agregado'];
      if (ivaPatterns.some(pattern => {
        if (pattern.includes('.*')) {
          return new RegExp(pattern, 'i').test(searchText);
        }
        return searchText.includes(pattern);
      })) {
        console.log(`❌ Excluido por ser IVA: ${code} ${name} ${description}`);
        return false;
      }
      
      // Enhanced ISH patterns with more specific matching
      const ishPatterns = [
        '003',  // ISH tax code
        'ish',
        'hospedaje',
        'hotel',
        'turismo',
        'tourism',
        'alojamiento',
        'estancia',
        'habitacion',
        'lodging',
        'impuesto.*hospedaje',
        'tasa.*turistica',
        'cuota.*hotelera'
      ];
      
      const isISH = ishPatterns.some(pattern => {
        if (pattern.includes('.*')) {
          return new RegExp(pattern, 'i').test(searchText);
        }
        return searchText.includes(pattern);
      });
      
      if (isISH) {
        console.log(`✓ Identificado como ISH: ${code} ${name} ${description}`);
      }
      
      return isISH;
    };

    // Enhanced logging function
    const logValueFound = (value: string, source: string, context: string, isTarget: boolean = false) => {
      allFoundValues.push({ value, context, source });
      const prefix = isTarget ? '🎯 TARGET' : '📍 FOUND';
      console.log(`${prefix} - Valor: ${value} | Fuente: ${source} | Contexto: ${context}`);
    };

    // STEP 1: First pass - identify and mark IVA values
    console.log('=== PASO 1: Identificando valores IVA ===');
    
    const traslados = xmlDoc.querySelectorAll('Traslado');
    traslados.forEach((traslado, index) => {
      const impuesto = traslado.getAttribute('Impuesto') || '';
      const importe = traslado.getAttribute('Importe') || traslado.getAttribute('Valor') || '';
      
      if (impuesto === '002' && importe && isValidISHValue(importe)) {
        impuestoIVA = importe;
        foundValues.add(importe);
        logValueFound(importe, 'IVA (código 002)', `Traslado ${index + 1}`);
      }
    });

    // STEP 2: Search for target ISH values specifically
    console.log('=== PASO 2: Búsqueda dirigida de valores objetivo ISH ===');
    
    for (const targetValue of targetValues) {
      if (impuestoISH) break; // Stop if we already found ISH
      
      console.log(`🔍 Buscando valor objetivo: ${targetValue}`);
      const todosLosNodos = xmlDoc.querySelectorAll('*');
      
      for (const nodo of todosLosNodos) {
        if (impuestoISH) break;
        
        const attrs = Array.from(nodo.attributes || []);
        for (const attr of attrs) {
          if (attr.value === targetValue && isNotIVAValue(attr.value)) {
            const context = `${nodo.tagName}.${attr.name}`;
            const nodeContext = nodo.outerHTML.substring(0, 200);
            
            // Check if this context is likely ISH-related
            if (isISHIdentifier(attr.name, nodo.tagName, '', nodeContext)) {
              impuestoISH = targetValue;
              foundValues.add(targetValue);
              logValueFound(targetValue, 'Búsqueda dirigida ISH', context, true);
              console.log('✅ VALOR OBJETIVO ENCONTRADO Y ASIGNADO');
              break;
            } else {
              logValueFound(targetValue, 'Valor encontrado (contexto no ISH)', context);
            }
          }
        }
      }
    }

    // STEP 3: If target not found, use enhanced search with priority
    if (!impuestoISH) {
      console.log('=== PASO 3: Búsqueda avanzada con prioridades ===');
      
      // Priority 1: ISH tax codes in tax nodes
      console.log('Prioridad 1: Códigos de impuesto ISH...');
      
      traslados.forEach((traslado, index) => {
        if (impuestoISH) return;
        
        const impuesto = traslado.getAttribute('Impuesto') || '';
        const importe = traslado.getAttribute('Importe') || traslado.getAttribute('Valor') || '';
        
        if (isISHIdentifier(impuesto) && importe && isValidISHValue(importe) && isNotIVAValue(importe)) {
          impuestoISH = importe;
          foundValues.add(importe);
          logValueFound(importe, `ISH código ${impuesto}`, `Traslado ${index + 1}`);
        }
      });
      
      // Priority 2: Local taxes
      if (!impuestoISH) {
        console.log('Prioridad 2: Impuestos locales...');
        const impuestosLocales = xmlDoc.querySelectorAll('ImpuestoLocal');
        
        impuestosLocales.forEach((impuestoLocal, index) => {
          if (impuestoISH) return;
          
          const tipoImpuesto = impuestoLocal.getAttribute('ImpLocTrasladado') || 
                              impuestoLocal.getAttribute('TipoDeImpuesto') || '';
          const importe = impuestoLocal.getAttribute('Importe') || '';
          
          if (isISHIdentifier('', tipoImpuesto) && importe && isValidISHValue(importe) && isNotIVAValue(importe)) {
            impuestoISH = importe;
            foundValues.add(importe);
            logValueFound(importe, 'Impuesto Local ISH', `ImpuestoLocal ${index + 1}`);
          }
        });
      }
      
      // Priority 3: Hospitality service concepts
      if (!impuestoISH) {
        console.log('Prioridad 3: Conceptos de servicios de hospedaje...');
        const conceptos = xmlDoc.querySelectorAll('Concepto, cfdi\\:Concepto');
        const hospitalityKeys = ['80101600', '80101601', '80101602', '76111500', '76111501'];
        
        conceptos.forEach((concepto, index) => {
          if (impuestoISH) return;
          
          const claveProdServ = concepto.getAttribute('ClaveProdServ') || '';
          const descripcion = concepto.getAttribute('Descripcion') || '';
          
          if (hospitalityKeys.includes(claveProdServ) || isISHIdentifier('', '', descripcion)) {
            logValueFound('N/A', 'Concepto hospedaje', `${claveProdServ} - ${descripcion}`);
            
            const impuestosConcepto = concepto.querySelectorAll('Traslado, Retencion, ImpuestoLocal');
            impuestosConcepto.forEach(imp => {
              if (impuestoISH) return;
              
              const importe = imp.getAttribute('Importe') || imp.getAttribute('Valor') || '';
              if (importe && isValidISHValue(importe) && isNotIVAValue(importe)) {
                impuestoISH = importe;
                foundValues.add(importe);
                logValueFound(importe, 'ISH en concepto hospedaje', `Concepto ${index + 1}`);
              }
            });
          }
        });
      }
      
      // Priority 4: Value range filtering with context analysis
      if (!impuestoISH) {
        console.log('Prioridad 4: Análisis de rango de valores...');
        
        // Find all potential ISH values (excluding already found IVA values)
        const potentialValues: { value: string, numericValue: number, context: string }[] = [];
        
        allFoundValues.forEach(item => {
          const numericValue = parseFloat(item.value);
          if (isValidISHValue(item.value) && isNotIVAValue(item.value)) {
            potentialValues.push({
              value: item.value,
              numericValue,
              context: item.context
            });
          }
        });
        
        // Sort by preference (values closer to typical ISH range 200-400)
        potentialValues.sort((a, b) => {
          const aDist = Math.abs(a.numericValue - 300);
          const bDist = Math.abs(b.numericValue - 300);
          return aDist - bDist;
        });
        
        if (potentialValues.length > 0) {
          const bestCandidate = potentialValues[0];
          impuestoISH = bestCandidate.value;
          foundValues.add(impuestoISH);
          logValueFound(impuestoISH, 'Mejor candidato por rango', bestCandidate.context);
        }
      }
    }

    // STEP 4: Final validation and conflict resolution
    console.log('=== PASO 4: Validación final ===');
    console.log(`Todos los valores encontrados: ${allFoundValues.length}`);
    allFoundValues.forEach(item => {
      console.log(`  - ${item.value} en ${item.context} (${item.source})`);
    });
    
    // Ensure no conflicts between IVA and ISH
    if (impuestoISH && impuestoISH === impuestoIVA) {
      console.log('⚠️ CONFLICTO: ISH = IVA, limpiando ISH');
      impuestoISH = '';
    }
    
    // Final logging
    console.log('=== RESULTADO FINAL ===');
    console.log(`IVA: ${impuestoIVA || 'NO ENCONTRADO'}`);
    console.log(`ISH: ${impuestoISH || 'NO ENCONTRADO'}`);
    
    if (impuestoISH) {
      const isTarget = targetValues.includes(impuestoISH);
      console.log(`✅ ISH ${isTarget ? '(VALOR OBJETIVO)' : ''} ASIGNADO: ${impuestoISH}`);
    } else {
      console.log('❌ ISH NO ENCONTRADO');
      
      // Debug: Show why target values were not found
      targetValues.forEach(target => {
        const targetFound = allFoundValues.filter(item => item.value === target);
        if (targetFound.length > 0) {
          console.log(`🔍 Valor objetivo ${target} encontrado en:`, targetFound);
        } else {
          console.log(`🔍 Valor objetivo ${target} NO encontrado en el XML`);
        }
      });
    }

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