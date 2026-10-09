import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { can } from "@/lib/permissions";
import { getSettings } from "@/server/services/settings";
import { getParticipantsForExport } from "@/server/services/participants";
import { parseParticipantFilters } from "@/lib/report-query";
import { calculateAge, formatDate, formatDateTime } from "@/lib/utils";
import { PrintButton } from "@/components/public/print-button";
import { Alert } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

const TITLES: Record<string, string> = {
  list: "Complete Registration List",
  assembly: "Registrations by Church Assembly",
  category: "Registrations by Participant Category",
  summary: "Registration Summary",
};

export default async function PrintReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const type = (typeof sp.type === "string" && TITLES[sp.type] ? sp.type : "list") as keyof typeof TITLES;

  if (!can(admin.role, "export")) {
    return (
      <Alert tone="warning" title="Restricted">
        Your role does not allow printing reports.
      </Alert>
    );
  }

  const filters = parseParticipantFilters(sp);
  const [participants, settings] = await Promise.all([getParticipantsForExport(filters), getSettings()]);
  const title = TITLES[type];

  const filterSummary = [
    filters.status ? `Status: ${filters.status}` : null,
    filters.category ? `Category: ${filters.category}` : null,
    filters.dateFrom ? `From: ${filters.dateFrom}` : null,
    filters.dateTo ? `To: ${filters.dateTo}` : null,
    filters.search ? `Search: ${filters.search}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const byAssembly = groupBy(participants, (p) => p.churchAssembly?.name ?? "Unspecified");
  const byCategory = groupBy(participants, (p) => p.participantCategory ?? "Unspecified");

  return (
    <div className="mx-auto max-w-5xl">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link
          href="/admin/reports"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to reports
        </Link>
        <PrintButton label="Print this report" />
      </div>

      <div className="print-container rounded-2xl border border-slate-200 bg-white p-8">
        <header className="border-b border-slate-200 pb-4 text-center">
          <p className="text-sm font-semibold text-brand-900">Gospel Of Truth Mission</p>
          <p className="text-xs text-slate-500">Lagos Ogun Badagry Branch · Youth Camp Programme</p>
          <h1 className="mt-3 text-xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-xs text-slate-500">
            Generated {formatDateTime(new Date())} · {participants.length} record
            {participants.length === 1 ? "" : "s"}
          </p>
          {filterSummary ? <p className="mt-1 text-xs text-slate-500">Filters — {filterSummary}</p> : null}
        </header>

        {type === "summary" ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <SummaryList
              title="By status"
              rows={countBy(participants, (p) => p.registrationStatus)}
            />
            <SummaryList title="By category" rows={countBy(participants, (p) => p.participantCategory ?? "Unspecified")} />
            <SummaryList title="By assembly" rows={countBy(participants, (p) => p.churchAssembly?.name ?? "Unspecified")} />
          </div>
        ) : type === "assembly" ? (
          <div className="mt-6 space-y-6">
            {Object.entries(byAssembly).map(([group, rows]) => (
              <ReportTable key={group} title={group} rows={rows} />
            ))}
          </div>
        ) : type === "category" ? (
          <div className="mt-6 space-y-6">
            {Object.entries(byCategory).map(([group, rows]) => (
              <ReportTable key={group} title={group} rows={rows} />
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <ReportTable rows={participants} title={undefined} />
          </div>
        )}

        <footer className="mt-8 border-t border-slate-200 pt-3 text-center text-[11px] text-slate-400">
          Confidential — contains participant names. Private contact, guardian and health details are
          intentionally excluded. Handle per the Nigeria Data Protection Act 2023.
        </footer>
      </div>
    </div>
  );
}

type ParticipantRow = Awaited<ReturnType<typeof getParticipantsForExport>>[number];

function groupBy(rows: ParticipantRow[], keyFn: (row: ParticipantRow) => string) {
  return rows.reduce<Record<string, ParticipantRow[]>>((acc, row) => {
    const key = keyFn(row);
    (acc[key] ??= []).push(row);
    return acc;
  }, {});
}

function countBy(rows: ParticipantRow[], keyFn: (row: ParticipantRow) => string) {
  return Object.entries(
    rows.reduce<Record<string, number>>((acc, row) => {
      const key = keyFn(row);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
}

function SummaryList({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      <table className="mt-2 w-full text-sm">
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td className="py-2 text-slate-500">No data</td>
            </tr>
          ) : (
            rows.map(([label, count]) => (
              <tr key={label}>
                <td className="py-2 text-slate-600">{label}</td>
                <td className="py-2 text-right font-semibold text-slate-900">{count}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}

function ReportTable({ title, rows }: { title?: string; rows: ParticipantRow[] }) {
  return (
    <section>
      {title ? (
        <h2 className="mb-1 text-sm font-semibold text-slate-800">
          {title} <span className="font-normal text-slate-400">({rows.length})</span>
        </h2>
      ) : null}
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-300 text-left text-slate-500">
            <th className="py-1.5 pr-2 font-semibold">Reference</th>
            <th className="py-1.5 pr-2 font-semibold">Name</th>
            <th className="py-1.5 pr-2 font-semibold">Age</th>
            <th className="py-1.5 pr-2 font-semibold">Gender</th>
            <th className="py-1.5 pr-2 font-semibold">Category</th>
            <th className="py-1.5 pr-2 font-semibold">Assembly</th>
            <th className="py-1.5 pr-2 font-semibold">Status</th>
            <th className="py-1.5 font-semibold">Registered</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-3 text-center text-slate-500">
                No registrations match the current filters.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-100">
                <td className="py-1.5 pr-2 font-mono">{row.registrationReference}</td>
                <td className="py-1.5 pr-2">
                  {row.firstName} {row.lastName}
                </td>
                <td className="py-1.5 pr-2">{calculateAge(row.dateOfBirth)}</td>
                <td className="py-1.5 pr-2">
                  {row.gender === "PREFER_NOT_TO_SAY" ? "—" : row.gender}
                </td>
                <td className="py-1.5 pr-2">{row.participantCategory ?? "—"}</td>
                <td className="py-1.5 pr-2">{row.churchAssembly?.name ?? "—"}</td>
                <td className="py-1.5 pr-2">{row.registrationStatus}</td>
                <td className="py-1.5">{formatDate(row.registeredAt)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
