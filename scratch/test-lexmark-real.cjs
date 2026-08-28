const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const url = 'https://support.lexmark.com/es_es/warranty-service/printer/MX431/Lexmark-MX431adn.html';
  const serie = '701924410D8X7';

  console.log('Navigating...');
  await page.goto(url, { waitUntil: 'networkidle' });

  console.log('Typing serial...');
  const inputSelectors = [
    'input[name="serialNumber"]',
    'input[placeholder*="serial" i]',
    'input[placeholder*="serie" i]',
    'input[type="text"]'
  ];

  let inputFound = false;
  for (const selector of inputSelectors) {
    const inputs = await page.$$(selector);
    for (const input of inputs) {
      if (await input.isVisible()) {
        await input.fill(serie);
        inputFound = true;
        await input.press('Enter');
        break;
      }
    }
    if (inputFound) break;
  }

  if (!inputFound) {
    console.log('Input not found');
    await browser.close();
    return;
  }

  console.log('Waiting for response...');
  // Esperamos un selector de resultado de garantía o simplemente un timeout
  await page.waitForTimeout(6000);
  
  // Imprimir el texto completo del body para buscar "garant" o "vencimiento"
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('BODY TEXT:', bodyText);

  await browser.close();
})();
