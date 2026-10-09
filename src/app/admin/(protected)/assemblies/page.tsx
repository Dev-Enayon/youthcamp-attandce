import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/page-header";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssemblyForm, AssemblyList } from "@/components/admin/assembly-manager";

export const dynamic = "force-dynamic";

export default async function AssembliesPage() {
  const admin = await requireAdmin();

  if (!can(admin.role, "manage_settings")) {
    return (
      <div className="space-y-6">
        <PageHeader title="Church Assemblies" />
        <Alert tone="warning" title="Restricted">
          Your role does not allow managing church assemblies.
        </Alert>
      </div>
    );
  }

  const assemblies = await prisma.churchAssembly.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { participants: true } } },
  });

  const view = assemblies.map((assembly) => ({
    id: assembly.id,
    name: assembly.name,
    branch: assembly.branch,
    isActive: assembly.isActive,
    count: assembly._count.participants,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Church Assemblies"
        description="Manage the church assemblies and fellowships participants can select."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Assemblies</CardTitle>
          </CardHeader>
          <CardContent>
            <AssemblyList assemblies={view} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Add assembly</CardTitle>
          </CardHeader>
          <CardContent>
            <AssemblyForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
