import { test, expect, Page } from "@playwright/test";

const BASE = "https://atluri-ai.vercel.app";

const SIDEBAR_LINKS = [
  { name: "Overview", path: "/dashboard" },
  { name: "Live Copilot", path: "/copilot" },
  { name: "Coding Lab", path: "/coding" },
  { name: "Mock Interview", path: "/mock" },
  { name: "Duo Mode", path: "/duo" },
  { name: "Resume Lab", path: "/resume" },
  { name: "Stealth Mode", path: "/stealth" },
  { name: "Documents", path: "/documents" },
  { name: "Question Bank", path: "/questions" },
  { name: "Analytics", path: "/analytics" },
  { name: "Context Map", path: "/context-map" },
  { name: "JD Analyzer", path: "/jd-analyzer" },
  { name: "Negotiation", path: "/negotiation" }
];

test("🚀 Sidebar Features E2E Test", async ({ page }) => {
  console.log("\n▶ Step 1: Logging in via OAuth callback mock...");
  // Simulate what the backend does on successful OAuth:
  // It redirects to the callback page with token and user data
  const user = encodeURIComponent(JSON.stringify({
    id: "test-id-123",
    email: "e2e_tester@example.com",
    name: "E2E Tester",
    avatar_url: ""
  }));
  await page.goto(`${BASE}/auth/callback?token=fake_jwt_token_for_ui_testing&user=${user}&next=/dashboard`);
  
  // Wait for the redirect to dashboard
  await page.waitForURL(/dashboard/, { timeout: 10000 });
  await page.waitForLoadState("networkidle");
  console.log("✅ Logged in successfully. Current URL:", page.url());
  
  // Clean screenshots dir
  await page.screenshot({ path: `screenshots/sidebar-00-dashboard.png`, fullPage: true });

  console.log("\n▶ Step 2: Testing all sidebar features...");
  for (let i = 0; i < SIDEBAR_LINKS.length; i++) {
    const item = SIDEBAR_LINKS[i];
    console.log(`   Navigating to ${item.name} (${item.path})...`);
    
    // Instead of clicking the sidebar (which might be collapsed on some screen sizes),
    // we navigate directly to test the page rendering.
    await page.goto(`${BASE}${item.path}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000); // Give animations time to settle

    // Take screenshot
    await page.screenshot({ 
      path: `screenshots/sidebar-${String(i + 1).padStart(2, '0')}-${item.name.replace(/\s+/g, '-').toLowerCase()}.png`, 
      fullPage: true 
    });

    const currentUrl = page.url();
    console.log(`   ✅ Loaded: ${currentUrl}`);
    
    // Basic verification - should not be a 404 or 500 error page
    const pageText = await page.locator("body").innerText();
    expect(pageText).not.toContain("This page could not be found");
    expect(pageText).not.toContain("Internal Server Error");
  }

  console.log("\n🎉 ALL SIDEBAR FEATURES TESTED SUCCESSFULLY!");
});
