const INSTALLER_VERSION = "0.3.4";
const INSTALLER_FILE = `AtluriIn-AI-${INSTALLER_VERSION}-Setup.exe`;
const INSTALLER_URL =
  `https://github.com/atlurisatheesh/atluri-ai/releases/download/atluri-ai/${INSTALLER_FILE}`;

// Update this after building/signing the installer.
const INSTALLER_SHA256 = "E8BEC1E349AFF1539BFF4496221E4F9D82ADE16820DB2510D88ED5F205DDEBA7";

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
