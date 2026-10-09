"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminRole } from "@prisma/client";
import {
  LayoutDashboard,
  Users,
  Tags,
  Building2,
  Settings,
  FileText,
  UserCog,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { can, roleLabel, type Permission } from "@/lib/permissions";
import { logoutAction } from "@/server/actions/auth";
import { BrandLogo } from "@/components/ui/brand-logo";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
}

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, permission: "view" },
  { href: "/admin/registrations", label: "All Registrations", icon: Users, permission: "view" },
  { href: "/admin/categories", label: "Participant Categories", icon: Tags, permission: "manage_settings" },
  { href: "/admin/assemblies", label: "Church Assemblies", icon: Building2, permission: "manage_settings" },
  { href: "/admin/settings", label: "Camp Settings", icon: Settings, permission: "manage_settings" },
  { href: "/admin/reports", label: "Reports & Exports", icon: FileText, permission: "export" },
  { href: "/admin/account", label: "Admin Account", icon: UserCog, permission: "view" },
];

export function AdminShell({
  user,
  children,
}: {
  user: { name: string; email: string; role: AdminRole };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((item) => can(user.role, item.permission));

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <BrandLogo size={40} alt="GTM Youth Camp logo" />
        <div className="leading-tight">
          <p className="text-sm font-bold text-white">GTM Youth Camp</p>
          <p className="text-xs text-slate-300">Admin Console</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Admin navigation">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive(item.href)
                ? "bg-white/15 text-white"
                : "text-slate-300 hover:bg-white/10 hover:text-white",
            )}
            aria-current={isActive(item.href) ? "page" : undefined}
          >
            <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <div className="px-3 pb-3">
          <p className="truncate text-sm font-semibold text-white">{user.name}</p>
          <p className="truncate text-xs text-slate-400">{roleLabel(user.role)}</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            Logout
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 bg-brand-950 lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-brand-950">{sidebar}</aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="no-print sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <BrandLogo size={32} alt="" />
          <span className="text-sm font-semibold text-brand-950">GTM Youth Camp Admin</span>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
