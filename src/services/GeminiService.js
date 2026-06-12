// src/services/GeminiService.js
// Multi-provider AI service: Gemini → OpenRouter → OCR (Tesseract.js)

// ─── API Key Helpers ───

function getGeminiKey() {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && envKey !== "TU_API_KEY_DE_GEMINI_AQUI" && envKey.trim() !== "") {
    return envKey;
  }
  return localStorage.getItem("sami_gemini_api_key") || "";
}

function getOpenRouterKey() {
  const envKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (envKey && envKey.trim() !== "") {
    return envKey;
  }
  return localStorage.getItem("sami_openrouter_api_key") || "";
}

// ─── Shared Prompt ───

function buildSystemPrompt() {
  return `
    Eres el motor analítico y gestor de base de datos de SAMI-Lexmark para el Hospital Cayetano Heredia.
    Tu tarea es procesar el texto ingresado o la imagen de pantalla proporcionada para determinar la ACCIÓN requerida sobre el inventario de impresoras o el inventario de repuestos/stock.
    
    Identifica el tipo de operación:
    1. "crear": Si el usuario pide agregar, registrar, dar de alta, crear o añadir una nueva impresora.
    2. "eliminar": Si el usuario pide explícitamente eliminar, borrar, retirar o dar de baja una impresora.
    3. "actualizar": Si se reporta un cambio de suministros, una lectura, mantenimiento, cambio de ubicación o observaciones para una impresora existente. REGLA CRÍTICA: Si la imagen muestra una página de "Estadísticas dispositivo" o "Device Statistics" de una impresora Lexmark (con número de serie, barras de progreso de consumibles, modelo, etc.), la acción es SIEMPRE "actualizar" — NUNCA "actualizar_stock". Debes extraer el número de serie del encabezado, los niveles porcentuales de las barras, y el modelo. Estos son los niveles de consumibles INSTALADOS en ESA impresora específica, NO son conteos de repuestos en almacén.
    4. "actualizar_stock": EXCLUSIVAMENTE cuando el usuario reporta explícitamente en TEXTO (no imagen de estadísticas de impresora) cuántas unidades de repuesto tiene disponibles en el almacén/depósito/hospital para distribución. Ejemplo: "Tenemos 5 tóners de 431 en el depósito y 2 en el hospital". NUNCA uses esta acción cuando la imagen muestra estadísticas de UNA impresora con su número de serie.
    5. "actualizar_multiples": Si el usuario proporciona una lista, tabla, texto copiado, o reporte de múltiples impresoras con sus series/modelos/áreas/IPs para registrar o actualizar de forma masiva en lote.
    6. "conversar": Si el usuario te hace una pregunta general, consulta sobre el estado, estadísticas o listado de impresoras del inventario (por ejemplo, cuáles están duplicadas por número de serie, modelo, IP, o área), te saluda, o te pide información detallada sobre la base de datos de impresoras proporcionada.
       - Identifica la cantidad que va para el "hospital" (para cambio rápido/cambio rápido) y para el "depósito" (almacén/abastecer).
       - Normaliza el modelo: si dice "431" asume "MX431ADN", si dice "632" asume "MX632ADWE", si dice "722" asume "MX722ADHE".
       - Identifica el tipo de insumo: "toner" (tóner/cartucho negro), "unidad_imagen" (unidad de imagen/tambor/drum), o "mantenimiento" (kit de mantenimiento/fusi).
 
    REGLA DE DESAMBIGUACIÓN CRÍTICA — "actualizar" vs "actualizar_stock":
    - Imagen de "Estadísticas dispositivo" con S/N y barras de progreso → SIEMPRE "actualizar" (actualiza los consumibles de ESA impresora identificada por su S/N)
    - Texto del usuario diciendo "hay X tóners disponibles en el depósito" → "actualizar_stock"
    - En caso de duda, si hay un número de serie visible, usa "actualizar"
 
    EXTRACCIÓN DE CONSUMIBLES:
    - Extrae el nivel de "toner_nivel" (porcentajes de cartucho negro), "unidad_imagen_nivel" (porcentajes de unidad de imagen) y "mantenimiento_kit_nivel" (porcentajes de kit mantenimiento) de la imagen o del texto. Si no aparecen explícitamente, ponlos como null.
    
    EXTRACCIÓN DE LA DIRECCIÓN IP:
    - Si se especifica una dirección IP válida (ej: "192.168.24.120"), colócala en el campo "ip".
    - Si se indica explícitamente "USB" o "Cableado por USB", establece el campo "ip" como "USB".
    - Si no se especifica ninguna dirección IP ni se menciona "USB" (es decir, está vacío o no determinado), establece el campo "ip" como null.
    
    REGLAS VISUALES PARA ESTIMAR NIVELES DE SUMINISTROS (EXTREMADAMENTE IMPORTANTE — EL ORDEN FÍSICO VARÍA SEGÚN EL TIPO DE FOTO):
    
    1. EN FOTOS DE HOJAS IMPRESAS DE "ESTADÍSTICAS DISPOSITIVO":
       Las secciones de consumibles están ordenadas de arriba a abajo en este EXACTO orden visual:
       * 1ra Sección/Barra: **Cartucho negro / Tóner** -> Asigna este valor a "toner_nivel".
       * 2da Sección/Barra: **Kit mantenimiento** -> Asigna este valor a "mantenimiento_kit_nivel".
       * 3ra Sección/Barra: **Unidad imagen** -> Asigna este valor a "unidad_imagen_nivel".
       ⚠️ ADVERTENCIA CRÍTICA: En la hoja impresa, el Kit de Mantenimiento es la segunda sección/barra y la Unidad de Imagen es la tercera. ¡No las inviertas!
    
    2. EN FOTOS DE LA PANTALLA LCD / TOUCHSCREEN DE LA IMPRESORA:
       Las barras de progreso de la pantalla están ordenadas de arriba a abajo en este otro orden visual:
       * 1ra Barra: **Cartucho negro / Tóner** -> Asigna este valor a "toner_nivel".
       * 2da Barra: **Unidad imagen** -> Asigna este valor a "unidad_imagen_nivel".
       * 3ra Barra: **Kit mantenimiento** -> Asigna este valor a "mantenimiento_kit_nivel".
       ⚠️ ADVERTENCIA CRÍTICA: En la pantalla LCD, la Unidad de Imagen es la segunda barra y el Kit de Mantenimiento es la tercera. ¡No las inviertas!

    CÓMO LEER LAS BARRAS Y ESTIMAR EL NIVEL:
    - En las HOJAS IMPRESAS, las etiquetas de escala "0%" (a la izquierda de la barra) y "100%" (a la derecha de la barra) son marcas fijas impresas y NO representan el nivel actual. ¡IGNÓRALAS por completo! No uses 0% o 100% solo porque ves esas etiquetas impresas.
    - IGNORA por completo los números de "Capacidad" y "Caras por consumible" para calcular los niveles. Son contadores históricos y no reflejan el nivel actual del chip.
    - El nivel real de consumible se mide ÚNICAMENTE por el largo de la BARRA NEGRA HORIZONTAL:
      * Barra de Tóner (1ra): La barra negra llena casi toda la longitud de izquierda a derecha (aproximadamente 95%).
      * Barra de Kit Mantenimiento (2da): La barra negra se llena desde la izquierda hasta un poco más de la mitad (aproximadamente 60%). El resto está en blanco.
      * Barra de Unidad Imagen (3ra): La barra negra se llena desde la izquierda hasta poco más de un tercio (aproximadamente 35%). El resto está en blanco.
    - En la PANTALLA LCD:
      * Estima el largo de la barra de color (verde, azul, etc.) sobre el fondo oscuro.
      * Si la barra está casi vacía, es ~5% o ~10%.
      * Si está llena un poco más de la mitad, es ~60%.
      
    INFORMACIÓN EXTRA PARA LAS FOTOS DE PANTALLA LCD / TOUCHSCREEN:
    - Si el usuario agrega texto adicional junto a la foto (ej: "D8xh", "FD85"), ese es el SUFIJO del número de serie de la impresora. Colócalo en "id_serie".
    - La acción para estas fotos es SIEMPRE "actualizar" — estás actualizando los consumibles de ESA impresora específica.
 
    
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
 
    REGLAS IMPORTANTES PARA EL CAMPO "detalle_caso":
    - Si el mensaje técnico, Excel o la imagen asocia un detalle, reporte o diagnóstico específico al código de caso CAS asignado, extrae esa descripción en el campo "detalle_caso".
    - Si no se especifica un detalle para el caso, o si no hay un caso CAS asignado, pon "detalle_caso" como una cadena vacía "".

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
      "mantenimiento_kit_nivel": number,
      "unidad_imagen_nivel": number,
      "estado_funcionamiento": "Operativo|Inoperativo|Advertencia",
      "observaciones": "string",
      "codigo_caso_cas": "string",
      "detalle_caso": "string"
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
          "ip": "string",
          "toner_nivel": number,
          "mantenimiento_kit_nivel": number,
          "unidad_imagen_nivel": number,
          "estado_funcionamiento": "Operativo|Inoperativo|Advertencia",
          "observaciones": "string",
          "codigo_caso_cas": "string",
          "detalle_caso": "string"
        }
      ]
    }
 
    Para "conversar":
    {
      "accion": "conversar",
      "respuesta_chat": "string"
    }
 
    Para "actualizar_stock":
    {
      "accion": "actualizar_stock",
      "stock_updates": [
        {
          "modelo": "MX431ADN|MX632ADWE|MX722ADHE",
          "insumo": "toner|unidad_imagen|mantenimiento",
          "cantidad_hospital": number,
          "cantidad_deposito": number
        }
      ],
      "observaciones": "Resumen del stock actualizado"
    }
 
    Responde EXCLUSIVAMENTE con el JSON plano y limpio, sin etiquetas markdown de bloque.
  `;
}

// ─── Provider 1: Google Gemini API ───

async function callGeminiAPI(parts) {
  const key = getGeminiKey();
  if (!key) return null; // Skip if no key

  const models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-flash-lite"];

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    try {
      console.log(`[Gemini] Intentando modelo: ${model}`);
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ parts }] })
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        if (response.status === 429) {
          console.warn(`[Gemini] Cuota agotada (429) en modelo ${model}`);
          // Quota is account-level, skip all Gemini models
          return null;
        }
        if (response.status === 404) {
          console.warn(`[Gemini] Modelo ${model} no encontrado (404), probando siguiente...`);
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${body.substring(0, 200)}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        console.log(`[Gemini] ✓ Respuesta exitosa con ${model}`);
        return rawText;
      }
    } catch (error) {
      console.warn(`[Gemini] Error con ${model}:`, error.message);
    }
  }

  return null; // All Gemini models failed
}

// ─── Provider 2: OpenRouter API (Free models with vision) ───

async function callOpenRouterAPI(systemPrompt, userText, adjuntos = []) {
  const key = getOpenRouterKey();
  if (!key) return null; // Skip if no key

  const freeModels = [
    "google/gemini-2.5-flash",
    "google/gemini-flash-1.5",
    "google/gemini-flash-1.5:free",
    "openai/gpt-4o",
    "openai/gpt-4o-mini"
  ];

  // Build OpenAI-compatible messages
  const userContent = [];
  if (userText) {
    userContent.push({ type: "text", text: userText });
  }
  for (const adj of adjuntos) {
    if (adj.base64 && adj.mimeType) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${adj.mimeType};base64,${adj.base64}` }
      });
    }
  }
  if (userContent.length === 0) {
    userContent.push({ type: "text", text: "(sin texto)" });
  }

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent }
  ];

  for (const model of freeModels) {
    try {
      console.log(`[OpenRouter] Intentando modelo: ${model}`);
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "SAMI-Lexmark"
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        if (response.status === 429) {
          console.warn(`[OpenRouter] Rate limit en ${model}, probando siguiente...`);
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${body.substring(0, 200)}`);
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content;
      if (rawText) {
        console.log(`[OpenRouter] ✓ Respuesta exitosa con ${model}`);
        return rawText;
      }
    } catch (error) {
      console.warn(`[OpenRouter] Error con ${model}:`, error.message);
    }
  }

  return null;
}

// ─── Provider 3: Tesseract.js OCR (Offline fallback) ───

async function performOCRFallback(adjuntos = []) {
  const imageAdj = adjuntos.find(a => a.mimeType?.startsWith("image/"));
  if (!imageAdj) return null;

  try {
    console.log("[OCR] Iniciando extracción de texto con Tesseract.js...");
    const Tesseract = await import("tesseract.js");
    const worker = await Tesseract.createWorker("spa+eng");
    
    const dataUrl = `data:${imageAdj.mimeType};base64,${imageAdj.base64}`;
    const { data: { text } } = await worker.recognize(dataUrl);
    await worker.terminate();

    console.log("[OCR] Texto extraído:", text.substring(0, 500));
    return parseOCRText(text);
  } catch (error) {
    console.error("[OCR] Error:", error);
    return null;
  }
}

function parseOCRText(text) {
  const lines = text.replace(/\r/g, "").split("\n").map(l => l.trim()).filter(Boolean);
  const fullText = lines.join(" ");

  // Extract serial number (pattern: 10-13 alphanumeric chars)
  let serial = "";
  const serialPatterns = [
    /[Nn][uú]mero\s*de\s*serie[:\s]*([A-Za-z0-9]{10,15})/i,
    /(?:S\/N|Serie)[:\s]*([A-Za-z0-9]{10,15})/i,
    /\b(7\d{12}[A-Fa-f0-9]{0,3})\b/,
    /\b([A-Z0-9]{10,14}[A-Fa-f][A-Z0-9]{0,4})\b/i
  ];
  for (const pat of serialPatterns) {
    const m = fullText.match(pat);
    if (m) { serial = m[1]; break; }
  }

  // Extract model
  let modelo = "MX431ADN";
  if (/mx\s*632/i.test(fullText)) modelo = "MX632ADWE";
  else if (/mx\s*722/i.test(fullText)) modelo = "MX722ADHE";
  else if (/mx\s*431/i.test(fullText)) modelo = "MX431ADN";

  // Extract percentage levels from bars or text
  // Look for "Nivel consumible" followed by percentage pattern "X%"
  const percentages = [];
  const pctPattern = /(\d{1,3})\s*%/g;
  let match;
  while ((match = pctPattern.exec(fullText)) !== null) {
    const val = parseInt(match[1]);
    if (val >= 0 && val <= 100) percentages.push(val);
  }

  // The printer stats page typically shows: Toner %, Kit %, Unidad Imagen % in that order
  const toner = percentages.length > 0 ? percentages[0] : null;
  const maint = percentages.length > 1 ? percentages[1] : null;
  const unit = percentages.length > 2 ? percentages[2] : null;

  if (!serial) {
    return null; // Can't do anything without a serial
  }

  // Determine status
  let estado = "Operativo";
  if (toner === 0 || unit === 0 || maint === 0) estado = "Advertencia";
  if ((toner !== null && toner <= 15) || (unit !== null && unit <= 15) || (maint !== null && maint <= 15)) estado = "Advertencia";

  return {
    accion: "actualizar",
    id_serie: serial,
    modelo,
    area_actual: null,
    ubicacion_entidad: "Hospital",
    ip: null,
    toner_nivel: toner,
    unidad_imagen_nivel: unit,
    mantenimiento_kit_nivel: maint,
    estado_funcionamiento: estado,
    observaciones: "",
    codigo_caso_cas: null,
    _provider: "OCR (Tesseract.js)",
    _ocr_raw: fullText.substring(0, 300)
  };
}

// ─── Main Export: Multi-provider orchestrator ───

export async function analizarEvidenciaSuministros(mensajeTexto, adjuntos = [], impresorasRegistradas = []) {
  const systemPrompt = buildSystemPrompt();
  let providerUsed = "";

  // Build Gemini-format parts
  const parts = [{ text: systemPrompt }];
  if (impresorasRegistradas && impresorasRegistradas.length > 0) {
    const compactPrinters = impresorasRegistradas.map(p => ({
      sn: p.id_serie, modelo: p.modelo, area: p.area_actual,
      entidad: p.ubicacion_entidad, ip: p.ip || "Desconectado",
      estado: p.estado_funcionamiento, obs: p.observaciones || "",
      caso: p.codigo_caso_cas || ""
    }));
    parts.push({ text: `INVENTARIO DE IMPRESORAS REGISTRADAS:\n${JSON.stringify(compactPrinters)}` });
  }
  if (mensajeTexto) {
    parts.push({ text: `Mensaje técnico: ${mensajeTexto}` });
  }
  if (adjuntos && adjuntos.length > 0) {
    for (const adj of adjuntos) {
      if (adj.base64 && adj.mimeType) {
        parts.push({ inlineData: { mimeType: adj.mimeType, data: adj.base64 } });
      }
    }
  }

  // ── Tier 1: Try Gemini ──
  console.log("🔄 Tier 1: Intentando Gemini...");
  let rawText = await callGeminiAPI(parts);
  if (rawText) {
    providerUsed = "Gemini";
  }

  // ── Tier 2: Try OpenRouter ──
  if (!rawText) {
    console.log("🔄 Tier 2: Intentando OpenRouter...");
    const userTextForOR = mensajeTexto
      ? `Mensaje técnico: ${mensajeTexto}`
      : "Analiza la imagen adjunta de una impresora Lexmark y extrae los datos de consumibles.";
    rawText = await callOpenRouterAPI(systemPrompt, userTextForOR, adjuntos || []);
    if (rawText) {
      providerUsed = "OpenRouter";
    }
  }

  // ── Tier 3: OCR Fallback ──
  if (!rawText) {
    console.log("🔄 Tier 3: Intentando OCR local (Tesseract.js)...");
    const ocrResult = await performOCRFallback(adjuntos || []);
    if (ocrResult) {
      console.log("[OCR] ✓ Datos extraídos localmente:", ocrResult);
      ocrResult._provider = "OCR (Tesseract.js) — Solo texto, sin IA";
      return ocrResult;
    }
  }

  // ── Parse response ──
  if (!rawText) {
    throw new Error(
      "No se pudo procesar la solicitud. Verifica:\n" +
      "• Gemini API Key (cuota agotada o no configurada)\n" +
      "• OpenRouter API Key (no configurada)\n" +
      "• OCR no pudo extraer datos de la imagen\n\n" +
      "Configura al menos una API Key en Ajustes."
    );
  }

  const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
  try {
    const result = JSON.parse(cleanJson);
    result._provider = providerUsed;
    return result;
  } catch (e) {
    console.error(`Error parsing ${providerUsed} JSON response. Raw text:`, rawText, e);
    throw new Error(`La respuesta de ${providerUsed} no pudo ser parseada como JSON.`);
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
          "codigo_caso_cas": "string",
          "detalle_caso": "string"
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

  // Try Gemini first
  let rawText = await callGeminiAPI(parts);

  // Try OpenRouter if Gemini fails
  if (!rawText) {
    rawText = await callOpenRouterAPI(
      promptSistema,
      `Datos de Excel en JSON: ${JSON.stringify(filasJson)}`,
      []
    );
  }

  if (!rawText) {
    throw new Error("No se pudo procesar el Excel. Ningún proveedor de IA respondió. Verifica tus API Keys en Ajustes.");
  }

  const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Error parsing Excel JSON response. Raw text:", rawText, e);
    throw new Error("La respuesta de la IA para la importación no pudo ser parseada como JSON.");
  }
}
