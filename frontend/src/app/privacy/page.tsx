"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Database,
  FileCheck,
  Building2,
  Mail,
  Phone,
  Clock,
  Server,
  Key,
  CheckCircle2,
  ChevronRight,
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

export default function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState<string>("collection");

  const sections = [
    { id: "overview", title: "1. Platform Overview" },
    { id: "collection", title: "2. Information We Collect" },
    { id: "usage", title: "3. How We Process Data" },
    { id: "security", title: "4. Encryption & Security Standards" },
    { id: "immutability", title: "5. Double-Entry Audit Logs" },
    { id: "thirdparty", title: "6. Banking & Third Parties" },
    { id: "retention", title: "7. Data Retention & Isolation" },
    { id: "rights", title: "8. Organizational Rights" },
    { id: "contact", title: "9. Contact & DPO Details" },
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
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Corporate Governance &amp; Security</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
            Privacy Policy
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-3xl leading-relaxed">
            EstateSync protects your enterprise real estate treasury records, customer collection ledgers, and property transactions with zero-trust multi-entity isolation and bank-grade cryptographic standards.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#ff6b12]" />
              Last Revised: September 2026
            </span>
            <span>•</span>
            <span>Version 2.4.0 (Enterprise Treasury Edition)</span>
            <span>•</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              DPDP Act &amp; GDPR Compliant
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
                  Document Sections
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

              {/* Quick Contact Card */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-md">
                <div className="w-8 h-8 rounded-lg bg-[#ff6b12] flex items-center justify-center text-white mb-3">
                  <Lock className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold">Privacy Inquiries</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Have compliance queries or need an enterprise data processing agreement (DPA)?
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

          {/* Legal Document Content */}
          <article className="lg:col-span-8 xl:col-span-9 space-y-10 text-slate-700 leading-relaxed text-sm sm:text-base">
            
            {/* 1. Platform Overview */}
            <section id="overview" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff6b12] flex items-center justify-center font-black">
                  01
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Platform Overview &amp; Scope
                </h2>
              </div>
              <p>
                EstateSync is an enterprise financial operations, treasury management, and customer collections software-as-a-service developed, maintained, and operated by <strong>Devoxa Technologies</strong>.
              </p>
              <p className="mt-3">
                This Privacy Policy outlines our procedures and policies concerning the collection, storage, encryption, processing, and disclosure of data processed through EstateSync web portals, client dashboards, automated banking sync microservices, and mobile-responsive dashboards.
              </p>
              <div className="mt-4 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs sm:text-sm">
                <strong>Multi-Tenant Architecture:</strong> EstateSync operates on strict logical and cryptographic tenant isolation. Your organization&apos;s financial records are strictly isolated from all other participating entities on the platform.
              </div>
            </section>

            {/* 2. Information We Collect */}
            <section id="collection" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff6b12] flex items-center justify-center font-black">
                  02
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Information We Collect
                </h2>
              </div>
              <p>
                To provide verified double-entry accounting, automated customer collection tracking, and property portfolio treasury insights, we collect and process the following categories of information:
              </p>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
                    <Building2 className="w-4 h-4 text-[#ff6b12]" />
                    <span>Organizational &amp; Entity Data</span>
                  </div>
                  <ul className="text-xs sm:text-sm space-y-1.5 text-slate-600 list-disc list-inside">
                    <li>Company legal names, GSTIN, and CIN numbers</li>
                    <li>Registered corporate addresses &amp; subsidiary hierarchy</li>
                    <li>Authorized signatory names &amp; corporate resolutions</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
                    <Database className="w-4 h-4 text-[#ff6b12]" />
                    <span>Financial &amp; Ledger Records</span>
                  </div>
                  <ul className="text-xs sm:text-sm space-y-1.5 text-slate-600 list-disc list-inside">
                    <li>Double-entry debit and credit journal entries</li>
                    <li>Bank statement feeds &amp; reconciliation audit trails</li>
                    <li>Vendor invoices, contracts, and fund release requests</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
                    <FileCheck className="w-4 h-4 text-[#ff6b12]" />
                    <span>Customer &amp; Allotment Records</span>
                  </div>
                  <ul className="text-xs sm:text-sm space-y-1.5 text-slate-600 list-disc list-inside">
                    <li>Property unit allotment IDs, buyer contact details</li>
                    <li>Payment schedules, milestone demands &amp; receipts</li>
                    <li>Interest accruals &amp; payment gateway transaction IDs</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
                    <Server className="w-4 h-4 text-[#ff6b12]" />
                    <span>Access Logs &amp; Security Metadata</span>
                  </div>
                  <ul className="text-xs sm:text-sm space-y-1.5 text-slate-600 list-disc list-inside">
                    <li>RBAC login timestamps, IP addresses &amp; device IDs</li>
                    <li>Audit trail of approval signatures &amp; modifications</li>
                    <li>Session cookies &amp; cryptographic security tokens</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 3. How We Process Data */}
            <section id="usage" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff6b12] flex items-center justify-center font-black">
                  03
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  How We Process &amp; Utilize Data
                </h2>
              </div>
              <p>
                All data collected by EstateSync is processed strictly to maintain accurate, audit-compliant financial records and facilitate real estate treasury workflows:
              </p>
              <ul className="mt-3 space-y-2 list-disc list-inside text-slate-600">
                <li>Automating ledger reconciliation between corporate bank statements and customer ERP demands.</li>
                <li>Executing multi-level managerial approval workflows for fund transfers, acquisitions, and vendor releases.</li>
                <li>Generating verifiable balance sheets, profit &amp; loss statements, and cash-flow reports for auditors.</li>
                <li>Detecting unauthorized ledger tampering, abnormal duplicate postings, or unusual transaction velocity.</li>
                <li>Communicating transactional receipts and payment milestone notices to authorized customers.</li>
              </ul>
            </section>

            {/* 4. Encryption & Security */}
            <section id="security" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff6b12] flex items-center justify-center font-black">
                  04
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Encryption &amp; Security Architecture
                </h2>
              </div>
              <p>
                We employ defense-in-depth security principles engineered to protect sensitive capital operations:
              </p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <Lock className="w-6 h-6 text-[#ff6b12] mx-auto mb-2" />
                  <div className="text-sm font-bold text-slate-900">AES-256 at Rest</div>
                  <p className="text-xs text-slate-500 mt-1">All primary databases, backups, and attachments encrypted.</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <Key className="w-6 h-6 text-[#ff6b12] mx-auto mb-2" />
                  <div className="text-sm font-bold text-slate-900">TLS 1.3 in Transit</div>
                  <p className="text-xs text-slate-500 mt-1">HSTS enforced on all web, API, and webhook traffic.</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <ShieldCheck className="w-6 h-6 text-[#ff6b12] mx-auto mb-2" />
                  <div className="text-sm font-bold text-slate-900">RBAC Isolation</div>
                  <p className="text-xs text-slate-500 mt-1">Granular role-based controls for Directors, Managers, and Accountants.</p>
                </div>
              </div>
            </section>

            {/* 5. Immutability & Double-Entry Logs */}
            <section id="immutability" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff6b12] flex items-center justify-center font-black">
                  05
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Double-Entry Ledger Immutability
                </h2>
              </div>
              <p>
                In compliance with international financial accounting principles (IFRS) and Section 128 of the Indian Companies Act, EstateSync incorporates an <strong>immutable transaction ledger</strong>.
              </p>
              <p className="mt-3">
                Posted financial vouchers cannot be silently modified or purged. Any accounting correction requires an offsetting reversing entry with a documented audit justification, timestamp, and employee signature.
              </p>
            </section>

            {/* 6. Third-Party Integrations */}
            <section id="thirdparty" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff6b12] flex items-center justify-center font-black">
                  06
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Banking Gateways &amp; Third Parties
                </h2>
              </div>
              <p>
                EstateSync securely communicates with authorized third-party service providers solely to execute platform services:
              </p>
              <ul className="mt-3 space-y-2 list-disc list-inside text-slate-600">
                <li><strong>Banking API Partners:</strong> Verified webhook integrations with corporate banks (e.g., ICICI, HDFC, Axis, SBI) for live balance inquiries and statement matching.</li>
                <li><strong>Cloud Infrastructure:</strong> High-availability tier-IV data centers located within Indian sovereign territory to comply with RBI data localization mandates.</li>
                <li><strong>Zero Data Selling:</strong> We never sell, rent, or trade your organization&apos;s financial records or client databases to any advertising network or third party.</li>
              </ul>
            </section>

            {/* 7. Data Retention */}
            <section id="retention" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff6b12] flex items-center justify-center font-black">
                  07
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Data Retention &amp; Disposal
                </h2>
              </div>
              <p>
                Financial ledgers and statutory transaction records are retained for a minimum of 8 financial years in accordance with statutory accounting obligations. Following contract termination, organizations may request a complete cryptographic dump of their records in standard formats before scheduled data zeroization.
              </p>
            </section>

            {/* 8. Organizational Rights */}
            <section id="rights" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff6b12] flex items-center justify-center font-black">
                  08
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Your Rights &amp; Administrative Controls
                </h2>
              </div>
              <p>
                Platform administrators retain full rights to:
              </p>
              <ul className="mt-3 space-y-2 list-disc list-inside text-slate-600">
                <li>Inspect and download comprehensive audit trail logs of all platform users.</li>
                <li>Instantly revoke user sessions and permissions upon employee departure.</li>
                <li>Request data portability exports of customer ledgers, property inventories, and bank statements.</li>
              </ul>
            </section>

            {/* 9. Contact & DPO Details */}
            <section id="contact" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff6b12] flex items-center justify-center font-black">
                  09
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Contact &amp; Data Protection Officer (DPO)
                </h2>
              </div>
              <p>
                For questions regarding this policy, data protection audits, or enterprise security agreements, please contact our compliance desk:
              </p>

              <div className="mt-6 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="font-bold text-slate-900">Devoxa Technologies Private Limited</div>
                <div className="text-slate-600 text-xs sm:text-sm">
                  Attn: Data Protection Officer &amp; Compliance Counsel
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-2 text-xs sm:text-sm">
                  <a
                    href="mailto:devoxatechnologies@gmail.com"
                    className="inline-flex items-center gap-2 text-[#ff6b12] font-semibold hover:underline"
                  >
                    <Mail className="w-4 h-4" />
                    <span>devoxatechnologies@gmail.com</span>
                  </a>
                  <span className="hidden sm:inline text-slate-300">•</span>
                  <a
                    href="tel:+918544005858"
                    className="inline-flex items-center gap-2 text-slate-700 font-semibold hover:text-slate-950"
                  >
                    <Phone className="w-4 h-4" />
                    <span>+91 8544005858</span>
                  </a>
                </div>
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
            <Link href="/privacy" className="text-white font-bold">Privacy Policy</Link>
            <span className="text-slate-700">·</span>
            <Link href="/terms" className="hover:text-white transition">Terms &amp; Conditions</Link>
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
