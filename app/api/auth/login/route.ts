import { headers } from "next/headers";
import { verifyCredentials } from "@/app/lib/data";
import { blockedMinutes, recordFailure, recordSuccess, throttleKeys } from "@/app/lib/login-throttle";
import { createSession } from "@/app/lib/session";
import type { User } from "@/lib/auth";

export async function POST(request: Request) {
  // `identifier` is an email or a phone number; `email` is the older field name.
  const { identifier, email, password, role } = await request.json();
  const login = identifier ?? email;
  if (typeof login !== "string" || !login || typeof password !== "string" || !password || (role !== "client" && role !== "admin")) {
    return Response.json({ error: "Emailul (sau telefonul) și parola sunt obligatorii" }, { status: 400 });
  }

  // The reverse proxy (Caddy) sets X-Forwarded-For to the visitor's address.
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const keys = throttleKeys(login, ip);
  const wait = await blockedMinutes(keys);
  if (wait) {
    return Response.json(
      { error: `Prea multe încercări greșite. Încearcă din nou peste ${wait} ${wait === 1 ? "minut" : "minute"}.` },
      { status: 429, headers: { "Retry-After": String(wait * 60) } }
    );
  }

  const record = await verifyCredentials(login, password, role);
  if (!record) {
    await recordFailure(keys);
    return Response.json({ error: "Date de conectare greșite" }, { status: 401 });
  }

  await recordSuccess(keys);
  await createSession(record.id, record.role);
  const user: User = { email: record.email, role: record.role };
  return Response.json(user);
}
