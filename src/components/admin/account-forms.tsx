"use client";

import { useActionState } from "react";
import { Check, KeyRound, Loader2, UserPlus } from "lucide-react";
import { changePasswordAction, createAdminAction } from "@/server/actions/account";
import type { ActionState } from "@/server/actions/participants";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

const initial: ActionState = {};

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initial);
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
      <Field label="Current password" htmlFor="currentPassword" required error={fe.currentPassword}>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" htmlFor="newPassword" required error={fe.newPassword} hint="At least 8 characters.">
          <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required />
        </Field>
        <Field label="Confirm new password" htmlFor="confirmPassword" required error={fe.confirmPassword}>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
        </Field>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        {pending ? "Updating…" : "Change password"}
      </Button>
    </form>
  );
}

export function CreateAdminForm() {
  const [state, formAction, pending] = useActionState(createAdminAction, initial);
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="admin-name" required error={fe.name}>
          <Input id="admin-name" name="name" required />
        </Field>
        <Field label="Email" htmlFor="admin-email" required error={fe.email}>
          <Input id="admin-email" name="email" type="email" required />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Temporary password" htmlFor="admin-password" required error={fe.password} hint="At least 8 characters.">
          <Input id="admin-password" name="password" type="password" required />
        </Field>
        <Field label="Role" htmlFor="admin-role" required error={fe.role}>
          <Select id="admin-role" name="role" defaultValue="STAFF">
            <option value="STAFF">Staff (view & export only)</option>
            <option value="ADMIN">Administrator</option>
            <option value="SUPERADMIN">Super Administrator</option>
          </Select>
        </Field>
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        {pending ? "Creating…" : "Create administrator"}
      </Button>
    </form>
  );
}
