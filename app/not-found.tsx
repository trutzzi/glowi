import Link from "next/link";
import { MobileShell } from "@/components/MobileShell";

// Shown for unknown URLs and whenever a page calls notFound().
export default function NotFound() {
  return (
    <MobileShell>
      <main className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <h1 className="text-2xl font-medium text-gray-900">Pagina nu a fost găsită</h1>
        <p className="mt-2 text-sm text-gray-500">Adresa nu există sau elementul a fost șters.</p>
        <Link href="/" className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-dark">
          Înapoi la început
        </Link>
      </main>
    </MobileShell>
  );
}
