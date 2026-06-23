import fs from "fs";
import path from "path";

async function run() {
  // Parse .env.local manually
  const envPath = path.resolve(".", ".env.local");
  let apiKey = "";
  if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of envLines) {
      if (line.startsWith("VITE_FIREBASE_API_KEY=")) {
        // Just checking key format
      }
      if (line.startsWith("VITE_GEMINI_API_KEY=")) {
        apiKey = line.split("=")[1].replace(/['"]/g, "").trim();
      }
    }
  }

  if (!apiKey) {
    console.error("Missing VITE_GEMINI_API_KEY in .env.local");
    return;
  }

  const pdfPath = path.resolve(".", "7464443228K2G (1).pdf");
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found at ${pdfPath}`);
    return;
  }

  console.log(`Reading PDF: ${pdfPath}`);
  const pdfBuffer = fs.readFileSync(pdfPath);
  const base64Data = pdfBuffer.toString("base64");

  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `
    Eres el motor de extracción de datos de SAMI-Lexmark.
    Analiza este PDF (es un reporte de estado de una impresora).
    Extrae el modelo de la impresora, el número de serie (Número de Serie) y los niveles de consumibles.
    
    Responde estrictamente con el siguiente JSON:
    {
      "modelo": "string",
      "id_serie": "string",
      "toner_nivel": number,
      "mantenimiento_kit_nivel": number,
      "unidad_imagen_nivel": number
    }
  `;

  console.log("Calling Gemini API...");
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: base64Data
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`HTTP Error ${response.status}:`, errText);
      return;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("Response text:");
    console.log(text);
  } catch (error) {
    console.error("Error during API call:", error);
  }
}

run();
