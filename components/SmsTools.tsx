"use client";

import { useActionState } from "react";
import { runRemindersNow, sendTestSms, type SmsToolState } from "@/app/actions/sms";

const input =
  "w-full rounded-xl bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm outline-none focus:ring-2 focus:ring-primary";

function Result({ state }: { state: SmsToolState }) {
  if (!state.message) return null;
  return <p className={`mt-2 text-sm ${state.ok ? "text-green-700" : "text-red-600"}`}>{state.message}</p>;
}

export function SmsTools({ redirectTo }: { redirectTo: string | null }) {
  const [testState, testAction, testPending] = useActionState<SmsToolState, FormData>(sendTestSms, {});
  const [runState, runAction, runPending] = useActionState<SmsToolState>(runRemindersNow, {});

  return (
    <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-medium text-gray-900">Remindere SMS</h2>
      {redirectTo && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Mod test: toate SMS-urile pleacă la <span className="font-medium">{redirectTo}</span>, nu la clienți (SMS_REDIRECT_TO în .env).
        </p>
      )}
      <p className="text-sm text-gray-500">Clientul primește un SMS de confirmare la programare (și la reprogramare) și un reminder la 10:00, cu o zi înainte.</p>

      <form action={runAction}>
        <button
          disabled={runPending}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {runPending ? "Se trimite…" : "Trimite acum: remindere pentru mâine și întreținere"}
        </button>
        <Result state={runState} />
      </form>

      <form action={testAction} className="border-t border-gray-100 pt-4">
        <label className="mb-1 block text-sm text-gray-600" htmlFor="test-phone">
          Trimite un SMS de test la
        </label>
        <div className="flex gap-2">
          <input id="test-phone" name="phone" type="tel" required placeholder="07xx xxx xxx" className={input} />
          <button
            disabled={testPending}
            className="shrink-0 rounded-xl bg-primary-soft px-4 text-sm text-gray-700 hover:bg-primary hover:text-white disabled:opacity-60"
          >
            {testPending ? "…" : "Trimite"}
          </button>
        </div>
        <Result state={testState} />
      </form>
    </section>
  );
}
