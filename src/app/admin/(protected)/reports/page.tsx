import Link from "next/link";
import { Download, FileBarChart, ListChecks, Printer, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { can } from "@/lib/permissions";
import { getSettings } from "@/server/services/settings";
import { getParticipantsForExport } from "@/server/services/participants";
import { parseParticipantFilters, filtersToQuery } from "@/lib/report-query";
import { PageHeader, StatCard } from "@/components/admin/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const sp = await searchParams;

  if (!can(admin.role, "export")) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reports & Exports" />
        <Alert tone="warning" title="Restricted">
          Your role does not allow exporting reports.
        </Alert>
      </div>
    );
  }

  const filters = parseParticipantFilters(sp);
  const [participants, settings] = await Promise.all([getParticipantsForExport(filters), getSettings()]);

  const statusCounts = participants.reduce<Record<string, number>>((acc, p) => {
    acc[p.registrationStatus] = (acc[p.registrationStatus] ?? 0) + 1;
    return acc;
  }, {});

  const filterObj = {
    search: filters.search,
    status: filters.status,
    gender: filters.gender,
    category: filters.category,
    assemblyId: filters.assemblyId,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  };
  const query = filtersToQuery(filterObj);
  const printQuery = (type: string) => filtersToQuery({ ...filterObj, type });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Exports"
        description="Export the filtered registration list to CSV, or print clean reports. Private contact and health details are excluded from reports."
      />

      <form method="get" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="Search name, reference, phone or email"
            aria-label="Search registrations"
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 xl:col-span-2"
          />
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            aria-label="Filter by status"
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            <option value="">All statuses</option>
            <option value="REGISTERED">Registered</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select
            name="category"
            defaultValue={filters.category ?? ""}
            aria-label="Filter by category"
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            <option value="">All categories</option>
            {settings.categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <input
            type="date"
            name="dateFrom"
            defaultValue={filters.dateFrom ?? ""}
            aria-label="Registered from"
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
          <input
            type="date"
            name="dateTo"
            defaultValue={filters.dateTo ?? ""}
            aria-label="Registered to"
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Button type="submit" variant="outline">
            Apply filters
          </Button>
          <Link href="/admin/reports" className="text-sm font-medium text-slate-500 hover:text-brand-700">
            Clear
          </Link>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Filtered results" value={participants.length} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Registered" value={statusCounts.REGISTERED ?? 0} tone="brand" icon={<ListChecks className="h-5 w-5" />} />
        <StatCard label="Confirmed" value={statusCounts.CONFIRMED ?? 0} tone="emerald" icon={<ListChecks className="h-5 w-5" />} />
        <StatCard label="Cancelled" value={statusCounts.CANCELLED ?? 0} tone="slate" icon={<ListChecks className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-4 w-4 text-slate-400" />
              CSV export
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              Download the {participants.length} filtered registration{participants.length === 1 ? "" : "s"} as a CSV file.
              Formula characters are escaped to protect spreadsheets.
            </p>
            <a
              href={`/api/admin/registrations/export${query}`}
              className="inline-flex h-10 items-center rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
            >
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-4 w-4 text-slate-400" />
              Printable reports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-slate-600">Open a clean report and print or save as PDF.</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/admin/reports/print${printQuery("list")}`}
                className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Full list
              </Link>
              <Link
                href={`/admin/reports/print${printQuery("assembly")}`}
                className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                By assembly
              </Link>
              <Link
                href={`/admin/reports/print${printQuery("category")}`}
                className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                By category
              </Link>
              <Link
                href={`/admin/reports/print${printQuery("summary")}`}
                className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <FileBarChart className="mr-2 h-4 w-4" />
                Summary
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
