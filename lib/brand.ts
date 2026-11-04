// The salon's branding (Profil → Aspect): one accent colour and two fonts.
// Pure functions, used by the server (root layout) and the admin's live preview.

export type Brand = { color: string; headingFont: HeadingFont; bodyFont: BodyFont }

// Every font is loaded in app/fonts.ts with latin-ext (ș, ț) and exposed as
// var(--font-<key>); only the chosen ones are downloaded by the browser.
export const HEADING_FONTS = {
  playfair: { label: 'Playfair Display', note: 'elegant, clasic', fallback: 'ui-serif, Georgia, serif' },
  cormorant: { label: 'Cormorant Garamond', note: 'fin, luxos', fallback: 'ui-serif, Georgia, serif' },
  dmserif: { label: 'DM Serif Display', note: 'puternic, modern', fallback: 'ui-serif, Georgia, serif' },
  fraunces: { label: 'Fraunces', note: 'cald, prietenos', fallback: 'ui-serif, Georgia, serif' },
  montserrat: { label: 'Montserrat', note: 'curat, fără serife', fallback: 'ui-sans-serif, system-ui, sans-serif' },
  josefin: { label: 'Josefin Sans', note: 'geometric, aerisit', fallback: 'ui-sans-serif, system-ui, sans-serif' },
} as const

export const BODY_FONTS = {
  outfit: { label: 'Outfit', note: 'rotunjit, modern' },
  dmsans: { label: 'DM Sans', note: 'neutru, foarte lizibil' },
  nunito: { label: 'Nunito', note: 'moale, prietenos' },
  lato: { label: 'Lato', note: 'sobru, profesional' },
} as const

export type HeadingFont = keyof typeof HEADING_FONTS
export type BodyFont = keyof typeof BODY_FONTS

export const DEFAULT_BRAND: Brand = { color: '#9d3f66', headingFont: 'playfair', bodyFont: 'outfit' }

// Suggestions in the colour picker; any colour works.
export const BRAND_PRESETS = [
  { color: '#9d3f66', label: 'Prună' },
  { color: '#c2416b', label: 'Trandafir' },
  { color: '#b4532a', label: 'Teracotă' },
  { color: '#8a6a2f', label: 'Auriu' },
  { color: '#4d7c5a', label: 'Salvie' },
  { color: '#2f6f73', label: 'Petrol' },
  { color: '#3d4f8a', label: 'Bleumarin' },
  { color: '#3f3a3c', label: 'Grafit' },
] as const

export const isHexColor = (v: string) => /^#[0-9a-f]{6}$/i.test(v)
export const isHeadingFont = (v: string): v is HeadingFont => v in HEADING_FONTS
export const isBodyFont = (v: string): v is BodyFont => v in BODY_FONTS

type Hsl = { h: number; s: number; l: number } // h 0–360, s/l 0–100

function hexToHsl(hex: string): Hsl {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: l * 100 }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: h * 60, s: s * 100, l: l * 100 }
}

function hslToHex({ h, s, l }: Hsl): string {
  const sat = s / 100
  const lig = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = sat * Math.min(lig, 1 - lig)
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  return `#${[f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')}`
}

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const lin = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
}

// WCAG contrast between two colours.
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const contrastWithWhite = (hex: string) => contrast(hex, '#ffffff')

export type BrandPalette = {
  primary: string
  primaryDark: string
  primarySoft: string
  blush: string
  hero: string
  adjusted: boolean // the colour was darkened so white text on buttons stays readable
}

// The original, hand-picked palette (same values as app/globals.css).
const DEFAULT_PALETTE: BrandPalette = {
  primary: '#9d3f66',
  primaryDark: '#7e2f50',
  primarySoft: '#f6e6ed',
  blush: '#f5e1da',
  hero: '#e9c9c1',
  adjusted: false,
}

// Everything the theme needs from one colour. Buttons put white text on
// `primary`, so a light colour is darkened until it reaches 4.5:1 (WCAG AA).
export function brandPalette(color: string): BrandPalette {
  if (color.toLowerCase() === DEFAULT_BRAND.color) return DEFAULT_PALETTE
  const base = hexToHsl(isHexColor(color) ? color : DEFAULT_BRAND.color)
  let primary = hslToHex(base)
  let adjusted = false
  for (let l = base.l; contrastWithWhite(primary) < 4.5 && l > 5; l -= 2) {
    primary = hslToHex({ ...base, l })
    adjusted = true
  }
  const p = hexToHsl(primary)
  const tint = Math.min(base.s, 55) // keep the light backgrounds soft, even for vivid colours
  return {
    primary,
    primaryDark: hslToHex({ ...p, l: Math.max(p.l - 9, 8) }),
    primarySoft: hslToHex({ h: base.h, s: tint, l: 94 }),
    blush: hslToHex({ h: base.h, s: tint * 0.8, l: 91 }),
    hero: hslToHex({ h: base.h, s: tint * 0.7, l: 84 }),
    adjusted,
  }
}

export type DarkBrandPalette = Omit<BrandPalette, 'adjusted'> & { onPrimary: string }

// Dark theme, hand-picked for the default colour: rose pink on plum.
const DEFAULT_DARK_PALETTE: DarkBrandPalette = {
  primary: '#eda6c4',
  primaryDark: '#f6c4d9', // hover and accent text: lighter, not darker, on a dark background
  primarySoft: '#3d2333',
  blush: '#34212c',
  hero: '#4a2a3c',
  onPrimary: '#3a1028',
}

// The dark theme flips the roles: buttons are a light tint of the colour with
// dark text on them, and the soft surfaces become deep, low-saturation shades.
export function brandDarkPalette(color: string): DarkBrandPalette {
  if (color.toLowerCase() === DEFAULT_BRAND.color) return DEFAULT_DARK_PALETTE
  const base = hexToHsl(isHexColor(color) ? color : DEFAULT_BRAND.color)
  const s = Math.min(base.s, 70)
  const onPrimary = hslToHex({ h: base.h, s: Math.min(base.s, 55), l: 12 })
  let l = 74
  while (contrast(hslToHex({ h: base.h, s, l }), onPrimary) < 4.5 && l < 92) l += 2
  return {
    primary: hslToHex({ h: base.h, s, l }),
    primaryDark: hslToHex({ h: base.h, s, l: Math.min(l + 9, 94) }),
    primarySoft: hslToHex({ h: base.h, s: s * 0.4, l: 19 }),
    blush: hslToHex({ h: base.h, s: s * 0.35, l: 16 }),
    hero: hslToHex({ h: base.h, s: s * 0.4, l: 22 }),
    onPrimary,
  }
}

// CSS custom properties that override the defaults in app/globals.css: the light
// theme, or (dark = true) the colours for :root[data-theme="dark"].
export function brandCssVars(brand: Brand, dark = false): Record<string, string> {
  const p = dark ? brandDarkPalette(brand.color) : { ...brandPalette(brand.color), onPrimary: '#ffffff' }
  return {
    '--color-primary': p.primary,
    '--color-primary-dark': p.primaryDark,
    '--color-primary-soft': p.primarySoft,
    '--color-blush': p.blush,
    '--color-hero': p.hero,
    '--color-on-primary': p.onPrimary,
    '--font-display': `var(--font-${brand.headingFont}), ${HEADING_FONTS[brand.headingFont].fallback}`,
    '--font-sans': `var(--font-${brand.bodyFont}), ui-sans-serif, system-ui, sans-serif`,
  }
}
