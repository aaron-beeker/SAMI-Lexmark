import fs from "fs";
import path from "path";

function inspect() {
  const pdfPath = path.resolve(".", "7464443228K2G (1).pdf");
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found at ${pdfPath}`);
    return;
  }

  const content = fs.readFileSync(pdfPath);
  
  // Search for typical text operator patterns in PDF like: (text) Tj or /Font
  const hasTextOperators = content.includes("Tj") || content.includes("TJ");
  const hasFonts = content.includes("/Font");
  
  console.log("PDF Inspection:");
  console.log("- Has text drawing operators (Tj/TJ):", hasTextOperators);
  console.log("- Has font definitions (/Font):", hasFonts);
  console.log("- Total size in bytes:", content.length);

  // Try to search for the serial number or numbers like 7464443228K2G in the raw binary data
  const hasSerial = content.includes("7464443228K2G");
  console.log("- Has raw serial number string:", hasSerial);

  // Let's print some ASCII strings from the streams
  const textStrings = [];
  const textRegex = /\(([^)]+)\)\s*Tj/g;
  let match;
  const contentStr = content.toString("binary");
  
  while ((match = textRegex.exec(contentStr)) !== null && textStrings.length < 50) {
    textStrings.push(match[1]);
  }

  console.log("- Sample extracted text strings:", textStrings);
}

inspect();
