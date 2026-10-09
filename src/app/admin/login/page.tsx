import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getCurrentAdmin } from "@/lib/auth/guards";
import { LoginForm } from "@/components/admin/login-form";
import { BrandLogo } from "@/components/ui/brand-logo";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const admin = await getCurrentAdmin();
  if (admin) redirect("/admin");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl">
            <BrandLogo size={48} />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-brand-950">Camp Admin</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gospel Of Truth Mission · Youth Camp Programme
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <LoginForm />
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Authorised staff only. All login attempts are rate limited and logged.
        </p>
        <p className="mt-2 text-center text-xs text-slate-400">
          <Link href="/" className="hover:text-brand-700">
            ← Back to public site
          </Link>
        </p>
      </div>
    </div>
  );
}
