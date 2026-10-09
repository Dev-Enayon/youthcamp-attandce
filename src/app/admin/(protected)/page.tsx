import Link from "next/link";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Settings,
  UserPlus,
  Users,
  VenusAndMars,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { getDashboardStats } from "@/server/services/stats";
import { getSettings } from "@/server/services/settings";
import { formatDate, formatDateTime } from "@/lib/utils";
import { PageHeader, StatCard } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const [stats, settings] = await Promise.all([getDashboardStats(), getSettings()]);

  const unconfigured = !settings.startDate && !settings.venue && !settings.registrationDeadline;
  const maxCategory = Math.max(1, ...stats.byCategory.map((c) => c.count));
  const maxAssembly = Math.max(1, ...stats.byAssembly.map((a) => a.count));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${admin.name.split(" ")[0]}`}
        description="Overview of the Youth Camp Programme registrations."
        actions={
          <Link
            href="/admin/registrations"
            className="inline-flex h-10 items-center rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
          >
            <Users className="mr-2 h-4 w-4" aria-hidden="true" />
            View all registrations
          </Link>
        }
      />

      {unconfigured ? (
        <Alert tone="warning" title="Camp details are not configured yet">
          <p>
            Camp dates, venue, deadline and fees are still empty, so the public site shows
            placeholders. Set them so participants see accurate information.
          </p>
          <Link href="/admin/settings" className="mt-2 inline-flex items-center gap-1 font-semibold text-amber-900 underline">
            <Settings className="h-3.5 w-3.5" aria-hidden="true" /> Configure camp settings
          </Link>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total registered"
          value={stats.totalActive}
          hint="Excludes cancelled registrations"
          tone="brand"
          icon={<Users className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Today"
          value={stats.today}
          hint="Africa/Lagos"
          tone="accent"
          icon={<UserPlus className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="This week"
          value={stats.thisWeek}
          hint="Monday to now"
          tone="emerald"
          icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Confirmed"
          value={stats.byStatus.CONFIRMED}
          hint={`${stats.byStatus.CANCELLED} cancelled`}
          tone="slate"
          icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <VenusAndMars className="h-4 w-4 text-slate-400" aria-hidden="true" />
              Gender breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Male", value: stats.byGender.male, bar: "bg-brand-600" },
              { label: "Female", value: stats.byGender.female, bar: "bg-accent-500" },
              { label: "Prefer not to say", value: stats.byGender.undisclosed, bar: "bg-slate-400" },
            ].map((row) => {
              const total = Math.max(1, stats.totalActive);
              const pct = Math.round((row.value / total) * 100);
              return (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{row.label}</span>
                    <span className="font-semibold text-slate-900">
                      {row.value} · {pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full ${row.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By participant category</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.byCategory.length === 0 ? (
              <p className="text-sm text-slate-500">No category data yet.</p>
            ) : (
              <div className="space-y-3">
                {stats.byCategory.map((row) => (
                  <div key={row.category}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{row.category}</span>
                      <span className="font-semibold text-slate-900">{row.count}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full bg-brand-500"
                        style={{ width: `${Math.round((row.count / maxCategory) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By church assembly</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.byAssembly.length === 0 ? (
              <p className="text-sm text-slate-500">No assemblies configured yet.</p>
            ) : (
              <div className="space-y-3">
                {stats.byAssembly.slice(0, 6).map((row) => (
                  <div key={row.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate pr-2 text-slate-600">{row.name}</span>
                      <span className="font-semibold text-slate-900">{row.count}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full bg-accent-500"
                        style={{ width: `${Math.round((row.count / maxAssembly) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-slate-400" aria-hidden="true" />
            Recent registrations
          </CardTitle>
          <Link href="/admin/registrations" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
            View all
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {stats.recent.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No registrations yet"
                description="Registrations will appear here as soon as participants sign up."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Most recent camp registrations</caption>
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Reference</th>
                    <th className="px-5 py-3 font-medium">Participant</th>
                    <th className="px-5 py-3 font-medium">Category</th>
                    <th className="px-5 py-3 font-medium">Registered</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.recent.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-600">
                        {row.registrationReference}
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/registrations/${row.id}`}
                          className="font-medium text-brand-700 hover:text-brand-800"
                        >
                          {row.firstName} {row.lastName}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{row.participantCategory ?? "—"}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                        {formatDate(row.registeredAt)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={row.registrationStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-5 py-3 text-xs text-slate-400">
                Last updated {formatDateTime(new Date())} · times shown in Africa/Lagos
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
