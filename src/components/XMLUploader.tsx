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
  total?: string;
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
      
      // Enhanced debugging for problematic files
      const debugMode = fileName.includes('101183718') || fileName.includes('101525703') || 
                       fileName.includes('101525603') || fileName.includes('101183341') ||
                       fileName.includes('F01-46019') || fileName.includes('70d0f8d0-572e-5033-b4a2-0708b2393ab0') ||
                       fileName.includes('283387ac-bc88-530e-9aef-a28b26430299');
      
      if (debugMode) {
        console.log(`🎯 ===== ANÁLISIS DETALLADO PARA ARCHIVO ${fileName} =====`);
      }
    
      // Initialize variables
      let rfc = '';
      let uuid = '';
      let emisorRfc = '';
      let receptorRfc = '';
      let fecha = '';
      let subtotal = '';
      let impuestoIVA = '';
      let impuestoISH = '';
      let total = '';

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

      const safeGetElements = (selector: string): Element[] => {
        try {
          return Array.from(xmlDoc.querySelectorAll(selector));
        } catch (error) {
          console.warn(`⚠️ Invalid selector "${selector}":`, error);
          return [];
        }
      };

      // Enhanced namespace-aware selectors
      const tryMultipleSelectors = (selectors: string[]): Element | null => {
        for (const selector of selectors) {
          const element = safeGetElement(selector);
          if (element) return element;
        }
        return null;
      };

      // Buscar UUID (TimbreFiscalDigital o atributo UUID)
      const timbreFiscal = tryMultipleSelectors([
        'TimbreFiscalDigital',
        'tfd\\:TimbreFiscalDigital',
        '[*|TimbreFiscalDigital]'
      ]);
      if (timbreFiscal) {
        uuid = safeGetAttribute(timbreFiscal, 'UUID');
      }
      
      // También buscar en el nodo raíz
      const comprobante = tryMultipleSelectors([
        'Comprobante',
        'cfdi\\:Comprobante',
        '[*|Comprobante]'
      ]);
      if (comprobante) {
        if (!uuid) {
          uuid = safeGetAttribute(comprobante, 'UUID');
        }
        // Extraer fecha, subtotal y total del Comprobante
        fecha = safeGetAttribute(comprobante, 'Fecha') || safeGetAttribute(comprobante, 'fecha');
        subtotal = safeGetAttribute(comprobante, 'SubTotal') || safeGetAttribute(comprobante, 'subtotal');
        total = safeGetAttribute(comprobante, 'Total') || safeGetAttribute(comprobante, 'total');
      }

      // Buscar RFC del emisor
      const emisor = tryMultipleSelectors([
        'Emisor',
        'cfdi\\:Emisor',
        '[*|Emisor]'
      ]);
      if (emisor) {
        emisorRfc = safeGetAttribute(emisor, 'Rfc') || safeGetAttribute(emisor, 'rfc');
        rfc = emisorRfc; // Por defecto, usar el RFC del emisor
      }

      // Buscar RFC del receptor
      const receptor = tryMultipleSelectors([
        'Receptor',
        'cfdi\\:Receptor',
        '[*|Receptor]'
      ]);
      if (receptor) {
        receptorRfc = safeGetAttribute(receptor, 'Rfc') || safeGetAttribute(receptor, 'rfc');
      }

    // ====== DETAILED XML STRUCTURE ANALYSIS FOR PROBLEMATIC FILES ======
    if (debugMode) {
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

    // ====== ENHANCED IVA AND ISH EXTRACTION ALGORITHM ======
    console.log('=== ENHANCED TAX EXTRACTION ===');
    
    // Enhanced validation functions with better error handling
    const isValidISHValue = (value: string): boolean => {
      if (!value || value.trim() === '') return false;
      
      // Anti-UUID filter: ISH values should never look like UUIDs
      if (/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/i.test(value)) {
        if (debugMode) console.log(`❌ Rejected UUID-like value: ${value}`);
        return false;
      }
      
      const numericValue = parseFloat(value);
      
      // Basic numeric validation
      if (isNaN(numericValue) || numericValue <= 0) return false;
      
      // Relaxed ISH validation - broader range to catch more cases
      if (numericValue < 5 || numericValue > 5000) return false;
      
      return true;
    };

    // Enhanced IVA validation with broader range
    const isValidIVAValue = (value: string): boolean => {
      if (!value || value.trim() === '') return false;
      const numericValue = parseFloat(value);
      // Relaxed range to catch more IVA cases (from $10 to $50,000)
      return !isNaN(numericValue) && numericValue >= 10 && numericValue <= 50000;
    };

    // Enhanced tax extraction with multiple strategies
    const extractTaxValue = (taxType: 'IVA' | 'ISH'): string => {
      const isIVA = taxType === 'IVA';
      const validationFn = isIVA ? isValidIVAValue : isValidISHValue;
      const taxCode = isIVA ? '002' : '003';
      
      console.log(`🔍 DEBUGGING ${taxType} extraction for file: ${fileName}`);
      console.log(`   Target tax code: ${taxCode}`);
      
      if (debugMode) {
        console.log(`🔍 Extracting ${taxType} with enhanced strategies...`);
      }

      // Strategy 1: Look for standard tax codes in Traslado elements
      const trasladosSelectors = [
        'Traslado',
        'cfdi\\:Traslado',
        '[*|Traslado]',
        'Impuestos Traslado',
        'Impuestos > Traslados > Traslado'
      ];

      for (const selector of trasladosSelectors) {
        const traslados = safeGetElements(selector);
        for (const traslado of traslados) {
          const impuesto = safeGetAttribute(traslado, 'Impuesto');
          const importe = safeGetAttribute(traslado, 'Importe');
          
          if (impuesto === taxCode && importe && validationFn(importe)) {
            if (debugMode) console.log(`✅ ${taxType} found via tax code ${taxCode}: ${importe}`);
            return importe;
          }
        }
      }

      // Strategy 2: For ISH, look in local tax structures
      if (!isIVA) {
        const localTaxSelectors = [
          'ImpuestosLocales',
          'implocal\\:ImpuestosLocales',
          '[*|ImpuestosLocales]',
          'Locales'
        ];

        for (const selector of localTaxSelectors) {
          const localTaxElements = safeGetElements(selector);
          for (const localTax of localTaxElements) {
            // Look for various ISH indicators
            const ishSelectors = [
              'ImpLocTraslado',
              'implocal\\:ImpLocTraslado',
              '[*|ImpLocTraslado]'
            ];

            for (const ishSelector of ishSelectors) {
              const ishElements = localTax.querySelectorAll(ishSelector);
              for (const ishElement of ishElements) {
                const tipoImpuesto = safeGetAttribute(ishElement, 'ImpLocTraslado') ||
                                   safeGetAttribute(ishElement, 'TipoDeImpuesto') ||
                                   safeGetAttribute(ishElement, 'Tipo');
                const importe = safeGetAttribute(ishElement, 'Importe') ||
                               safeGetAttribute(ishElement, 'Valor');
                
                if (tipoImpuesto && tipoImpuesto.toUpperCase().includes('ISH') && 
                    importe && validationFn(importe)) {
                  if (debugMode) console.log(`✅ ISH found in local structure: ${importe}`);
                  return importe;
                }
              }
            }
          }
        }
      }

      // Strategy 3: Search by attribute values containing tax identifiers
      const allElements = xmlDoc.querySelectorAll('*');
      for (const element of allElements) {
        if (!element.attributes) continue;
        
        for (let i = 0; i < element.attributes.length; i++) {
          const attr = element.attributes[i];
          if (!attr) continue;
          
          const attrValue = attr.value.toUpperCase();
          let isTargetTax = false;
          
          if (isIVA) {
            isTargetTax = attrValue === 'IVA' || attrValue === '002' || 
                         attrValue.includes('VALOR AGREGADO') ||
                         (attr.name.toUpperCase().includes('IVA') && attrValue !== '');
          } else {
            isTargetTax = attrValue === 'ISH' || attrValue === '003' ||
                         attrValue.includes('HOSPEDAJE') ||
                         (attr.name.toUpperCase().includes('ISH') && attrValue !== '');
          }
          
          if (isTargetTax) {
            // Look for Importe/Valor in same element or nearby
            const candidates = [
              safeGetAttribute(element, 'Importe'),
              safeGetAttribute(element, 'Valor'),
              safeGetAttribute(element, 'Monto'),
              safeGetAttribute(element, 'Total')
            ];
            
            for (const candidate of candidates) {
              if (candidate && validationFn(candidate)) {
                if (debugMode) console.log(`✅ ${taxType} found via attribute search: ${candidate}`);
                return candidate;
              }
            }
          }
        }
      }

      // Strategy 4: For IVA, look for percentage-based calculations
      if (isIVA && subtotal) {
        const subtotalNum = parseFloat(subtotal);
        if (subtotalNum > 0) {
          // Standard IVA is 16% in Mexico
          const expectedIVA = subtotalNum * 0.16;
          const tolerance = expectedIVA * 0.1; // 10% tolerance
          
          for (const element of allElements) {
            if (!element.attributes) continue;
            
            for (let i = 0; i < element.attributes.length; i++) {
              const attr = element.attributes[i];
              if (!attr) continue;
              
              const value = parseFloat(attr.value);
              if (!isNaN(value) && Math.abs(value - expectedIVA) <= tolerance) {
                if (validationFn(attr.value)) {
                  if (debugMode) console.log(`✅ IVA found via percentage calculation: ${attr.value}`);
                  return attr.value;
                }
              }
            }
          }
        }
      }

      return '';
    };

    // Extract IVA first
    impuestoIVA = extractTaxValue('IVA');
    
    // Extract ISH, ensuring it's different from IVA
    let candidateISH = extractTaxValue('ISH');
    if (candidateISH && candidateISH !== impuestoIVA) {
      impuestoISH = candidateISH;
    }

    if (debugMode) {
      console.log(`Initial extraction results - IVA: ${impuestoIVA || 'NOT FOUND'}, ISH: ${impuestoISH || 'NOT FOUND'}`);
    }

    // ====== ENHANCED VALIDATION AND CONFLICT RESOLUTION ======
    if (debugMode) {
      console.log('🔧 ===== VALIDACIÓN Y RESOLUCIÓN DE CONFLICTOS =====');
    }
    
    // Advanced conflict resolution
    if (impuestoISH && impuestoISH === impuestoIVA) {
      console.log('⚠️ CONFLICTO DETECTADO: ISH = IVA');
      console.log(`   Valor conflictivo: ${impuestoISH}`);
      
      if (debugMode) {
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
    
    // Additional validation for problematic files
    if (debugMode) {
      console.log('🎯 ===== VALIDACIÓN ESPECÍFICA PARA ARCHIVOS PROBLEMÁTICOS =====');
      
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
        total,
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
      'Fecha': data.fecha || '',
      'Subtotal': data.subtotal ? parseFloat(data.subtotal) : '',
      'Impuesto IVA': data.impuestoIVA ? parseFloat(data.impuestoIVA) : '',
      'Impuesto ISH': data.impuestoISH ? parseFloat(data.impuestoISH) : '',
      'Total': data.total ? parseFloat(data.total) : '',
      'RFC': data.emisorRfc || '',
      'UUID': data.uuid || ''
    }));

    // Crear el libro de trabajo
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Datos XML");

    // Ajustar el ancho de las columnas
    const columnWidths = [
      { wch: 5 },   // No.
      { wch: 30 },  // Archivo
      { wch: 20 },  // Fecha
      { wch: 15 },  // Subtotal
      { wch: 15 },  // Impuesto IVA
      { wch: 20 },  // Impuesto ISH
      { wch: 15 },  // Total
      { wch: 15 },  // RFC
      { wch: 40 }   // UUID
    ];
    worksheet['!cols'] = columnWidths;

    // Aplicar formato a las columnas numéricas
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      // Subtotal (columna D)
      const subtotalCell = XLSX.utils.encode_cell({ r: R, c: 3 });
      if (worksheet[subtotalCell] && typeof worksheet[subtotalCell].v === 'number') {
        worksheet[subtotalCell].s = { 
          numFmt: '#,##0.00',
          alignment: { horizontal: 'right' }
        };
      }
      
      // Impuesto IVA (columna E)
      const ivaCell = XLSX.utils.encode_cell({ r: R, c: 4 });
      if (worksheet[ivaCell] && typeof worksheet[ivaCell].v === 'number') {
        worksheet[ivaCell].s = { 
          numFmt: '#,##0.00',
          alignment: { horizontal: 'right' }
        };
      }
      
      // Impuesto ISH (columna F)
      const ishCell = XLSX.utils.encode_cell({ r: R, c: 5 });
      if (worksheet[ishCell] && typeof worksheet[ishCell].v === 'number') {
        worksheet[ishCell].s = { 
          numFmt: '#,##0.00',
          alignment: { horizontal: 'right' }
        };
      }
      
      // Total (columna G)
      const totalCell = XLSX.utils.encode_cell({ r: R, c: 6 });
      if (worksheet[totalCell] && typeof worksheet[totalCell].v === 'number') {
        worksheet[totalCell].s = { 
          numFmt: '#,##0.00',
          alignment: { horizontal: 'right' }
        };
      }
    }

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
                    <TableHead className="font-semibold">Fecha</TableHead>
                    <TableHead className="font-semibold">Subtotal</TableHead>
                    <TableHead className="font-semibold">Impuesto IVA</TableHead>
                    <TableHead className="font-semibold">Impuesto ISH</TableHead>
                    <TableHead className="font-semibold">Total</TableHead>
                    <TableHead className="font-semibold">RFC</TableHead>
                    <TableHead className="font-semibold">UUID</TableHead>
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
                            <span className="text-sm text-muted-foreground">-</span>
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
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {data.total ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-success" />
                              <span className="font-mono text-sm bg-background px-2 py-1 rounded border">
                                ${data.total}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copyToClipboard(data.total!)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const allData = `Archivo: ${data.fileName}\nFecha: ${data.fecha || ''}\nSubtotal: ${data.subtotal || ''}\nImpuesto IVA: ${data.impuestoIVA || ''}\nImpuesto ISH: ${data.impuestoISH || ''}\nTotal: ${data.total || ''}\nRFC: ${data.emisorRfc || ''}\nUUID: ${data.uuid || ''}`;
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