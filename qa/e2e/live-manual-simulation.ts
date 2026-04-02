// @ts-check
/**
 * live-manual-simulation.ts
 * Automates the Electron Desktop App and simulates the interviewer voice
 * using Windows Speech Synthesis to test the Deepgram pipeline automatically.
 */
import { _electron as electron, ElectronApplication, Page } from "playwright";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const ELECTRON_MAIN = path.join(REPO_ROOT, "desktop", "dist", "main.js");
const SCREENSHOTS_DIR = path.join(REPO_ROOT, "qa", "e2e", "screenshots");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function speak(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`\n🗣️  [VOICE SIMULATOR] Speaking: "${text}"`);
    // Escape single quotes for PowerShell
    const escapedText = text.replace(/'/g, "''").replace(/"/g, '""');
    const cmd = `powershell -c "Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $synth.Rate = 1; $synth.Speak('${escapedText}')"`;
    
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Voice synthesis failed: ${error.message}`);
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log("🚀 Starting Live Voice Simulation...");

  if (!fs.existsSync(ELECTRON_MAIN)) {
    console.error(`❌ Electron build not found at: ${ELECTRON_MAIN}`);
    console.error("Please run `npm run build` in the desktop folder first.");
    process.exit(1);
  }

  console.log("Launch Electron UI...");
  
  const electronPath = process.platform === "win32"
    ? path.join(REPO_ROOT, "desktop", "node_modules", "electron", "dist", "electron.exe")
    : path.join(REPO_ROOT, "desktop", "node_modules", ".bin", "electron");

  if (!fs.existsSync(electronPath)) {
    console.error(`❌ Electron binary not found: ${electronPath}`);
    process.exit(1);
  }

  const app = await electron.launch({
    executablePath: electronPath,
    args: [ELECTRON_MAIN],
    env: {
      ...process.env,
      NODE_ENV: "test", // So loopback doesn't immediately fail but captures normally
      DESKTOP_FRONTEND_URL: "http://localhost:59999", // Force fallback to renderer/index.html
    },
    timeout: 30000,
  });

  // Removed firstWindow since we iterate over all windows
  
  const title = await app.evaluate(({ app }) => app.getName());
  console.log(`✅ App mounted: ${title}`);

  // Expand wait for electron to fully load windows
  await sleep(3000);

  const windows = app.windows();
  let page = windows[0];

  for (const w of windows) {
    w.on("console", async (msg) => console.log(`UI LOG [${(await w.url()).split('/').pop() || 'main'}]: ${msg.text()}`));
    try {
      const hasBtn = await w.locator('#startBtn').count();
      if (hasBtn > 0) {
        page = w;
        console.log("Found setup window!");
        break;
      }
    } catch (e) {
      // ignore
    }
  }

  // 2. Automate the UI setup
  console.log("Filling Setup Form...");
  
  // Choose Scenario (Behavioral)
  await page.locator('#setupScenario').selectOption({ label: "General Interview" }, { timeout: 5000 }).catch(e => console.log(e));
  
  // Type position
  await page.locator('#setupPosition').fill("Senior Software Engineer", { timeout: 5000 }).catch(e => console.log(e));
  
  // Take screenshot of setup
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "1_setup.png"), timeout: 5000 }).catch(e => console.log("screenshot failed", e));

  // Click START
  console.log("Clicking START button...");
  await page.locator('#startBtn').click({ timeout: 5000 });
  
  console.log("Waiting for overlay to initialize and WebSocket to connect...");
  // Wait for the "listening" states to change. E.g. #micStatusPill active
  await sleep(5000);

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "2_started.png") });

  // 3. Ask the question using PC loopback audio
  const question = "Alright, let's get started. I see your resume here. Before we get into the system design, tell me... how did you handle the situation when your engineering leadership proposed an architecture for the payment gateway that you knew was fundamentally flawed and would cause downtime?";
  
  await speak(question);
  console.log("Finished speaking. Wait for processing...");

  // 4. Wait for generation to appear.
  // The UI writes to #suggestion and #feed and #partial
  console.log("Monitoring UI for answer generation...");

  let suggestionText = "";
  let timeoutLoops = 0;
  while (timeoutLoops < 30) { 
    // Wait up to 30s
    suggestionText = await page.locator('#suggestion').innerText();
    if (suggestionText && suggestionText.trim().length > 10) {
      break;
    }
    await sleep(1000);
    timeoutLoops++;
  }

  if (!suggestionText || suggestionText.trim().length <= 10) {
    console.error("❌ Failed to capture or generate answer before timeout. (Is win-loopback capturing audio?)");
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "3_failed.png") });
    await app.close();
    process.exit(1);
  }

  console.log("✅ AI Answer Generated!");
  console.log("-----------------------------------------");
  console.log(suggestionText.trim());
  console.log("-----------------------------------------");

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "3_success_answer.png") });

  console.log("Closing app...");
  await app.close();
  console.log("🎉 Test completed successfully.");
}

run().catch((e) => {
  console.error("Fatal Error:", e);
  process.exit(1);
});
