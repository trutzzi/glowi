import { Suspense } from "react";
import Link from "next/link";
import { CategoryManager } from "@/components/CategoryManager";
import { getCategoriesWithCounts } from "@/app/lib/services";

export default function CategoriesPage() {
  return (
    <>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-3xl font-medium text-gray-900">Categorii</h1>
        <Link href="/admin/services" className="text-sm text-primary hover:underline">
          ← Servicii
        </Link>
      </div>
      <p className="mb-4 text-sm text-gray-500">Ordinea de aici este ordinea în care clienții văd serviciile.</p>
      <Suspense fallback={<p className="text-gray-500">Se încarcă…</p>}>
        <Categories />
      </Suspense>
    </>
  );
}

async function Categories() {
  return <CategoryManager categories={await getCategoriesWithCounts()} />; // checks the admin role
}
