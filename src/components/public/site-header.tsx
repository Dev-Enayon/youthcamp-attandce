"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/ui/brand-logo";

const NAV = [
  { href: "/#home", label: "Home" },
  { href: "/#about", label: "About Camp" },
  { href: "/register", label: "Registration" },
  { href: "/#contact", label: "Contact" },
];

export function SiteHeader({ registrationOpen = true }: { registrationOpen?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <BrandLogo size={40} />
          <span className="leading-tight">
            <span className="block text-sm font-bold text-brand-900 sm:text-base">
              Gospel Of Truth Mission
            </span>
            <span className="block text-xs text-slate-500">
              Lagos Ogun Badagry Branch · Youth Camp Programme
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Main navigation">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-brand-700"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/register"
            aria-disabled={!registrationOpen}
            className={cn(
              "inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold text-white shadow-sm transition-colors",
              registrationOpen ? "bg-brand-700 hover:bg-brand-800" : "bg-slate-400",
            )}
          >
            {registrationOpen ? "Register Now" : "Registration Closed"}
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2" aria-label="Mobile navigation">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex h-10 items-center justify-center rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white"
            >
              Register Now
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
