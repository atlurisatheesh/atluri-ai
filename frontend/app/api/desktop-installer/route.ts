import { promises as fs } from "node:fs";
import path from "node:path";

const findFirstExe = async (dirPath: string): Promise<string | null> => {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".exe")) {
        return fullPath;
      }
    }
    return null;
  } catch {
    return null;
  }
};

export async function GET() {
  const repoRoot = path.resolve(process.cwd(), "..");
  const releaseDir = path.join(repoRoot, "desktop", "release");
  const installerPath = await findFirstExe(releaseDir);

  if (!installerPath) {
    return Response.json(
      {
        error: "installer_not_found",
        message: "Desktop installer not found. Build with: cd desktop && npm run dist:win",
      },
      { status: 404 },
    );
  }

  const fileBuffer = await fs.readFile(installerPath);
  const filename = path.basename(installerPath);

  return new Response(fileBuffer, {
    status: 200,
    headers: {
      "content-type": "application/octet-stream",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
