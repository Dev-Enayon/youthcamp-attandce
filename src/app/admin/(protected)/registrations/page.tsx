import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { getSettings } from "@/server/services/settings";
import { listParticipants } from "@/server/services/participants";
import { calculateAge, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { EmptyState } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { Gender, RegistrationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

function toQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const str = search.toString();
  return str ? `?${str}` : "";
}

export default async function RegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const single = (key: string) => {
    const value = sp[key];
    return typeof value === "string" && value !== "" ? value : undefined;
  };

  const filters = {
    search: single("search"),
    status: single("status") as RegistrationStatus | undefined,
    gender: single("gender") as Gender | undefined,
    category: single("category"),
    assemblyId: single("assemblyId"),
    dateFrom: single("dateFrom"),
    dateTo: single("dateTo"),
    page: Number(single("page") ?? 1) || 1,
    pageSize: PAGE_SIZE,
  };

  const [result, settings, assemblies] = await Promise.all([
    listParticipants(filters),
    getSettings(),
    prisma.churchAssembly.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, branch: true } }),
  ]);

  const baseParams = {
    search: filters.search,
    status: filters.status,
    gender: filters.gender,
    category: filters.category,
    assemblyId: filters.assemblyId,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Registrations"
        description={`${result.total} registration${result.total === 1 ? "" : "s"} found.`}
      />

      <form method="get" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              name="search"
              defaultValue={filters.search ?? ""}
              placeholder="Search name, reference, phone or email"
              aria-label="Search registrations"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            aria-label="Filter by status"
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            <option value="">All statuses</option>
            <option value="REGISTERED">Registered</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select
            name="gender"
            defaultValue={filters.gender ?? ""}
            aria-label="Filter by gender"
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            <option value="">All genders</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
          </select>
          <select
            name="category"
            defaultValue={filters.category ?? ""}
            aria-label="Filter by category"
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            <option value="">All categories</option>
            {settings.categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select
            name="assemblyId"
            defaultValue={filters.assemblyId ?? ""}
            aria-label="Filter by church assembly"
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            <option value="">All assemblies</option>
            {assemblies.map((assembly) => (
              <option key={assembly.id} value={assembly.id}>
                {assembly.name}
                {assembly.branch ? ` (${assembly.branch})` : ""}
              </option>
            ))}
          </select>
          <div>
            <label htmlFor="dateFrom" className="mb-1 block text-xs font-medium text-slate-500">
              Registered from
            </label>
            <input
              id="dateFrom"
              type="date"
              name="dateFrom"
              defaultValue={filters.dateFrom ?? ""}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
          <div>
            <label htmlFor="dateTo" className="mb-1 block text-xs font-medium text-slate-500">
              Registered to
            </label>
            <input
              id="dateTo"
              type="date"
              name="dateTo"
              defaultValue={filters.dateTo ?? ""}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden="true" />
            Apply filters
          </button>
          <Link href="/admin/registrations" className="text-sm font-medium text-slate-500 hover:text-brand-700">
            Clear
          </Link>
        </div>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {result.items.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No registrations match your filters"
              description="Try adjusting the search or filters above."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Camp registrations</caption>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Reference</th>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Age</th>
                  <th className="px-5 py-3 font-medium">Gender</th>
                  <th className="px-5 py-3 font-medium">Assembly</th>
                  <th className="px-5 py-3 font-medium">Registered</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.items.map((participant) => {
                  const age = calculateAge(participant.dateOfBirth);
                  return (
                    <tr key={participant.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-600">
                        {participant.registrationReference}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-900">
                        {participant.firstName} {participant.lastName}
                        {participant.isMinor ? (
                          <Badge tone="warning" className="ml-2">
                            Minor
                          </Badge>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-600">{participant.phone}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-600">{participant.email ?? "—"}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-600">{age}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                        {participant.gender === "PREFER_NOT_TO_SAY"
                          ? "—"
                          : participant.gender.charAt(0) + participant.gender.slice(1).toLowerCase()}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                        {participant.churchAssembly?.name ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                        {formatDate(participant.registeredAt)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={participant.registrationStatus} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        <Link
                          href={`/admin/registrations/${participant.id}`}
                          className="font-medium text-brand-700 hover:text-brand-800"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {result.total > 0 ? (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm sm:flex-row">
            <p className="text-slate-500">
              Page {result.page} of {result.totalPages} · showing {result.items.length} of{" "}
              {result.total}
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/registrations${toQuery({ ...baseParams, page: String(Math.max(1, result.page - 1)) })}`}
                aria-disabled={result.page <= 1}
                className={`inline-flex h-9 items-center gap-1 rounded-lg border px-3 ${
                  result.page <= 1
                    ? "pointer-events-none border-slate-200 text-slate-300"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
              </Link>
              <Link
                href={`/admin/registrations${toQuery({ ...baseParams, page: String(Math.min(result.totalPages, result.page + 1)) })}`}
                aria-disabled={result.page >= result.totalPages}
                className={`inline-flex h-9 items-center gap-1 rounded-lg border px-3 ${
                  result.page >= result.totalPages
                    ? "pointer-events-none border-slate-200 text-slate-300"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
