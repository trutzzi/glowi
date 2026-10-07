"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { ServiceView } from "@/app/lib/definitions";
import { ServiceCard } from "./ServiceCard";

export function ServiceSearch({ services }: { services: ServiceView[] }) {
  const [query, setQuery] = useState("");
  const filtered = services.filter((s) =>
    `${s.title} ${s.description}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <label className="flex items-center gap-2 rounded-full bg-gray-200/60 px-4 py-2.5 text-gray-500 md:max-w-md">
        <Search className="h-4 w-4" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Caută servicii"
          className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
        />
      </label>

      <ul className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => (
          <li key={s.id}>
            <ServiceCard service={s} />
          </li>
        ))}
        {filtered.length === 0 && <p className="col-span-full py-8 text-center text-sm text-gray-500">Niciun serviciu găsit.</p>}
      </ul>
    </>
  );
}
