import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { can, roleLabel } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChangePasswordForm, CreateAdminForm } from "@/components/admin/account-forms";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const admin = await requireAdmin();
  const isSuper = can(admin.role, "manage_admins");

  const admins = isSuper
    ? await prisma.adminUser.findMany({
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true },
      })
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Account" description="Manage your login credentials and admin users." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Name</dt>
                <dd className="font-medium text-slate-900">{admin.name}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="font-medium text-slate-900">{admin.email}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Role</dt>
                <dd>
                  <Badge tone="registered">{roleLabel(admin.role)}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Last login</dt>
                <dd className="font-medium text-slate-900">{formatDateTime(admin.lastLoginAt)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>

      {isSuper ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Administrators</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Administrator accounts</caption>
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">Email</th>
                      <th className="px-5 py-3 font-medium">Role</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Last login</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {admins.map((user) => (
                      <tr key={user.id}>
                        <td className="px-5 py-3 font-medium text-slate-900">{user.name}</td>
                        <td className="px-5 py-3 text-slate-600">{user.email}</td>
                        <td className="px-5 py-3 text-slate-600">{roleLabel(user.role)}</td>
                        <td className="px-5 py-3">
                          <Badge tone={user.isActive ? "confirmed" : "cancelled"}>
                            {user.isActive ? "Active" : "Disabled"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-slate-600">{formatDateTime(user.lastLoginAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add administrator</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateAdminForm />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
