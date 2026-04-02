const INSTALLER_URL =
  "https://github.com/atlurisatheesh/atluri-ai/releases/download/atluri-ai/AtluriIn.Practice-0.1.0-Setup.exe";

export async function GET() {
  return Response.redirect(INSTALLER_URL, 302);
}
