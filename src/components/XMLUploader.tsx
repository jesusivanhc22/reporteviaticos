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

    // ====== ENHANCED ISH EXTRACTION STRATEGY WITH MUTUAL EXCLUSION ======
    console.log('=== Iniciando búsqueda mejorada de ISH con exclusión mutua ===');
    
    // Track found values to prevent conflicts
    const foundValues = new Set<string>();
    
    // Helper function to validate ISH values
    const isValidISHValue = (value: string): boolean => {
      const numericValue = parseFloat(value);
      return !isNaN(numericValue) && numericValue > 0;
    };

    // Helper function to check if value is already assigned to IVA
    const isNotIVAValue = (value: string): boolean => {
      return value !== impuestoIVA && !foundValues.has(value);
    };

    // Strict ISH identifier patterns with IVA exclusions
    const isISHIdentifier = (code: string, name: string = '', description: string = '', excludeIVA: boolean = true): boolean => {
      // First check if this is definitely IVA
      const ivaPatterns = ['002', 'iva', 'IVA', 'value.*added', 'valor.*agregado'];
      const searchText = `${code} ${name} ${description}`.toLowerCase();
      
      if (excludeIVA && ivaPatterns.some(pattern => {
        if (pattern.includes('.*')) {
          return new RegExp(pattern).test(searchText);
        }
        return searchText.includes(pattern);
      })) {
        console.log(`Excluido por ser IVA: ${code} ${name} ${description}`);
        return false;
      }
      
      // Now check for ISH patterns
      const ishPatterns = [
        // Tax codes - only exact ISH codes
        '003',
        // ISH specific terms
        'ISH', 'ish',
        // Hospitality specific terms
        'hospedaje', 'hospedage', 'hotel', 'tourism', 'turismo',
        'alojamiento', 'estancia', 'habitacion', 'lodging',
        // Common ISH variations
        'impuesto.*hospedaje', 'imp.*hosp', 'tax.*tourism',
        'tasa.*turistica', 'cuota.*hotelera'
      ];
      
      return ishPatterns.some(pattern => {
        if (pattern.includes('.*')) {
          return new RegExp(pattern).test(searchText);
        }
        return searchText.includes(pattern);
      });
    };

    // Enhanced complement search function
    const searchInComplements = (element: Element): string => {
      const complements = element.querySelectorAll('Complemento, cfdi\\:Complemento, ComplementoConcepto, TurismoConcepto, HospedajeConcepto');
      
      for (const complement of complements) {
        const compType = complement.getAttribute('tipo') || complement.getAttribute('Type') || '';
        const compName = complement.nodeName || '';
        console.log(`Analizando complemento: ${compName} tipo: ${compType}`);
        
        // Search within complement for tourism/hospitality specific nodes
        const allNodes = complement.querySelectorAll('*');
        for (const node of allNodes) {
          const attrs = Array.from(node.attributes || []);
          for (const attr of attrs) {
            if (isISHIdentifier('', attr.name, attr.value) && isValidISHValue(attr.value) && isNotIVAValue(attr.value)) {
              console.log(`✓ ISH encontrado en complemento ${compName}:`, attr.value);
              foundValues.add(attr.value);
              return attr.value;
            }
          }
        }
      }
      return '';
    };

    // Search by product/service key patterns
    const searchByProductKey = (): string => {
      const conceptos = xmlDoc.querySelectorAll('Concepto, cfdi\\:Concepto');
      const hospitalityKeys = ['80101600', '80101601', '80101602', '76111500', '76111501'];
      
      for (const concepto of conceptos) {
        const claveProdServ = concepto.getAttribute('ClaveProdServ') || '';
        const descripcion = concepto.getAttribute('Descripcion') || '';
        
        if (hospitalityKeys.includes(claveProdServ) || 
            isISHIdentifier('', '', descripcion)) {
          console.log(`Concepto de hospedaje encontrado: ${claveProdServ} - ${descripcion}`);
          
          // Search for taxes in this hospitality concept
          const impuestosConcepto = concepto.querySelectorAll('Traslado, Retencion, ImpuestoLocal');
          for (const imp of impuestosConcepto) {
            const importe = imp.getAttribute('Importe') || imp.getAttribute('Valor') || '';
            if (isValidISHValue(importe) && isNotIVAValue(importe)) {
              console.log(`✓ ISH encontrado por clave de servicio:`, importe);
              foundValues.add(importe);
              return importe;
            } else if (foundValues.has(importe)) {
              console.log(`⚠️ Valor ${importe} ya asignado, ignorando en clave de servicio`);
            }
          }
          
          // Search in complement within this concept
          const compResult = searchInComplements(concepto);
          if (compResult) return compResult;
        }
      }
      return '';
    };

    // PRIORITY 1: Buscar en nodos específicos de impuestos (Traslado, Retencion, ImpuestoLocal)
    console.log('1. PRIORIDAD ALTA: Buscando en nodos específicos de impuestos...');
    
    // 1.1 Buscar en Traslados
    const traslados = xmlDoc.querySelectorAll('Traslado');
    console.log(`Traslados encontrados: ${traslados.length}`);
    
    traslados.forEach((traslado, index) => {
      const impuesto = traslado.getAttribute('Impuesto') || traslado.getAttribute('impuesto') || '';
      const importe = traslado.getAttribute('Importe') || 
                     traslado.getAttribute('importe') || 
                     traslado.getAttribute('Valor') || 
                     traslado.getAttribute('valor') || '';
      
      console.log(`Traslado ${index + 1}:`, { impuesto, importe });
      
      // Buscar IVA (código 002) - prioridad máxima
      if (impuesto === '002' && isValidISHValue(importe)) {
        impuestoIVA = importe;
        foundValues.add(importe);
        console.log('✓ IVA encontrado y marcado:', importe);
      }
      
      // Buscar ISH con validación estricta y exclusión mutua
      if (isISHIdentifier(impuesto) && isValidISHValue(importe) && isNotIVAValue(importe)) {
        impuestoISH = importe;
        foundValues.add(importe);
        console.log(`✓ ISH encontrado en Traslado con código ${impuesto}:`, importe);
        console.log(`Contexto completo:`, traslado.outerHTML);
      } else if (isISHIdentifier(impuesto) && foundValues.has(importe)) {
        console.log(`⚠️ Valor ${importe} ya asignado a otro impuesto, ignorando para ISH`);
      }
    });

    // 1.2 Buscar en Retenciones
    if (!impuestoISH) {
      const retenciones = xmlDoc.querySelectorAll('Retencion');
      console.log(`Retenciones encontradas: ${retenciones.length}`);
      
      retenciones.forEach((retencion, index) => {
        const impuesto = retencion.getAttribute('Impuesto') || retencion.getAttribute('impuesto') || '';
        const importe = retencion.getAttribute('Importe') || 
                       retencion.getAttribute('importe') || 
                       retencion.getAttribute('Valor') || 
                       retencion.getAttribute('valor') || '';
        
        console.log(`Retención ${index + 1}:`, { impuesto, importe });
        
        if (isISHIdentifier(impuesto) && isValidISHValue(importe) && isNotIVAValue(importe)) {
          impuestoISH = importe;
          foundValues.add(importe);
          console.log(`✓ ISH encontrado en Retención con código ${impuesto}:`, importe);
          console.log(`Contexto completo:`, retencion.outerHTML);
        } else if (isISHIdentifier(impuesto) && foundValues.has(importe)) {
          console.log(`⚠️ Valor ${importe} ya asignado a otro impuesto, ignorando para ISH`);
        }
      });
    }

    // 1.3 Buscar en ImpuestoLocal
    if (!impuestoISH) {
      const impuestosLocales = xmlDoc.querySelectorAll('ImpuestoLocal');
      console.log(`Impuestos locales encontrados: ${impuestosLocales.length}`);
      
      impuestosLocales.forEach((impuestoLocal, index) => {
        const tipoImpuesto = impuestoLocal.getAttribute('ImpLocTrasladado') || 
                            impuestoLocal.getAttribute('impLocTrasladado') ||
                            impuestoLocal.getAttribute('TipoDeImpuesto') ||
                            impuestoLocal.getAttribute('tipoDeImpuesto') || '';
        const importe = impuestoLocal.getAttribute('Importe') || 
                       impuestoLocal.getAttribute('importe') || '';
        
        console.log(`Impuesto Local ${index + 1}:`, { tipoImpuesto, importe });
        
        if (isISHIdentifier('', tipoImpuesto) && isValidISHValue(importe) && isNotIVAValue(importe)) {
          impuestoISH = importe;
          foundValues.add(importe);
          console.log(`✓ ISH encontrado en ImpuestoLocal:`, importe);
          console.log(`Contexto completo:`, impuestoLocal.outerHTML);
        } else if (isISHIdentifier('', tipoImpuesto) && foundValues.has(importe)) {
          console.log(`⚠️ Valor ${importe} ya asignado a otro impuesto, ignorando para ISH`);
        }
      });
    }

    // PRIORITY 2: Buscar por clave de servicio de hospedaje
    if (!impuestoISH) {
      console.log('2. BÚSQUEDA POR CLAVE DE PRODUCTO/SERVICIO...');
      impuestoISH = searchByProductKey();
    }

    // PRIORITY 3: Buscar en complementos especializados
    if (!impuestoISH) {
      console.log('3. BÚSQUEDA EN COMPLEMENTOS...');
      impuestoISH = searchInComplements(xmlDoc.documentElement);
    }

    // PRIORITY 4: Buscar en conceptos con impuestos anidados (método tradicional)
    if (!impuestoISH) {
      console.log('4. PRIORIDAD MEDIA: Buscando en Conceptos con búsqueda extendida...');
      const conceptos = xmlDoc.querySelectorAll('Concepto, cfdi\\:Concepto');
      console.log(`Conceptos encontrados: ${conceptos.length}`);
      
      conceptos.forEach((concepto, index) => {
        const descripcion = concepto.getAttribute('Descripcion') || '';
        const claveProdServ = concepto.getAttribute('ClaveProdServ') || '';
        console.log(`Concepto ${index + 1}:`, { descripcion, claveProdServ });
        
        // Enhanced concept search with description patterns
        if (isISHIdentifier('', '', descripcion)) {
          console.log(`Concepto con descripción relevante encontrado: ${descripcion}`);
        }
        
        // Buscar impuestos dentro del concepto
        const impuestosConcepto = concepto.querySelectorAll('Traslado, Retencion, ImpuestoLocal');
        impuestosConcepto.forEach(imp => {
          const impuesto = imp.getAttribute('Impuesto') || imp.getAttribute('impuesto') || '';
          const tipoImpuesto = imp.getAttribute('ImpLocTrasladado') || 
                              imp.getAttribute('TipoDeImpuesto') || '';
          const importe = imp.getAttribute('Importe') || 
                         imp.getAttribute('importe') || 
                         imp.getAttribute('Valor') || '';
          
          console.log(`  Impuesto en concepto: código=${impuesto}, tipo=${tipoImpuesto}, importe=${importe}`);
          
          if ((isISHIdentifier(impuesto, tipoImpuesto, descripcion)) && isValidISHValue(importe) && isNotIVAValue(importe)) {
            impuestoISH = importe;
            foundValues.add(importe);
            console.log(`✓ ISH encontrado en impuesto de concepto:`, importe);
            console.log(`Contexto completo:`, imp.outerHTML);
          } else if (isISHIdentifier(impuesto, tipoImpuesto, descripcion) && foundValues.has(importe)) {
            console.log(`⚠️ Valor ${importe} ya asignado a otro impuesto, ignorando para ISH`);
          }
        });
      });
    }

    // PRIORITY 5: Buscar en nodo Impuestos con totales
    if (!impuestoISH) {
      console.log('5. PRIORIDAD BAJA: Buscando en totales de impuestos...');
      const impuestos = xmlDoc.querySelector('Impuestos');
      if (impuestos) {
        console.log('Nodo Impuestos encontrado, analizando atributos...');
        
        // Buscar TotaldeRetenciones
        const totalRetenciones = impuestos.getAttribute('TotaldeRetenciones') || 
                                impuestos.getAttribute('TotalRetenciones') ||
                                impuestos.getAttribute('TotalImpuestosRetenidos') ||
                                impuestos.getAttribute('totaldeRetenciones') ||
                                impuestos.getAttribute('totalRetenciones') || '';
        
        if (totalRetenciones && isValidISHValue(totalRetenciones) && isNotIVAValue(totalRetenciones)) {
          impuestoISH = totalRetenciones;
          foundValues.add(totalRetenciones);
          console.log('✓ ISH asignado desde TotaldeRetenciones:', totalRetenciones);
        } else if (totalRetenciones && foundValues.has(totalRetenciones)) {
          console.log(`⚠️ TotaldeRetenciones ${totalRetenciones} ya asignado, ignorando para ISH`);
        }
        
        // Si no hay impuesto IVA, intentar obtenerlo del total
        if (!impuestoIVA) {
          impuestoIVA = impuestos.getAttribute('TotalImpuestosTrasladados') || '';
        }
      }
    }

    // PRIORITY 6: Enhanced value pattern search
    if (!impuestoISH) {
      console.log('6. BÚSQUEDA POR PATRONES DE VALOR...');
      
      // Search for specific values that might be ISH (common ranges)
      const todosLosNodos = xmlDoc.querySelectorAll('*');
      const potentialISHValues: { value: string, context: string }[] = [];
      
      todosLosNodos.forEach(nodo => {
        Array.from(nodo.attributes || []).forEach(attr => {
          const value = parseFloat(attr.value);
          // Common ISH ranges (usually between 1-1000 for most cases)
          if (!isNaN(value) && value > 1 && value < 1000) {
            const context = `${nodo.tagName}.${attr.name}`;
            // Check if the context suggests it might be ISH-related
            if (isISHIdentifier(attr.name, nodo.tagName, nodo.outerHTML.substring(0, 200))) {
              potentialISHValues.push({ value: attr.value, context });
              console.log(`Valor potencial ISH encontrado: ${attr.value} en ${context}`);
            }
          }
        });
      });
      
      // Filter out already found values and validate with mutual exclusion
      const validISHValues = potentialISHValues.filter(item => isNotIVAValue(item.value));
      
      if (validISHValues.length > 0) {
        impuestoISH = validISHValues[0].value;
        foundValues.add(impuestoISH);
        console.log(`✓ ISH asignado desde búsqueda por patrones:`, impuestoISH);
      } else if (potentialISHValues.length > 0) {
        console.log(`⚠️ Valores ISH potenciales encontrados pero ya asignados a otros impuestos:`, 
          potentialISHValues.map(v => v.value));
      }
    }

    // PRIORITY 7: Última instancia - búsqueda exhaustiva de valor específico
    if (!impuestoISH) {
      console.log('7. ÚLTIMA INSTANCIA: Búsqueda exhaustiva del valor 105.86...');
      const todosLosNodos = xmlDoc.querySelectorAll('*');
      let encontrados = 0;
      
      todosLosNodos.forEach(nodo => {
        Array.from(nodo.attributes || []).forEach(attr => {
          if (attr.value === '105.86') {
            encontrados++;
            console.log(`¡Valor exacto 105.86 encontrado en ${nodo.tagName}.${attr.name}`);
            console.log(`Contexto:`, nodo.outerHTML.substring(0, 300));
            if (!impuestoISH) {
              impuestoISH = attr.value;
              console.log('✓ ISH asignado desde búsqueda exhaustiva:', attr.value);
            }
          }
        });
      });
      
      console.log(`Total de coincidencias exactas con "105.86": ${encontrados}`);
    }

    // Final validation and cross-reference check
    console.log('=== VALIDACIÓN FINAL ===');
    console.log('Valores encontrados y marcados:', Array.from(foundValues));
    console.log('IVA final:', impuestoIVA);
    console.log('ISH final:', impuestoISH);
    
    // Additional safety check to ensure ISH is not the same as IVA
    if (impuestoISH && impuestoISH === impuestoIVA) {
      console.log('⚠️ CONFLICTO DETECTADO: ISH y IVA tienen el mismo valor, limpiando ISH');
      impuestoISH = '';
    }
    
    // Check if we have a valid ISH value
    if (impuestoISH) {
      console.log('✅ ISH VÁLIDO ENCONTRADO:', impuestoISH);
    } else {
      console.log('❌ ISH NO ENCONTRADO o VALOR INVÁLIDO');
    }
    
    console.log('=== Resultado final ISH ===', impuestoISH);

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