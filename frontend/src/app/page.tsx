import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="h-screen overflow-hidden bg-[#f4f4f5] text-zinc-950">
      <section className="h-full px-4 sm:px-6 lg:px-10 py-3 sm:py-4 lg:py-6 flex items-center">
        <div className="max-w-[1500px] mx-auto w-full h-full grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)] gap-3 sm:gap-4 lg:gap-6 items-stretch">
          <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-zinc-200 shadow-[0_20px_42px_-28px_rgba(20,20,20,0.55)] p-4 sm:p-6 lg:p-10 flex flex-col justify-between min-h-0 overflow-hidden">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#ff6b12] text-white flex items-center justify-center shadow-[0_12px_24px_-14px_rgba(255,107,18,0.9)]">
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">Devoxa Technologies</p>
                  <h1 className="text-xl font-black tracking-tight">EstateSync</h1>
                </div>
              </div>

              <div className="mt-6 sm:mt-8 lg:mt-10 xl:mt-12">
                <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#ff6b12]">
                  <span className="w-2 h-2 rounded-full bg-[#ff6b12]" />
                  Real estate treasury platform
                </p>
                <h2 className="mt-3 sm:mt-5 text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-black tracking-tight leading-[0.98]">
                  Control property cashflow from one command room.
                </h2>
                <p className="mt-4 sm:mt-5 text-sm sm:text-base lg:text-[17px] text-zinc-500 leading-6 sm:leading-7 max-w-xl">
                  EstateSync brings corporate treasury, customer collections, land acquisition payouts, staff wallets, expenses, and double-entry audit trails into one focused workspace.
                </p>

                <div className="mt-5 sm:mt-7 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 h-11 sm:h-12 px-6 rounded-xl bg-[#ff6b12] text-white font-extrabold shadow-[0_12px_24px_-16px_rgba(255,107,18,0.9)] hover:bg-[#f25f05] transition"
                  >
                    Sign In to Portal
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/dashboards"
                    className="inline-flex items-center justify-center h-11 sm:h-12 px-6 rounded-xl bg-[#27272a] text-white font-extrabold hover:bg-zinc-950 transition"
                  >
                    View Dashboards
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden lg:block relative min-h-0 rounded-[20px] sm:rounded-[24px] overflow-hidden border border-zinc-200 shadow-[0_20px_42px_-28px_rgba(20,20,20,0.55)] bg-zinc-900">
            <div
              aria-label="Modern commercial real estate building"
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=85')",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-950/75 via-zinc-950/25 to-transparent" />
            <div className="absolute left-3 right-3 bottom-3 sm:left-5 sm:right-5 sm:bottom-5 grid grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-2xl bg-white p-3 sm:p-5 shadow-[0_16px_30px_-20px_rgba(20,20,20,0.65)]">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">Live Control</p>
                <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-black text-zinc-950">₹ 1010</p>
                <p className="hidden sm:block text-sm font-semibold text-zinc-500 mt-1">Treasury account mapped to audit ledger</p>
              </div>
              <div className="rounded-2xl bg-[#27272a] text-white p-3 sm:p-5 shadow-[0_16px_30px_-20px_rgba(20,20,20,0.65)]">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">Workflow</p>
                <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-black">One Panel</p>
                <p className="hidden sm:block text-sm font-semibold text-zinc-300 mt-1">Focused operations with sidebar navigation</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
