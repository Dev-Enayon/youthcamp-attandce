"use client";

import { useActionState } from "react";
import { Check, Loader2, Save } from "lucide-react";
import { updateCategoriesAction } from "@/server/actions/settings";
import type { ActionState } from "@/server/actions/participants";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

const initial: ActionState = {};

export function CategoriesForm({ categories }: { categories: string[] }) {
  const [state, formAction, pending] = useActionState(updateCategoriesAction, initial);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok ? (
        <Alert tone="success">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4" /> {state.message}
          </span>
        </Alert>
      ) : null}
      <Field
        label="Participant categories"
        htmlFor="categories"
        error={fe.categories}
        hint="One category per line, e.g. 'Youth', 'Teenager', 'Children'. These appear in the public registration form."
      >
        <Textarea id="categories" name="categories" defaultValue={categories.join("\n")} rows={6} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {pending ? "Saving…" : "Save categories"}
      </Button>
    </form>
  );
}
