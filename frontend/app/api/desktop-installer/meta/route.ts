const INSTALLER_VERSION = "0.3.5";
const INSTALLER_FILE = `AtluriIn-AI-${INSTALLER_VERSION}-Setup.exe`;
const INSTALLER_URL =
  `https://github.com/atlurisatheesh/atluri-ai/releases/download/atluri-ai/${INSTALLER_FILE}`;

// Update this after building/signing the installer.
const INSTALLER_SHA256 = "072EDA71FFFA17B95246170F0580E3AC25F1DAC2EE63B9CD63628DFB3A45A9E4";

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
