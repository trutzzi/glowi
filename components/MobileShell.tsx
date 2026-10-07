// Frame for the client side.
// - "card" (login, welcome, 404): full screen on phones, a centred phone-sized
//   card, centred vertically, on tablets and desktops — the usual pattern for
//   sign-in screens.
// - "app" (the logged-in tab screens): full screen on every device; the pages
//   themselves switch to wider multi-column layouts from tablet width (md).
export function MobileShell({ children, variant = "card" }: { children: React.ReactNode; variant?: "card" | "app" }) {
  const frame =
    variant === "app"
      ? "relative flex min-h-dvh w-full flex-1 flex-col bg-ivory pt-[env(safe-area-inset-top)]"
      : "relative mx-auto flex min-h-dvh w-full max-w-[440px] flex-col overflow-hidden bg-ivory pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:my-auto sm:min-h-[760px] sm:rounded-[36px] sm:shadow-xl sm:ring-1 sm:ring-black/5";
  return <div className={frame}>{children}</div>;
}
