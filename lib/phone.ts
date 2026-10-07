// Phone helpers shared by the SMS sender and the admin call/WhatsApp buttons.

// Romanian mobile numbers only: "0712 345 678", "+40712345678", "0040712345678" -> "+40712345678".
export function normalizeRoMobile(phone: string): string | null {
  const digits = phone.replace(/[\s()-]/g, "");
  const match = digits.match(/^(?:\+40|0040|0)?(7\d{8})$/);
  return match ? `+40${match[1]}` : null;
}

// Best effort international form for tel: and wa.me links. Romanian numbers
// written locally ("07…", "02…") get +40; anything else keeps its own prefix.
export function toInternational(phone: string): string | null {
  const ro = normalizeRoMobile(phone);
  if (ro) return ro;
  const compact = phone.replace(/[^\d+]/g, "").replace(/^00/, "+");
  if (compact.startsWith("+")) return compact.length > 6 ? compact : null;
  if (compact.startsWith("0")) return `+40${compact.slice(1)}`;
  return null;
}

// "tel:+40712345678"
export const telLink = (phone: string) => {
  const intl = toInternational(phone);
  return intl ? `tel:${intl}` : null;
};

// wa.me wants the number without "+" and the message URL-encoded.
export const whatsappLink = (phone: string, text: string) => {
  const intl = toInternational(phone);
  return intl ? `https://wa.me/${intl.slice(1)}?text=${encodeURIComponent(text)}` : null;
};
