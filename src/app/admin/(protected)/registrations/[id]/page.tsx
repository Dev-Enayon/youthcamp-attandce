import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Church,
  Clock,
  FileText,
  History,
  MapPin,
  Phone,
  ShieldAlert,
  StickyNote,
  User,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { can } from "@/lib/permissions";
import { getSettings } from "@/server/services/settings";
import { calculateAge, formatDate, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { PrintButton } from "@/components/public/print-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import {
  EditParticipantForm,
  NoteForm,
  StatusForm,
} from "@/components/admin/participant-controls";

export const dynamic = "force-dynamic";

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{value || "—"}</dd>
    </div>
  );
}

export default async function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await requireAdmin();

  const [participant, settings, assemblies] = await Promise.all([
    prisma.participant.findUnique({
      where: { id },
      include: {
        churchAssembly: true,
        notes: { orderBy: { createdAt: "desc" }, include: { adminUser: { select: { name: true } } } },
        statusChanges: {
          orderBy: { createdAt: "desc" },
          include: { adminUser: { select: { name: true } } },
        },
      },
    }),
    getSettings(),
    prisma.churchAssembly.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, branch: true } }),
  ]);

  if (!participant) notFound();

  const canManage = can(admin.role, "manage_registrations");
  const canViewSensitive = can(admin.role, "view_sensitive");
  const fullName = [participant.firstName, participant.middleName, participant.lastName]
    .filter(Boolean)
    .join(" ");
  const age = calculateAge(participant.dateOfBirth);

  return (
    <div className="space-y-6">
      <div className="no-print">
        <Link
          href="/admin/registrations"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to all registrations
        </Link>
      </div>

      <PageHeader
        className="no-print"
        title={fullName}
        description={`Reference ${participant.registrationReference}`}
        actions={
          <>
            <StatusBadge status={participant.registrationStatus} />
            <PrintButton label="Print details" />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-400" aria-hidden="true" />
              Personal & Church Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-3">
              <Detail label="Registration reference" value={<span className="font-mono">{participant.registrationReference}</span>} />
              <Detail label="Date of birth" value={`${formatDate(participant.dateOfBirth)} (age ${age})`} />
              <Detail
                label="Gender"
                value={
                  participant.gender === "PREFER_NOT_TO_SAY"
                    ? "Prefer not to say"
                    : participant.gender.charAt(0) + participant.gender.slice(1).toLowerCase()
                }
              />
              <Detail label="Phone" value={participant.phone} />
              <Detail label="Email" value={participant.email} />
              <Detail label="State" value={participant.state} />
              <Detail label="Town / area" value={participant.town} />
              <Detail label="Home address" value={participant.address} />
              <Detail label="Church assembly" value={participant.churchAssembly?.name ?? "Not specified"} />
              <Detail label="Pastor / leader" value={participant.pastorName} />
              <Detail label="Pastor phone" value={participant.pastorPhone} />
              <Detail label="Category" value={participant.participantCategory} />
              <Detail label="T-shirt size" value={participant.tShirtSize} />
              <Detail label="Registered" value={formatDateTime(participant.registeredAt)} />
              <Detail label="Payment status" value={participant.paymentStatus.replace(/_/g, " ")} />
            </dl>
            {participant.isMinor ? (
              <div className="mt-4">
                <Badge tone="warning">Minor — guardian consent recorded</Badge>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {canViewSensitive ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-500" aria-hidden="true" />
                    Emergency Contact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-3">
                    <Detail label="Name" value={participant.emergencyContactName} />
                    <Detail label="Relationship" value={participant.emergencyContactRelationship} />
                    <Detail label="Phone" value={participant.emergencyContactPhone} />
                  </dl>
                </CardContent>
              </Card>

              {participant.isMinor || participant.guardianName ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      Parent / Guardian
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-3">
                      <Detail label="Name" value={participant.guardianName} />
                      <Detail label="Phone" value={participant.guardianPhone} />
                      <Detail
                        label="Consent recorded"
                        value={participant.guardianConsentAt ? formatDateTime(participant.guardianConsentAt) : "—"}
                      />
                    </dl>
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    Health & Access Needs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-3">
                    <Detail label="Dietary requirements" value={participant.dietaryRequirements} />
                    <Detail label="Accessibility / assistance" value={participant.assistanceRequirements} />
                    <Detail label="Additional information" value={participant.additionalInformation} />
                  </dl>
                </CardContent>
              </Card>
            </>
          ) : (
            <Alert tone="neutral" title="Restricted information">
              Emergency contact, guardian and health details are restricted to administrators.
            </Alert>
          )}
        </div>
      </div>

      <Card className="no-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" aria-hidden="true" />
            Registration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StatusForm
            participantId={participant.id}
            currentStatus={participant.registrationStatus}
            canManage={canManage}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-400" aria-hidden="true" />
            Status History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {participant.statusChanges.length === 0 ? (
            <p className="text-sm text-slate-500">No status changes recorded.</p>
          ) : (
            <ul className="space-y-3">
              {participant.statusChanges.map((change) => (
                <li key={change.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                  <p className="font-medium text-slate-800">
                    {change.fromStatus ? `${change.fromStatus} → ` : ""}
                    {change.toStatus}
                    {change.reason ? <span className="text-slate-500"> · {change.reason}</span> : null}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {change.adminUser.name} · {formatDateTime(change.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="no-print">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-slate-400" aria-hidden="true" />
              Internal Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <NoteForm participantId={participant.id} canManage={canManage} />
            {participant.notes.length === 0 ? (
              <p className="text-sm text-slate-500">No notes yet.</p>
            ) : (
              <ul className="space-y-3">
                {participant.notes.map((note) => (
                  <li key={note.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                    <p className="whitespace-pre-line text-slate-800">{note.body}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {note.adminUser.name} · {formatDateTime(note.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="no-print">
          <CardHeader>
            <CardTitle>Camp context</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <CalendarDays className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                <Detail
                  label="Camp dates"
                  value={
                    settings.startDate
                      ? `${formatDate(settings.startDate)}${settings.endDate ? ` – ${formatDate(settings.endDate)}` : ""}`
                      : "Not configured"
                  }
                />
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                <Detail label="Venue" value={settings.venue} />
              </div>
              <div className="flex items-start gap-2">
                <Church className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                <Detail label="Programme" value={settings.title || "Youth Camp Programme"} />
              </div>
              <div className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                <Detail label="Camp contact" value={settings.contactPhone} />
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card className="no-print">
        <CardHeader>
          <CardTitle>Edit registration</CardTitle>
        </CardHeader>
        <CardContent>
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-brand-700">
              Open edit form
            </summary>
            <div className="mt-4">
              <EditParticipantForm
                participant={participant}
                assemblies={assemblies}
                categories={settings.categories}
                tShirtSizes={settings.tShirtSizes}
                canManage={canManage}
              />
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
