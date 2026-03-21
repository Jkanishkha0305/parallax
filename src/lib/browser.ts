import { chromium, Browser, BrowserContext, Page } from 'playwright';

export const SCREEN_WIDTH = 1440;
export const SCREEN_HEIGHT = 900;

export async function launchBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

export async function createContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({
    viewport: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });
}

export async function takeScreenshot(page: Page): Promise<string> {
  const buffer = await page.screenshot({ type: 'png' });
  return buffer.toString('base64');
}

export function denormalize(x: number, y: number): { px: number; py: number } {
  return {
    px: Math.round((x / 1000) * SCREEN_WIDTH),
    py: Math.round((y / 1000) * SCREEN_HEIGHT),
  };
}

export async function executeFunctionCall(
  page: Page,
  name: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; description: string; url?: string }> {
  try {
    switch (name) {
      case 'open_web_browser': {
        return { 
          success: true, 
          description: 'Browser is ready',
          url: page.url()
        };
      }
      case 'click_at':
      case 'click_element': {
        const { x, y } = args as { x: number; y: number };
        const { px, py } = denormalize(x, y);
        await page.mouse.click(px, py);
        await page.waitForTimeout(1000);
        return { success: true, description: `Clicked at (${px}, ${py})`, url: page.url() };
      }
      case 'hover_element': {
        const { x, y } = args as { x: number; y: number };
        const { px, py } = denormalize(x, y);
        await page.mouse.move(px, py);
        await page.waitForTimeout(500);
        return { success: true, description: `Hovered at (${px}, ${py})`, url: page.url() };
      }
      case 'type_text':
      case 'type_text_at': {
        const { text, x, y } = args as { text: string; x?: number; y?: number };
        if (x !== undefined && y !== undefined) {
          const { px, py } = denormalize(x, y);
          await page.mouse.click(px, py);
        }
        await page.keyboard.type(text, { delay: 50 });
        await page.waitForTimeout(500);
        return { success: true, description: `Typed "${text}"`, url: page.url() };
      }
      case 'scroll':
      case 'scroll_document': {
        const { direction } = args as { direction: string };
        const delta = direction === 'up' ? -500 : 500;
        await page.mouse.wheel(0, delta);
        await page.waitForTimeout(500);
        return { success: true, description: `Scrolled ${direction}`, url: page.url() };
      }
      case 'navigate':
      case 'navigate_to_url': {
        const { url } = args as { url: string };
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);
        return { success: true, description: `Navigated to ${url}`, url: page.url() };
      }
      case 'search': {
        const { query } = args as { query: string };
        return { success: true, description: `Searched for "${query}"`, url: page.url() };
      }
      case 'go_back': {
        await page.goBack();
        await page.waitForTimeout(1000);
        return { success: true, description: 'Went back', url: page.url() };
      }
      case 'go_forward': {
        await page.goForward();
        await page.waitForTimeout(1000);
        return { success: true, description: 'Went forward', url: page.url() };
      }
      case 'wait':
      case 'wait_5_seconds': {
        await page.waitForTimeout(5000);
        return { success: true, description: `Waited 5 seconds`, url: page.url() };
      }
      case 'press_key':
      case 'key_press': {
        const { key } = args as { key: string };
        await page.keyboard.press(key);
        await page.waitForTimeout(500);
        return { success: true, description: `Pressed ${key}`, url: page.url() };
      }
      case 'get_current_url': {
        return { success: true, description: `Current URL: ${page.url()}`, url: page.url() };
      }
      case 'done': {
        return { success: true, description: 'Task complete' };
      }
      default:
        return { success: false, description: `Unknown action: ${name}` };
    }
  } catch (error) {
    return { success: false, description: `Failed: ${name} — ${(error as Error).message}` };
  }
}
