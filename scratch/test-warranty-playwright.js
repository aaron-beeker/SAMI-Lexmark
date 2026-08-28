import { chromium } from 'playwright';

(async () => {
  console.log('Iniciando navegador Playwright...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Escuchar todas las respuestas de red
  page.on('response', async (response) => {
    const url = response.url();
    // Filtrar solicitudes XHR / Fetch relevantes
    if (response.request().resourceType() === 'xhr' || response.request().resourceType() === 'fetch') {
      console.log(`\n[REDS] URL: ${url}`);
      try {
        const body = await response.text();
        console.log(`[REDS] Body: ${body.substring(0, 300)}`);
      } catch(e) {}
    }
  });

  const targetUrl = 'https://support.lexmark.com/es_es/warranty-service/printer/MX431/Lexmark-MX431adn.html';
  console.log(`Navegando a: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'networkidle' });

  // Buscar el input del número de serie
  // Según lo visto antes o suposiciones comunes
  console.log('Buscando campo de serie y enviando datos de prueba...');
  try {
    const inputSelector = 'input[name="serialNumber"], input[id*="serial"], input[type="text"]'; 
    await page.waitForSelector(inputSelector, { timeout: 10000 });
    
    // Encontramos los inputs de texto, llenamos el último o el más probable (usualmente es el único texto libre)
    const inputs = await page.$$(inputSelector);
    if (inputs.length > 0) {
      // Intentamos con el primer input visible
      await inputs[0].fill('1234567890');
      
      // Buscar botón de submit
      const btnSelector = 'button[type="submit"], input[type="submit"], button.submit, a.button';
      const btns = await page.$$(btnSelector);
      if (btns.length > 0) {
        console.log('Haciendo click en enviar...');
        await btns[0].click();
      } else {
        console.log('Pulsando Enter...');
        await inputs[0].press('Enter');
      }

      console.log('Esperando resultados de red...');
      await page.waitForTimeout(5000); // Esperar 5s a que responda algo
    } else {
      console.log('No se encontró el input de serial');
    }

  } catch (error) {
    console.error('Error automatizando:', error);
  }

  await browser.close();
})();
