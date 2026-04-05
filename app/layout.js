import { Manrope } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../lib/auth";
import SubscriptionInit from "./components/SubscriptionInit";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata = {
  title: "Wholefed",
  description: "AI-powered food scanner — is your food actually good for you?",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${manrope.className} dark`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-surface text-on-surface min-h-screen antialiased">
        <div className="grain-overlay" />
        <AuthProvider>
          <SubscriptionInit />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
