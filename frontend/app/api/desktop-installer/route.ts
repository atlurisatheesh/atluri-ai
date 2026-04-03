const INSTALLER_URL =
  "https://github.com/atlurisatheesh/atluri-ai/releases/download/atluri-ai/AtluriIn-AI-0.3.1-Setup.exe";

export async function GET() {
  return Response.redirect(INSTALLER_URL, 302);
}
