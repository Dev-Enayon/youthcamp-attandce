"use client";

import { useActionState } from "react";
import { Check, Loader2, Save } from "lucide-react";
import { updateSettingsAction } from "@/server/actions/settings";
import type { ActionState } from "@/server/actions/participants";
import { toLagosDateInput, toLagosDateTimeInput } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Checkbox } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface SettingsView {
  title: string | null;
  theme: string | null;
  bibleVerse: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  venue: string | null;
  venueAddress: string | null;
  registrationDeadline: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  registrationFee: string | null;
  registrationOpen: boolean;
  capacity: number | null;
  categories: string[];
  tShirtSizes: string[];
  requiredFields: Record<string, boolean>;
  privacyNotice: string | null;
  terms: string | null;
  privacyNoticeVersion: string;
}

const initial: ActionState = {};

export function SettingsForm({ settings }: { settings: SettingsView }) {
  const [state, formAction, pending] = useActionState(updateSettingsAction, initial);
  const fe = state.fieldErrors ?? {};
  const req = settings.requiredFields ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok ? (
        <Alert tone="success">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4" /> {state.message}
          </span>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Programme details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Camp title" htmlFor="title" error={fe.title} hint="Shown across the public site. Leave blank to use 'Youth Camp Programme'.">
            <Input id="title" name="title" defaultValue={settings.title ?? ""} placeholder="Youth Camp Programme" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Camp theme" htmlFor="theme" error={fe.theme}>
              <Input id="theme" name="theme" defaultValue={settings.theme ?? ""} />
            </Field>
            <Field label="Theme Bible verse" htmlFor="bibleVerse" error={fe.bibleVerse}>
              <Input id="bibleVerse" name="bibleVerse" defaultValue={settings.bibleVerse ?? ""} />
            </Field>
          </div>
          <Field label="Programme description" htmlFor="description" error={fe.description}>
            <Textarea id="description" name="description" defaultValue={settings.description ?? ""} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dates, venue & logistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Camp start date" htmlFor="startDate" error={fe.startDate}>
              <Input id="startDate" type="date" name="startDate" defaultValue={toLagosDateInput(settings.startDate)} />
            </Field>
            <Field label="Camp end date" htmlFor="endDate" error={fe.endDate}>
              <Input id="endDate" type="date" name="endDate" defaultValue={toLagosDateInput(settings.endDate)} />
            </Field>
            <Field label="Registration deadline" htmlFor="registrationDeadline" error={fe.registrationDeadline} hint="Africa/Lagos">
              <Input
                id="registrationDeadline"
                type="datetime-local"
                name="registrationDeadline"
                defaultValue={toLagosDateTimeInput(settings.registrationDeadline)}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Venue name" htmlFor="venue" error={fe.venue}>
              <Input id="venue" name="venue" defaultValue={settings.venue ?? ""} />
            </Field>
            <Field label="Venue address" htmlFor="venueAddress" error={fe.venueAddress}>
              <Input id="venueAddress" name="venueAddress" defaultValue={settings.venueAddress ?? ""} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Contact phone" htmlFor="contactPhone" error={fe.contactPhone}>
              <Input id="contactPhone" name="contactPhone" defaultValue={settings.contactPhone ?? ""} />
            </Field>
            <Field label="Contact email" htmlFor="contactEmail" error={fe.contactEmail}>
              <Input id="contactEmail" type="email" name="contactEmail" defaultValue={settings.contactEmail ?? ""} />
            </Field>
            <Field label="Registration fee (NGN)" htmlFor="registrationFee" error={fe.registrationFee} hint="Leave blank if free.">
              <Input
                id="registrationFee"
                type="number"
                min="0"
                step="0.01"
                name="registrationFee"
                defaultValue={settings.registrationFee ?? ""}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Maximum capacity" htmlFor="capacity" error={fe.capacity} hint="Leave blank for unlimited. Enforced on the server.">
              <Input id="capacity" type="number" min="0" name="capacity" defaultValue={settings.capacity ?? ""} />
            </Field>
            <div className="flex items-end">
              <label htmlFor="registrationOpen" className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <Checkbox id="registrationOpen" name="registrationOpen" defaultChecked={settings.registrationOpen} />
                Registration is open
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categories, sizes & form requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Participant categories"
              htmlFor="categories"
              error={fe.categories}
              hint="One per line. Shown to participants."
            >
              <Textarea id="categories" name="categories" defaultValue={settings.categories.join("\n")} />
            </Field>
            <Field
              label="T-shirt sizes"
              htmlFor="tShirtSizes"
              error={fe.tShirtSizes}
              hint="One per line."
            >
              <Textarea id="tShirtSizes" name="tShirtSizes" defaultValue={settings.tShirtSizes.join("\n")} />
            </Field>
          </div>
          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Which fields are mandatory?</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                { name: "requireEmail", label: "Email address" },
                { name: "requireAddress", label: "Home address" },
                { name: "requireChurchAssembly", label: "Church assembly" },
                { name: "requirePastorName", label: "Pastor / leader name" },
                { name: "requirePastorPhone", label: "Pastor / leader phone" },
                { name: "requireCategory", label: "Participant category" },
                { name: "requireTShirt", label: "T-shirt size" },
              ].map((field) => (
                <label key={field.name} className="flex items-center gap-3 text-sm text-slate-700">
                  <Checkbox name={field.name} defaultChecked={Boolean(req[field.name])} />
                  {field.label}
                </label>
              ))}
            </div>
          </fieldset>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy notice & terms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Privacy notice" htmlFor="privacyNotice" error={fe.privacyNotice}>
            <Textarea id="privacyNotice" name="privacyNotice" defaultValue={settings.privacyNotice ?? ""} />
          </Field>
          <Field label="Registration terms" htmlFor="terms" error={fe.terms}>
            <Textarea id="terms" name="terms" defaultValue={settings.terms ?? ""} />
          </Field>
          <Field label="Privacy notice version" htmlFor="privacyNoticeVersion" error={fe.privacyNoticeVersion} hint="Bump when the notice changes.">
            <Input id="privacyNoticeVersion" name="privacyNoticeVersion" defaultValue={settings.privacyNoticeVersion} />
          </Field>
        </CardContent>
      </Card>

      <div className="sticky bottom-4">
        <Button type="submit" size="lg" disabled={pending} className="shadow-lg">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
