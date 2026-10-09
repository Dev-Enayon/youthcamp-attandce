import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  MapPin,
  Phone,
  Mail,
  Ticket,
  Users,
  BookOpen,
  ShieldCheck,
  Info,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getSettings, isRegistrationOpen } from "@/server/services/settings";
import { formatDate, formatNaira } from "@/lib/utils";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    title: "Complete the registration form",
    description:
      "Fill in the participant's details, church information, emergency contact and camp preferences.",
    icon: ClipboardList,
  },
  {
    title: "Submit your information",
    description:
      "Your details are validated securely and saved to the camp register.",
    icon: CheckCircle2,
  },
  {
    title: "Save your registration reference",
    description:
      "You will receive a unique reference such as GTM-YC-2026-00001. Keep it safe for the camp office.",
    icon: Ticket,
  },
];

export default async function HomePage() {
  let settings = null;
  let registrationState: { open: boolean; reason?: string } = { open: false };
  let dbError = false;
  let spotsLeft: number | null = null;
  let activeCount = 0;

  try {
    settings = await getSettings();
    const state = isRegistrationOpen(settings);
    registrationState = state.open ? { open: true } : { open: false, reason: state.reason };
    if (settings.capacity != null) {
      activeCount = await prisma.participant.count({
        where: { registrationStatus: { not: "CANCELLED" } },
      });
      spotsLeft = Math.max(0, settings.capacity - activeCount);
      if (spotsLeft === 0) registrationState = { open: false, reason: "CAPACITY_REACHED" };
    }
  } catch (error) {
    console.error("Home page failed to load camp settings", error);
    dbError = true;
  }

  const details = settings
    ? [
        settings.theme
          ? { label: "Camp Theme", value: settings.theme, icon: Info }
          : null,
        settings.bibleVerse
          ? { label: "Theme Bible Verse", value: settings.bibleVerse, icon: BookOpen }
          : null,
        settings.startDate || settings.endDate
          ? {
              label: "Camp Date & Duration",
              value: `${settings.startDate ? formatDate(settings.startDate) : "TBC"}${
                settings.endDate ? ` — ${formatDate(settings.endDate)}` : ""
              }`,
              icon: CalendarDays,
            }
          : null,
        settings.venue || settings.venueAddress
          ? {
              label: "Venue & Address",
              value: [settings.venue, settings.venueAddress].filter(Boolean).join(", "),
              icon: MapPin,
            }
          : null,
        settings.registrationDeadline
          ? {
              label: "Registration Deadline",
              value: formatDate(settings.registrationDeadline),
              icon: Clock,
            }
          : null,
        settings.registrationFee != null && Number(settings.registrationFee) > 0
          ? {
              label: "Registration Fee",
              value: formatNaira(Number(settings.registrationFee)),
              icon: Ticket,
            }
          : null,
        settings.contactPhone
          ? { label: "Contact Phone", value: settings.contactPhone, icon: Phone }
          : null,
        settings.contactEmail
          ? { label: "Contact Email", value: settings.contactEmail, icon: Mail }
          : null,
      ].filter(Boolean) as { label: string; value: string; icon: typeof Info }[]
    : [];

  return (
    <div className="flex min-h-screen flex-col" id="home">
      <SiteHeader registrationOpen={registrationState.open} />

      <main className="flex-1">
        {dbError ? (
          <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
            <Alert tone="warning" title="Camp information is temporarily unavailable">
              We could not load the latest camp details. Registration may be affected. Please try
              again shortly or contact the camp office.
            </Alert>
          </div>
        ) : null}

        {/* Hero */}
        <section className="relative overflow-hidden bg-brand-950 text-white">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-accent-200">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                {settings?.title || "Youth Camp Programme"}
              </span>
              <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">
                Youth Camp Programme
              </h1>
              <p className="mt-4 max-w-xl text-lg text-slate-200">
                {settings?.description ||
                  "An unforgettable season of worship, teaching, fellowship and growth for the youths of Gospel Of Truth Mission. Register today to reserve your place."}
              </p>
              <p className="mt-4 text-sm font-medium text-accent-200">
                Gospel Of Truth Mission · Lagos Ogun Badagry Branch
              </p>

              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-200">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-accent-300" aria-hidden="true" />
                  {settings?.startDate
                    ? `${formatDate(settings.startDate)}${
                        settings.endDate ? ` – ${formatDate(settings.endDate)}` : ""
                      }`
                    : "Camp dates to be announced"}
                </span>
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-accent-300" aria-hidden="true" />
                  {settings?.venue || "Venue to be announced"}
                </span>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href={registrationState.open ? "/register" : "/#about"}
                  className="inline-flex h-12 items-center rounded-lg bg-accent-500 px-6 text-base font-semibold text-white shadow-lg transition-colors hover:bg-accent-600"
                >
                  {registrationState.open ? "Register for Camp" : "View Camp Information"}
                </Link>
                {spotsLeft != null && registrationState.open ? (
                  <span className="text-sm text-slate-200">
                    {spotsLeft} place{spotsLeft === 1 ? "" : "s"} remaining
                  </span>
                ) : null}
              </div>

              {!dbError && !registrationState.open ? (
                <p className="mt-4 text-sm text-amber-200">
                  {registrationState.reason === "CAPACITY_REACHED"
                    ? "Registration is full. Please contact the camp office."
                    : registrationState.reason === "DEADLINE_PASSED"
                      ? "The registration deadline has passed. Please contact the camp office."
                      : "Registration is currently closed. Please contact the camp office."}
                </p>
              ) : null}
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80"
                  alt="Young people gathered together in fellowship"
                  className="h-full w-full object-cover"
                  width={1200}
                  height={800}
                  loading="eager"
                />
              </div>
              <p className="mt-2 text-right text-[11px] text-slate-400">
                Photo via Unsplash (free-to-use licence)
              </p>
            </div>
          </div>
        </section>

        {/* Camp information */}
        <section id="about" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-brand-950">About the Camp</h2>
            <p className="mt-3 text-slate-600">
              Everything you need to know about the programme. Details are published by the camp
              office and updated here as they are confirmed.
            </p>
          </div>

          {details.length > 0 ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {details.map((item) => (
                <Card key={item.label} className="h-full">
                  <CardContent className="flex gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{item.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Alert tone="neutral" className="mt-8" title="Camp details will be published soon">
              The camp office has not yet published the theme, dates, venue or fees. Please check
              back later or contact the church office.
            </Alert>
          )}

          {settings?.description ? (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-brand-950">Programme Description</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                {settings.description}
              </p>
            </div>
          ) : null}
        </section>

        {/* Registration process */}
        <section className="bg-white py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight text-brand-950">
                How Registration Works
              </h2>
              <p className="mt-3 text-slate-600">Three simple steps and you are done.</p>
            </div>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="relative rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-700 text-white">
                    <step.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-accent-700">
                    Step {index + 1}
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{step.description}</p>
                </li>
              ))}
            </ol>

            <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl bg-brand-50 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-6 w-6 text-brand-700" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-brand-950">Your information is safe</p>
                  <p className="text-sm text-slate-600">
                    Data is encrypted in transit, accessible only to authorised camp staff, and
                    handled under the Nigeria Data Protection Act 2023.
                  </p>
                </div>
              </div>
              <Link
                href="/register"
                className="inline-flex h-11 shrink-0 items-center rounded-lg bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800"
              >
                Start Registration
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter
        contactPhone={settings?.contactPhone}
        contactEmail={settings?.contactEmail}
        venue={settings?.venue}
      />
    </div>
  );
}
