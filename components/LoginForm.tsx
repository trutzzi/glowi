"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import type { Role } from "@/lib/auth";

type Props = { role: Role; redirectTo: string; submitLabel: string };

export function LoginForm({ role, redirectTo, submitLabel }: Props) {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setPending(true);
        try {
          await login(identifier, password, role);
          router.push(redirectTo);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Conectarea a eșuat");
          setPending(false);
        }
      }}
      className="space-y-4"
    >
      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">{role === "client" ? "Număr de telefon" : "Email"}</span>
        <input
          type={role === "client" ? "text" : "email"}
          inputMode={role === "client" ? "tel" : undefined}
          required
          autoComplete="username"
          placeholder={role === "client" ? "07xx xxx xxx" : undefined}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="w-full rounded-full bg-white px-5 py-3 text-sm text-gray-800 shadow-sm outline-none focus:ring-2 focus:ring-primary"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">Parolă</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-full bg-white px-5 py-3 text-sm text-gray-800 shadow-sm outline-none focus:ring-2 focus:ring-primary"
        />
      </label>
      {error && <p role="alert" className="text-center text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full disabled:opacity-60 rounded-full bg-primary py-4 text-sm font-semibold tracking-widest text-white shadow-md transition hover:bg-primary-dark"
      >
        {submitLabel}
      </button>
    </form>
  );
}
