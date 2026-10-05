import Link from "next/link";
import { ArrowLeft, Mail, Phone } from "lucide-react";

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 sm:py-16 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to workspace
        </Link>
        <header className="mt-10 mb-8">
          <p className="text-sm font-medium text-slate-500">EstateSync</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Support</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">For account access or permission changes, contact your administrator. For technical issues, contact support below.</p>
        </header>
        <section aria-label="Contact support" className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          <a href="mailto:devoxatechnologies@gmail.com" className="flex items-center gap-4 p-5 sm:p-6 hover:bg-slate-50 rounded-t-2xl">
            <Mail className="h-5 w-5 shrink-0 text-slate-400" />
            <div className="min-w-0"><p className="text-sm font-medium">Email</p><p className="mt-1 break-all text-sm text-slate-600">devoxatechnologies@gmail.com</p></div>
          </a>
          <a href="tel:+918544005858" className="flex items-center gap-4 p-5 sm:p-6 hover:bg-slate-50 rounded-b-2xl">
            <Phone className="h-5 w-5 shrink-0 text-slate-400" />
            <div><p className="text-sm font-medium">Phone</p><p className="mt-1 text-sm text-slate-600">+91 8544005858</p></div>
          </a>
        </section>
        <p className="mt-5 text-xs leading-5 text-slate-500">Include the affected page, any error message and the time of the issue. Never share your password.</p>
        <nav aria-label="Legal" className="mt-12 flex gap-6 border-t border-slate-200 pt-5 text-xs text-slate-500">
          <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
          <Link href="/terms" className="hover:text-slate-900">Terms</Link>
        </nav>
      </div>
    </main>
  );
}
