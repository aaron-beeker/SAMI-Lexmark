import fs from "fs";
import path from "path";
import { createWorker } from "tesseract.js";

async function runOcr() {
  for (let i = 0; i < 3; i++) {
    const imgPath = path.resolve(".", `scratch/extracted_img_${i}.jpg`);
    if (!fs.existsSync(imgPath)) {
      console.warn(`Image not found: ${imgPath}`);
      continue;
    }

    console.log(`Running OCR on: ${imgPath}...`);
    try {
      const worker = await createWorker("spa+eng");
      const { data: { text } } = await worker.recognize(imgPath);
      await worker.terminate();

      const outPath = path.resolve(".", `scratch/ocr_output_${i}.txt`);
      fs.writeFileSync(outPath, text);
      console.log(`OCR complete for page ${i}. Saved result to ${outPath} (${text.length} chars)`);
    } catch (error) {
      console.error(`OCR Error for page ${i}:`, error);
    }
  }
}

runOcr();
