import { Suspense } from "react";
import { MaintenanceRow } from "@/components/MaintenanceRow";
import { getAllMaintenance } from "@/app/lib/maintenance";
import type { MaintenanceState, MaintenanceView } from "@/app/lib/definitions";

// Sections in the order the admin acts on them.
const SECTIONS: { title: string; hint: string; states: MaintenanceState[] }[] = [
  { title: "De urmărit", hint: "Scadente sau cu SMS trimis, fără programare încă.", states: ["due", "sent"] },
  { title: "Urmează", hint: "SMS la 10:00 în ziua scadentă.", states: ["upcoming"] },
  { title: "Au deja programare", hint: "Nu primesc SMS; ciclul se reînnoiește la vizită.", states: ["booked"] },
  { title: "Oprite de salon", hint: "", states: ["stopped"] },
  { title: "Refuzate de client", hint: "Nu le putem trimite SMS.", states: ["declined"] },
];

export default function MaintenancePage() {
  return (
    <>
      <h1 className="mb-1 text-3xl text-gray-900">Întreținere</h1>
      <p className="mb-5 text-sm text-gray-500">Clienții care revin periodic pentru un serviciu. Se pornește la marcarea „Onorată”.</p>
      <Suspense fallback={<p className="text-gray-500">Se încarcă…</p>}>
        <MaintenanceList />
      </Suspense>
    </>
  );
}

async function MaintenanceList() {
  const all = await getAllMaintenance(); // checks the admin role
  if (all.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
        Nicio întreținere încă. Setează intervalul la servicii, apoi la „Onorată” alege „Da, cu întreținere”.
      </p>
    );
  }
  const counts = (states: MaintenanceState[]) => all.filter((m) => states.includes(m.state));

  return (
    <div className="space-y-6">
      {SECTIONS.map(({ title, hint, states }) => {
        const items: MaintenanceView[] = counts(states);
        if (items.length === 0) return null;
        return (
          <section key={title}>
            <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">
              {title} · {items.length}
            </h2>
            {hint && <p className="mb-2 text-xs text-gray-400">{hint}</p>}
            <ul className="grid gap-2 md:grid-cols-2">
              {items.map((m) => (
                <MaintenanceRow key={m.id} m={m} back="/admin/maintenance" />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
