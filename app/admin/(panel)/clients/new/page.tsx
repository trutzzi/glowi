import { Suspense } from "react";
import { ClientForm } from "@/components/ClientForm";
import { requireRole } from "@/app/lib/dal";
import { Loading } from "@/components/Loading";

export default function NewClientPage() {
  return (
    <>
      <h1 className="mb-4 text-3xl font-medium text-gray-900">Client nou</h1>
      <Suspense fallback={<Loading />}>
        <NewClientForm />
      </Suspense>
    </>
  );
}

async function NewClientForm() {
  await requireRole("admin");
  return <ClientForm />;
}
