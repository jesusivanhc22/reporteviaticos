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

    // Buscar impuestos específicos en los traslados
    console.log('=== Iniciando búsqueda de ISH ===');
    
    // 1. BÚSQUEDA EN COMPLEMENTOS
    console.log('1. Buscando en Complementos...');
    const complementos = xmlDoc.querySelectorAll('Complemento, cfdi\\:Complemento');
    console.log(`Complementos encontrados: ${complementos.length}`);
    
    complementos.forEach((complemento, index) => {
      console.log(`Complemento ${index + 1}:`, complemento.outerHTML.substring(0, 200));
      
      // Buscar en todos los atributos del complemento
      Array.from(complemento.attributes || []).forEach(attr => {
        if (attr.value.includes('105.86') || attr.value.toLowerCase().includes('ish') || attr.value.toLowerCase().includes('hospedaje')) {
          console.log(`¡ISH encontrado en complemento atributo ${attr.name}:`, attr.value);
          impuestoISH = attr.value;
        }
      });
      
      // Buscar en nodos hijos del complemento
      const childNodes = complemento.querySelectorAll('*');
      childNodes.forEach(child => {
        Array.from(child.attributes || []).forEach(attr => {
          if (attr.value.includes('105.86') || attr.value.toLowerCase().includes('ish') || attr.value.toLowerCase().includes('hospedaje')) {
            console.log(`¡ISH encontrado en complemento hijo ${child.tagName} atributo ${attr.name}:`, attr.value);
            impuestoISH = attr.value;
          }
        });
      });
    });

    // 2. BÚSQUEDA EN CONCEPTOS
    console.log('2. Buscando en Conceptos...');
    const conceptos = xmlDoc.querySelectorAll('Concepto, cfdi\\:Concepto');
    console.log(`Conceptos encontrados: ${conceptos.length}`);
    
    conceptos.forEach((concepto, index) => {
      console.log(`Concepto ${index + 1}:`, concepto.outerHTML.substring(0, 200));
      
      // Buscar en atributos del concepto
      Array.from(concepto.attributes || []).forEach(attr => {
        if (attr.value.includes('105.86') || attr.value.toLowerCase().includes('ish') || attr.value.toLowerCase().includes('hospedaje')) {
          console.log(`¡ISH encontrado en concepto atributo ${attr.name}:`, attr.value);
          impuestoISH = attr.value;
        }
      });
      
      // Buscar en impuestos del concepto
      const impuestosConcepto = concepto.querySelectorAll('Traslado, Retencion, ImpuestoLocal');
      impuestosConcepto.forEach(imp => {
        Array.from(imp.attributes || []).forEach(attr => {
          if (attr.value.includes('105.86') || attr.value.toLowerCase().includes('ish') || attr.value.toLowerCase().includes('hospedaje')) {
            console.log(`¡ISH encontrado en impuesto de concepto atributo ${attr.name}:`, attr.value);
            impuestoISH = attr.value;
          }
        });
      });
    });

    // 3. BÚSQUEDA EXHAUSTIVA EN TODOS LOS NODOS
    console.log('3. Búsqueda exhaustiva en todo el documento...');
    const todosLosNodos = xmlDoc.querySelectorAll('*');
    console.log(`Total de nodos a revisar: ${todosLosNodos.length}`);
    
    let encontrados = 0;
    todosLosNodos.forEach((nodo, index) => {
      Array.from(nodo.attributes || []).forEach(attr => {
        if (attr.value.includes('105.86')) {
          encontrados++;
          console.log(`¡Valor 105.86 encontrado en nodo ${nodo.tagName} atributo ${attr.name}:`, attr.value);
          console.log(`Contexto del nodo:`, nodo.outerHTML.substring(0, 300));
          if (!impuestoISH) {
            impuestoISH = attr.value;
          }
        }
        
        // Buscar patrones ISH
        if (attr.value.toLowerCase().includes('ish') || 
            attr.value.toLowerCase().includes('hospedaje') ||
            attr.name.toLowerCase().includes('ish') ||
            attr.name.toLowerCase().includes('hospedaje')) {
          console.log(`¡Patrón ISH/Hospedaje encontrado en ${nodo.tagName}.${attr.name}:`, attr.value);
          if (!impuestoISH && (attr.value.match(/\d+\.?\d*/) || attr.value.toLowerCase().includes('ish'))) {
            impuestoISH = attr.value;
          }
        }
      });
    });
    
    console.log(`Total de coincidencias con "105.86": ${encontrados}`);

    // 4. BÚSQUEDA DE TEXTO EN CONTENIDO DE NODOS
    console.log('4. Buscando en contenido de texto de nodos...');
    todosLosNodos.forEach(nodo => {
      if (nodo.textContent && nodo.textContent.includes('105.86')) {
        console.log(`¡Texto 105.86 encontrado en ${nodo.tagName}:`, nodo.textContent);
        console.log(`Contexto del nodo:`, nodo.outerHTML.substring(0, 300));
        if (!impuestoISH) {
          impuestoISH = nodo.textContent.trim();
        }
      }
    });
    
    const traslados = xmlDoc.querySelectorAll('Traslado');
    console.log('Traslados encontrados:', traslados.length);
    traslados.forEach((traslado, index) => {
      const impuesto = traslado.getAttribute('Impuesto') || traslado.getAttribute('impuesto');
      const importe = traslado.getAttribute('Importe') || 
                     traslado.getAttribute('importe') || 
                     traslado.getAttribute('Valor') || 
                     traslado.getAttribute('valor') || '';
      
      console.log(`Traslado ${index + 1}:`, { impuesto, importe });
      
      // 002 es el código del IVA en México
      if (impuesto === '002') {
        impuestoIVA = importe;
        console.log('IVA encontrado:', importe);
      }
      // 003 es el código del ISH (Impuesto Sobre Hospedaje) en México
      // También buscar ISH por nombre o otros códigos posibles
      if (impuesto === '003' || impuesto === 'ISH' || impuesto === 'ish') {
        impuestoISH = importe;
        console.log('ISH encontrado en traslados:', importe);
      }
    });

    // Buscar ISH en retenciones también
    const retenciones = xmlDoc.querySelectorAll('Retencion');
    console.log('Retenciones encontradas:', retenciones.length);
    retenciones.forEach((retencion, index) => {
      const impuesto = retencion.getAttribute('Impuesto') || retencion.getAttribute('impuesto');
      const importe = retencion.getAttribute('Importe') || 
                     retencion.getAttribute('importe') || 
                     retencion.getAttribute('Valor') || 
                     retencion.getAttribute('valor') || '';
      
      console.log(`Retención ${index + 1}:`, { impuesto, importe });
      
      if (impuesto === '003' || impuesto === 'ISH' || impuesto === 'ish') {
        impuestoISH = importe;
        console.log('ISH encontrado en retenciones:', importe);
      }
    });

    // Buscar ISH en impuestos locales
    const impuestosLocales = xmlDoc.querySelectorAll('ImpuestoLocal');
    console.log('Impuestos locales encontrados:', impuestosLocales.length);
    impuestosLocales.forEach((impuestoLocal, index) => {
      const tipoImpuesto = impuestoLocal.getAttribute('ImpLocTrasladado') || 
                          impuestoLocal.getAttribute('impLocTrasladado') ||
                          impuestoLocal.getAttribute('TipoDeImpuesto') ||
                          impuestoLocal.getAttribute('tipoDeImpuesto') || '';
      const importe = impuestoLocal.getAttribute('Importe') || 
                     impuestoLocal.getAttribute('importe') || '';
      
      console.log(`Impuesto Local ${index + 1}:`, { tipoImpuesto, importe });
      
      // Buscar ISH por nombre completo o abreviación
      if (tipoImpuesto.toLowerCase().includes('hospedaje') || 
          tipoImpuesto.toLowerCase().includes('ish') ||
          tipoImpuesto === '003') {
        impuestoISH = importe;
        console.log('ISH encontrado en impuestos locales:', importe);
      }
    });

    // Si no se encuentra en traslados, buscar en el nodo Impuestos como fallback
    if (!impuestoIVA) {
      const impuestos = xmlDoc.querySelector('Impuestos');
      if (impuestos) {
        // Intentar obtener el total si solo hay IVA
        impuestoIVA = impuestos.getAttribute('TotalImpuestosTrasladados') || '';
      }
    }

    // Si no se encuentra ISH en ningún lado, buscar en TotaldeRetenciones como fallback
    if (!impuestoISH) {
      console.log('ISH no encontrado, buscando en TotaldeRetenciones...');
      const impuestos = xmlDoc.querySelector('Impuestos');
      if (impuestos) {
        console.log('Nodo Impuestos encontrado, verificando atributos...');
        // Buscar TotaldeRetenciones con diferentes variaciones de nombre
        const totalRetenciones = impuestos.getAttribute('TotaldeRetenciones') || 
                                impuestos.getAttribute('TotalRetenciones') ||
                                impuestos.getAttribute('TotalImpuestosRetenidos') ||
                                impuestos.getAttribute('totaldeRetenciones') ||
                                impuestos.getAttribute('totalRetenciones') ||
                                impuestos.getAttribute('totalImpuestosRetenidos') || '';
        
        console.log('TotaldeRetenciones encontrado:', totalRetenciones);
        if (totalRetenciones) {
          impuestoISH = totalRetenciones;
          console.log('ISH asignado desde TotaldeRetenciones:', totalRetenciones);
        }
        
        // También buscar cualquier atributo que contenga "105.86"
        const todosLosAtributos = impuestos.getAttributeNames();
        console.log('Todos los atributos del nodo Impuestos:', todosLosAtributos);
        todosLosAtributos.forEach(atributo => {
          const valor = impuestos.getAttribute(atributo);
          console.log(`${atributo}: ${valor}`);
          if (valor && valor.includes('105.86')) {
            console.log(`¡Encontrado 105.86 en atributo ${atributo}!`);
            impuestoISH = valor;
          }
        });
      }
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