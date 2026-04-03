const INSTALLER_VERSION = "0.3.2";
const INSTALLER_FILE = `AtluriIn-AI-${INSTALLER_VERSION}-Setup.exe`;
const INSTALLER_URL =
  `https://github.com/atlurisatheesh/atluri-ai/releases/download/atluri-ai/${INSTALLER_FILE}`;

// Update this after building/signing the installer.
const INSTALLER_SHA256 = "25B451A4A126FF5E9339B47C2565DB057802AE20C1E87E9ADAE906086EB2D674";

export async function GET() {
  return Response.json({
    version: INSTALLER_VERSION,
    file: INSTALLER_FILE,
    url: INSTALLER_URL,
    sha256: INSTALLER_SHA256,
    publisher: "AtluriIn AI",
    signed: false,
  });
}
