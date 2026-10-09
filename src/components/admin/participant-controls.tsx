"use client";

import { useActionState } from "react";
import { AlertTriangle, Check, Loader2, Plus, Save } from "lucide-react";
import type { Participant } from "@prisma/client";
import {
  addNoteAction,
  changeStatusAction,
  updateParticipantAction,
  type ActionState,
} from "@/server/actions/participants";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

const initial: ActionState = {};

function toDateInput(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

function Row({
  label,
  children,
  error,
  required,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
}) {
  const id = `edit-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <Field label={label} htmlFor={id} required={required} error={error}>
      {children}
    </Field>
  );
}

export function EditParticipantForm({
  participant,
  assemblies,
  categories,
  tShirtSizes,
  canManage,
}: {
  participant: Participant;
  assemblies: { id: string; name: string; branch: string | null }[];
  categories: string[];
  tShirtSizes: string[];
  canManage: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateParticipantAction, initial);

  if (!canManage) {
    return (
      <Alert tone="neutral">
        Your role can view registrations but not edit them. Contact an administrator if a change is
        required.
      </Alert>
    );
  }

  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={participant.id} />
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="success"><span className="flex items-center gap-2"><Check className="h-4 w-4" /> {state.message}</span></Alert> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Row label="First name" error={fe.firstName} required>
          <Input name="firstName" defaultValue={participant.firstName} required />
        </Row>
        <Row label="Middle name" error={fe.middleName}>
          <Input name="middleName" defaultValue={participant.middleName ?? ""} />
        </Row>
        <Row label="Last name" error={fe.lastName} required>
          <Input name="lastName" defaultValue={participant.lastName} required />
        </Row>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Row label="Date of birth" error={fe.dateOfBirth} required>
          <Input type="date" name="dateOfBirth" defaultValue={toDateInput(participant.dateOfBirth)} required />
        </Row>
        <Row label="Gender" error={fe.gender}>
          <Select name="gender" defaultValue={participant.gender}>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
          </Select>
        </Row>
        <Row label="Phone" error={fe.phone} required>
          <Input name="phone" defaultValue={participant.phone} required />
        </Row>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Row label="Email" error={fe.email}>
          <Input type="email" name="email" defaultValue={participant.email ?? ""} />
        </Row>
        <Row label="State" error={fe.state} required>
          <Input name="state" defaultValue={participant.state} required />
        </Row>
        <Row label="Town / area" error={fe.town} required>
          <Input name="town" defaultValue={participant.town} required />
        </Row>
      </div>

      <Row label="Home address" error={fe.address}>
        <Textarea name="address" defaultValue={participant.address ?? ""} />
      </Row>

      <div className="grid gap-4 sm:grid-cols-3">
        <Row label="Church assembly" error={fe.churchAssemblyId}>
          <Select name="churchAssemblyId" defaultValue={participant.churchAssemblyId ?? ""}>
            <option value="">Not specified</option>
            {assemblies.map((assembly) => (
              <option key={assembly.id} value={assembly.id}>
                {assembly.name}
                {assembly.branch ? ` (${assembly.branch})` : ""}
              </option>
            ))}
          </Select>
        </Row>
        <Row label="Pastor / leader" error={fe.pastorName}>
          <Input name="pastorName" defaultValue={participant.pastorName ?? ""} />
        </Row>
        <Row label="Pastor phone" error={fe.pastorPhone}>
          <Input name="pastorPhone" defaultValue={participant.pastorPhone ?? ""} />
        </Row>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Row label="Category" error={fe.participantCategory}>
          <Select name="participantCategory" defaultValue={participant.participantCategory ?? ""}>
            <option value="">Not specified</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </Row>
        <Row label="T-shirt size" error={fe.tShirtSize}>
          <Select name="tShirtSize" defaultValue={participant.tShirtSize ?? ""}>
            <option value="">Not specified</option>
            {tShirtSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </Row>
      </div>

      <Row label="Dietary requirements" error={fe.dietaryRequirements}>
        <Textarea name="dietaryRequirements" defaultValue={participant.dietaryRequirements ?? ""} />
      </Row>
      <Row label="Accessibility / assistance" error={fe.assistanceRequirements}>
        <Textarea name="assistanceRequirements" defaultValue={participant.assistanceRequirements ?? ""} />
      </Row>
      <Row label="Additional information" error={fe.additionalInformation}>
        <Textarea name="additionalInformation" defaultValue={participant.additionalInformation ?? ""} />
      </Row>

      <fieldset className="space-y-4 rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">Emergency contact</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Row label="Name" error={fe.emergencyContactName} required>
            <Input name="emergencyContactName" defaultValue={participant.emergencyContactName} required />
          </Row>
          <Row label="Relationship" error={fe.emergencyContactRelationship} required>
            <Input
              name="emergencyContactRelationship"
              defaultValue={participant.emergencyContactRelationship}
              required
            />
          </Row>
          <Row label="Phone" error={fe.emergencyContactPhone} required>
            <Input name="emergencyContactPhone" defaultValue={participant.emergencyContactPhone} required />
          </Row>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">Parent / guardian</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label="Guardian name" error={fe.guardianName}>
            <Input name="guardianName" defaultValue={participant.guardianName ?? ""} />
          </Row>
          <Row label="Guardian phone" error={fe.guardianPhone}>
            <Input name="guardianPhone" defaultValue={participant.guardianPhone ?? ""} />
          </Row>
        </div>
      </fieldset>

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

export function StatusForm({
  participantId,
  currentStatus,
  canManage,
}: {
  participantId: string;
  currentStatus: string;
  canManage: boolean;
}) {
  const [state, formAction, pending] = useActionState(changeStatusAction, initial);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const status = (form.elements.namedItem("status") as HTMLSelectElement)?.value;
    if (status === "CANCELLED") {
      if (!window.confirm("Cancel this registration? The participant will be marked as cancelled.")) {
        event.preventDefault();
      }
    } else if (!window.confirm(`Change registration status to ${status}?`)) {
      event.preventDefault();
    }
  };

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-3">
      <input type="hidden" name="participantId" value={participantId} />
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="success">{state.message}</Alert> : null}
      <Field label="Registration status" htmlFor="status-select">
        <Select id="status-select" name="status" defaultValue={currentStatus} disabled={!canManage}>
          <option value="REGISTERED">Registered</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </Field>
      <Field label="Reason (recorded in the audit log)" htmlFor="status-reason">
        <Input
          id="status-reason"
          name="reason"
          placeholder="e.g. Payment confirmed / duplicate"
          disabled={!canManage}
        />
      </Field>
      <Button type="submit" variant="outline" disabled={pending || !canManage}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
        Update status
      </Button>
    </form>
  );
}

export function NoteForm({
  participantId,
  canManage,
}: {
  participantId: string;
  canManage: boolean;
}) {
  const [state, formAction, pending] = useActionState(addNoteAction, initial);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="participantId" value={participantId} />
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="success">{state.message}</Alert> : null}
      <Field label="Internal note" htmlFor="note-body">
        <Textarea
          id="note-body"
          name="body"
          placeholder="Add an internal administrative note (not visible to the participant)."
          disabled={!canManage}
        />
      </Field>
      <Button type="submit" variant="outline" disabled={pending || !canManage}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Add note
      </Button>
    </form>
  );
}
