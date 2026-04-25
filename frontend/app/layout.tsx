import "./globals.css";
import ToastProvider from "../components/ToastProvider";
import type { Viewport } from "next";

export const metadata = {
  title: "InterviewGenius AI — The Most Advanced AI Interview Platform",
  description: "Real-time AI interview copilot with stealth overlay, 100+ resume templates, coding analysis, and adaptive coaching. Beat every interview.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "InterviewGenius",
  },
  icons: {
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#00D4FF",
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
            __html: [
              // Polyfill: intercept window.mgt assignments from browser extensions (e.g. LinkedIn,
              // Microsoft Graph Toolkit) that omit clearMarks/mark, preventing "mgt.clearMarks is
              // not a function" crashes before any other script runs.
              `(function(){try{var _v=null;Object.defineProperty(window,'mgt',{configurable:true,` +
              `get:function(){return _v;},` +
              `set:function(v){if(v&&typeof v.clearMarks!=='function')v.clearMarks=function(){};` +
              `if(v&&typeof v.mark!=='function')v.mark=function(){};` +
              `if(v&&typeof v.getMarks!=='function')v.getMarks=function(){return[];};` +
              `if(v&&typeof v.getMeasures!=='function')v.getMeasures=function(){return[];};` +
              `_v=v;}});}catch(e){}})();`,
              `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js?v=3').then(()=>navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.update()))).catch(()=>{})}`,
            ].join(''),
          }}
        />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
