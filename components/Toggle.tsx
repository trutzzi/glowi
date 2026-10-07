"use client";

type Props = { label: string; checked: boolean; onChange: (v: boolean) => void };

export function Toggle({ label, checked, onChange }: Props) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-2.5 text-gray-900">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-primary" : "bg-gray-300"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}
