"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

export function LogoutButton({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <button
      type="button"
      onClick={async () => {
        await logout();
        router.push(redirectTo);
      }}
      className="rounded-full border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
    >
      Deconectare
    </button>
  );
}
