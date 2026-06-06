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
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${key}`;

  const promptSistema = `
    Eres el motor analítico de SAMI-Lexmark para el Hospital Cayetano Heredia.
    Tu tarea es procesar el texto ingresado o la imagen de pantalla de estado/reporte de consumibles proporcionados.
    Debes identificar:
    1. El número de serie de la impresora (usualmente alfanumérico largo en las etiquetas o metadatos).
    2. El nivel de Tóner (un valor numérico entero del 0 al 100). Si no se visualiza pero el texto dice "sin tóner", asume 0.
    3. El nivel de Unidad de Imagen (un valor numérico entero del 0 al 100).
    4. Diagnóstico de observaciones y estado de criticidad:
       - Si el tóner o la unidad de imagen están en 0%, o reporta "Inoperativa", la criticidad es "Crítico".
       - Si el nivel es menor o igual a 15% o reporta fallas continuas ("se traba", "mantenimiento"), la criticidad es "Advertencia".
       - En cualquier otro caso, la criticidad es "Estable".
    
    Responde EXCLUSIVAMENTE con un JSON plano y limpio, sin etiquetas markdown de bloque, utilizando el siguiente esquema:
    {
      "id_serie": "string",
      "toner_nivel": number,
      "unidad_imagen_nivel": number,
      "estado_criticidad": "Estable|Advertencia|Crítico",
      "observaciones": "Resumen sumamente conciso de lo analizado"
    }
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
    headers: { "Content-Type": "application/json" },
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
