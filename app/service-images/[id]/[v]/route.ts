import { db } from "@/lib/db";

// Serves a service's uploaded picture. The [v] segment is the upload time, so a
// given URL always means the same bytes and browsers may cache it forever.
// Service pictures aren't private, so no session check.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; v: string }> }) {
  const { id } = await params;
  const image = await db.serviceImage.findUnique({ where: { serviceId: id } });
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
