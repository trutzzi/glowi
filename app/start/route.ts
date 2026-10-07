import { cookies } from "next/headers";
import { decrypt } from "@/app/lib/session";

// Where the installed app opens: the admin dashboard, the client's home, or the
// welcome screen when nobody is logged in.
export async function GET() {
  const session = await decrypt((await cookies()).get("session")?.value);
  const target = !session?.userId ? "/" : session.role === "admin" ? "/admin" : "/home";
  // Relative Location: behind the reverse proxy request.url is the container's
  // own address (http://0.0.0.0:3000), which the phone can't open.
  return new Response(null, { status: 307, headers: { Location: target } });
}
