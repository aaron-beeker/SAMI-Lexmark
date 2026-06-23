import fs from "fs";
import path from "path";

function extractJpegs() {
  const pdfPath = path.resolve(".", "7464443228K2G (1).pdf");
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found at ${pdfPath}`);
    return;
  }

  const data = fs.readFileSync(pdfPath);
  console.log(`Reading PDF of size ${data.length} bytes...`);

  // Look for JPEG markers: FF D8 FF (start) and FF D9 (end)
  let count = 0;
  let pos = 0;

  while (pos < data.length) {
    // Find FF D8 FF
    const startIdx = data.indexOf(Buffer.from([0xff, 0xd8, 0xff]), pos);
    if (startIdx === -1) break;

    // Find FF D9
    const endIdx = data.indexOf(Buffer.from([0xff, 0xd9]), startIdx + 3);
    if (endIdx === -1) break;

    const imgSize = endIdx + 2 - startIdx;
    if (imgSize > 10000) { // Only save reasonably sized images
      const imgBuffer = data.slice(startIdx, endIdx + 2);
      const outPath = path.resolve(".", `scratch/extracted_img_${count}.jpg`);
      fs.writeFileSync(outPath, imgBuffer);
      console.log(`Extracted image ${count} to ${outPath} (${imgSize} bytes)`);
      count++;
    }

    pos = endIdx + 2;
  }

  console.log(`Done. Extracted ${count} images.`);
}

extractJpegs();
