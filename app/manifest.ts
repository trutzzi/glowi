import type { MetadataRoute } from "next";
import { getSalonInfo } from "@/app/lib/settings";

// Makes the app installable ("Add to Home Screen"). The name follows the salon
// name set in Profil; getSalonInfo is cached.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { name } = await getSalonInfo();
  return {
    name,
    short_name: name.length > 12 ? name.split(" ")[0] : name,
    description: `${name} — programările tale de frumusețe, mereu la îndemână`,
    lang: "ro",
    start_url: "/start", // sends admins, clients and logged-out visitors to the right screen
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf7f4",
    theme_color: "#fbf7f4",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
