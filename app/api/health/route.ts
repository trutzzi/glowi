import { db } from "@/lib/db";

// Liveness + database check for the deploy script and uptime monitors.
// Public on purpose; it reveals nothing but "ok" or "db down".
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "db down" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
