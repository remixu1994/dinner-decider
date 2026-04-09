import type { ReactNode } from "react";

export function SectionCard({
  title,
  description,
  emphasis = false,
  children,
}: {
  title: string;
  description?: string;
  emphasis?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-[28px] border p-5 shadow-sm ${
        emphasis
          ? "border-orange-300 bg-white"
          : "border-stone-200 bg-white/92"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-stone-600">{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function TagChip({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "accent" | "soft";
}) {
  const toneClass =
    tone === "accent"
      ? "border-orange-300 bg-orange-100 text-orange-900"
      : tone === "soft"
        ? "border-stone-200 bg-stone-100 text-stone-700"
        : "border-emerald-200 bg-emerald-100 text-emerald-900";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${toneClass}`}
    >
      {label}
    </span>
  );
}

export function StatusBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-orange-300 bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-900">
      {label}
    </span>
  );
}
