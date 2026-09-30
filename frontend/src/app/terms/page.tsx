"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  FileText,
  ShieldAlert,
  Building2,
  Scale,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  ChevronRight,
  HelpCircle,
} from "lucide-react";

/**
 * Official EstateSync Logo Mark
 */
function EstateSyncLogoMark({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="7" fill="#ff6b12" />
      <path
        d="M10 26V7a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 22 7v19"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 16H8a1.5 1.5 0 0 0-1.5 1.5V24A1.5 1.5 0 0 0 8 25.5h2"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 13h2a1.5 1.5 0 0 1 1.5 1.5V24a1.5 1.5 0 0 1-1.5 1.5h-2"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="11" r="1.2" fill="#ffffff" />
      <circle cx="16" cy="15" r="1.2" fill="#ffffff" />
      <circle cx="16" cy="19" r="1.2" fill="#ffffff" />
    </svg>
  );
}

export default function TermsAndConditionsPage() {
  const [activeSection, setActiveSection] = useState<string>("acceptance");

  const sections = [
    { id: "acceptance", title: "1. Acceptance of Terms" },
    { id: "eligibility", title: "2. Organizational Eligibility & RBAC" },
    { id: "ledger", title: "3. Accounting & Audit Trail Obligations" },
    { id: "prohibited", title: "4. Prohibited System Activities" },
    { id: "licensing", title: "5. Subscription & Payment Terms" },
    { id: "sla", title: "6. Service Levels & Availability (99.9%)" },
    { id: "intellectual", title: "7. Intellectual Property" },
    { id: "liability", title: "8. Disclaimer & Liability Limits" },
    { id: "termination", title: "9. Account Suspension & Exit" },
    { id: "governing", title: "10. Governing Law & Arbitration" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-[#ff6b12]/20 selection:text-[#ff6b12]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between">
          {/* Logo & Brand Name */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="rounded-xl overflow-hidden shadow-sm group-hover:scale-105 transition-transform duration-200">
              <EstateSyncLogoMark className="w-9 h-9 sm:w-10 sm:h-10" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-slate-900 leading-none">
                Estate<span className="text-[#ff6b12]">Sync</span>
              </span>
              <span className="text-[8px] font-extrabold tracking-[0.24em] text-slate-400 uppercase mt-0.5">
                BY DEVOXA TECHNOLOGIES
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100/80 text-slate-700 text-xs sm:text-sm font-semibold transition shadow-xs group"
            >
              <ArrowLeft className="w-4 h-4 text-[#ff6b12] group-hover:-translate-x-1 transition-transform" />
              <span>Back to Home</span>
            </Link>
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold transition shadow-xs"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Header Banner */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-white py-14 sm:py-20 border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,107,18,0.15),rgba(255,255,255,0))]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[#ff6b12] text-xs font-bold tracking-wide uppercase mb-4">
            <Scale className="w-3.5 h-3.5" />
            <span>Master Enterprise Agreement</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
            Terms &amp; Conditions
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-3xl leading-relaxed">
            These terms govern enterprise access to EstateSync Real Estate Treasury, Double-Entry Accounting, Customer Collections, and Financial Analytics Platform.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#ff6b12]" />
              Effective Date: September 2026
            </span>
            <span>•</span>
            <span>Applies to All Organizational Tenants &amp; Licensed Users</span>
            <span>•</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Legally Binding Enterprise Contract
            </span>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-4 xl:col-span-3">
            <div className="sticky top-24 space-y-4">
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Terms Table of Contents
                </h3>
                <nav className="space-y-1">
                  {sections.map((sec) => (
                    <a
                      key={sec.id}
                      href={`#${sec.id}`}
                      onClick={() => setActiveSection(sec.id)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                        activeSection === sec.id
                          ? "bg-orange-50 text-[#ff6b12] font-bold border-l-2 border-[#ff6b12]"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span className="truncate">{sec.title}</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
                    </a>
                  ))}
                </nav>
              </div>

              {/* Legal Help Desk Box */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-md">
                <div className="w-8 h-8 rounded-lg bg-[#ff6b12] flex items-center justify-center text-white mb-3">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold">Legal &amp; Contract Desk</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Questions regarding commercial licensing, SLA penalties, or custom enterprise terms?
                </p>
                <div className="mt-4 pt-3 border-t border-slate-800 text-xs space-y-2">
                  <a
                    href="mailto:devoxatechnologies@gmail.com"
                    className="flex items-center gap-2 text-orange-400 hover:text-orange-300 font-medium"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>devoxatechnologies@gmail.com</span>
                  </a>
                  <a
                    href="tel:+918544005858"
                    className="flex items-center gap-2 text-slate-300 hover:text-white font-medium"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>+91 8544005858</span>
                  </a>
                </div>
              </div>
            </div>
          </aside>

          {/* Legal Agreement Content */}
          <article className="lg:col-span-8 xl:col-span-9 space-y-10 text-slate-700 leading-relaxed text-sm sm:text-base">
            
            {/* 1. Acceptance */}
            <section id="acceptance" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff6b12] flex items-center justify-center font-black">
                  01
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Acceptance of Terms &amp; Formation of Contract
                </h2>
              </div>
              <p>
                By creating an account, accessing any portal URL, executing API calls, or logging into the EstateSync software (the &quot;Platform&quot;), the participating corporate entity (&quot;Customer&quot;, &quot;Organization&quot;, or &quot;You&quot;) agrees to be irrevocably bound by these Terms &amp; Conditions.
              </p>
              <p className="mt-3">
                EstateSync is developed, owned, and distributed exclusively by <strong>Devoxa Technologies Private Limited</strong> (&quot;Devoxa&quot;, &quot;Company&quot;, &quot;We&quot;, or &quot;Us&quot;). If an individual accesses the Platform on behalf of an enterprise developer or corporate firm, that individual represents and warrants that they possess requisite legal corporate authority to bind that entity.
              </p>
            </section>

            {/* 2. Eligibility & RBAC */}
            <section id="eligibility" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff6b12] flex items-center justify-center font-black">
                  02
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Organizational Eligibility &amp; Role-Based Access Control (RBAC)
                </h2>
              </div>
              <p>
                Platform access is reserved strictly for verified real estate enterprises, registered property builders, fund managers, and designated corporate accounting staff:
              </p>
              <ul className="mt-3 space-y-2 list-disc list-inside text-slate-600">
                <li><strong>Role Responsibility:</strong> User credentials (e.g. Director, Finance Manager, Accountant, Auditor) are strictly assigned per individual. Sharing organizational master credentials is an immediate violation of platform compliance.</li>
                <li><strong>Credential Security:</strong> Customer is solely responsible for maintaining confidential custody of login passwords, session tokens, and multi-factor authenticators.</li>
                <li><strong>Revocation Duty:</strong> Customer must immediately terminate or reassign credentials upon the resignation, reassignment, or departure of any authorized employee.</li>
              </ul>
            </section>

            {/* 3. Accounting & Audit Trail Obligations */}
            <section id="ledger" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff6b12] flex items-center justify-center font-black">
                  03
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Accounting Accuracy &amp; Double-Entry Audit Trails
                </h2>
              </div>
              <p>
                EstateSync implements an automated double-entry ledger verification engine. All debits, credits, customer payment demands, and bank statement reconciliations are cryptographically stamped with immutable audit trails.
              </p>
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs sm:text-sm">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#ff6b12]" />
                  <span>Statutory Record Integrity</span>
                </div>
                <p className="text-slate-600">
                  Customer acknowledges that EstateSync operates as a bookkeeping, treasury reconciliation, and workflow management engine. The legal and tax accuracy of figures filed with revenue authorities (e.g., GST returns, Income Tax, RERA filings) remains the sole fiduciary responsibility of Customer and its certified Chartered Accountants.
                </p>
              </div>
            </section>

            {/* 4. Prohibited System Activities */}
            <section id="prohibited" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff6b12] flex items-center justify-center font-black">
                  04
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Prohibited Conduct &amp; Security Violations
                </h2>
              </div>
              <p>
                Any attempt to compromise platform integrity, cross-tenant isolation, or financial records will result in immediate termination and referral to statutory cyber-crime authorities:
              </p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 text-rose-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>No automated scraping, crawler extraction, or penetration testing without prior written consent from Devoxa.</span>
                </div>
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 text-rose-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>No attempting to circumvent multi-tenant schema boundaries or inspect other enterprise records.</span>
                </div>
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 text-rose-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>No injection of simulated or fraudulent banking webhooks to manipulate ledger balances.</span>
                </div>
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 text-rose-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>No reverse engineering, decompiling, or creating derivative software based on EstateSync logic.</span>
                </div>
              </div>
            </section>

            {/* 5. Subscription & Payment Terms */}
            <section id="licensing" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff6b12] flex items-center justify-center font-black">
                  05
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Subscription, Invoicing &amp; Commercial Licensing
                </h2>
              </div>
              <p>
                Platform services are delivered on a commercial subscription tier (Annual or Multi-Year Enterprise License).
              </p>
              <ul className="mt-3 space-y-2 list-disc list-inside text-slate-600">
                <li><strong>Invoicing:</strong> Software licensing invoices are issued in advance. Invoices must be settled within the contracted payment window (standard 30 days).</li>
                <li><strong>Statutory Taxes:</strong> All stated fees are exclusive of applicable Goods and Services Tax (GST) or withholding levies, which shall be charged as per applicable statutory law.</li>
                <li><strong>Late Payment:</strong> Outstanding balances past 45 days may incur finance charges of 1.5% per month and temporary read-only ledger state.</li>
              </ul>
            </section>

            {/* 6. Service Level Agreement (SLA) */}
            <section id="sla" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff6b12] flex items-center justify-center font-black">
                  06
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Service Level Agreement (99.9% Availability SLA)
                </h2>
              </div>
              <p>
                Devoxa commits to maintaining an uptime availability of at least <strong>99.9%</strong> for EstateSync core ledger and treasury services, excluding scheduled maintenance windows notified at least 48 hours in advance.
              </p>
              <div className="mt-4 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-900 text-xs sm:text-sm flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>High-Availability Architecture:</strong> EstateSync runs across multi-availability zone database replicas with continuous automated snapshotting every 15 minutes and automated failover capabilities.
                </div>
              </div>
            </section>

            {/* 7. Intellectual Property */}
            <section id="intellectual" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff6b12] flex items-center justify-center font-black">
                  07
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Intellectual Property &amp; Data Ownership
                </h2>
              </div>
              <p>
                <strong>Customer Data Ownership:</strong> Customer retains 100% full, exclusive ownership of all uploaded property data, bank statements, ledger entries, and tenant/buyer records.
              </p>
              <p className="mt-3">
                <strong>Platform IP:</strong> Devoxa Technologies retains sole and exclusive worldwide ownership of all patents, trademarks, software code, UI designs, and reconciliation algorithms incorporated into EstateSync.
              </p>
            </section>

            {/* 8. Limitation of Liability */}
            <section id="liability" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff6b12] flex items-center justify-center font-black">
                  08
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Disclaimer &amp; Limitation of Liability
                </h2>
              </div>
              <p>
                To the maximum extent permitted by applicable law, Devoxa shall not be liable for any indirect, incidental, punitive, or consequential damages resulting from banking network downtime, external payment gateway failures, or human bookkeeping data-entry errors.
              </p>
              <p className="mt-3">
                Devoxa&apos;s aggregate liability arising under this Agreement shall be limited to the total software licensing fees paid by Customer to Devoxa during the 12 months immediately preceding the event giving rise to liability.
              </p>
            </section>

            {/* 9. Termination */}
            <section id="termination" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff6b12] flex items-center justify-center font-black">
                  09
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Suspension, Termination &amp; Data Offboarding
                </h2>
              </div>
              <p>
                Either party may terminate the Master Services Agreement for material breach upon 30 days written cure notice. Upon termination, Customer shall have 60 days to export all financial ledgers, audit trails, and property records in standard CSV/JSON/PDF formats before secure database zeroization.
              </p>
            </section>

            {/* 10. Governing Law */}
            <section id="governing" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff6b12] flex items-center justify-center font-black">
                  10
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Governing Law &amp; Arbitration
                </h2>
              </div>
              <p>
                These Terms shall be governed by and construed in accordance with the substantive laws of India. Any disputes arising out of or in connection with this Agreement shall be referred to and finally resolved by binding arbitration under the Arbitration and Conciliation Act, 1996. The seat and venue of arbitration shall be New Delhi, India.
              </p>

              <div className="mt-6 p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-slate-900">Devoxa Technologies Private Limited</div>
                  <div className="text-xs text-slate-500 mt-0.5">Corporate Legal &amp; Commercial Contracts Division</div>
                </div>
                <a
                  href="mailto:devoxatechnologies@gmail.com"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
                >
                  <Mail className="w-3.5 h-3.5 text-[#ff6b12]" />
                  <span>Contact Legal Desk</span>
                </a>
              </div>
            </section>

          </article>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 border-t border-slate-800 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <EstateSyncLogoMark className="w-8 h-8" />
            <span className="text-sm font-semibold text-white">
              EstateSync <span className="text-slate-500 font-normal">| Devoxa Technologies</span>
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs font-medium">
            <Link href="/" className="hover:text-white transition">Home</Link>
            <span className="text-slate-700">·</span>
            <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
            <span className="text-slate-700">·</span>
            <Link href="/terms" className="text-white font-bold">Terms &amp; Conditions</Link>
            <span className="text-slate-700">·</span>
            <Link href="/support" className="hover:text-white transition">Support</Link>
          </div>

          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} EstateSync. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
