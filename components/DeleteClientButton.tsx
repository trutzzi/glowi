"use client";

import { deleteClient } from "@/app/actions/clients";

// Permanent, so the browser asks once more before the form is sent.
export function DeleteClientButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteClient.bind(null, id)}
      onSubmit={(e) => {
        if (!confirm(`Ștergi definitiv pe ${name}, cu toate programările și cererile? Nu se poate anula.`)) e.preventDefault();
      }}
    >
      <button className="rounded-full px-4 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-50">Șterge clientul</button>
    </form>
  );
}
