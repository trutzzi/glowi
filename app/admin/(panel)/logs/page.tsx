import { Suspense } from "react";
import { db } from "@/lib/db";
import { requireRole } from "@/app/lib/dal";
import { clearLogs } from "@/app/actions/logs";
import { SALON_TZ } from "@/lib/time";

const SOURCE_LABELS: Record<string, string> = { server: "Server", client: "Browser", sms: "SMS" };

export default function LogsPage() {
  return (
    <>
      <h1 className="mb-1 text-3xl text-gray-900">Jurnal erori</h1>
      <p className="mb-4 text-sm text-gray-500">Ultimele 200 de erori din ultimele 30 de zile. Vizibil doar pentru administrator.</p>
      <Suspense fallback={<p className="text-gray-500">Se încarcă…</p>}>
        <Logs />
      </Suspense>
    </>
  );
}

async function Logs() {
  await requireRole("admin");
  const logs = await db.errorLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const time = (d: Date) =>
    new Intl.DateTimeFormat("ro-RO", { timeZone: SALON_TZ, dateStyle: "short", timeStyle: "medium" }).format(d);

  if (logs.length === 0) return <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-500 shadow-sm">Nicio eroare înregistrată.</p>;

  return (
    <div className="space-y-3">
      <form action={clearLogs} className="flex justify-end">
        <button className="rounded-full px-4 py-2 text-sm text-red-700 hover:bg-red-50">Șterge tot jurnalul</button>
      </form>
      <ul className="space-y-2">
        {logs.map((log) => (
          <li key={log.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className={`rounded-full px-2 py-0.5 font-medium ${log.level === "error" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                {log.level === "error" ? "Eroare" : "Avertisment"}
              </span>
              <span>{SOURCE_LABELS[log.source] ?? log.source}</span>
              <span>{time(log.createdAt)}</span>
              {log.method && log.path && <span className="font-mono">{log.method} {log.path}</span>}
              {log.routeType && <span>({log.routeType})</span>}
              {log.digest && <span className="font-mono">cod {log.digest}</span>}
            </div>
            <p className="mt-2 text-sm break-words text-gray-900">{log.message}</p>
            {log.stack && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-gray-500">Detalii tehnice</summary>
                <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-gray-50 p-3 text-[11px] leading-relaxed text-gray-700">{log.stack}</pre>
              </details>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
