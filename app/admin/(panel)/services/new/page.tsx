import { Suspense } from "react";
import { ServiceForm } from "@/components/ServiceForm";
import { getCategories } from "@/app/lib/services";
import { Loading } from "@/components/Loading";

export default function NewServicePage() {
  return (
    <>
      <h1 className="mb-4 text-3xl font-medium text-gray-900">Serviciu nou</h1>
      <Suspense fallback={<Loading />}>
        <NewServiceForm />
      </Suspense>
    </>
  );
}

async function NewServiceForm() {
  return <ServiceForm categories={await getCategories()} />; // getCategories checks the admin role
}
