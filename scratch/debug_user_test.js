// scratch/debug_user_test.js
import fs from "fs";
import { analizarEvidenciaSuministros } from "../src/services/GeminiService.js";

global.window = { location: { origin: "http://localhost:5174" } };
global.localStorage = {
  getItem: (key) => {
    if (key === "sami_gemini_api_key") return process.env.VITE_GEMINI_API_KEY || "";
    if (key === "sami_openrouter_api_key") return process.env.VITE_OPENROUTER_API_KEY || "";
    return null;
  }
};

const mockPrinters = [
  { id_serie: "701925110FD85", modelo: "MX431ADN", area_actual: "C E Otorrinolaringología", ubicacion_entidad: "Hospital" }
];

async function run() {
  const imgPath = "C:/Users/beker/.gemini/antigravity-ide/brain/5f680666-2982-4c24-b0c7-d345bc2fa53b/media__1781184234591.png";
  if (!fs.existsSync(imgPath)) {
    console.log("Image not found");
    return;
  }
  
  const base64 = fs.readFileSync(imgPath).toString("base64");
  const res = await analizarEvidenciaSuministros("Aquí la imagen", [{ base64, mimeType: "image/png" }], mockPrinters);
  console.log("AI OUTPUT FOR PRINTED PAGE:");
  console.log(JSON.stringify(res, null, 2));
}

run().catch(console.error);
