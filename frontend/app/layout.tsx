import "./globals.css";
import ToastProvider from "../components/ToastProvider";

export const metadata = {
  title: "InterviewGenius AI — The Most Advanced AI Interview Platform",
  description: "Real-time AI interview copilot with stealth overlay, 100+ resume templates, coding analysis, and adaptive coaching. Beat every interview.",
  manifest: "/manifest.json",
  themeColor: "#00D4FF",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "InterviewGenius",
  },
  icons: {
    apple: "/icons/icon-192.png",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    viewportFit: "cover",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body data-atmosphere="balanced" suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{})}`,
          }}
        />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
