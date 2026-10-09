"use client";

import { useActionState } from "react";
import { Check, Loader2, Plus, Save } from "lucide-react";
import { saveAssemblyAction, toggleAssemblyAction } from "@/server/actions/settings";
import type { ActionState } from "@/server/actions/participants";
import { Button } from "@/components/ui/button";
import { Input, Checkbox } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const initial: ActionState = {};

interface Assembly {
  id: string;
  name: string;
  branch: string | null;
  isActive: boolean;
  count: number;
}

export function AssemblyForm({
  assembly,
  compact = false,
}: {
  assembly?: Assembly;
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveAssemblyAction, initial);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className={compact ? "space-y-3" : "space-y-4"}>
      {assembly ? <input type="hidden" name="id" value={assembly.id} /> : null}
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok ? (
        <Alert tone="success">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4" /> {state.message}
          </span>
        </Alert>
      ) : null}
      <div className={compact ? "space-y-3" : "grid gap-4 sm:grid-cols-2"}>
        <Field label="Assembly name" htmlFor={`name-${assembly?.id ?? "new"}`} required error={fe.name}>
          <Input
            id={`name-${assembly?.id ?? "new"}`}
            name="name"
            defaultValue={assembly?.name ?? ""}
            required
            placeholder="e.g. Gospel Of Truth Mission"
          />
        </Field>
        <Field label="Branch / fellowship" htmlFor={`branch-${assembly?.id ?? "new"}`} error={fe.branch}>
          <Input
            id={`branch-${assembly?.id ?? "new"}`}
            name="branch"
            defaultValue={assembly?.branch ?? ""}
            placeholder="e.g. Lagos Ogun Badagry"
          />
        </Field>
      </div>
      <label className="flex items-center gap-3 text-sm text-slate-700">
        <Checkbox name="isActive" defaultChecked={assembly ? assembly.isActive : true} />
        Active (available in the registration form)
      </label>
      <Button type="submit" variant={compact ? "outline" : "primary"} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : assembly ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {pending ? "Saving…" : assembly ? "Save changes" : "Add assembly"}
      </Button>
    </form>
  );
}

export function AssemblyList({ assemblies }: { assemblies: Assembly[] }) {
  if (assemblies.length === 0) {
    return <p className="text-sm text-slate-500">No church assemblies configured yet.</p>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {assemblies.map((assembly) => (
        <li key={assembly.id} className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-slate-900">{assembly.name}</p>
              <p className="text-sm text-slate-500">{assembly.branch || "No branch specified"}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={assembly.isActive ? "confirmed" : "neutral"}>
                {assembly.isActive ? "Active" : "Inactive"}
              </Badge>
              <span className="text-xs text-slate-500">{assembly.count} registered</span>
              <form action={toggleAssemblyAction}>
                <input type="hidden" name="id" value={assembly.id} />
                <Button type="submit" variant="ghost" size="sm">
                  {assembly.isActive ? "Deactivate" : "Activate"}
                </Button>
              </form>
            </div>
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-brand-700">Edit</summary>
            <div className="mt-3 max-w-lg">
              <AssemblyForm assembly={assembly} compact />
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
