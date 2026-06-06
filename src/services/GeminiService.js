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

export async function analizarEvidenciaSuministros(mensajeTexto, base64Imagen = null, mimeType = null) {
  const key = getApiKey();
  if (!key) {
    throw new Error("API Key de Gemini no configurada. Por favor ingrésela en los Ajustes.");
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`;

  const promptSistema = `
    Eres el motor analítico y gestor de base de datos de SAMI-Lexmark para el Hospital Cayetano Heredia.
    Tu tarea es procesar el texto ingresado o la imagen de pantalla proporcionada para determinar la ACCIÓN requerida sobre el inventario de impresoras o el inventario de repuestos/stock.
    
    Identifica el tipo de operación:
    1. "crear": Si el usuario pide agregar, registrar, dar de alta, crear o añadir una nueva impresora.
    2. "eliminar": Si el usuario pide explícitamente eliminar, borrar, retirar o dar de baja una impresora.
    3. "actualizar": Si se reporta un cambio de suministros, una lectura, mantenimiento, cambio de ubicación o observaciones para una impresora existente.
    4. "actualizar_stock": Si se reporta o se muestra en una foto el conteo de repuestos de TÓNER, UNIDAD DE IMAGEN o KIT DE MANTENIMIENTO disponibles.
       - Identifica la cantidad que va para el "hospital" (para cambio rápido/cambio rápido) y para el "depósito" (almacén/abastecer).
       - Normaliza el modelo: si dice "431" asume "MX431ADN", si dice "632" asume "MX632ADWE", si dice "722" asume "MX722ADHE".
       - Identifica el tipo de insumo: "toner" (tóner/cartucho negro), "unidad_imagen" (unidad de imagen/tambor/drum), o "mantenimiento" (kit de mantenimiento/fusi).

    EXTRACCIÓN DE CONSUMIBLES:
    - Extrae el nivel de "toner_nivel" (porcentajes de cartucho negro), "unidad_imagen_nivel" (porcentajes de unidad de imagen) y "mantenimiento_kit_nivel" (porcentajes de kit mantenimiento) de la imagen o del texto. Si no aparecen explícitamente, ponlos como null.
    
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

    Especificaciones del JSON de respuesta según la acción:

    Para "crear" | "actualizar" | "eliminar":
    {
      "accion": "crear|actualizar|eliminar",
      "id_serie": "string",
      "modelo": "string",
      "area_actual": "string",
      "ubicacion_entidad": "Hospital|MUR",
      "toner_nivel": number,
      "unidad_imagen_nivel": number,
      "mantenimiento_kit_nivel": number,
      "estado_criticidad": "Estable|Advertencia|Crítico",
      "observaciones": "string",
      "codigo_caso_cas": "string"
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
  if (mensajeTexto) {
    parts.push({ text: `Mensaje técnico: ${mensajeTexto}` });
  }
  if (base64Imagen && mimeType) {
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: base64Imagen
      }
    });
  }

  const payload = {
    contents: [{ parts: parts }]
  };

  const responseData = await fetchWithRetry(url, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-goog-api-key": key
    },
    body: JSON.stringify(payload)
  });

  const rawText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  // Sanitizar posibles bloques de código markdown agregados por redundancia
  const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
  
  try {
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Error parsing Gemini JSON response. Raw text:", rawText, e);
    throw new Error("La respuesta de la IA no pudo ser parseada como JSON.");
  }
}

export async function analizarImportacionExcel(filasJson) {
  const key = getApiKey();
  if (!key) {
    throw new Error("API Key de Gemini no configurada. Por favor ingrésela en los Ajustes.");
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`;

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
       - Si "toner_nivel", "unidad_imagen_nivel" o "mantenimiento_kit_nivel" son null o no están definidos, devuélvelos como null. No inventes números a menos que se indiquen explícitamente en el texto de observaciones.
       - Determina "estado_criticidad" según los niveles: "Crítico" (si alguno es 0% o tiene observaciones graves de falla inoperativa), "Advertencia" (si alguno es <= 15%), "Estable" (si todos son > 15%). Si los niveles son null, determina la criticidad basándote únicamente en las observaciones (ej. si dice "inoperativa" es "Crítico", de lo contrario es "Estable").
       - Limpia y formatea "observaciones" y "codigo_caso_cas".
    2. Generar un informe de análisis (reporte_resumen) en lenguaje natural y profesional (español) para el técnico. Este reporte debe resumir:
       - El número total de equipos analizados.
       - Cuántos equipos están estables, cuántos en advertencia y cuántos críticos.
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
          "toner_nivel": number,
          "unidad_imagen_nivel": number,
          "mantenimiento_kit_nivel": number,
          "estado_criticidad": "Estable|Advertencia|Crítico",
          "observaciones": "string",
          "codigo_caso_cas": "string"
        }
      ],
      "reporte_resumen": "string"
    }

    Responde únicamente con el JSON crudo y limpio, sin bloques de código markdown.
  `;

  const payload = {
    contents: [
      {
        parts: [
          { text: promptSistema },
          { text: `Datos de Excel en JSON: ${JSON.stringify(filasJson)}` }
        ]
      }
    ]
  };

  const responseData = await fetchWithRetry(url, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-goog-api-key": key
    },
    body: JSON.stringify(payload)
  });

  const rawText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
  
  try {
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Error parsing Gemini Excel JSON response. Raw text:", rawText, e);
    throw new Error("La respuesta de la IA para la importación no pudo ser parseada como JSON.");
  }
}
