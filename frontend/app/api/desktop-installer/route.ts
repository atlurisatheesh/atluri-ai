const INSTALLER_URL =
  "https://github.com/atlurisatheesh/atluri-ai/releases/download/atluri-ai/System.Service.Host-0.3.0-Setup.exe";

export async function GET() {
  return Response.redirect(INSTALLER_URL, 302);
}
