import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "registered" | "confirmed" | "cancelled" | "neutral" | "warning";

const tones: Record<Tone, string> = {
  registered: "bg-brand-50 text-brand-800 border-brand-200",
  confirmed: "bg-emerald-50 text-emerald-800 border-emerald-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
