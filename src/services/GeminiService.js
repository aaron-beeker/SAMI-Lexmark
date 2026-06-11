// src/services/GeminiService.js

// Function to resolve Gemini API Key either from env or runtime localStorage
function getApiKey() {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && envKey !== "TU_API_KEY_DE_GEMINI_AQUI" && envKey.trim() !== "") {
    return envKey;
  }
  return localStorage.getItem("sami_gemini_api_key") || "";
}

async function fetchWithRetry(url, options, retries = 5, delay = 1000) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`HTTP Error: ${response.status} - ${errorBody}`);
    }
    return await response.json();
  } catch (error) {
    if (retries <= 0) throw error;
    console.warn(`Gemini request failed. Retrying in ${delay}ms... (Retries left: ${retries})`, error);
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(url, options, retries - 1, delay * 2);
  }
}

async function callGeminiAPI(parts) {
  const key = getApiKey();
  if (!key) {
    throw new Error("API Key de Gemini no configurada. Por favor ingrésela en los Ajustes.");
  }

  // Se añade una lista de modelos candidatos para tolerancia a fallos (503 Service Unavailable / High Demand)
  const models = ["gemini-1.5-flash", "gemini-flash-latest", "gemini-1.5-flash-8b"];
  let lastError = null;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const payload = {
      contents: [{ parts }]
    };

    try {
      console.log(`Intentando llamada Gemini con el modelo: ${model}`);
      const responseData = await fetchWithRetry(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-goog-api-key": key
        },
        body: JSON.stringify(payload)
      });
      
      const rawText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        return rawText;
      }
      throw new Error("La respuesta de la API de Gemini está vacía.");
    } catch (error) {
      console.warn(`El modelo ${model} falló o está sobrecargado: ${error.message}. Intentando siguiente candidato...`);
      lastError = error;
    }
  }

  throw new Error(`Error en los servidores de Gemini (503/Indisponible): ${lastError?.message || "No se pudo obtener respuesta de ningún modelo candidato."}`);
}

export async function analizarEvidenciaSuministros(mensajeTexto, adjuntos = [], impresorasRegistradas = []) {
  const promptSistema = `
    Eres el motor analítico y gestor de base de datos de SAMI-Lexmark para el Hospital Cayetano Heredia.
    Tu tarea es procesar el texto ingresado o la imagen de pantalla proporcionada para determinar la ACCIÓN requerida sobre el inventario de impresoras o el inventario de repuestos/stock.
    
    Identifica el tipo de operación:
    1. "crear": Si el usuario pide agregar, registrar, dar de alta, crear o añadir una nueva impresora.
    2. "eliminar": Si el usuario pide explícitamente eliminar, borrar, retirar o dar de baja una impresora.
    3. "actualizar": Si se reporta un cambio de suministros, una lectura, mantenimiento, cambio de ubicación o observaciones para una impresora existente.
    4. "actualizar_stock": Si se reporta o se muestra en una foto el conteo de repuestos de TÓNER, UNIDAD DE IMAGEN o KIT DE MANTENIMIENTO disponibles.
    5. "actualizar_multiples": Si el usuario proporciona una lista, tabla, texto copiado, o reporte de múltiples impresoras con sus series/modelos/áreas/IPs para registrar o actualizar de forma masiva en lote.
    6. "conversar": Si el usuario te hace una pregunta general, consulta sobre el estado, estadísticas o listado de impresoras del inventario (por ejemplo, cuáles están duplicadas por número de serie, modelo, IP, o área), te saluda, o te pide información detallada sobre la base de datos de impresoras proporcionada.
       - Identifica la cantidad que va para el "hospital" (para cambio rápido/cambio rápido) y para el "depósito" (almacén/abastecer).
       - Normaliza el modelo: si dice "431" asume "MX431ADN", si dice "632" asume "MX632ADWE", si dice "722" asume "MX722ADHE".
       - Identifica el tipo de insumo: "toner" (tóner/cartucho negro), "unidad_imagen" (unidad de imagen/tambor/drum), o "mantenimiento" (kit de mantenimiento/fusi).
 
    EXTRACCIÓN DE CONSUMIBLES:
    - Extrae el nivel de "toner_nivel" (porcentajes de cartucho negro), "unidad_imagen_nivel" (porcentajes de unidad de imagen) y "mantenimiento_kit_nivel" (porcentajes de kit mantenimiento) de la imagen o del texto. Si no aparecen explícitamente, ponlos como null.
    
    EXTRACCIÓN DE LA DIRECCIÓN IP:
    - Si se especifica una dirección IP válida (ej: "192.168.24.120"), colócala en el campo "ip".
    - Si se indica explícitamente "USB" o "Cableado por USB", establece el campo "ip" como "USB".
    - Si no se especifica ninguna dirección IP ni se menciona "USB" (es decir, está vacío o no determinado), establece el campo "ip" como null.
    
    REGLAS VISUALES PARA ESTIMAR NIVELES DE SUMINISTROS (MUY IMPORTANTE):
    - En las imágenes de reportes impresos de estadísticas, los consumibles se muestran en 3 secciones separadas y ordenadas:
      1. **Cartucho negro** (Tóner): Usa la primera barra de progreso.
      2. **Kit mantenimiento** (Fuser/Kit de mantenimiento): Usa la segunda barra de progreso.
      3. **Unidad imagen** (Unidad de imagen/Tambor): Usa la tercera barra de progreso.
    - Determina el nivel (%) basándote ÚNICAMENTE en la barra de progreso correspondiente de cada sección (color negro o relleno representa el nivel restante):
      - Una barra completamente negra/rellena representa el 100%.
      - Una barra con color negro/relleno hasta la mitad representa el 50%.
      - Una barra muy corta representa el 10% al 20% (ej. si la barra de Cartucho Negro está muy corta, es ~18%).
    - PROHIBIDO: NUNCA intentes calcular el nivel dividiendo "Caras por consumible" entre "Capacidad" ni usando otras estadísticas numéricas de la página. Esas cifras son contadores históricos de páginas impresas y no se corresponden con el nivel actual de la barra. Guíate estrictamente por la proporción visual de relleno negro de cada barra.
    - Si al lado o dentro de la barra hay un texto numérico con porcentaje (ej: 40%), dale prioridad absoluta a ese número. Si no hay número, estima visualmente basándote en la regla de proporcionalidad anterior.
 
    
    IDENTIFICACIÓN POR SUFIJO DE SERIE (Muy Importante):
    - Los técnicos a menudo se refieren a las impresoras utilizando únicamente los últimos 4 dígitos de su número de serie (ej: "FD8C", "FD89", "d8wz"). Si detectas que se refieren a una impresora por estos 4 dígitos de sufijo, extráelos tal cual en el campo "id_serie".
    
    INTERCAMBIO DE COMPONENTES (Swapping):
    - Si el texto o la imagen indica que se retiró un componente (como tóner, unidad de imagen o pieza de repuesto) de una impresora y se colocó en otra (ej: "Se sacó de d8wz y se puso en FD89"), la operación es de tipo "actualizar".
    - El "id_serie" principal de la acción debe ser la impresora de DESTINO (la que recibe el componente, en este ejemplo "FD89").
    - En el campo "observaciones", debes registrar claramente el intercambio indicando el origen (ej: "Se instaló componente retirado de la impresora S/N: d8wz").
    
    Reglas para Ubicación de Impresora (ubicacion_entidad):
    - Si se menciona "MUR", "taller de MUR", "oficinas de MUR", establece "ubicacion_entidad" en "MUR".
    - Si se menciona cualquier área del hospital (como "Telecomunicaciones", "Admisión", "Informática", o "Soporte"), o si no se menciona una ubicación explícitamente, establece "ubicacion_entidad" en "Hospital". (El área de "Soporte" se considera dentro del "Hospital").
 
    EXTRACCIÓN DEL ÁREA (Importante):
    - Si el usuario no indica un número de serie pero especifica un área en el texto o descripción (ej: "Oncología", "Admisión 10", "Cardiología"), debes extraer este nombre del área y colocarlo en el campo "area_actual". No dejes el JSON vacío si puedes identificar el área.
 
    REGLAS IMPORTANTES PARA EL CAMPO "observaciones":
    - Queda estrictamente prohibido colocar información sobre consumibles, niveles, cambio, instalación o compra de repuestos (tóner, unidad de imagen, kit de mantenimiento, etc.) en el campo "observaciones", ya que para esa información ya existen los campos específicos correspondientes en la vista del sistema.
    - ÚNICAMENTE escribe en el campo "observaciones" si el usuario lo solicita explícitamente en su mensaje, o si la foto muestra un fallo físico, código de error en pantalla, o incidente explícito de funcionamiento o mantenimiento mecánico.
    - Los únicos temas y formatos permitidos para ir en "observaciones" son fallos mecánicos/físicos, de configuración o de mantenimiento técnico general. Por ejemplo:
      * "Se traba al escanear, se sale la hoja blanca para el escaneo."
      * "Necesita mantenimiento."
      * "Necesita mantenimiento, está sucia."
      * "Problemas con la bandeja 02, necesita llenarse en ambos lados de hojas para imprimir."
      * "Demora en imprimir." (Omitir cualquier mención de consumibles como 'bajo de tinta' o 'toner').
      * "Al usar el escaneo, se desconfigura."
      * "Atasco al imprimir y la función de imprimir doble cara solo funciona una."
      * "Se atasca el papel."
      * "Por momentos se apaga sola, código 111.32a."
      * "Imprime pero tiene detalles a solucionar."
      * "Necesita mantenimiento/BANDEJA 1 ANULADA X CONSTANTES ATASCOS DE PAPEL."
      * "inoperativa /traqueteo y atascos / traqueteo, sonido fuerte, atascos de papel."
      * "Inoperativa /SIN GARANTÍA."
      * "operativa" o "Inoperativa".
      * "Inoperativa Presenta atascos constantes, tiene problemas se atasca duplex."
    - Si el mensaje o imagen reporta fallas mixtas (ej: "Presenta atascos constantes, tiene problemas se atasca duplex y kit de mantenimiento"), debes remover por completo la referencia a consumibles y colocar solo la parte del fallo físico (ej: "Presenta atascos constantes, tiene problemas se atasca duplex").
    - Si el mensaje o la evidencia no describe fallas físicas o incidentes operativos y solo describe niveles o reemplazos de consumibles/suministros, pon "observaciones" como una cadena vacía "".
 
    Especificaciones del JSON de respuesta según la acción:
 
    Para "crear" | "actualizar" | "eliminar":
    {
      "accion": "crear|actualizar|eliminar",
      "id_serie": "string",
      "modelo": "string",
      "area_actual": "string",
      "ubicacion_entidad": "Hospital|MUR",
      "ip": "string",
      "toner_nivel": number,
      "unidad_imagen_nivel": number,
      "mantenimiento_kit_nivel": number,
      "estado_funcionamiento": "Operativo|Inoperativo|Advertencia",
      "observaciones": "string",
      "codigo_caso_cas": "string"
    }
 
    Para "actualizar_multiples":
    {
      "accion": "actualizar_multiples",
      "impresoras": [
        {
          "id_serie": "string",
          "modelo": "string",
          "area_actual": "string",
          "ubicacion_entidad": "Hospital|MUR",
          "ip": "string", // "USB", un IP real, o null si está vacío/no especificado
          "toner_nivel": number, // opcional, null si no se especifica
          "unidad_imagen_nivel": number, // opcional, null si no se especifica
          "mantenimiento_kit_nivel": number, // opcional, null si no se especifica
          "estado_funcionamiento": "Operativo|Inoperativo|Advertencia", // opcional
          "observaciones": "string", // opcional
          "codigo_caso_cas": "string" // opcional
        }
      ]
    }
 
    Para "conversar":
    {
      "accion": "conversar",
      "respuesta_chat": "string" // Tu respuesta analítica y conversacional en formato Markdown en español. Responde con detalle a la consulta del usuario basándote en el inventario actual. Por ejemplo, si te pide impresoras duplicadas, identifícalas y detállalas por su S/N, modelo y área.
    }
 
    Para "actualizar_stock":
    {
      "accion": "actualizar_stock",
      "stock_updates": [
        {
          "modelo": "MX431ADN|MX632ADWE|MX722ADHE",
          "insumo": "toner|unidad_imagen|mantenimiento",
          "cantidad_hospital": number,  // Opcional: cantidad en el hospital
          "cantidad_deposito": number   // Opcional: cantidad en depósito
        }
      ],
      "observaciones": "Resumen del stock actualizado"
    }
 
    Responde EXCLUSIVAMENTE con el JSON plano y limpio, sin etiquetas markdown de bloque.
  `;

  const parts = [{ text: promptSistema }];
  if (impresorasRegistradas && impresorasRegistradas.length > 0) {
    const compactPrinters = impresorasRegistradas.map(p => ({
      sn: p.id_serie,
      modelo: p.modelo,
      area: p.area_actual,
      entidad: p.ubicacion_entidad,
      ip: p.ip || "Desconectado",
      estado: p.estado_funcionamiento,
      obs: p.observaciones || "",
      caso: p.codigo_caso_cas || ""
    }));
    parts.push({ text: `INVENTARIO DE IMPRESORAS REGISTRADAS ACTUALMENTE EN LA BASE DE DATOS (Firestore):\n${JSON.stringify(compactPrinters)}` });
  }
  if (mensajeTexto) {
    parts.push({ text: `Mensaje técnico: ${mensajeTexto}` });
  }
  if (adjuntos && adjuntos.length > 0) {
    for (const adj of adjuntos) {
      if (adj.base64 && adj.mimeType) {
        parts.push({
          inlineData: {
            mimeType: adj.mimeType,
            data: adj.base64
          }
        });
      }
    }
  }

  const rawText = await callGeminiAPI(parts);
  const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
  
  try {
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Error parsing Gemini JSON response. Raw text:", rawText, e);
    throw new Error("La respuesta de la IA no pudo ser parseada como JSON.");
  }
}

export async function analizarImportacionExcel(filasJson) {
  const promptSistema = `
    Eres el motor analítico de SAMI-Lexmark para el Hospital Cayetano Heredia.
    Se te proporciona una lista de impresoras importadas de un archivo Excel.
    Tu tarea es:
    1. Validar y normalizar los datos de cada fila:
       - Si "id_serie" (Número de serie) no está presente o está vacío, descarta el registro.
       - Si "modelo" no está presente, pon por defecto "MX431ADN".
       - Si "area_actual" no está presente, pon "Soporte".
       - Clasifica "ubicacion_entidad" en "Hospital" o "MUR":
         - Si el área o el texto contiene "MUR", pon "MUR".
         - De lo contrario, pon "Hospital" (incluyendo si el área es "Soporte").
       - Determina "estado_funcionamiento" según la lógica: "Inoperativo" (si está en Soporte y tiene observaciones de fallas graves o consumibles al 0%), "Advertencia" (si algún consumible es <= 15% o tiene observaciones/detalles y no está inoperativo), "Operativo" (de lo contrario).
       - Extrae la dirección IP en el campo "ip" de cada fila:
         * Si se especifica una dirección IP válida (ej. "192.168.24.120"), colócala en "ip".
         * Si se especifica "USB" (de forma exacta o con variantes como "cableado por usb"), establece "ip" como "USB".
         * Si está vacía o no se indica nada, colócala como null.
       - Limpia y formatea "observaciones" y "codigo_caso_cas":
          * Queda estrictamente prohibido incluir en "observaciones" información sobre el estado, niveles, cambio, instalación o compra de consumibles (tóner, unidad de imagen, kit de mantenimiento), ya que para esa información ya existen los campos específicos en la vista.
          * Debes remover de las observaciones del Excel original cualquier mención o referencia a consumibles o repuestos.
          * En las observaciones resultantes solo deben quedar temas de funcionamiento, fallos mecánicos/físicos, de configuración o necesidades de mantenimiento general (ej: "Se traba al escanear, se sale la hoja blanca para el escaneo", "Necesita mantenimiento", "Se atasca el papel", "Inoperativa / SIN GARANTÍA").
          * Si una observación tiene partes mixtas (ej: "Presenta atascos constantes y kit de mantenimiento 8%"), límpiala para dejar únicamente la parte física/mecánica (ej: "Presenta atascos constantes").
          * Si tras la limpieza el campo solo contenía datos de consumibles o queda vacío, establécelo como una cadena vacía "".
    2. Generar un informe de análisis (reporte_resumen) en lenguaje natural y profesional (español) para el técnico. Este reporte debe resumir:
       - El número total de equipos analizados.
       - Cuántos equipos están operativos, cuántos en advertencia y cuántos inoperativos.
       - Qué equipos requieren atención inmediata (por S/N y área).
       - Alguna observación relevante o recomendación sobre el stock de repuestos para estos modelos.

    Debes responder EXCLUSIVAMENTE con un JSON que tenga esta estructura:
    {
      "equipos_normalizados": [
        {
          "id_serie": "string",
          "modelo": "string",
          "area_actual": "string",
          "ubicacion_entidad": "Hospital|MUR",
          "ip": "string",
          "toner_nivel": number,
          "unidad_imagen_nivel": number,
          "mantenimiento_kit_nivel": number,
          "estado_funcionamiento": "Operativo|Inoperativo|Advertencia",
          "observaciones": "string",
          "codigo_caso_cas": "string"
        }
      ],
      "reporte_resumen": "string"
    }

    Responde únicamente con el JSON crudo y limpio, sin bloques de código markdown.
  `;

  const parts = [
    { text: promptSistema },
    { text: `Datos de Excel en JSON: ${JSON.stringify(filasJson)}` }
  ];

  const rawText = await callGeminiAPI(parts);
  const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
  
  try {
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Error parsing Gemini Excel JSON response. Raw text:", rawText, e);
    throw new Error("La respuesta de la IA para la importación no pudo ser parseada como JSON.");
  }
}
