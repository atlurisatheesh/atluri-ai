const INSTALLER_VERSION = "0.3.3";
const INSTALLER_FILE = `AtluriIn-AI-${INSTALLER_VERSION}-Setup.exe`;
const INSTALLER_URL =
  `https://github.com/atlurisatheesh/atluri-ai/releases/download/atluri-ai/${INSTALLER_FILE}`;

// Update this after building/signing the installer.
const INSTALLER_SHA256 = "7F034EE9F348E7355C3E092B6E0E750AACF227A70AC7738968392D1AF9989608";

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
