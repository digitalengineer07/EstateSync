"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Headphones,
  Mail,
  Phone,
  Clock,
  MapPin,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Search,
  ChevronDown,
  Building2,
  ShieldCheck,
  FileCheck,
  Zap,
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

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Ticket Form State
  const [ticketForm, setTicketForm] = useState({
    name: "",
    email: "",
    org: "",
    category: "Reconciliation & Sync",
    priority: "Medium",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [ticketSubmitted, setTicketSubmitted] = useState<string | null>(null);

  const faqs = [
    {
      q: "How does automated bank statement reconciliation work with multi-entity ledgers?",
      a: "EstateSync securely ingests live corporate bank feeds via encrypted MT940 / API webhooks. Our double-entry reconciliation engine automatically matches transaction references, UTR numbers, and customer demands with 99.9% accuracy. Unmatched items are flagged for one-click manual manager review.",
    },
    {
      q: "Can a Manager or Director edit or delete a ledger entry once posted?",
      a: "No. In strict compliance with IFRS and statutory accounting standards, EstateSync implements immutable ledgers. Posted vouchers cannot be deleted or overwritten. If an error occurs, an authorized manager must post a reversing adjustment voucher with a mandatory audit rationale.",
    },
    {
      q: "How do I invite accountants and assign granular role-based permissions (RBAC)?",
      a: "Directors can navigate to Dashboards > Organization Settings > RBAC Management. You can invite team members with specific roles: Director (full multi-entity approval rights), Finance Manager (voucher verification & fund release), Accountant (data entry & reconciliation), and Auditor (read-only audit trail export).",
    },
    {
      q: "What happens if our corporate bank API experiences temporary network downtime?",
      a: "EstateSync maintains an asynchronous event queue. If a bank API or webhook drops offline, the system safely stores pending sync jobs and retries with exponential backoff once connectivity is restored. No transaction data or double-entry state is ever lost.",
    },
    {
      q: "How do we export audit-ready financial statements for statutory chartered accountants?",
      a: "From the Treasury or Reports dashboard, administrators can generate instant exports of Balance Sheets, Profit & Loss ledgers, Customer Aging reports, and Double-Entry Journal logs in standardized Excel, CSV, or digitally stamped PDF formats.",
    },
    {
      q: "Is customer KYC and payment milestone data stored in compliance with data privacy regulations?",
      a: "Yes. All customer identifiers, allotment details, and collection ledgers are encrypted using AES-256 at rest and TLS 1.3 in transit, strictly localized on sovereign cloud servers in full compliance with the Indian Digital Personal Data Protection (DPDP) Act and ISO 27001 standards.",
    },
  ];

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Simulate verified dispatch
    setTimeout(() => {
      const generatedId = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
      setTicketSubmitted(generatedId);
      setSubmitting(false);
      setTicketForm({
        name: "",
        email: "",
        org: "",
        category: "Reconciliation & Sync",
        priority: "Medium",
        message: "",
      });
    }, 900);
  };

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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,107,18,0.2),rgba(255,255,255,0))]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[#ff6b12] text-xs font-bold tracking-wide uppercase mb-4">
            <Headphones className="w-3.5 h-3.5" />
            <span>24/7 Enterprise Assistance</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white max-w-3xl mx-auto leading-tight">
            How can our Treasury &amp; Platform Support team assist you?
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Direct technical assistance for real estate developers, treasury controllers, and accounting teams powered by Devoxa Technologies.
          </p>

          {/* Search Bar */}
          <div className="mt-8 max-w-xl mx-auto relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help topics (e.g. reconciliation, RBAC, bank sync, audit logs)..."
              className="w-full h-13 pl-12 pr-4 bg-white/10 hover:bg-white/15 focus:bg-white text-slate-900 focus:text-slate-900 placeholder:text-slate-400 focus:placeholder:text-slate-500 text-sm font-medium rounded-2xl border border-white/20 focus:border-[#ff6b12] focus:ring-4 focus:ring-orange-500/20 outline-none backdrop-blur-md transition shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex-1 w-full space-y-14">
        
        {/* Support Channels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Email Help Desk */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-md transition group">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#ff6b12] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Email Technical Support</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              Detailed technical queries, bank ledger integrations, and audit trail exports.
            </p>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Direct Desk</div>
              <a
                href="mailto:devoxatechnologies@gmail.com"
                className="text-sm font-bold text-[#ff6b12] hover:underline break-all mt-0.5 inline-block"
              >
                devoxatechnologies@gmail.com
              </a>
              <div className="text-xs text-slate-400 mt-1">Average Response: &lt; 2 Hours</div>
            </div>
          </div>

          {/* Card 2: Phone Helpline */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-md transition group">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#ff6b12] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
              <Phone className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Direct Corporate Helpline</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              Immediate voice support for login resets, role reassignment, and billing inquiries.
            </p>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Phone Support</div>
              <a
                href="tel:+918544005858"
                className="text-sm font-bold text-slate-900 hover:text-[#ff6b12] transition mt-0.5 inline-block"
              >
                +91 8544005858
              </a>
              <div className="text-xs text-slate-400 mt-1">Mon &ndash; Sat, 9:00 AM &ndash; 7:00 PM IST</div>
            </div>
          </div>

          {/* Card 3: Priority Escalation */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff6b12]/15 rounded-full blur-2xl pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-[#ff6b12] text-white flex items-center justify-center mb-5 shadow-sm">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">24/7 Priority Emergency (P1)</h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
              Reserved for critical treasury locks, payroll sync halts, or security alerts.
            </p>
            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="text-[11px] font-bold uppercase tracking-wider text-orange-400">Emergency SLA</div>
              <div className="text-sm font-bold text-white mt-0.5">15-Minute Dedicated Callback</div>
              <div className="text-xs text-slate-400 mt-1">Available to all active Enterprise licenses</div>
            </div>
          </div>

        </div>

        {/* Section: Interactive Support Ticket Form & Office Information */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Support Ticket Submission Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#ff6b12] flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Submit a Support Ticket
                </h2>
                <p className="text-xs text-slate-500">
                  Our financial engineering team typically replies within 2 hours.
                </p>
              </div>
            </div>

            {ticketSubmitted ? (
              <div className="mt-6 p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center animate-in fade-in zoom-in-95 duration-200">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-emerald-950">Ticket Dispatched Successfully!</h3>
                <p className="text-sm text-emerald-800 mt-1">
                  Reference Ticket ID: <span className="font-mono font-bold text-emerald-900 bg-emerald-200/60 px-2 py-0.5 rounded-md">{ticketSubmitted}</span>
                </p>
                <p className="text-xs text-emerald-700 mt-2 max-w-md mx-auto">
                  A verification confirmation has been dispatched. An enterprise support specialist will contact your organization promptly.
                </p>
                <button
                  type="button"
                  onClick={() => setTicketSubmitted(null)}
                  className="mt-5 px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Submit Another Ticket
                </button>
              </div>
            ) : (
              <form onSubmit={handleTicketSubmit} className="mt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={ticketForm.name}
                      onChange={(e) => setTicketForm({ ...ticketForm, name: e.target.value })}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full h-11 px-3.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:border-[#ff6b12] focus:ring-2 focus:ring-orange-500/20 outline-none transition bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Corporate Work Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={ticketForm.email}
                      onChange={(e) => setTicketForm({ ...ticketForm, email: e.target.value })}
                      placeholder="rajesh@enterpriserealty.com"
                      className="w-full h-11 px-3.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:border-[#ff6b12] focus:ring-2 focus:ring-orange-500/20 outline-none transition bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Organization / Entity Legal Name
                    </label>
                    <input
                      type="text"
                      value={ticketForm.org}
                      onChange={(e) => setTicketForm({ ...ticketForm, org: e.target.value })}
                      placeholder="e.g. Apex Infra Projects Ltd."
                      className="w-full h-11 px-3.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:border-[#ff6b12] focus:ring-2 focus:ring-orange-500/20 outline-none transition bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Issue Category *
                    </label>
                    <select
                      value={ticketForm.category}
                      onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                      className="w-full h-11 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 focus:border-[#ff6b12] focus:ring-2 focus:ring-orange-500/20 outline-none transition bg-white cursor-pointer"
                    >
                      <option value="Reconciliation & Sync">Automated Reconciliation &amp; Sync</option>
                      <option value="RBAC & Role Permissions">RBAC, Access &amp; Permissions</option>
                      <option value="Bank API Integration">Corporate Bank API &amp; Webhooks</option>
                      <option value="Customer Demands & Ledger">Customer Demands &amp; Receipts</option>
                      <option value="Audit Trail & Reporting">Audit Trail &amp; Financial Reporting</option>
                      <option value="Billing & Licensing">Commercial Billing &amp; Invoices</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Urgency &amp; Priority Level
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {["Low", "Medium", "Critical (P1)"].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setTicketForm({ ...ticketForm, priority: lvl })}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          ticketForm.priority === lvl
                            ? "bg-orange-50 border-[#ff6b12] text-[#ff6b12] shadow-xs"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Detailed Description of the Issue *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={ticketForm.message}
                    onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                    placeholder="Please include voucher numbers, bank account references, or specific error notices encountered..."
                    className="w-full p-3.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:border-[#ff6b12] focus:ring-2 focus:ring-orange-500/20 outline-none transition bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-5 rounded-xl bg-[#ff6b12] hover:bg-[#ea580c] disabled:opacity-60 text-white font-bold text-sm shadow-md shadow-orange-500/20 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Dispatching to Technical Desk...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Priority Ticket</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Corporate Office & Operational Details */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Headquarters Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff6b12] flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Corporate Headquarters</h3>
                  <p className="text-xs text-slate-500">Devoxa Technologies Private Limited</p>
                </div>
              </div>

              <div className="pt-2 text-xs sm:text-sm text-slate-600 space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#ff6b12] shrink-0 mt-0.5" />
                  <span>
                    Devoxa Corporate Tower, Financial District, Cyber City, Phase II, New Delhi &ndash; 110001, India.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-[#ff6b12] shrink-0" />
                  <span>Executive Hours: Mon &ndash; Sat, 9:00 AM &ndash; 7:00 PM IST</span>
                </div>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-[#ff6b12] shrink-0" />
                  <span>Security Operations Center: Active 24/7/365</span>
                </div>
              </div>
            </div>

            {/* Quick Self-Service Links */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#ff6b12]" />
                <span>Self-Service &amp; Legal Compliance</span>
              </h3>
              <div className="space-y-2 text-xs sm:text-sm">
                <Link
                  href="/privacy"
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-orange-50 hover:text-[#ff6b12] transition font-semibold text-slate-700"
                >
                  <span>Review Data Privacy &amp; Encryption Standards</span>
                  <span>&rarr;</span>
                </Link>
                <Link
                  href="/terms"
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-orange-50 hover:text-[#ff6b12] transition font-semibold text-slate-700"
                >
                  <span>Master Service Agreement &amp; 99.9% SLA</span>
                  <span>&rarr;</span>
                </Link>
                <Link
                  href="/login"
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-orange-50 hover:text-[#ff6b12] transition font-semibold text-slate-700"
                >
                  <span>Sign In to Customer &amp; Treasury Dashboard</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>

          </div>

        </div>

        {/* Section: Frequently Asked Questions (FAQ) */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-sm">
          <div className="max-w-2xl mx-auto text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-[#ff6b12] text-xs font-bold uppercase tracking-wide mb-2">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Knowledge Base</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Clear answers to the most common questions regarding platform security, accounting logic, and daily treasury operations.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                No matching answers found for &quot;{searchQuery}&quot;. Please submit a ticket above or email our support desk.
              </div>
            ) : (
              filteredFaqs.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="border border-slate-200 rounded-2xl overflow-hidden transition"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 bg-white hover:bg-slate-50/80 transition cursor-pointer"
                    >
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-[#ff6b12]" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="p-4 sm:p-5 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
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
            <Link href="/terms" className="hover:text-white transition">Terms &amp; Conditions</Link>
            <span className="text-slate-700">·</span>
            <Link href="/support" className="text-white font-bold">Support</Link>
          </div>

          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} EstateSync. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
