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
): Promise<{ success: boolean; description: string }> {
  try {
    switch (name) {
      case 'click_at': {
        const { px, py } = denormalize(args.x as number, args.y as number);
        await page.mouse.click(px, py);
        await page.waitForTimeout(800);
        return { success: true, description: `Clicked at (${px}, ${py})` };
      }
      case 'double_click_at': {
        const { px, py } = denormalize(args.x as number, args.y as number);
        await page.mouse.dblclick(px, py);
        await page.waitForTimeout(800);
        return { success: true, description: `Double-clicked at (${px}, ${py})` };
      }
      case 'right_click_at': {
        const { px, py } = denormalize(args.x as number, args.y as number);
        await page.mouse.click(px, py, { button: 'right' });
        await page.waitForTimeout(500);
        return { success: true, description: `Right-clicked at (${px}, ${py})` };
      }
      case 'type_text_at': {
        const { px, py } = denormalize(args.x as number, args.y as number);
        await page.mouse.click(px, py);
        await page.keyboard.type(args.text as string, { delay: 50 });
        await page.waitForTimeout(500);
        return { success: true, description: `Typed "${args.text}" at (${px}, ${py})` };
      }
      case 'scroll_document': {
        const direction = args.direction === 'up' ? -500 : 500;
        await page.mouse.wheel(0, direction);
        await page.waitForTimeout(500);
        return { success: true, description: `Scrolled ${args.direction}` };
      }
      case 'navigate': {
        await page.goto(args.url as string, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await page.waitForTimeout(1500);
        return { success: true, description: `Navigated to ${args.url}` };
      }
      case 'key_press': {
        await page.keyboard.press(args.key as string);
        await page.waitForTimeout(500);
        return { success: true, description: `Pressed key: ${args.key}` };
      }
      case 'drag_and_drop': {
        const from = denormalize(args.startX as number, args.startY as number);
        const to = denormalize(args.endX as number, args.endY as number);
        await page.mouse.move(from.px, from.py);
        await page.mouse.down();
        await page.mouse.move(to.px, to.py, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(500);
        return { success: true, description: `Dragged from (${from.px}, ${from.py}) to (${to.px}, ${to.py})` };
      }
      default:
        return { success: false, description: `Unknown action: ${name}` };
    }
  } catch (error) {
    return { success: false, description: `Failed: ${name} — ${(error as Error).message}` };
  }
}
