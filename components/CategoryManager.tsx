"use client";

import { useActionState, useEffect, useRef } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { createCategory, deleteCategory, moveCategory, renameCategory } from "@/app/actions/categories";
import type { CategoryFormState, CategoryWithCount } from "@/app/lib/definitions";

const input =
  "w-full min-w-0 rounded-xl bg-white px-3 py-2 text-sm text-gray-800 shadow-sm outline-none focus:ring-2 focus:ring-primary";
const iconButton = "grid h-9 w-9 shrink-0 place-items-center rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-30";

export function CategoryManager({ categories }: { categories: CategoryWithCount[] }) {
  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {categories.map((c, i) => (
          <CategoryRow key={c.id} category={c} first={i === 0} last={i === categories.length - 1} />
        ))}
      </ul>
      {categories.length === 0 && <p className="text-sm text-gray-500">Nicio categorie încă.</p>}
      <NewCategory />
    </div>
  );
}

function CategoryRow({ category, first, last }: { category: CategoryWithCount; first: boolean; last: boolean }) {
  const [state, rename, pending] = useActionState<CategoryFormState, FormData>(renameCategory.bind(null, category.id), {});

  const confirmDelete = (e: React.FormEvent) => {
    const n = category.serviceCount;
    const message = n
      ? `Ștergi categoria „${category.name}”? ${n === 1 ? "Serviciul ei va rămâne" : `Cele ${n} servicii vor rămâne`} „Fără categorie”.`
      : `Ștergi categoria „${category.name}”?`;
    if (!window.confirm(message)) e.preventDefault();
  };

  return (
    <li className="rounded-2xl bg-white p-3 shadow-sm">
      <div className="flex items-center gap-1">
        <form action={rename} className="flex min-w-0 flex-1 items-center gap-2">
          <input name="name" defaultValue={category.name} required aria-label="Nume categorie" className={input} />
          <button disabled={pending} className="shrink-0 rounded-full px-3 py-2 text-sm text-primary hover:bg-primary-soft disabled:opacity-50">
            {pending ? "…" : "Salvează"}
          </button>
        </form>
        <form action={moveCategory.bind(null, category.id, "up")}>
          <button disabled={first} aria-label="Mută mai sus" className={iconButton}>
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>
        <form action={moveCategory.bind(null, category.id, "down")}>
          <button disabled={last} aria-label="Mută mai jos" className={iconButton}>
            <ArrowDown className="h-4 w-4" />
          </button>
        </form>
        <form action={deleteCategory.bind(null, category.id)} onSubmit={confirmDelete}>
          <button aria-label="Șterge categoria" className={`${iconButton} hover:text-red-600`}>
            <Trash2 className="h-4 w-4" />
          </button>
        </form>
      </div>
      <p className="mt-1 px-1 text-xs text-gray-500">
        {category.serviceCount === 1 ? "1 serviciu" : `${category.serviceCount} servicii`}
        {state.ok && " · salvat"}
      </p>
      {state.error && <p className="mt-1 px-1 text-xs text-red-600">{state.error}</p>}
    </li>
  );
}

function NewCategory() {
  const [state, create, pending] = useActionState<CategoryFormState, FormData>(createCategory, {});
  const formRef = useRef<HTMLFormElement>(null);
  // Clear the field after a successful add.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={create} className="rounded-2xl bg-white p-3 shadow-sm">
      <label className="mb-1 block text-sm text-gray-600" htmlFor="new-category">
        Categorie nouă
      </label>
      <div className="flex gap-2">
        <input id="new-category" name="name" required placeholder="ex. Epilare" className={input} />
        <button
          disabled={pending}
          className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
        >
          Adaugă
        </button>
      </div>
      {state.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
