import { Suspense } from "react";
import { ClientForm } from "@/components/ClientForm";
import { requireRole } from "@/app/lib/dal";

export default function NewClientPage() {
  return (
    <>
      <h1 className="mb-4 text-3xl font-medium text-gray-900">Client nou</h1>
      <Suspense fallback={<p className="text-gray-500">Se încarcă…</p>}>
        <NewClientForm />
      </Suspense>
    </>
  );
}

async function NewClientForm() {
  await requireRole("admin");
  return <ClientForm />;
}
