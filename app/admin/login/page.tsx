import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MobileShell } from "@/components/MobileShell";
import { LoginForm } from "@/components/LoginForm";

// Administrator login
export default function AdminLoginPage() {
  return (
    <MobileShell>
      <main className="flex flex-1 flex-col px-8 pt-16 pb-10">
        <header className="flex flex-col items-center text-gray-800">
          <Logo className="h-20 w-20 text-primary" />
          <h1 className="mt-2 text-2xl font-medium">Administrator</h1>
          <p className="mt-1 text-sm text-gray-500">Conectează-te pentru a administra salonul</p>
        </header>

        <div className="mt-10">
          <LoginForm role="admin" redirectTo="/admin" submitLabel="CONECTARE" />
        </div>

        <p className="mt-auto pt-10 text-center text-sm text-gray-500">
          Nu ești administrator?{" "}
          <Link href="/login" className="font-medium text-primary hover:text-primary-dark">
            Conectare client
          </Link>
        </p>
      </main>
    </MobileShell>
  );
}
