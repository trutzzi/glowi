import { cookies } from "next/headers";
import { decrypt } from "@/app/lib/session";

// Where the installed app opens: the admin dashboard, the client's home, or the
// welcome screen when nobody is logged in.
export async function GET(request: Request) {
  const session = await decrypt((await cookies()).get("session")?.value);
  const target = !session?.userId ? "/" : session.role === "admin" ? "/admin" : "/home";
  return Response.redirect(new URL(target, request.url), 307);
}
