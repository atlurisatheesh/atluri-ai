import type { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  use: {
    baseURL: process.env.E2E_FRONTEND_URL || "http://localhost:3001",
    headless: process.env.E2E_HEADLESS !== "false",
  },
};

export default config;
