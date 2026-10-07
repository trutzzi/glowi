import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ServiceForm } from "@/components/ServiceForm";
import { getCategories, getServiceById } from "@/app/lib/services";

// `params` is request-time data (no generateStaticParams), so it is read inside Suspense.
export default function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <h1 className="mb-4 text-3xl font-medium text-gray-900">Editează serviciul</h1>
      <Suspense fallback={<p className="text-gray-500">Se încarcă…</p>}>
        <EditServiceForm params={params} />
      </Suspense>
    </>
  );
}

async function EditServiceForm({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [service, categories] = await Promise.all([getServiceById(id), getCategories()]);
  if (!service) notFound();
  return <ServiceForm service={service} categories={categories} />;
}
