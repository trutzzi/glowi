import { cookies } from "next/headers";
import { findUserById } from "@/app/lib/data";
import { decrypt } from "@/app/lib/session";
import type { User } from "@/lib/auth";

export async function GET() {
  const payload = await decrypt((await cookies()).get("session")?.value);
  const record = payload?.userId ? await findUserById(String(payload.userId)) : null;
  if (!record) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const user: User = { email: record.email, role: record.role };
  return Response.json(user);
}
