// scratch/test_prompt.js
import fs from "fs";

global.window = { location: { origin: "http://localhost:5174" } };
global.localStorage = {
  getItem: (key) => {
    if (key === "sami_gemini_api_key") return process.env.VITE_GEMINI_API_KEY || "";
    if (key === "sami_openrouter_api_key") return process.env.VITE_OPENROUTER_API_KEY || "";
    return null;
  }
};

const key = process.env.VITE_OPENROUTER_API_KEY || "";

function buildSystemPromptTest() {
  return `
    Eres el motor analítico de SAMI-Lexmark para el Hospital Cayetano Heredia.
    Tu tarea es procesar la imagen de estadísticas de una impresora Lexmark y extraer los niveles de consumibles.
    
    Determina si la imagen es una PÁGINA IMPRESA (hoja de papel blanca con texto negro) o una PANTALLA LCD (pantalla con fondo oscuro y barras de colores).

    REGLAS DE ORDEN SEGÚN EL TIPO DE FOTO:
    
    1. SI ES UNA HOJA IMPRESA DE "ESTADÍSTICAS DISPOSITIVO":
       Las secciones de consumibles están ordenadas de arriba a abajo en este EXACTO orden visual:
       * 1ra Sección/Barra: **Cartucho negro / Tóner** -> Asigna este valor a "toner_nivel".
       * 2da Sección/Barra: **Kit mantenimiento** -> Asigna este valor a "mantenimiento_kit_nivel".
       * 3ra Sección/Barra: **Unidad imagen** -> Asigna este valor a "unidad_imagen_nivel".
       ⚠️ ADVERTENCIA CRÍTICA: En la hoja impresa, el Kit de Mantenimiento es la segunda sección/barra y la Unidad de Imagen es la tercera. ¡No las inviertas!
    
    2. SI ES UNA PANTALLA LCD / TOUCHSCREEN DE LA IMPRESORA:
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

    Responde en este formato JSON:
    {
      "accion": "actualizar",
      "id_serie": "string",
      "modelo": "string",
      "toner_nivel": number,
      "mantenimiento_kit_nivel": number,
      "unidad_imagen_nivel": number,
      "estado_funcionamiento": "Operativo|Advertencia|Inoperativo",
      "observaciones": ""
    }
  `;
}

async function testImage(name, path) {
  if (!fs.existsSync(path)) {
    console.log(`Image not found: ${path}`);
    return;
  }
  const base64 = fs.readFileSync(path).toString("base64");
  
  const systemPrompt = buildSystemPromptTest();
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: [
      { type: "text", text: "Analiza esta imagen y extrae los datos de la impresora." },
      { type: "image_url", image_url: { url: `data:image/png;base64,${base64}` } }
    ] }
  ];

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      max_tokens: 1000
    })
  });

  const data = await response.json();
  console.log(`\n--- RESULT FOR ${name} ---`);
  console.log(data.choices?.[0]?.message?.content);
}

async function run() {
  const imgPrinted = "C:/Users/beker/.gemini/antigravity-ide/brain/5f680666-2982-4c24-b0c7-d345bc2fa53b/media__1781184234591.png";
  const imgLCD = "C:/Users/beker/.gemini/antigravity-ide/brain/5f680666-2982-4c24-b0c7-d345bc2fa53b/media__1781184529632.png";

  await testImage("PRINTED PAGE", imgPrinted);
  await testImage("LCD SCREEN", imgLCD);
}

run().catch(console.error);
