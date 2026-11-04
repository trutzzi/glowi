import type { Metadata, Viewport } from "next";
import { getBrand, getSalonInfo } from "@/app/lib/settings";
import { brandCssVars } from "@/lib/brand";
import { themeScript } from "@/lib/theme";
import { fontVariables } from "@/app/fonts";
import { AuthProvider } from "@/components/AuthProvider";
import { PwaSetup } from "@/components/PwaSetup";
import "./globals.css";

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
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf7f4" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1117" },
  ],
  viewportFit: "cover",
};

// Each area brings its own frame: MobileShell for the client side and login
// screens, a full-width layout for the admin panel.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The salon's colour and fonts (Profil → Aspect) override the theme variables
  // from globals.css. Cached, so pages stay static until the admin changes them.
  const brand = await getBrand();
  const css = (vars: Record<string, string>) => Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";");
  const brandCss = `:root{${css(brandCssVars(brand))}}:root[data-theme="dark"]{${css(brandCssVars(brand, true))}}`;
  return (
    // data-theme is set by themeScript before React hydrates.
    <html lang="ro" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <style>{brandCss}</style>
      </head>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
        <PwaSetup />
      </body>
    </html>
  );
}
