import fs from "fs";
import path from "path";
import type { Page } from "playwright";
import type { ScreenshotRecord } from "./types";

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function safeFileName(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export async function captureScreenshot(
  page: Page,
  options: {
    screenshotsDir: string;
    stepId: string;
    title: string;
  }
): Promise<ScreenshotRecord> {
  const { screenshotsDir, stepId, title } = options;
  ensureDir(screenshotsDir);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${stamp}__${safeFileName(stepId)}__${safeFileName(title)}.png`;
  const fullPath = path.join(screenshotsDir, fileName);
  await page.screenshot({ path: fullPath, fullPage: true });
  return {
    id: `${stepId}:${title}`,
    title,
    path: fullPath,
    createdAtIso: new Date().toISOString(),
  };
}
