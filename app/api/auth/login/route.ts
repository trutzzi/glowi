import { verifyCredentials } from "@/app/lib/data";
import { createSession } from "@/app/lib/session";
import type { User } from "@/lib/auth";

export async function POST(request: Request) {
  // `identifier` is an email or a phone number; `email` is the older field name.
  const { identifier, email, password, role } = await request.json();
  const login = identifier ?? email;
  if (!login || !password || (role !== "client" && role !== "admin")) {
    return Response.json({ error: "Emailul (sau telefonul) și parola sunt obligatorii" }, { status: 400 });
  }

  const record = await verifyCredentials(String(login), String(password), role);
  if (!record) {
    return Response.json({ error: "Date de conectare greșite" }, { status: 401 });
  }

  await createSession(record.id, record.role);
  const user: User = { email: record.email, role: record.role };
  return Response.json(user);
}
