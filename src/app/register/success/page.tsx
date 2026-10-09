import Link from "next/link";
import { CheckCircle2, Church, Ticket } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSettings } from "@/server/services/settings";
import { verifyConfirmationToken } from "@/server/services/confirmation";
import { formatDate, formatDateTime } from "@/lib/utils";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { PrintButton } from "@/components/public/print-button";
import { Alert } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Registration Successful",
  robots: { index: false, follow: false },
};

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;

  const participantId = t ? await verifyConfirmationToken(t) : null;

  const [participant, settings] = await Promise.all([
    participantId
      ? prisma.participant
          .findUnique({
            where: { id: participantId },
            select: {
              firstName: true,
              middleName: true,
              lastName: true,
              registrationReference: true,
              registeredAt: true,
            },
          })
          .catch(() => null)
      : Promise.resolve(null),
    getSettings().catch(() => null),
  ]);

  if (!participant) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
          <Alert tone="warning" title="Confirmation link not available">
            This confirmation link has expired or is invalid. If you have your registration
            reference, please contact the camp office so we can help you. No information is shown
            here for your privacy.
          </Alert>
          <div className="mt-6">
            <Link href="/" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
              ← Return to home
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const fullName = [participant.firstName, participant.middleName, participant.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="no-print">
        <SiteHeader />
      </div>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <div className="print-container rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-2xl font-bold text-brand-950">Registration Successful!</h1>
            <p className="mt-2 text-sm text-slate-600">
              Thank you, {participant.firstName}. Your place at the camp has been recorded.
            </p>
          </div>

          <div className="mt-8 rounded-xl border border-brand-100 bg-brand-50 p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
              Registration Reference
            </p>
            <p className="mt-1 flex items-center justify-center gap-2 text-2xl font-extrabold tracking-wider text-brand-950">
              <Ticket className="h-5 w-5 text-brand-700" aria-hidden="true" />
              {participant.registrationReference}
            </p>
            <p className="mt-2 text-xs text-brand-800">
              Please save this reference. You will need it for any enquiries about your registration.
            </p>
          </div>

          <dl className="mt-8 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-slate-500">Participant</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{fullName}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Programme</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {settings?.title || "Youth Camp Programme"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Date of registration</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {formatDateTime(participant.registeredAt)}
              </dd>
            </div>
            {settings?.startDate ? (
              <div>
                <dt className="font-medium text-slate-500">Camp date</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">
                  {formatDate(settings.startDate)}
                  {settings.endDate ? ` – ${formatDate(settings.endDate)}` : ""}
                </dd>
              </div>
            ) : null}
            {settings?.venue ? (
              <div>
                <dt className="font-medium text-slate-500">Venue</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{settings.venue}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-8 border-t border-slate-100 pt-5 text-center text-xs text-slate-500">
            <p className="flex items-center justify-center gap-1.5 font-medium text-slate-600">
              <Church className="h-3.5 w-3.5" aria-hidden="true" />
              Gospel Of Truth Mission · Lagos Ogun Badagry Branch
            </p>
            <p className="mt-1">
              {settings?.contactPhone ? `Camp contact: ${settings.contactPhone}` : "Contact the camp office for assistance."}
            </p>
          </div>
        </div>

        <div className="no-print mt-6 flex flex-wrap items-center justify-center gap-3">
          <PrintButton />
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Return to home
          </Link>
        </div>
      </main>

      <div className="no-print">
        <SiteFooter />
      </div>
    </div>
  );
}
