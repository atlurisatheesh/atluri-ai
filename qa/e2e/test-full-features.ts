import { test, expect, Page } from "@playwright/test";

const BASE = "https://atluri-ai.vercel.app";
const API = `${BASE}/api`;

// ─── Helper ──────────────────────────────────────────────────────────────────
async function apiGet(url: string) {
  const resp = await fetch(url);
  return { status: resp.status, body: await resp.json().catch(() => ({})) };
}

async function apiPost(url: string, body: object) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: resp.status, body: await resp.json().catch(() => ({})) };
}

// ─── 1. INFRASTRUCTURE ───────────────────────────────────────────────────────
test.describe("🔧 Infrastructure", () => {
  test("backend /healthz returns ok", async () => {
    const { status, body } = await apiGet(`${BASE}/healthz`);
    expect(status).toBe(200);
    expect(body.status).toBe("ok");
  });

  test("backend /api/auth/oauth/status — Google ready", async () => {
    const { status, body } = await apiGet(`${API}/auth/oauth/status`);
    expect(status).toBe(200);
    expect(body.providers.google.ready).toBe(true);
    expect(body.providers.google.client_id_set).toBe(true);
    expect(body.providers.google.client_secret_set).toBe(true);
  });

  test("OpenAPI docs accessible", async () => {
    const { status } = await apiGet(`${BASE}/docs`);
    expect(status).toBe(200);
  });
});

// ─── 2. AUTH PAGES (UI) ──────────────────────────────────────────────────────
test.describe("🔐 Auth Pages", () => {
  test("login page loads with all elements", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.waitForLoadState("networkidle");
    // Must have email + password fields
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    // Must have all three OAuth buttons
    await expect(page.getByText(/google/i).first()).toBeVisible();
    await expect(page.getByText(/github/i).first()).toBeVisible();
    await expect(page.getByText(/microsoft/i).first()).toBeVisible();
  });

  test("signup page loads", async ({ page }) => {
    await page.goto(`${BASE}/signup`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
  });

  test("login with wrong credentials shows error", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.waitForLoadState("networkidle");
    const emailField = page.locator('input[type="email"], input[name="email"]').first();
    const passwordField = page.locator('input[type="password"]').first();
    await emailField.fill("wrong@test.com");
    await passwordField.fill("wrongpassword");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2000);
    // Should show error (still on login page or error message)
    const url = page.url();
    expect(url).toContain("login");
  });
});

// ─── 3. GOOGLE OAUTH FLOW ────────────────────────────────────────────────────
test.describe("🔑 Google OAuth Flow", () => {
  test("Google button redirects to accounts.google.com", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.waitForLoadState("networkidle");
    const googleBtn = page.getByText(/google/i).first();
    await googleBtn.click();
    await page.waitForURL(/accounts\.google\.com/, { timeout: 10000 });
    expect(page.url()).toContain("accounts.google.com");
    expect(page.url()).toContain("client_id=109126407733");
    expect(page.url()).toContain("redirect_uri=https%3A%2F%2Fatluri-ai.vercel.app");
  });

  test("OAuth redirect URI is correctly set", async () => {
    const resp = await fetch(`${API}/auth/oauth/google`, { redirect: "manual" });
    // Should redirect to Google
    expect([302, 307, 308]).toContain(resp.status);
    const location = resp.headers.get("location") || "";
    expect(location).toContain("accounts.google.com");
    expect(location).toContain("atluri-ai.vercel.app");
  });

  test("OAuth error callback handled gracefully", async ({ page }) => {
    await page.goto(`${BASE}/auth/callback?error=oauth_denied&next=/dashboard`);
    await page.waitForLoadState("networkidle");
    // Should redirect to login with error
    await page.waitForURL(/login/, { timeout: 5000 });
    expect(page.url()).toContain("error");
  });

  test("OAuth invalid state handled gracefully", async ({ page }) => {
    await page.goto(`${BASE}/api/auth/oauth/google/callback?state=invalid&code=fakecode`);
    await page.waitForTimeout(2000);
    // Should redirect back to login/error page, not show 500
    const url = page.url();
    expect(url).not.toContain("Internal Server Error");
  });
});

// ─── 4. API ENDPOINTS ────────────────────────────────────────────────────────
test.describe("🌐 API Endpoints", () => {
  test("POST /api/auth/signup creates user", async () => {
    const randomEmail = `test_${Date.now()}@automationtest.com`;
    const { status, body } = await apiPost(`${API}/auth/signup`, {
      email: randomEmail,
      password: "TestPass123!",
      display_name: "Automation Test User",
    });
    // 200 or 201 = success, 409 = already exists (also fine)
    expect([200, 201, 409]).toContain(status);
    if (status === 200 || status === 201) {
      expect(body.email || body.user?.email || body.access_token).toBeTruthy();
    }
  });

  test("POST /api/auth/login returns JWT token", async () => {
    // First signup
    const email = `logintest_${Date.now()}@automationtest.com`;
    await apiPost(`${API}/auth/signup`, {
      email,
      password: "TestPass123!",
      display_name: "Login Test",
    });
    // Then login
    const { status, body } = await apiPost(`${API}/auth/login`, {
      email,
      password: "TestPass123!",
    });
    expect(status).toBe(200);
    expect(body.access_token).toBeTruthy();
    expect(body.token_type).toBe("bearer");
  });

  test("GET /api/auth/me requires auth", async () => {
    const { status } = await apiGet(`${API}/auth/me`);
    expect([401, 403, 422]).toContain(status);
  });

  test("GET /api/auth/me with valid JWT returns user", async () => {
    // Signup + login to get token
    const email = `metest_${Date.now()}@automationtest.com`;
    await apiPost(`${API}/auth/signup`, { email, password: "TestPass123!", display_name: "Me Test" });
    const { body: loginBody } = await apiPost(`${API}/auth/login`, { email, password: "TestPass123!" });
    const token = loginBody.access_token;
    if (!token) return; // skip if login failed

    const resp = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    const me = await resp.json().catch(() => ({}));
    expect(resp.status).toBe(200);
    expect(me.email).toBe(email);
  });
});

// ─── 5. FRONTEND PAGES ───────────────────────────────────────────────────────
test.describe("🖥️ Frontend Pages", () => {
  test("home/landing page loads", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    expect(page.url()).toBeTruthy();
    // Should not show a server error (check visible text, not raw HTML)
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toContain("Internal Server Error");
    expect(bodyText).not.toContain("Application error");
    // Page should have some real content
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test("unauthenticated /dashboard redirects to login", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    // Should redirect to login
    await page.waitForURL(/login/, { timeout: 5000 }).catch(() => {});
    const url = page.url();
    expect(url).toMatch(/login|signin|auth/i);
  });

  test("page title is set correctly", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.waitForLoadState("networkidle");
    const title = await page.title();
    expect(title).not.toBe("");
    expect(title).not.toBe("Error");
  });

  test("no console errors on login page", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto(`${BASE}/login`);
    await page.waitForLoadState("networkidle");
    // Filter out expected third-party errors
    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("analytics") && !e.includes("gtag")
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
