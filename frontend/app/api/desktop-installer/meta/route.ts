const INSTALLER_VERSION = "0.3.2";
const INSTALLER_FILE = `AtluriIn-AI-${INSTALLER_VERSION}-Setup.exe`;
const INSTALLER_URL =
  `https://github.com/atlurisatheesh/atluri-ai/releases/download/atluri-ai/${INSTALLER_FILE}`;

// Update this after building/signing the installer.
const INSTALLER_SHA256 = "PENDING_BUILD_SHA256";

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
