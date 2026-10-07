import Image from "next/image";
import { Sparkles } from "lucide-react";
import type { ServiceView } from "@/app/lib/definitions";

type Props = {
  service: Pick<ServiceView, "title" | "description" | "imageUrl" | "price" | "durationMin">;
};

export function ServiceCard({ service }: Props) {
  return (
    <article className="flex h-full items-center gap-4 rounded-2xl bg-white p-3 shadow-sm transition hover:shadow-md">
      {service.imageUrl ? (
        <Image src={service.imageUrl} alt={service.title} width={64} height={64} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
      ) : (
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-blush text-gray-600">
          <Sparkles className="h-6 w-6" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="font-medium text-gray-900">{service.title}</h3>
        <p className="text-sm text-gray-500">{service.description}</p>
        <p className="mt-1 text-xs text-gray-500">
          {service.durationMin} min · {formatPrice(service.price)}
        </p>
      </div>
    </article>
  );
}

export function formatPrice(price: string) {
  return Number(price) === 0 ? "Preț la cerere" : `${price.replace(/\.00$/, "").replace(".", ",")} lei`;
}
