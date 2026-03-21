import { launchBrowser, createContext, takeScreenshot } from '../src/lib/browser.js';
import * as fs from 'fs';

async function testBrowser() {
  console.log('Launching browser...');
  const browser = await launchBrowser();
  
  console.log('Creating context...');
  const context = await createContext(browser);
  
  console.log('Creating page...');
  const page = await context.newPage();
  
  console.log('Navigating to example.com...');
  await page.goto('https://example.com');
  
  console.log('Taking screenshot...');
  const screenshotBase64 = await takeScreenshot(page);
  
  // Convert base64 to buffer and save
  const screenshotBuffer = Buffer.from(screenshotBase64, 'base64');
  fs.writeFileSync('/tmp/test-screenshot.png', screenshotBuffer);
  
  console.log('Screenshot saved to /tmp/test-screenshot.png');
  
  await browser.close();
  console.log('Browser closed. Done!');
}

testBrowser().catch(console.error);
