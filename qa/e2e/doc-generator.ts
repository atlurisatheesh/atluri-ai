import fs from "fs";
import path from "path";
import {
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { RunReport } from "./types";

function fileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function para(text: string): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: String(text || "") })] });
}

export async function generateDocxReport(report: RunReport, outPath: string): Promise<void> {
  const children: Paragraph[] = [];

  children.push(new Paragraph({ text: "AtluriIn E2E QA Report", heading: HeadingLevel.TITLE }));
  children.push(para(`Verdict: ${report.verdict}`));
  children.push(para(`Generated: ${report.generatedAtIso}`));

  children.push(new Paragraph({ text: "Environment", heading: HeadingLevel.HEADING_1 }));
  children.push(para(`Frontend: ${report.environment.frontendUrl}`));
  children.push(para(`Backend: ${report.environment.backendUrl}`));
  children.push(para(`Node: ${report.environment.nodeVersion}`));
  children.push(para(`OS: ${report.environment.osPlatform}`));
  children.push(para(`Browser: ${report.environment.browserName} ${report.environment.browserVersion}`));
  children.push(para(`Headless: ${report.environment.headless}`));

  children.push(new Paragraph({ text: "Determinism", heading: HeadingLevel.HEADING_1 }));
  children.push(
    para(
      `Offer Probability repeat-call variance: ${report.determinism.variance.toFixed(4)} (threshold ${report.determinism.threshold}) → ${report.determinism.passed ? "PASS" : "FAIL"}`
    )
  );
  if (report.determinism.notes) {
    children.push(para(report.determinism.notes));
  }

  children.push(new Paragraph({ text: "Steps", heading: HeadingLevel.HEADING_1 }));

  for (const step of report.steps) {
    children.push(new Paragraph({ text: `${step.name} — ${step.status.toUpperCase()}`, heading: HeadingLevel.HEADING_2 }));
    children.push(para(`Duration: ${Math.round(step.durationMs)}ms`));
    if (step.details) children.push(para(step.details));

    for (const perf of step.perf) {
      const verdict = perf.passed == null ? "" : perf.passed ? "PASS" : "FAIL";
      children.push(para(`Perf: ${perf.key} = ${Math.round(perf.valueMs)}ms${perf.thresholdMs ? ` (<=${perf.thresholdMs}ms)` : ""} ${verdict}`));
    }
    for (const ai of step.ai) {
      children.push(para(`AI Validate: ${ai.title} → ${ai.passed ? "PASS" : "FAIL"} (confidence ${ai.confidence})`));
    }

    for (const shot of step.screenshots) {
      if (!fileExists(shot.path)) continue;
      const img = fs.readFileSync(shot.path);
      children.push(para(`Screenshot: ${path.basename(shot.path)}`));
      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              type: "png",
              data: img,
              transformation: { width: 600, height: 340 },
            }),
          ],
        })
      );
    }
  }

  children.push(new Paragraph({ text: "Errors", heading: HeadingLevel.HEADING_1 }));
  children.push(para(`Console errors: ${report.console.length}`));
  children.push(para(`Network failures: ${report.networkFailures.length}`));

  if (report.console.length > 0) {
    children.push(new Paragraph({ text: "Console", heading: HeadingLevel.HEADING_2 }));
    for (const item of report.console.slice(0, 25)) {
      children.push(para(`[${item.tsIso}] ${item.kind}${item.level ? `:${item.level}` : ""} ${item.message}`));
    }
    if (report.console.length > 25) {
      children.push(para(`... truncated (${report.console.length - 25} more)`));
    }
  }

  if (report.networkFailures.length > 0) {
    children.push(new Paragraph({ text: "Network", heading: HeadingLevel.HEADING_2 }));
    for (const item of report.networkFailures.slice(0, 25)) {
      children.push(
        para(
          `[${item.tsIso}] ${item.kind} ${item.method || ""} ${item.status != null ? item.status : ""} ${item.url}${item.failureText ? ` (${item.failureText})` : ""}`.trim()
        )
      );
    }
    if (report.networkFailures.length > 25) {
      children.push(para(`... truncated (${report.networkFailures.length - 25} more)`));
    }
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const buf = await Packer.toBuffer(doc);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
}
