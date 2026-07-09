const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ 
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  const recorder = new PuppeteerScreenRecorder(page, {
    fps: 30,
    videoFrame: { width: 1280, height: 720 }
  });
  
  const savePath = '/home/guru/.gemini/antigravity/brain/8a840eb4-aa38-4e72-a3af-741f77e016fc/customer_walkthrough.mp4';
  
  console.log('Navigating to local site...');
  await page.goto('http://localhost:3000/demo', { waitUntil: 'networkidle2' });
  
  console.log('Starting recording...');
  await recorder.start(savePath);
  
  // Wait for page to load fully
  await new Promise(r => setTimeout(r, 2000));
  
  // Scroll down a bit
  console.log('Scrolling...');
  await page.evaluate(() => window.scrollBy(0, 300));
  await new Promise(r => setTimeout(r, 1000));
  
  // Click first Add to Cart button
  console.log('Adding item 1 to cart...');
  const addButtons = await page.$$('.product-card__add-btn');
  if (addButtons.length > 0) {
    await addButtons[0].click();
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Click second Add to Cart button
  console.log('Adding item 2 to cart...');
  if (addButtons.length > 1) {
    await addButtons[1].click();
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Click floating cart button to open drawer
  console.log('Opening cart...');
  const cartBtn = await page.$('.floating-cart-btn');
  if (cartBtn) {
    await cartBtn.click();
    await new Promise(r => setTimeout(r, 2000));
  }
  
  // Click checkout
  console.log('Clicking checkout...');
  const checkoutBtn = await page.$('.checkout-btn');
  if (checkoutBtn) {
    await checkoutBtn.click();
    await new Promise(r => setTimeout(r, 3000)); // wait for whatsapp redirect or just recording
  }
  
  console.log('Stopping recording...');
  await recorder.stop();
  await browser.close();
  
  console.log('Video saved to ' + savePath);
})();
