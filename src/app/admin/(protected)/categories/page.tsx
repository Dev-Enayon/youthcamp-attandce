import { requireAdmin } from "@/lib/auth/guards";
import { can } from "@/lib/permissions";
import { getSettings } from "@/server/services/settings";
import { PageHeader } from "@/components/admin/page-header";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { CategoriesForm } from "@/components/admin/categories-form";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const admin = await requireAdmin();
  const settings = await getSettings();

  if (!can(admin.role, "manage_settings")) {
    return (
      <div className="space-y-6">
        <PageHeader title="Participant Categories" />
        <Alert tone="warning" title="Restricted">
          Your role does not allow managing participant categories.
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Participant Categories"
        description="Configure the categories participants can choose during registration."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent>
            <CategoriesForm categories={settings.categories} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm font-semibold text-slate-700">Current categories</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {settings.categories.length === 0 ? (
                <p className="text-sm text-slate-500">None configured.</p>
              ) : (
                settings.categories.map((category) => (
                  <Badge key={category} tone="registered">
                    {category}
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
