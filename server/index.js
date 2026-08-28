const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const LINKS = {
  "MX431ADN": "https://support.lexmark.com/es_es/warranty-service/printer/MX431/Lexmark-MX431adn.html",
  "MX632ADWE": "https://support.lexmark.com/es_es/warranty-service/printer/MX632/Lexmark-MX632adwe.html",
  "MX722ADHE": "https://support.lexmark.com/es_es/warranty-service/printer/MX722/Lexmark-MX722adhe.html"
};

app.post('/api/warranty', async (req, res) => {
  const { modelo, serie } = req.body;

  if (!modelo || !serie) {
    return res.status(400).json({ error: 'Falta modelo o serie' });
  }

  const url = LINKS[modelo];
  if (!url) {
    return res.status(400).json({ error: 'Modelo no soportado o enlace no mapeado' });
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log(`Verificando garantía para modelo: ${modelo}, serie: ${serie}`);
    
    // Interceptar la red para encontrar respuestas JSON, por si acaso devuelve la garantía así
    let warrantyResponse = null;
    page.on('response', async (response) => {
      try {
        if (response.request().resourceType() === 'xhr' || response.request().resourceType() === 'fetch') {
          const body = await response.text();
          if (body.toLowerCase().includes('warranty') || body.toLowerCase().includes('vencimiento')) {
             warrantyResponse = body;
          }
        }
      } catch(e) {}
    });

    await page.goto(url, { waitUntil: 'networkidle' });

    // Intenta encontrar el input para el serial. 
    // Lexmark suele usar name="serialNumber" u ofuscarlo.
    // Usaremos un selector genérico que coincida con los campos de texto más probables
    const inputSelectors = [
      'input[name="serialNumber"]',
      'input[placeholder*="serial" i]',
      'input[placeholder*="serie" i]',
      'input[type="text"]'
    ];

    let inputFound = false;
    for (const selector of inputSelectors) {
      const inputs = await page.$$(selector);
      // Evitar campos ocultos
      for (const input of inputs) {
        if (await input.isVisible()) {
          await input.fill(serie);
          inputFound = true;
          
          // Presionar Enter para enviar
          await input.press('Enter');
          break;
        }
      }
      if (inputFound) break;
    }

    if (!inputFound) {
      throw new Error('No se pudo encontrar el campo del número de serie en la página de Lexmark');
    }

    // Esperar un poco a que cargue la respuesta (puede ser navegación, o DOM dinámico)
    await page.waitForTimeout(6000); 

    const textContent = await page.evaluate(() => document.body.innerText);
    await browser.close();

    // Buscar "Fecha inicial - fecha final" y extraer la fecha final
    const regex = /Fecha inicial - fecha final\s+[\d\/]+\s*-\s*([\d\/]+)/gi;
    let match;
    let maxDate = null;

    while ((match = regex.exec(textContent)) !== null) {
      const dateStr = match[1]; // ej. 5/25/2027
      const dateObj = new Date(dateStr);
      if (!isNaN(dateObj.getTime())) {
        if (!maxDate || dateObj > maxDate) {
          maxDate = dateObj;
        }
      }
    }

    if (maxDate) {
      const yyyy = maxDate.getFullYear();
      const mm = String(maxDate.getMonth() + 1).padStart(2, '0');
      const dd = String(maxDate.getDate()).padStart(2, '0');
      const formattedDate = `${yyyy}-${mm}-${dd}`;

      return res.json({ 
        success: true, 
        mensaje: 'Garantía encontrada',
        fecha_vencimiento: formattedDate 
      });
    }

    return res.json({ 
      success: false, 
      mensaje: 'No se encontró la fecha de garantía en la respuesta',
      rawDataCaptured: textContent.substring(0, 500)
    });

  } catch (error) {
    if (browser) await browser.close();
    console.error('Error automatizando Playwright:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor de automatización corriendo en el puerto ${PORT}`);
});
