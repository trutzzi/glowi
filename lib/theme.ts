// Light/dark theme. The visitor's choice lives in localStorage on this device
// ("auto" = follow the system); <html data-theme> drives the CSS in app/globals.css.

export type ThemeChoice = "auto" | "light" | "dark";

export const THEME_KEY = "theme";
export const THEME_EVENT = "themechange";

// Inlined in <head> by the root layout so the right theme is set before the first
// paint (no white flash), and kept in sync with the system while on "auto".
export const themeScript = `(function(){var m=matchMedia("(prefers-color-scheme: dark)");function a(){var t;try{t=localStorage.getItem("${THEME_KEY}")}catch(e){}document.documentElement.dataset.theme=t==="light"||t==="dark"?t:m.matches?"dark":"light"}a();m.addEventListener("change",a);addEventListener("storage",a);window.__applyTheme=a})()`;

export function readThemeChoice(): ThemeChoice {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : "auto";
  } catch {
    return "auto";
  }
}

export function saveThemeChoice(choice: ThemeChoice) {
  try {
    if (choice === "auto") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {}
  (window as { __applyTheme?: () => void }).__applyTheme?.();
  window.dispatchEvent(new Event(THEME_EVENT)); // the choice can change while the shown theme doesn't
}
