"use client";

import { useState, useEffect } from "react";
import CustomerRegistrationModal from "./CustomerRegistrationModal";
import CustomerEditModal from "./CustomerEditModal";
import RecordCustomerPaymentModal from "./RecordCustomerPaymentModal";
import CustomerStatementModal from "./CustomerStatementModal";
import CustomerCancellationSettlementModal from "./CustomerCancellationSettlementModal";
import { Users, Search, RefreshCw, Plus, FileSpreadsheet, Eye, CreditCard, Edit3, IndianRupee, TrendingUp, Clock } from "lucide-react";
import { API_URL } from "@/config/api";

export default function CustomerPortfolioList({ mode = "sales", userRole = "SALES" }) {
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [currentUserId, setCurrentUserId] = useState(null);

  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState(null);
  
  // Statement Modal State (Excel sheet layout)
  const [statementCustomer, setStatementCustomer] = useState(null);
  
  // Cancellation Settlement Modal State
  const [settlementCustomer, setSettlementCustomer] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setCurrentUserId(u.id || null);
      } catch (e) {}
    }
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/v1/customers`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
        setSummary(data.summary || null);

        // If statement is currently open, keep it updated with latest data
        if (statementCustomer) {
          const fresh = (data.customers || []).find(c => c.id === statementCustomer.id);
          if (fresh) setStatementCustomer(fresh);
        }
      }
    } catch (err) {
      console.error("Failed to fetch customer portfolio:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleOpenPayment = (customer) => {
    setSelectedCustomerForPayment(customer);
    setIsPaymentOpen(true);
  };

  const handleOpenEdit = (customer) => {
    setEditCustomer(customer);
  };

  const handleCustomerUpdated = (updatedCust) => {
    setCustomers(prev => prev.map(c => c.id === updatedCust.id ? { ...c, ...updatedCust } : c));
    if (statementCustomer && statementCustomer.id === updatedCust.id) {
      setStatementCustomer(prev => ({ ...prev, ...updatedCust }));
    }
    fetchCustomers();
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      c.plotNo?.toLowerCase().includes(search.toLowerCase()) ||
      c.projectLocation?.toLowerCase().includes(search.toLowerCase()) ||
      c.khataNo?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const canRecordPayment = ["ACCOUNTING", "ADMIN"].includes(userRole);
  const canRegisterCustomer = ["SALES", "ADMIN", "MARKETING", "MANAGER"].includes(userRole);
  const canEditCustomer = (cust) => {
    // Prevent editing if the cancellation has already been settled
    if (cust.cancellationStatus === 'SETTLED') return false;
    
    if (userRole === "ADMIN") return true;
    if (["SALES", "MARKETING", "MANAGER"].includes(userRole)) {
      return !cust.salesOwnerId || !currentUserId || cust.salesOwnerId === currentUserId;
    }
    return false;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 sm:p-7">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-xl font-bold text-slate-900">
              {mode === "accounting" ? "Customer Collections & Receivables" : "Customer Bookings & Contracts"}
            </h3>
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              PRD §19
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {mode === "accounting"
              ? "Click on any customer to view their complete accounting statement, commercial breakdown, and payment history."
              : "Register client bookings, edit incorrect master details anytime, and track sales collections."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {canRegisterCustomer && (
            <button
              onClick={() => setIsRegisterOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register New Customer</span>
            </button>
          )}
          <button
            onClick={fetchCustomers}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition border border-slate-200/80"
            title="Refresh list"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-5">
          {/* Card 1: Active Clients */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300/80 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Clients</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-xl sm:text-[22px] font-bold text-slate-900 tracking-tight font-sans block">
                  {summary.totalCustomers}
                </span>
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <span>Client bookings</span>
              <span className="text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-1.5 py-0.5 rounded">Active</span>
            </div>
          </div>

          {/* Card 2: Total Booked Value */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300/80 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Booked Value</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-xl sm:text-[22px] font-bold text-slate-900 tracking-tight font-digital block">
                  ₹{parseFloat(summary.totalPortfolioValue || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <span>Contract value</span>
              <span className="text-slate-400 text-[11px]">Total Portfolio</span>
            </div>
          </div>

          {/* Card 3: Total Collections */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300/80 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Collections</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-xl sm:text-[22px] font-bold text-emerald-700 tracking-tight font-digital block">
                  ₹{parseFloat(summary.totalCollected || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <span>Realized cash flow</span>
              <span className="text-emerald-700 font-semibold text-[11px]">
                {Math.round((summary.totalCollected / (summary.totalPortfolioValue || 1)) * 100)}% paid
              </span>
            </div>
          </div>

          {/* Card 4: Outstanding Receivables */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300/80 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding Receivables</span>
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-xl sm:text-[22px] font-bold text-slate-900 tracking-tight font-digital block">
                  ₹{parseFloat(summary.totalOutstanding || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <span>Balance pending</span>
              <span className="text-rose-600 font-semibold text-[11px]">Due for collection</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer, plot, location, or khata..."
            className="w-full text-xs border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-none bg-slate-50/70 transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <label className="text-xs font-semibold text-slate-500">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white font-medium text-slate-700 transition"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">Loading customer portfolio...</div>
      ) : filteredCustomers.length === 0 ? (
        <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="font-semibold text-xs">No customer records found</p>
          <p className="text-[11px] text-slate-400 mt-1">Register a new customer booking to start tracking sales collections.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50/90 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Plot & Location</th>
                <th className="px-4 py-3">Customer Info</th>
                {["ACCOUNTING", "ADMIN"].includes(userRole) && (
                  <th className="px-4 py-3">Sales Agent</th>
                )}
                <th className="px-4 py-3 text-right">Contract Value</th>
                <th className="px-4 py-3">Payment Progress</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredCustomers.map((cust) => {
                const contract = parseFloat(cust.totalContractValue || 0);
                const paid = parseFloat(cust.totalPaid || 0);
                const due = parseFloat(cust.balanceDue || 0);
                const pct = contract > 0 ? Math.min(100, Math.round((paid / contract) * 100)) : 0;
                const userCanEdit = canEditCustomer(cust);

                return (
                  <tr 
                    key={cust.id} 
                    onClick={() => setStatementCustomer(cust)}
                    className="hover:bg-indigo-50/40 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Plot {cust.plotNo}</div>
                      <div className="text-[11px] text-slate-500">{cust.projectLocation}</div>
                      <div className="text-[10px] text-indigo-600 font-mono">Khata: {cust.khataNo} • {cust.areaSqft} sq.ft</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{cust.customerName}</div>
                      <div className="text-[11px] text-slate-500">{cust.customerContact}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{cust.identityType}: {cust.identityNumber}</div>
                    </td>

                    {["ACCOUNTING", "ADMIN"].includes(userRole) && (
                      <td className="px-4 py-3.5 text-slate-600">
                        <div className="font-medium text-slate-800">{cust.salesOwner?.name || "System"}</div>
                        <div className="text-[10px] text-slate-400">{cust.salesOwner?.email}</div>
                      </td>
                    )}

                    <td className="px-4 py-3.5 text-right font-mono">
                      <div className="font-bold text-slate-900 text-sm">₹{contract.toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-slate-400 font-sans">Rate: ₹{cust.ratePerSqft}/sqft</div>
                    </td>

                    <td className="px-4 py-3.5 min-w-[160px]">
                      <div className="flex justify-between text-[11px] font-semibold mb-1 font-mono">
                        <span className="text-emerald-700">₹{paid.toLocaleString('en-IN')}</span>
                        <span className="text-slate-500">Due: ₹{due.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : pct > 50 ? "bg-indigo-600" : "bg-amber-500"}`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      <div className="text-[10px] text-slate-400 text-right mt-0.5 font-medium">{pct}% Paid</div>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      {cust.status === 'ACTIVE' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ACTIVE
                        </span>
                      ) : cust.cancellationStatus === 'PENDING_SETTLEMENT' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          CANCELLED (Refund Pending)
                        </span>
                      ) : cust.cancellationStatus === 'SETTLED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                          CANCELLED (Settled)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                          CANCELLED
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                      {userCanEdit && (
                        <button
                          onClick={() => handleOpenEdit(cust)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition inline-flex items-center gap-1 border border-slate-200"
                          title="Edit Customer Profile & Allotment Details"
                        >
                          <Edit3 className="w-3 h-3 text-slate-500" />
                          <span>Edit</span>
                        </button>
                      )}

                      <button
                        onClick={() => setStatementCustomer(cust)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition inline-flex items-center gap-1 border border-indigo-100"
                        title="View Full Customer Statement & Excel Ledger"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Statement ({cust.payments?.length || 0})</span>
                      </button>

                      {canRecordPayment && cust.status === 'ACTIVE' && due > 0 && (
                        <button
                          onClick={() => handleOpenPayment(cust)}
                          className="px-3 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs transition active:scale-95"
                        >
                          + Record Payment
                        </button>
                      )}

                      {canRecordPayment && cust.status === 'CANCELLED' && cust.cancellationStatus === 'PENDING_SETTLEMENT' && (
                        <button
                          onClick={() => setSettlementCustomer(cust)}
                          className="px-3 py-1 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-md shadow-xs transition active:scale-95 inline-flex items-center gap-1"
                          title="Settle Customer Cancellation Refund & Costing"
                        >
                          <span>Settle Refund</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Full Customer Statement Modal (Excel Sheet Layout) */}
      <CustomerStatementModal
        isOpen={!!statementCustomer}
        customer={statementCustomer}
        onClose={() => setStatementCustomer(null)}
        onOpenPayment={handleOpenPayment}
        onOpenEdit={handleOpenEdit}
        canRecordPayment={canRecordPayment}
        userRole={userRole}
      />

      {/* Registration Modal */}
      <CustomerRegistrationModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onCustomerCreated={() => fetchCustomers()}
      />

      {/* Edit Customer Modal */}
      <CustomerEditModal
        isOpen={!!editCustomer}
        customer={editCustomer}
        onClose={() => setEditCustomer(null)}
        onCustomerUpdated={handleCustomerUpdated}
      />

      {/* Customer Cancellation Settlement Modal */}
      {settlementCustomer && (
        <CustomerCancellationSettlementModal
          customer={settlementCustomer}
          onClose={() => setSettlementCustomer(null)}
          onSettled={(updatedCustomer) => {
            fetchCustomers();
            if (statementCustomer && statementCustomer.id === updatedCustomer.id) {
              setStatementCustomer(updatedCustomer);
            }
          }}
        />
      )}

      {/* Record Payment Modal */}
      <RecordCustomerPaymentModal
        isOpen={isPaymentOpen}
        customer={selectedCustomerForPayment}
        onClose={() => {
          setIsPaymentOpen(false);
          setSelectedCustomerForPayment(null);
        }}
        onPaymentRecorded={(paymentResult) => {
          fetchCustomers();
          if (statementCustomer && paymentResult?.customer && statementCustomer.id === paymentResult.customer.id) {
            setStatementCustomer(prev => ({
              ...prev,
              totalPaid: paymentResult.customer.totalPaid,
              balanceDue: paymentResult.customer.balanceDue,
              payments: [paymentResult.payment, ...(prev.payments || [])]
            }));
          }
        }}
      />
    </div>
  );
}
