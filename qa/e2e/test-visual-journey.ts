import { test, expect, Page } from "@playwright/test";

const BASE = "https://atluri-ai.vercel.app";
const TEST_EMAIL = `realuser_${Date.now()}@testmail.com`;
const TEST_PASSWORD = "TestUser@2024!";
const TEST_NAME = "Real User Test";

// ─── FULL USER JOURNEY ───────────────────────────────────────────────────────
test("🚀 Full User Journey — Signup → Login → Explore App", async ({ page }) => {
  // ── Step 1: Visit the homepage ──────────────────────────────────────────
  console.log("\n▶ Step 1: Opening homepage...");
  await page.goto(BASE);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "screenshots/01-homepage.png", fullPage: true });
  console.log("✅ Homepage loaded:", page.url());

  // ── Step 2: Navigate to Signup ──────────────────────────────────────────
  console.log("\n▶ Step 2: Going to Signup page...");
  await page.goto(`${BASE}/signup`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "screenshots/02-signup-page.png", fullPage: true });

  // Fill signup form
  const emailField = page.locator('input[type="email"], input[name="email"]').first();
  const passwordField = page.locator('input[type="password"]').first();
  const nameField = page.locator('input[name="name"], input[name="display_name"], input[placeholder*="name" i]').first();

  if (await nameField.isVisible()) {
    await nameField.fill(TEST_NAME);
    console.log("✅ Filled name field");
  }
  await emailField.fill(TEST_EMAIL);
  await passwordField.fill(TEST_PASSWORD);
  console.log("✅ Filled signup form with:", TEST_EMAIL);
  await page.screenshot({ path: "screenshots/03-signup-filled.png", fullPage: true });

  // Submit signup
  const submitBtn = page.locator('button[type="submit"], button:has-text("Sign up"), button:has-text("Create"), button:has-text("Register")').first();
  await submitBtn.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "screenshots/04-after-signup.png", fullPage: true });
  console.log("✅ Signup submitted. Current URL:", page.url());

  // ── Step 3: Login ────────────────────────────────────────────────────────
  console.log("\n▶ Step 3: Logging in...");
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  const loginEmail = page.locator('input[type="email"], input[name="email"]').first();
  const loginPassword = page.locator('input[type="password"]').first();
  await loginEmail.fill(TEST_EMAIL);
  await loginPassword.fill(TEST_PASSWORD);
  await page.screenshot({ path: "screenshots/05-login-filled.png", fullPage: true });

  const loginBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in"), button:has-text("Log in")').first();
  await loginBtn.click();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: "screenshots/06-after-login.png", fullPage: true });
  console.log("✅ Login submitted. Current URL:", page.url());

  // ── Step 4: Explore Dashboard ────────────────────────────────────────────
  console.log("\n▶ Step 4: Exploring Dashboard...");
  const currentUrl = page.url();
  if (currentUrl.includes("login")) {
    // Try navigating directly to dashboard
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(3000);
  }
  await page.screenshot({ path: "screenshots/07-dashboard.png", fullPage: true });
  console.log("✅ Dashboard URL:", page.url());

  // ── Step 5: Try Interview feature ─────────────────────────────────────── 
  console.log("\n▶ Step 5: Testing Interview feature...");
  const interviewLink = page.locator('a[href*="interview"], button:has-text("Interview"), nav a:has-text("Interview")').first();
  if (await interviewLink.isVisible({ timeout: 3000 })) {
    await interviewLink.click();
    await page.waitForTimeout(3000);
    console.log("✅ Interview page:", page.url());
  } else {
    await page.goto(`${BASE}/interview`);
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: "screenshots/08-interview.png", fullPage: true });

  // Click through the Interview Wizard
  console.log("   → Clicking through Interview Wizard...");
  try {
    // We are on Step 0: Company
    await page.locator('button:has-text("Next")').click({ timeout: 2000 });
    await page.waitForTimeout(500);
    // Step 1: Scenario
    await page.locator('button:has-text("Next")').click({ timeout: 2000 });
    await page.waitForTimeout(500);
    // Step 2: Difficulty
    await page.locator('button:has-text("Next")').click({ timeout: 2000 });
    await page.waitForTimeout(500);
    // Step 3: Focus Area
    await page.locator('button:has-text("Next")').click({ timeout: 2000 });
    await page.waitForTimeout(500);
    // Step 4: Ready
    await page.locator('button:has-text("Start Interview")').click({ timeout: 2000 });
    await page.waitForTimeout(3000);
    
    console.log("✅ Reached Live Voice Interview UI:", page.url());
    await page.screenshot({ path: "screenshots/08b-live-voice-interview.png", fullPage: true });
  } catch (e) {
    console.log("   → Could not complete wizard (might be on different layout)");
  }

  // ── Step 6: Try Resume feature ────────────────────────────────────────── 
  console.log("\n▶ Step 6: Testing Resume feature...");
  await page.goto(`${BASE}/resume`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "screenshots/09-resume.png", fullPage: true });
  console.log("✅ Resume page:", page.url());

  // ── Step 7: Check all nav links ──────────────────────────────────────────
  console.log("\n▶ Step 7: Checking Navigation...");
  await page.goto(`${BASE}/dashboard`);
  await page.waitForTimeout(2000);
  const navLinks = await page.locator("nav a, aside a").all();
  console.log(`✅ Found ${navLinks.length} navigation links`);
  for (const link of navLinks.slice(0, 8)) {
    const href = await link.getAttribute("href");
    const text = await link.textContent();
    console.log(`   → ${text?.trim()} → ${href}`);
  }
  await page.screenshot({ path: "screenshots/10-navigation.png", fullPage: true });

  // ── Step 8: Google OAuth button check ──────────────────────────────────
  console.log("\n▶ Step 8: Verifying Google OAuth button on login...");
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState("networkidle");
  const googleBtn = page.getByText(/google/i).first();
  await expect(googleBtn).toBeVisible();
  await googleBtn.click();
  await page.waitForURL(/accounts\.google\.com/, { timeout: 8000 });
  console.log("✅ Google OAuth redirects to:", page.url().substring(0, 80) + "...");
  await page.screenshot({ path: "screenshots/11-google-login.png", fullPage: true });

  console.log("\n🎉 ALL STEPS COMPLETED!");
});
