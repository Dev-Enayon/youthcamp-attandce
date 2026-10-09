import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSettings, isRegistrationOpen, requirementsFromSettings } from "@/server/services/settings";
import { RegistrationForm } from "@/components/public/registration-form";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { Alert } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Camp Registration",
};

export default async function RegisterPage() {
  let settings = null;
  let assemblies: { id: string; name: string; branch: string | null }[] = [];
  let dbError = false;

  try {
    settings = await getSettings();
    assemblies = await prisma.churchAssembly.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, branch: true },
    });
  } catch (error) {
    console.error("Register page failed to load settings", error);
    dbError = true;
  }

  if (dbError || !settings) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <SiteHeader registrationOpen={false} />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
          <Alert tone="warning" title="Registration is temporarily unavailable">
            We could not load the camp registration configuration. Please try again shortly or
            contact the camp office.
          </Alert>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const state = isRegistrationOpen(settings);
  const requirements = requirementsFromSettings(settings);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <SiteHeader registrationOpen={state.open} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to home
        </Link>

        <header className="mt-6">
          <h1 className="text-3xl font-bold tracking-tight text-brand-950">
            Youth Camp Registration
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            {settings.title || "Youth Camp Programme"} · Gospel Of Truth Mission, Lagos Ogun
            Badagry Branch. Fields marked with <span className="font-semibold text-red-600">*</span>{" "}
            are required.
          </p>
          {settings.registrationDeadline ? (
            <p className="mt-2 text-sm text-slate-500">
              Registration closes on{" "}
              {new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                timeZone: "Africa/Lagos",
              }).format(settings.registrationDeadline)}
              .
            </p>
          ) : null}
        </header>

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-900">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
          <p>
            Your information is encrypted in transit and visible only to authorised camp staff.
            You do not need to create an account or password to register.
          </p>
        </div>

        <div className="mt-8">
          <RegistrationForm
            assemblies={assemblies}
            categories={settings.categories}
            tShirtSizes={settings.tShirtSizes}
            requirements={requirements}
            registrationOpen={state.open}
            privacyNotice={settings.privacyNotice}
            terms={settings.terms}
          />
        </div>
      </main>

      <SiteFooter
        contactPhone={settings.contactPhone}
        contactEmail={settings.contactEmail}
        venue={settings.venue}
      />
    </div>
  );
}
