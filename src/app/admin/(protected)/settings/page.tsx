import { requireAdmin } from "@/lib/auth/guards";
import { can } from "@/lib/permissions";
import { getSettings } from "@/server/services/settings";
import { PageHeader } from "@/components/admin/page-header";
import { Alert } from "@/components/ui/alert";
import { SettingsForm, type SettingsView } from "@/components/admin/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const admin = await requireAdmin();
  const settings = await getSettings();

  if (!can(admin.role, "manage_settings")) {
    return (
      <div className="space-y-6">
        <PageHeader title="Camp Settings" />
        <Alert tone="warning" title="Restricted">
          Your role does not allow changing camp settings.
        </Alert>
      </div>
    );
  }

  const view: SettingsView = {
    title: settings.title,
    theme: settings.theme,
    bibleVerse: settings.bibleVerse,
    description: settings.description,
    startDate: settings.startDate ? settings.startDate.toISOString() : null,
    endDate: settings.endDate ? settings.endDate.toISOString() : null,
    venue: settings.venue,
    venueAddress: settings.venueAddress,
    registrationDeadline: settings.registrationDeadline ? settings.registrationDeadline.toISOString() : null,
    contactPhone: settings.contactPhone,
    contactEmail: settings.contactEmail,
    registrationFee: settings.registrationFee ? settings.registrationFee.toString() : null,
    registrationOpen: settings.registrationOpen,
    capacity: settings.capacity,
    categories: settings.categories,
    tShirtSizes: settings.tShirtSizes,
    requiredFields: (settings.requiredFields ?? {}) as Record<string, boolean>,
    privacyNotice: settings.privacyNotice,
    terms: settings.terms,
    privacyNoticeVersion: settings.privacyNoticeVersion,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Camp Settings"
        description="These settings control the public site and the registration process."
      />
      <SettingsForm settings={view} />
    </div>
  );
}
