import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";

export function SiteFooter({
  contactPhone,
  contactEmail,
  venue,
}: {
  contactPhone?: string | null;
  contactEmail?: string | null;
  venue?: string | null;
}) {
  const year = new Date().getFullYear();
  return (
    <footer id="contact" className="mt-16 border-t border-slate-200 bg-brand-950 text-slate-200">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <BrandLogo size={40} />
            <span className="text-sm font-bold text-white">Gospel Of Truth Mission</span>
          </div>
          <p className="mt-3 text-sm text-slate-300">
            Lagos Ogun Badagry Branch
          </p>
          <p className="mt-3 text-sm text-slate-400">
            Youth Camp Programme registration portal.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Camp Contact</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" aria-hidden="true" />
              <span>{contactPhone || "Contact details will be published by the camp office."}</span>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" aria-hidden="true" />
              <span>{contactEmail || "Contact email will be published by the camp office."}</span>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" aria-hidden="true" />
              <span>{venue || "Venue to be announced by the camp office."}</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Privacy Notice</h3>
          <p className="mt-3 text-sm text-slate-300">
            Registration information is collected solely to organise the camp, care for
            participants, and contact guardians in an emergency. It is stored securely, shared
            only with authorised camp staff, and handled in line with the Nigeria Data
            Protection Act 2023.
          </p>
          <Link href="/register" className="mt-4 inline-block text-sm font-semibold text-accent-300 hover:text-accent-200">
            Register for camp →
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-400 sm:px-6">
          © {year} Gospel Of Truth Mission, Lagos Ogun Badagry Branch. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
