import { DM_Sans, DM_Serif_Display, Cormorant_Garamond, Fraunces, Josefin_Sans, Lato, Montserrat, Nunito, Outfit, Playfair_Display } from "next/font/google";

// Every font the salon can pick in Profil → Aspect (lib/brand.ts). Each one is
// exposed as var(--font-<key>); the browser only downloads the ones in use.
// latin-ext includes Romanian ș and ț. Only the defaults are preloaded.

// Headings
const playfair = Playfair_Display({ subsets: ["latin", "latin-ext"], variable: "--font-playfair" });
const cormorant = Cormorant_Garamond({ subsets: ["latin", "latin-ext"], weight: ["500", "600"], variable: "--font-cormorant", preload: false });
const dmserif = DM_Serif_Display({ subsets: ["latin", "latin-ext"], weight: "400", variable: "--font-dmserif", preload: false });
const fraunces = Fraunces({ subsets: ["latin", "latin-ext"], variable: "--font-fraunces", preload: false });
const montserrat = Montserrat({ subsets: ["latin", "latin-ext"], variable: "--font-montserrat", preload: false });
const josefin = Josefin_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-josefin", preload: false });
// Text
const outfit = Outfit({ subsets: ["latin", "latin-ext"], variable: "--font-outfit" });
const dmsans = DM_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-dmsans", preload: false });
const nunito = Nunito({ subsets: ["latin", "latin-ext"], variable: "--font-nunito", preload: false });
const lato = Lato({ subsets: ["latin", "latin-ext"], weight: ["400", "700"], variable: "--font-lato", preload: false });

export const fontVariables = [playfair, cormorant, dmserif, fraunces, montserrat, josefin, outfit, dmsans, nunito, lato]
  .map((f) => f.variable)
  .join(" ");
