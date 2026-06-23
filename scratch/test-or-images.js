import fs from "fs";
import path from "path";

async function run() {
  // Parse .env.local manually
  const envPath = path.resolve(".", ".env.local");
  let apiKey = "";
  if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of envLines) {
      if (line.startsWith("VITE_OPENROUTER_API_KEY=")) {
        apiKey = line.split("=")[1].replace(/['"]/g, "").trim();
      }
    }
  }

  if (!apiKey) {
    console.error("Missing VITE_OPENROUTER_API_KEY in .env.local");
    return;
  }

  const images = [];
  for (let i = 0; i < 3; i++) {
    const imgPath = path.resolve(".", `scratch/extracted_img_${i}.jpg`);
    if (fs.existsSync(imgPath)) {
      images.push({
        base64: fs.readFileSync(imgPath).toString("base64"),
        mimeType: "image/jpeg"
      });
    }
  }

  console.log(`Loaded ${images.length} images for testing.`);

  const systemPrompt = `
    Eres el motor analítico de SAMI-Lexmark.
    Analiza las imágenes proporcionadas (páginas de un reporte de estado de una impresora).
    Extrae la acción (actualizar), el número de serie (Número de Serie) del equipo y los niveles de consumibles (Tóner, Kit de Mantenimiento, Unidad de Imagen).
    Para estimar los consumibles, busca las barras horizontales de progreso y calcula visualmente su porcentaje aproximado de llenado.
    
    Responde estrictamente con el siguiente JSON:
    {
      "accion": "actualizar",
      "id_serie": "string",
      "modelo": "string",
      "toner_nivel": number,
      "mantenimiento_kit_nivel": number,
      "unidad_imagen_nivel": number
    }
  `;

  const userContent = [
    { type: "text", text: "Analiza el reporte adjunto de la impresora y extrae los consumibles." }
  ];

  for (const img of images) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${img.mimeType};base64,${img.base64}` }
    });
  }

  const url = "https://openrouter.ai/api/v1/chat/completions";
  const model = "google/gemini-2.5-flash";

  console.log(`Calling OpenRouter API with model: ${model}...`);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`HTTP Error ${response.status}:`, errText);
      return;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    console.log("OpenRouter Response:");
    console.log(text);
  } catch (error) {
    console.error("Error calling OpenRouter:", error);
  }
}

run();
