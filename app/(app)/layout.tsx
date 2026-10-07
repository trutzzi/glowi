import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { MobileShell } from "@/components/MobileShell";

// Shared shell for every tab screen: logo bar, scrollable content, fixed bottom nav.
// Phones: full width. Tablets and up: content in a centred column up to 1024px.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileShell variant="app">
      <div className="mx-auto w-full max-w-5xl md:px-3">
        <AppHeader href="/home" />
      </div>
      <main className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto px-5 pt-2 pb-6 md:px-8 md:pt-4">{children}</main>
      <BottomNav />
    </MobileShell>
  );
}
