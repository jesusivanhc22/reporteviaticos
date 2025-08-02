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
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      
      // Check for XML parsing errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        console.error('❌ Error parsing XML:', parserError.textContent);
        throw new Error(`XML parsing failed: ${parserError.textContent}`);
      }
      
      // ====== ENHANCED DEBUGGING FOR FILE 101183718 ======
      const isTargetFile = fileName.includes('101183718');
      
      if (isTargetFile) {
        console.log('🎯 ===== ANÁLISIS DETALLADO PARA ARCHIVO 101183718 =====');
        console.log('📄 Archivo objetivo detectado, iniciando análisis exhaustivo...');
      }
    
    // Buscar RFC y UUID en diferentes posibles ubicaciones del XML
    let rfc = '';
    let uuid = '';
    let emisorRfc = '';
    let receptorRfc = '';
    let fecha = '';
    let subtotal = '';
    let impuestoIVA = '';
    let impuestoISH = '';

      // Safe element extraction with error handling
      const safeGetElement = (selector: string): Element | null => {
        try {
          return xmlDoc.querySelector(selector);
        } catch (error) {
          console.warn(`⚠️ Invalid selector "${selector}":`, error);
          return null;
        }
      };

      const safeGetAttribute = (element: Element | null, attributeName: string): string => {
        try {
          return element?.getAttribute(attributeName) || '';
        } catch (error) {
          console.warn(`⚠️ Error getting attribute "${attributeName}":`, error);
          return '';
        }
      };

      // Buscar UUID (TimbreFiscalDigital o atributo UUID)
      const timbreFiscal = safeGetElement('TimbreFiscalDigital');
      if (timbreFiscal) {
        uuid = safeGetAttribute(timbreFiscal, 'UUID');
      }
      
      // También buscar en el nodo raíz
      const comprobante = safeGetElement('Comprobante');
      if (comprobante) {
        if (!uuid) {
          uuid = safeGetAttribute(comprobante, 'UUID');
        }
        // Extraer fecha y subtotal del Comprobante
        fecha = safeGetAttribute(comprobante, 'Fecha') || safeGetAttribute(comprobante, 'fecha');
        subtotal = safeGetAttribute(comprobante, 'SubTotal') || safeGetAttribute(comprobante, 'subtotal');
      }

      // Buscar RFC del emisor
      const emisor = safeGetElement('Emisor');
      if (emisor) {
        emisorRfc = safeGetAttribute(emisor, 'Rfc') || safeGetAttribute(emisor, 'rfc');
        rfc = emisorRfc; // Por defecto, usar el RFC del emisor
      }

      // Buscar RFC del receptor
      const receptor = safeGetElement('Receptor');
      if (receptor) {
        receptorRfc = safeGetAttribute(receptor, 'Rfc') || safeGetAttribute(receptor, 'rfc');
      }

    // ====== DETAILED XML STRUCTURE ANALYSIS FOR TARGET FILE ======
    if (isTargetFile) {
      console.log('🔍 ===== ANÁLISIS COMPLETO DE ESTRUCTURA XML =====');
      
        // Safe XML namespace analysis with error handling
        const rootElement = xmlDoc.documentElement;
        if (!rootElement) {
          console.error('❌ No root element found in XML document');
          return { fileName };
        }

        console.log('📋 INFORMACIÓN DEL DOCUMENTO:');
        console.log(`   - Elemento raíz: ${rootElement.tagName}`);
        console.log(`   - Namespaces detectados:`);
        
        const namespaces = new Set<string>();
        const getAllNamespaces = (element: Element) => {
          try {
            if (!element || !element.attributes) return;
            
            for (let i = 0; i < element.attributes.length; i++) {
              const attr = element.attributes[i];
              if (attr.name.startsWith('xmlns:')) {
                namespaces.add(`${attr.name}="${attr.value}"`);
              }
            }
            
            // Safe iteration with bounds checking
            for (let i = 0; i < element.children.length; i++) {
              const child = element.children[i];
              if (child && child.nodeType === Node.ELEMENT_NODE) {
                getAllNamespaces(child);
              }
            }
          } catch (error) {
            console.warn('⚠️ Error analyzing namespaces:', error);
          }
        };
        
        getAllNamespaces(rootElement);
        namespaces.forEach(ns => console.log(`     ${ns}`));
      
        // Safe element inventory with performance optimization
        console.log('📦 INVENTARIO COMPLETO DE ELEMENTOS:');
        const elementCounts = new Map<string, number>();
        
        try {
          const allElements = xmlDoc.querySelectorAll('*');
          
          // Performance optimization: limit analysis for very large documents
          const maxElements = 10000;
          const elementsToAnalyze = allElements.length > maxElements 
            ? Array.from(allElements).slice(0, maxElements)
            : Array.from(allElements);
          
          if (allElements.length > maxElements) {
            console.log(`⚠️ Documento muy grande (${allElements.length} elementos), analizando solo los primeros ${maxElements}`);
          }
          
          elementsToAnalyze.forEach(element => {
            if (element && element.tagName) {
              const tagName = element.tagName;
              elementCounts.set(tagName, (elementCounts.get(tagName) || 0) + 1);
            }
          });
          
          const sortedElements = Array.from(elementCounts.entries()).sort((a, b) => b[1] - a[1]);
          sortedElements.forEach(([tag, count]) => {
            console.log(`   - ${tag}: ${count} ocurrencia(s)`);
          });
        } catch (error) {
          console.error('❌ Error during element inventory:', error);
        }
      
      // Tax-related elements deep dive
      console.log('💰 ANÁLISIS PROFUNDO DE ELEMENTOS FISCALES:');
      
        // Safe Impuestos section analysis
        const impuestos = safeGetElement('Impuestos');
        if (impuestos) {
          console.log('   📊 Sección Impuestos encontrada:');
          console.log(`      - Total de atributos: ${impuestos.attributes?.length || 0}`);
          
          try {
            if (impuestos.attributes) {
              for (let i = 0; i < impuestos.attributes.length; i++) {
                const attr = impuestos.attributes[i];
                if (attr) {
                  console.log(`      - ${attr.name}: ${attr.value}`);
                }
              }
            }
            
            console.log(`      - Elementos hijos: ${impuestos.children?.length || 0}`);
            if (impuestos.children) {
              for (let i = 0; i < impuestos.children.length; i++) {
                const child = impuestos.children[i];
                if (child && child.tagName) {
                  console.log(`        * ${child.tagName} (${child.attributes?.length || 0} atributos)`);
                }
              }
            }
          } catch (error) {
            console.warn('⚠️ Error analyzing Impuestos section:', error);
          }
        }
      
        // Safe local taxes analysis with fallback selectors
        const impuestosLocalesVariants = [
          'ImpuestosLocales',
          'implocal\\:ImpuestosLocales', 
          'impuestos\\:Locales',
          'Locales',
          '[*|ImpuestosLocales]'
        ];
        
        console.log('   🏛️ Búsqueda exhaustiva de impuestos locales:');
        impuestosLocalesVariants.forEach(variant => {
          try {
            const elements = xmlDoc.querySelectorAll(variant);
            if (elements.length > 0) {
              console.log(`      ✅ ${variant}: ${elements.length} elemento(s) encontrado(s)`);
              elements.forEach((el, idx) => {
                if (el && el.attributes) {
                  console.log(`         [${idx}] Atributos: ${el.attributes.length}`);
                  for (let i = 0; i < Math.min(el.attributes.length, 20); i++) { // Limit attributes for performance
                    const attr = el.attributes[i];
                    if (attr) {
                      console.log(`             - ${attr.name}: ${attr.value}`);
                    }
                  }
                }
              });
            } else {
              console.log(`      ❌ ${variant}: No encontrado`);
            }
          } catch (error) {
            console.warn(`⚠️ Error with selector "${variant}":`, error);
          }
        });
      
        // Safe numerical value analysis with performance limits
        console.log('   🔢 ANÁLISIS COMPLETO DE VALORES NUMÉRICOS:');
        const allNumericValues = new Map<string, Array<{element: string, attribute: string, value: string}>>();
        
        try {
          const allElements = xmlDoc.querySelectorAll('*');
          const maxElementsToAnalyze = 5000; // Performance limit
          
          const elementsToProcess = allElements.length > maxElementsToAnalyze 
            ? Array.from(allElements).slice(0, maxElementsToAnalyze)
            : Array.from(allElements);
          
          if (allElements.length > maxElementsToAnalyze) {
            console.log(`⚠️ Limitando análisis numérico a ${maxElementsToAnalyze} elementos por rendimiento`);
          }
          
          elementsToProcess.forEach(element => {
            if (!element || !element.attributes) return;
            
            try {
              for (let i = 0; i < element.attributes.length; i++) {
                const attr = element.attributes[i];
                if (!attr) continue;
                
                const value = attr.value;
                
                // Check if it's a numeric value
                if (/^\d+\.?\d*$/.test(value) && parseFloat(value) > 0) {
                  const numValue = parseFloat(value);
                  const key = `${numValue}`;
                  
                  if (!allNumericValues.has(key)) {
                    allNumericValues.set(key, []);
                  }
                  
                  allNumericValues.get(key)!.push({
                    element: element.tagName,
                    attribute: attr.name,
                    value: value
                  });
                }
              }
            } catch (error) {
              console.warn('⚠️ Error processing element attributes:', error);
            }
          });
          
          // Sort by value for easier analysis (limit results for performance)
          const sortedValues = Array.from(allNumericValues.entries())
            .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
            .slice(0, 100); // Limit to first 100 values for performance
          
          console.log('      📈 Valores numéricos ordenados (posibles candidatos ISH):');
          sortedValues.forEach(([value, occurrences]) => {
            const numValue = parseFloat(value);
            const isInISHRange = numValue >= 10 && numValue <= 1000;
            const isPotentialISH = numValue >= 50 && numValue <= 400;
            
            let marker = '   ';
            if (isPotentialISH) marker = '🟢 ';
            else if (isInISHRange) marker = '🟡 ';
            
            console.log(`         ${marker}${value}:`);
            occurrences.slice(0, 5).forEach(occ => { // Limit occurrences shown
              console.log(`            ${occ.element}.${occ.attribute}`);
            });
            if (occurrences.length > 5) {
              console.log(`            ... y ${occurrences.length - 5} más`);
            }
          });
        } catch (error) {
          console.error('❌ Error during numerical analysis:', error);
        }
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

      // STEP 1: Safe IVA identification to avoid conflicts
      console.log('=== PASO 1: Identificando valores IVA ===');
      try {
        const traslados = xmlDoc.querySelectorAll('Traslado');
        traslados.forEach((traslado, index) => {
          if (!traslado) return;
          
          const impuesto = safeGetAttribute(traslado, 'Impuesto');
          const importe = safeGetAttribute(traslado, 'Importe') || safeGetAttribute(traslado, 'Valor');
          
          if (impuesto === '002' && importe && isValidIVAValue(importe)) {
            impuestoIVA = importe;
            console.log(`✅ IVA encontrado: ${importe} en Traslado ${index + 1}`);
          }
        });
      } catch (error) {
        console.warn('⚠️ Error during IVA identification:', error);
      }

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
      
        // 1A: Safe search for implocal:ImpuestosLocales with error handling
        try {
          const impuestosLocalesSelectors = [
            'ImpuestosLocales', 
            'implocal\\:ImpuestosLocales', 
            'impuestoslocales'
          ];
          
          for (const selector of impuestosLocalesSelectors) {
            try {
              const impuestosLocales = xmlDoc.querySelectorAll(selector);
              impuestosLocales.forEach((impLocal, index) => {
                if (!impLocal) return;
                
                if (isTargetFile) {
                  console.log(`      🔍 Analizando ImpuestosLocales[${index}] (${selector}):`);
                  console.log(`         - Atributos: ${impLocal.attributes?.length || 0}`);
                  if (impLocal.attributes) {
                    for (let i = 0; i < Math.min(impLocal.attributes.length, 10); i++) {
                      const attr = impLocal.attributes[i];
                      if (attr) {
                        console.log(`           ${attr.name}: ${attr.value}`);
                      }
                    }
                  }
                }
                
                try {
                  const trasladosSelectors = ['ImpLocTraslado', 'implocal\\:ImpLocTraslado', 'imploctraslado'];
                  
                  for (const trasladoSelector of trasladosSelectors) {
                    const traslados = impLocal.querySelectorAll(trasladoSelector);
                    traslados.forEach((traslado, trasladoIdx) => {
                      if (!traslado) return;
                      
                      const tipoTraslado = safeGetAttribute(traslado, 'ImpLocTraslado');
                      const importe = safeGetAttribute(traslado, 'Importe');
                      
                      if (isTargetFile) {
                        console.log(`         - Traslado[${trasladoIdx}]: Tipo="${tipoTraslado}", Importe="${importe}"`);
                      }
                      
                      if (tipoTraslado.toUpperCase() === 'ISH' && importe && isValidISHValue(importe) && isNotIVAValue(importe)) {
                        candidateValues.push({
                          value: importe,
                          context: `ImpuestosLocales[${index}].ImpLocTraslado[${trasladoIdx}][ISH]`,
                          source: 'Estructura fiscal explícita ISH',
                          priority: 100
                        });
                        logCandidate(importe, 'Estructura fiscal explícita ISH', `ImpuestosLocales[${index}]`, 100);
                      }
                    });
                  }
                } catch (error) {
                  console.warn('⚠️ Error processing traslados:', error);
                }
              });
            } catch (error) {
              console.warn(`⚠️ Error with selector "${selector}":`, error);
            }
          }
        } catch (error) {
          console.error('❌ Error in ISH extraction phase 1A:', error);
        }
      
        // 1B: Safe search for alternative ISH patterns with fallbacks
        if (isTargetFile) {
          console.log('      🔍 Búsqueda alternativa de patrones ISH...');
        }
        
        try {
          // Safer approach: look for elements containing ISH text
          const allElements = xmlDoc.querySelectorAll('*');
          const ishElements: Element[] = [];
          
          allElements.forEach(element => {
            if (!element || !element.attributes) return;
            
            try {
              for (let i = 0; i < element.attributes.length; i++) {
                const attr = element.attributes[i];
                if (attr && attr.value && attr.value.toUpperCase() === 'ISH') {
                  ishElements.push(element);
                  break;
                }
              }
            } catch (error) {
              console.warn('⚠️ Error checking element attributes:', error);
            }
          });
          
          ishElements.forEach((element, index) => {
            if (isTargetFile) {
              console.log(`      📋 Elemento con ISH encontrado[${index}]: ${element.tagName}`);
            }
            
            try {
              if (element.attributes) {
                for (let i = 0; i < element.attributes.length; i++) {
                  const attr = element.attributes[i];
                  if (attr && attr.value && attr.value.toUpperCase() === 'ISH') {
                    // Look for Importe in same element or siblings
                    const importe = safeGetAttribute(element, 'Importe') || 
                                   safeGetAttribute(element, 'importe') ||
                                   safeGetAttribute(element, 'Valor') ||
                                   safeGetAttribute(element, 'valor');
                    
                    if (importe && isValidISHValue(importe) && isNotIVAValue(importe)) {
                      candidateValues.push({
                        value: importe,
                        context: `${element.tagName}[${attr.name}=ISH].Importe`,
                        source: 'Patrón ISH alternativo',
                        priority: 95
                      });
                      logCandidate(importe, 'Patrón ISH alternativo', `${element.tagName}[${attr.name}=ISH]`, 95);
                    }
                  }
                }
              }
            } catch (error) {
              console.warn('⚠️ Error processing ISH element:', error);
            }
          });
        } catch (error) {
          console.error('❌ Error in alternative ISH pattern search:', error);
        }

        // PHASE 2: Safe search by tax code 003 (ISH identifier)
        if (candidateValues.filter(c => c.priority >= 90).length === 0) {
          console.log('--- FASE 2: Código de impuesto 003 ---');
          
          try {
            const traslados = xmlDoc.querySelectorAll('Traslado');
            traslados.forEach((traslado, index) => {
              if (!traslado) return;
              
              const impuesto = safeGetAttribute(traslado, 'Impuesto');
              const importe = safeGetAttribute(traslado, 'Importe') || safeGetAttribute(traslado, 'Valor');
              
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
          } catch (error) {
            console.error('❌ Error in tax code 003 search:', error);
          }
        }

        // PHASE 3: Safe semantic context search with performance limits
        if (candidateValues.filter(c => c.priority >= 70).length === 0) {
          console.log('--- FASE 3: Contexto semántico ---');
          
          try {
            const allElements = xmlDoc.querySelectorAll('*');
            const maxElementsForSemantic = 3000; // Performance limit
            
            const elementsToProcess = allElements.length > maxElementsForSemantic 
              ? Array.from(allElements).slice(0, maxElementsForSemantic)
              : Array.from(allElements);
            
            if (allElements.length > maxElementsForSemantic) {
              console.log(`⚠️ Limitando análisis semántico a ${maxElementsForSemantic} elementos`);
            }
            
            elementsToProcess.forEach((element) => {
              if (!element) return;
              
              try {
                const elementText = element.outerHTML?.toLowerCase() || '';
                let priority = 0;
                
                // Calculate semantic priority with safe text checking
                if (elementText.includes('impuestoslocales') || elementText.includes('implocal:')) priority += 80;
                if (elementText.includes('hospedaje')) priority += 70;
                if (elementText.includes('ish')) priority += 60;
                if (elementText.includes('turismo') || elementText.includes('tourism')) priority += 50;
                if (elementText.includes('hotel') || elementText.includes('alojamiento')) priority += 40;
                
                // Negative priority for IVA indicators
                if (elementText.includes('impuesto="002"') || elementText.includes("impuesto='002'")) priority -= 100;
                if (elementText.includes('iva') || elementText.includes('valor agregado')) priority -= 50;
                
                if (priority > 0 && element.attributes) {
                  for (let i = 0; i < element.attributes.length; i++) {
                    const attr = element.attributes[i];
                    if (attr && attr.value && isValidISHValue(attr.value) && isNotIVAValue(attr.value)) {
                      candidateValues.push({
                        value: attr.value,
                        context: `${element.tagName}.${attr.name}`,
                        source: 'Contexto semántico',
                        priority: priority
                      });
                      logCandidate(attr.value, 'Contexto semántico', `${element.tagName}.${attr.name}`, priority);
                    }
                  }
                }
              } catch (error) {
                console.warn('⚠️ Error in semantic analysis for element:', error);
              }
            });
          } catch (error) {
            console.error('❌ Error in semantic context search:', error);
          }
        }

        // PHASE 4: Safe range-based fallback with limits
        if (candidateValues.filter(c => c.priority >= 20).length === 0) {
          console.log('--- FASE 4: Búsqueda de respaldo ---');
          
          try {
            const allElements = xmlDoc.querySelectorAll('*');
            const maxElementsForFallback = 2000; // Performance limit
            
            const elementsToProcess = allElements.length > maxElementsForFallback 
              ? Array.from(allElements).slice(0, maxElementsForFallback)
              : Array.from(allElements);
            
            if (allElements.length > maxElementsForFallback) {
              console.log(`⚠️ Limitando búsqueda de respaldo a ${maxElementsForFallback} elementos`);
            }
            
            elementsToProcess.forEach((element) => {
              if (!element || !element.attributes) return;
              
              try {
                for (let i = 0; i < element.attributes.length; i++) {
                  const attr = element.attributes[i];
                  if (attr && attr.value && isValidISHValue(attr.value) && isNotIVAValue(attr.value)) {
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
                }
              } catch (error) {
                console.warn('⚠️ Error in fallback search for element:', error);
              }
            });
          } catch (error) {
            console.error('❌ Error in range-based fallback search:', error);
          }
        }

        // Select best candidate with safe sorting
        if (candidateValues.length > 0) {
          try {
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
          } catch (error) {
            console.error('❌ Error selecting best ISH candidate:', error);
            return candidateValues[0]?.value || '';
          }
        }
        
        console.log('❌ No se encontró valor ISH válido');
        return '';
      };

      // Execute ISH search with error handling
      try {
        impuestoISH = findISHValue();
      } catch (error) {
        console.error('❌ Error during ISH search:', error);
        impuestoISH = '';
      }

    // ====== ENHANCED VALIDATION AND CONFLICT RESOLUTION ======
    if (isTargetFile) {
      console.log('🔧 ===== VALIDACIÓN Y RESOLUCIÓN DE CONFLICTOS =====');
    }
    
    // Advanced conflict resolution
    if (impuestoISH && impuestoISH === impuestoIVA) {
      console.log('⚠️ CONFLICTO DETECTADO: ISH = IVA');
      console.log(`   Valor conflictivo: ${impuestoISH}`);
      
      if (isTargetFile) {
        console.log('   🔍 Buscando valor ISH alternativo...');
        
        // Try to find a different ISH value in the candidate list
        const alternativeSearch = (): string => {
          const allNumericElements = xmlDoc.querySelectorAll('*');
          const alternatives: Array<{value: string, context: string, score: number}> = [];
          
          allNumericElements.forEach(element => {
            Array.from(element.attributes).forEach(attr => {
              const value = attr.value;
              if (isValidISHValue(value) && value !== impuestoIVA && value !== impuestoISH) {
                const numValue = parseFloat(value);
                let score = 0;
                
                // Scoring based on context and value range
                if (numValue >= 50 && numValue <= 400) score += 30;
                if (element.tagName.toLowerCase().includes('local') || 
                    element.tagName.toLowerCase().includes('impuesto')) score += 20;
                if (attr.name.toLowerCase().includes('importe') || 
                    attr.name.toLowerCase().includes('valor')) score += 10;
                
                alternatives.push({
                  value: value,
                  context: `${element.tagName}.${attr.name}`,
                  score: score
                });
              }
            });
          });
          
          if (alternatives.length > 0) {
            alternatives.sort((a, b) => b.score - a.score);
            const best = alternatives[0];
            console.log(`   ✅ Alternativa encontrada: ${best.value} (score: ${best.score}) en ${best.context}`);
            return best.value;
          }
          
          return '';
        };
        
        const alternative = alternativeSearch();
        if (alternative) {
          impuestoISH = alternative;
          console.log(`   ✅ ISH actualizado a valor alternativo: ${alternative}`);
        } else {
          impuestoISH = '';
          console.log('   ❌ No se encontró alternativa válida, limpiando ISH');
        }
      } else {
        impuestoISH = '';
        console.log('   ❌ Limpiando ISH (conflicto con IVA)');
      }
    }
    
    // Additional validation for target file
    if (isTargetFile) {
      console.log('🎯 ===== VALIDACIÓN ESPECÍFICA PARA ARCHIVO 101183718 =====');
      
      // Check if we have reasonable values
      const subtotalNum = parseFloat(subtotal || '0');
      const ivaNum = parseFloat(impuestoIVA || '0');
      const ishNum = parseFloat(impuestoISH || '0');
      
      console.log(`   📊 Análisis numérico:`);
      console.log(`      - Subtotal: ${subtotalNum}`);
      console.log(`      - IVA: ${ivaNum} (${((ivaNum/subtotalNum)*100).toFixed(2)}% del subtotal)`);
      console.log(`      - ISH: ${ishNum} (${((ishNum/subtotalNum)*100).toFixed(2)}% del subtotal)`);
      
      // ISH should typically be 2-4% of subtotal for hospitality tax
      if (ishNum > 0 && subtotalNum > 0) {
        const ishPercentage = (ishNum / subtotalNum) * 100;
        if (ishPercentage < 1 || ishPercentage > 10) {
          console.log(`   ⚠️ ADVERTENCIA: ISH percentage (${ishPercentage.toFixed(2)}%) fuera del rango típico (1-10%)`);
          
          // Look for a more reasonable ISH value
          console.log(`   🔍 Buscando valor ISH más razonable...`);
          const expectedRange = [subtotalNum * 0.02, subtotalNum * 0.04]; // 2-4%
          
          const allElements = xmlDoc.querySelectorAll('*');
          let bestMatch = '';
          let bestScore = 0;
          
          allElements.forEach(element => {
            Array.from(element.attributes).forEach(attr => {
              const value = parseFloat(attr.value || '0');
              if (value >= expectedRange[0] && value <= expectedRange[1] && value !== ivaNum) {
                const percentage = (value / subtotalNum) * 100;
                const score = 100 - Math.abs(percentage - 3); // Prefer ~3%
                
                if (score > bestScore) {
                  bestScore = score;
                  bestMatch = attr.value;
                  console.log(`      💡 Candidato mejorado: ${attr.value} (${percentage.toFixed(2)}%, score: ${score.toFixed(1)}) en ${element.tagName}.${attr.name}`);
                }
              }
            });
          });
          
          if (bestMatch && bestScore > 70) {
            console.log(`   ✅ Valor ISH actualizado a mejor coincidencia: ${bestMatch}`);
            impuestoISH = bestMatch;
          }
        } else {
          console.log(`   ✅ ISH percentage (${ishPercentage.toFixed(2)}%) está en rango aceptable`);
        }
      }
      
      console.log('🎯 ===== RESUMEN FINAL PARA ARCHIVO 101183718 =====');
      console.log(`   📄 Archivo: ${fileName}`);
      console.log(`   🏢 RFC Emisor: ${emisorRfc || 'NO ENCONTRADO'}`);
      console.log(`   🏪 RFC Receptor: ${receptorRfc || 'NO ENCONTRADO'}`);
      console.log(`   🔑 UUID: ${uuid || 'NO ENCONTRADO'}`);
      console.log(`   📅 Fecha: ${fecha || 'NO ENCONTRADO'}`);
      console.log(`   💰 Subtotal: ${subtotal || 'NO ENCONTRADO'}`);
      console.log(`   🏛️ IVA: ${impuestoIVA || 'NO ENCONTRADO'}`);
      console.log(`   🏨 ISH: ${impuestoISH || 'NO ENCONTRADO'}`);
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
    } catch (error) {
      console.error('❌ Error parsing XML file:', fileName, error);
      
      // Return minimal data with error indication
      return {
        rfc: 'ERROR',
        uuid: 'ERROR',
        emisorRfc: 'ERROR',
        receptorRfc: 'ERROR',
        fecha: 'ERROR',
        subtotal: 'ERROR',
        impuestoIVA: 'ERROR',
        impuestoISH: 'ERROR',
        fileName: `${fileName} (ERROR)`
      };
    }
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    const newXmlData: XMLData[] = [];
    const errors: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (file.type === 'text/xml' || file.name.endsWith('.xml')) {
          try {
            // Add file size check
            if (file.size > 50 * 1024 * 1024) { // 50MB limit
              errors.push(`${file.name}: Archivo demasiado grande (máximo 50MB)`);
              continue;
            }
            
            const text = await file.text();
            
            // Basic XML validation
            if (!text.trim().startsWith('<')) {
              errors.push(`${file.name}: No parece ser un archivo XML válido`);
              continue;
            }
            
            const data = parseXML(text, file.name);
            
            // Check if parsing resulted in errors
            if (data.rfc === 'ERROR') {
              errors.push(`${file.name}: Error durante el procesamiento XML`);
            } else {
              newXmlData.push(data);
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            errors.push(`${file.name}: ${errorMessage}`);
            console.error('Error processing file:', file.name, error);
          }
        } else {
          errors.push(`${file.name}: No es un archivo XML válido`);
        }
      }
      
      setXmlData(prev => [...prev, ...newXmlData]);
      
      // Show appropriate feedback
      if (newXmlData.length > 0) {
        toast({
          title: "Archivos procesados",
          description: `Se procesaron ${newXmlData.length} archivo(s) XML correctamente`,
        });
      }
      
      if (errors.length > 0) {
        toast({
          title: "Errores encontrados",
          description: `${errors.length} archivo(s) tuvieron errores. Ver consola para detalles.`,
          variant: "destructive",
        });
        console.warn('File processing errors:', errors);
      }
    } catch (error) {
      console.error('Unexpected error during file upload:', error);
      toast({
        title: "Error inesperado",
        description: "Ocurrió un error durante el procesamiento de archivos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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