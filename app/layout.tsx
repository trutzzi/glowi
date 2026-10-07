import type { Metadata, Viewport } from "next";
import { getSalonInfo } from "@/app/lib/settings";
import { Outfit, Playfair_Display } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { PwaSetup } from "@/components/PwaSetup";
import "./globals.css";

// latin-ext includes Romanian ș and ț; with only "latin" they fall back to another font.
const outfit = Outfit({ subsets: ["latin", "latin-ext"], variable: "--font-outfit" });
const playfair = Playfair_Display({ subsets: ["latin", "latin-ext"], variable: "--font-playfair" });

export async function generateMetadata(): Promise<Metadata> {
  const { name } = await getSalonInfo(); // cached
  return {
    title: name,
    description: `${name} — programările tale de frumusețe, mereu la îndemână`,
    applicationName: name,
    // iPhone/iPad: open full-screen from the home screen, with the salon name under the icon.
    appleWebApp: { capable: true, title: name, statusBarStyle: "default" },
  };
}

// viewportFit "cover" lets the installed app use the whole screen; layouts pad
// themselves with env(safe-area-inset-*) so nothing sits under the notch.
export const viewport: Viewport = { themeColor: "#fbf7f4", viewportFit: "cover" };

// Each area brings its own frame: MobileShell for the client side and login
// screens, a full-width layout for the admin panel.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro" className={`${outfit.variable} ${playfair.variable}`}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
        <PwaSetup />
      </body>
    </html>
  );
}
